import { describe, expect, it } from 'vitest'

import { formatTimestamp } from '@/lib/format'

describe('formatTimestamp', () => {
  it('renders date and 24h time parts with Western digits', () => {
    // Arrange
    const value = '2026-09-09T13:45:07.000Z'
    // ar-EG interleaves invisible RTL marks (U+200E/U+200F) between the parts;
    // strip them so the assertion checks the shape and digit system, not bidi
    // punctuation, and stays independent of the runtime timezone.
    const stripMarks = (text: string) => text.replace(/[‎‏]/g, '')

    // Act
    const { date, time } = formatTimestamp(value)

    // Assert
    expect(stripMarks(date)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(stripMarks(time)).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    // No Arabic-Indic digits (٠-٩) — the Owner Decision mandates Western digits.
    expect(date).not.toMatch(/[٠-٩]/)
    expect(time).not.toMatch(/[٠-٩]/)
  })

  it('returns the raw value and empty time for an unparseable input', () => {
    // Arrange
    const value = 'not-a-date'

    // Act
    const result = formatTimestamp(value)

    // Assert
    expect(result).toEqual({ date: 'not-a-date', time: '' })
  })
})
