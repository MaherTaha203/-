// Client-side password policy for the recovery gate — the one point where the
// single owner ever sets a password (there is no public sign-up UI). It is a
// compensating control for Supabase's leaked-password (HaveIBeenPwned) check,
// which is a Pro-plan-only feature and unavailable on this project's plan:
// enforcing length plus character variety keeps trivially guessable passwords
// out at the only reachable entry point.

export const MIN_PASSWORD_LENGTH = 10

// Returns a human-readable Arabic message describing the first unmet
// requirement, or null when the password satisfies the policy.
export function passwordPolicyError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `كلمة المرور يجب أن تتكوّن من ${MIN_PASSWORD_LENGTH} أحرف على الأقل`
  }
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  if (!(hasLower && hasUpper && hasDigit && hasSymbol)) {
    return 'كلمة المرور يجب أن تجمع أحرفًا لاتينيّة كبيرة وصغيرة وأرقامًا ورمزًا واحدًا على الأقل'
  }
  return null
}
