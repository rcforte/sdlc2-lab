import { act, render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { TICK_MS } from './clock'
import { GreetingScreen } from './GreetingScreen'

// The trimming scenarios assert the greeting with an anchored regex and whitespace
// normalization turned off, because jest-dom's default (collapse whitespace, match as a
// substring) would report "Hello,  Ada " and "Hello, \tAda\t" as reading "Hello, Ada" —
// i.e. an implementation that never trims would pass the two scenarios that exist solely to
// catch it (VH-08). The literals are escaped before anchoring: the alert's text ends in a
// full stop, and an unescaped "." would match any character there.
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const exactly = (text: string) => new RegExp(`^${escaped(text)}$`)
const verbatim = { normalizeWhitespace: false }

// The alert's fixed wording (feature.md Contract vocabulary; po-proposed, VH-03), copied from
// the Gherkin rather than imported from src/visit.ts on purpose — a scenario that imported the
// constant would pass whatever the constant happened to say.
const ALERT_TEXT = 'Please enter your name.'

// The remembered-names literals, copied from issue 01's Gherkin rather than imported from
// src/visit.ts on purpose — a scenario that imported NOTHING_SAVED_MESSAGE would pass whatever
// that constant happened to say.
const SAVED_NAMES_REGION = 'Saved names'
const NOTHING_SAVED_TEXT = 'No names saved yet.'
const SAVE_CONTROL = 'Save this name'

// Issue 05's refusal copy, copied from its Gherkin for the same reason: a scenario that imported
// FULL_LIST_MESSAGE would pass whatever that constant happened to say, including a sentence
// naming a number the list does not actually stop at.
const FULL_LIST_TEXT = 'Five names is the limit. Remove one to save another.'

// The rows of the Saved names region, in the order they appear on screen — the one definition of
// "the rows" in this file. Read through the region on every call rather than held in a variable,
// because saving and removing replace nodes. It sits up here rather than beside the saved-names
// scenarios because the constraint test reaches for the list too, and two spellings of the same
// query is how the two drift apart. Rows are asserted by index (order) and by substring or scoped
// query (contents), never by an anchored regex: a row's own controls join its text content
// (design.md §5.4).
const rowsInTheSavedNamesRegion = (): HTMLElement[] =>
  within(screen.getByRole('region', { name: SAVED_NAMES_REGION })).queryAllByRole('listitem')

// "the row for <name>" — found by the row's own name, never by index: the saved-at scenarios are
// about what one row says, and an index would quietly follow a different row the moment the list
// changed shape. The name node is the only one in a row whose whole text is the name ("Greet me
// again as Ada" and "Remove Ada" merely contain it), and finding exactly one row is asserted
// rather than assumed. It sits beside the rows themselves, and not inside one slice's describe
// block, because both saved-at slices ask the same question of a row and two spellings of it is
// how the two would drift apart.
const rowFor = (name: string): HTMLElement => {
  const matches = rowsInTheSavedNamesRegion().filter(
    (row) => within(row).queryByText(name) !== null,
  )
  expect(matches).toHaveLength(1)
  return matches[0]
}

// "the row for <name> shows the label <Newest>" — the marker is a node of its own inside that row,
// matched as that node's whole text, so it can never be satisfied by a row's other words. It sits
// beside the rows for the same reason rowFor does: three saved-at blocks ask this question now —
// issue 02's, about which row the marker goes to; issue 03's, about the marker surviving a
// newest-first sort; and issue 04's, about a marker outliving the row that fell off beside it —
// and three spellings of it is how they would drift apart. The word is copied from the Gherkin
// rather than imported from the component, for the reason the rest of this file already gives: a
// scenario that imported it would pass whatever that word happened to become.
const MARKER_TEXT = 'Newest'

const expectMarkerOn = (name: string) => {
  expect(within(rowFor(name)).getByText(MARKER_TEXT)).toBeInTheDocument()
}

// "the row for <name> shows the age reading <words>" — the reading is a node of its own, matched
// as that node's whole text, so "saved 1 minute ago" can never be satisfied by "saved 11 minutes
// ago" and a reading is never mistaken for the row's other words. It sits beside the rows for the
// reason rowFor and expectMarkerOn do: undo-a-removal's block asks the same question of a row —
// does the moment survive being brought back — and a second spelling of it is how the two would
// drift apart.
const expectAgeReading = (name: string, reading: string) => {
  expect(within(rowFor(name)).getByText(reading)).toBeInTheDocument()
}

// "the Saved names region displays rows in the order …" — the whole display, asserted as an
// ordered list and never as a set: the length comes first, so no scenario can pass against a
// region holding a row it never mentioned. Up here for the same reason: sorting asks it of a view
// and undo-a-removal asks it of a restored list, and one definition answers both.
const expectRowsInDisplayOrder = (...names: string[]) => {
  const rows = rowsInTheSavedNamesRegion()
  expect(rows).toHaveLength(names.length)
  names.forEach((name, index) => expect(rows[index]).toHaveTextContent(name))
}

// "a button named 'Bring <name> back'" — the offer, written out from the Gherkin rather than
// read off the component, for the reason the rest of this file already gives: a scenario that
// asked the component what its control is called would pass whatever name the component happened
// to give it. It sits up here beside the rows for the reason rowFor and expectAgeReading do — two
// blocks ask for the offer now, undo-a-removal's issue 01 (does it appear, and what does pressing
// it do) and its issue 03 (is it still there once the held entry is a day old) — and two spellings
// of one query is how the two would drift apart.
const offerFor = (name: string) => `Bring ${name} back`

const offer = (name: string): HTMLElement =>
  screen.getByRole('button', { name: offerFor(name) })

// "When <so much time> passes with the visitor doing nothing" — no interaction at all: the clock
// moves, and whatever the screen does about that it does by itself. Shared by every block that
// moves the clock, each of which turns the narrow fake timers on for itself.
const timePasses = async (milliseconds: number) => {
  await act(async () => {
    vi.advanceTimersByTime(milliseconds)
  })
}

describe('Greeting screen', () => {
  it('shows a status region that is present and empty before the first submission', () => {
    // Given the visitor is on the greeting screen
    // And the visitor has not submitted anything yet
    render(<GreetingScreen />)

    // Then an element with role "status" is present
    // And that element contains no text
    expect(screen.getByRole('status')).toHaveTextContent('')
    // And no element with role "alert" is present
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('trims leading and trailing whitespace before greeting', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)

    // When the visitor types " Ada " into the Name field
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' Ada ')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And the Name field still contains " Ada " unchanged (only the greeting is trimmed)
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(' Ada ')
  })

  it('trims tabs around the name too', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)

    // When the visitor enters "\tAda\t" (tab, "Ada", tab) into the Name field.
    // A literal Tab keystroke moves focus rather than inserting a character, so the tabs are
    // pasted into the focused field — the scenario is about what the field contains, not the
    // keystrokes that put it there (VH-08).
    await user.tab()
    await user.paste('\tAda\t')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('\tAda\t')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And no element with role "alert" is present
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('puts no length limit on the name', async () => {
    const user = userEvent.setup()
    const longName = 'A'.repeat(300)

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)

    // When the visitor types a 300-character name into the Name field
    await user.type(screen.getByRole('textbox', { name: 'Name' }), longName)
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting reads "Hello, " followed by those same 300 characters, unmodified
    expect(screen.getByRole('status')).toHaveTextContent(exactly(`Hello, ${longName}`), verbatim)
    // And no element with role "alert" is present
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('replaces the previous greeting when a new name is submitted', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada"
    render(<GreetingScreen />)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Greet me' }))
    expect(screen.getByRole('status')).toHaveTextContent('Hello, Ada')

    // When the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor types "Grace" into the Name field
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting reads "Hello, Grace"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Grace'), verbatim)
    // And "Hello, Ada" is no longer shown
    expect(screen.queryByText('Hello, Ada')).toBeNull()
  })

  // ---------------------------------------------------------------------------------------
  // Issue 02 — Be told when the name is blank. One acceptance test per Gherkin scenario.
  // ---------------------------------------------------------------------------------------

  it('shows an alert and no greeting when an empty Name field is submitted', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)
    // And the Name field is empty
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')

    // When the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the status region is present and contains no text
    expect(screen.getByRole('status')).toHaveTextContent('')
    // And an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
  })

  it('treats a whitespace-only name as blank', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)

    // When the visitor types "   " into the Name field
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '   ')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the status region is present and contains no text
    expect(screen.getByRole('status')).toHaveTextContent('')
    // And an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
  })

  it('treats a tab-only name as blank too', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)

    // When the visitor enters "\t" (a single tab character) into the Name field. A literal Tab
    // keystroke moves focus rather than inserting a character, so the tab is pasted into the
    // focused field; this scenario exists to fail an implementation that strips only the space
    // character (VH-08), so the field really must hold U+0009.
    await user.tab()
    await user.paste('\t')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('\t')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the status region is present and contains no text
    expect(screen.getByRole('status')).toHaveTextContent('')
    // And an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
  })

  it('leaves an existing greeting alone when a blank submission follows it', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada"
    render(<GreetingScreen />)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Greet me' }))
    expect(screen.getByRole('status')).toHaveTextContent('Hello, Ada')

    // When the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting still reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
  })

  it('ties the alert to the Name field', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)
    // And the Name field is empty
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')

    // When the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the Name field's aria-describedby attribute references the element with role "alert"
    const alert = screen.getByRole('alert')
    expect(alert.id).not.toBe('')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute(
      'aria-describedby',
      alert.id,
    )
    // …and the reference resolves, so the message really is the field's description: the
    // "error is text, not colour" decision's testable half (VH-07).
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(ALERT_TEXT)
  })

  // ---------------------------------------------------------------------------------------
  // Issue 03 — Recover from a blank-name alert. One acceptance test per Gherkin scenario.
  //
  // All three share the same Given ("the visitor submitted a blank Name field and sees the
  // alert"), so it is one named step below rather than three copies. It is driven keyboard-only
  // and it asserts the alert really is on screen, so a scenario can never start from a Given
  // that silently did not happen.
  // ---------------------------------------------------------------------------------------

  // Given the visitor submitted a blank Name field and sees the alert.
  // Keyboard-only: tab to the Name field, tab on to "Greet me", activate it with Enter (a
  // native button activates on Enter). Leaves focus on the submit control, where a visitor
  // who just submitted actually is.
  const submitABlankNameAndSeeTheAlert = async (user: UserEvent) => {
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
  }

  it('clears the alert and greets when a blank submission is corrected', async () => {
    const user = userEvent.setup()

    // Given the visitor submitted a blank Name field and sees the alert
    render(<GreetingScreen />)
    await submitABlankNameAndSeeTheAlert(user)

    // When the visitor types "Grace" into the Name field. The recovery path is a primary path,
    // so it is walked with no pointer at all: Shift+Tab back from the submit control to the
    // field, type, then Tab forward and activate. A keyboard-only visitor must be able to
    // complete the recovery, and a suite that only ever clicks could not notice if that broke.
    await user.tab({ shift: true })
    await user.keyboard('Grace')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')
    // And the visitor activates the submit control
    await user.tab()
    await user.keyboard('{Enter}')

    // Then the greeting reads "Hello, Grace"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Grace'), verbatim)
    // And no element with role "alert" is present
    expect(screen.queryByRole('alert')).toBeNull()
    // And the Name field no longer has an aria-describedby reference to the alert. The
    // attribute must be gone, not emptied: an empty aria-describedby is still a (dangling)
    // reference, and the field of a submission that just succeeded must have no description
    // at all (mockup state matrix row 11).
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('')
  })

  // (Human-confirmed — see VERIFY-WITH-HUMAN.md VH-15.) The alert clears on
  // the next submission, not on the next keystroke: everything else in this feature is
  // submit-driven, and a message that vanishes mid-correction takes the explanation away while
  // the visitor is still acting on it. Reversing this is one condition in the component and
  // this one test.
  it('keeps the alert on screen while the visitor types, until they submit again', async () => {
    const user = userEvent.setup()

    // Given the visitor submitted a blank Name field and sees the alert
    render(<GreetingScreen />)
    await submitABlankNameAndSeeTheAlert(user)

    // When the visitor types "Grace" into the Name field — and does not submit
    await user.tab({ shift: true })
    await user.keyboard('Grace')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')

    // Then an alert still reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
    // And the Name field's aria-describedby attribute still references the element with role
    // "alert" — the association survives the keystrokes too, not just the element.
    const alert = screen.getByRole('alert')
    expect(alert.id).not.toBe('')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute(
      'aria-describedby',
      alert.id,
    )
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(ALERT_TEXT)
  })

  it('still shows the alert when the retry is whitespace-only', async () => {
    const user = userEvent.setup()

    // Given the visitor submitted a blank Name field and sees the alert
    render(<GreetingScreen />)
    await submitABlankNameAndSeeTheAlert(user)

    // When the visitor types "   " into the Name field
    await user.tab({ shift: true })
    await user.keyboard('   ')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('   ')
    // And the visitor activates the submit control
    await user.tab()
    await user.keyboard('{Enter}')

    // Then an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
    // And the status region is present and contains no text — a failing retry never puts a
    // greeting on screen, and never touches the region either (mockup row 12's scoping rule).
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  // ---------------------------------------------------------------------------------------
  // Issue 04 — A fresh visit starts clean. One acceptance test per Gherkin scenario.
  //
  // A guard slice by design (design.md §5.1, ADR-0004): both hooks have lived inside
  // GreetingScreen since slice 01, so these two scenarios pass on their first run and no
  // production code is expected. They are not decoration — they fail the moment either hook is
  // lifted out of the component, which is the realistic regression, and they pin two different
  // hooks: the greeting/alert steps pin the visit (INV-6a), the "Name field is empty" step pins
  // the draft name (INV-6c). The fix for a red bar here is structural — put the state back in a
  // useState inside GreetingScreen — never bespoke reset logic layered on state that leaked.
  // ---------------------------------------------------------------------------------------

  // "When the visitor starts a fresh visit" — the Contract vocabulary term (feature.md; VH-02).
  // jsdom implements no navigation and no reload, so a fresh visit is this component unmounting
  // and being rendered again from its initial state. Not window.location.reload(), and not a
  // changed `key` on a tree that is still mounted — that would prove React remounts a subtree,
  // not that a visitor arriving anew sees a clean screen. Real reload-survival in a browser is
  // outside this seam and is a human check at VERIFY time (VH-02).
  const startAFreshVisit = (endThePreviousVisit: () => void) => {
    endThePreviousVisit()
    render(<GreetingScreen />)
  }

  it('starts from a clean screen on a fresh visit after a greeting', async () => {
    const user = userEvent.setup()

    // Given the visitor typed "Ada" and was greeted "Hello, Ada". Both halves are asserted
    // before the fresh visit: the field really does hold "Ada" and the region really does read
    // the greeting, so neither Then below can pass against a screen that was already clean.
    const { unmount } = render(<GreetingScreen />)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Greet me' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada')
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)

    // When the visitor starts a fresh visit
    startAFreshVisit(unmount)

    // Then the Name field is empty
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
    // And the status region is present and contains no text — one observation on an element
    // that must still resolve, so getByRole (not queryByRole): a region that vanished on the
    // remount fails loudly here instead of passing as "no text" (VH-04, mockup row 13).
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('starts from a clean screen on a fresh visit after an alert', async () => {
    const user = userEvent.setup()

    // Given the visitor submitted a blank Name field and sees the alert. Same Given as issue
    // 03's three scenarios, word for word, so it is driven by the same named step rather than a
    // second, subtly different copy. It submits an empty field, so this scenario's "Name field
    // is empty" step is carried by the greeting scenario above, where the field really did hold
    // text; here the step guards against a remount that restores a name from somewhere.
    const { unmount } = render(<GreetingScreen />)
    await submitABlankNameAndSeeTheAlert(user)

    // When the visitor starts a fresh visit
    startAFreshVisit(unmount)

    // Then the Name field is empty
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
    // And no element with role "alert" is present
    expect(screen.queryByRole('alert')).toBeNull()
    // …and the field carries no stale reference to the alert that is gone (mockup row 14). Not
    // a separate scenario: it is the same absence read from the field's side, and an arriving
    // visitor's field must be described by nothing at all, exactly as on the very first arrival.
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('')
    // And the status region is present and contains no text
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  // VH-01, human-confirmed in VH-15: pressing Enter with focus in the Name field submits.
  // This is the whole reason the screen is wrapped in a native <form>; without one the
  // keystroke does nothing and this scenario is the only thing that would notice.
  it('greets when Enter is pressed in the Name field', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)

    // When the visitor types "Ada" into the Name field and presses Enter. Keyboard only, and
    // the submit control is never touched — Tab reaches the field (it is the first tabbable
    // thing on the screen) and implicit form submission carries the rest (mockup section 7).
    await user.tab()
    await user.keyboard('Ada{Enter}')

    // Then the greeting reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And no element with role "alert" is present
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // A *constraint* test, not a behaviour test: it asserts that something never happens, so it
  // reaches past the DOM on purpose. CLAUDE.md names this as the one sanctioned exception to
  // the DOM-only convention (VH-06, resolved in VH-15). It earns its place because the seed
  // forbids persistence outright and nothing else here can see a violation: the fresh-visit
  // scenarios only catch storage that is read back, and a write that is never read is invisible
  // to every assertion in this file.
  //
  // Its exercise path covers the saved names as well as the greeting (design.md §4.3). A
  // constraint test that never touched the list would not notice a write made on the way into
  // it, and the list is the part of this visit most tempting to persist.
  it('never writes to web storage', async () => {
    const user = userEvent.setup()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    render(<GreetingScreen />)

    // Every path that mutates the visit. First the greeting's three: a greeting, a blank
    // rejection, and a correction.
    const nameField = () => screen.getByRole('textbox', { name: 'Name' })
    const submitControl = () => screen.getByRole('button', { name: 'Greet me' })
    await user.type(nameField(), 'Ada')
    await user.click(submitControl())
    await user.clear(nameField())
    await user.click(submitControl())
    await user.type(nameField(), 'Grace')
    await user.click(submitControl())

    // …then the saved names' three, which are the writes remembered-names added: a save that
    // appends, a save that is refused, and a removal.
    const saveControl = () => screen.getByRole('button', { name: SAVE_CONTROL })
    await user.click(saveControl())
    // The second click really is refused — Grace is already saved, so the list still holds her
    // one row. Asserted, not assumed: a refusal is a write of its own (INV-21) and so its own
    // chance to persist something, and without this line the path could quietly stop containing
    // one.
    await user.click(saveControl())
    expect(rowsInTheSavedNamesRegion()).toHaveLength(1)
    // The removal needs no such line: the control only exists because the save appended.
    await user.click(screen.getByRole('button', { name: 'Remove Grace' }))

    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)

    setItem.mockRestore()
  })

  // ---------------------------------------------------------------------------------------
  // remembered-names issue 01 — Hold more than one saved name. One acceptance test per Gherkin
  // scenario, driven through the declared frontend seam (RTL + user-event via Vitest/jsdom).
  //
  // This block replaces the merged single-slot saved-name issue 01 block: the saved name is no
  // longer one scalar shown as "Saved: Ada" but an ordered, append-only list shown as rows
  // (design.md §4.3). The scenarios whose meaning survives keep their steps and gain rows;
  // the ones the product decision contradicts — replacing, and the fixed-name greet-again
  // control — are gone from this file, per the same table.
  //
  // The region's text is asserted as a substring, never with an anchored regex: the visible
  // <h2>Saved names</h2> that gives the region its accessible name is part of its textContent,
  // and a row's text will grow to include its own controls' names when issues 02 and 03 land
  // (design.md §5.4). Where a scenario says a phrase is "no longer shown", the assertion is the
  // page-wide queryByText, which is both stronger and unambiguous.
  //
  // What no scenario here asserts, deliberately: whether the region is actually spoken. jsdom
  // implements no live-region announcement, so the testable half — aria-live="polite" and the
  // correct visible text after each save — is what these scenarios pin, and audibility is a
  // human check (VERIFY-WITH-HUMAN.md VH-04, continuing greet-visitor VH-09/VH-10).
  // ---------------------------------------------------------------------------------------

  it('shows an empty Saved names region, after the status region, before any greeting', () => {
    // Given the visitor is on the greeting screen
    // And the visitor has not been greeted yet
    render(<GreetingScreen />)

    // Then the Saved names region is present
    const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
    // And the Saved names region appears after the status region in the page
    const status = screen.getByRole('status')
    expect(status.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // And the Saved names region reads "No names saved yet."
    expect(region).toHaveTextContent(NOTHING_SAVED_TEXT)
    // And the Saved names region has the attribute aria-live="polite"
    expect(region).toHaveAttribute('aria-live', 'polite')
    // And no button named "Save this name" is present
    expect(screen.queryByRole('button', { name: SAVE_CONTROL })).toBeNull()
  })

  it('summons the save control once there has been a greeting', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)
    // And no button named "Save this name" is present
    expect(screen.queryByRole('button', { name: SAVE_CONTROL })).toBeNull()

    // When the visitor types "Ada" into the Name field
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then a button named "Save this name" is present inside the Saved names region
    const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
    expect(within(region).getByRole('button', { name: SAVE_CONTROL })).toBeVisible()
  })

  // Not a repeat of the scenario above: it fails against the plausible wrong rule "show the save
  // control once the visitor has submitted something", which a blank submission also satisfies.
  it('does not summon the save control when the submission was blank', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)
    // And the visitor has not been greeted yet
    expect(screen.getByRole('status')).toHaveTextContent('')

    // When the visitor submits a blank Name field
    // Then an alert reads "Please enter your name."
    await submitABlankNameAndSeeTheAlert(user)

    // And no button named "Save this name" is present
    expect(screen.queryByRole('button', { name: SAVE_CONTROL })).toBeNull()
  })

  // Two named steps for the Givens the scenarios below share, each asserting that the state it
  // claims to set up really arrived — so no scenario can pass from a Given that silently did not
  // happen. Written once here rather than copied into six scenarios in six slightly different
  // shapes.

  // Given the visitor has been greeted "Hello, <name>"
  const beGreeted = async (user: UserEvent, name: string) => {
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), name)
    await user.click(screen.getByRole('button', { name: 'Greet me' }))
    expect(screen.getByRole('status')).toHaveTextContent(exactly(`Hello, ${name}`), verbatim)
  }

  // And has saved "<name>" — the region now answers with a row at the end of the list rather
  // than with "Saved: <name>" (design.md §4.3).
  const saveTheGreetedName = async (user: UserEvent, name: string) => {
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))
    expect(rowsInTheSavedNamesRegion().at(-1)).toHaveTextContent(name)
  }

  // Given the visitor has saved "<name>", … in that order. Saving is the only route a visitor
  // has into the list, so each name is greeted and then saved, and the step asserts the list it
  // claims to have built really arrived, in the order it claims — no scenario below can pass
  // from a Given that silently did not happen or that built the list backwards.
  const saveNamesInOrder = async (user: UserEvent, ...names: string[]) => {
    for (const name of names) {
      await beGreeted(user, name)
      await saveTheGreetedName(user, name)
    }
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(names.length)
    names.forEach((name, index) => expect(rows[index]).toHaveTextContent(name))
  }

  // The elements the field is described by, in the order the description is read — the order of
  // the ids in aria-describedby. A dangling id is a description a visitor never receives, so it
  // throws here rather than quietly shortening the list.
  const describedBy = (field: HTMLElement): HTMLElement[] =>
    (field.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter(Boolean)
      .map((id) => {
        const element = document.getElementById(id)
        if (element === null) {
          throw new Error(`aria-describedby names "${id}", which is not in the document`)
        }
        return element
      })

  it('adds a row for the name the visitor was just greeted as', async () => {
    const user = userEvent.setup()

    // Given the visitor has been greeted "Hello, Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region contains a row for "Ada"
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Ada')
    // And "No names saved yet." is no longer shown — asserted page-wide, which is stronger than
    // scoping it to the region and is how the empty state's disappearance is meant to read.
    expect(screen.queryByText(NOTHING_SAVED_TEXT)).toBeNull()
    // And the Saved names region still has the attribute aria-live="polite"
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveAttribute(
      'aria-live',
      'polite',
    )
  })

  // The scenario this whole feature exists for: the second save must not cost the visitor the
  // first name. It fails against the merged single-slot behaviour (which replaced Ada with Bob)
  // and against an implementation that prepends, which would leave Bob's row above Ada's. The
  // names are the Gherkin's, so this pair says nothing about sorting — "a saved name never
  // moves" is issue 04's own scenario, where Ada is re-saved while Bob and Cleo sit behind it.
  it('adds a second row for a second, different name without losing the first', async () => {
    const user = userEvent.setup()

    // Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')

    // When the visitor types "Bob" into the Name field
    // And the visitor activates the submit control
    await beGreeted(user, 'Bob')
    // And the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region contains a row for "Ada" and a row for "Bob"
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(2)
    // And the row for "Ada" appears before the row for "Bob" — asserted by the rows' indices,
    // which is what "oldest first" means on screen.
    expect(rows[0]).toHaveTextContent('Ada')
    expect(rows[1]).toHaveTextContent('Bob')
  })

  // The save control survives its own activation: it is not inside a keyed node that the save
  // replaces, so React keeps the same DOM node and the visitor is left exactly where they were.
  // This is what makes a polite live region the right answer instead of moving focus.
  it('leaves focus on the save control after saving', async () => {
    const user = userEvent.setup()

    // Given the visitor has been greeted "Hello, Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the "Save this name" button still has focus
    expect(screen.getByRole('button', { name: SAVE_CONTROL })).toHaveFocus()
  })

  // The scenario that fails any implementation sourcing the saved name from the Name field: the
  // greeting and the draft deliberately disagree here, so a row reading "Grace" is the defect it
  // exists to catch — a visitor could otherwise save a name they were never greeted as.
  it('saves the greeting, never an untyped draft in the Name field', async () => {
    const user = userEvent.setup()

    // Given the visitor has been greeted "Hello, Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')

    // When the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor types "Grace" into the Name field without submitting
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace')
    // And the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region contains a row for "Ada" only
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(
      within(screen.getByRole('region', { name: SAVED_NAMES_REGION })).queryByText('Grace'),
    ).toBeNull()
    // And the Name field still contains "Grace"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')
  })

  it('leaves the saved names alone when a submission is blank', async () => {
    const user = userEvent.setup()

    // Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')

    // When the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
    // And the Saved names region still contains a row for "Ada" only
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(screen.queryByText(NOTHING_SAVED_TEXT)).toBeNull()
  })

  // A <button> inside a <form> submits it by default, which would make saving a greeting — a
  // defect that passes a casual reading of the markup and fails only in use. The draft and the
  // greeting disagree here on purpose: if the save submitted the form, the greeting would move
  // to "Hello, Grace" and this scenario is the only thing that would notice.
  it('does not greet when the save control is activated', async () => {
    const user = userEvent.setup()

    // Given the visitor has been greeted "Hello, Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    // And the Name field now contains "Grace"
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace')

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the greeting still reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
  })

  // The other half of "the controls sit outside the form": Enter in the Name field still means
  // exactly what it meant before this feature existed. Driven from the keyboard, because that is
  // the only way this route into a submission is reachable.
  it('still greets from the Name field when Enter is pressed, and does not save', async () => {
    const user = userEvent.setup()

    // Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')

    // When the visitor types "Grace" into the Name field — the field holds "Ada" from the
    // greeting above, so it is cleared first: the Then below is about a field reading "Grace".
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace')
    // And the visitor presses Enter while focus is in the Name field
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
    await user.keyboard('{Enter}')

    // Then the greeting reads "Hello, Grace"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Grace'), verbatim)
    // And the Saved names region still contains a row for "Ada" only — being greeted is not
    // choosing, so a greeting never adds a name to the list.
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(
      within(screen.getByRole('region', { name: SAVED_NAMES_REGION })).queryByText('Grace'),
    ).toBeNull()
  })

  // ---------------------------------------------------------------------------------------
  // remembered-names issue 02 — Greet again as any saved name. One acceptance test per Gherkin
  // scenario, driven through the declared frontend seam (RTL + user-event via Vitest/jsdom).
  //
  // This block replaces the merged single-slot "Greet me again" scenarios, which slice 01
  // retired: a control named "Greet me again" on a screen holding three saved names cannot say
  // which one it means, so it comes back here per row, carrying its own row's name (seed,
  // Decisions; design.md P16, P18; VH-05).
  //
  // The control's name is written out from issue 02's Gherkin rather than imported from the
  // component, on purpose: a scenario that imported the label would pass whatever the label
  // happened to say.
  // ---------------------------------------------------------------------------------------

  const greetAgainControl = (name: string) => `Greet me again as ${name}`

  // The scenario this half of the walking skeleton exists for: the visitor is greeted as the
  // *earlier* of two saved names, which is precisely what the single slot could never do. It
  // fails against a screen that offers a way back only to the most recent name, and against a
  // control that greets the most recent name whichever row it sits in.
  it('greets again as an earlier saved name, not only the most recent', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and "Bob", in that order
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada', 'Bob')
    // And the visitor is currently greeted "Hello, Bob" — saving the second name leaves the
    // visitor greeted as it, and it is asserted rather than assumed.
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Bob'), verbatim)

    // When the visitor activates "Greet me again as Ada"
    await user.click(screen.getByRole('button', { name: greetAgainControl('Ada') }))

    // Then the greeting reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
  })

  // Each control is asserted *inside its own row*, which is what "a row's control" means and is
  // stronger than finding both somewhere on the page: it fails a screen that offers one shared
  // control, and one that pairs a row with a control naming a different row's name.
  it("names each row's greet-again control after that row's own name", async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and "Bob", in that order
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada', 'Bob')

    // Then a button named "Greet me again as Ada" is present
    const rows = rowsInTheSavedNamesRegion()
    expect(within(rows[0]).getByRole('button', { name: greetAgainControl('Ada') })).toBeVisible()
    // And a button named "Greet me again as Bob" is present
    expect(within(rows[1]).getByRole('button', { name: greetAgainControl('Bob') })).toBeVisible()
  })

  // Greeting again is an ordinary greeting, so it must re-announce even when the words do not
  // change — otherwise the visitor's press is met with a status region that is byte-for-byte
  // what it already said, which a live region does not speak. The text alone cannot see this
  // (it is identical before and after), so the observation is the node swap the keyed child
  // produces. Whether a screen reader then actually speaks it is a human check (VH-04(e)).
  it('re-announces the greeting when greeting again as the name already greeted', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and is currently greeted "Hello, Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    const announcedBefore = screen.getByRole('status').firstElementChild
    expect(announcedBefore).not.toBeNull()

    // When the visitor activates "Greet me again as Ada"
    await user.click(screen.getByRole('button', { name: greetAgainControl('Ada') }))

    // Then the status region's content is replaced so the greeting announces again
    const announcedAfter = screen.getByRole('status').firstElementChild
    expect(announcedAfter).not.toBe(announcedBefore)
    expect(announcedBefore?.isConnected).toBe(false)
    // And the greeting still reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
  })

  // The alert is the discriminator here, not the greeting: a blank submission leaves an existing
  // greeting exactly as it was (INV-4), so "Hello, Ada" would still be on screen after a control
  // that did nothing at all. What fails such a control is the alert still standing beside a
  // field the visitor never touched.
  it('clears a standing blank-name alert when greeting again', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    // And the visitor has just submitted a blank Name field, so an alert reads "Please enter
    // your name."
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.click(screen.getByRole('button', { name: 'Greet me' }))
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)

    // When the visitor activates "Greet me again as Ada"
    await user.click(screen.getByRole('button', { name: greetAgainControl('Ada') }))

    // Then the greeting reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And no alert is present
    expect(screen.queryByRole('alert')).toBeNull()
    // …and the field carries no stale reference to the alert that is gone: an aria-describedby
    // naming a removed element is a description the visitor never receives. The hint's id is
    // still there, and only it.
    const field = screen.getByRole('textbox', { name: 'Name' })
    expect(field).toHaveAccessibleDescription('Saved: Ada')
  })

  // The draft and the greeting deliberately disagree here: a control that wrote the saved name
  // into the Name field (explicitly out of scope — outcomes never write to the field) would read
  // "Ada" below, and one that submitted the form would greet "Hello, Grace".
  it("leaves the visitor's draft in the Name field untouched when greeting again", async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    // And the visitor has typed "Grace" into the Name field without submitting — the field holds
    // "Ada" from the greeting above, so it is cleared first.
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')

    // When the visitor activates "Greet me again as Ada"
    await user.click(screen.getByRole('button', { name: greetAgainControl('Ada') }))

    // Then the greeting reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And the Name field still contains "Grace"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')
  })

  // Being greeted and being saved are independent: greeting again reads the list and must not
  // write it. This fails a greetAgain that re-saved the name it greets (a second Ada, or Ada
  // moved to the end), and any implementation that rebuilt the list in greeting order.
  it('leaves the saved names alone when greeting again', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and "Bob", in that order
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada', 'Bob')

    // When the visitor activates "Greet me again as Ada"
    await user.click(screen.getByRole('button', { name: greetAgainControl('Ada') }))

    // Then the Saved names region still contains a row for "Ada" and a row for "Bob", in that
    // order — asserted by the rows' indices, which is what "in that order" means on screen.
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(rows[1]).toHaveTextContent('Bob')
  })

  // A <button> inside a <form> submits it by default, which would make greeting again a
  // submission of whatever the visitor happens to have typed — a defect that passes a casual
  // reading of the markup and fails only in use. The draft and the greeting disagree on purpose:
  // a submission would move the greeting to "Hello, Grace", and this is the only scenario that
  // would notice.
  it('does not submit the form when the greet-again control is activated', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    // And the Name field now contains "Grace"
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace')

    // When the visitor activates "Greet me again as Ada"
    await user.click(screen.getByRole('button', { name: greetAgainControl('Ada') }))

    // Then the Name field still contains "Grace"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')
    // …and the greeting is the row's name, never the draft: the greeting is what a form
    // submission would have moved, so it is what proves the control is outside the form.
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
  })

  // ---------------------------------------------------------------------------------------
  // Removing a saved name (issue 03). Lifting the single-slot limit took away the old escape
  // hatch — replacing — so without removal a name saved by mistake would sit on screen for the
  // rest of the visit, next to its own greet-again control. These scenarios are issue 03's
  // Gherkin, one test each.
  //
  // Rows are asserted by index (order) and by substring or scoped query (contents), never by an
  // anchored regex: a row's own controls join its text content, so a row reads
  // "AdaRemove Ada" (design.md §5.4).
  // ---------------------------------------------------------------------------------------

  // Every row carries its own remove control, named for its own name. Five buttons all reading
  // "Remove" would be indistinguishable to anyone not looking at the screen, and a fixed name
  // could not say which row it meant (seed, Decisions).
  it("names each row's remove control for that row's own name", async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and "Bob", in that order
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada', 'Bob')

    // Then a button named "Remove Ada" is present
    expect(screen.getByRole('button', { name: 'Remove Ada' })).toBeVisible()
    // And a button named "Remove Bob" is present
    expect(screen.getByRole('button', { name: 'Remove Bob' })).toBeVisible()
    // …each inside its own row, which is what makes the pairing meaningful rather than two
    // buttons that merely happen to be on the same screen.
    const rows = rowsInTheSavedNamesRegion()
    expect(within(rows[0]).getByRole('button', { name: 'Remove Ada' })).toBeVisible()
    expect(within(rows[1]).getByRole('button', { name: 'Remove Bob' })).toBeVisible()
  })

  // The scenario removing exists for: three names, one pressed control, and the other two still
  // there in the order they were saved. It fails an implementation that clears the list, one that
  // removes by position instead of by name, and one that rebuilds the list in any other order.
  it('takes out exactly one name and keeps the others in order', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo')

    // When the visitor activates "Remove Bob"
    await user.click(screen.getByRole('button', { name: 'Remove Bob' }))

    // Then the Saved names region contains a row for "Ada" and a row for "Cleo", in that order
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(rows[1]).toHaveTextContent('Cleo')
    // And no row for "Bob" is present — asserted page-wide by its own control, which is the one
    // thing only Bob's row could ever have carried.
    expect(screen.queryByRole('button', { name: 'Remove Bob' })).toBeNull()
    expect(
      within(screen.getByRole('region', { name: SAVED_NAMES_REGION })).queryByText('Bob'),
    ).toBeNull()
  })

  // Unlike saving, removing destroys the control that was pressed, so focus cannot stay where it
  // was and must be put somewhere deliberately. It goes to the region, which then announces its
  // own new contents — one rule, with no special case for the row's position (ADR-0031).
  it('moves focus to the Saved names region after removing', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and "Bob", in that order
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada', 'Bob')

    // When the visitor activates "Remove Ada"
    await user.click(screen.getByRole('button', { name: 'Remove Ada' }))

    // Then the Saved names region has focus
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveFocus()
  })

  // Removing the last row is not a special case: the same focus rule, and the region simply shows
  // its empty state again. This fails an implementation that only moves focus when a row survives
  // to receive it, and one that leaves an empty <ul> behind instead of the words.
  it('returns the region to its empty state when the only saved name is removed', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" only
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada')

    // When the visitor activates "Remove Ada"
    await user.click(screen.getByRole('button', { name: 'Remove Ada' }))

    // Then the Saved names region reads "No names saved yet."
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      NOTHING_SAVED_TEXT,
    )
    // …and no row is left behind at all: an empty list would satisfy the text above while still
    // showing a visitor nothing where the names used to be.
    expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
    // And the Saved names region has focus
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveFocus()
  })

  // The list and the greeting are separate things the visit holds: dropping a name the visitor no
  // longer wants kept must not also change who they are being greeted as. It fails an
  // implementation that clears the greeting along with the row it came from.
  it('leaves the greeting alone when the name being greeted is removed', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and is currently greeted "Hello, Ada"
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada')
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)

    // When the visitor activates "Remove Ada"
    await user.click(screen.getByRole('button', { name: 'Remove Ada' }))

    // Then the greeting still reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
  })

  // Removing really gives the room back, rather than only hiding a row. This is the scenario that
  // fails a limit counted from a running total of saves — a counter that removal forgets to
  // decrement passes every other scenario in this file and strands the visitor at issue 05's
  // refusal with a list they can see is not full.
  it('frees a slot for another save when a name is removed', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" only
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada')

    // When the visitor activates "Remove Ada"
    await user.click(screen.getByRole('button', { name: 'Remove Ada' }))
    // And the visitor types "Bob" into the Name field
    // And the visitor activates the submit control
    await beGreeted(user, 'Bob')
    // And the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region contains a row for "Bob" only
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Bob')
    // …and the removed name did not come back with it, anywhere on the screen: it had two homes,
    // its row and the hint at the Name field, and a visitor must meet neither again.
    expect(screen.queryByText('Ada')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Saved: Bob')
  })

  // Two independent things keep a removal from being a submission: the control is type="button",
  // and it lives in the region, which sits outside the <form>. A <button> defaults to submit, so
  // losing both at once — the region moved inside the form by a well-meaning tidy-up — is a defect
  // that passes a casual reading of the markup and fails only in use. The draft and the greeting
  // disagree here on purpose: if the removal submitted the form, the greeting would move to
  // "Hello, Grace" and this scenario is the only thing that would notice.
  it('does not submit the form when a remove control is activated', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada"
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada')
    // And the Name field now contains "Grace"
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace')

    // When the visitor activates "Remove Ada"
    await user.click(screen.getByRole('button', { name: 'Remove Ada' }))

    // Then the greeting is unaffected by the removal
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And the Name field still contains "Grace"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')
  })

  // ---------------------------------------------------------------------------------------
  // Saving while the list is full is refused, and removing is the way out (issue 05). One
  // acceptance test per Gherkin scenario, driven through the declared frontend seam.
  //
  // A guard block (design.md §5.1, ADR-0007): the whole save command — the append and both
  // refusals, each with the words the visitor reads — arrived with issue 01, because a live save
  // missing its limit branch would let a visitor put six names into a list whose whole point is
  // that it holds five, and a rule that refuses in silence is the failure this codebase has now
  // designed against three times. These scenarios therefore pass on their first run by design.
  // Nothing here was loosened to obtain a red bar; if one of them ever goes red the fix is the
  // implementation, never the scenario.
  //
  // They are not tautologies. Each kills a named wrong implementation, and every one of those
  // passes the whole of the rest of this file: a limit that drops the oldest name to make room;
  // a limit that refuses in silence; one that hides — or disables — the save control instead of
  // explaining itself; one off by one at the fifth name; and one counted from a running total of
  // saves that removal never gives back.
  //
  // The refusal is asserted inside the Saved names region and nowhere else: that is what makes
  // it announced (P14), and it keeps a message about the list out of the description of what the
  // visitor typed (seed, Decisions). Whether it is actually spoken is a human check
  // (VERIFY-WITH-HUMAN.md VH-04(c)).
  // ---------------------------------------------------------------------------------------

  // Given the visitor has saved five names: "Ada", "Bob", "Cleo", "Deb" and "Eve"
  // And the visitor has been greeted "Hello, Fay"
  //
  // The five names are written out, never counted up to SAVED_NAMES_LIMIT: a Given that read the
  // limit from the domain would fill the list to whatever the limit happened to become, and then
  // agree with it. Both halves assert the state they claim to set up really arrived —
  // saveNamesInOrder counts the rows, beGreeted reads the status region — so no scenario below
  // can pass from a Given that silently did not happen. Fay is greeted and deliberately not
  // saved: that is exactly the state a sixth save is attempted from.
  const haveAFullListAndBeGreetedAsASixthName = async (user: UserEvent) => {
    await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo', 'Deb', 'Eve')
    await beGreeted(user, 'Fay')
  }

  it('refuses to save a sixth name, and says why', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved five names: "Ada", "Bob", "Cleo", "Deb" and "Eve"
    // And the visitor has been greeted "Hello, Fay"
    render(<GreetingScreen />)
    await haveAFullListAndBeGreetedAsASixthName(user)

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region reads "Five names is the limit. Remove one to save another."
    const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
    expect(region).toHaveTextContent(FULL_LIST_TEXT)
    // …as an element of the region's own, which is the polite live region meant to announce it.
    expect(within(region).getByText(FULL_LIST_TEXT)).toBeVisible()
    expect(region).toHaveAttribute('aria-live', 'polite')
    // …and never at the Name field: the refusal is about the list, so describing the field with
    // it would answer "what is wrong with what I typed?" with a sentence about something else.
    // The field's description is still the saved names and nothing more.
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Saved: Ada, Bob, Cleo, Deb, Eve',
    )

    // And the Saved names region still contains exactly the rows "Ada", "Bob", "Cleo", "Deb"
    // and "Eve", in that order
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(rows[1]).toHaveTextContent('Bob')
    expect(rows[2]).toHaveTextContent('Cleo')
    expect(rows[3]).toHaveTextContent('Deb')
    expect(rows[4]).toHaveTextContent('Eve')
    // "exactly" — the refused name left no trace of itself in the list. Asserted by the control
    // only a row for Fay could ever have carried, because a row's text is its name run together
    // with its own controls' names and so cannot be matched whole (design.md §5.4).
    expect(screen.queryByRole('button', { name: 'Remove Fay' })).toBeNull()
  })

  // The tempting alternative the seed rejects outright: make room by dropping the oldest name.
  // It passes every other scenario in this block — the list still holds five rows, the save
  // still appears to work — and the visitor discovers it only by missing a name they had
  // deliberately kept, which would undo the premise of the whole feature to make room for one
  // more name.
  it('does not drop the oldest saved name to make room for the refused one', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved five names: "Ada", "Bob", "Cleo", "Deb" and "Eve"
    // And the visitor has been greeted "Hello, Fay"
    render(<GreetingScreen />)
    await haveAFullListAndBeGreetedAsASixthName(user)

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then a row for "Ada" is still present — the oldest name, the one a make-room rule takes
    // first, still at the head of the list and still carrying the control that acts on it.
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(within(rows[0]).getByRole('button', { name: 'Remove Ada' })).toBeVisible()
    // …and Ada is still named at the Name field, the list's other home on this screen: a name
    // dropped from the list would have gone from both places at once.
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Saved: Ada, Bob, Cleo, Deb, Eve',
    )
  })

  // A control with nothing to do right now still has something to teach. Hiding it would follow
  // this screen's own rule for the save control before a greeting, but the button would then
  // vanish mid-visit with no explanation and no way to learn that removing brings it back — the
  // refusal teaches the limit, a missing button teaches nothing (seed, Decisions). Disabling it
  // is the same failure in another shape: an unfocusable control that explains nothing. So the
  // assertion is present *and* enabled.
  it('keeps the save control on screen while the list is full', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved five names: "Ada", "Bob", "Cleo", "Deb" and "Eve"
    // And the visitor has been greeted "Hello, Fay"
    render(<GreetingScreen />)
    await haveAFullListAndBeGreetedAsASixthName(user)

    // Then a button named "Save this name" is present
    const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
    const saveControl = within(region).getByRole('button', { name: SAVE_CONTROL })
    expect(saveControl).toBeVisible()
    expect(saveControl).toBeEnabled()
  })

  // The refusal names its own way out, so the way out has to work: this is the pair of steps the
  // sentence "Remove one to save another" promises, run end to end. It fails a limit computed
  // from a running total of saves — a counter removal never gives back would strand the visitor
  // at a refusal with a list they can see is not full — and it fails a refusal that outlives the
  // list state it described.
  it('frees the slot the limit refusal pointed at when a name is removed', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved five names: "Ada", "Bob", "Cleo", "Deb" and "Eve"
    // And the visitor has been greeted "Hello, Fay"
    render(<GreetingScreen />)
    await haveAFullListAndBeGreetedAsASixthName(user)
    // …and the save was refused with "Five names is the limit. Remove one to save another."
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      FULL_LIST_TEXT,
    )

    // When the visitor activates "Remove Bob"
    await user.click(screen.getByRole('button', { name: 'Remove Bob' }))
    // …and the instruction goes the moment it is followed. The region announces itself on a
    // removal, so a refusal still standing here would be read out again — telling the visitor to
    // remove a name they have just removed, about a list that is no longer full.
    expect(screen.queryByText(FULL_LIST_TEXT)).toBeNull()
    // And the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region contains rows for "Ada", "Cleo", "Deb", "Eve" and "Fay", in
    // that order — the freed slot is the one at the end of the list, because a saved name is
    // appended and never slotted into the gap another name left.
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(rows[1]).toHaveTextContent('Cleo')
    expect(rows[2]).toHaveTextContent('Deb')
    expect(rows[3]).toHaveTextContent('Eve')
    expect(rows[4]).toHaveTextContent('Fay')
    // …and the sentence that sent the visitor to remove a name is gone, page-wide: an
    // instruction still on screen after it has been followed describes a list that no longer
    // exists, and would read as a second refusal.
    expect(screen.queryByText(FULL_LIST_TEXT)).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Saved: Ada, Cleo, Deb, Eve, Fay',
    )
  })

  // The boundary the limit is easiest to get wrong at. This fails a rule that refuses at four
  // names exactly as the sixth-name scenario fails one that refuses at six, and between the two
  // of them the list holds five and no other number.
  it('saves a fifth name without any talk of the limit', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved four names: "Ada", "Bob", "Cleo" and "Deb"
    render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo', 'Deb')
    // And the visitor has been greeted "Hello, Eve"
    await beGreeted(user, 'Eve')

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region contains a row for "Eve"
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(5)
    expect(rows[4]).toHaveTextContent('Eve')
    expect(within(rows[4]).getByRole('button', { name: 'Remove Eve' })).toBeVisible()
    // And no text "Five names is the limit. Remove one to save another." is present — asserted
    // page-wide rather than inside the region, so a refusal shown anywhere at all, including at
    // the Name field, fails here.
    expect(screen.queryByText(FULL_LIST_TEXT)).toBeNull()
    // …and the fifth name really did join the list rather than merely draw a row: the Name field
    // names all five.
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Saved: Ada, Bob, Cleo, Deb, Eve',
    )
  })

  // ---------------------------------------------------------------------------------------
  // The saved-name hint at the Name field. Carried forward unchanged from the merged saved-name
  // issue 03 — the hint's rule generalises rather than arrives, so these scenarios keep passing
  // verbatim with one saved name and remembered-names issue 06 widens them to the whole list
  // (design.md §4.3, ADR-0032).
  //
  // The hint is asserted through the field's *accessible description*, not by text: the Saved
  // names region shows the same name in its row, so a page-wide by-text query would match two
  // nodes and prove nothing about the field.
  // ---------------------------------------------------------------------------------------

  it('leaves the Name field undescribed while nothing is saved', () => {
    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)
    // And the visitor has not saved a name
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      NOTHING_SAVED_TEXT,
    )

    // Then the Name field has no accessible description
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('')
    // …and the attribute is absent rather than empty: an empty aria-describedby is a dangling
    // reference, which is not the same thing as having nothing to say.
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('aria-describedby')
  })

  it('describes the Name field with the saved name once a name is saved', async () => {
    const user = userEvent.setup()

    // Given the visitor has been greeted "Hello, Ada" and has saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')

    // Then the Name field has the accessible description "Saved: Ada"
    const field = screen.getByRole('textbox', { name: 'Name' })
    expect(field).toHaveAccessibleDescription('Saved: Ada')
    // And the element the Name field is described by is visible — reached through the
    // association rather than by its text, because the Saved names region shows "Ada" in its
    // row too. A visually-hidden node would satisfy the description above and show a sighted
    // visitor nothing; the seed asks for visible text that is *also* associated.
    const described = describedBy(field)
    expect(described).toHaveLength(1)
    expect(described[0]).toBeVisible()
  })

  // The scenario that fails any implementation sourcing the hint from the Name field instead of
  // from the saved name: the draft and the saved name deliberately disagree here.
  it('keeps the hint at the Name field while the visitor is mid-draft', async () => {
    const user = userEvent.setup()

    // Given the visitor saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')

    // When the visitor types "Grace" into the Name field without submitting — the field holds
    // "Ada" from the greeting above, so it is cleared first.
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')
    // …and nothing was submitted: the greeting is still the one that was saved.
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)

    // Then the Name field still has the accessible description "Saved: Ada"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Saved: Ada')
  })

  // Both describe the same field at once, so the order they are read in is a decision, not an
  // accident: the error about the submission just made outranks a standing piece of context.
  // Under this seam that ordering is one observation — the field's accessible description is the
  // two texts joined, in the order aria-describedby names them.
  it('describes the Name field with the alert before the hint when both are present', async () => {
    const user = userEvent.setup()

    // Given the visitor saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')

    // When the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the Name field's accessible description reads "Please enter your name. Saved: Ada"
    const field = screen.getByRole('textbox', { name: 'Name' })
    expect(field).toHaveAccessibleDescription(`${ALERT_TEXT} Saved: Ada`)
    // …and both described elements really are on screen, the alert first: the description above
    // is computed from the ids, so this is what stops it reading right for the wrong reason.
    const described = describedBy(field)
    expect(described).toHaveLength(2)
    expect(described[0]).toBe(screen.getByRole('alert'))
    expect(described[1]).toBeVisible()
  })

  // ---------------------------------------------------------------------------------------
  // remembered-names issue 06 — Be reminded of *every* saved name at the Name field. One
  // acceptance test per Gherkin scenario, at the declared seam (RTL + user-event via
  // Vitest/jsdom), entry point render(<GreetingScreen />).
  //
  // Guard block — expected green on the first run; see design.md §5.1. Every test is
  // list-shaped, because the one-name reading of each scenario is already pinned by the four
  // merged hint scenarios above, which §4.3 requires this feature to leave untouched.
  //
  // "described by text" is asserted as two claims: the association (which elements
  // aria-describedby names, and in what order) and the text on a visible element. A hidden node
  // satisfies the description alone; a by-text match alone would find the region's rows.
  // ---------------------------------------------------------------------------------------

  // Given the visitor has saved "<name>", … in that order. Each name is greeted first, because
  // saving appends the greeting and never the field's draft (R19). Row text is a substring
  // match: a row grows to include its own controls' names once issues 02 and 03 land.
  const haveSaved = async (user: UserEvent, ...names: string[]) => {
    for (const name of names) {
      await beGreeted(user, name)
      await saveTheGreetedName(user, name)
    }
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(names.length)
    names.forEach((name, index) => expect(rows[index]).toHaveTextContent(name))
  }

  // Scenario 1. The merged suite pins the field's own description here; what it cannot say is
  // that the sentence is absent from the whole screen.
  it('shows no saved-name hint anywhere while nothing is saved', () => {
    // Given the visitor has not saved any name
    render(<GreetingScreen />)
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      NOTHING_SAVED_TEXT,
    )

    // Then no element with the text "Saved:" is present — matched on an element's own text, so
    // this finds a hint <p> and never an ancestor of one.
    expect(screen.queryAllByText(/Saved:/)).toHaveLength(0)
  })

  // Scenario 2 — the one this slice exists for.
  it('describes the Name field with every saved name, in the order they were saved', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
    render(<GreetingScreen />)
    await haveSaved(user, 'Ada', 'Bob', 'Cleo')

    // Then the Name field is described by text reading "Saved: Ada, Bob, Cleo"
    const field = screen.getByRole('textbox', { name: 'Name' })
    expect(field).toHaveAccessibleDescription('Saved: Ada, Bob, Cleo')
    // …by exactly one visible element whose own text is that phrase and nothing else — the hint
    // has no children, so an anchored match is safe here, unlike on a row.
    const described = describedBy(field)
    expect(described).toHaveLength(1)
    expect(described[0]).toBeVisible()
    expect(described[0]).toHaveTextContent(exactly('Saved: Ada, Bob, Cleo'), verbatim)
  })

  // Still scenario 2, and what makes its "in the order they were saved" able to fail: Ada, Bob
  // and Cleo are already alphabetical, so a formatter that sorted the list would read the same
  // and pass the test above. One further name saved out of alphabetical order settles it.
  it('lists the saved names in save order even when that is not alphabetical order', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
    render(<GreetingScreen />)
    await haveSaved(user, 'Ada', 'Bob', 'Cleo')

    // When the visitor is greeted as "Abe" — which sorts before all three — and saves it
    await beGreeted(user, 'Abe')
    await saveTheGreetedName(user, 'Abe')

    // Then "Abe" is named last, where it was saved, and not first, where it would sort
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Saved: Ada, Bob, Cleo, Abe',
    )
  })

  // Scenario 3, as amended under VH-06. Its removing half — the only place the hint is proved
  // to *shrink* — needs the "Remove <name>" control that 03-remove-a-saved-name introduces and
  // this lane is not cut from; VH-06 defers it to integration and writes out the assertion.
  it('updates the hint as each further name is saved', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada"
    render(<GreetingScreen />)
    await haveSaved(user, 'Ada')
    // And the Name field is described by text reading "Saved: Ada"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Saved: Ada')

    // When the visitor is greeted as "Bob" and saves that name too
    await beGreeted(user, 'Bob')
    await saveTheGreetedName(user, 'Bob')

    // Then the Name field is described by text reading "Saved: Ada, Bob"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Saved: Ada, Bob',
    )
    // …and the hint moved rather than gaining a second copy: what it used to read is gone.
    expect(screen.queryByText('Saved: Ada')).toBeNull()
  })

  // Scenario 3's removing half, owed by VH-06 and paid here. Slice 06 was cut from
  // 01-hold-more-than-one-saved-name and had no "Remove <name>" control to press, so the half of
  // the scenario that proves the hint *shrinks* could not run in that lane; VH-06 narrowed the
  // scenario, wrote this assertion out, and named integration as the place it must land. Slices
  // 03 and 06 are both merged now, so it lands.
  //
  // Its absence left exactly one wrong implementation alive: a hint that *accumulates* names into
  // a string instead of projecting the current list. Every other slice-06 scenario passes against
  // that, because saving only ever appends. This is the one that does not.
  it('updates the hint when a saved name is removed', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and "Bob", in that order
    render(<GreetingScreen />)
    await haveSaved(user, 'Ada', 'Bob')
    // And the Name field is described by text reading "Saved: Ada, Bob"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Saved: Ada, Bob',
    )

    // When the visitor activates "Remove Ada"
    await user.click(screen.getByRole('button', { name: 'Remove Ada' }))

    // Then the Name field is described by text reading "Saved: Bob"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Saved: Bob')
  })

  // Scenario 4, with the list the merged one-name version cannot show: a hint sourced from the
  // Name field would read "Gr" here, and one showing only the newest saved name would drop Ada.
  it('still describes the Name field with every saved name while mid-draft', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and "Bob", in that order
    render(<GreetingScreen />)
    await haveSaved(user, 'Ada', 'Bob')

    // When the visitor types "Gr" into the Name field without submitting — the field holds
    // "Bob" from the greeting that was just saved, so it is cleared first.
    const field = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(field)
    await user.type(field, 'Gr')
    expect(field).toHaveValue('Gr')
    // …and nothing was submitted: the greeting is still the one that was saved last.
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Bob'), verbatim)

    // Then the Name field is still described by text reading "Saved: Ada, Bob"
    expect(field).toHaveAccessibleDescription('Saved: Ada, Bob')
    const described = describedBy(field)
    expect(described).toHaveLength(1)
    expect(described[0]).toBeVisible()
  })

  // Scenario 5, with the list. Both describe the field at once, so their order is a decision:
  // the error about the submission just made outranks a standing piece of context.
  it('describes the Name field with the blank-name alert before the whole hint', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" and "Bob", in that order
    render(<GreetingScreen />)
    await haveSaved(user, 'Ada', 'Bob')

    const field = screen.getByRole('textbox', { name: 'Name' })

    // When the visitor clears the Name field
    await user.clear(field)
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)

    // And the Name field's description lists the alert before the saved-name hint
    const described = describedBy(field)
    expect(described).toHaveLength(2)
    expect(described[0]).toBe(screen.getByRole('alert'))
    // …the whole hint, not a version that shortens once an alert joins it.
    expect(described[1]).toHaveTextContent(exactly('Saved: Ada, Bob'), verbatim)
    // …and that order is what a visitor receives, not just what the attribute says.
    expect(field).toHaveAccessibleDescription(`${ALERT_TEXT} Saved: Ada, Bob`)
  })

  // ---------------------------------------------------------------------------------------
  // remembered-names issue 07 — A fresh visit starts with nothing saved. One acceptance test per
  // Gherkin scenario, driven through the declared frontend seam from the same entry point as
  // every scenario above.
  //
  // A guard block (design.md §5.1, ADR-0026): the saved names, the standing refusal and the
  // revision counter are all fields of the visit, and the visit is the one useState inside
  // GreetingScreen, so nothing survives a remount and there is no reset logic to get wrong.
  //
  // They are not decoration. They go red the moment that state is lifted out of the component —
  // a module-level let, a context, a store — which is the realistic regression here, and if one
  // does go red the fix is structural: put the state back inside the component. Never add
  // reset-on-mount logic on top of state that leaked, which would make a fresh visit look clean
  // while a second mounted screen still shared the first visitor's names.
  //
  // Each Given is asserted in full before the fresh visit, so no Then below can pass against a
  // screen that was already clean — an absence is only evidence when the thing was there first.
  //
  // What no scenario here can see: whether a real browser reload clears the visit. jsdom
  // implements no navigation and no reload, so "starts a fresh visit" is this component
  // unmounting and being rendered again (startAFreshVisit, above), and reload-survival stays a
  // human check (greet-visitor VH-02) rather than being manufactured into an assertion that
  // would pass without being true.
  //
  // Nor does any scenario here add a "writes nothing to web storage" step: that is the one part
  // of this contract with no rendered form, and this repo keeps behaviour in the DOM. It is
  // guarded instead by the constraint test above, whose exercise path covers a save, a refused
  // save and a removal.
  // ---------------------------------------------------------------------------------------

  it('starts clean on a fresh visit after saving several names', async () => {
    const user = userEvent.setup()

    // Given the visitor saved "Ada", "Bob" and "Cleo" during a visit
    const { unmount } = render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo')
    // …and that visit really did reach the state whose absence is asserted below: three rows,
    // both of a row's controls, the save control, and the hint at the Name field. Without these
    // five lines, every Then below would be passing against a screen that was already clean.
    expect(rowsInTheSavedNamesRegion()).toHaveLength(3)
    expect(screen.getByRole('button', { name: greetAgainControl('Ada') })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove Ada' })).toBeVisible()
    expect(screen.getByRole('button', { name: SAVE_CONTROL })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Saved: Ada, Bob, Cleo',
    )

    // When the visitor starts a fresh visit
    startAFreshVisit(unmount)

    // Then the Saved names region reads "No names saved yet."
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      NOTHING_SAVED_TEXT,
    )
    // …and holds no rows at all, which is the same absence read from the list's side: only a
    // broken screen could carry the empty state and a leftover row at once, and this is the
    // assertion that would notice.
    expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
    // And no button named "Save this name" is present
    expect(screen.queryByRole('button', { name: SAVE_CONTROL })).toBeNull()
    // And no button named "Greet me again as Ada" is present
    expect(screen.queryByRole('button', { name: greetAgainControl('Ada') })).toBeNull()
    // And no button named "Remove Ada" is present
    expect(screen.queryByRole('button', { name: 'Remove Ada' })).toBeNull()
    // And the Name field has no description referring to saved names. Asserted as no description
    // at all, which is stronger and is what an arriving visitor must meet: a field described by
    // some other leftover would be the same bug wearing different words.
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('')
    // …with the attribute absent rather than emptied, exactly as on the very first arrival: an
    // empty aria-describedby is a dangling reference, not the same thing as nothing to say.
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('aria-describedby')
    // …and none of the three names is anywhere on the screen. Page-wide, because each had two
    // homes — its own row and the hint — and a visitor must not meet either one again.
    expect(screen.queryByText('Ada')).toBeNull()
    expect(screen.queryByText('Bob')).toBeNull()
    expect(screen.queryByText('Cleo')).toBeNull()
    expect(screen.queryByText('Saved: Ada, Bob, Cleo')).toBeNull()
  })

  // Not a repeat of the scenario above. Its Given is a list that was *edited*, which is the state
  // an implementation keeping the names outside the component would most plausibly get wrong: one
  // that rebuilt the list on mount from a surviving write log would bring Bob back, and one that
  // cached the removal apart from the list could bring Ada back too. Both pass the scenario
  // above.
  it('starts clean on a fresh visit after removing a name', async () => {
    const user = userEvent.setup()

    // Given the visitor saved "Ada" and "Bob" and then removed "Ada" during that visit
    const { unmount } = render(<GreetingScreen />)
    await saveNamesInOrder(user, 'Ada', 'Bob')
    await user.click(screen.getByRole('button', { name: 'Remove Ada' }))
    // …and the removal really happened, leaving exactly Bob's row behind.
    const rowsBeforeTheFreshVisit = rowsInTheSavedNamesRegion()
    expect(rowsBeforeTheFreshVisit).toHaveLength(1)
    expect(rowsBeforeTheFreshVisit[0]).toHaveTextContent('Bob')

    // When the visitor starts a fresh visit
    startAFreshVisit(unmount)

    // Then the Saved names region reads "No names saved yet."
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      NOTHING_SAVED_TEXT,
    )
    // And no row for "Bob" is present — the name that survived the removal must not survive the
    // visit. Asserted from every side a row is visible from: the list holds no rows at all, both
    // of the row's own controls are gone, and the name itself is nowhere on the page.
    expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
    expect(screen.queryByRole('button', { name: greetAgainControl('Bob') })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove Bob' })).toBeNull()
    expect(screen.queryByText('Bob')).toBeNull()
    // …and the removed name did not come back either — exactly what a mount that rebuilt the
    // list from a surviving write log would do, and the only line here that would notice it.
    expect(screen.queryByText('Ada')).toBeNull()
  })

  // The third state a visit can be left in, and the only one that is a *message* rather than a
  // list: a refusal standing on screen when the visit ends. It kills a screen that clears the
  // saved names on mount but not the refusal that explains them, which would meet an arriving
  // visitor with a sentence about a limit they have not reached and a list they cannot see.
  //
  // One scenario covers both kinds of refusal, and that is a fact about the domain rather than a
  // gap here. Every save writes its outcome to the single `lastSaveRefusal` field of the visit
  // (src/visit.ts), which the screen renders through the one node `refusalText` feeds
  // (src/GreetingScreen.tsx), so a visit can end with at most one refusal standing and whatever
  // clears the full-list one clears the already-saved one with it. The already-saved refusal is
  // driven across this seam by the issue 04 block below, and along the constraint test's path
  // above.
  it('starts clean on a fresh visit after a refused save', async () => {
    const user = userEvent.setup()

    // Given the visitor saved five names and then had a save refused with "Five names is the
    // limit. Remove one to save another." during that visit
    const { unmount } = render(<GreetingScreen />)
    await haveAFullListAndBeGreetedAsASixthName(user)
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))
    // …and the refusal really is standing in the region, over a list of five, as the visit ends.
    const regionBeforeTheFreshVisit = screen.getByRole('region', { name: SAVED_NAMES_REGION })
    expect(within(regionBeforeTheFreshVisit).getByText(FULL_LIST_TEXT)).toBeVisible()
    expect(rowsInTheSavedNamesRegion()).toHaveLength(5)

    // When the visitor starts a fresh visit
    startAFreshVisit(unmount)

    // Then the Saved names region reads "No names saved yet."
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      NOTHING_SAVED_TEXT,
    )
    // And no text "Five names is the limit. Remove one to save another." is present. Page-wide,
    // not scoped to the region: a refusal that survived a fresh visit is the same bug wherever
    // on the screen it landed.
    expect(screen.queryByText(FULL_LIST_TEXT)).toBeNull()
    // …and the five names the limit was counting are gone with it, so the arriving visitor meets
    // neither the message nor the list it was about.
    expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Remove Ada' })).toBeNull()
    expect(screen.queryByRole('button', { name: SAVE_CONTROL })).toBeNull()
  })

  // ---------------------------------------------------------------------------------------
  // remembered-names issue 04 — Saving a name already saved is refused. One acceptance test per
  // Gherkin scenario, driven through the declared frontend seam (RTL + user-event via
  // Vitest/jsdom), from the same entry point as every scenario above.
  //
  // A guard slice by design (design.md §5.1, ADR-0007): the whole `save` command — the append and
  // both refusals, with the words the visitor reads — arrived in slice 01, because a live save
  // with the duplicate branch missing would let a visitor keep two identical rows carrying two
  // identical controls. So these five are expected to pass on their first run, and nothing here is
  // loosened to manufacture a red bar.
  //
  // They are not tautologies. Each fails a named wrong implementation that a reader of slice 01
  // could plausibly have written: an append that never checks membership; the move-to-front
  // variant the seed explicitly rejects; a refusal rendered at the Name field instead of in the
  // region; a save that refuses whenever the list is non-empty; and hiding the save control once
  // it has refused. A red bar here means one of those, and the fix is that implementation —
  // never a weakened scenario.
  //
  // What no scenario here asserts, deliberately: whether the refusal is actually spoken, and
  // whether it is spoken *again* when the visitor presses Save a second time. jsdom implements no
  // live-region announcement, so the testable half — aria-live="polite" and the refusal's words
  // inside the region — is what these pin, and audibility is a human check (VH-04(b)).
  // ---------------------------------------------------------------------------------------

  // Issue 04's sentence, copied from its Gherkin rather than imported from src/visit.ts on
  // purpose — a scenario that imported refusalText would pass whatever that function happened to
  // say, including a sentence naming the wrong name.
  const ADA_ALREADY_SAVED_TEXT = 'Ada is already saved.'

  // Given the visitor has saved "Ada" only
  // And the visitor is currently greeted "Hello, Ada"
  //
  // Three of the five scenarios open on exactly this state, so it is one named step rather than
  // three copies, and it asserts both halves really arrived: one row, and that row is still the
  // greeting. Without the second assertion a scenario could pass having refused a save the
  // visitor was never in a position to make.
  const saveAdaAndStillBeGreetedAsAda = async (user: UserEvent) => {
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    expect(rowsInTheSavedNamesRegion()).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
  }

  it('refuses a save of a name already in the list, and says so', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" only
    // And the visitor is currently greeted "Hello, Ada"
    render(<GreetingScreen />)
    await saveAdaAndStillBeGreetedAsAda(user)

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region reads "Ada is already saved."
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      ADA_ALREADY_SAVED_TEXT,
    )
    // And the Saved names region contains exactly one row for "Ada" — one row in the whole
    // region, and it is Ada's, which is what "exactly one row for Ada" means when Ada is the only
    // name saved. This is the assertion an append that never checks membership fails: it would
    // leave two rows a visitor cannot tell apart.
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Ada')
  })

  // The move-to-front variant the seed explicitly rejects: a refusal that "helpfully" promotes the
  // re-saved name would rearrange the list under a visitor reaching for a control, and under a
  // screen-reader user's count of it. Ada is re-saved from the *front* of three, so any
  // reordering shows up as Ada leaving index 0.
  it('does not reorder the list when it refuses a name already saved', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    await beGreeted(user, 'Bob')
    await saveTheGreetedName(user, 'Bob')
    await beGreeted(user, 'Cleo')
    await saveTheGreetedName(user, 'Cleo')
    expect(rowsInTheSavedNamesRegion()).toHaveLength(3)
    // And the visitor is currently greeted "Hello, Ada" — re-greeted from the Name field, because
    // the per-row "Greet me again as Ada" control is issue 02's and does not exist here (VH-05).
    await beGreeted(user, 'Ada')

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region contains rows for "Ada", "Bob" and "Cleo", in that order —
    // asserted by the rows' indices, and by substring, never by an anchored regex: a row's text
    // grows to include its own controls' names when issues 02 and 03 land (design.md §5.4).
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(rows[1]).toHaveTextContent('Bob')
    expect(rows[2]).toHaveTextContent('Cleo')
  })

  // Not a repeat of the scenario above, and not a scenario of its own: it is what makes that one's
  // stated job — killing the move-to-front variant (design.md §5.1) — actually true. The Gherkin
  // re-saves "Ada", which is already first, so an implementation that promotes a re-saved name to
  // the front passes it unchanged; only a name with rows on *both* sides of it can see the
  // difference. Re-saving "Bob" from the middle fails promotion to the front and demotion to the
  // end alike, which is the whole of "a saved name never moves once it is in the list" (R18).
  it('leaves a re-saved name where it is, even in the middle of the list', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    await beGreeted(user, 'Bob')
    await saveTheGreetedName(user, 'Bob')
    await beGreeted(user, 'Cleo')
    await saveTheGreetedName(user, 'Cleo')
    // And the visitor is currently greeted "Hello, Bob"
    await beGreeted(user, 'Bob')

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region still contains rows for "Ada", "Bob" and "Cleo", in that order
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(rows[1]).toHaveTextContent('Bob')
    expect(rows[2]).toHaveTextContent('Cleo')
    // And it says so, in the name the visitor actually re-saved
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      'Bob is already saved.',
    )
  })

  it('announces the already-saved refusal through the same polite live region', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" only
    // And the visitor is currently greeted "Hello, Ada"
    render(<GreetingScreen />)
    await saveAdaAndStillBeGreetedAsAda(user)

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region still has the attribute aria-live="polite"
    const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
    expect(region).toHaveAttribute('aria-live', 'polite')
    // …and the refusal really is what that region carries. Without this the scenario would pass
    // against a refusal rendered at the Name field, which is the implementation it exists to fail
    // (design.md §5.1): the message is about the list, not about what was typed, so the field is
    // still described by the saved-name hint and by nothing else.
    expect(within(region).getByText(ADA_ALREADY_SAVED_TEXT)).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Saved: Ada')
  })

  // The scenario that fails a save which refuses whenever the list is non-empty: "already saved"
  // is about this name, not about the list having names in it.
  it('still saves a name not yet saved while another name is already saved', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" only
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    expect(rowsInTheSavedNamesRegion()).toHaveLength(1)
    // And the visitor has been greeted "Hello, Bob"
    await beGreeted(user, 'Bob')

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved names region contains a row for "Ada" and a row for "Bob"
    const rows = rowsInTheSavedNamesRegion()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Ada')
    expect(rows[1]).toHaveTextContent('Bob')
    // …and nothing was refused: a row can be present while a refusal sits above it, so the row
    // count alone would not notice a save that both appended and complained.
    expect(screen.queryByText('Bob is already saved.')).toBeNull()
  })

  // Hiding the save control after it refuses would follow the existing rule that a control with
  // nothing to do does not exist — but the control would vanish under the visitor's hand with no
  // explanation, and the refusal is what teaches; a missing button teaches nothing.
  it('keeps the save control on screen after an already-saved refusal', async () => {
    const user = userEvent.setup()

    // Given the visitor has saved "Ada" only
    // And the visitor is currently greeted "Hello, Ada"
    render(<GreetingScreen />)
    await saveAdaAndStillBeGreetedAsAda(user)

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then a button named "Save this name" is still present — inside the region, where issue 01
    // put it, and enabled: a disabled button is present without being a way to act, which is the
    // same silence by another route.
    const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
    const saveControl = within(region).getByRole('button', { name: SAVE_CONTROL })
    expect(saveControl).toBeVisible()
    expect(saveControl).toBeEnabled()
  })

  // -------------------------------------------------------------------------------------------
  // saved-at issue 01 — Every saved name shows when it was saved, and the reading stays honest.
  //
  // The readings are copied from this issue's Gherkin rather than imported from src/visit.ts, for
  // the reason the rest of this file already gives: a scenario that imported the words would pass
  // whatever those words happened to become.
  // -------------------------------------------------------------------------------------------
  describe('the age reading on a saved name', () => {
    // The wall clock every scenario below saves against. A fixed *local* instant, built from
    // parts rather than parsed from an ISO string, so the time a visitor's browser would show is
    // 14:20 wherever this suite runs — the stable absolute time is the local wall clock, and no
    // scenario may pass or fail on the machine's timezone (feature.md, Out of scope).
    const SAVE_INSTANT = new Date(2026, 7, 23, 14, 20, 0, 0)
    // "a stable absolute time" — a time of day, not a date (seed). Asserted as the time this
    // clock reads and not as an exact accessible name: the wording wrapped around the time is the
    // architect's, not agreed copy, and is still a human check (VH-01). What the criterion fixes
    // is that the time is in there and does not move.
    const STABLE_TIME = /\b14:20\b/
    // Where that same clock has got to five minutes later — the value the row's accessible name
    // must NOT have followed.
    const FIVE_MINUTES_LATER = /\b14:25\b/
    // The words the criterion forbids in the accessible name. Their absence there, while they are
    // plainly on screen, is the whole of "the passage of time is never announced".
    const TICKING_WORDS = /ago|just now/

    // design.md §5.4, measured in this repo: a full vi.useFakeTimers() makes every
    // `await user.click(...)` in this file hang until it times out, because @testing-library/dom
    // recognises only *jest*'s fake timers and otherwise awaits a faked setTimeout(0) that can
    // never fire. Faking setInterval and Date alone advances both the screen's own tick and the
    // clock it reads, and leaves user-event untouched. The narrowness is a known coupling: a tick
    // re-implemented with chained setTimeouts would not be advanced by these scenarios (ADR-0041).
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
      vi.setSystemTime(SAVE_INSTANT)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('reads "saved just now" on a name that has just been saved', async () => {
      const user = userEvent.setup()

      // Given the visitor has been greeted "Hello, Ada"
      render(<GreetingScreen />)
      await beGreeted(user, 'Ada')

      // When the visitor activates "Save this name"
      await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

      // Then the row for "Ada" shows the age reading "saved just now"
      expectAgeReading('Ada', 'saved just now')
    })

    it('counts up in minutes, unprompted, while the screen stays open', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" and the row for "Ada" reads "saved just now"
      render(<GreetingScreen />)
      await beGreeted(user, 'Ada')
      await saveTheGreetedName(user, 'Ada')
      expectAgeReading('Ada', 'saved just now')

      // When 60 seconds pass with the visitor doing nothing
      await timePasses(60_000)

      // Then the row for "Ada" shows the age reading "saved 1 minute ago"
      expectAgeReading('Ada', 'saved 1 minute ago')

      // When another 60 seconds pass with the visitor doing nothing
      await timePasses(60_000)

      // Then the row for "Ada" shows the age reading "saved 2 minutes ago"
      expectAgeReading('Ada', 'saved 2 minutes ago')
    })

    it('moves from minutes to hours after sixty minutes', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" and the row for "Ada" reads "saved just now"
      render(<GreetingScreen />)
      await beGreeted(user, 'Ada')
      await saveTheGreetedName(user, 'Ada')
      expectAgeReading('Ada', 'saved just now')

      // When 60 minutes pass with the visitor doing nothing
      await timePasses(60 * 60_000)

      // Then the row for "Ada" shows the age reading "saved 1 hour ago"
      expectAgeReading('Ada', 'saved 1 hour ago')
    })

    it('gives each row an age reading of its own', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada", then 2 minutes later saved "Bob"
      render(<GreetingScreen />)
      await beGreeted(user, 'Ada')
      await saveTheGreetedName(user, 'Ada')
      await timePasses(2 * 60_000)
      await beGreeted(user, 'Bob')
      await saveTheGreetedName(user, 'Bob')

      // Then the row for "Ada" shows the age reading "saved 2 minutes ago"
      expectAgeReading('Ada', 'saved 2 minutes ago')
      // And the row for "Bob" shows the age reading "saved just now"
      expectAgeReading('Bob', 'saved just now')
    })

    it('names a row with a stable absolute time, never with the ticking words', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada"
      render(<GreetingScreen />)
      await beGreeted(user, 'Ada')
      await saveTheGreetedName(user, 'Ada')

      // Then the row for "Ada" has an accessible name that includes a stable absolute time
      expect(rowFor('Ada')).toHaveAccessibleName(STABLE_TIME)
      // And the row for "Ada" has an accessible name that does not include the words "ago" or
      // "just now" …
      expect(rowFor('Ada')).not.toHaveAccessibleName(TICKING_WORDS)
      // … which is only worth asserting because those words are plainly on the row.
      expectAgeReading('Ada', 'saved just now')

      // When 5 minutes pass with the visitor doing nothing
      await timePasses(5 * 60_000)

      // Then the row for "Ada"'s accessible name still includes that same stable absolute time,
      // unchanged — it did not follow the clock to 14:25 …
      expect(rowFor('Ada')).toHaveAccessibleName(STABLE_TIME)
      expect(rowFor('Ada')).not.toHaveAccessibleName(FIVE_MINUTES_LATER)
      expect(rowFor('Ada')).not.toHaveAccessibleName(TICKING_WORDS)
      // … while the reading beside it did move, so the row demonstrably ticked and the stable
      // time held anyway, rather than both standing still.
      expectAgeReading('Ada', 'saved 5 minutes ago')
    })

    // A CONSTRAINT TEST — the sanctioned exception in CLAUDE.md. It asserts that something never
    // happens: that nothing an assistive technology can perceive inside the region changes while
    // the clock runs. An absence has no rendered form, so this has to reach past the rendered text
    // and read the shape of the accessibility tree (which nodes aria-hidden removes from it).
    //
    // What it does NOT prove is silence, and the distinction is the whole reason it is worth
    // having. jsdom implements no live-region announcement, and whether a given screen reader
    // honours aria-hidden for a mutation inside a live region is that screen reader's business —
    // that half stays VH-02 and stays open. What this proves is silence's *precondition*: that a
    // tick leaves the region's perceivable content byte-identical. If that ever stops holding,
    // announcement is certain rather than merely possible, and the design is broken — and this
    // fails in CI long before anyone thinks to repeat the screen-reader pass by hand.
    const perceivableRegionText = (): string => {
      const copy = screen
        .getByRole('region', { name: SAVED_NAMES_REGION })
        .cloneNode(true) as HTMLElement
      copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove())
      return copy.textContent ?? ''
    }

    // Every row's accessible name, in row order. The names live in attributes rather than in text,
    // so the measure above cannot see them and they need their own.
    const rowNames = (): (string | null)[] =>
      rowsInTheSavedNamesRegion().map((row) => row.getAttribute('aria-label'))

    it('leaves nothing an assistive technology can perceive changed by a tick (VH-02)', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob"
      render(<GreetingScreen />)
      await beGreeted(user, 'Ada')
      await saveTheGreetedName(user, 'Ada')
      await beGreeted(user, 'Bob')
      await saveTheGreetedName(user, 'Bob')
      const perceivableBefore = perceivableRegionText()
      const namesBefore = rowNames()

      // When 5 minutes pass with the visitor doing nothing
      await timePasses(5 * 60_000)

      // Then the readings on screen have moved — asserted first, because without it this scenario
      // would pass on a clock that never ticked at all and prove nothing whatsoever
      expectAgeReading('Ada', 'saved 5 minutes ago')
      expectAgeReading('Bob', 'saved 5 minutes ago')

      // And nothing perceivable moved with them: not one character of the region's text, and not
      // one row's name
      expect(perceivableRegionText()).toBe(perceivableBefore)
      expect(rowNames()).toEqual(namesBefore)

      // And the same measure still answers to the visitor's own actions, so what it proves is that
      // time is silent and not that the measure is deaf
      await user.click(screen.getByRole('button', { name: 'Remove Ada' }))
      expect(perceivableRegionText()).not.toBe(perceivableBefore)
    })

    it('does not restart the age reading when an already-saved name is saved again', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" 10 minutes ago
      render(<GreetingScreen />)
      await beGreeted(user, 'Ada')
      await saveTheGreetedName(user, 'Ada')
      await timePasses(10 * 60_000)
      expectAgeReading('Ada', 'saved 10 minutes ago')
      // And the visitor is currently greeted "Hello, Ada"
      expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)

      // When the visitor activates "Save this name"
      await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

      // Then the Saved names region reads "Ada is already saved."
      expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
        'Ada is already saved.',
      )
      // And the row for "Ada" still shows the age reading "saved 10 minutes ago"
      expectAgeReading('Ada', 'saved 10 minutes ago')
    })

    it('shows no age reading at all while nothing is saved', () => {
      // Given the visitor has not saved any name
      render(<GreetingScreen />)

      // Then the Saved names region reads "No names saved yet."
      expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
        NOTHING_SAVED_TEXT,
      )
      // And no text reading "ago" is present. Page-wide rather than scoped to the region, and
      // matched on an element's own text, so a stray reading rendered anywhere would be caught.
      expect(screen.queryAllByText(/ago/)).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------------------------
  // saved-at issue 02 — The most recently saved name is marked.
  //
  // The marker's word is copied from this issue's Gherkin rather than imported from the
  // component, for the reason the rest of this file already gives: a scenario that imported the
  // word would pass whatever that word happened to become.
  //
  // No fake clock here, unlike issue 01's scenarios: not one of these criteria has time passing
  // in it. The marker is a fact about which row holds the latest saved-at moment, and every
  // scenario below establishes that fact by saving names, which is the visitor's only route into
  // the list.
  // -------------------------------------------------------------------------------------------
  describe('the newest marker', () => {
    // "the row for <name> no longer shows the label <Newest>" — the same query, answered the other
    // way, so a marker that moved and a marker that was never there are not two different reads.
    const expectNoMarkerOn = (name: string) => {
      expect(within(rowFor(name)).queryByText(MARKER_TEXT)).toBeNull()
    }

    // "exactly one row shows the label <Newest>" — counted over the rows themselves rather than
    // over the markers, because the criterion is about rows: two markers inside one row would be
    // a defect this would otherwise report as a pass.
    const rowsShowingTheMarker = (): HTMLElement[] =>
      rowsInTheSavedNamesRegion().filter((row) => within(row).queryByText(MARKER_TEXT) !== null)

    it('marks the only saved name as the newest', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" only — the named step asserts the "only", so no
      // scenario below can pass from a list that quietly holds more than it claims.
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')

      // Then the row for "Ada" shows the label "Newest"
      expectMarkerOn('Ada')
    })

    it('moves the marker to a second name when it is saved', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" only, and the row for "Ada" shows the label "Newest"
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      expectMarkerOn('Ada')

      // When the visitor saves "Bob"
      await beGreeted(user, 'Bob')
      await saveTheGreetedName(user, 'Bob')

      // Then the row for "Bob" shows the label "Newest"
      expectMarkerOn('Bob')
      // And the row for "Ada" no longer shows the label "Newest"
      expectNoMarkerOn('Ada')
    })

    it('keeps the marker on exactly one row', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo')

      // Then exactly one row shows the label "Newest"
      expect(rowsShowingTheMarker()).toHaveLength(1)
      // And it is the row for "Cleo"
      expect(rowsShowingTheMarker()[0]).toBe(rowFor('Cleo'))
    })

    it('moves the marker to the next-newest when the newest name is removed', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob')
      // And the row for "Bob" shows the label "Newest"
      expectMarkerOn('Bob')

      // When the visitor activates "Remove Bob"
      await user.click(screen.getByRole('button', { name: 'Remove Bob' }))

      // Then the row for "Ada" shows the label "Newest"
      expectMarkerOn('Ada')
    })

    it('does not move the marker to an older name that is saved again', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob')
      // And the row for "Bob" shows the label "Newest"
      expectMarkerOn('Bob')
      // And the visitor is currently greeted "Hello, Ada"
      await beGreeted(user, 'Ada')

      // When the visitor activates "Save this name"
      await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

      // Then the Saved names region reads "Ada is already saved." — the same refusal, in the same
      // words, that this file already pins for issue 04 of remembered-names: re-saving a name
      // leaves the list genuinely unchanged, moments and all, rather than moving a field nobody
      // was told about.
      expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
        ADA_ALREADY_SAVED_TEXT,
      )
      // And the row for "Bob" still shows the label "Newest"
      expectMarkerOn('Bob')
      // And the row for "Ada" does not show the label "Newest"
      expectNoMarkerOn('Ada')
    })

    it('shows no marker at all while nothing is saved', () => {
      // Given the visitor has not saved any name
      render(<GreetingScreen />)
      expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
        NOTHING_SAVED_TEXT,
      )

      // Then no text reading "Newest" is present. Page-wide rather than scoped to the region, and
      // matched on an element's own whole text, so a marker rendered anywhere would be caught.
      expect(screen.queryAllByText(MARKER_TEXT)).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------------------------
  // saved-at issue 04 — A saved name older than a day falls off on its own.
  //
  // Every "When" below is time passing with the visitor doing nothing, so these scenarios operate
  // no control at all: they move the clock and then ask what the screen did by itself. The fake
  // timers are the narrow ones issue 01's block explains and ADR-0041 records — setInterval,
  // clearInterval and Date only, so the screen's own tick and the clock it reads both advance while
  // user-event is left untouched.
  // -------------------------------------------------------------------------------------------
  describe('a saved name older than a day', () => {
    // The wall clock these scenarios save against — a fixed *local* instant built from parts, for
    // the reason issue 01's block gives: no scenario may pass or fail on the machine's timezone.
    const AN_AFTERNOON = new Date(2026, 7, 23, 14, 20, 0, 0)
    // Ten to midnight on the same day, for the one scenario about a calendar boundary.
    const TEN_TO_MIDNIGHT = new Date(2026, 7, 23, 23, 50, 0, 0)

    const MINUTE = 60_000
    const HOUR = 60 * MINUTE
    const DAY = 24 * HOUR

    // "more than 24 hours pass" — a day, and then the one tick it takes the screen to look again.
    // The screen re-reads the clock once every TICK_MS and never in between, so a row leaves at the
    // first tick strictly after its own 24-hour mark rather than at the mark itself (design.md
    // §5.4, measured; the lateness is the staleness N17 accepts). Every step below that puts a name
    // past the cutoff therefore adds that one tick, and the period is imported rather than copied
    // so the allowance stays exactly one tick if the screen's tick ever changes.
    const MORE_THAN_A_DAY = DAY + TICK_MS

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
      vi.setSystemTime(AN_AFTERNOON)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('falls off once more than a day has passed since it was saved', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada"
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')

      // When more than 24 hours pass with the visitor doing nothing
      await timePasses(MORE_THAN_A_DAY)

      // Then no row for "Ada" is present …
      expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
      // … and the name is gone from the screen altogether: the row and the reminder at the Name
      // field were its two homes, and a visitor must meet neither again.
      expect(screen.queryByText('Ada')).toBeNull()
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('')
      // And the Saved names region's contents are announced. What a test can see of an
      // announcement is what the merged removal scenarios already pin: the region is still the
      // polite live region, and the new contents really are inside it rather than somewhere else
      // on the screen. Whether a screen reader speaks is a human check (VH-02).
      const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
      expect(region).toHaveAttribute('aria-live', 'polite')
      expect(within(region).getByText(NOTHING_SAVED_TEXT)).toBeVisible()
    })

    // Not the same scenario as the one above with a smaller number: this is the one that fails a
    // cutoff that rounds, counts calendar days, or fires on the first tick after a name is a few
    // hours old. The reading is asserted alongside, so a screen whose clock never moved at all —
    // which would also keep the row — cannot pass it.
    it('does not fall off before a day has passed', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada"
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')

      // When 23 hours and 59 minutes pass with the visitor doing nothing
      await timePasses(23 * HOUR + 59 * MINUTE)

      // Then the row for "Ada" is still present
      expect(rowFor('Ada')).toBeInTheDocument()
      // … and it aged the whole way there, so the clock demonstrably ran rather than stood still
      expect(within(rowFor('Ada')).getByText('saved 23 hours ago')).toBeInTheDocument()
    })

    // The scenario that fails a cutoff written against the calendar — "drop anything not saved
    // today" is the plausible wrong rule, and every other scenario in this block passes under it.
    // Ten to midnight is the one clock reading that can tell the two apart.
    it('measures the cutoff from the saved-at moment, not from a calendar boundary', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" at 23:50
      vi.setSystemTime(TEN_TO_MIDNIGHT)
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      expect(rowFor('Ada')).toHaveAccessibleName(/\b23:50\b/)

      // When 20 minutes pass with the visitor doing nothing, crossing midnight
      await timePasses(20 * MINUTE)
      // The crossing is the whole point of the scenario and no rendered node says what day it is,
      // so the fixture asserts its own clock really did reach the next day — without this the
      // scenario could quietly become "20 minutes pass in the afternoon", which proves nothing.
      expect(new Date().getDate()).toBe(TEN_TO_MIDNIGHT.getDate() + 1)

      // Then the row for "Ada" is still present
      expect(rowFor('Ada')).toBeInTheDocument()
      // … reading its age from its own moment, twenty minutes back, and not from the new day
      expect(within(rowFor('Ada')).getByText('saved 20 minutes ago')).toBeInTheDocument()
    })

    // Falling off is the one write to this list that moves no focus. Removing sends focus to the
    // region because it destroys the control that was pressed (P19); nothing was pressed here, so
    // there is nothing to send anywhere — and a visitor mid-sentence in the Name field must not
    // find themselves somewhere else because a row they had forgotten about ran out.
    it("moves no focus when a row falls off, unlike the visitor's own removal", async () => {
      const user = userEvent.setup()

      // Given the visitor's focus is currently on the Name field
      // And the visitor saved "Ada" earlier in the visit
      //
      // Built in the other order, because saving is done from a control and leaves the visitor on
      // it: the field is focused last, which is the state the two steps together describe.
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await user.click(screen.getByRole('textbox', { name: 'Name' }))
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()

      // When more than 24 hours pass with the visitor doing nothing
      await timePasses(MORE_THAN_A_DAY)

      // The row really did go — focus staying put would prove nothing if nothing had happened.
      expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
      // Then the Name field still has focus
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
      // … and specifically not the Saved names region, which is where a removal would have sent it
      expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).not.toHaveFocus()
    })

    // The scenario that fails a cutoff implemented as a display filter. A row hidden at render
    // time satisfies every "no row for Ada is present" step in this block while the visit quietly
    // goes on holding five names, so the visitor is refused at a list they can see has room in it.
    // Falling off has to give the slot back, exactly as removing does.
    it('frees a slot for another save, exactly like removing does', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved five names, the oldest being "Ada", saved more than 24 hours
      // ago …
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      // … and the other four were saved less than 24 hours ago. Twenty-three hours after Ada, so
      // that one stretch of time can carry her past the cutoff while leaving the four well inside
      // it — the list is full at a spread of ages, which is the only shape this scenario is about.
      await timePasses(23 * HOUR)
      for (const name of ['Bob', 'Cleo', 'Dee', 'Eve']) {
        await beGreeted(user, name)
        await saveTheGreetedName(user, name)
      }
      expect(rowsInTheSavedNamesRegion()).toHaveLength(5)

      // When enough time passes that "Ada" falls off the list
      await timePasses(HOUR + TICK_MS)
      expect(screen.queryByText('Ada')).toBeNull()
      expect(rowsInTheSavedNamesRegion()).toHaveLength(4)

      // And the visitor has been greeted "Hello, Fay"
      await beGreeted(user, 'Fay')
      // And the visitor activates "Save this name"
      await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

      // Then the Saved names region contains a row for "Fay"
      expect(rowFor('Fay')).toBeInTheDocument()
      expect(rowsInTheSavedNamesRegion()).toHaveLength(5)
      // … and the limit was never mentioned: the slot Ada left was a real one
      expect(screen.queryByText(FULL_LIST_TEXT)).toBeNull()
    })

    // The marker is re-derived from the moments that are left, never carried on a row, so a list
    // that loses a row on its own is not a special case for it. This fails an implementation that
    // marks a position — "the last row", "the row saved most recently in this render" — which
    // every scenario in issue 02's block also passes.
    it('leaves the newest marker on the row that survives a fall-off', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada", then 23 hours later saved "Bob"
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await timePasses(23 * HOUR)
      await beGreeted(user, 'Bob')
      await saveTheGreetedName(user, 'Bob')
      // And the row for "Bob" shows the label "Newest"
      expectMarkerOn('Bob')

      // When enough time passes that "Ada" is more than 24 hours old and "Bob" is not
      await timePasses(HOUR + TICK_MS)

      // Then no row for "Ada" is present
      expect(screen.queryByText('Ada')).toBeNull()
      expect(rowsInTheSavedNamesRegion()).toHaveLength(1)
      // And the row for "Bob" still shows the label "Newest"
      expectMarkerOn('Bob')
    })

    // The product's keep-not-refresh decision, seen through the third of the three things that
    // read a saved-at moment (the sort order and the marker are issues 03 and 02). It kills a save
    // that quietly rewrites the record it found: such a save passes every other scenario in this
    // block, and the visitor only meets it a day later, when a name they thought they had renewed
    // is gone or one they thought was stale is still there.
    it('does not restart the 24-hour clock when an already-saved name is saved again', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" 20 hours ago
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await timePasses(20 * HOUR)
      expect(within(rowFor('Ada')).getByText('saved 20 hours ago')).toBeInTheDocument()
      // And the visitor is currently greeted "Hello, Ada"
      expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)

      // When the visitor activates "Save this name"
      await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

      // Then the Saved names region reads "Ada is already saved."
      expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
        ADA_ALREADY_SAVED_TEXT,
      )

      // When 4 more hours pass with the visitor doing nothing — and the one further tick it takes
      // the screen to look again, for the reason MORE_THAN_A_DAY gives above: this is the only
      // step in the block that lands exactly on a name's 24-hour mark, and a row is dropped at the
      // first tick strictly after it. Fifteen seconds out of four hours does not soften the
      // criterion: had the re-save moved the moment, this row would have another twenty hours to
      // run and no amount of ticking would take it away.
      await timePasses(4 * HOUR + TICK_MS)

      // Then no row for "Ada" is present — her day ran out 24 hours after the *first* save
      expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
      expect(screen.queryByText('Ada')).toBeNull()
    })

  })


  // ---------------------------------------------------------------------------------------
  // saved-at, issue 03 — sorting the list newest-first.
  //
  // Sorting is a view, not a reordering: the visit goes on holding names in the order they were
  // saved, and every scenario below that looks anywhere other than at the rows — at the Name
  // field's hint, at what a removal takes out, at where a new save lands — is there to prove it.
  // ---------------------------------------------------------------------------------------

  describe('newest-first sorting', () => {
    // The control's accessible name, copied from issue 03's Gherkin rather than read off the
    // component: a scenario that asked the component what its control is called would pass
    // whatever name the component happened to give it.
    const SORT_CONTROL = 'Newest first'

    // "a checkbox named 'Newest first'" — queried by role and accessible name, so a button
    // wearing aria-pressed, or a checkbox whose label never reached it, does not answer here.
    const sortControl = (): HTMLElement => screen.getByRole('checkbox', { name: SORT_CONTROL })

    it('displays the names in save order, with the control off, until the visitor asks otherwise', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo')

      // Then the Saved names region displays rows in the order "Ada", "Bob", "Cleo" — the list
      // exactly as it read before this control existed
      expectRowsInDisplayOrder('Ada', 'Bob', 'Cleo')
      // And a checkbox named "Newest first" is present and unchecked
      expect(sortControl()).not.toBeChecked()
    })

    it('reorders the display when the visitor checks "Newest first"', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo')

      // When the visitor checks "Newest first"
      await user.click(sortControl())

      // Then the Saved names region displays rows in the order "Cleo", "Bob", "Ada"
      expectRowsInDisplayOrder('Cleo', 'Bob', 'Ada')
    })

    it('returns to save order when the visitor unchecks "Newest first"', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob')
      // And the visitor has checked "Newest first"
      await user.click(sortControl())
      expect(sortControl()).toBeChecked()
      expectRowsInDisplayOrder('Bob', 'Ada')

      // When the visitor unchecks "Newest first"
      await user.click(sortControl())

      // Then the Saved names region displays rows in the order "Ada", "Bob" — the view is a way
      // of looking at the list, so leaving it puts the visitor back where they started
      expectRowsInDisplayOrder('Ada', 'Bob')
      expect(sortControl()).not.toBeChecked()
    })

    // The scenario that proves sorting is a view rather than a reordering, at the one place the
    // difference is visible: the hint reads the list the visit is holding, so if checking the box
    // had reordered that list instead of the display, this is where it would show.
    it('still lists the names in save order at the Name field while sorting newest-first', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo')
      // And the visitor has checked "Newest first"
      await user.click(sortControl())
      expectRowsInDisplayOrder('Cleo', 'Bob', 'Ada')

      // Then the Name field is described by text reading "Saved: Ada, Bob, Cleo"
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
        'Saved: Ada, Bob, Cleo',
      )
    })

    // A removal is aimed by name, and the rows it is aimed at have moved. This fails an
    // implementation that removes by position — which reads the same on the default view and
    // takes out the wrong name the moment the display is reversed — and it re-asks both views
    // afterwards, because a list that ends up right on screen while the visit holds something
    // else is a defect the rows alone would not show.
    it('removes the name the visitor named, not the row in that position, while sorting newest-first', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada", "Bob" and "Cleo", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo')
      // And the visitor has checked "Newest first", so rows display "Cleo", "Bob", "Ada"
      await user.click(sortControl())
      expectRowsInDisplayOrder('Cleo', 'Bob', 'Ada')

      // When the visitor activates "Remove Bob"
      await user.click(screen.getByRole('button', { name: 'Remove Bob' }))

      // Then the Saved names region displays rows in the order "Cleo", "Ada"
      expectRowsInDisplayOrder('Cleo', 'Ada')
      // And the Name field is described by text reading "Saved: Ada, Cleo"
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
        'Saved: Ada, Cleo',
      )
    })

    it('puts a newly saved name at the top while sorting newest-first', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob')
      // And the visitor has checked "Newest first"
      await user.click(sortControl())
      expectRowsInDisplayOrder('Bob', 'Ada')

      // When the visitor saves "Cleo". Saved by hand rather than through the named step, because
      // that step looks for the new row at the end of the list — which is exactly where a name
      // saved under this view must not be.
      await beGreeted(user, 'Cleo')
      await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

      // Then the Saved names region displays rows in the order "Cleo", "Bob", "Ada" — the view is
      // re-derived on every render, so a save is seen through it rather than appended to it
      expectRowsInDisplayOrder('Cleo', 'Bob', 'Ada')
    })

    // The marker earns its place in this view too, even though it lands on the top row: one rule
    // for which row is the newest, whatever the visitor has done to the control (po Decisions).
    it('still marks the newest name while sorting newest-first', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob')
      // And the visitor has checked "Newest first"
      await user.click(sortControl())

      // Then the row for "Bob" shows the label "Newest"
      expectMarkerOn('Bob')
    })

    // The product's keep-not-refresh decision, seen through the sort — the third of the four
    // places the same answer has to hold. A save that moved the moment it found would leave the
    // list reading the same way here on the default view and give itself away the moment the
    // visitor reverses it.
    it('reorders nothing under either view when an older name is saved again', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob')
      // And the visitor is currently greeted "Hello, Ada"
      await beGreeted(user, 'Ada')

      // When the visitor activates "Save this name"
      await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

      // Then the Saved names region displays rows in the order "Ada", "Bob"
      expectRowsInDisplayOrder('Ada', 'Bob')

      // When the visitor checks "Newest first"
      await user.click(sortControl())

      // Then the Saved names region displays rows in the order "Bob", "Ada" — Ada is still the
      // older of the two, because the save that was refused left her moment where it was
      expectRowsInDisplayOrder('Bob', 'Ada')
    })

    it('offers no way to sort while nothing is saved', () => {
      // Given the visitor has not saved any name
      render(<GreetingScreen />)
      expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
        NOTHING_SAVED_TEXT,
      )

      // Then no checkbox named "Newest first" is present
      expect(screen.queryByRole('checkbox', { name: SORT_CONTROL })).toBeNull()
      // And no checkbox is present at all: a sort control rendered without its name would be a
      // control the visitor trips over and cannot identify, which is worse than the one the
      // criterion forbids.
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------------------------
  // undo-a-removal issue 01 — bringing back the last removed name (the walking skeleton).
  //
  // One acceptance test per Gherkin scenario, driven through the declared frontend seam: the
  // rendered DOM, by role and accessible name. The offer's own name is written out from the
  // Gherkin rather than read off the component, for the reason the rest of this file already
  // gives — a scenario that asked the component what its control is called would pass whatever
  // name the component happened to give it.
  //
  // The clock is faked here with the same narrow list the saved-at blocks use (ADR-0041): three
  // of these scenarios are about a moment surviving a removal, and one is about a name leaving on
  // its own. One consequence of a stopped clock is load-bearing and must not be "fixed": names
  // saved without time in between share one instant, so where a scenario needs one name to be
  // genuinely older than another, the clock is moved between the two saves rather than left to
  // the tie-break — otherwise the tie-break, and not the restore, would be deciding which row
  // carries "Newest".
  //
  // Three of the twelve pass on a screen that has an offer it cannot honour, and are kept as
  // written rather than dropped: the two bookends, which deny an offer where none should exist
  // ("offers nothing until a removal happens", "never offers back a name that fell off on its
  // own"), and the greeting one, which an inert control satisfies by doing nothing at all. An
  // absence assertion is worth most when the thing it denies exists, and all three became real
  // the moment the other nine did (design.md §5.1). Nothing here was loosened to obtain a red
  // bar, and if one of the three ever goes red the fix is the implementation, never the scenario.
  // -------------------------------------------------------------------------------------------
  describe('bringing back the last removed name', () => {
    // The wall clock these scenarios save against — a fixed *local* instant built from parts, for
    // the reason the saved-at blocks give: no scenario may pass or fail on the machine's timezone.
    const AN_AFTERNOON = new Date(2026, 7, 23, 14, 20, 0, 0)

    const MINUTE = 60_000
    const HOUR = 60 * MINUTE

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
      vi.setSystemTime(AN_AFTERNOON)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('offers nothing until a removal happens', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada"
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')

      // Then no button named "Bring Ada back" is present
      expect(screen.queryByRole('button', { name: offerFor('Ada') })).toBeNull()
      // …and nothing anywhere on screen reads those words either: an offer rendered without its
      // button role would be a promise the visitor cannot act on, which is worse than none.
      expect(screen.queryAllByText(offerFor('Ada'))).toHaveLength(0)
    })

    it('offers to bring a removed name back, named for that name', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob')

      // When the visitor activates "Remove Bob"
      await user.click(screen.getByRole('button', { name: 'Remove Bob' }))

      // Then a button named "Bring Bob back" is present in the Saved names region
      const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
      expect(within(region).getByRole('button', { name: offerFor('Bob') })).toBeVisible()
      // …and it names the name that was removed and no other, so a screen offering back whichever
      // row happens to be last does not answer here
      expect(screen.queryByRole('button', { name: offerFor('Ada') })).toBeNull()
    })

    it('puts the offer between the heading and the rows', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob", in that order
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob')

      // When the visitor activates "Remove Bob"
      await user.click(screen.getByRole('button', { name: 'Remove Bob' }))

      // Then the button named "Bring Bob back" appears before the row for "Ada" in the Saved
      // names region. Asserted by document position, the same way the region's own place after
      // the status region is pinned above: the criterion is about reading order, which is what
      // DOM order is, and never about a wrapper element or a class name.
      const theOffer = offer('Bob')
      expect(
        theOffer.compareDocumentPosition(rowFor('Ada')) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      // …and it is inside the region rather than merely before it, so an offer floating above the
      // heading — outside the live region that announces it — does not answer here either
      expect(
        within(screen.getByRole('region', { name: SAVED_NAMES_REGION })).getByRole('button', {
          name: offerFor('Bob'),
        }),
      ).toBe(theOffer)
    })

    it('brings the name back with its own saved-at moment, not a fresh one', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" 10 minutes ago
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await timePasses(10 * MINUTE)
      expectAgeReading('Ada', 'saved 10 minutes ago')
      // And the visitor activated "Remove Ada" just now, so a button named "Bring Ada back" is
      // present
      await user.click(screen.getByRole('button', { name: 'Remove Ada' }))
      expect(offer('Ada')).toBeVisible()

      // When the visitor activates "Bring Ada back"
      await user.click(offer('Ada'))

      // Then the row for "Ada" shows the age reading "saved 10 minutes ago" — the moment it
      // already had. A restore that re-dated the entry would read "saved just now" here, which is
      // the whole difference between bringing a name back and saving it again.
      expectAgeReading('Ada', 'saved 10 minutes ago')
    })

    it('brings the name back to its original place, leaving every other row exactly as it was', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and "Bob", in that order …
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      // … with five minutes between the two saves, so that Ada is genuinely the older of the two
      // rather than tied with Bob under a stopped clock — the tie-break would otherwise decide
      // this scenario's Newest marker and its ordering for it.
      await timePasses(5 * MINUTE)
      await beGreeted(user, 'Bob')
      await saveTheGreetedName(user, 'Bob')
      // … and the row for "Bob" shows the age reading "saved 5 minutes ago"
      await timePasses(5 * MINUTE)
      expectAgeReading('Bob', 'saved 5 minutes ago')
      // And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
      await user.click(screen.getByRole('button', { name: 'Remove Ada' }))
      expect(offer('Ada')).toBeVisible()

      // When the visitor activates "Bring Ada back"
      await user.click(offer('Ada'))

      // Then the Saved names region displays rows in the order "Ada", "Bob" — her own place, not
      // the end of the list
      expectRowsInDisplayOrder('Ada', 'Bob')
      // And the row for "Bob" still shows the age reading "saved 5 minutes ago"
      expectAgeReading('Bob', 'saved 5 minutes ago')
      // And the Name field is described by text reading "Saved: Ada, Bob" — the hint names the
      // list, so a name brought back reappears in it, in its own place
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
        'Saved: Ada, Bob',
      )
    })

    it('does not let a name brought back steal the newest marker', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" then "Bob", in that order …
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      // … Bob five minutes later, so Bob is the newer by his own moment and not by a tie-break
      await timePasses(5 * MINUTE)
      await beGreeted(user, 'Bob')
      await saveTheGreetedName(user, 'Bob')
      // … and the row for "Bob" shows the label "Newest"
      expectMarkerOn('Bob')
      // And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
      await user.click(screen.getByRole('button', { name: 'Remove Ada' }))
      expect(offer('Ada')).toBeVisible()

      // When the visitor activates "Bring Ada back"
      await user.click(offer('Ada'))

      // Then the row for "Bob" still shows the label "Newest"
      expectMarkerOn('Bob')
      // And the row for "Ada" does not show the label "Newest" — she came back with the moment
      // she had, so she is still the older of the two
      expect(within(rowFor('Ada')).queryByText(MARKER_TEXT)).toBeNull()
    })

    it('moves focus to the Saved names region, which shows the name back in it', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" only
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      // And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
      await user.click(screen.getByRole('button', { name: 'Remove Ada' }))
      expect(offer('Ada')).toBeVisible()

      // When the visitor activates "Bring Ada back"
      await user.click(offer('Ada'))

      // Then the Saved names region has focus — the control that was pressed no longer exists, so
      // focus has to be put somewhere deliberately, and it goes where a removal already sends it
      const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
      expect(region).toHaveFocus()
      // And the Saved names region contains a row for "Ada"
      expect(within(region).getByText('Ada')).toBeInTheDocument()
      expect(rowFor('Ada')).toBeInTheDocument()
    })

    it('spends the offer once it is pressed', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" only
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      // And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
      await user.click(screen.getByRole('button', { name: 'Remove Ada' }))
      expect(offer('Ada')).toBeVisible()

      // When the visitor activates "Bring Ada back"
      await user.click(offer('Ada'))

      // Then no button named "Bring Ada back" is present — there is no undoing the undo, and
      // pressing it a second time could only put a second copy of Ada into the list
      expect(screen.queryByRole('button', { name: offerFor('Ada') })).toBeNull()
      // …and the words are gone from the screen altogether, not merely un-pressable
      expect(screen.queryAllByText(offerFor('Ada'))).toHaveLength(0)
    })

    it('does not change who the visitor is greeted as', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" and is currently greeted "Hello, Bob"
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await beGreeted(user, 'Bob')
      // And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
      await user.click(screen.getByRole('button', { name: 'Remove Ada' }))
      expect(offer('Ada')).toBeVisible()

      // When the visitor activates "Bring Ada back"
      await user.click(offer('Ada'))

      // Then the greeting still reads "Hello, Bob" — bringing a name back is a write to the list,
      // and the list is not who the visitor is
      expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Bob'), verbatim)
    })

    it('shows the empty state and the offer together when the last name is removed', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada" only
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')

      // When the visitor activates "Remove Ada"
      await user.click(screen.getByRole('button', { name: 'Remove Ada' }))

      // Then the Saved names region reads "No names saved yet." — nothing is saved, which is true
      const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
      expect(within(region).getByText(NOTHING_SAVED_TEXT)).toBeVisible()
      // And a button named "Bring Ada back" is present — the way back is right there
      expect(within(region).getByRole('button', { name: offerFor('Ada') })).toBeVisible()
      // And no checkbox named "Newest first" is present: there is still no order to choose
      // between, so the sort control stays absent
      expect(screen.queryByRole('checkbox', { name: 'Newest first' })).toBeNull()
    })

    it('never overfills the list, even bringing a name back to a list that was full', async () => {
      const user = userEvent.setup()

      // Given the visitor has saved "Ada", "Bob", "Cleo", "Dan" and "Eve"
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada', 'Bob', 'Cleo', 'Dan', 'Eve')
      // And the visitor activated "Remove Eve", so a button named "Bring Eve back" is present
      await user.click(screen.getByRole('button', { name: 'Remove Eve' }))
      expect(offer('Eve')).toBeVisible()

      // When the visitor activates "Bring Eve back"
      await user.click(offer('Eve'))

      // Then the Saved names region displays rows in the order "Ada", "Bob", "Cleo", "Dan", "Eve"
      // — five of five, the list exactly as it read before the removal
      expectRowsInDisplayOrder('Ada', 'Bob', 'Cleo', 'Dan', 'Eve')
      // And the Saved names region does not read "Five names is the limit. Remove one to save
      // another." The removal freed exactly one slot and the restore filled exactly that slot, so
      // the limit was never at risk — and a restore that refused, or that counted, would say so.
      expect(screen.queryByText(FULL_LIST_TEXT)).toBeNull()
    })

    it('never offers back a name that fell off on its own', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" 23 hours and 58 minutes ago
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await timePasses(23 * HOUR + 58 * MINUTE)
      // … and she is still on screen, so the row really does leave during the When below
      expect(rowFor('Ada')).toBeInTheDocument()

      // When 3 more minutes pass with the visitor doing nothing
      await timePasses(3 * MINUTE)

      // Then no row for "Ada" is present
      expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
      // And no button named "Bring Ada back" is present — the visitor activated nothing, so
      // nothing was taken from them by mistake and there is nothing to take back
      expect(screen.queryByRole('button', { name: offerFor('Ada') })).toBeNull()
      expect(screen.queryAllByText(offerFor('Ada'))).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------------------------
  // undo-a-removal issue 03 — the held entry ages like the rest.
  //
  // One acceptance test per Gherkin scenario, through the same seam as every scenario above: the
  // rendered DOM, by role and accessible name. Nothing here needs new markup, and that is the
  // slice: the whole of it is a control that stops being rendered once the name it would bring
  // back is more than a day old, which is why three of the four assertions below are absences.
  //
  // Which of the four are red on arrival is worth saying, so nobody reads a green bar as proof of
  // more than it is (design.md §5.1). Red: "takes the offer away, silently, once the held entry
  // turns a day old" and "without disturbing anything else on screen" — an offer that never ages
  // keeps its button in both, and the second is the one that also fails an implementation that
  // ends the offer inside expire, because in it expire drops nothing at all. Green either way,
  // and kept: "leaves the offer standing just short of a day", which is the boundary read from
  // the near side and fails a cutoff written short or an offer retired by whichever tick happens
  // to touch it; and "keeps a name brought back ageing from its original moment", which the
  // restore already honours by putting the very entry back (INV-36) and which now also fails if
  // the guard added to bringBack turns a live offer inert before its own boundary. A boundary is
  // worth pinning from both sides, and nothing here was loosened to obtain a red bar.
  //
  // What this seam cannot see is the *silence* of the ending: jsdom implements no announcement,
  // so "no message, nothing announced" is proven here only as far as no text appears, and the
  // rest stays VH-02. The merged constraint test above is deliberately not extended to cover it —
  // it never leaves an offer standing, and from this slice on a tick genuinely may change what
  // the region shows, so leaving an offer standing before its tick would make it fail for the
  // right reason and be read as the wrong one (design.md N19).
  // -------------------------------------------------------------------------------------------
  describe('the held entry ageing out', () => {
    // The wall clock these scenarios save against — a fixed *local* instant built from parts, for
    // the reason the blocks above give: no scenario may pass or fail on the machine's timezone.
    const AN_AFTERNOON = new Date(2026, 7, 23, 14, 20, 0, 0)

    const MINUTE = 60_000
    const HOUR = 60 * MINUTE

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
      vi.setSystemTime(AN_AFTERNOON)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    // "Given the visitor saved <name> <so long> ago, and activated Remove <name> just now, so a
    // button named 'Bring <name> back' is present" — the Given three of these four scenarios open
    // with, spelled once. It asserts the row was really there to be removed and that the offer
    // really arrived, so no scenario below can pass from a Given that silently did not happen: an
    // absence that was an absence all along proves nothing.
    const letItAgeAndRemoveIt = async (user: UserEvent, name: string, age: number) => {
      await timePasses(age)
      expect(rowFor(name)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: `Remove ${name}` }))
      expect(offer(name)).toBeVisible()
    }

    it('leaves the offer standing just short of a day', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" 23 hours and 55 minutes ago
      // And the visitor activated "Remove Ada" just now, so a button named "Bring Ada back" is
      // present
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await letItAgeAndRemoveIt(user, 'Ada', 23 * HOUR + 55 * MINUTE)

      // When 4 more minutes pass with the visitor doing nothing
      await timePasses(4 * MINUTE)

      // Then a button named "Bring Ada back" is still present — the held entry is 23h59m old,
      // inside the very cutoff every visible row obeys, so the offer is exactly as workable as it
      // was the moment it appeared. Nothing on screen counts down towards the boundary, and no
      // tick short of it may retire the offer.
      expect(offer('Ada')).toBeVisible()
    })

    it('takes the offer away, silently, once the held entry turns a day old', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" 23 hours and 55 minutes ago
      // And the visitor activated "Remove Ada" just now, so a button named "Bring Ada back" is
      // present
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await letItAgeAndRemoveIt(user, 'Ada', 23 * HOUR + 55 * MINUTE)

      // When 6 more minutes pass with the visitor doing nothing — six rather than four, which is
      // the only difference between this scenario and the one above it, and the whole boundary
      await timePasses(6 * MINUTE)

      // Then no button named "Bring Ada back" is present: her held moment has crossed the day-old
      // cutoff, so bringing her back could only hand the visitor a name the next tick would drop
      expect(screen.queryByRole('button', { name: offerFor('Ada') })).toBeNull()
      // And no text reading "Bring Ada back" is present anywhere on screen — not disabled, not
      // greyed, not left behind as words without a button: simply absent, the way the Save control
      // and the sort control are already absent when there is nothing for them to do
      expect(screen.queryAllByText(offerFor('Ada'))).toHaveLength(0)
      // …and the ending said nothing about itself either. All this seam can prove of "nothing is
      // announced" is that no message arrived to replace the offer, so the region reads exactly
      // what an emptied list has always read; whether a real screen reader stays quiet is VH-02.
      const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
      expect(within(region).getByText(NOTHING_SAVED_TEXT)).toBeVisible()
    })

    it('keeps a name brought back ageing from its original moment, not from when it came back', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" 23 hours and 50 minutes ago
      // And the visitor activated "Remove Ada" just now, so a button named "Bring Ada back" is
      // present
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await letItAgeAndRemoveIt(user, 'Ada', 23 * HOUR + 50 * MINUTE)

      // When the visitor activates "Bring Ada back" — inside the cutoff, so the offer is there and
      // certain to work
      await user.click(offer('Ada'))

      // Then the Saved names region contains a row for "Ada"
      const region = screen.getByRole('region', { name: SAVED_NAMES_REGION })
      expect(within(region).getByText('Ada')).toBeInTheDocument()
      expect(rowFor('Ada')).toBeInTheDocument()

      // When 15 more minutes pass with the visitor doing nothing
      await timePasses(15 * MINUTE)

      // Then no row for "Ada" is present. She is 24h05m old measured from the moment she was
      // first saved, and coming back was never a save: a restore that re-dated her would leave
      // her on screen here for another day.
      expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
    })

    it('takes the offer away without disturbing anything else on screen', async () => {
      const user = userEvent.setup()

      // Given the visitor saved "Ada" 23 hours and 55 minutes ago, then saved "Bob" just after.
      // "Just after" is five minutes and not the same instant, and the criterion itself forces
      // that: two saves under a stopped clock share one moment, so a Bob saved in the same breath
      // as Ada would fall off in the same breath as her held entry ages — the offer would then end
      // because the list moved (R41) and this scenario would prove nothing about the held entry's
      // own clock (R42), and its last step, which requires Bob's row to survive, would fail.
      render(<GreetingScreen />)
      await saveNamesInOrder(user, 'Ada')
      await timePasses(5 * MINUTE)
      await beGreeted(user, 'Bob')
      await saveTheGreetedName(user, 'Bob')
      // And the visitor activated "Remove Ada", so a button named "Bring Ada back" is present
      await letItAgeAndRemoveIt(user, 'Ada', 23 * HOUR + 50 * MINUTE)

      // When 6 more minutes pass with the visitor doing nothing
      await timePasses(6 * MINUTE)

      // Then no button named "Bring Ada back" is present — Ada's held moment is 24h01m old
      expect(screen.queryByRole('button', { name: offerFor('Ada') })).toBeNull()
      expect(screen.queryAllByText(offerFor('Ada'))).toHaveLength(0)
      // And the Saved names region contains a row for "Bob" — his own moment is 23h56m old, so he
      // stays, and nothing about the offer ending reached the list at all. This is the step that
      // separates the two rules the offer can end by: no row left the list, so there was no write
      // to the list, so a screen that ended the offer only when something fell off — the tidy
      // mistake of clearing it inside expire — would still be showing it here.
      expectRowsInDisplayOrder('Bob')
      // …reading his own age, unchanged and still counting: 23h56m since he was saved
      expectAgeReading('Bob', 'saved 23 hours ago')
    })
  })
})
