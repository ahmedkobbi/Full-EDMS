import { type ReactNode } from 'react';
import { getServerI18n } from '../../i18n/config';
import { isSupportedLocale, DEFAULT_LOCALE } from '../../lib/locales';
import { Hero } from '../../components/sections/Hero';
import { Stats } from '../../components/sections/Stats';
import { FeatureGrid } from '../../components/sections/FeatureGrid';
import { FeatureTabs } from '../../components/sections/FeatureTabs';
import { LocalizationSection } from '../../components/sections/LocalizationSection';
import { SecuritySection } from '../../components/sections/SecuritySection';
import { Pricing } from '../../components/sections/Pricing';
import { TourSection } from '../../components/sections/TourSection';
import { FAQ } from '../../components/sections/FAQ';
import { CTA } from '../../components/sections/CTA';

interface HomePageProps {
  readonly params: { readonly locale: string };
}

export default function HomePage({ params }: HomePageProps): ReactNode {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  const t = i18n.t.bind(i18n);

  return (
    <>
      <Hero locale={locale} t={t} />
      <Stats t={t} />
      <FeatureGrid t={t} />
      <FeatureTabs t={t} />
      <LocalizationSection t={t} />
      <SecuritySection t={t} />
      <Pricing locale={locale} t={t} />
      <TourSection locale={locale} t={t} />
      <FAQ t={t} />
      <CTA locale={locale} t={t} />
    </>
  );
}
