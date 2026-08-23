# Context — the greeting screen

The ubiquitous language of this repo. Glossary only: no rules, no signatures, no file paths.
Decisions live in `docs/adr/`.

## Visit

One person's stay on the screen, from arriving to leaving. Everything the screen remembers
belongs to a visit and ends with it. Nothing outlives a visit.

## Greeting

The `Hello, <name>` message the visitor is currently being shown. A visit has at most one, and
it names whoever was greeted last.

## Saved name

A name the visitor chose to keep for the rest of the visit, together with **when** they kept it.
A visit holds at most five, oldest first, and a saved name never moves once it is in the list.

Two saved names are the same name when their text is identical — same spelling, same case.
`ada` and `Ada` are two different saved names.

A saved name is an identity that **records one event**: the moment it was saved. Equality
deliberately ignores that moment — the name alone decides which saved name this is.

> Amends the earlier phrasing "a saved name is an identity, not an event", which held while a
> saved name was nothing but its text.

## Saved at

The moment at which the visitor saved a name. It is captured once, when the name joins the
list, and the captured moment never changes afterwards.

What the screen *shows* for that moment is a separate thing, and is being decided by the
`saved-at` feature: the reading a visitor gets is derived from the saved-at moment and from the
current time, so it can change while nobody touches the screen even though the moment behind it
does not.

The reminder at the Name field names the same names in the same order as the list, but tells no
times.

## Falls off

A saved name leaving the list on its own, because its saved-at moment is more than a day old — a
day counted from that moment, never from a calendar boundary.

It is a write to the list rather than a change to how the list is drawn: the slot it held is given
back, and the list reports the change the way it reports a removal. The visitor activated nothing,
so nothing they were reaching for goes with it.
