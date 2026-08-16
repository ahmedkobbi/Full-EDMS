/**
 * Login page (spec §9.1, §17, §27.5).
 *
 * Email + password + optional MFA code field. The MFA field is shown when
 * the backend responds with `mfaRequired: true`.
 *
 * Uses `@mantine/form` for validation and TanStack Query's `useLoginMutation`
 * for the API call. On success, the auth store persists the session (tokens
 * go to OS-encrypted safeStorage).
 *
 * Branding:
 *  - The BrandedLogo is centered above the form.
 *  - The wordmark "Smart EDMS" stays consistent across locales (only the
 *    descriptive text translates).
 *
 * Accessibility:
 *  - All inputs have localized labels + aria-describedby.
 *  - The submit button shows a loading spinner while the mutation is pending.
 *  - Error messages are announced via aria-live.
 */
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Center,
  Checkbox,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BrandedLogo } from '@smart-edms/ui';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';
import { useLoginMutation } from '../api/hooks';
import { useAuthStore } from '../store/auth';
import { useI18nStore } from '../i18n/config';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const locale = useI18nStore((s) => s.locale);
  const [mfaRequired, setMfaRequired] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      mfaCode: '',
      rememberDevice: true,
    },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : t('common:form.email')),
      password: (v) => (v.length > 0 ? null : t('common:form.required.field')),
      mfaCode: (v) => (mfaRequired && !/^\d{6}$/.test(v) ? t('auth:login.mfa.code.label') : null),
    },
  });

  const login = useLoginMutation({
    onSuccess: async (data) => {
      if (data.mfaRequired) {
        setMfaRequired(true);
        return;
      }
      await setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        refreshExpiresAt: data.refreshExpiresAt,
        tenantId: data.tenantId,
        userId: data.userId,
      });
      navigate('/dashboard');
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    login.mutate({
      email: values.email,
      password: values.password,
      mfaChallengeResponse: mfaRequired ? values.mfaCode : undefined,
      locale,
    });
  });

  return (
    <Center style={{ minHeight: '100vh', padding: '1rem' }}>
      <Container size={420}>
        <Stack gap="lg" align="center" mb="xl">
          <BrandedLogo size="lg" showTagline />
        </Stack>

        <Paper shadow="sm" radius="md" p="xl" withBorder>
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={3}>{t('auth:login.title')}</Title>
              <Text size="sm" c="dimmed">
                {t('auth:login.subtitle')}
              </Text>
            </Stack>

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label={t('auth:login.username.label')}
                  placeholder={t('auth:login.username.placeholder')}
                  {...form.getInputProps('email')}
                  autoComplete="email"
                  required
                />
                <PasswordInput
                  label={t('auth:login.password.label')}
                  placeholder={t('auth:login.password.placeholder')}
                  {...form.getInputProps('password')}
                  autoComplete="current-password"
                  required
                />

                {mfaRequired && (
                  <TextInput
                    label={t('auth:login.mfa.code.label')}
                    placeholder={t('auth:login.mfa.code.placeholder')}
                    {...form.getInputProps('mfaCode')}
                    autoComplete="one-time-code"
                    required
                    aria-describedby="mfa-help"
                  />
                )}
                {mfaRequired && (
                  <Text id="mfa-help" size="xs" c="dimmed">
                    {t('auth:login.mfa.subtitle')}
                  </Text>
                )}

                <Checkbox
                  label={t('auth:login.rememberMe')}
                  {...form.getInputProps('rememberDevice', { type: 'checkbox' })}
                />

                {login.isError && (
                  <Alert
                    icon={<AlertCircle size={16} />}
                    color="error"
                    variant="light"
                    aria-live="assertive"
                  >
                    {t('auth:login.error.invalidCredentials')}
                  </Alert>
                )}

                <Button type="submit" loading={login.isPending} fullWidth size="md">
                  {t('auth:login.submit')}
                </Button>

                <Box style={{ textAlign: 'center' }}>
                  <Text size="sm" c="dimmed">
                    {t('auth:login.noAccount')}{' '}
                    <Text component="span" size="sm" c="brand" style={{ cursor: 'pointer' }}>
                      {t('auth:login.requestAccess')}
                    </Text>
                  </Text>
                </Box>
              </Stack>
            </form>
          </Stack>
        </Paper>

        <Stack align="center" mt="lg">
          <LanguageSwitcher variant="compact" />
          <Text size="xs" c="dimmed">
            {t('common:app.copyright', { year: new Date().getFullYear() })}
          </Text>
        </Stack>
      </Container>
    </Center>
  );
}
