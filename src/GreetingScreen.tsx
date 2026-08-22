import { useState, type FormEvent } from 'react'
import { alertText, greetingText, isLogEmpty, newVisit, submit, type Visit } from './visit'

const NAME_FIELD_ID = 'name'
const ALERT_ID = 'name-error'
const LOG_HEADING_ID = 'greeting-log-heading'

// Screen furniture, not an outcome of a domain rule, so it lives here rather than in the domain
// module — the same split ADR-0003 already draws for the alert copy and the "Hello, " prefix.
// One production edit site each, so confirmed copy moves in one place (design.md §2.5).
const LOG_HEADING = 'Greeted this visit'
const EMPTY_LOG_MESSAGE = 'You have not been greeted yet.'

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

  // INV-12: the domain decides emptiness, this component only decides which shape exists (P7).
  // From slice 02 the clear control reads the same const (P8), so the two can never disagree.
  const logIsEmpty = isLogEmpty(visit)

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
          child keyed by the log's length, so a repeat submission of the same name replaces that
          node and re-announces instead of falling silent (R9 / VH-09; announcement itself is a
          human check, VH-10, so no test here can see this). The length is the ledger's own count
          of successful submissions — the same identity the deleted greetingCount carried, with no
          second source of truth to drift (P4′, ADR-0011). */}
      <p role="status" aria-live="polite">
        <span key={visit.greetingLog.length}>{greetingText(visit)}</span>
      </p>
      {/* P6/P10: the greeting log region — rendered from the first render and never removed, so
          it is a stable landmark rather than something that materialises mid-visit, and it is the
          next sibling after the status region, which is the DOM-observable half of the seed's
          "below the greeting" (sequential reading order; visual position is out of scope). It
          carries no aria-live and no role="status": the status region already announces every
          greeting, and a second live region would double-announce it (VH-02) — a constraint
          carried as prose and a human check, never as a DOM assertion. The accessible name comes
          from the visible <h2> via aria-labelledby, not an aria-label: without it a <section> is
          exposed as a generic container rather than a region, and the same element has to answer
          both the region query and the heading query.
          Two attributes this region will grow are deliberately not here yet, because nothing in
          this slice fails without them: tabIndex={-1} (only load-bearing for slice 02's focus
          move, R17/P11, which is where the test that fails without it lives) and
          className="greeting-log" (the styling hook for that focus indicator, P12/VH-08, which
          design.md §5.1 already assigns to slice 02). */}
      <section aria-labelledby={LOG_HEADING_ID}>
        <h2 id={LOG_HEADING_ID}>{LOG_HEADING}</h2>
        {/* P7: exactly one of two shapes, chosen by one ternary — never two independent &&
            conditionals, which is what would let the empty message and a list of entries appear
            at the same time. P9: one <li> per entry, in array order (so DOM order *is* oldest
            first, with no sort key anywhere), holding the entry alone — never the full
            "Hello, <name>" sentence and never a count. Index keys are correct here and only
            here: the log is append-only, never reordered, never individually removed
            (ADR-0012). */}
        {logIsEmpty ? (
          <p>{EMPTY_LOG_MESSAGE}</p>
        ) : (
          <ol>
            {visit.greetingLog.map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}
