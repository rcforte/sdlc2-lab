# ADR-0035 — A saved name becomes a record, and its identity stays the name alone

- **Status:** Proposed — decided with the human in a `/grill-with-docs` session, pending the
  sdlc2 VERIFY gate
- **Date:** 2026-08-23
- **Feature:** `saved-at` (not yet seeded — this record predates the sdlc2 run and is an input to it)
- **Deciders:** the human, in a grilling session (advisory: architect / architect-critic, when the
  feature runs)
- **Amends:** ADR-0029's phrase *"a saved name is an identity, not an event"*, and its heading
  *"rows are values, not entities"*. Both were true while a saved name was nothing but its text.
- **Relates to:** ADR-0026 (the list inside the aggregate, and its splitting tripwire), ADR-0027
  (refusal as data), ADR-0028 (what makes two saved names the same name), ADR-0029 (row commands
  address a row by name), ADR-0034 (what the stamp is and where it comes from)

## Context

Today a saved name **is** a string, and that string is the row's identity (ADR-0028). Five things
read it and they must all agree:

- `save`'s duplicate check (`includes`)
- `remove`'s filter
- `greetAgain`'s membership guard
- the hint's `join(', ')` at the Name field
- the React `key` on the row, which is what keeps an untouched row's DOM node — and the focus
  inside it — where it was (ADR-0029)

A saved-at time cannot live in a string, so the entry has to grow. The question is what it grows
into, and — more sharply — **what equality means afterwards**, because two of those five readers are
equality checks and one is a React key.

There is also a sentence in the way. ADR-0029 quotes the seed: *a saved name is an identity, not an
event*, and uses it to refuse a surrogate id on the grounds that it would make a row an entity —
something with identity apart from its value. A `savedAt` field is precisely an event attribute.

## Options considered

1. **Keep `savedNames: readonly string[]` and add a parallel lookup**, e.g. a second field mapping
   name to time, written by the same private writer.
   *Rejected.* Every one of the five expressions above survives untouched, which is the whole appeal
   — and it creates two collections that must agree about which names exist, with nothing in the
   type system able to catch one drifting from the other. It is ADR-0026's rejected option 2 in
   miniature: state that must change together, made changeable separately. The private writer would
   contain the hazard only for as long as everyone remembers why it exists.

2. **A record whose identity is the whole record.**
   *Rejected.* `Ada` at 14:35 and `Ada` at 14:40 would be different rows, so duplicates return, the
   already-saved refusal (ADR-0027) becomes unreachable, `key` stops being unique, and INV-17 loses
   its meaning. Listed only so that it is refused in writing rather than discovered in review.

3. **A `Map` keyed by name, or a surrogate id per row.**
   *Rejected, twice already.* ADR-0026 refused a `Map` because it adds a key nothing needs and makes
   insertion order read as an implementation accident; ADR-0029 refused a surrogate id because it
   makes the row an entity with identity apart from its value. Neither reason is weakened by adding
   a time — the name is still a perfectly good unique key, because INV-17 still forbids duplicates.

4. **A record — the name plus the clock reading — with equality on the name alone.** *(chosen)*

## Decision

A saved name is a record of the name and the reading at which it was saved. **Identity is the name,
and only the name**: the duplicate check, the removal, the membership guard and the React key all
read the name field and ignore the time, comparing exactly as ADR-0028 says — `===` on the
already-trimmed text.

ADR-0028 is therefore **unchanged in substance and changed in mechanism**: the rule is still "same
text, same case, same name", but the expressions that enforce it compare a field rather than an
element.

The public commands keep their signatures — `remove(visit, name)` and `greetAgain(visit, name)`
still take a plain name — because a row is still addressed by the only thing that identifies it. Only
`save` changes, and only to receive the clock reading (ADR-0034).

**The amended phrase.** A saved name is an identity that **records one event**: the moment it was
saved. Equality deliberately ignores that moment. This is written into `CONTEXT.md` rather than left
as an inference, because the sentence it replaces is quoted in an ADR and will otherwise be found
and believed.

## Consequences

**Positive**

- One identity, still used by five things, still with no second definition anywhere. Nothing on
  screen can disagree with anything else about which row is which.
- `key={name}` keeps paying exactly what ADR-0029 said it pays: appending or removing leaves every
  untouched row's DOM nodes, and the focus inside them, alone.
- One collection, so there is no second one to fall out of step with it. The private writer that owns
  the list fields keeps its job unchanged.
- ADR-0026's tripwire — *split the aggregate when two fields can change independently for reasons
  that never coincide* — **is not tripped.** `Visit` still has seven fields; only the element type of
  one of them changes, and the three list fields are still written together by one function.

**Negative / accepted**

- **A row is now, on any honest reading, a small entity**: identity in one field, an attribute
  alongside. ADR-0029's heading no longer describes it. Accepted, and amended above rather than
  argued away — there is no way to record when a save happened without recording an event.
- **Equality that ignores half the value is a trap for a future reader**, who may reasonably expect
  two records with the same fields to be interchangeable and two with different fields to be
  distinct. The mitigation is that the four comparison sites are named here and in ADR-0028, and
  none of them compares records.
- **Five expressions change mechanically at once**, in the one slice, which is what ADR-0007 asks
  for: the invariants arrive whole, so no intermediate state exists where a duplicate could be saved
  or a removal could miss.
- **The two views of the list now say different things.** The rows show times; the hint at the Name
  field does not. INV-25's promise is about the same *names* in the same *order* and it still holds
  in full — but the divergence is deliberate, not drift, and is recorded here and in `CONTEXT.md`
  because it will otherwise read as a bug. The hint exists so a visitor does not retype a name they
  already kept; times would triple its length and bury the names it is there to show.

## Related

ADR-0007, ADR-0026, ADR-0027, ADR-0028, ADR-0029, ADR-0034, `CONTEXT.md` (**Saved name**,
**Saved at**).
