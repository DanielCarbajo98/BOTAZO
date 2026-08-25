import type { Metadata } from 'next';
import { Faq, FinalCta } from '@/components/home/Sections';
import { JsonLd } from '@/components/site/JsonLd';
import { Section } from '@/components/ui/Card';
import { faqs } from '@/content/faq';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: 'Cómo trabajamos, cuánto cobramos, qué pasa si algo sale mal y qué hacemos con tus datos.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }}
      />
      <Section tone="night" className="pb-10">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Dudas</p>
          <h1 className="mt-3 text-4xl text-white md:text-5xl">Preguntas frecuentes</h1>
        </div>
      </Section>
      <Faq />
      <FinalCta />
    </>
  );
}
