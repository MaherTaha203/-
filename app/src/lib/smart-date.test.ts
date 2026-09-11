import { describe, expect, test } from 'vitest'

import { parseSmartDate } from './smart-date'

const TODAY = new Date(2026, 8, 10) // 2026-09-10 (month is 0-indexed)

describe('parseSmartDate', () => {
  test('day only fills the current month and year', () => {
    expect(parseSmartDate('5', TODAY)).toBe('2026-09-05')
    expect(parseSmartDate('15', TODAY)).toBe('2026-09-15')
  })

  test('day and month keep the current year', () => {
    expect(parseSmartDate('5/3', TODAY)).toBe('2026-03-05')
    expect(parseSmartDate('15 11', TODAY)).toBe('2026-11-15')
  })

  test('full day/month/year is taken as-is, 2-digit year maps to 2000s', () => {
    expect(parseSmartDate('5/3/24', TODAY)).toBe('2024-03-05')
    expect(parseSmartDate('05/03/2024', TODAY)).toBe('2024-03-05')
  })

  test('compact runs are split by width', () => {
    expect(parseSmartDate('1503', TODAY)).toBe('2026-03-15')
    expect(parseSmartDate('150324', TODAY)).toBe('2024-03-15')
    expect(parseSmartDate('15032024', TODAY)).toBe('2024-03-15')
  })

  test('rejects impossible or empty dates', () => {
    expect(parseSmartDate('', TODAY)).toBeNull()
    expect(parseSmartDate('31/02', TODAY)).toBeNull()
    expect(parseSmartDate('0', TODAY)).toBeNull()
    expect(parseSmartDate('45/1', TODAY)).toBeNull()
    expect(parseSmartDate('5/13', TODAY)).toBeNull()
  })
})
