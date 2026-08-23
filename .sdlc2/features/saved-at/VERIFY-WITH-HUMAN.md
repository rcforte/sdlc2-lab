# Verify with a human — `saved-at`

Decisions and observations this graph cannot close by itself. Append-only; each record keeps its
number for the life of the feature. Written by the `architect` node (round 1).

Carried in and **not reopened**: `saved-name` VH-02/VH-04 and `remembered-names` VH-04 — the
screen-reader pass over the region, the rows and the refusals — are still open. VH-02 below continues
them for a row that ticks; it does not restate them. `remembered-names` VH-03 (SD-07: a design node
must not declare a queue edge) is honoured — see design.md §5.5.

**No defect is raised against the `po` node this round.** Every issue's acceptance steps were checked
against the capabilities present on the branch its own `Blocked by:` line describes; every control a
scenario activates is either already merged or introduced by the issue that activates it. The queue
lives in `issues/` and is not restated in `design.md`.

---

## VH-01 — The stable absolute time's format, and the words the row is named with

**Severity:** low — a wording choice nobody has agreed, in text a screen reader reads aloud.

The product brief deliberately leaves the format to architecture (*Out of scope*: "the exact display
format of the stable absolute time… is left to architecture/ux to fix once, consistently — no story
pins a specific string for it"). It is fixed here as **local wall clock, 24-hour, zero-padded
`HH:MM`** — `14:20`, `09:05`, `00:00` — with no date and no locale API, matching the mockup.

The row's accessible name is then **`<name>, saved at HH:MM`** — for example `Ada, saved at 14:20`
(ADR-0040). That phrase is not in *Agreed copy*; it was written by the architect node because a row
needs a name and a bare time is not one.

**Confirm:** (a) 24-hour `14:20` rather than `2:20 pm`; (b) the phrase `Ada, saved at 14:20`; (c) that
saying the name twice to a screen reader — once as the row's name, once as its content — is
acceptable.

---

## VH-02 — The screen-reader pass: does a ticking row stay silent, and is the row's label heard?

**Severity:** high — it is the mechanism of a headline requirement, and jsdom cannot see any of it.

The seed requires that **the passage of time is never announced** while a row's own changes still
are. The design achieves this with two attributes (ADR-0040): `aria-hidden="true"` on the age reading
so a tick mutates nothing in the accessibility tree, and `aria-label` on the `<li>` so the row has an
unchanging name in the age reading's place.

Nothing in the suite can verify either behaviour — jsdom implements no live-region announcement, and
`aria-label` on a non-interactive element is honoured differently by different screen readers.

**Confirm, with a real screen reader:** sit on the screen with two or three saved names for several
minutes and (a) hear **nothing** while the readings count up; (b) hear the row's name and its stable
time when moving through the list; (c) hear the `Newest` marker; (d) still hear the region when a name
is saved, refused or removed. If (a) fails, the design is wrong, not the copy.

---

## VH-03 — The sort control sits inside the live region

**Severity:** medium — a plausible source of announcement noise, with no test that can hear it.

The mockup places the `Newest first` checkbox inside the Saved names region, and the design follows it
(P24). Flipping it re-orders the rows **inside a polite live region**, so a screen reader may
re-announce the whole list. That is arguably correct — the visitor just asked for the list to change —
but it is verbosity nobody has heard.

**Confirm:** flip the control with a screen reader running. If the re-announcement is intolerable, the
fix is placement (move the control just above the region), not a change to the sort rule.

---

## VH-04 — The sort preference survives an emptied list

**Severity:** low — behaviour no acceptance criterion fixes either way.

`newestFirst` is screen state (ADR-0038), and the control is only *rendered* while something is saved
(issue 03). So a visitor who checks `Newest first`, removes every name, then saves again finds the
list newest-first with the box already checked. The alternative — resetting the preference when the
list empties — would silently undo a choice the visitor made.

**Confirm:** keeping the preference is what you want.

---

## VH-05 — A fall-off clears a standing refusal

**Severity:** low — reachable only after 24 hours on one screen.

`expire` writes the list through the same private writer every other list write uses, which clears
`lastSaveRefusal` (INV-20: a refusal never outlives the list state it describes). So if
`Five names is the limit. Remove one to save another.` is on screen when a stale row falls off, the
message disappears at the same moment — correctly, since the list is no longer full, but without the
visitor doing anything.

**Confirm:** the message vanishing on its own is right. The alternative — carrying a refusal across a
list write — would contradict INV-20 and is not recommended.
