# Greet the visitor by name

> Seed for an sdlc2 lab run. The shared understanding below was agreed in conversation before
> the graph was invoked — it is the thing every downstream node is scored against.

## Capability

A visitor can type their name and be greeted by it. Today the app shows a fixed banner and
nothing else; it cannot tell one visitor from another. The point is a first taste of the app
responding to *you* rather than to everyone identically.

## Agreed scope

- One screen. A labelled text input for the name, and a control that submits it.
- On submit with a name, the greeting reads `Hello, <name>` and is announced to the visitor.
- On submit with a blank or whitespace-only name, the greeting does not change and an error
  message explains what to do.
- The name is not persisted anywhere. Reloading the page starts over.

## Out of scope

- Storing, transmitting or remembering the name. No backend, no localStorage, no analytics.
- Accounts, sessions, authentication of any kind.
- Internationalisation of the greeting text.
- Styling beyond what the existing markup already implies. This is a behaviour slice.

## Decisions

- **The greeting is derived, not stored.** It is a function of the submitted name, so there is
  no second source of truth to drift.
- **Whitespace-only counts as blank.** `"   "` is a mistake, not a name; treating it as valid
  would produce `Hello,    ` which helps nobody.
- **The name is trimmed before greeting.** `" Ada "` greets `Hello, Ada`. Leading and trailing
  space is never meaningful here.
- **The error is text, not colour.** It must be readable by a screen reader and by someone who
  cannot distinguish red, so it is a message associated with the input, not a red border.
- **No length limit.** An arbitrary cap would be an invented requirement; nothing breaks
  without one.

## Ubiquitous language

- **Visitor** — the person using the app. Not "user", not "customer"; nobody has an account.
- **Name** — the free text the visitor submits.
- **Greeting** — the rendered `Hello, <name>` message.
- **Blank name** — empty, or whitespace only, after trimming.

## Open questions

- None material at this size. If the greeting later needs to survive a reload, that is a
  separate capability and a separate feature.
