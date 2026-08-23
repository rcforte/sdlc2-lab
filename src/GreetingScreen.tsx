import { useState, type FormEvent } from 'react'
import {
  alertText,
  greetingText,
  newVisit,
  save,
  savedNameRegionText,
  savedNameText,
  submit,
  type Visit,
} from './visit'

const NAME_FIELD_ID = 'name'
const ALERT_ID = 'name-error'
const SAVED_NAME_HEADING_ID = 'saved-name-heading'
const SAVED_NAME_HINT_ID = 'saved-name-hint'

export function GreetingScreen() {
  // Two component-local hooks, both dying at unmount: the visitor's draft (INV-6c) and the
  // visit itself (INV-6a). Neither may be hoisted — that is what makes a fresh visit clean
  // without any reset logic.
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

  // The saved name as words, or null when there is nothing saved (INV-15). The hint element's
  // existence (P9) and the field's description (P10) both read this one expression, so the
  // element and the reference to it cannot disagree.
  const savedNameHint = savedNameText(visit)

  // P10 (supersedes P3): everything describing the field, in the order it is read. The error
  // about the submission just made outranks a standing piece of context, so the alert's id comes
  // first; ids of elements that are not on screen never join the list.
  const fieldDescription = [
    alert !== null ? ALERT_ID : null,
    savedNameHint !== null ? SAVED_NAME_HINT_ID : null,
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
          {/* P9: the reminder of the saved name, beside the field where the retyping would
              otherwise happen. Visible text — never an aria-label or a visually-hidden node —
              because a sighted visitor is meant to read it too, and never a placeholder, which
              would vanish on the first keystroke and fight the field's own content. */}
          {savedNameHint !== null && <p id={SAVED_NAME_HINT_ID}>{savedNameHint}</p>}
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
      {/* P7: the Saved name region, after the status region and rendered on every render from
          first mount, so the live region is observed before its text arrives (the VH-04 lesson,
          applied to a second region). A named <section> has the implicit role "region", and the
          name comes from the visible heading via aria-labelledby, so the heading a visitor reads
          and the name assistive technology announces are one DOM node that cannot drift. It
          carries aria-live="polite" and deliberately never role="status": that role is the
          greeting's alone, and a second one would make every bare getByRole('status') above
          ambiguous (VH-02, ADR-0022). */}
      <section aria-labelledby={SAVED_NAME_HEADING_ID} aria-live="polite">
        <h2 id={SAVED_NAME_HEADING_ID}>Saved name</h2>
        {/* P8: the words sit in one child keyed by saveCount, so saving the same name a second
            time still replaces that node and the live region announces again instead of falling
            silent, while the <section> and its <h2> keep their identity (ADR-0023; announcement
            itself is a human check, VH-02, so no test here can see it). */}
        <p>
          <span key={visit.saveCount}>{savedNameRegionText(visit)}</span>
        </p>
        {/* P6: the affordance for INV-10 — there is nothing to save until there has been a
            greeting, so the control is absent from the DOM rather than rendered disabled. A
            disabled button is unfocusable and explains nothing about why it cannot be used. */}
        {visit.greetedName !== null && (
          // P12: type="button" and outside the <form>, so activating it is a save and never a
          // submission; and it sits outside the keyed child above, so React reuses this same DOM
          // node across a save and the visitor's focus survives its own click.
          <button type="button" onClick={() => setVisit(save)}>
            Save this name
          </button>
        )}
      </section>
    </>
  )
}
