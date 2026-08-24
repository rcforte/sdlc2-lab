# ADR-0043 — The undo offer ends when the list moves, instead of refusing when it is pressed

- **Status:** Proposed — accepted pending the sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `undo-a-removal` (`.sdlc2/features/undo-a-removal/feature.md`, Agreed scope)
- **Deciders:** the pre-run grilling (human), recorded on the main thread
- **Relates to:** ADR-0027 (save has three outcomes; refusal as data), ADR-0030 (every save attempt
  and removal is perceivable), ADR-0039 (falling off is a command driven by the tick), ADR-0042
  (the entry is restored whole)

## Context

Between the removal and the undo, the list can move. The visitor removes Ada, then saves a fifth
name — bringing Ada back would make six. Or they greet as Ada and save her again — bringing her
back would duplicate her. Or the screen sits open long enough that Ada's own moment passes a day.

This repo already has an answer for a command that cannot act: refuse, and say why in words the
domain owns. `save` does exactly that, twice, and the reasoning is on record — *the refusal
teaches the limit, a vanishing button teaches nothing.*

## Decision

Undo does not follow it. **The offer stands only while the list is exactly as the removal left
it.** Another removal replaces it; any other write to the list ends it; the held entry ages like
the rest, so passing the day-old cutoff ends it too. The offer is therefore either present and
certain to work, or absent.

## Options considered

1. **Keep the offer and refuse when pressed.** *Rejected*, and it is the house pattern, so the
   rejection is the point of this record. Save's refusals teach a rule the visitor will meet
   again: five is the limit, this name is already saved. An undo refusal teaches nothing reusable
   — it reports that the visitor themselves moved the list on, which they did deliberately and
   already know. It would also cost two more sentences of agreed copy and a third refusal kind,
   for a control whose entire value is being pressed without thinking.

2. **Keep the offer and let it act anyway.** *Rejected outright.* It would put six names in a
   five-name list, or the same name in it twice — INV-17 broken by the one command whose promise
   is that the list is as it was.

3. **End the offer.** *Chosen.* One rule replaces three checks. "Put it back where it was" is
   either a true description of what the button will do, or the button is not there.

## Consequences

- A visitor who removes Ada, saves Bob, then changes their mind about Ada has lost the offer and
  must retype her. That is the accepted cost, and it is the honest one: after the save, Ada's old
  place and the list she would return to no longer exist.
- Nothing that leaves the list untouched disturbs the offer. Flipping the sort, greeting again,
  submitting a blank name, typing in the field — the offer survives all of them, because none of
  them writes to the list.
- The offer ending is not a message. The control is simply absent on the next render, exactly the
  way the Save button and the sort control are absent when there is nothing for them to do. No
  copy, no announcement of a withdrawal.
- A name falling off ends the offer even though the visitor did nothing — it is a write to the
  list (ADR-0039), and the rule reads the list, not the visitor's intent. Nearly unreachable in
  practice, and named here so a future reader does not treat it as an oversight.
