import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import {
  Comparison,
  Differentiators,
  DestinationIdeas,
  Faq,
  FinalCta,
  HowItWorks,
  PricingTeaser,
  Problem,
  Testimonials,
  WhyCheaper,
} from '@/components/home/Sections';
import { JsonLd } from '@/components/site/JsonLd';
import { faqs } from '@/content/faq';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: `${site.name} · ${site.tagline}`,
  description: site.description,
  alternates: { canonical: '/' },
};

export default function HomePage() {
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: site.name,
      description: site.description,
      url: site.url,
      email: site.contact.email,
      telephone: site.contact.phoneE164,
      areaServed: 'ES',
      priceRange: '€',
      knowsLanguage: ['es'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <Hero />
      <Problem />
      <HowItWorks />
      <WhyCheaper />
      <Differentiators />
      <Comparison />
      <PricingTeaser />
      <Testimonials />
      <DestinationIdeas />
      <Faq limit={6} />
      <FinalCta />
    </>
  );
}
