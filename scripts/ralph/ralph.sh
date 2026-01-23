#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKS_FILE="$SCRIPT_DIR/tasks.json"

# Count tasks and calculate iterations
TASK_COUNT=$(jq '.tasks | length' "$TASKS_FILE")
DONE_COUNT=$(jq '[.tasks[] | select(.done == true)] | length' "$TASKS_FILE")
PENDING_COUNT=$((TASK_COUNT - DONE_COUNT))
MAX_ITERATIONS=$((TASK_COUNT * 2))

echo "🚀 Starting Ralph - $(date)"
echo "📋 Total: $TASK_COUNT tasks | Done: $DONE_COUNT | Pending: $PENDING_COUNT"
echo "🔄 Max iterations: $MAX_ITERATIONS"
echo ""

# Show pending tasks
echo "📋 Pending tasks:"
jq -r '.tasks[] | select(.done == false) | "  - \(.id): \(.title) (priority: \(.priority))"' "$TASKS_FILE"
echo ""

# Pre-flight check
echo "🔍 Pre-flight check: npm run build"
if ! npm run build > /dev/null 2>&1; then
  echo "❌ Build failed. Fix errors before running Ralph."
  exit 1
fi
echo "✅ Build passes"
echo ""

# Function to run Claude with hang detection (macOS compatible)
# Returns 0 on success, 1 on failure
run_claude() {
  local attempt=$1
  local debug_log=$2
  local temp_output="${debug_log%.log}.json"

  echo "🔍 Running Claude (attempt $attempt)..."

  # Use stream-json with verbose to detect completion before hang
  # See: https://github.com/anthropics/claude-code/issues/19060
  cat "$SCRIPT_DIR/prompt.md" | \
    claude --dangerously-skip-permissions -p --output-format stream-json --verbose 2>&1 > "$temp_output" &
  local claude_pid=$!

  echo "   Claude PID: $claude_pid"
  echo "   Monitoring output: $temp_output"

  # Wait for result message with manual timeout (macOS compatible)
  local elapsed=0
  local max_wait=600  # 10 minutes
  local result_found=false

  while [ $elapsed -lt $max_wait ]; do
    # Check if Claude process still running
    if ! kill -0 $claude_pid 2>/dev/null; then
      echo "   Claude process exited naturally after ${elapsed}s"
      result_found=true
      break
    fi

    # Check if result message appeared
    if [ -f "$temp_output" ] && grep -q '"type":"result"' "$temp_output" 2>/dev/null; then
      echo "   ✓ Result message detected after ${elapsed}s"
      result_found=true

      # Give 5s grace period for clean exit
      sleep 5

      # If still running, kill it (hung on cleanup)
      if kill -0 $claude_pid 2>/dev/null; then
        echo "   Process hung on exit, killing..."
        kill $claude_pid 2>/dev/null || true
      fi

      break
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  # Final cleanup - make sure process is dead
  if kill -0 $claude_pid 2>/dev/null; then
    echo "   Timeout reached, killing process..."
    kill $claude_pid 2>/dev/null || true
  fi

  wait $claude_pid 2>/dev/null || true

  if [ "$result_found" = false ]; then
    echo "   ⚠️  No result message found after ${max_wait}s"
    return 1
  fi

  # Parse output for display and save to debug log
  if [ -f "$temp_output" ]; then
    jq -r 'select(.type == "content_block_delta") | .delta.text' "$temp_output" 2>/dev/null | tr -d '\n' > "$debug_log"

    # If empty, save raw output
    if [ ! -s "$debug_log" ]; then
      cat "$temp_output" > "$debug_log"
    fi
  else
    echo "Error: No output file created" > "$debug_log"
    return 1
  fi

  # Check if output suggests success
  if grep -qE "complete|done|Task.*complete|✅|✓" "$debug_log" 2>/dev/null; then
    return 0
  elif [ ! -s "$debug_log" ]; then
    return 1
  fi

  return 0
}

for i in $(seq 1 $MAX_ITERATIONS); do
  ITER_START=$(date +%s)
  echo "═══════════════════════════════════════════"
  echo "  Iteration $i of $MAX_ITERATIONS - $(date +%H:%M:%S)"
  echo "═══════════════════════════════════════════"

  # Show next task
  NEXT_TASK=$(jq -r '.tasks[] | select(.done == false) | "\(.id): \(.title)"' "$TASKS_FILE" | head -1)
  if [ -n "$NEXT_TASK" ]; then
    echo "📌 Next task: $NEXT_TASK"
  else
    echo "📌 No incomplete tasks found"
  fi
  echo ""

  # Try with retries
  SUCCESS=false
  for attempt in 1 2 3; do
    DEBUG_LOG="$SCRIPT_DIR/debug-iteration-$i-attempt-$attempt.log"

    if run_claude $attempt "$DEBUG_LOG"; then
      SUCCESS=true
      OUTPUT=$(cat "$DEBUG_LOG")
      echo ""
      echo "✅ Attempt $attempt succeeded"
      echo ""
      echo "$OUTPUT"
      break
    else
      echo "❌ Attempt $attempt failed"
      if [ $attempt -lt 3 ]; then
        echo "🔄 Retrying in 5s..."
        sleep 5
      fi
    fi
  done

  if [ "$SUCCESS" = false ]; then
    echo ""
    echo "❌ All retries failed for iteration $i"
    echo "   Task: $NEXT_TASK"
    echo "   Check debug logs: $SCRIPT_DIR/debug-iteration-$i-attempt-*.log"
    echo ""
    continue
  fi

  # Check for completion
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "════════════════════════════════════════════"
    echo "  ✅ All tasks complete after $i iterations!"
    echo "════════════════════════════════════════════"
    exit 0
  fi

  # Show iteration timing
  ITER_END=$(date +%s)
  ITER_DURATION=$((ITER_END - ITER_START))
  echo ""
  echo "✅ Iteration $i completed in ${ITER_DURATION}s"
  echo ""

  sleep 3
done

echo ""
echo "════════════════════════════════════════════"
echo "  ⚠️  Max iterations ($MAX_ITERATIONS) reached"
echo "  Check tasks.json for remaining tasks"
echo "════════════════════════════════════════════"
exit 1
