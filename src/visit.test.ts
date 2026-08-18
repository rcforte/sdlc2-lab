import { greetingText, newVisit, submit } from './visit'
import visitSource from './visit.ts?raw'

// INV-6b's "no ambient browser global" half is NOT implied by an empty import list: tsconfig
// puts DOM in `lib`, so `localStorage.setItem(...)` typechecks and runs inside a module that
// imports nothing. This lexical guard is what actually catches it (ADR-0008). It catches
// accident and drift, not a determined author — the rest is code review.
const source = visitSource
  .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
  .replace(/\/\/.*$/gm, '') // strip line comments

describe('Visit', () => {
  it('stays pure: no imports, no top-level mutable state, no ambient browser globals (INV-6b)', () => {
    expect(source).not.toMatch(/^\s*import\s/m)
    expect(source).not.toMatch(/^(let|var)\s/m) // column 0 => module level; locals are fine
    expect(source).not.toMatch(
      /\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|document|window|globalThis|navigator|Date|Math\.random)\b/,
    )
  })

  it('has no greeting text before anything is submitted (INV-3, P1)', () => {
    expect(greetingText(newVisit)).toBe('')
  })

  it('greets the submitted name (INV-3)', () => {
    expect(greetingText(submit(newVisit, 'Ada'))).toBe('Hello, Ada')
  })

  // INV-2 (trimmed half) / VH-08: "trimmed" is String.prototype.trim() semantics — all
  // leading and trailing JavaScript whitespace, not the space character alone.
  it('greets the trimmed name (INV-2)', () => {
    expect(greetingText(submit(newVisit, ' Ada '))).toBe('Hello, Ada')
    expect(greetingText(submit(newVisit, '\tAda\t'))).toBe('Hello, Ada')
  })

  // R9 / INV-8a: without this the aggregate cannot tell a second identical submit from no
  // submit at all, the rendered text never changes, and the live region stays silent on the
  // visitor's second click. The count is identity, never a quantity to display.
  it('counts every greeting, so an identical resubmit is still a new greeting (INV-8a)', () => {
    const once = submit(newVisit, 'Ada')
    const twice = submit(once, 'Ada')

    expect(greetingText(twice)).toBe('Hello, Ada') // same text …
    expect(twice.greetingCount).toBe(2) // … different value
  })
})
