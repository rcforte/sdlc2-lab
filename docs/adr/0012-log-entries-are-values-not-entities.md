# ADR-0012 — Log entries are values, not entities: no ids, and `<li>` keys by index

- **Status:** Proposed — accepted pending the human VERIFY gate (no code exists yet)
- **Date:** 2026-08-22
- **Feature:** `greeting-log` (`.sdlc2/features/greeting-log/design.md` §2.2, §2.4 INV-9a, P9)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0010 (the aggregate they live in), ADR-0008 (INV-6b, which forbids the obvious
  id sources)

## Context

Every DDD reflex says "a collection inside an aggregate is a collection of entities, and entities
have identity". Here the collection is the greeting log and its members are greetings already made.
The contract says three things about them that decide whether identity is real:

- *"Being greeted as the same name twice produces **two** entries"* — so entries are **not**
  distinguished by their value, and a set is wrong.
- *"Removing, editing or re-greeting from an individual entry"* is Out of scope; *"clearing is
  all-or-nothing"* — so nothing ever addresses one entry.
- *"De-duplicating, reordering, or capping"* is Out of scope — so nothing ever moves one entry.

React forces the question into the open regardless: a list needs keys, and `key={entry}` is wrong
the moment "Ada" appears twice (duplicate keys, and React reconciles the wrong nodes).

## Options considered

1. **Entry objects with a generated id** — `{ id: crypto.randomUUID(), name }` or
   `{ id: Date.now(), name }`.
   *Rejected on two independent grounds.* (a) It breaks INV-6b and trips the existing lexical purity
   guard (ADR-0008 bans `Date`, `Math.random`, and ambient globals inside `src/visit.ts`) —
   deliberately, because a domain whose output depends on the clock or a random source is no longer
   a pure function of its inputs and its unit tests get harder for no gain. (b) The id would have no
   consumer: nothing addresses an entry, so identity would exist purely to satisfy a framework's
   reconciliation, which is an implementation concern leaking into the domain.
2. **Entry objects with a monotone mint counter on the aggregate** (`nextEntryId`).
   *Rejected.* Pure and deterministic, so (a) above is fixed — but (b) stands, and it re-introduces
   exactly the "synthetic counter beside the real thing" that ADR-0011 just deleted. It is the right
   answer on the day per-entry operations arrive, and the wrong answer before then.
3. **Plain trimmed strings, keyed by array index.**
4. **Plain strings keyed by `` `${index}-${entry}` ``** — *rejected as cargo cult:* it looks safer
   and is not. It is unique exactly when the index alone is, and it makes a node's identity change
   whenever the text at that index changes — which in an append-only list never happens anyway.

## Decision

Option 3. `greetingLog: readonly string[]`, each element the trimmed Name; rendered as
`visit.greetingLog.map((entry, index) => <li key={index}>{entry}</li>)`.

Index keys are the *correct* choice here rather than a tolerated shortcut, and the reason is a
property of the aggregate, not of the component: INV-9a makes the log **append-only**, and INV-9b
makes the only removal a total one. An entry's index therefore never changes while the entry exists,
so index-as-key is stable identity, not a coincidence.

## Consequences

**Good.**
- The domain stays pure (INV-6b intact, existing guard unchanged) and the aggregate gains no field.
- "Two entries for the same name" and "oldest first" need no code — they are what an appended array
  already is.
- Nothing in the type system offers a way to address a single entry, so the Out-of-scope rule
  ("no per-entry controls") is structural rather than a matter of discipline.

**Bad / accepted.**
- The `key={index}` line is the one place in this design whose correctness depends on an invariant
  stated elsewhere. It is annotated in the code and named in the deepening pass; the day the log
  gains removal, reordering or editing, the keys are wrong **before** any test says so.
- Entries carry no timestamp, so a future "greeted at 14:02" is a new decision, not an extension.

## What would change this

Any per-entry capability — remove one, edit one, re-greet from one, reorder, cap. All are Out of
scope today. When one arrives, adopt option 2 (a monotone id minted by the aggregate, never a clock
or a random source) and switch the keys in the same change.
