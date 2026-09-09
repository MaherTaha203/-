import { describe, expect, it } from 'vitest'

import { MIN_PASSWORD_LENGTH, passwordPolicyError } from '@/features/auth/password-policy'

describe('passwordPolicyError', () => {
  it('accepts a password meeting length and all four character classes', () => {
    // Arrange
    const password = 'Kanaan#2026x'

    // Act
    const result = passwordPolicyError(password)

    // Assert
    expect(result).toBeNull()
  })

  it('rejects a password shorter than the minimum length', () => {
    // Arrange
    const password = 'Ab#1xyz' // 7 chars, has every class but too short

    // Act
    const result = passwordPolicyError(password)

    // Assert
    expect(result).toBe(`كلمة المرور يجب أن تتكوّن من ${MIN_PASSWORD_LENGTH} أحرف على الأقل`)
  })

  it('rejects a long password missing a symbol', () => {
    // Arrange
    const password = 'Kanaan2026xy' // 12 chars, no symbol

    // Act
    const result = passwordPolicyError(password)

    // Assert
    expect(result).toBe('كلمة المرور يجب أن تجمع أحرفًا لاتينيّة كبيرة وصغيرة وأرقامًا ورمزًا واحدًا على الأقل')
  })

  it('rejects a long password missing an uppercase letter', () => {
    // Arrange
    const password = 'kanaan#2026x' // 12 chars, no uppercase

    // Act
    const result = passwordPolicyError(password)

    // Assert
    expect(result).toBe('كلمة المرور يجب أن تجمع أحرفًا لاتينيّة كبيرة وصغيرة وأرقامًا ورمزًا واحدًا على الأقل')
  })

  it('checks length before character variety', () => {
    // Arrange
    const password = 'abc' // too short and missing classes

    // Act
    const result = passwordPolicyError(password)

    // Assert — length message wins as the first unmet requirement
    expect(result).toBe(`كلمة المرور يجب أن تتكوّن من ${MIN_PASSWORD_LENGTH} أحرف على الأقل`)
  })
})
