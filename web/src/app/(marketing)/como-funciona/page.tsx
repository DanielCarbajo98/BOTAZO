import type { Metadata } from 'next';
import { Comparison, FinalCta, HowItWorks, WhoBooks, WhyCheaper } from '@/components/home/Sections';
import { Section, SectionHeading } from '@/components/ui/Card';
import { site } from '@/config/site';
import { isAdvisor, quoteNoun } from '@/config/mode';

export const metadata: Metadata = {
  title: 'Cómo funciona',
  description:
    'Nos cuentas tu viaje, buscamos durante horas y te enviamos tres opciones con el desglose completo. Gratis y sin compromiso.',
  alternates: { canonical: '/como-funciona' },
};

const promises = [
  {
    title: 'No te vendemos lo que más nos conviene',
    body: 'Cobramos una tarifa fija por persona, no un porcentaje. Da igual que el viaje cueste 300 € o 3.000 €: ganamos lo mismo. Por eso podemos recomendarte la opción barata sin conflicto de intereses.',
  },
  {
    title: 'Te decimos cuándo no merece la pena',
    body: 'Si vemos que tu combinación de fechas y destino está imposible, te lo decimos y te proponemos alternativas. Preferimos perder una venta a colocarte un viaje caro.',
  },
  {
    title: 'Todo por escrito',
    body: `Cada ${quoteNoun} lleva el desglose, las condiciones de cancelación de cada reserva y qué pasa si algo sale mal. Nada de "ya lo hablaremos".`,
  },
];

export default function ComoFuncionaPage() {
  return (
    <>
      <Section tone="night" className="pb-10">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-300">Cómo funciona</p>
          <h1 className="mt-3 text-4xl text-white md:text-5xl">
            Hacemos lo que harías tú si tuvieras seis horas y mucha práctica
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-300">
            No tenemos acceso a precios secretos. Tenemos método, tiempo y la costumbre de mirar donde casi nadie
            mira. Esto es exactamente lo que pasa desde que rellenas el formulario.
          </p>
        </div>
      </Section>

      <HowItWorks />
      <WhoBooks />
      <WhyCheaper />

      <Section tone="white">
        <SectionHeading eyebrow="Nuestro compromiso" title="Tres cosas que nos comprometemos a cumplir" />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {promises.map((promise) => (
            <div key={promise.title} className="rounded-card border border-ink-100 bg-sand-50 p-6">
              <h3 className="text-lg leading-snug">{promise.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-600">{promise.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-ink-500">
          {isAdvisor
            ? `${site.name} presta un servicio de asesoramiento: investigamos y te decimos qué reservar y dónde, pero la reserva la haces tú directamente con cada proveedor y sus condiciones son las que se aplican. No vendemos viajes combinados.`
            : `${site.name} actúa como agencia de viajes: intermediamos y gestionamos las reservas con proveedores (aerolíneas, hoteles, receptivos). Las condiciones de cada servicio son las del proveedor y te las entregamos con el presupuesto.`}
        </p>
      </Section>

      <Comparison />
      <FinalCta />
    </>
  );
}
