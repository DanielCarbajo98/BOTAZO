import type { Metadata } from 'next';
import { TrackingForm } from '@/components/quote/TrackingForm';
import { site } from '@/config/site';
import { quoteNoun } from '@/config/mode';

export const metadata: Metadata = {
  title: 'Seguir mi solicitud',
  description: `Recupera el enlace privado de tu ${quoteNoun} con tu número de referencia y tu email.`,
  robots: { index: false, follow: true },
};

export default function SeguimientoPage() {
  return (
    <div className="bg-sand-50 py-16 md:py-24">
      <div className="container-page max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Seguimiento</p>
        <h1 className="mt-2 text-3xl md:text-4xl">Recupera tu presupuesto</h1>
        <p className="mt-3 leading-relaxed text-ink-600">
          Introduce el número de referencia que te dimos al enviar la solicitud (tiene esta forma:{' '}
          <span className="font-mono font-semibold">AL-7K3QP9</span>) y el email con el que la creaste.
        </p>

        <div className="mt-8 rounded-card border border-ink-100 bg-white p-6 shadow-soft">
          <TrackingForm />
        </div>

        <p className="mt-6 text-sm leading-relaxed text-ink-500">
          ¿No encuentras la referencia? Escríbenos a{' '}
          <a href={`mailto:${site.contact.email}`} className="font-semibold text-brand-800 underline underline-offset-2">
            {site.contact.email}
          </a>{' '}
          y la buscamos por ti.
        </p>
      </div>
    </div>
  );
}
