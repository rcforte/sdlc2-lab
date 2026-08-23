# sdlc2-lab

A deliberately tiny React + TypeScript project whose only purpose is to be a **target repo for
the sdlc2 feature graph**. It exists so harness changes can be exercised end to end against a
real repo without touching a project anyone cares about.

Disposable by design: if a run goes badly, delete the `slice/*` branches and `.sdlc2/`, and
nothing of value is lost.

**Deliberately not** Spring Boot, Cucumber or Playwright. The lab tests the *graph* — node
loops, arbiters, human-verify records, slice branching, the run report — and every harness bug
found so far has been graph-level, not stack-level. A full stack would add maintenance without
adding signal.

## Conventions

- Components are function components in `src/`, one file each, named export.
- Every component has a sibling `*.test.tsx` asserting **behaviour through the rendered DOM** —
  roles and accessible names, never implementation details.
- `@testing-library/user-event` for interaction; `@testing-library/jest-dom` matchers.
- Tests are the specification. No component ships without one.
- One sanctioned exception to "through the rendered DOM": a **constraint test** — an assertion
  that something *never* happens (no web-storage write, no network call). The absence it guards
  has no rendered form, so it has to reach past the DOM. Say so in a comment at the test, and
  keep it rare: everything expressible as behaviour stays behaviour.

## sdlc2

<!-- sdlc2:config -->
```yaml
# The stack this project actually uses. sdlc2 carries no house stack of its own as of 0.1.6:
# the developer writes what this line says, and the code reviewer judges idiom against it.
# Leaving it out is not neutral — the personas are then told it is undeclared and left to infer
# it from the code. [E2-02]
stack:  "TypeScript 5, React 19, Vite; Vitest + React Testing Library + user-event (jsdom)"
# Max slices built at once. Only takes effect when commands.install is set. Default 4. [E2-10]
lanes:  4
commands:
  test:    "npm test -- --run"
  build:   "npm run build"
  # Unlocks parallel slice lanes: independent slices build concurrently, each in its own git
  # worktree, and a fresh worktree has no node_modules. Vitest/jsdom binds no fixed port, so
  # concurrent suites do not collide here.
  install: "npm ci"
seam:
  backend:  ""
  frontend: "React Testing Library + user-event via Vitest (jsdom)"
```
<!-- /sdlc2:config -->
