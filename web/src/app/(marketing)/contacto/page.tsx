import type { Metadata } from 'next';
import { ContactForm } from '@/components/site/ContactForm';
import { ButtonLink } from '@/components/ui/Button';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: 'Contacto',
  description: `Habla con una persona. WhatsApp, email o teléfono. ${site.contact.hours}.`,
  alternates: { canonical: '/contacto' },
};

export default function ContactoPage() {
  return (
    <div className="bg-sand-50 py-14 md:py-20">
      <div className="container-page grid max-w-5xl gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Contacto</p>
          <h1 className="mt-2 text-3xl md:text-4xl">Al otro lado hay una persona</h1>
          <p className="mt-4 leading-relaxed text-ink-600">
            Si es sobre un viaje concreto, lo más rápido es{' '}
            <a href="/presupuesto" className="font-semibold text-brand-800 underline underline-offset-2">
              rellenar el formulario
            </a>
            : así tenemos todos los datos y podemos ponernos directamente a buscar. Para cualquier otra cosa,
            escríbenos por donde prefieras.
          </p>

          <div className="mt-8 space-y-3">
            <ButtonLink
              href={`https://wa.me/${site.contact.whatsapp}`}
              size="lg"
              className="w-full justify-start sm:w-auto"
            >
              💬 WhatsApp · {site.contact.phoneDisplay}
            </ButtonLink>
            <ButtonLink href={`mailto:${site.contact.email}`} variant="outline" size="lg" className="w-full justify-start sm:w-auto">
              ✉️ {site.contact.email}
            </ButtonLink>
            <ButtonLink href={`tel:${site.contact.phoneE164}`} variant="outline" size="lg" className="w-full justify-start sm:w-auto">
              📞 {site.contact.phoneDisplay}
            </ButtonLink>
          </div>

          <p className="mt-6 text-sm text-ink-500">{site.contact.hours}</p>
        </div>

        <div className="rounded-card border border-ink-100 bg-white p-6 shadow-soft md:p-8">
          <h2 className="text-xl">Escríbenos aquí</h2>
          <p className="mt-1.5 text-sm text-ink-500">Te contestamos en menos de 24 horas laborables.</p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
