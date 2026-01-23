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

# Function to run Claude with hang detection
# Returns 0 on success, 1 on failure
run_claude() {
  local attempt=$1
  local debug_log=$2
  local temp_output="${debug_log%.log}.json"

  echo "🔍 Running Claude (attempt $attempt, log: $debug_log)..."

  # Use stream-json to detect completion before hang
  # See: https://github.com/anthropics/claude-code/issues/19060
  cat "$SCRIPT_DIR/prompt.md" | \
    claude --dangerously-skip-permissions --output-format stream-json 2>&1 > "$temp_output" &
  local claude_pid=$!

  # Monitor output for completion
  local result_received=false
  local timeout_secs=600

  ( tail -f "$temp_output" 2>/dev/null & echo $! > /tmp/tail_pid_$claude_pid ) | \
  timeout $timeout_secs grep -q '"type":"result"' && result_received=true

  # Kill tail
  kill $(cat /tmp/tail_pid_$claude_pid 2>/dev/null) 2>/dev/null || true
  rm -f /tmp/tail_pid_$claude_pid

  if [ "$result_received" = true ]; then
    # Give Claude 3s to exit cleanly, then kill if hung
    sleep 3
    kill $claude_pid 2>/dev/null || true
    wait $claude_pid 2>/dev/null || true
  else
    # Timeout or failure
    kill $claude_pid 2>/dev/null || true
    echo "⚠️  Claude did not complete within timeout"
    return 1
  fi

  # Parse output for display and save to debug log
  jq -r 'select(.type == "content_block_delta") | .delta.text' "$temp_output" 2>/dev/null | tr -d '\n' > "$debug_log"

  # Check if output suggests success
  if grep -q "COMPLETE\|complete\|done\|Task.*complete" "$debug_log" 2>/dev/null; then
    return 0
  elif [ ! -s "$debug_log" ]; then
    # Empty output = likely failure
    cat "$temp_output" > "$debug_log"
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
      echo "$OUTPUT"
      break
    else
      echo "❌ Attempt $attempt failed"
      if [ $attempt -lt 3 ]; then
        echo "🔄 Retrying..."
        sleep 2
      fi
    fi
  done

  if [ "$SUCCESS" = false ]; then
    echo ""
    echo "❌ All retries failed for iteration $i"
    echo "   Task: $NEXT_TASK"
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

  sleep 2
done

echo ""
echo "════════════════════════════════════════════"
echo "  ⚠️  Max iterations ($MAX_ITERATIONS) reached"
echo "  Check tasks.json for remaining tasks"
echo "════════════════════════════════════════════"
exit 1
