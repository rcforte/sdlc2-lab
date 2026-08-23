# ADR-0028 — A saved name's identity is its exact string: no case folding, no normalisation

- **Status:** Proposed — accepted pending the human VERIFY gate; contingent on
  `VERIFY-WITH-HUMAN.md` **VH-02**
- **Date:** 2026-08-23
- **Feature:** `remembered-names` (`.sdlc2/features/remembered-names/design.md` §4.1, §2.4 INV-17)
- **Deciders:** architect node (advisory: architect-critic; human gate at VERIFY)
- **Relates to:** ADR-0002 (the greeting is derived from the submitted name), ADR-0020 (a saved
  name inherits INV-2 rather than re-deriving it), ADR-0027 (the already-saved refusal), ADR-0029

## Context

"Saving a name **already in the list** leaves the list unchanged" (seed) needs an answer to *when
are two names the same name*, and nothing in the feature answers it. Every scenario uses distinct,
differently-spelled names: `Ada`, `Bob`, `Cleo`, `Deb`, `Eve`, `Fay`, `Grace`. So the rule has to be
chosen here, and it is hard to reverse — it changes what a visitor sees, and `remove`, the React
row key and the hint all read the same identity.

One constraint is already fixed: names arrive **trimmed** (INV-2), because a saved name is a value
`greetedName` already held. Trimming is the only normalisation this codebase performs, anywhere.

## Options considered

1. **Case-insensitive** (`a.toLowerCase() === b.toLowerCase()`).
   *Rejected.* It would make `ada` "already saved" while the greeting for `ada` reads `Hello, ada`
   and the row reads `Ada` — the screen would then hold a name the visitor never typed, and the
   refusal would be about a name that is not the one on the button. It also raises a question
   nothing answers: which spelling wins, the stored one or the new one? Every answer either
   rewrites a row under a visitor's aim (which the seed's *oldest first, and a row never moves*
   rules out) or refuses with a sentence naming a spelling the visitor did not use.
2. **Locale-aware or Unicode-normalised comparison** (`localeCompare`, `NFC`).
   *Rejected.* It would be the first locale-dependent behaviour in the repo, i18n is explicitly out
   of scope, and `normalize()` would make two visually identical names compare equal while the two
   rows still render differently — a rule the visitor cannot see and cannot predict.
3. **Whitespace-collapsing comparison** (`Ada  B` ≡ `Ada B`).
   *Rejected.* Trimming already handles the only whitespace the visitor is likely to produce by
   accident (VH-08), and interior whitespace is part of the name they typed.
4. **Exact string equality on the already-trimmed value** (`includes(name)` / `filter(n => n !== name)`).
   *(chosen)*

## Decision

Two saved names are the same name when their strings are equal after INV-2's trim — i.e. `===`.
`ada`, `Ada` and `ADA` are three different names, exactly as they are three different greetings on
this screen today. This is the identity used by `save`'s duplicate check, by `remove`, by
`greetAgain`'s membership guard, and by the row's React key (ADR-0029).

## Consequences

**Positive**

- One identity, used by four things, with no second definition anywhere. Nothing on the screen can
  disagree with anything else about which row is which.
- Consistent with the only existing precedent: `Hello, ada` and `Hello, Ada` are already different
  greetings, and `Ada` and `Ada ` already greet identically because of the trim.
- No new dependency, no locale, no table.

**Negative / accepted**

- A visitor who types `ada` after saving `Ada` gets a **second row** and two nearly identical
  controls (`Greet me again as Ada`, `Greet me again as ada`), which is a real usability wart and
  the strongest argument for option 1. Accepted, because every fix for it is worse: it either
  displays a spelling the visitor did not type, or refuses with a sentence that names one.
- Reversing this later changes visible behaviour (a save that succeeded would begin to be refused),
  so it is recorded as **VH-02** for a human to confirm rather than assumed.

## Related

ADR-0002, ADR-0020, ADR-0027, ADR-0029, design §4.1, `VERIFY-WITH-HUMAN.md` VH-02.
