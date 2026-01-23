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

  # Run Claude with the prompt and save to debug log
  DEBUG_LOG="$SCRIPT_DIR/debug-iteration-$i.log"
  echo "🔍 Running Claude (output: $DEBUG_LOG)..."
  echo "Iteration $i - $(date)" > "$DEBUG_LOG"
  echo "Task: $NEXT_TASK" >> "$DEBUG_LOG"
  echo "---" >> "$DEBUG_LOG"

  OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | claude --dangerously-skip-permissions 2>&1 | tee "$DEBUG_LOG" /dev/stderr) || {
    RETRY_EXIT=$?
    echo ""
    echo "⚠️  Iteration $i failed (exit code $RETRY_EXIT)"
    echo "📄 Last 10 lines of debug log:"
    tail -10 "$DEBUG_LOG"
    echo ""
    echo "🔄 Retry 1 of 2..."
    echo ""

    # Retry 1
    DEBUG_LOG_RETRY1="$SCRIPT_DIR/debug-iteration-$i-retry1.log"
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | claude --dangerously-skip-permissions 2>&1 | tee "$DEBUG_LOG_RETRY1" /dev/stderr) || {
      RETRY1_EXIT=$?
      echo ""
      echo "⚠️  Retry 1 failed (exit code $RETRY1_EXIT)"
      echo "📄 Last 10 lines of retry1 log:"
      tail -10 "$DEBUG_LOG_RETRY1"
      echo ""
      echo "🔄 Retry 2 of 2..."
      echo ""

      # Retry 2
      DEBUG_LOG_RETRY2="$SCRIPT_DIR/debug-iteration-$i-retry2.log"
      OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | claude --dangerously-skip-permissions 2>&1 | tee "$DEBUG_LOG_RETRY2" /dev/stderr) || {
        RETRY2_EXIT=$?
        echo ""
        echo "❌ All retries failed"
        echo "   Exit codes: $RETRY_EXIT, $RETRY1_EXIT, $RETRY2_EXIT"
        echo "📄 Last 20 lines of final retry log:"
        tail -20 "$DEBUG_LOG_RETRY2"
        echo ""
        echo "   Check debug logs in scripts/ralph/"
        echo "   Task: $NEXT_TASK"
        echo ""
        sleep 2
        continue
      }
    }
  }

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
