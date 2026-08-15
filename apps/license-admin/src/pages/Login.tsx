/**
 * Login page — admin login with MFA (spec §27.3, §12.10).
 *
 * Two-step flow:
 *   1. Admin enters username + password. The licensing server returns a
 *      `mfaTicket` (the admin is NOT yet authenticated).
 *   2. Admin enters their TOTP code. The server verifies the code against
 *      the admin's registered TOTP secret and, on success, returns the
 *      access + refresh tokens + the admin profile.
 *
 * If the admin's account does not require MFA (rare; super_admin only),
 * the server may return tokens directly from step 1 — the panel handles
 * both shapes.
 */
import { useState } from 'react';
import {
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Box,
  PinInput,
  Text,
  Alert,
  Group,
  Container,
  Card,
  Divider,
} from '@mantine/core';
import { ShieldCheck, User, KeyRound, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BrandedLogo } from '@smart-edms/ui';
import { LanguageSwitcherInline } from '../components/common/LanguageSwitcherInline';
import {
  useAdminLoginMutation,
  useAdminMfaVerifyMutation,
  type AdminMfaVerifyResponse,
} from '../api/hooks';
import { useAuthStore } from '../store/auth';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  // Step 1 state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaTicket, setMfaTicket] = useState<string | null>(null);

  // Step 2 state
  const [mfaCode, setMfaCode] = useState('');

  const loginMutation = useAdminLoginMutation();
  const mfaMutation = useAdminMfaVerifyMutation();

  const handleLogin = async (): Promise<void> => {
    if (!username || !password) return;
    try {
      const res = await loginMutation.mutateAsync({ username, password });
      setMfaTicket(res.mfaTicket);
    } catch {
      // Error surfaced inline via mutation.error.
    }
  };

  const handleVerifyMfa = async (): Promise<void> => {
    if (!mfaTicket || mfaCode.length !== 6) return;
    try {
      const res: AdminMfaVerifyResponse = await mfaMutation.mutateAsync({
        mfaTicket,
        code: mfaCode,
      });
      setSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        expiresAt: res.expiresAt,
        admin: res.admin,
      });
      navigate('/dashboard');
    } catch {
      // Error surfaced inline.
    }
  };

  const handleBack = (): void => {
    setMfaTicket(null);
    setMfaCode('');
    mfaMutation.reset();
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--mantine-color-body)',
      }}
      data-tour="admin.login.page"
    >
      <Container size={420}>
        <Stack gap="lg" align="center" mb="xl">
          <BrandedLogo size="lg" showTagline />
          <LanguageSwitcherInline />
        </Stack>

        <Card withBorder shadow="md" padding="xl" radius="md">
          {!mfaTicket ? (
            <>
              <Stack gap="xs" mb="md">
                <Text size="lg" fw={700}>{t('admin:login.title')}</Text>
                <Text size="sm" c="dimmed">{t('admin:login.subtitle')}</Text>
              </Stack>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleLogin();
                }}
              >
                <Stack gap="md">
                  <TextInput
                    label={t('auth:login.username.label')}
                    placeholder={t('auth:login.username.placeholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    leftSection={<User size={16} aria-hidden="true" />}
                    required
                    data-tour="admin.login.username"
                    autoComplete="username"
                  />
                  <PasswordInput
                    label={t('auth:login.password.label')}
                    placeholder={t('auth:login.password.placeholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftSection={<KeyRound size={16} aria-hidden="true" />}
                    required
                    data-tour="admin.login.password"
                    autoComplete="current-password"
                  />
                  {loginMutation.isError && (
                    <Alert color="error" variant="light">
                      {t('auth:login.error.invalidCredentials')}
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    loading={loginMutation.isPending}
                    data-tour="admin.login.submit"
                    fullWidth
                  >
                    {t('auth:login.submit')}
                  </Button>
                </Stack>
              </form>
            </>
          ) : (
            <>
              <Stack gap="xs" mb="md">
                <Group gap="sm">
                  <ShieldCheck size={20} color="var(--mantine-color-success-filled)" aria-hidden="true" />
                  <Text size="lg" fw={700}>{t('auth:login.mfa.prompt')}</Text>
                </Group>
                <Text size="sm" c="dimmed">{t('auth:login.mfa.subtitle')}</Text>
              </Stack>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleVerifyMfa();
                }}
              >
                <Stack gap="md" align="center">
                  <Key size={32} color="var(--mantine-color-brand-filled)" aria-hidden="true" />
                  <PinInput
                    length={6}
                    value={mfaCode}
                    onChange={setMfaCode}
                    type="number"
                    inputMode="numeric"
                    autoFocus
                    size="lg"
                    aria-label={t('auth:login.mfa.code.label')}
                    data-tour="admin.login.mfaCode"
                  />
                  {mfaMutation.isError && (
                    <Alert color="error" variant="light" w="100%">
                      {t('auth:login.error.mfaInvalid')}
                    </Alert>
                  )}
                  <Divider w="100%" />
                  <Group w="100%" justify="space-between">
                    <Button variant="subtle" size="sm" onClick={handleBack}>
                      {t('common:action.back')}
                    </Button>
                    <Button
                      type="submit"
                      loading={mfaMutation.isPending}
                      disabled={mfaCode.length !== 6}
                      data-tour="admin.login.mfaVerify"
                    >
                      {t('auth:login.submit')}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </>
          )}
        </Card>

        <Text size="xs" c="dimmed" ta="center" mt="md">
          {t('admin:login.securityNote')}
        </Text>
      </Container>
    </Box>
  );
}
