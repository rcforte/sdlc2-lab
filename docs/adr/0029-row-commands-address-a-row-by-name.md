# ADR-0029 — Row commands address a row by name and guard membership; rows are values, not entities

- **Status:** Proposed — accepted pending the human VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `remembered-names` (`.sdlc2/features/remembered-names/design.md` §2.4 INV-19/INV-22, §4.1, §2.2)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Amended by:** **ADR-0035**, which gives a saved name a second field — when it was saved. Two
  claims in this record do not survive that: the heading's *rows are values, not entities*, and the
  seed phrase quoted below, *a saved name is an identity, not an event*. Both were true while a
  saved name was nothing but its text. A row is now an identity that **records one event**, with
  equality deliberately ignoring it. Everything else here stands unchanged and is load-bearing:
  identity is still the name alone, `remove` and `greetAgain` still take a plain name, and
  `key={name}` still keeps an untouched row's DOM node and its focus where they were. A reader
  arriving here first should read ADR-0035 next.
- **Amends:** **ADR-0021**, whose decisive property was that `greetAgain(visit)` took **no
  argument**, so no caller could greet as a name that was never saved. With five saved names the
  command must be told which one, so the signature grows; this record replaces the guarantee the
  signature used to give with a membership guard inside the command, and says why. A reader
  arriving at ADR-0021 first should read this next.
- **Relates to:** ADR-0012 (log entries are values, not entities — the same call, made on the
  unmerged `greeting-log` branches), ADR-0020, ADR-0026, ADR-0028, ADR-0031

## Context

Two of the three new visitor actions act on **one row**: *Greet me again as `<name>`* and
*Remove `<name>`*. The domain has to be told which row, and the answer decides three other things
at once: the React key (which decides whether an untouched row's DOM node — and its focus —
survives a change), what a row *is* in the model, and whether ADR-0020's "the signature is the
guarantee" property survives.

The seed is explicit that a row never moves, that a saved name is *an identity, not an event*, and
that removal takes out exactly one name.

## Options considered

1. **By index** (`remove(visit, 2)`, `greetAgain(visit, 0)`).
   *Rejected.* An index is a position, and positions shift the moment anything is removed. The
   component would hold a number that is only valid until the next render, and any race or stale
   closure removes the wrong name silently. It also makes every test read a count rather than a
   name.
2. **Give each row a generated id** (`{ id, name }`), addressed by id.
   *Rejected.* That makes a row an **entity** — something with identity apart from its value — and
   it has none: two rows with the same name cannot exist (ADR-0028 + INV-17), a row cannot be
   edited, and it never changes after it is appended. An id would need a generator, which is either
   a counter in the aggregate (state nothing reads) or `crypto.randomUUID()` (an ambient global the
   purity guard forbids — ADR-0008). ADR-0012 refused the same thing for log entries.
3. **Pass the whole row object back into the command.**
   *Rejected.* Identical to option 2's cost with an extra allocation, and it invites reference
   equality into a module built on value replacement.
4. **By name, with the command trusting the caller** (`remove(visit, name)`, no guard).
   *Rejected as the whole answer.* It is the right address but it drops ADR-0020's property:
   `greetAgain(visit, 'Grace')` would greet as a name that was never saved — the exact thing the
   old no-argument signature made impossible — and this feature's controls are not the only future
   caller.
5. **By name, with a membership guard in each command.** *(chosen)*

## Decision

```ts
export function remove(visit: Visit, name: string): Visit      // identity if !savedNames.includes(name)
export function greetAgain(visit: Visit, name: string): Visit  // identity if !savedNames.includes(name),
                                                               // else exactly submit(visit, name)
```

A row is a **value**: its name is its identity (ADR-0028), so the same string that addresses the
command is the row's React `key` (P15) and the interpolation in both control names (P16).
`greetAgain`'s body remains "delegate to `submit` and do nothing else" (INV-22), so re-announcement,
alert-clearing, the untouched draft and the advanced greeting count are inherited, not restated.

Both guards are unreachable through the DOM (a control exists only for a row that exists), so both
are unit-asserted by identity in `src/visit.test.ts` — the same treatment INV-10/INV-12 already get.

## Consequences

**Positive**

- **`key={name}` is legitimate, and it pays.** Because INV-17 forbids duplicates, the name is a
  stable unique key, so appending or removing leaves every untouched row's DOM nodes alone —
  measured (design §5.4): the `Greet me again as Ada` button is the *same node object* before and
  after `Remove Bob`. Focus and identity survive, which is what makes ADR-0031's focus rule a
  single special case rather than a general problem.
- ADR-0020's property is preserved in substance: a name that was never saved cannot be greeted
  again, and a name that is not in the list cannot be removed. The guarantee moved from the
  signature into one guard clause with one owner.
- Every scenario reads the way the Gherkin does — `Remove Bob`, not `remove(2)`.

**Negative / accepted**

- **The signature no longer prevents misuse by itself**; it prevents the *effect*. Accepted, and
  recorded here precisely because ADR-0021 claimed the stronger property and can no longer.
- A caller can pass any string and get the input value back with no complaint. Accepted: totality is
  the house style (ADR-0003), and a throw would put error handling in a click handler.
- If duplicates ever became legal, `key={name}` and both commands would break together. That is a
  feature: they would all have to be reconsidered at once, and INV-17 is the single place the rule
  lives.

## Related

ADR-0012, ADR-0020, ADR-0021, ADR-0026, ADR-0028, ADR-0031, design §2.4, §4.1, §5.4.
