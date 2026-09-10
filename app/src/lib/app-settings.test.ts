import { describe, expect, test } from 'vitest'

import { DEFAULT_APP_SETTINGS, HARD_MAX_VOUCHER_AMOUNT, sanitizeSettings } from './app-settings'

describe('sanitizeSettings', () => {
  test('returns the defaults for null or non-object input', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_APP_SETTINGS)
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_APP_SETTINGS)
  })

  test('falls back to the default center name when the stored name is blank', () => {
    const result = sanitizeSettings({ name: '   ' })
    expect(result.name).toBe(DEFAULT_APP_SETTINGS.name)
  })

  test('clamps the voucher ceiling to the hard maximum', () => {
    const result = sanitizeSettings({ maxVoucherAmount: HARD_MAX_VOUCHER_AMOUNT * 5 })
    expect(result.maxVoucherAmount).toBe(HARD_MAX_VOUCHER_AMOUNT)
  })

  test('clamps the attention count into its allowed range', () => {
    expect(sanitizeSettings({ attentionCount: 0 }).attentionCount).toBe(1)
    expect(sanitizeSettings({ attentionCount: 999 }).attentionCount).toBe(20)
  })

  test('rejects an unknown auto-logout value and keeps the default', () => {
    expect(sanitizeSettings({ autoLogoutMinutes: 45 as unknown as 0 }).autoLogoutMinutes).toBe(
      DEFAULT_APP_SETTINGS.autoLogoutMinutes,
    )
    expect(sanitizeSettings({ autoLogoutMinutes: 30 }).autoLogoutMinutes).toBe(30)
  })

  test('rejects an unknown enum value and keeps the default', () => {
    expect(sanitizeSettings({ dateFormat: 'iso' as unknown as 'dmy' }).dateFormat).toBe('dmy')
    expect(sanitizeSettings({ tableDensity: 'x' as unknown as 'compact' }).tableDensity).toBe('comfortable')
  })

  test('drops a logo that is not an embedded image data URL', () => {
    expect(sanitizeSettings({ logo: 'https://example.com/logo.png' }).logo).toBe('')
    expect(sanitizeSettings({ logo: 'data:image/png;base64,AAAA' }).logo).toBe('data:image/png;base64,AAAA')
  })

  test('trims free-text fields', () => {
    const result = sanitizeSettings({ taxId: '  12345  ', responsibleName: '  محمد  ' })
    expect(result.taxId).toBe('12345')
    expect(result.responsibleName).toBe('محمد')
  })
})
