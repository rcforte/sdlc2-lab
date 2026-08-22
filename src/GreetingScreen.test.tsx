import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
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
  // scenarios above only catch storage that is read back, and a write that is never read is
  // invisible to every assertion in this file.
  it('never writes to web storage', async () => {
    const user = userEvent.setup()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    render(<GreetingScreen />)

    // Every path that mutates the visit: a greeting, a blank rejection, a correction, and a
    // clear. The list must grow with the domain's commands, or a write in a handler this test
    // never activates passes every scenario in the suite (ADR-0018 — measured: a setItem planted
    // in the clear handler survives all 18 of this feature's scenarios and this very test
    // without the last line below).
    const nameField = () => screen.getByRole('textbox', { name: 'Name' })
    const submitControl = () => screen.getByRole('button', { name: 'Greet me' })
    await user.type(nameField(), 'Ada')
    await user.click(submitControl())
    await user.clear(nameField())
    await user.click(submitControl())
    await user.type(nameField(), 'Grace')
    await user.click(submitControl())
    // The clear control only exists once the log has an entry, so this comes after the last
    // successful submit.
    await user.click(screen.getByRole('button', { name: 'Clear the log' }))

    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)

    setItem.mockRestore()
  })

  // ---------------------------------------------------------------------------------------
  // greeting-log issue 01 — See the greeting log grow. One acceptance test per Gherkin
  // scenario, every one driven through render(<GreetingScreen />) (design.md §5.1, ADR-0015).
  //
  // The named steps below are the Contract vocabulary's two DOM shapes, written once: every
  // scenario's "the greeting log is empty" and "the greeting log has exactly N entries, oldest
  // first: ..." mean exactly these assertions and nothing looser.
  // ---------------------------------------------------------------------------------------

  // The empty-log copy, copied from the Gherkin rather than imported from the component, for
  // the same reason ALERT_TEXT above is: a scenario that imported the constant would pass
  // whatever the constant happened to say.
  const EMPTY_LOG_MESSAGE = 'You have not been greeted yet.'

  // "The greeting log is present" — the region landmark, named by its own visible heading.
  // getByRole, not queryByRole: a region that never rendered fails loudly here instead of
  // passing as "empty" further down.
  const greetingLog = () => screen.getByRole('region', { name: 'Greeted this visit' })

  // "The greeting log is empty" — both halves of the empty shape. The message must be its own
  // element, because the region's own text also contains its heading, so the region's combined
  // text is never exactly the message alone.
  const expectTheGreetingLogToBeEmpty = () => {
    expect(within(greetingLog()).queryByRole('list')).toBeNull()
    expect(within(greetingLog()).getByText(EMPTY_LOG_MESSAGE)).toBeInTheDocument()
  }

  // "The greeting log has exactly N entries, oldest first: ..." — count, DOM order and exact
  // text in one assertion, plus the empty message being gone (the two shapes are mutually
  // exclusive, never layered). The exact form is required: expect(item).toHaveTextContent('Ada')
  // is a *substring* match under jest-dom and would also pass against an entry reading
  // "Hello, Ada", which is precisely the entry text this feature forbids.
  const expectTheGreetingLogToRead = (...names: string[]) => {
    const items = within(greetingLog()).getAllByRole('listitem')
    expect(items).toHaveLength(names.length)
    expect(items.map((item) => item.textContent?.trim())).toEqual(names)
    expect(within(greetingLog()).queryByText(EMPTY_LOG_MESSAGE)).toBeNull()
  }

  // Scenario: The visitor sees the greeting log gain its first entry (the walking skeleton).
  it('adds the first entry to the greeting log when the visitor is greeted', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)
    // And the greeting log is empty
    expectTheGreetingLogToBeEmpty()

    // When the visitor types "Ada" into the Name field
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And the greeting log has exactly one entry, oldest first: "Ada"
    // And the greeting log no longer says "You have not been greeted yet."
    expectTheGreetingLogToRead('Ada')
    // And a heading reads "Greeted this visit"
    expect(screen.getByRole('heading', { name: 'Greeted this visit' })).toBeInTheDocument()
  })

  // Scenario: The greeting log is present with its empty message before the first greeting.
  it('shows the greeting log with its empty message before the first greeting', () => {
    // Given the visitor is on the greeting screen
    // And the visitor has not been greeted yet
    render(<GreetingScreen />)

    // Then the greeting log is present
    expect(greetingLog()).toBeInTheDocument()
    // And the greeting log is empty
    expectTheGreetingLogToBeEmpty()
    // And a heading reads "Greeted this visit" — and it is the *same* element that names the
    // region, so what a screen reader announces on landing there is text a sighted visitor can
    // read, not an aria-label duplicating nothing on screen.
    expect(screen.getByRole('heading', { name: 'Greeted this visit' })).toBeInTheDocument()
    expect(greetingLog()).toHaveAccessibleName('Greeted this visit')
    // And the greeting log follows the status region in document order — the one DOM-observable
    // consequence of the agreed "below the greeting" placement, since sequential screen-reader
    // reading order follows DOM order (visual position is out of scope).
    const statusRegion = screen.getByRole('status')
    expect(
      statusRegion.compareDocumentPosition(greetingLog()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  // "Given the visitor has already been greeted ..." — one named step rather than a copy per
  // scenario. It clears the field first (so it composes when called twice) and asserts the
  // greeting really arrived, so no scenario can start from a Given that silently did not happen.
  const beGreeted = async (user: UserEvent, name: string) => {
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), name)
    await user.click(screen.getByRole('button', { name: 'Greet me' }))
    expect(screen.getByRole('status')).toHaveTextContent(exactly(`Hello, ${name}`), verbatim)
  }

  // "The greeting log's newest entry reads X" — the *last* item in the same list, matched the
  // same exact way as every other entry.
  const expectTheNewestEntryToRead = (name: string) => {
    const items = within(greetingLog()).getAllByRole('listitem')
    expect(items[items.length - 1].textContent?.trim()).toBe(name)
  }

  // Scenario: Entries read oldest first, and the on-screen greeting is the log's newest entry.
  // Three is the smallest count that tells append-only growth apart from a fixed-size window
  // that silently drops the oldest entry; two cannot.
  it('reads oldest first, with the on-screen greeting as the newest entry', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" and then "Hello, Grace"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await beGreeted(user, 'Grace')

    // When the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor types "Alan" into the Name field
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Alan')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting reads "Hello, Alan"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Alan'), verbatim)
    // And the greeting log has exactly three entries, oldest first: "Ada", "Grace", "Alan"
    expectTheGreetingLogToRead('Ada', 'Grace', 'Alan')
    // And the greeting log's newest entry reads "Alan" — asserted in the same breath as the
    // greeting above, which is what pins "the current greeting is an entry".
    expectTheNewestEntryToRead('Alan')
  })

  // Scenario: Being greeted as the same name twice produces two entries. The log is a sequence,
  // not a set — no dedup rule exists to get wrong, and this is what says so.
  it('adds a second entry when the visitor is greeted as the same name twice', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" this visit
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')

    // When the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor types "Ada" into the Name field
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And the greeting log has exactly two entries, oldest first: "Ada", "Ada"
    expectTheGreetingLogToRead('Ada', 'Ada')
  })

  // Scenario: Tabs around a name are trimmed before the entry is added to the greeting log.
  // Tabs, not spaces: an implementation that strips only the space character would pass a
  // space-only scenario, so this is what pins "trimmed" to String.prototype.trim() semantics.
  it('trims tabs around the name before adding the entry to the greeting log', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)

    // When the visitor enters "\tAda\t" (tab, "Ada", tab) into the Name field. Pasted into the
    // focused field, because a literal Tab keystroke moves focus rather than inserting a
    // character — the behaviour under test is what the field contains, not how it got there.
    await user.tab()
    await user.paste('\tAda\t')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('\tAda\t')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And the greeting log has exactly one entry, oldest first: "Ada" — the entry text is
    // trimmed too, not just the greeting.
    expectTheGreetingLogToRead('Ada')
  })

  // Scenario: A blank submission does not add to the greeting log.
  it('adds nothing to the greeting log when a blank submission follows a greeting', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" this visit
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')

    // When the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting still reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
    // And the greeting log still has exactly one entry, oldest first: "Ada"
    expectTheGreetingLogToRead('Ada')
  })

  // Scenario: A whitespace-only submission does not add to the greeting log. Distinct from the
  // empty-field case above: an implementation that keyed the append off the raw field value
  // instead of the trimmed one would append a blank entry here and pass every other scenario.
  it('adds nothing to the greeting log when a whitespace-only submission follows a greeting', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" this visit
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')

    // When the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor enters "   " (three spaces) into the Name field
    await user.paste('   ')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('   ')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the greeting still reads "Hello, Ada"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)
    // And an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
    // And the greeting log still has exactly one entry, oldest first: "Ada"
    expectTheGreetingLogToRead('Ada')
  })

  // Scenario: A blank submission on an already-empty greeting log adds nothing. The one cell of
  // "blank x log state" the two scenarios above structurally cannot reach — both start from a
  // log that already has an entry. Without it, an implementation that created the clear control
  // the moment any submission was attempted, rather than the moment an entry actually landed,
  // would pass every other scenario in this issue.
  it('adds nothing when the first submission of the visit is blank', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)
    // And the greeting log is empty
    expectTheGreetingLogToBeEmpty()

    // When the visitor activates the submit control with an empty Name field
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then an alert reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
    // And the greeting log is empty
    expectTheGreetingLogToBeEmpty()
    // And the status region is present and contains no text
    expect(screen.getByRole('status')).toHaveTextContent('')
    // And the clear control is not present. In this slice that holds because no clear control
    // exists at all — a correct outside-in state, not a hole; the step bites in issue 02, where
    // a control that appears on any submission would fail here and nowhere else. Asserted twice
    // so it cannot be defeated by naming: under the po-proposed name (VH-01/04/05), and as
    // "the submit control is the only control on the screen", which holds whatever a clear
    // control ends up being called.
    expect(screen.queryByRole('button', { name: 'Clear the log' })).toBeNull()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Greet me'])
  })

  // ---------------------------------------------------------------------------------------
  // greeting-log issue 02 — Clear the greeting log. One acceptance test per Gherkin scenario,
  // every one driven through render(<GreetingScreen />) (design.md §5.1, ADR-0015).
  //
  // The named steps below are the Contract vocabulary's clear control and its activation,
  // written once: every scenario's "the clear control is present" / "is not present" means
  // exactly the query below and nothing looser — queryByRole, not getByRole, because absence is
  // half of what this issue asserts.
  // ---------------------------------------------------------------------------------------

  // The clear control's fixed accessible name (feature.md Contract vocabulary; po-proposed,
  // VH-01/04/05 — "Clear the list" is the alternative a human may confirm instead), copied from
  // the contract rather than imported from the component, for the same reason ALERT_TEXT above
  // is: a scenario that imported the constant would pass whatever the constant happened to say.
  const CLEAR_CONTROL_TEXT = 'Clear the log'
  const clearControl = () => screen.queryByRole('button', { name: CLEAR_CONTROL_TEXT })

  // Scenario: No clear control is present before the first greeting.
  it('shows no clear control before the first greeting', () => {
    // Given the visitor is on the greeting screen
    // And the visitor has not been greeted yet
    render(<GreetingScreen />)

    // Then the clear control is not present. Asserted twice, exactly as issue 01's last
    // scenario does: under the po-proposed name (VH-01/04/05), and as "the submit control is
    // the only control on the screen", which holds whatever the clear control ends up called.
    expect(clearControl()).toBeNull()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Greet me'])
  })

  // Scenario: The clear control appears once the greeting log has an entry.
  it('shows the clear control once the greeting log has an entry', async () => {
    const user = userEvent.setup()

    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)
    expect(clearControl()).toBeNull()

    // When the visitor types "Ada" into the Name field
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada')
    // And the visitor activates the submit control
    await user.click(screen.getByRole('button', { name: 'Greet me' }))

    // Then the clear control is present — and it is inside the greeting log region, which is
    // where the mockup's normative DOM sketch (§3) puts it: the control belongs to the thing it
    // acts on, so a visitor who lands on the log by landmark jump has it in reach.
    expect(clearControl()).toBeInTheDocument()
    expect(
      within(greetingLog()).getByRole('button', { name: CLEAR_CONTROL_TEXT }),
    ).toBeInTheDocument()
  })

  // "When the visitor activates the clear control" — the Contract vocabulary term, written once.
  // getByRole, not the queryByRole helper above: a scenario whose When could not happen must
  // fail loudly there, not quietly pass a Then further down. (Activation by keyboard — the other
  // half of the term, per native button semantics — is walked in the focus scenario below.)
  const activateTheClearControl = async (user: UserEvent) => {
    await user.click(screen.getByRole('button', { name: CLEAR_CONTROL_TEXT }))
  }

  // Scenario: Clearing empties the greeting log and removes the current greeting.
  it('empties the greeting log and removes the current greeting when cleared', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" and then "Hello, Grace" this visit
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await beGreeted(user, 'Grace')
    expectTheGreetingLogToRead('Ada', 'Grace')

    // When the visitor activates the clear control
    await activateTheClearControl(user)

    // Then the greeting log is empty — no list at all, and the empty message back in words
    expectTheGreetingLogToBeEmpty()
    // And the status region is present and contains no text: exactly the not-yet-greeted
    // appearance, never a second, different "cleared" message. getByRole, so a status region
    // that was removed instead of emptied fails here rather than passing as "no text".
    expect(screen.getByRole('status')).toHaveTextContent('')
    // And no greeting is left anywhere on the screen — the log and the status region are two
    // views of one fact, so clearing cannot leave "Hello, Grace" behind in either of them.
    expect(screen.queryByText('Hello, Grace')).toBeNull()
  })

  // Scenario: Clearing removes the clear control itself.
  it('removes the clear control when the greeting log is cleared', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" this visit
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    expect(clearControl()).toBeInTheDocument()

    // When the visitor activates the clear control
    await activateTheClearControl(user)

    // Then the clear control is not present — gone from the DOM, not left behind disabled:
    // there is nothing to clear, so there is no control whose empty activation would have to
    // be explained. Asserted twice, as in the first scenario, so it cannot be defeated by
    // renaming the control (VH-01/04/05).
    expect(clearControl()).toBeNull()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Greet me'])
  })

  // Scenario: Clearing does not touch the Name field. The field holds the visitor's draft, not a
  // greeting — "Grace" is deliberately a name that is in no log entry here, so what survives is
  // unambiguously the draft rather than a leftover greeting (mockup.html, Story 2 caption).
  it('leaves the Name field untouched when the greeting log is cleared', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" this visit
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    // And the visitor clears the Name field
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    // And the visitor types "Grace" into the Name field without submitting it
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Grace')
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)

    // When the visitor activates the clear control
    await activateTheClearControl(user)

    // Then the Name field still contains "Grace"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')
    // …and the clear really did happen, so this cannot pass vacuously against a control that
    // does nothing at all: the thing clearing *is* allowed to touch is empty.
    expectTheGreetingLogToBeEmpty()
  })

  // Scenario: Focus moves to the greeting log after clearing.
  //
  // Driven keyboard-only, because this scenario exists for the visitor who cannot see where
  // focus went. It walks the whole tab order on the way — Name field, "Greet me", "Clear the
  // log", three stops — which is also what pins the log region to tabIndex={-1} rather than 0:
  // the region sits between the status region and the clear control in document order, so if it
  // were a tab stop the third Tab would land on it and never reach the control. Activating with
  // Enter is the other half of "the visitor activates the clear control" under native button
  // semantics (Contract vocabulary), and it is how a visitor who just used the keyboard to get
  // there would really do it.
  it('moves focus to the greeting log after clearing', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" this visit
    render(<GreetingScreen />)
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
    await user.keyboard('Ada')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Greet me' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Ada'), verbatim)

    // When the visitor activates the clear control — the next tab stop after the submit control
    await user.tab()
    expect(clearControl()).toHaveFocus()
    await user.keyboard('{Enter}')

    // Then the greeting log has focus. Clearing destroys the control the visitor was standing
    // on, so focus has to land somewhere real: on the region that changed, which carries a name
    // ("Greeted this visit") and text ("You have not been greeted yet.") rather than emptiness.
    // Without the move, focus falls back to the document body and a visitor who cannot see the
    // screen is told nothing at all — an emptying live region announces nothing (VH-06: whether
    // an assistive technology speaks the region's contents on focus is the human half of this).
    expect(greetingLog()).toHaveFocus()
    expectTheGreetingLogToBeEmpty()
  })

  // Scenario: A greeting after clearing starts the greeting log again. Clearing is a one-time
  // action on the log's current contents, not a mode the screen gets stuck in: no "cleared" flag
  // may suppress further entries or keep the control hidden. After a clear the screen behaves
  // exactly as it did on first arrival, which is why this scenario reads like issue 01's first.
  it('starts the greeting log again when the visitor is greeted after clearing', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" this visit
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    // And the visitor activated the clear control
    await activateTheClearControl(user)
    expectTheGreetingLogToBeEmpty()

    // When the visitor types "Grace" into the Name field (the field still holds the draft "Ada"
    // that the Given typed — clearing never touches it — so it is emptied first, exactly as
    // every other scenario that types a second name does)
    // And the visitor activates the submit control
    await beGreeted(user, 'Grace')

    // Then the greeting reads "Hello, Grace"
    expect(screen.getByRole('status')).toHaveTextContent(exactly('Hello, Grace'), verbatim)
    // And the greeting log has exactly one entry, oldest first: "Grace" — one, not two: the
    // cleared entry does not come back, and the log restarts rather than resuming.
    expectTheGreetingLogToRead('Grace')
    // And the clear control is present
    expect(clearControl()).toBeInTheDocument()
  })

  // Scenario: Clearing does not dismiss a pending alert. The clear control is not a submission,
  // and `greet-visitor`'s rule — the alert stays until the visitor submits again — is unchanged
  // by this feature (VH-03): clearing acts on the log and the current greeting, and no more.
  it('leaves a pending alert on screen when the greeting log is cleared', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" this visit
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    // And the visitor has since submitted a blank Name field and sees the alert
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.click(screen.getByRole('button', { name: 'Greet me' }))
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
    expectTheGreetingLogToRead('Ada')

    // When the visitor activates the clear control
    await activateTheClearControl(user)

    // Then the greeting log is empty
    expectTheGreetingLogToBeEmpty()
    // And the status region is present and contains no text
    expect(screen.getByRole('status')).toHaveTextContent('')
    // And an alert still reads "Please enter your name."
    expect(screen.getByRole('alert')).toHaveTextContent(exactly(ALERT_TEXT), verbatim)
    // …still describing the field it belongs to, so clearing did not quietly break the
    // association and leave the message floating unattached beside an input.
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(ALERT_TEXT)
  })

  // ---------------------------------------------------------------------------------------
  // greeting-log issue 03 — A fresh visit starts with an empty log. One acceptance test per
  // Gherkin scenario, both driven through render(<GreetingScreen />) (design.md §5.1, ADR-0015).
  //
  // A guard slice by design (design.md §5.1, the same rule ADR-0007 set for `greet-visitor`
  // issue 04): the greeting log lives inside Visit, and Visit has lived in a component-local
  // useState since slice 01 (INV-6a), so both scenarios pass on their first run and no
  // production code is expected. That is what makes them worth writing, not what makes them
  // decoration — the guarantee is currently free, and nothing but these two tests would notice
  // the day it stops being. They were mutation-probed before this slice was committed: hoisting
  // `visit` out of the component into a module-level binding — the realistic regression, and the
  // shape a "keep the log across renders" optimisation would take — turns both of them red, and
  // red for the right reason. Each fails at its "the greeting log is empty" step with the
  // *previous* visit's entries still listed (`expected <ol><li>Ada</li><li>Grace</li></ol> to be
  // null`, and `<ol><li>Grace</li></ol>` for the after-a-clear scenario), which is precisely the
  // leak the issue names. Seventeen older tests go red with them, since module-level state also
  // leaks between tests — so it is the *reason* above, not the count, that says these two are
  // the ones pinning a fresh visit's log.
  //
  // The same red bar would follow from a store above the screen, a context, or a write to
  // localStorage/sessionStorage that satisfies issue 01's scenarios in isolation while leaking
  // across visits. The fix is always structural — put the log back inside
  // useState<Visit>(newVisit) — never clearing-on-mount layered over state that leaked.
  //
  // They reuse startAFreshVisit above rather than restating it, so this feature's fresh visit
  // and `greet-visitor`'s are literally the same act: unmount, then render again from the
  // initial state (the Fresh visit Contract vocabulary term). jsdom implements no navigation and
  // no reload, so real reload-survival in a browser stays a human check (`greet-visitor` VH-02),
  // unchanged by this feature. Nothing here re-tests the Name field, the greeting or the alert
  // on a fresh visit: those are `greet-visitor` issue 04's two guards, above, untouched.
  // ---------------------------------------------------------------------------------------

  // Scenario: A fresh visit starts with an empty greeting log.
  it('starts with an empty greeting log on a fresh visit', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" and then "Hello, Grace" this visit
    const { unmount } = render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await beGreeted(user, 'Grace')
    // Both things the fresh visit has to discard are asserted before it happens, so neither Then
    // below can pass against a visit that was already clean: the log really did hold two
    // entries, and the clear control really was on screen to be carried over.
    expectTheGreetingLogToRead('Ada', 'Grace')
    expect(clearControl()).toBeInTheDocument()

    // When the visitor starts a fresh visit
    startAFreshVisit(unmount)

    // Then the greeting log is empty — no list at all, and the empty message back in words. The
    // named step resolves the region with getByRole, so a log that failed to render on the
    // remount fails loudly here instead of passing as "no entries".
    expectTheGreetingLogToBeEmpty()
    // And the clear control is not present. Asserted twice, exactly as issue 01's and issue 02's
    // scenarios do: under the po-proposed name (VH-01/04/05), and as "the submit control is the
    // only control on the screen", which holds whatever the clear control ends up being called.
    expect(clearControl()).toBeNull()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Greet me'])
  })

  // Scenario: A fresh visit starts with an empty greeting log even after a clear in the previous
  // visit. Not a duplicate of the scenario above: the log this fresh visit must discard was
  // built *after* a clear, which is the one cell the first scenario structurally cannot reach.
  // An implementation that carried a "cleared" flag across visits, or that discarded only a log
  // the visitor had never cleared, passes above and fails here.
  it('starts with an empty greeting log on a fresh visit after a clear in the previous visit', async () => {
    const user = userEvent.setup()

    // Given the visitor has already been greeted "Hello, Ada" this visit
    const { unmount } = render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    // And the visitor activated the clear control
    await activateTheClearControl(user)
    expectTheGreetingLogToBeEmpty()
    // And the visitor was then greeted "Hello, Grace" this visit
    await beGreeted(user, 'Grace')
    // The Given again asserted in full before the fresh visit: one entry, and the control back.
    expectTheGreetingLogToRead('Grace')
    expect(clearControl()).toBeInTheDocument()

    // When the visitor starts a fresh visit
    startAFreshVisit(unmount)

    // Then the greeting log is empty
    expectTheGreetingLogToBeEmpty()
    // And the clear control is not present
    expect(clearControl()).toBeNull()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Greet me'])
  })
})
