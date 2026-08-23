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

  // The rows of the Saved names region, in the order they appear on screen. Read through the
  // region on every call rather than held in a variable, because saving replaces nodes. Rows are
  // asserted by index (order) and by substring or scoped query (contents), never by an anchored
  // regex: a row's own controls join its text content in issues 02 and 03 (design.md §5.4).
  const rowsInTheSavedNamesRegion = (): HTMLElement[] =>
    within(screen.getByRole('region', { name: SAVED_NAMES_REGION })).queryAllByRole('listitem')

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
  // Removing a saved name (issue 03). Lifting the single-slot limit took away the old escape
  // hatch — replacing — so without removal a name saved by mistake would sit on screen for the
  // rest of the visit, next to its own greet-again control. These scenarios are issue 03's
  // Gherkin, one test each.
  //
  // Rows are asserted by index (order) and by substring or scoped query (contents), never by an
  // anchored regex: a row's own controls join its text content, so a row reads
  // "AdaRemove Ada" (design.md §5.4).
  // ---------------------------------------------------------------------------------------

  // Given the visitor has saved "<name>", … in that order. Saving is the only route a visitor
  // has into the list, so each name is greeted and then saved, and the step asserts the list it
  // claims to have built really arrived — no scenario below can pass from a Given that silently
  // did not happen.
  const saveNamesInOrder = async (user: UserEvent, ...names: string[]) => {
    for (const name of names) {
      await beGreeted(user, name)
      await saveTheGreetedName(user, name)
    }
    expect(rowsInTheSavedNamesRegion()).toHaveLength(names.length)
  }

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
  // A fresh visit starts with nothing saved. Carried forward from the merged single-slot
  // saved-name issue 05 and rewritten here for the region's new copy and its rows (design.md
  // §4.3); remembered-names issue 07 replaces this pair with its own three scenarios.
  //
  // Guard scenarios (design.md §5.1, ADR-0026): the saved names live in the one useState inside
  // this component, so nothing survives a remount and there is no reset logic to get wrong. They
  // are not decoration — they go red the moment that state is lifted out of the component (a
  // module-level let, a context, a store), which is the realistic regression here, and the fix
  // for a red bar is structural: put the state back, never add reset-on-mount logic on top of
  // state that leaked.
  //
  // Each Given is asserted in full before the fresh visit, so no Then below can pass against a
  // screen that was already clean — an absence is only evidence when the thing was there first.
  // ---------------------------------------------------------------------------------------

  it('starts with nothing saved on a fresh visit after saving', async () => {
    const user = userEvent.setup()

    // Given the visitor saved "Ada" during a visit
    const { unmount } = render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    // …and that visit really did reach the state whose absence is asserted below: a row for the
    // saved name, the saved name at the field, and the save control on screen.
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Saved: Ada')
    const previousVisit = screen.getByRole('region', { name: SAVED_NAMES_REGION })
    expect(within(previousVisit).getAllByRole('listitem')).toHaveLength(1)
    expect(within(previousVisit).getByRole('button', { name: SAVE_CONTROL })).toBeVisible()

    // When the visitor starts a fresh visit
    startAFreshVisit(unmount)

    // Then the Saved names region reads "No names saved yet."
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      NOTHING_SAVED_TEXT,
    )
    // …and the previous visit's name is nowhere on the screen. Page-wide, because it had two
    // homes — its row and the hint — and a visitor must not meet either one again.
    expect(screen.queryByText('Ada')).toBeNull()
    expect(screen.queryByText('Saved: Ada')).toBeNull()
    // And no row is present at all
    expect(rowsInTheSavedNamesRegion()).toHaveLength(0)
    // And no button named "Save this name" is present
    expect(screen.queryByRole('button', { name: SAVE_CONTROL })).toBeNull()
    // And the Name field has no accessible description
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('')
    // …with the attribute absent rather than emptied, exactly as on the very first arrival: an
    // empty aria-describedby is a dangling reference, not the same thing as nothing to say.
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('aria-describedby')
  })

  // The merged pair's second scenario set its Given with the fixed-name "Greet me again" control,
  // which this slice retires (design.md P18, VH-05). Its Given becomes the one thing this slice
  // added that the single slot could not hold — a list of two — which is also the state issue
  // 07's own first scenario starts from.
  it('starts with nothing saved on a fresh visit after saving more than one name', async () => {
    const user = userEvent.setup()

    // Given the visitor saved "Ada" and "Bob" during a visit
    const { unmount } = render(<GreetingScreen />)
    await beGreeted(user, 'Ada')
    await saveTheGreetedName(user, 'Ada')
    await beGreeted(user, 'Bob')
    await saveTheGreetedName(user, 'Bob')
    expect(rowsInTheSavedNamesRegion()).toHaveLength(2)

    // When the visitor starts a fresh visit
    startAFreshVisit(unmount)

    // Then the Saved names region reads "No names saved yet."
    expect(screen.getByRole('region', { name: SAVED_NAMES_REGION })).toHaveTextContent(
      NOTHING_SAVED_TEXT,
    )
    // And neither saved name is anywhere on the screen: a list that survived a fresh visit
    // partially would be worse than one that survived whole, so both are asserted page-wide.
    expect(screen.queryByText('Ada')).toBeNull()
    expect(screen.queryByText('Bob')).toBeNull()
    expect(screen.queryByText('Saved: Ada, Bob')).toBeNull()
    // And the status region is present and contains no text — getByRole, not queryByRole, so a
    // region that vanished on the remount fails loudly here instead of passing as "no text".
    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})