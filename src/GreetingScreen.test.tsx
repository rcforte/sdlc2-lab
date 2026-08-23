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

// The saved-name feature's own literals, copied from issue 01's Gherkin for the same reason: a
// scenario that imported NOTHING_SAVED_MESSAGE would pass whatever that constant happened to say.
const SAVED_NAME_REGION = 'Saved name'
const NOTHING_SAVED_TEXT = 'No name saved yet.'
const SAVE_CONTROL = 'Save this name'

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

    // Every path that mutates the visit: a greeting, a blank rejection, and a correction.
    const nameField = () => screen.getByRole('textbox', { name: 'Name' })
    const submitControl = () => screen.getByRole('button', { name: 'Greet me' })
    await user.type(nameField(), 'Ada')
    await user.click(submitControl())
    await user.clear(nameField())
    await user.click(submitControl())
    await user.type(nameField(), 'Grace')
    await user.click(submitControl())

    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)

    setItem.mockRestore()
  })

  // ---------------------------------------------------------------------------------------
  // saved-name issue 01 — Save the name I was greeted as. One acceptance test per Gherkin
  // scenario, driven through the declared frontend seam (RTL + user-event via Vitest/jsdom).
  //
  // The region's text is asserted as a substring, never with an anchored regex: the visible
  // <h2>Saved name</h2> that gives the region its accessible name is part of its textContent
  // (design.md §5.4). Where a scenario says a phrase is "no longer shown", the assertion is the
  // page-wide queryByText, which is both stronger and unambiguous.
  // ---------------------------------------------------------------------------------------

  it('shows an empty Saved name region, after the status region, before any greeting', () => {
    // Given the visitor is on the greeting screen
    // And the visitor has not been greeted yet
    render(<GreetingScreen />)

    // Then the Saved name region is present
    const region = screen.getByRole('region', { name: SAVED_NAME_REGION })
    // And the Saved name region appears after the status region in the page
    const status = screen.getByRole('status')
    expect(status.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // And the Saved name region reads "No name saved yet."
    expect(region).toHaveTextContent(NOTHING_SAVED_TEXT)
    // And the Saved name region has the attribute aria-live="polite"
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

    // Then a button named "Save this name" is present inside the Saved name region
    const region = screen.getByRole('region', { name: SAVED_NAME_REGION })
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

  // And has saved "<name>"
  const saveTheGreetedName = async (user: UserEvent, name: string) => {
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))
    expect(screen.getByRole('region', { name: SAVED_NAME_REGION })).toHaveTextContent(
      `Saved: ${name}`,
    )
  }

  it('saves the name the visitor was just greeted as', async () => {
    const user = userEvent.setup()

    // Given the visitor has been greeted "Hello, Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Saved name region reads "Saved: Ada"
    const region = screen.getByRole('region', { name: SAVED_NAME_REGION })
    expect(region).toHaveTextContent('Saved: Ada')
    // And "No name saved yet." is no longer shown — asserted page-wide, which is stronger than
    // scoping it to the region and is how the empty state's disappearance is meant to read.
    expect(screen.queryByText(NOTHING_SAVED_TEXT)).toBeNull()
    // And the Saved name region still has the attribute aria-live="polite"
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  // The save control survives its own activation: it is not inside the keyed child that the save
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
  // greeting and the draft deliberately disagree here, so "Saved: Grace" is the defect it exists
  // to catch — a visitor could otherwise save a name they were never greeted as.
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

    // Then the Saved name region reads "Saved: Ada"
    expect(screen.getByRole('region', { name: SAVED_NAME_REGION })).toHaveTextContent('Saved: Ada')
    expect(screen.queryByText('Saved: Grace')).toBeNull()
    // And the Name field still contains "Grace"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace')
  })

  it('leaves the saved name alone when a submission is blank', async () => {
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
    // And the Saved name region still reads "Saved: Ada"
    expect(screen.getByRole('region', { name: SAVED_NAME_REGION })).toHaveTextContent('Saved: Ada')
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
  it('still greets from the Name field when Enter is pressed, and does not resave', async () => {
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
    // And the Saved name region still reads "Saved: Ada" — being greeted is not choosing.
    expect(screen.getByRole('region', { name: SAVED_NAME_REGION })).toHaveTextContent('Saved: Ada')
    expect(screen.queryByText('Saved: Grace')).toBeNull()
  })

  // ---------------------------------------------------------------------------------------
  // saved-name issue 03 — Be reminded of the saved name at the Name field. One acceptance test
  // per Gherkin scenario, driven through the declared frontend seam (RTL + user-event via
  // Vitest/jsdom).
  //
  // The hint is asserted through the field's *accessible description*, not by text: the Saved
  // name region shows the same "Saved: Ada" string (they are one fact shown twice), so a
  // page-wide by-text query would match two nodes and prove nothing about the field.
  // ---------------------------------------------------------------------------------------

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

  it('leaves the Name field undescribed while nothing is saved', () => {
    // Given the visitor is on the greeting screen
    render(<GreetingScreen />)
    // And the visitor has not saved a name
    expect(screen.getByRole('region', { name: SAVED_NAME_REGION })).toHaveTextContent(
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
    // association rather than by its text, because the Saved name region reads "Saved: Ada"
    // too. A visually-hidden node would satisfy the description above and show a sighted
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

  it('updates the hint when the saved name is replaced', async () => {
    const user = userEvent.setup()

    // Given the visitor saved "Ada"
    render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')

    // And the visitor has since been greeted "Hello, Grace" — being greeted is not saving, so
    // the hint still reads the saved name and not the name on screen. This step is what fails an
    // implementation that shows the greeting at the field instead of the saved name.
    await beGreeted(user, 'Grace')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Saved: Ada')

    // When the visitor activates "Save this name"
    await user.click(screen.getByRole('button', { name: SAVE_CONTROL }))

    // Then the Name field has the accessible description "Saved: Grace"
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Saved: Grace',
    )
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
})
