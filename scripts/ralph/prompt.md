# Ralph Agent Instructions

You are an autonomous coding agent. Complete ONE task per iteration.

## Files to Read First

1. `scripts/ralph/tasks.json` - task list with dependencies and completion status
2. `scripts/ralph/progress.txt` - learnings from previous iterations (check Codebase Patterns section)
3. `CLAUDE.md` - project conventions and rules
4. `PRD.md` - full product requirements

## Your Task (ONE per iteration)

### 1. Find Next Task
- Read `tasks.json`
- Find highest priority task where `done: false`
- Check `dependsOn` array. If any dependency has `done: false`, skip to next task
- If ALL tasks have `done: true`, output `<promise>COMPLETE</promise>` and stop

### 2. Load Required Skills
- Always: `Load the react-best-practices skill`
- For UI work: `Load the frontend-design skill`
- For E2E testing: `Load the dev-browser skill`

### 3. Research First
- For Supabase/OpenAI/external APIs: WebSearch for current docs
- For existing patterns: Grep/read codebase first
- Don't rely on internal knowledge for APIs that change

### 4. TDD Implementation
- Write failing tests FIRST
- Implement until tests pass
- Run `npm run test` to verify

### 5. Verify
- `npm run build` must pass
- `npm run test` must pass
- For UI: take screenshot with dev-browser to verify appearance

### 6. Update Progress
Append to `scripts/ralph/progress.txt`:
```
## [Date] - [Task ID]
- What was implemented
- Files changed
- **Learnings:** (if any patterns discovered, gotchas encountered)
---
```

If you discovered a reusable pattern, also add it to the **Codebase Patterns** section at the top of progress.txt.

### 7. Update CLAUDE.md
If you made a design decision or discovered a rule that future iterations should follow, add it to the appropriate section in `CLAUDE.md`.

### 8. Commit
```bash
git add -A
git commit -m "feat: [TASK-ID] [brief description]"
```

### 9. Mark Complete
Update `tasks.json`: set `done: true` for the completed task.

## Important Rules

- **ONE task per iteration**. Stop after completing one task.
- **Tests required**. No task is complete without passing tests.
- **Research external APIs**. Don't guess at Supabase/OpenAI/react-tweet usage.
- **Persist learnings**. Update progress.txt and CLAUDE.md with discoveries.
- **Check dependencies**. Don't start a task if its dependencies aren't done.

## Stop Conditions

- After completing ONE task successfully, end normally
- If ALL tasks are `done: true`, output: `<promise>COMPLETE</promise>`
- If blocked (dependency issue, external service down), document in progress.txt and end normally
