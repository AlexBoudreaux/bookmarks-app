#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKS_FILE="$SCRIPT_DIR/tasks.json"

# Count tasks and calculate iterations
TASK_COUNT=$(jq '.tasks | length' "$TASKS_FILE")
MAX_ITERATIONS=$((TASK_COUNT * 2))

echo "🚀 Starting Ralph"
echo "📋 $TASK_COUNT tasks, max $MAX_ITERATIONS iterations"
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
  echo "═══════════════════════════════════════════"
  echo "  Iteration $i of $MAX_ITERATIONS"
  echo "═══════════════════════════════════════════"

  # Run Claude with the prompt
  OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | claude --dangerously-skip-permissions 2>&1 | tee /dev/stderr) || {
    RETRY_EXIT=$?
    echo ""
    echo "⚠️  Iteration $i failed (exit code $RETRY_EXIT). Retrying once..."
    echo ""

    # Retry once
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | claude --dangerously-skip-permissions 2>&1 | tee /dev/stderr) || {
      echo ""
      echo "❌ Retry failed. Skipping to next iteration."
      echo "   Check tasks.json for incomplete tasks."
      echo ""
      sleep 2
      continue
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

  sleep 2
done

echo ""
echo "════════════════════════════════════════════"
echo "  ⚠️  Max iterations ($MAX_ITERATIONS) reached"
echo "  Check tasks.json for remaining tasks"
echo "════════════════════════════════════════════"
exit 1
