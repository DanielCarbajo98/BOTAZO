import { BrandLoader } from '@/components/site/BrandLoader';
import { CookieBanner } from '@/components/site/CookieBanner';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { ScrollReveal } from '@/components/site/ScrollReveal';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BrandLoader />
      <ScrollReveal />
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
      <CookieBanner />
    </>
  );
}
