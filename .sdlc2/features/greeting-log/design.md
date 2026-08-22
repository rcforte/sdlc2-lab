# Design — The greeting log (`greeting-log`)

> Input: `.sdlc2/features/greeting-log/feature.md` (seed + product contract), `issues/01..03`,
> `mockup.html`, `VERIFY-WITH-HUMAN.md` (**VH-01..VH-05** — honoured, not relitigated), and the
> code and design this feature extends: `src/visit.ts`, `src/GreetingScreen.tsx`,
> `.sdlc2/features/greet-visitor/design.md`, `docs/adr/0001..0009`.
> Output consumed by the `developer` node.
>
> This document designs the **domain model, the boundaries, the contracts, and the outer
> acceptance-test seam for each of the three slices**. It changes no acceptance criterion.
>
> **Where each VH record lands:** VH-01 / VH-04 / VH-05 (the clear control's name) → §2.5, §4.2
> (`CLEAR_CONTROL_LABEL`, one edit site) · VH-02 (no `aria-live` on the log) → P10, §5.5, ADR-0014 ·
> VH-03 (clearing narrows to log + greeting) → INV-11, ADR-0013 · VH-07 (clearing is irreversible,
> no confirm, no undo — `ux`, round 2) → honoured as specified: P8/P11 add no confirmation step and
> no undo path. Two records are **appended** by this node: **VH-06** (round 2) — clearing is
> perceivable by *focus*, not by announcement, and whether a screen reader speaks the empty message
> on focus is a human check (§5.5, ADR-0014) — and **VH-08** (round 3) — the log region's *visible*
> focus indicator, the sighted half of the same question, which this repo ships no stylesheet to
> carry (§2.4 P12, §5.6, ADR-0017).
>
> **Everything prescribed below was built and run** on a throwaway copy of this repo (React 19,
> jsdom 26, `user-event` 14.6.4, `jest-dom` 6.9.1, Vitest 3.2.7): the full end-state `visit.ts` and
> `GreetingScreen.tsx` of this design, 13 probe assertions green in round 2 and 7 more in round 3
> (§5.4, §5.6), `tsc -b` exercised, and the existing suite re-run against the changed domain —
> including a **mutation probe** of the extended storage guard (§5.4). In this repo the architect
> node wrote only: this design, `docs/adr/0010`–`0018`, two **Status-line amendments** to
> `docs/adr/0002` and `docs/adr/0009` (bookkeeping — pointers forward to the ADRs that supersede or
> amend them; not one word of either Decision changed), and the appended VH records.

---

## 1. Problem understanding

### Functional requirements (from the product contract, restated as rules)

| # | Rule | Source |
| --- | --- | --- |
| R10 | Every **successful** submission appends exactly **one** entry to the greeting log, holding the **trimmed** Name alone. | Story 1 |
| R11 | Entries read **oldest first**; an appended entry never moves an existing one. No dedup, no reorder, no cap. | Story 1, seed Decisions |
| R12 | The greeting on screen **is** the log's newest entry; when the log is empty there is no greeting (status region present, textless). One fact, two views. | Story 1, seed Decisions |
| R13 | A **blank** submission (empty or whitespace-only after `trim()`) appends nothing and removes nothing; the alert behaviour of `greet-visitor` is unchanged. | Story 1 |
| R14 | **Clearing** empties the log and removes the current greeting with it, restoring the *not-yet-greeted appearance*. It touches neither the Name field nor a pending alert. | Story 2, VH-03 |
| R15 | The **clear control exists iff** the log has ≥ 1 entry — absent from the DOM otherwise, never disabled. | Story 2 |
| R16 | The **log region** is present from the first render and never removed. Empty state says so **in words**; the two shapes (empty message / ordered list) are mutually exclusive. | Story 1, seed Decisions |
| R17 | After clearing, **focus moves to the log region**. The region is programmatically focusable and **not** in the tab order. | Story 2, seed Decisions |
| R18 | Nothing survives a **fresh visit**: no entry, no clear control. In memory only — no backend, no web storage. | Story 3, Out of scope |
| R9′ | **Amended scope of `greet-visitor`'s R9** (every submit is perceivable): R9 constrains **submissions**. `clear` is a *second command*, and it deliberately returns the status region to textless — the state R9 forbade a *submission* from producing. Clearing's perceivability is carried by the focus move (R17), because an emptying live region announces nothing. | seed Decisions, ADR-0009 (amended by ADR-0014) |

### Non-functional / cross-cutting

- **In-memory only**, dying with one mount of `GreetingScreen` (R18). Every *assertion* in the
  `never writes to web storage` constraint test and both `greet-visitor` fresh-visit guards keeps
  passing, and the guards' bodies are untouched — verified, §5.4. The constraint test itself is
  **extended, not modified in what it claims**: slice 02 adds one line to its *arrangement* (an
  activation of the clear control), because that test's whole design is an enumeration of "every
  path that mutates the visit", and this feature adds a second such path. Leaving the enumeration
  short would be the way this feature *does* break the guarantee the seed told it not to break —
  measured: a `sessionStorage.setItem` planted in `onClear` passes the un-extended test and all 18
  new scenarios (§5.4, ADR-0018).
- **Accessibility is the behaviour**: role + accessible name are the contract (`region`, `list`,
  `listitem`, `button`, `status`, `alert`), not classes or markup shape beyond what those imply. The
  one `className` this design adds (P12, `greeting-log`) is a **styling hook with no assertion
  attached** — no test queries it, and none should.
- **Synchronous and pure**: one more total state transition (`clear`) beside the existing `submit`.
  No async, no effect, no cleanup — therefore no retry, ordering, or idempotency machinery. The one
  imperative act in the whole feature is `element.focus()` (P11).
- **Cost of the change is bounded**: one new domain command, one new derivation, ~25 lines of JSX,
  no new dependency, no new file in `src/` (ADR-0016).

### Explicit non-goals (carried from the contract, so the design cannot drift into them)

Per-entry controls · dedup / reorder / cap · counts or summaries · undo · persistence of any kind ·
i18n · CSS position · changing blank-submission behaviour · an `aria-live` log region (VH-02).

---

## 2. Domain model

### 2.1 Bounded context

Still **one** context — *the visit to the greeting screen* — with one aggregate in it. This feature
adds no context, no integration, no upstream/downstream relationship. The seed's own sentence is
the modelling instruction: *"The status region and the log are two views of one fact."* A design in
which the greeting and the log are two facts would need a rule to keep them equal; this one needs
none, because there is only one fact to keep.

### 2.2 Ubiquitous language → code names

| Language (seed §Ubiquitous language) | Code |
| --- | --- |
| Greeting log | `Visit.greetingLog: readonly string[]` — oldest first |
| Log entry | one element of `greetingLog`: the **trimmed Name**, a value (ADR-0012) |
| Empty log | `isLogEmpty(visit)` — the single predicate |
| Clearing | `clear(visit): Visit` — the command; *not* `clearLog`, which under-describes it (the greeting goes too) and *not* `reset`, which over-describes it (the alert and the draft stay) |
| Greeting | `greetingText(visit)` — **derived** from the newest entry (ADR-0011) |
| Greeted this visit / You have not been greeted yet. / Clear the log | three literals in `GreetingScreen.tsx` (§2.5) |

Terms **not** introduced: "history", "list" as a domain word (it is a DOM role only), "items",
"records", "count". The seed rejects the first; the rest would be synonyms for terms already fixed.

### 2.3 The aggregate: `Visit` (extended, and one field smaller)

`Visit` remains the single aggregate root, and the greeting log is a field **inside** it (ADR-0010).
The feature makes the aggregate *smaller*, not bigger:

```
                     before this feature                      after this feature
  Visit {                                          Visit {
    greetedName:            string | null            greetingLog:            readonly string[]
    greetingCount:          number          ──►      lastSubmissionWasBlank: boolean
    lastSubmissionWasBlank: boolean                  blankCount:             number
    blankCount:             number                 }
  }
```

- `greetedName` **disappears**: the greeting is the newest entry (ADR-0011). This is what makes
  R12 true by construction rather than by two assignments that must agree, and it is what makes
  `clear` a one-line command that cannot forget to remove the greeting.
- `greetingCount` **disappears**: `greetingLog.length` already counts successful submissions, so
  R9's success-half identity (`greet-visitor` INV-8a) is now carried by the log itself. A synthetic
  counter beside a real ledger is a second source of the same truth (ADR-0011). `blankCount` stays:
  blank submissions leave no trace in the log, so nothing else can carry INV-8b.
- Commands: `submit(visit, rawName)` (existing, extended) and `clear(visit)` (new). Both total,
  pure, synchronous, returning a whole new `Visit`.

**Why one aggregate and not two.** `clear` must empty the log **and** remove the greeting as one
indivisible act. If "the greeting" and "the log" were separate aggregates, that single visitor
action would be a transaction spanning two of them — the exact shape DDD tells you not to build,
and the shape the acceptance criteria would then have to hope stays consistent. Full options in
ADR-0010.

### 2.4 Invariants and their owners

Every rule below has **exactly one owner**. Where a `greet-visitor` invariant is restated, the
owner does not move — only the field it talks about is renamed; where one is superseded, it is
named as superseded so no rule is left with two homes or none.

| # | Invariant | Owner (exactly one) | How the owner enforces it |
| --- | --- | --- | --- |
| INV-9a | **Append-only success.** The *only* way an entry enters the log is `submit`'s non-blank branch, which appends exactly one entry — `rawName.trim()` — at the **end**, leaving every existing entry in place. | `submit` in `src/visit.ts` | One expression, `[...visit.greetingLog, rawName.trim()]`. No sort, no filter, no dedup, no cap: R11 and the "same name twice = two entries" rule need no code at all, which is why they cannot be got wrong. |
| INV-9b | **Complete emptying.** The *only* way an entry leaves the log is `clear`, and `clear` removes **all** entries. There is no partial removal anywhere in the domain. | `clear` in `src/visit.ts` | `{ ...visit, greetingLog: [] }`. "No per-entry removal" (Out of scope) is structural: no function takes an index. |
| INV-9c | **No third writer, and no in-place mutation.** `Visit` values are constructed in exactly three places — `newVisit`, `submit`, `clear` — and `greetingLog` is `readonly string[]`, never `push`ed, `splice`d or sorted. | `src/visit.ts` (the module) | The type forbids mutation at compile time (`strict`); the module has three construction sites and a reviewer can count them. `GreetingScreen` receives a `Visit` and never builds one. |
| INV-10 | **The greeting is the newest entry.** `greetingText` is `''` when the log is empty, and `Hello, ` + the **last** entry otherwise. There is no other producer of greeting text. | `greetingText` in `src/visit.ts` | Reads `greetingLog[length - 1]`. R12 ("the on-screen greeting is the log's newest entry") is then not a rule anyone can break: there is nowhere else for the greeting to come from. Supersedes `greet-visitor` INV-3 (same owner, same signature). |
| INV-11 | **Clearing touches the log and nothing else.** `lastSubmissionWasBlank` and `blankCount` are carried through `clear` unchanged, so a pending alert survives; `clear` never returns `newVisit`. | `clear` in `src/visit.ts` | `{ ...visit, greetingLog: [] }` — the spread *is* the guarantee. Story 2's "Clearing does not dismiss a pending alert" and VH-03. The Name field is out of reach by construction: it is not in `Visit` (INV-6c). |
| INV-12 | **Emptiness is decided in one place.** `isLogEmpty(visit)` is the single predicate for "the log has no entries"; no component computes emptiness itself. | `isLogEmpty` in `src/visit.ts` | `visit.greetingLog.length === 0`. From slice 02 on, two DOM decisions depend on it (which shape — P7; whether the clear control exists — P8) and they must never disagree; in slice 01 only P7 reads it, and that is already enough to keep emptiness out of the component (§5.1). Same division of labour as INV-5b/P2. |
| INV-2′ | **Entries are trimmed and non-blank.** (Restatement of `greet-visitor` INV-2 for the renamed field; owner unchanged.) | `submit` | The non-blank branch is the only writer and it writes `rawName.trim()`; the blank branch appends nothing (INV-13). So `Hello, ` with nothing after it, and a blank `<li>`, are both unreachable. |
| INV-13 | **A blank submission changes neither the greeting nor the log** — one statement now, because they are one fact. (Supersedes `greet-visitor` INV-4, same owner.) | `submit` (blank branch) | `{ ...visit, lastSubmissionWasBlank: true, blankCount: +1 }` carries `greetingLog` through by reference: R13. |
| INV-6a **(extended)** | **The log's lifetime is the visit's lifetime**: one mount of `GreetingScreen`, beginning at `newVisit` (`greetingLog: []`). | `GreetingScreen` | Unchanged: one `useState<Visit>(newVisit)`. The log needs **no new lifetime invariant** because it lives inside `Visit` — that is one of ADR-0010's reasons. A second `useState<string[]>` would have created a second lifetime to guarantee, and slice 03 would have had two ways to fail. |
| INV-6b **(unchanged)** | The domain module stays pure: no imports, no module-level mutable binding, no ambient browser global. | `src/visit.ts` | The existing lexical guard in `src/visit.test.ts` (ADR-0008) covers the new code with no change. Note for ADR-0012: this is also why entry ids may **not** be minted with `Math.random`/`Date`. |
| INV-5a/5b, INV-1, INV-7, INV-6c, INV-8b | Unchanged from `greet-visitor`, same owners. | as before | This feature adds no blank-name rule and no Name-field rule. `greetingCount`/INV-8a is the one deletion — superseded by INV-9a (ADR-0011). |

**Presentation rules** — owned by `GreetingScreen.tsx`, which decides *whether an element exists*
and *what shape it has*; it never decides a domain question.

| # | Rule | How |
| --- | --- | --- |
| P6 | The log region is rendered **unconditionally, from the first render, and never removed**: `<section ref className="greeting-log" tabIndex={-1} aria-labelledby={LOG_HEADING_ID}>` with a visible `<h2 id={LOG_HEADING_ID}>Greeted this visit</h2>` as its only accessible name. | **Three** attributes are load-bearing; the first two were probed (§5.3): **without `aria-labelledby` a `<section>` is not exposed as `role="region"` at all** and `getByRole('region', …)` finds nothing; **without `tabIndex={-1}` `.focus()` is a no-op** and R17 fails. The third is `className="greeting-log"` — `mockup.html`'s own normative selector, and the attach point for the *visible* focus indicator (P12). It is one attribute, it carries no behaviour, and it means the styling owner never has to edit this component. |
| P7 | **Exactly one of two shapes**, chosen by one ternary on `logIsEmpty`: the empty `<p>` message, or the `<ol>` of entries. Never both, never neither. | `{logIsEmpty ? <p>{EMPTY_LOG_MESSAGE}</p> : <ol>…</ol>}` — a ternary, *not* two independent `&&` conditionals, which is what would let both shapes appear at once. |
| P8 | The clear control is rendered **iff** the log is non-empty, inside the region, after the entries. | `{!logIsEmpty && <button type="button" onClick={clearTheLog}>{CLEAR_CONTROL_LABEL}</button>}` reading the **same const** as P7, so R15 and R16 cannot disagree. `type="button"` matters: it sits outside the form, and a default `type="submit"` would make it a second submit path. |
| P9 | Entries render in array order, one `<li>` per entry, whose text is the entry **alone** — never `Hello, …`, never a count. | `visit.greetingLog.map((entry, index) => <li key={index}>{entry}</li>)`. Index keys are correct **here** and only here: append-only, never reordered, never individually removed (ADR-0012). |
| P10 | The log region carries **no** `aria-live`, no `role="status"`, and follows the status region in document order. | The `<section>` is the next sibling after `<p role="status">`. VH-02: this constraint is prose + human check, never a DOM assertion. |
| P11 | Clearing is one handler: `setVisit(clear)` **and** `logRegion.current?.focus()`, in that order, with **no `useEffect`**. | Legal precisely because P6 guarantees the region is already mounted and survives the update. Probed: the focus lands on the region whichever side of the re-render it happens on; omit the call and focus falls to `document.body`, which is the defect R17 exists to prevent. |
| P12 | Focus must be **visible**, not merely **placed**. The DOM half ships here: `className="greeting-log"` (P6). The CSS half — `.greeting-log:focus { outline: var(--focus-ring-width, 2px) solid #1a1a1a; outline-offset: var(--focus-ring-offset, 2px); }`, `:focus` and **not** `:focus-visible` — is **deferred with a named owner**, not left unowned: the frontend-design node / the human VERIFY gate, recorded as **VH-08** (§5.6, ADR-0017). | `mockup.html` §5 makes the indicator normative and gives the reason: a script-driven `.focus()` on a `tabindex="-1"` element does not reliably match `:focus-visible` (in Chromium it depends on whether the *last* interaction was keyboard — activate "Clear the log" with a mouse and it does not match at all), so a sighted keyboard visitor would see nothing land. This repo ships **no stylesheet and no `className` anywhere** today, and the declared seam cannot see one either — probed (§5.6): with the design's markup rendered, `getComputedStyle(region).outlineWidth` is `''`, since Vitest does not process CSS by default. So the rule is written down verbatim, the hook exists, and who owns it is stated. |
| P4′ | The status region's keyed child is `<span key={visit.greetingLog.length}>`. | Replaces `key={visit.greetingCount}` one-for-one. Measured (§5.3): identical resubmit still mutates the status region and not the alert; a failing resubmit still mutates the alert and **not** the status region; and the key changes on `clear` too (n → 0), which is a DOM change but an **emptying** one — hence R9′ and the focus move. |

### 2.5 Where visitor-facing text lives (and why)

Three new literals, each with **exactly one production edit site**, all in `GreetingScreen.tsx`:
`LOG_HEADING` ("Greeted this visit"), `EMPTY_LOG_MESSAGE` ("You have not been greeted yet."),
`CLEAR_CONTROL_LABEL` ("Clear the log", `po-proposed, unconfirmed` — VH-01/04/05).

They live in the component, not in `src/visit.ts`, and the split follows `greet-visitor`'s existing
rule (ADR-0003): the domain owns copy that is *an outcome of a rule* (`ALERT_MESSAGE`, the
`Hello, ` prefix); the component owns copy that is *a label on a piece of screen furniture*. The
heading, the empty-state sentence and the button label are furniture — no domain function decides
them, and no domain rule changes if a human renames them at VERIFY. When VH-01/04/05 is settled,
the change is one const plus the string in the tests.

---

## 3. Architecture

```
  ┌──────────────────────────── app shell (composition root) ───────────────────────────┐
  │  index.html → src/main.tsx → src/App.tsx   <main><AppBanner/><GreetingScreen/></main>│
  └──────────────────────────────────┬──────────────────────────────────────────────────┘
                                     │ renders  (unchanged by this feature)
  ┌──────────────────────────────────▼──────────────── driving adapter (transport) ─────┐
  │  src/GreetingScreen.tsx                                                             │
  │    useState rawName : string       (INV-7 value · INV-6c lifetime)                  │
  │    useState visit   : Visit        (INV-6a lifetime — the log rides inside it)      │
  │    useRef   logRegion : HTMLElement|null      ← the one imperative handle (P11)     │
  │                                                                                     │
  │    onSubmit  → setVisit(v => submit(v, rawName))            [transition 1]          │
  │    onClear   → setVisit(clear); logRegion.current?.focus()  [transition 2 + focus]  │
  │                                                                                     │
  │    render → greetingText(visit)      → role="status", keyed by greetingLog.length   │
  │             alertText(visit)         → role="alert"        (P2, P3, keyed P5)       │
  │             isLogEmpty(visit)        → which log shape (P7) AND whether the clear   │
  │                                        control exists (P8) — one const, read twice  │
  │             visit.greetingLog        → <ol><li> in array order                (P9)  │
  └──────────────────────────────────┬──────────────────────────────────────────────────┘
                                     │ calls (one-way: the domain imports nothing)
  ┌──────────────────────────────────▼──────────────── domain (pure) ───────────────────┐
  │  src/visit.ts     no React · no DOM · no I/O · no module-level mutable state        │
  │    newVisit · submit · clear · greetingText · alertText · isBlank · isLogEmpty      │
  │    ALERT_MESSAGE                                                                    │
  └─────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                        (still no driven ports — ADR-0006 holds)
```

**Data flow, both commands**

```
submit:  isBlank(raw) ─yes─► { greetingLog: unchanged, lastSubmissionWasBlank: true, blankCount+1 }
                       │
                       └no─► { greetingLog: [...prev, raw.trim()], lastSubmissionWasBlank: false }

clear:                      { greetingLog: [],        lastSubmissionWasBlank: unchanged,
                                                      blankCount:            unchanged }
                            └► greetingText() now returns ''  ← the greeting is removed *because*
                                                                 it was never stored (INV-10)
```

**Ports.** Still none driven (ADR-0006 unchanged: nothing outlives a visit, so there is nothing to
persist, publish or fetch). The one *driving* port is the rendered DOM itself, which is also the
acceptance seam (§5). The domain module's exported surface is the only interface the UI depends on
(§4.1).

**Domain events.** Still none. `GreetingCleared` / `VisitorGreeted` would have exactly one
subscriber — the same component that raised them — and would turn one synchronous call into an
indirection with no second consumer. Revisit when something must outlive a visit (§7, ADR-0006).

**Where this design stops.** No reducer, no `useVisit` hook, no context, no store, no `GreetingLog`
component (ADR-0016), no `src/domain/` tree, no entry-id machinery (ADR-0012).

---

## 4. Contracts

### 4.1 Domain module — `src/visit.ts` (end state, after slice 02)

```ts
export const ALERT_MESSAGE = 'Please enter your name.'          // unchanged

/** In-memory state of one visit. Replaced wholesale; never mutated. */
export type Visit = {
  /** The greeting log, oldest first. Every element is trimmed and non-blank (INV-2′). */
  readonly greetingLog: readonly string[]
  readonly lastSubmissionWasBlank: boolean                       // INV-5a
  readonly blankCount: number                                    // INV-8b
}

export const newVisit: Visit                                     // { greetingLog: [], false, 0 }

export function isBlank(rawName: string): boolean                // INV-1  (unchanged)
export function submit(visit: Visit, rawName: string): Visit     // INV-9a, INV-2′, INV-13, INV-5a
export function clear(visit: Visit): Visit                       // INV-9b, INV-11        ← slice 02
export function isLogEmpty(visit: Visit): boolean                // INV-12                ← slice 01
export function greetingText(visit: Visit): string               // INV-10 ('' when empty)
export function alertText(visit: Visit): string | null           // INV-5b (unchanged)
```

Deliberately **not** exported: a `logEntries(visit)` accessor (a pass-through wider than the work
behind it — the component reads `visit.greetingLog` directly, and the field is `readonly`), an
`entryCount` (Out of scope: no statistics), and anything taking an index (INV-9b).

**Removed:** `Visit.greetedName`, `Visit.greetingCount` (ADR-0011). Every exported *function*
signature is unchanged, so `GreetingScreen`'s only edits are the new markup, the new handler, and
the one key expression (P4′).

### 4.2 Component contract — `src/GreetingScreen.tsx`

| Concern | Contract |
| --- | --- |
| Props | none (unchanged) |
| State | `rawName: string`, `visit: Visit` — both `useState`, both inside the component (INV-6a/6c) |
| Refs | `logRegion: RefObject<HTMLElement \| null>` — attached to the `<section>`; used **only** by P11 |
| Reads per render | `alertText(visit)`, `isLogEmpty(visit)` (into one const), `greetingText(visit)`, `visit.greetingLog` |
| Writes | `setVisit(v => submit(v, rawName))`, `setVisit(clear)`, `setRawName(…)` — nothing else |
| DOM order | form → `role="status"` → `<section>` log region (P10) |
| Log region | `role="region"`, accessible name from the `<h2>` via `aria-labelledby`; `tabIndex={-1}`; `className="greeting-log"` — the styling hook for P12's focus indicator, whose CSS is owned by frontend-design / the human gate (VH-08, ADR-0017), not by this slice |
| Clear control | `<button type="button">Clear the log</button>` inside the region, after the entries (P8) |
| Forbidden | computing blankness or emptiness itself; concatenating `Hello, `; mutating `visit.greetingLog`; `aria-live` on the log; a `useEffect` for focus; touching `rawName` on clear; any storage API |

### 4.3 App shell — `src/App.tsx`

Unchanged. This feature adds nothing to the composition root, and `src/App.test.tsx` keeps
**exactly one `it`** (ADR-0005's tripwire, honoured — §5.1, ADR-0015).

---

## 5. The seam — per slice

**Seam family (all three slices):** the project's declared frontend seam — React Testing Library +
`user-event` via Vitest (jsdom) — driving the rendered DOM **by role and accessible name**. All
**18** scenarios are driven through it; no slice introduces a different kind of acceptance test.
Commands: `npm test -- --run`, `npm run build`.

**Entry point: `render(<GreetingScreen />)` for every scenario in this feature.** No scenario here
asserts composition (none mentions the `sdlc2 lab` heading), and `GreetingScreen` is also the unit
whose mount/unmount **is** a fresh visit (VH-02 in `greet-visitor`). `src/App.test.tsx` is not
touched — ADR-0005's rule that it holds exactly one `it` is the tripwire that keeps the two files
from duplicating each other (ADR-0015).

### 5.1 The table

| Slice | Issue | Kind | Outer seam (file · entry point) | Scenarios | Production change |
| --- | --- | --- | --- | --- | --- |
| **01** | `01-see-the-greeting-log-grow` | **red-first** | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | all **8**: first entry · empty message + heading + document order · three entries oldest-first with the greeting as the newest · same name twice · tabs trimmed · blank leaves the log · whitespace-only leaves the log · blank on an empty log adds nothing and shows no clear control | `visit.ts`: `greetingLog` replaces `greetedName` + `greetingCount`; `submit` appends; `greetingText` derives (INV-10); `isLogEmpty` added. `GreetingScreen.tsx`: log region + two shapes (P6/P7/P9/P10), `key={visit.greetingLog.length}` (P4′). `visit.test.ts`: three compiler-forced edits (§5.4) + new inner assertions (§5.2) |
| **02** | `02-clear-the-greeting-log` | **red-first** | `src/GreetingScreen.test.tsx` · `render(<GreetingScreen />)` | all **8**: no control before the first greeting · control appears · clearing empties log + status · clearing removes the control · Name field untouched · focus moves to the region · greeting after clearing starts the log again · a pending alert survives | `visit.ts`: `clear` (INV-9b, INV-11). `GreetingScreen.tsx`: the clear control (P8), the ref + handler (P11), `className="greeting-log"` (P6/P12). `visit.test.ts`: the `clear` inner assertions (§5.2). **`GreetingScreen.test.tsx`: one line added to the arrangement of the existing `never writes to web storage` test** — `await user.click(screen.getByRole('button', { name: 'Clear the log' }))` after the last successful submit, before the assertions; its comment's enumeration gains "and a clear". No assertion in that test changes (§5.4, ADR-0018) |
| **03** | `03-fresh-visit-starts-with-an-empty-log` | **guard slice** | `src/GreetingScreen.test.tsx` · `render` → interact → `unmount()` → `render` again | **2**: fresh visit after two greetings · fresh visit after a clear-then-greet | **none expected** — the log lives inside `Visit`, whose lifetime ADR-0004/INV-6a already fixed. Same shape as `greet-visitor` slice 04 (ADR-0007's guard-slice rule) |

Both red-first slices are one sitting each: slice 01 is one domain field swap plus one JSX block;
slice 02 is a five-line function, a button, a two-line handler and one line of test arrangement.
Slice 03 adds two tests and no code.

**Each slice compiles and passes alone** under `strict`. Stated precisely, because the compiler will
not do this for you: `noUnusedLocals` does **not** flag an unused *export*, so nothing in the
toolchain would catch a domain function written a slice too early. The discipline is therefore the
developer's, and the slice split is what makes it cheap — at slice 01, `isLogEmpty` has exactly one
production reader (P7's ternary) plus its inner test in `visit.test.ts`, which is enough to justify
exporting it then; P8 (the clear control) becomes its **second** production reader in slice 02, and
that is also when it starts to earn INV-12's "two DOM decisions, one predicate" argument. `clear` is
not written at all until slice 02, where two scenarios demand it. Neither slice leaves an exported
function with no caller.

**Slice 01's "the clear control is not present" step** (scenario 8) passes trivially, because no
clear control exists yet. That is a correct outside-in state, not a hole — exactly like
`greet-visitor` slice 01's "no element with role `alert` is present" steps. Its value is defensive
and arrives fully in slice 02, where it kills the "create the control the moment any submission is
attempted" implementation.

**If slice 03 goes red**, the fix is structural, never a reset: the log has been lifted out of
`GreetingScreen` (a module-level `let`, a context, a second `useState` above the screen, or a
storage write). Put it back inside `useState<Visit>(newVisit)`. Do not add clearing-on-mount.

### 5.2 Inner cycles (`src/visit.test.ts`) — what is added, and why it is not seam drift

`src/visit.test.ts` already exists and is already justified (ADR-0003 permits it; it holds no DOM
and no scenario). This feature adds assertions there for rules the DOM can only see indirectly:

- slice 01 — appends one trimmed entry per success; the same name twice yields two entries; a blank
  submission returns a `Visit` whose `greetingLog` is the **same array reference** (INV-13, sharper
  than any DOM assertion can be); `greetingText` is the newest entry (INV-10); `isLogEmpty`.
- slice 02 — `clear` empties the log, makes `greetingText` `''`, and leaves `lastSubmissionWasBlank`
  and `blankCount` **untouched** (INV-11 / VH-03); `clear(clear(v))` is `clear(v)`'s equal (clearing
  is not a mode — the domain half of Story 2's seventh scenario).
- The existing **purity guard** (ADR-0008) needs no change and continues to cover the new code.

### 5.3 Seam mechanics the developer should not have to rediscover (all probed)

Verified on a throwaway copy of this repo against the installed toolchain — 13 assertions green:

- **The region query needs the name.** `screen.getByRole('region', { name: 'Greeted this visit' })`
  works **only** because the `<section>` has an accessible name. A `<section>` with no
  `aria-labelledby`/`aria-label` is exposed as `generic`, and the query returns nothing — probed
  directly. Point `aria-labelledby` at the visible `<h2>`; do not use `aria-label` (the contract
  requires the same element to satisfy both the region query and the heading query).
- **Focus needs `tabIndex={-1}`.** Probed: `section.focus()` without it leaves
  `document.activeElement === document.body`; with it, `expect(logRegion).toHaveFocus()` passes.
  `-1`, not `0` — the region must not become a tab stop.
- **Tab order is Name field → "Greet me" → "Clear the log"** (three stops when the log is
  non-empty; the region is not among them). Probed keyboard-only:
  `await user.tab(); await user.keyboard('Ada'); await user.tab(); await user.keyboard('{Enter}')`
  greets, then one more `user.tab()` lands on the clear control and `{Enter}` activates it, leaving
  focus on the region.
- **Entries, matched exactly** (the contract forbids the substring form):
  ```ts
  const region = screen.getByRole('region', { name: 'Greeted this visit' })
  const items = within(region).getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(items.map((i) => i.textContent?.trim())).toEqual(['Ada', 'Grace', 'Alan'])
  ```
  `expect(item).toHaveTextContent('Ada')` alone is a **substring** match and passes against
  `Hello, Ada`; `{ exact: true }` is not an option `toHaveTextContent` has. The `toEqual` form above
  reads the list in DOM order and pins count, order and exact text in one assertion.
- **Empty shape:** `expect(within(region).queryByRole('list')).toBeNull()` **and**
  `expect(within(region).getByText('You have not been greeted yet.')).toBeInTheDocument()` — the
  message must be its own element (a `<p>`), because the region's own text also contains the
  heading. Non-empty shape additionally asserts
  `expect(within(region).queryByText('You have not been greeted yet.')).toBeNull()`.
- **Document order:**
  `expect(status.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()`.
- **Tabs** go in via `user-event`'s `paste` on the focused field (`await user.click(field)` or
  `await user.tab()` first). `user.type(field, '{{Tab}')` inserts the five literal characters
  `{Tab}` and silently defeats the scenario (`greet-visitor` VH-08).
- **A fresh visit** is `const { unmount } = render(<GreetingScreen />)` → interact → `unmount()` →
  `render(<GreetingScreen />)`. Not `location.reload()`, not a `key` change.
- **Do not assert the absence of `aria-live` on the log** (VH-02). It is not rendered behaviour, and
  the assertion would pass whether or not the mechanism it names exists.

### 5.4 What this feature does to the tests that already exist (measured, not assumed)

The whole existing suite was re-run against the changed domain on the throwaway copy:

| File | Result |
| --- | --- |
| `src/GreetingScreen.test.tsx` (17 tests, incl. `never writes to web storage` and both fresh-visit guards) | **all 17 pass, unmodified**, against the *end-state* `visit.ts` + `GreetingScreen.tsx` of this design — log region, clear control, focus move and all. One of the 17 is then **extended** in slice 02, by one line of arrangement and zero assertions: see "The storage guard has to grow with the domain" below |
| `src/App.test.tsx`, `src/AppBanner.test.tsx` | **pass, unmodified** |
| `src/visit.test.ts` | **one test fails and `tsc -b` reports three errors** — the `greetingCount` references (ADR-0011) |

So the non-regression promise in the contract holds at the acceptance level: **no shipped DOM test
changes**. The churn is three lines in one inner-cycle file, and the compiler names all three
(`Property 'greetingCount' does not exist on type 'Visit'` at `visit.test.ts:96` and twice at
`:109`). Re-express them against the log:

```ts
// INV-9a — identity now lives in the ledger itself, not a counter beside it
const twice = submit(submit(newVisit, 'Ada'), 'Ada')
expect(greetingText(twice)).toBe('Hello, Ada')      // same text …
expect(twice.greetingLog).toEqual(['Ada', 'Ada'])   // … two greetings

// INV-8b + the scoping half of R9
const greeted = submit(newVisit, 'Ada')
const blank2 = submit(submit(greeted, '   '), '\t')
expect(blank2.blankCount).toBe(2)
expect(blank2.greetingLog).toEqual(['Ada'])         // the success side is untouched
```

**Trap, named because the runtime hides it:** the second existing assertion,
`expect(blank2.greetingCount).toBe(greeted.greetingCount)`, becomes `undefined === undefined` and
**still passes at runtime** while asserting nothing. Only `npm run build` catches it. Run the build,
not just the tests, in slice 01.

#### The storage guard has to grow with the domain (slice 02) — mutation-probed

`never writes to web storage` (`GreetingScreen.test.tsx`) is not a scenario; it is a **constraint
test**, and it is the *only* test in the repo that can see a write nobody reads back (`greet-visitor`
VH-06 / ADR-0008 leave exactly that gap for `.tsx` files). Its arrangement is an explicit
enumeration — its own comment says *"Every path that mutates the visit: a greeting, a blank
rejection, and a correction."* This feature adds a **second state-mutating handler**, `onClear`
(P11), which that enumeration does not reach. Measured on the throwaway copy, with the end-state
implementation and a `sessionStorage.setItem('lastCleared', …)` planted as the first line of
`clearTheLog`:

| Suite | With the planted write |
| --- | --- |
| All 18 of this feature's scenarios (incl. Story 3's two fresh-visit guards, which never read it back) | **pass** |
| `never writes to web storage`, **un-extended** | **passes** — 17/17 green |
| `never writes to web storage`, **extended by one `user.click` on "Clear the log"** | **fails**: *expected "setItem" to not be called at all, but actually been called 1 times* |

With no planted write, the extended test is green (probed). So the extension is load-bearing, it is
one line, and it changes nothing the test claims. **Slice 02 must add it**; it is prescribed in the
slice table above and argued in ADR-0018. Note the ordering constraint: the click must come after
the last *successful* submit, because P8 means the control does not exist while the log is empty.

This does not breach the seed's *"this feature must not be the thing that breaks either"*: nothing
about the guarantee weakens, no assertion moves, and the guard's reach grows to match the domain.
The failure mode the seed is guarding against is a feature that makes the constraint test go red or
get deleted — not one that hands it the new path it must walk.

### 5.5 Perceivability, and what stays human (R9′, VH-02, VH-06)

Measured with a `MutationObserver`, on the shape this design prescribes:

| Action | Status region | Alert |
| --- | --- | --- |
| Identical successful resubmit ("Ada" twice) | **mutates** (same element object throughout) | 0 |
| Identical failing resubmit (blank twice) | **0** | **mutates** |
| Clearing | **mutates — to empty** (same element object) | 0 (INV-11) |

Rows 1–2 are `greet-visitor`'s R9, preserved exactly under the new key (P4′): ADR-0009 is
**amended in its mechanism, not withdrawn**. Row 3 is the new case and the honest gap: an ARIA live
region that is *emptied* announces nothing, so the visitor is told about the clear by the **focus
move** (R17/P11), not by the status region. That is the seed's own reasoning, and it is why the
focus move is a requirement rather than a nicety.

What no test in this seam can see: whether a screen reader, on receiving focus on the region,
actually speaks *"You have not been greeted yet."* — announcing a focused container's contents is
AT-dependent, and jsdom speaks to nobody. The mechanism is right (a real focus target, a named
region, text rather than an empty container); the outcome is a human check. Recorded as **VH-06**;
same pattern as VH-02 and `greet-visitor`'s VH-07/VH-10. **Do not manufacture a jsdom "coverage"
test for it.**

One honest limitation of the *assertions* (not of the behaviour): a visitor greeted as the literal
string "You have not been greeted yet." would make `queryByText(EMPTY_LOG_MESSAGE)` match an entry.
No scenario goes there, and hardening it would mean asserting on markup rather than text — noted so
it is a known non-concern rather than an unexamined one.

### 5.6 The sighted half of the same question: a *visible* focus indicator (P12, VH-08)

§5.5 covers what a screen-reader visitor hears. A **sighted keyboard** visitor has the same problem
in a different sense: after activating "Clear the log", the control they were on is destroyed and
focus lands on the log region — and unless something *draws* that, nothing on screen says so.
`mockup.html` §5 makes this normative and prescribes the rule, including why it must be `:focus`
rather than `:focus-visible`.

Where it lands, and why it is not simply implemented here:

- **The DOM half ships in slice 02**: `className="greeting-log"` on the region (P6) — the mockup's
  own selector. One attribute, no behaviour, no test.
- **The CSS half is deferred, with an owner named**: `src/` contains **no stylesheet and no
  `className` at all** today; both this feature and `greet-visitor` put *"styling beyond what the
  existing markup implies"* out of scope, so adding the repo's first stylesheet inside a behaviour
  slice would be an unargued new pattern, and one this repo's convention (`CLAUDE.md`: assert
  behaviour through roles and accessible names) has no way to test.
- **Probed, so the "cannot test it" claim is not an assumption**: with the design's markup rendered,
  `expect(getComputedStyle(region).outlineWidth).toBe('')` — Vitest does not process CSS by default,
  so a stylesheet shipped here would be inert in every test that runs. A green suite would say
  nothing about whether the ring exists.

So the indicator is recorded as **VH-08**, with the exact rule written out for whoever answers it,
and ADR-0017 records the decision and the three alternatives. The parallel to VH-06 is deliberate:
the *audible* outcome of the focus move is a human check, and so is the *visible* one. Neither is
faked with a jsdom test that would pass regardless.

---

## 6. Trade-offs and ADRs

All nine are **Proposed — accepted pending the human VERIFY gate**; ADR-0014 additionally depends on
VH-06 and ADR-0017 on VH-08 (both appended by this node), and the clear control's copy on
VH-01/04/05. Two **existing** ADRs are amended in their Status line only, so a reader arriving via
`docs/adr/` in order is not left with an accepted decision that this design contradicts:
**ADR-0002** ("Superseded in part by ADR-0011": the stored `greetedName` field goes, the
derive-don't-store rule it exists for stands) and **ADR-0009** ("Amended by ADR-0014 (scope) and
ADR-0011 (mechanism)"). Neither Decision, Options or Consequences section was touched — this is
bookkeeping, not a relitigation.

| ADR | Decision | Chief alternative rejected |
| --- | --- | --- |
| [0010](../../../docs/adr/0010-greeting-log-inside-the-visit-aggregate.md) | The log is a field of the existing `Visit` aggregate | A separate `GreetingLog` aggregate / a second `useState<string[]>` — either makes `clear` a transaction across two owners |
| [0011](../../../docs/adr/0011-greeting-derived-from-the-newest-log-entry.md) | Derive the greeting from the log's newest entry; delete `greetedName` **and** `greetingCount` | Keeping `greetedName` beside the log and syncing both in two commands (the "second source of truth to drift" ADR-0002 already refused) |
| [0012](../../../docs/adr/0012-log-entries-are-values-not-entities.md) | Entries are plain trimmed strings — values, no identity; React keys by index | Entry objects with ids (`Math.random`/`Date` breach INV-6b; a mint counter buys identity nothing consumes) |
| [0013](../../../docs/adr/0013-clear-is-a-second-command-on-the-visit.md) | `clear(visit)` is a second domain command that empties the log and nothing else | `clear` returning `newVisit` (dismisses the alert — contradicts Story 2 and VH-03); clearing inline in the component (puts an invariant in the adapter) |
| [0014](../../../docs/adr/0014-clearing-is-perceivable-by-focus.md) | Clearing is perceivable via the focus move to a `tabIndex={-1}` named region, set imperatively in the handler; R9 is scoped to submissions | `aria-live` on the log (seed forbids: double-announcing); a "Log cleared" status message (contradicts the *not-yet-greeted appearance*); focusing the Name field (steals the draft's caret, says nothing about the log); a `useEffect` |
| [0015](../../../docs/adr/0015-greeting-log-acceptance-seam.md) | All 18 scenarios via `render(<GreetingScreen />)` in `GreetingScreen.test.tsx`; `App.test.tsx` untouched; slice 03 is a guard slice | Moving the skeleton scenario into `App.test.tsx` (breaks ADR-0005's one-`it` tripwire); a per-slice test file split; snapshot tests of the log |
| [0016](../../../docs/adr/0016-no-greeting-log-component-yet.md) | No `GreetingLog.tsx` — the region stays inside `GreetingScreen` for now, with a named tripwire | Extracting it now (a props/ref surface + a sibling test with nothing of its own to assert) |
| [0017](../../../docs/adr/0017-visible-focus-indicator-for-the-log-region.md) | The region carries `className="greeting-log"` in slice 02; the `:focus` outline rule itself is deferred to a **named** owner (frontend-design / human gate) as VH-08 | Shipping the repo's first stylesheet inside a behaviour slice (out of scope, and inert under the seam); an inline `style` (cannot express `:focus`); making the region tab-reachable so `:focus-visible` applies (adds a tab stop the seed forbids); leaving it unowned |
| [0018](../../../docs/adr/0018-the-storage-guard-grows-with-the-domain.md) | Slice 02 extends `never writes to web storage` by one activation of the clear control; every assertion unchanged | Leaving the guard's enumeration short (mutation-probed: a write in `onClear` then passes everything); a second, separate constraint test (two enumerations that drift); extending ADR-0008's lexical guard to `GreetingScreen.tsx` (that file legitimately touches the DOM) |

**Accepted risks, stated plainly**

- **The clear control's copy is unconfirmed** (VH-01/04/05). One const, one string in the tests.
- **Whether focus-on-region is *heard*** is a human check (VH-06). The design can guarantee a real,
  named focus target and text rather than emptiness; it cannot guarantee an AT reads the contents.
- **Deleting `greetingCount` costs three lines of inner-test churn** and touches a rule
  (`greet-visitor` INV-8a) that was itself introduced for an unverified requirement (VH-09). The
  rule survives — it is now carried by the log. If a human ever withdraws VH-09, the deletion is
  P4′'s key and nothing else, which is *cheaper* than before.
- **The `<li>` index keys are correct only while the log is append-only** (ADR-0012). The day a
  per-entry control arrives, entries need identity — which is precisely why that day also needs an
  ADR, not a patch.
- **Never-read storage writes**: the residual risk is now *smaller*, and it is smaller only because
  slice 02 does the work. `visit.ts` stays covered lexically (ADR-0008). `GreetingScreen.tsx` is
  covered at runtime by `never writes to web storage`, which after slice 02 walks **both** of the
  component's state-mutating handlers — a greeting, a blank rejection, a correction **and a clear**
  (ADR-0018; the extension is mutation-probed, §5.4). What is *still* not covered, stated plainly:
  a write through an API the spy does not watch (`document.cookie`, IndexedDB, `fetch`), a write on
  some future handler nobody adds to the enumeration, and anything in `App.tsx`/`AppBanner.tsx`.
  The mitigation is the rule, not the tooling: **every new visit-mutating handler adds a line to
  that test's arrangement** — the same obligation this slice is discharging.
- **The log region's visible focus ring is prescribed but not shipped here** (P12, VH-08,
  ADR-0017). If the human gate answers "ship it now", it is one CSS rule and one import; if it
  answers "frontend-design owns styling", it is already written down for them. What the design will
  not do is pretend a jsdom test covers it (§5.6).

---

## 7. Deepening pass (after slice 03 lands)

Look for interfaces wider than the work behind them:

1. **`GreetingScreen.tsx` will be ~110 lines and render four regions.** The tripwire for extracting
   `GreetingLog.tsx` (ADR-0016) is *a second consumer or a second reason to change*: per-entry
   controls, a second log-like region, or the file passing ~150 lines. Extract on that signal, not
   on line count alone — and extract the **region including its clear control and its ref**, not a
   presentational `<ol>` wrapper, or the focus rule ends up split across two files.
2. **`isLogEmpty` must keep two readers.** If P7 and P8 ever collapse into one, inline it — a
   predicate with a single call site is narrower as an expression.
3. **`isBlank`'s export** (`greet-visitor` §7 item 1) is still worth collapsing if `submit` remains
   its only production caller; the inner test is the only other user.
4. **Watch for a `entryCount`/"greeted N times" request.** It is Out of scope today; when it
   arrives, it is a *derivation* (`greetingLog.length`), never a stored field — the same argument
   ADR-0011 makes for the greeting.
5. **The `greeting-log` class is the repo's first `className`.** If VH-08 comes back "ship it", the
   whole change is `src/index.css` (the rule in P12) plus one `import './index.css'` in
   `src/main.tsx` — Vite handles CSS with no new dependency, and no component is edited. If it comes
   back "frontend-design owns styling", that node inherits the hook and the rule verbatim. If it
   comes back "we do not want CSS in this lab at all", delete the one attribute: it has no other
   consumer, which is exactly why it is safe to place now.
6. **Revisit ADR-0006** the moment anything must outlive a visit. That is still the seam where a
   driven port and a domain event (`VisitorGreeted`, `GreetingLogCleared`) would earn their keep;
   note that ADR-0010's single aggregate is exactly what would make such a port easy to add.

---

## 8. Traceability — every scenario to a slice, a seam and an owner

| Scenario (issue · Gherkin title) | Slice | Enforced by |
| --- | --- | --- |
| 01 · gains its first entry | 01 | INV-9a, INV-10, P7, P9 |
| 01 · empty message before the first greeting (+ heading, document order) | 01 | P6, P7, P10, INV-12 |
| 01 · oldest first across three, greeting = newest entry | 01 | INV-9a, INV-10, P9 |
| 01 · same name twice → two entries | 01 | INV-9a (no dedup exists) |
| 01 · tabs trimmed before the entry | 01 | INV-2′ (`rawName.trim()`, one owner) |
| 01 · blank submission does not add | 01 | INV-13 |
| 01 · whitespace-only does not add | 01 | INV-1 + INV-13 |
| 01 · blank on an empty log adds nothing, no clear control | 01 | INV-13, INV-12, P8 |
| 02 · no clear control before the first greeting | 02 | INV-12, P8 |
| 02 · clear control appears with the first entry | 02 | INV-12, P8 |
| 02 · clearing empties the log and the status region | 02 | INV-9b, INV-10 (derived greeting) |
| 02 · clearing removes the clear control | 02 | INV-12, P8 |
| 02 · Name field untouched | 02 | INV-7/INV-6c — `rawName` is not in `Visit` |
| 02 · focus moves to the log region | 02 | P6 (`tabIndex={-1}`), P11 |
| 02 · a greeting after clearing starts the log again | 02 | INV-9a (no "cleared" mode exists) |
| 02 · a pending alert survives clearing | 02 | INV-11 (VH-03) |
| 03 · fresh visit → empty log, no clear control | 03 | INV-6a (guard) |
| 03 · fresh visit after a clear → same | 03 | INV-6a (guard) |

And the three obligations that are **not** scenarios, so that none of them is left without a home:

| Obligation | Slice | Owner |
| --- | --- | --- |
| No write to web storage on any visit-mutating path, incl. `onClear` | 02 | the extended `never writes to web storage` constraint test (ADR-0018) + ADR-0008's lexical guard on `visit.ts` |
| No `aria-live` on the log region | 01 | P10, prose + human check (VH-02) — never a DOM assertion |
| A visible focus indicator on the region after clearing | 02 (hook) / deferred (rule) | P12 + P6's `className`; the CSS rule is owned by frontend-design / the human gate (VH-08, ADR-0017) |
