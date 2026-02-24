# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Philosophy

This codebase will outlive you. Every shortcut becomes someone else's burden. Every hack compounds into technical debt that slows the whole team down.

You are not just writing code. You are shaping the future of this project. The patterns you establish will be copied. The corners you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

### Database (Drizzle + Neon)

```bash
npm run db:push      # Push schema changes to Neon
npm run db:generate  # Generate migration files from schema changes
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

### shadcn/ui

```bash
npx shadcn@latest add <component>  # Add component (e.g., button, card)
```

## Architecture

Personal bookmark categorization app. Import Chrome bookmarks, categorize via keyboard-driven UX, search/filter later. Single-user, no auth.

### Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (new-york style, dark mode only)
- Neon Postgres + Drizzle ORM (type-safe queries, FTS via tsvector)
- react-tweet for tweet embeds (no API key)
- Vercel deployment

### Project Structure

```
src/
  app/           # Next.js App Router pages
    page.tsx     # Home/import page
    /categorize  # Keyboard-driven categorization flow
    /browse      # Filter + search
    /categories  # Category management
    /api         # API routes
  db/
    schema.ts    # Drizzle schema (all tables + exported types)
    index.ts     # Drizzle client (Neon HTTP driver)
  lib/
    utils.ts     # cn() helper for shadcn
  components/
    ui/          # shadcn components
drizzle.config.ts  # Drizzle Kit config
```

### Database Schema

Four tables: `bookmarks`, `categories` (hierarchical), `settings` (key-value), `bookmark_categories` (junction). Full-text search via `fts` tsvector column. Schema defined in `src/db/schema.ts`. FTS column and partial indexes managed via custom SQL (not Drizzle declarative).

### Key Concepts

- **Boundary**: Divides Chrome bookmarks into "keepers" (before) and "to categorize" (after). Set by folder name + last URL.
- **Categories**: Hierarchical (main + subcategory). Sorted by usage count. Keys 1-9, 0 map to top 10 most used.
- **Skipped bookmarks**: Marked `isSkipped=true`, excluded from browse and re-import.

## Conventions

- Path alias: `@/*` maps to `./src/*`
- Icons: lucide-react
- Styling: Tailwind + `cn()` utility from `@/lib/utils`

## UI Design Principles

This is a **production-quality SaaS product**, not a beta side project. Every screen should feel intentional, polished, and professional.

### Visual Hierarchy
- Use subtle gradients and shadows to create depth and guide attention
- Interactive elements need clear affordances (hover states, focus rings, transitions)
- Keyboard shortcuts should have visible hints that feel integrated, not bolted on
- Fixed heights on repeated elements (buttons, cards, list items) for visual consistency

### Dark Theme Standards
- Background layers: zinc-950 → zinc-900 → zinc-800 for depth
- Text: zinc-100 for primary, zinc-400 for secondary, zinc-600 for hints
- Accent: emerald/teal gradient for primary actions and highlights
- Borders: zinc-800/50 or zinc-700/50 for subtle separation

### Polish Checklist
- Text truncation with ellipsis on overflow (never break layouts)
- Loading states for all async operations
- Hover and focus states on every interactive element
- Smooth transitions (200ms default, 500ms for larger animations)
- Consistent spacing using Tailwind's scale (4, 6, 8, 12, etc.)

### Anti-patterns to Avoid
- Flat, lifeless buttons without hover feedback
- Elements that shift layout on interaction
- Missing loading spinners or skeleton states
- Inconsistent border radius or spacing
- Light theme leakage (everything must work in dark mode)

## Skills to Use

**Always load these skills for relevant work:**

- **react-best-practices** (Vercel): Load when writing ANY React/Next.js code. Contains 40+ performance rules. Critical for avoiding waterfalls, bundle bloat, and re-render issues. Command: `Load the react-best-practices skill`

- **frontend-design**: Load when building UI components. This app should look like a polished personal dashboard. Not bold or flashy. Sleek, minimal, single accent color, dark theme only. No landing page aesthetics.

- **dev-browser**: Load for E2E testing and visual verification. Use to take screenshots, verify UI looks correct, test keyboard interactions. **Always use viewport `{ width: 1440, height: 900 }`** (typical 14" MacBook Air browser window).

## Research Requirements

**Before implementing anything involving external services:**

1. **Drizzle ORM**: WebSearch for current docs. API evolves. Check drizzle-orm and drizzle-kit changelogs.

2. **Neon**: WebSearch for current docs. Serverless driver API and connection pooling details change.

3. **react-tweet**: WebSearch for current usage. Twitter/X API changes frequently.

4. **New packages**: Search npm, check last publish date, weekly downloads, GitHub issues. Don't add abandoned packages.

**Before making architectural decisions:**

1. Grep/read existing code to understand current patterns
2. Check PRD.md for design decisions already made
3. Check progress.txt for learnings from previous iterations

## Automated Coding Rules (Ralph)

### TDD Required

1. Write failing tests FIRST describing expected behavior
2. Implement until tests pass
3. Never mark a task complete without passing tests
4. Run full test suite before committing

### Verification Gates

Before marking any task complete:
1. `npm run build` passes (type errors caught)
2. `npm run test` passes (all tests green)
3. **For UI changes: REQUIRED screenshot verification with dev-browser**
   - Start dev server: `npm run dev` (background)
   - Start dev-browser: `~/.claude/plugins/cache/dev-browser-marketplace/dev-browser/66682fb0513a/skills/dev-browser/server.sh &`
   - Wait for "Ready" message
   - Take screenshot and visually verify it looks correct
   - Screenshot template in prompt.md
4. For API/external integrations: verify with actual API call

### Knowledge Persistence

After completing a task, if you learned something reusable:
1. Add patterns to `scripts/ralph/progress.txt` (Codebase Patterns section at top)
2. Add permanent rules to this CLAUDE.md file
3. Update PRD.md if design decisions were made

### Subagents

Use Task tool with subagents for:
- Exploring codebase: `subagent_type=Explore`
- Research tasks: `subagent_type=general-purpose`
- Parallel independent work: multiple Task calls in one message

### Don't Assume

- Don't assume DB queries work without testing
- Don't assume keyboard shortcuts work without testing
- Don't assume parsing works without edge case tests
- Don't assume UI looks right without screenshot verification
- When in doubt, write a test

## Testing Strategy

### Stack
- **Vitest**: Unit and integration tests (fast, native ESM)
- **Playwright**: E2E tests (critical flows only)

### What to Unit Test
- Chrome HTML parser (pure function)
- Tweet ID extraction
- Export to Chrome HTML formatter
- Category sorting logic
- Drizzle query helpers
- Search logic
- Keyboard shortcut state machine

### What to E2E Test (minimal)
- Import flow: drop file → see summary → start categorizing
- Categorize one bookmark: keyboard shortcuts work, saves to DB

### Commands
```bash
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:e2e       # E2E tests only
npm run test:coverage  # Coverage report
```
