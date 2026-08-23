import { clockTimeText } from './clock'

// design.md §5.3. The stable absolute time's format is fixed by architecture rather than by a
// scenario — no acceptance criterion pins a string for it (feature.md, Out of scope), and a
// format nobody has written down is a format that drifts. So it gets one file that says what it
// is. Its wording and its 24-hour choice are still a human check (VH-01).
//
// nowMs is deliberately untested: a test for it could only restate Date.now().
describe('the stable absolute time', () => {
  // Built from parts rather than parsed from an ISO string, so these assert the *local* wall
  // clock a visitor's browser would show, in any timezone this suite runs in. Parsing
  // '2026-08-23T14:20:00Z' would make them pass only on Greenwich.
  const at = (hours: number, minutes: number) => new Date(2026, 7, 23, hours, minutes).getTime()

  it('reads an instant as the local wall clock, 24-hour', () => {
    expect(clockTimeText(at(14, 20))).toBe('14:20')
  })

  it('zero-pads a single-digit hour and minute, so every row reads the same width', () => {
    expect(clockTimeText(at(9, 5))).toBe('09:05')
  })

  // The two ends of the day, where a 12-hour or unpadded format would show its seams — and where
  // a format that leaked a date would be caught, since a date is what "no absolute dates on
  // screen" forbids.
  it('reads midnight as 00:00 and the last minute of the day as 23:59, and tells no date', () => {
    expect(clockTimeText(at(0, 0))).toBe('00:00')
    expect(clockTimeText(at(23, 59))).toBe('23:59')
  })
})
