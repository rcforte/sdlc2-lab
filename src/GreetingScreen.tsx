import { useState } from 'react'
import { greetingText, newVisit, submit, type Visit } from './visit'

const NAME_FIELD_ID = 'name'

export function GreetingScreen() {
  // Two component-local hooks, both dying at unmount: the visitor's draft (INV-6c) and the
  // visit itself (INV-6a). Neither may be hoisted — that is what makes a fresh visit clean
  // without any reset logic.
  const [rawName, setRawName] = useState<string>('')
  const [visit, setVisit] = useState<Visit>(newVisit)

  const greetVisitor = () => setVisit((current) => submit(current, rawName))

  return (
    <>
      <div>
        <label htmlFor={NAME_FIELD_ID}>Name</label>
        {/* INV-7: the field keeps exactly what the visitor typed; only the greeting is trimmed. */}
        <input
          id={NAME_FIELD_ID}
          type="text"
          value={rawName}
          onChange={(event) => setRawName(event.target.value)}
        />
      </div>
      {/* Plain button rather than a native <form>: VH-01 leaves that open and no scenario
          asserts Enter-to-submit either way. type="button" is harmless outside a form and
          essential if one is ever added. A focused native button still activates on Enter. */}
      <button type="button" onClick={greetVisitor}>
        Greet me
      </button>
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
