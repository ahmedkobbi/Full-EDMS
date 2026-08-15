/**
 * Classification banner component (spec §9.4, §17).
 *
 * Renders a colored banner at the top of the document viewer showing the
 * document's classification level. The banner text + color come from the
 * ClassificationLabel record (bannerText + color fields).
 *
 * The banner is:
 *  - Always visible when viewing a classified document
 *  - Colored by sensitivity level (1=blue, 2=green, 3=amber, 4=red, 5=dark red)
 *  - RTL-aware (text direction follows the locale)
 *  - Non-dismissible (classification must always be visible)
 *
 * Spec ref: §9.4 (visual classification banners in UI, classification banners
 *           must render correctly in RTL mode).
 */
import { Text, Box, ThemeIcon } from '@mantine/core';
import { IconShield } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface ClassificationBannerProps {
  bannerText: string | null;
  color: string | null;
  sensitivityLevel: number;
  nameKey?: string;
}

const sensitivityColors: Record<number, string> = {
  1: 'var(--mantine-color-blue-6)',
  2: 'var(--mantine-color-green-6)',
  3: 'var(--mantine-color-yellow-7)',
  4: 'var(--mantine-color-red-7)',
  5: 'var(--mantine-color-red-9)',
};

const sensitivityBackgrounds: Record<number, string> = {
  1: 'var(--mantine-color-blue-1)',
  2: 'var(--mantine-color-green-1)',
  3: 'var(--mantine-color-yellow-1)',
  4: 'var(--mantine-color-red-1)',
  5: 'var(--mantine-color-red-2)',
};

export function ClassificationBanner({
  bannerText,
  color,
  sensitivityLevel,
  nameKey,
}: ClassificationBannerProps) {
  const { t } = useTranslation();

  if (!bannerText && !nameKey) return null;

  const backgroundColor = color ?? sensitivityBackgrounds[sensitivityLevel] ?? 'var(--mantine-color-gray-1)';
  const textColor = sensitivityColors[sensitivityLevel] ?? 'var(--mantine-color-gray-7)';
  const displayText = bannerText ?? t(nameKey!, { defaultValue: nameKey });

  return (
    <Box
      style={{
        backgroundColor,
        color: textColor,
        padding: '6px 16px',
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        justifyContent: 'center',
        width: '100%',
        borderBottom: `2px solid ${textColor}`,
      }}
      role="banner"
      aria-label={t('classification.banner.ariaLabel', { defaultValue: `Classification: ${displayText}` })}
    >
      <ThemeIcon size={16} radius="sm" variant="transparent" color={textColor}>
        <IconShield size={14} aria-hidden="true" />
      </ThemeIcon>
      <Text size="xs" fw={700} c={textColor} style={{ letterSpacing: '0.08em' }}>
        {displayText}
      </Text>
    </Box>
  );
}
