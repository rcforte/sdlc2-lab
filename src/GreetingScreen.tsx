import { useState, type FormEvent } from 'react'
import { alertText, greetingText, newVisit, submit, type Visit } from './visit'

const NAME_FIELD_ID = 'name'
const ALERT_ID = 'name-error'

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
  // decides only whether an element exists (P2) and what it is linked to (P3). Both read this
  // one expression, so they cannot disagree.
  const alert = alertText(visit)

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
            // P3: undefined removes the attribute entirely rather than emptying it, so the field
            // is never described by an alert that is not on screen.
            aria-describedby={alert !== null ? ALERT_ID : undefined}
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
    </>
  )
}
