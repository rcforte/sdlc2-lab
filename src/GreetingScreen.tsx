import { useState, type FormEvent } from 'react'
import {
  alertText,
  greetingText,
  newVisit,
  NOTHING_SAVED_MESSAGE,
  refusalText,
  save,
  savedNamesHintText,
  submit,
  type Visit,
} from './visit'

const NAME_FIELD_ID = 'name'
const ALERT_ID = 'name-error'
const SAVED_NAMES_HEADING_ID = 'saved-names-heading'
const SAVED_NAMES_HINT_ID = 'saved-names-hint'

export function GreetingScreen() {
  // Two component-local hooks, both dying at unmount: the visitor's draft (INV-6c) and the
  // visit itself (INV-6a). Neither may be hoisted — that is what makes a fresh visit clean
  // without any reset logic, and it is the whole of INV-24: the saved names are fields of the
  // visit, so they end when this mount does.
  const [rawName, setRawName] = useState<string>('')
  const [visit, setVisit] = useState<Visit>(newVisit)

  // Handles both routes into a submission: activating the button, and pressing Enter with
  // focus in the Name field (VH-01, human-confirmed). preventDefault stops the native
  // navigation a form submission would otherwise cause.
  const greetVisitor = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setVisit((current) => submit(current, rawName))
  }

  // The domain decides whether there is a message and what it says (INV-5b); this component
  // decides only whether an element exists (P2) and what it is linked to (P10). Both read this
  // one expression, so they cannot disagree.
  const alert = alertText(visit)

  // The saved names as one sentence, or null when nothing is saved (INV-25). The hint element's
  // existence (P20) and the field's description (P10) both read this one expression, so the
  // element and the reference to it cannot disagree.
  const savedNamesHint = savedNamesHintText(visit)

  // Why the last save attempt added nothing, in the words the domain owns (INV-26), or null when
  // it added a name. P14 decides only whether an element exists.
  const refusal = refusalText(visit)

  // P10 (supersedes P3): everything describing the field, in the order it is read. The error
  // about the submission just made outranks a standing piece of context, so the alert's id comes
  // first; ids of elements that are not on screen never join the list. The refusal is
  // deliberately absent from this list — it is about the list, not about what was typed, so it
  // lives in the region and never describes the Name field (seed, Decisions).
  const fieldDescription = [
    alert !== null ? ALERT_ID : null,
    savedNamesHint !== null ? SAVED_NAMES_HINT_ID : null,
  ]
    .filter((id): id is string => id !== null)
    .join(' ')

  return (
    <>
      {/* A native <form> so that Enter in the Name field submits, which is what a visitor
          expects of a single-field screen (VH-01, human-confirmed in VH-15). The status
          region sits outside it: it is the outcome of a submission, not an input to one. */}
      <form onSubmit={greetVisitor}>
        <div>
          <label htmlFor={NAME_FIELD_ID}>Name</label>
          {/* INV-7: the field keeps exactly what the visitor typed; only the greeting is trimmed. */}
          <input
            id={NAME_FIELD_ID}
            type="text"
            value={rawName}
            onChange={(event) => setRawName(event.target.value)}
            // undefined removes the attribute entirely rather than emptying it, so the field is
            // never described by an element that is not on screen — and an empty
            // aria-describedby would itself be a dangling reference.
            aria-describedby={fieldDescription === '' ? undefined : fieldDescription}
          />
          {/* P2: the alert exists only while there is an error — unlike the status region, it is
              absent from the DOM otherwise. It sits beside the field it describes, and carries its
              meaning in words alone: no colour, no icon, nothing a greyscale or forced-colours
              visitor would lose (VH-07). P5: the text sits in one child keyed by blankCount, so
              failing the same way twice replaces that node and the alert fires again instead of
              falling silent, while the <p> keeps the id aria-describedby points at. No aria-live
              here — role="alert" is already a live region, and both would double-announce. */}
          {alert !== null && (
            <p role="alert" id={ALERT_ID}>
              <span key={visit.blankCount}>{alert}</span>
            </p>
          )}
          {/* P20: the reminder of every saved name, beside the field where the retyping would
              otherwise happen. Visible text — never an aria-label or a visually-hidden node —
              because a sighted visitor is meant to read it too, and never a placeholder, which
              would vanish on the first keystroke and fight the field's own content. */}
          {savedNamesHint !== null && <p id={SAVED_NAMES_HINT_ID}>{savedNamesHint}</p>}
        </div>
        <button type="submit">Greet me</button>
      </form>
      {/* P1: rendered on every render from first mount, so the live region is observed before
          its text arrives and is therefore reliably announced (VH-04). P4: the text sits in one
          child keyed by greetingCount, so a repeat submission of the same name replaces that
          node and re-announces instead of falling silent (R9 / VH-09; announcement itself is a
          human check, VH-10, so no test here can see this). */}
      <p role="status" aria-live="polite">
        <span key={visit.greetingCount}>{greetingText(visit)}</span>
      </p>
      {/* P13: the Saved names region, after the status region and rendered on every render from
          first mount, so the live region is observed before its text arrives (the VH-04 lesson,
          applied to a second region). A named <section> has the implicit role "region", and the
          name comes from the visible heading via aria-labelledby, so the heading a visitor reads
          and the name assistive technology announces are one DOM node that cannot drift. It
          carries aria-live="polite" and deliberately never role="status": that role is the
          greeting's alone, and a second one would make every bare getByRole('status') above
          ambiguous (VH-04, ADR-0022). */}
      <section aria-labelledby={SAVED_NAMES_HEADING_ID} aria-live="polite">
        <h2 id={SAVED_NAMES_HEADING_ID}>Saved names</h2>
        {/* P14: why the last save added nothing, between the heading and the rows. The key is
            read from the aggregate rather than computed here: it is what makes the same refusal
            twice a new DOM node, so the live region speaks again instead of falling silent
            (ADR-0030; announcement itself is a human check, VH-04(b)). */}
        {refusal !== null && <p key={visit.savedNamesRevision}>{refusal}</p>}
        {/* P15: either the empty state or the rows, never both and never neither. key={name} is
            legitimate because INV-17 forbids duplicates, so appending leaves every existing
            row's DOM nodes — and the focus inside them, once issues 02 and 03 add controls —
            exactly where they were. The empty-state words are read from the domain's constant;
            this component never types either message. */}
        {visit.savedNames.length === 0 ? (
          <p>{NOTHING_SAVED_MESSAGE}</p>
        ) : (
          <ul>
            {visit.savedNames.map((name) => (
              // A row is name text only for now. Its two controls — "Greet me again as <name>"
              // and "Remove <name>" — are issues 02 and 03, and P16 gives the order they arrive
              // in (issue 01, Story).
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
        {/* P17: the affordance for INV-18 — there is nothing to save until there has been a
            greeting, so the control is absent from the DOM rather than rendered disabled. A
            disabled button is unfocusable and explains nothing about why it cannot be used. The
            list being full is deliberately not part of this condition: the refusal teaches the
            limit, a vanishing button teaches nothing (seed, Decisions). */}
        {visit.greetedName !== null && (
          // P12: type="button" and outside the <form>, so activating it is a save and never a
          // submission; and it sits outside every keyed node above, so React reuses this same DOM
          // node across a save and the visitor's focus survives its own click.
          <button type="button" onClick={() => setVisit(save)}>
            Save this name
          </button>
        )}
      </section>
    </>
  )
}
