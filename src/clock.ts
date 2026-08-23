/**
 * The one module in this application that reads the clock or turns an instant into wall-clock
 * text — the impurity `src/visit.ts` refuses to hold (ADR-0036, ADR-0037).
 *
 * Three rules keep it from becoming a junk drawer: it holds only what needs the current time or
 * a calendar; it imports nothing from `src/visit.ts` (which imports nothing at all, so the two
 * can never meet); and it is imported directly rather than injected — a port with one
 * implementation and one fake is the abstraction ADR-0006 refused.
 */

/**
 * How often the screen re-reads the clock, so the age readings on it stay true while the visitor
 * does nothing.
 *
 * Known coupling, stated rather than engineered away: the product rule is "at least once every
 * 60 seconds" and nothing enforces that this number satisfies it. Any value <= 60_000 does;
 * 15 s is chosen so a reading is never more than 15 s stale (design.md N17).
 */
export const TICK_MS = 15_000

/**
 * The one clock read in the application. Everything downstream — every age reading, every stable
 * absolute time — is a pure function of its result, which is what keeps the domain deterministic
 * without a clock port to fake (ADR-0036).
 */
export function nowMs(): number {
  return Date.now()
}

/**
 * The stable absolute time: the instant as the visitor's own local wall clock, 24-hour and
 * zero-padded — `14:20`, `09:05`, `00:00`. A time of day and never a date (seed, Out of scope).
 *
 * It lives here rather than beside the other visitor-facing words in `src/visit.ts`, and that is
 * the one exception to ADR-0003 this feature makes: turning an instant into a *local* time needs
 * a calendar, and a calendar is `Date`. Doing it with arithmetic on epoch milliseconds would
 * produce UTC — the wrong time for every visitor not on Greenwich, on a row whose whole job is
 * to say when (ADR-0037).
 *
 * No `toLocaleTimeString`: one fixed format, no locale, no timezone handling (seed, Out of
 * scope), so every row in every visit reads the same shape.
 */
export function clockTimeText(instant: number): string {
  const at = new Date(instant)
  return `${twoDigits(at.getHours())}:${twoDigits(at.getMinutes())}`
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}
