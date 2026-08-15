"use strict";
/**
 * @smart-edms/i18n — fr translation: `auth` namespace.
 *
 * Source of truth: en/auth.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const auth = {
    'login.title': 'Sign in to Smart EDMS', // falls back to English
    'login.subtitle': 'Enter your credentials to access your workspace.', // falls back to English
    'login.username.label': 'Username or email', // falls back to English
    'login.username.placeholder': 'you@company.com', // falls back to English
    'login.password.label': 'Password', // falls back to English
    'login.password.placeholder': 'Enter your password', // falls back to English
    'login.password.show': 'Show password', // falls back to English
    'login.password.hide': 'Hide password', // falls back to English
    'login.rememberMe': 'Remember this device for 30 days', // falls back to English
    'login.submit': 'Sign in', // falls back to English
    'login.forgotPassword': 'Forgot password?', // falls back to English
    'login.noAccount': 'Need an account?', // falls back to English
    'login.requestAccess': 'Request access', // falls back to English
    'login.sso.continueWith': 'Continue with {{provider}}', // falls back to English
    'login.sso.separator': 'or', // falls back to English
    'login.mfa.prompt': 'Enter your verification code', // falls back to English
    'login.mfa.subtitle': 'A 6-digit code was sent to your authenticator app.', // falls back to English
    'login.mfa.code.label': 'Verification code', // falls back to English
    'login.mfa.code.placeholder': '000000', // falls back to English
    'login.mfa.resend': 'Resend code', // falls back to English
    'login.mfa.verifyAnotherWay': 'Try another way', // falls back to English
    'login.mfa.trustDevice': 'Trust this device', // falls back to English
    'login.mfa.useBackupCode': 'Use a backup code', // falls back to English
    'login.mfa.useAuthenticatorApp': 'Use authenticator app', // falls back to English
    'login.mfa.useSecurityKey': 'Use security key', // falls back to English
    'login.mfa.useSms': 'Send code via SMS', // falls back to English
    'login.mfa.useEmail': 'Send code via email', // falls back to English
    'login.error.invalidCredentials': 'Invalid username or password.', // falls back to English
    'login.error.rateLimited': 'Too many attempts. Please try again in {{seconds}} seconds.', // falls back to English
    'login.error.mfaRequired': 'Multi-factor authentication is required for your account.', // falls back to English
    'login.error.mfaInvalid': 'Invalid verification code. Please try again.', // falls back to English
    'login.error.accountLocked': 'Your account has been locked after too many failed attempts. Contact your administrator.', // falls back to English
    'login.error.accountDisabled': 'Your account has been disabled. Contact your administrator.', // falls back to English
    'login.error.accountExpired': 'Your account has expired. Contact your administrator.', // falls back to English
    'login.error.tenantSuspended': 'Your organisation’s subscription is suspended. Contact your administrator.', // falls back to English
    'login.error.licenseRequired': 'No valid license found for this organisation.', // falls back to English
    'login.success': 'Signed in successfully.', // falls back to English
    'login.sessionRestored': 'Welcome back. Your session has been restored.', // falls back to English
    'register.title': 'Create your account', // falls back to English
    'register.subtitle': 'Set up your Smart EDMS account in seconds.', // falls back to English
    'register.firstName.label': 'First name', // falls back to English
    'register.firstName.placeholder': 'Jane', // falls back to English
    'register.lastName.label': 'Last name', // falls back to English
    'register.lastName.placeholder': 'Doe', // falls back to English
    'register.email.label': 'Work email', // falls back to English
    'register.email.placeholder': 'you@company.com', // falls back to English
    'register.password.label': 'Password', // falls back to English
    'register.password.placeholder': 'At least 12 characters', // falls back to English
    'register.passwordConfirm.label': 'Confirm password', // falls back to English
    'register.passwordConfirm.placeholder': 'Re-enter your password', // falls back to English
    'register.terms.accept': 'I accept the Terms of Service and Privacy Policy', // falls back to English
    'register.inviteCode.label': 'Invitation code', // falls back to English
    'register.inviteCode.placeholder': 'Enter the code from your invitation email', // falls back to English
    'register.submit': 'Create account', // falls back to English
    'register.success': 'Account created. Please check your email to verify your address.', // falls back to English
    'register.error.emailTaken': 'An account with this email already exists.', // falls back to English
    'register.error.weakPassword': 'Password does not meet the complexity requirements.', // falls back to English
    'register.error.invalidInvite': 'The invitation code is invalid or has expired.', // falls back to English
    'register.error.termsRequired': 'You must accept the Terms of Service to continue.', // falls back to English
    'logout.title': 'Signing out…', // falls back to English
    'logout.message': 'You are being signed out. Please wait.', // falls back to English
    'logout.success': 'You have been signed out.', // falls back to English
    'logout.confirm': 'Are you sure you want to sign out?', // falls back to English
    'session.expired': 'Your session has expired. Please sign in again.', // falls back to English
    'session.expiringSoon': 'Your session will expire in {{minutes}} minutes. Sign in again to stay active.', // falls back to English
    'session.renewing': 'Renewing your session…', // falls back to English
    'session.renewed': 'Your session has been renewed.', // falls back to English
    'session.renewFailed': 'Could not renew your session. Please sign in again.', // falls back to English
    'session.concurrentLimit': 'You have reached the maximum number of concurrent sessions.', // falls back to English
    'session.kickedOut': 'Your session was ended because another device signed in.', // falls back to English
    'password.reset.title': 'Reset your password', // falls back to English
    'password.reset.subtitle': 'Enter your email and we’ll send you a reset link.', // falls back to English
    'password.reset.email.label': 'Email', // falls back to English
    'password.reset.submit': 'Send reset link', // falls back to English
    'password.reset.success': 'If an account exists for {{email}}, a reset link has been sent.', // falls back to English
    'password.reset.expired': 'This password reset link has expired. Please request a new one.', // falls back to English
    'password.reset.invalid': 'This password reset link is invalid.', // falls back to English
    'password.reset.confirm.title': 'Set a new password', // falls back to English
    'password.reset.confirm.subtitle': 'Choose a strong password for your account.', // falls back to English
    'password.reset.confirm.newPassword.label': 'New password', // falls back to English
    'password.reset.confirm.confirmPassword.label': 'Confirm new password', // falls back to English
    'password.reset.confirm.submit': 'Update password', // falls back to English
    'password.reset.confirm.success': 'Your password has been updated. You can now sign in.', // falls back to English
    'password.reset.confirm.error.match': 'Passwords do not match.', // falls back to English
    'password.reset.confirm.error.sameAsOld': 'The new password must be different from the current one.', // falls back to English
    'password.change.title': 'Change password', // falls back to English
    'password.change.current.label': 'Current password', // falls back to English
    'password.change.new.label': 'New password', // falls back to English
    'password.change.confirm.label': 'Confirm new password', // falls back to English
    'password.change.submit': 'Change password', // falls back to English
    'password.change.success': 'Password changed successfully.', // falls back to English
    'password.change.error.currentInvalid': 'Current password is incorrect.', // falls back to English
    'password.requirements.title': 'Password requirements', // falls back to English
    'password.requirements.length': 'At least 12 characters', // falls back to English
    'password.requirements.uppercase': 'At least one uppercase letter', // falls back to English
    'password.requirements.lowercase': 'At least one lowercase letter', // falls back to English
    'password.requirements.number': 'At least one number', // falls back to English
    'password.requirements.symbol': 'At least one symbol', // falls back to English
    'password.requirements.noReuse': 'Not the same as your last 5 passwords', // falls back to English
    'password.strength.weak': 'Weak', // falls back to English
    'password.strength.fair': 'Fair', // falls back to English
    'password.strength.good': 'Good', // falls back to English
    'password.strength.strong': 'Strong', // falls back to English
    'password.strength.veryStrong': 'Very strong', // falls back to English
    'mfa.setup.title': 'Set up multi-factor authentication', // falls back to English
    'mfa.setup.subtitle': 'Protect your account with an additional verification step.', // falls back to English
    'mfa.setup.qr.title': 'Scan this QR code', // falls back to English
    'mfa.setup.qr.subtitle': 'Use your authenticator app (e.g. Authy, 1Password) to scan the code.', // falls back to English
    'mfa.setup.manualCode': 'Or enter this code manually:', // falls back to English
    'mfa.setup.verify.title': 'Verify the setup', // falls back to English
    'mfa.setup.verify.subtitle': 'Enter the 6-digit code from your authenticator app to confirm.', // falls back to English
    'mfa.setup.backupCodes.title': 'Save your backup codes', // falls back to English
    'mfa.setup.backupCodes.subtitle': 'Store these codes in a safe place. Each can be used once if you lose your device.', // falls back to English
    'mfa.setup.backupCodes.download': 'Download codes', // falls back to English
    'mfa.setup.backupCodes.copy': 'Copy codes', // falls back to English
    'mfa.setup.backupCodes.done': 'I’ve saved my backup codes', // falls back to English
    'mfa.setup.success': 'Multi-factor authentication is now enabled for your account.', // falls back to English
    'mfa.disable.title': 'Disable multi-factor authentication', // falls back to English
    'mfa.disable.confirm': 'Are you sure? This will make your account less secure.', // falls back to English
    'mfa.disable.success': 'Multi-factor authentication has been disabled.', // falls back to English
    'sso.configure.title': 'Configure single sign-on', // falls back to English
    'sso.configure.provider': 'Identity provider', // falls back to English
    'sso.configure.entityId': 'Entity ID', // falls back to English
    'sso.configure.metadataUrl': 'Metadata URL', // falls back to English
    'sso.configure.test': 'Test connection', // falls back to English
    'sso.configure.save': 'Save configuration', // falls back to English
    'sso.configure.success': 'SSO configuration saved.', // falls back to English
    'sso.configure.error.invalidMetadata': 'Could not parse the identity provider metadata.', // falls back to English
    'sso.error.providerUnavailable': 'The identity provider is currently unavailable.', // falls back to English
    'sso.error.noEmail': 'The identity provider did not return an email address.', // falls back to English
    'sso.error.domainMismatch': 'Your email domain is not allowed for this tenant.', // falls back to English
    'invite.accept.title': 'Accept your invitation', // falls back to English
    'invite.accept.subtitle': 'You’ve been invited to join {{tenant}} on Smart EDMS.', // falls back to English
    'invite.accept.expired': 'This invitation has expired. Please request a new one.', // falls back to English
    'invite.accept.alreadyMember': 'You are already a member of this organisation.', // falls back to English
    'invite.accept.success': 'Welcome to {{tenant}}!', // falls back to English
};
exports.default = auth;
//# sourceMappingURL=auth.js.map