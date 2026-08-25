import { CookieBanner } from '@/components/site/CookieBanner';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
