/**
 * License status badge (spec §4.4, §17).
 *
 * Renders the current license state as a coloured badge with a localized
 * label. Sits in the sidebar's bottom section.
 *
 * Color mapping (spec §4.4 — calm, non-alarming language):
 *  - valid            → success (green)
 *  - expiring_soon    → warning (amber)
 *  - expired_grace    → warning (amber)
 *  - grace_exhausted  → error (red)
 *  - extended_remediation → warning (amber)
 *  - invalid          → error (red)
 */
import { Badge, type MantineColor, Tooltip, Group } from '@mantine/core';
import { IconShieldCheck, IconAlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LicenseState } from '@smart-edms/types';
import { useLicenseStateQuery } from '../../api/hooks';

const STATE_COLORS: Record<LicenseState, MantineColor> = {
  valid: 'success',
  expiring_soon: 'warning',
  expired_grace: 'warning',
  grace_exhausted: 'error',
  extended_remediation: 'warning',
  invalid: 'error',
};

export function LicenseStatusBadge() {
  const { t } = useTranslation();
  const query = useLicenseStateQuery();

  if (query.isLoading) {
    return <Badge variant="light" color="gray" loading />;
  }

  if (query.isError || !query.data) {
    return (
      <Badge variant="light" color="gray" leftSection={<IconAlertTriangle size={12} />}>
        {t('license:state.generic.short')}
      </Badge>
    );
  }

  const state = query.data.state;
  const color = STATE_COLORS[state];
  const labelKey = `license:state.${state.replace(/_./g, (m) => m[1].toUpperCase())}.short`;

  return (
    <Tooltip label={t(`license:state.${state.replace(/_./g, (m) => m[1].toUpperCase())}.title`)} position="top-end">
      <Badge
        variant="light"
        color={color}
        leftSection={<IconShieldCheck size={12} />}
        data-tour="license.statusBadge"
      >
        {t(labelKey)}
      </Badge>
    </Tooltip>
  );
}
