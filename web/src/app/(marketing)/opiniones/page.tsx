import type { Metadata } from 'next';
import { FinalCta, Testimonials } from '@/components/home/Sections';
import { Section } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Opiniones',
  description: 'Lo que cuentan los clientes que ya han viajado con nosotros.',
  alternates: { canonical: '/opiniones' },
};

export default function OpinionesPage() {
  return (
    <>
      <Section tone="night" className="pb-10">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Opiniones</p>
          <h1 className="mt-3 text-4xl text-white md:text-5xl">Lo que dicen quienes ya han viajado</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-300">
            Publicamos solo opiniones de clientes reales, con su viaje y su ahorro. Si has viajado con nosotros y
            quieres contarlo, escríbenos.
          </p>
        </div>
      </Section>
      <Testimonials />
      <FinalCta />
    </>
  );
}
