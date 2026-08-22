import { useRef, useState, type FormEvent } from 'react'
import { alertText, clear, greetingText, isLogEmpty, newVisit, submit, type Visit } from './visit'

const NAME_FIELD_ID = 'name'
const ALERT_ID = 'name-error'
const LOG_HEADING_ID = 'greeting-log-heading'

// Screen furniture, not an outcome of a domain rule, so it lives here rather than in the domain
// module — the same split ADR-0003 already draws for the alert copy and the "Hello, " prefix.
// One production edit site each, so confirmed copy moves in one place (design.md §2.5).
const LOG_HEADING = 'Greeted this visit'
const EMPTY_LOG_MESSAGE = 'You have not been greeted yet.'
// po-proposed, unconfirmed (VH-01, VH-04, VH-05): "Clear the list" is the alternative a human
// may confirm instead. Nothing but this one const and the string in the tests moves either way.
const CLEAR_CONTROL_LABEL = 'Clear the log'

export function GreetingScreen() {
  // Two component-local hooks, both dying at unmount: the visitor's draft (INV-6c) and the
  // visit itself (INV-6a). Neither may be hoisted — that is what makes a fresh visit clean
  // without any reset logic.
  const [rawName, setRawName] = useState<string>('')
  const [visit, setVisit] = useState<Visit>(newVisit)
  // The one imperative handle on this screen, and it has exactly one user: the clear handler
  // below (P11). Clearing destroys the control the visitor was standing on, and focus has to be
  // put somewhere deliberately or it falls back to the document body.
  const logRegion = useRef<HTMLElement | null>(null)

  // Handles both routes into a submission: activating the button, and pressing Enter with
  // focus in the Name field (VH-01, human-confirmed). preventDefault stops the native
  // navigation a form submission would otherwise cause.
  const greetVisitor = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setVisit((current) => submit(current, rawName))
  }

  // The visit's second transition, and the only one that is not a submission: it empties the
  // log and takes the current greeting with it (INV-9b), leaving the pending alert and the
  // visitor's draft exactly where they were — the domain carries that guarantee, not this
  // handler (INV-11, VH-03).
  const clearTheLog = () => {
    setVisit(clear)
    // R17/P11: move focus to the region that changed — not a useEffect, because the region is
    // rendered unconditionally (P6) and so is already mounted and survives this update. The
    // status region emptying announces nothing, so this move is the whole of the visitor's
    // feedback for clearing (ADR-0014).
    logRegion.current?.focus()
  }

  // The domain decides whether there is a message and what it says (INV-5b); this component
  // decides only whether an element exists (P2) and what it is linked to (P3). Both read this
  // one expression, so they cannot disagree.
  const alert = alertText(visit)

  // INV-12: the domain decides emptiness, this component only decides which shape exists (P7)
  // and whether there is a control for emptying it (P8). Two DOM decisions, one predicate, read
  // once — so "the log says it is empty" and "there is something to clear" can never disagree.
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
          tabIndex={-1} makes the region focusable programmatically without making it a tab stop:
          -1, never 0 — the visitor is *put* here after clearing (P11) and must not have to tab
          through a container on the way to the controls. Without it, .focus() is a silent no-op.
          className="greeting-log" carries no behaviour and no test: it is the mockup's own
          selector, and the attach point for the visible :focus indicator that a sighted keyboard
          visitor needs to see this move land. That CSS rule is written out in mockup.html §5 and
          owned by frontend-design / the human gate, not by this behaviour slice (P12, VH-08,
          ADR-0017) — this repo ships no stylesheet, and the test seam cannot see one. */}
      <section
        ref={logRegion}
        className="greeting-log"
        tabIndex={-1}
        aria-labelledby={LOG_HEADING_ID}
      >
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
        {/* P8: the clear control exists iff the log is non-empty — absent from the DOM, never
            disabled, so there is no empty activation whose silence has to be explained. It reads
            the *same* const as the shape above, so which shape is on screen and whether there is
            anything to clear can never disagree (INV-12's two readers). type="button" is
            load-bearing: the default is "submit", and this button sits in the same document as
            the form, so an untyped one would greet instead of clearing. */}
        {!logIsEmpty && (
          <button type="button" onClick={clearTheLog}>
            {CLEAR_CONTROL_LABEL}
          </button>
        )}
      </section>
    </>
  )
}
