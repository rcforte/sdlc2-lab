# ADR-0018 — The web-storage constraint test grows with the domain: slice 02 adds one activation of the clear control

- **Status:** Proposed — accepted pending the human VERIFY gate
- **Date:** 2026-08-22
- **Feature:** `greeting-log` (`.sdlc2/features/greeting-log/design.md` §1 NFR, §5.1 slice 02, §5.4,
  §6 accepted risks, §8)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0008 (the lexical purity guard on `src/visit.ts`), ADR-0013 (`clear` as a
  second command — the new path this covers), `greet-visitor` VH-06 (why the never-read write is a
  code-review concern, not an acceptance step), ADR-0015 (the seam this test sits beside without
  being one of its scenarios)

## Context

The seed is explicit that this feature must not break two things `greet-visitor` shipped: the
constraint test `never writes to web storage` and the fresh-visit guard slice. That has been read so
far as *"leave them alone"*. That reading is wrong in one specific way, and the way is measurable.

`never writes to web storage` is not a scenario. It is the **only** test in the repo that can see a
storage write nobody reads back — `greet-visitor` VH-06 dropped that step from the Gherkin precisely
because a remount scenario cannot see a write that is never read, and ADR-0008's lexical guard
covers `src/visit.ts` only, never `.tsx`. Its arrangement is an explicit **enumeration**, and it says
so in its own comment:

```ts
// Every path that mutates the visit: a greeting, a blank rejection, and a correction.
```

This feature adds a **second state-mutating handler** to `GreetingScreen.tsx`: `onClear`
(design P11 — `setVisit(clear)` plus `logRegion.current?.focus()`). Nothing in the enumeration
activates it. Measured on a throwaway copy of this repo, with the end-state implementation of this
design and `sessionStorage.setItem('lastCleared', String(Date.now()))` planted as the first line of
the clear handler:

| Suite | Verdict with the planted write |
| --- | --- |
| All 18 of this feature's scenarios, incl. Story 3's two fresh-visit guards (which never read it back) | **pass** |
| `never writes to web storage` as it stands today | **passes** — 17/17 green |
| the same test with one `user.click` on "Clear the log" added to its arrangement | **fails**: *expected "setItem" to not be called at all, but actually been called 1 times* |

So after this feature, "leave the test alone" means shipping a feature whose new command has **no**
storage guard at all — and the seed's own Out of scope calls storage the thing this feature must not
break.

## Options considered

1. **Leave the constraint test untouched.**
   *Rejected.* Measured above: the enumeration goes stale the moment `onClear` exists, and a
   never-read write inside it passes every test in the repo. "Unmodified" would be honoured in the
   letter and broken in the substance.
2. **Add a second, separate constraint test** (`never writes to web storage when clearing`).
   *Rejected.* Two enumerations of "every path that mutates the visit" is one more than there should
   be; they drift, and the next command gets added to whichever one the developer happens to open.
   The existing test's design — one visitor walking every mutating path, then three assertions — is
   the right shape and is already agreed. It also duplicates the spy/teardown boilerplate.
3. **Extend ADR-0008's lexical purity guard to `src/GreetingScreen.tsx`** (import the source with
   `?raw` and assert it contains no `localStorage` / `sessionStorage` / `document.cookie`).
   *Rejected, for now, with a tripwire.* It is technically available (`rawModules.d.ts` already
   exists) and it would catch the never-read write definitively rather than by walk-coverage. But
   ADR-0008's guard is defensible on `visit.ts` because that file legitimately touches **nothing** —
   the assertion is "no imports, no globals at all". `GreetingScreen.tsx` legitimately touches the
   DOM (`.focus()`, `preventDefault`), so the guard would have to become an allow-list of forbidden
   substrings: brittle, defeated by `window['local' + 'Storage']`, and an implementation-detail
   assertion of the kind `CLAUDE.md` steers away from. Revisit if a real write ever slips past
   option 4.
4. **Extend the existing test's arrangement by one activation, changing no assertion.**

## Decision

**Option 4.** In slice 02, `src/GreetingScreen.test.tsx`'s `never writes to web storage` gains one
line, placed after the last successful submit (P8 means the control does not exist while the log is
empty) and before the assertions:

```ts
await user.click(screen.getByRole('button', { name: 'Clear the log' }))
```

and its comment's enumeration gains the new path:

```ts
// Every path that mutates the visit: a greeting, a blank rejection, a correction, and a clear.
// The list must grow with the domain's commands, or a write in a handler this test never
// activates passes every scenario in the suite.
```

The three assertions (`setItem` not called, `localStorage.length` 0, `sessionStorage.length` 0) are
untouched, as is every other test in the file — including both fresh-visit guards, which stay
byte-identical. Verified green against the end-state implementation, and verified red against the
planted write (design §5.4).

**The rule this generalises to, and the reason it is written here rather than left as a one-off:**
every new handler that mutates the visit adds a line to that arrangement, in the same slice that
adds the handler. The test's value is exactly the completeness of its enumeration.

## Consequences

**Good.**
- The one guard capable of seeing a never-read write now walks **both** of the component's
  state-mutating handlers; the residual risk stated in design §6 shrinks accordingly, and honestly.
- One line, one comment, zero assertions changed, zero risk to the seed's non-regression promise:
  nothing about the guarantee weakens and no scenario moves. The failure the seed guards against is
  a feature that reddens or deletes this test, not one that hands it the new path it must walk.
- The obligation is now written down (design §8's "not a scenario" table), so the *next* command
  does not repeat this round's oversight.

**Bad / accepted.**
- The constraint test now depends on the clear control's accessible name, which is still
  `po-proposed, unconfirmed` (VH-01/04/05). If the human renames it, this line moves with the
  scenarios — it is the same string, and design §2.5 already keeps it to one production const.
- Coverage is still by **walk**, not by construction: a write on a path nobody enumerates, or through
  an API the `Storage.prototype.setItem` spy does not watch (`document.cookie`, IndexedDB, `fetch`),
  is still invisible. Named in design §6 rather than papered over; option 3 is the escalation if it
  ever bites.
- The test grows slightly slower (one more `user.click`), which at this size is noise.

## What would change this

A real never-read write reaching `main` despite this guard (then option 3, with its brittleness
accepted deliberately), or the arrival of a third and fourth mutating handler (then the enumeration
deserves a helper — `walkEveryMutatingPath(user)` — rather than a longer inline list).
