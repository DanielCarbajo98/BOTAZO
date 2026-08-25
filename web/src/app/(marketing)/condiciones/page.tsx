import type { Metadata } from 'next';
import { LegalLayout } from '@/components/site/LegalLayout';
import { pricing, site } from '@/config/site';
import { eur } from '@/lib/utils';

export const metadata: Metadata = { title: 'Condiciones de contratación' };

export default function CondicionesPage() {
  return (
    <LegalLayout title="Condiciones generales de contratación" updated="pendiente de publicación">
      <h2>1. Qué contratas</h2>
      <p>
        {site.name} presta un servicio de asesoramiento y gestión de reservas de viaje. La tarifa de gestión
        retribuye ese trabajo. El precio de los servicios de viaje (vuelos, alojamiento, traslados, actividades) se
        abona íntegramente a su proveedor, sin recargo por nuestra parte.
      </p>

      <h2>2. Presupuesto</h2>
      <p>
        El presupuesto es gratuito y no vinculante para ti. Es válido durante el plazo indicado en él y siempre
        sujeto a disponibilidad y al precio vigente del proveedor en el momento de confirmar. Si el precio cambia
        antes de confirmar, te lo comunicamos y puedes desistir sin coste.
      </p>

      <h2>3. Tarifa de gestión</h2>
      <ul>
        <li>
          Escapada (Europa y Norte de África, hasta 6 noches): {eur(pricing.escapada.feePerPerson)} por persona, con
          un mínimo de {eur(pricing.escapada.minPerBooking)} por reserva.
        </li>
        <li>
          Gran viaje (larga distancia, multidestino o más de 6 noches): {eur(pricing.granViaje.feePerPerson)} por
          persona, con un mínimo de {eur(pricing.granViaje.minPerBooking)} por reserva.
        </li>
        <li>
          Menores de {pricing.childAgeLimit} años: {Math.round(pricing.childDiscount * 100)} % de la tarifa. Bebés
          que viajan en brazos: exentos.
        </li>
        <li>
          Grupos de {pricing.grupoMinSize} o más personas: {Math.round(pricing.grupoDiscount * 100)} % de descuento
          sobre la tarifa por persona.
        </li>
        <li>Importe máximo por reserva: {eur(pricing.feeCap)}.</li>
      </ul>
      <p>
        La tarifa se devenga en el momento de confirmar la reserva y aparece siempre desglosada en el presupuesto.
        El mínimo por reserva responde a que el trabajo de búsqueda es prácticamente el mismo con independencia del
        número de viajeros.
      </p>

      <h3>3.1. Servicio prioritario (opcional)</h3>
      <p>
        Por {eur(pricing.priority.fee)} adicionales enviamos el presupuesto en un plazo de{' '}
        {pricing.priority.hours} horas laborables y ampliamos a {pricing.priority.revisions} las rondas de cambios
        incluidas. Se abona al solicitarlo y se descuenta íntegramente de la tarifa de gestión si la reserva se
        confirma. Si no llegamos a ese plazo por causa nuestra, se devuelve.
      </p>

      <h3>3.2. Comisiones de proveedores</h3>
      <p>
        Determinados proveedores (alojamientos, aseguradoras, empresas de actividades y de alquiler de vehículos)
        nos abonan una comisión de hasta el {pricing.supplierCommissionMax} % por intermediar la reserva. Esa
        comisión la paga el proveedor con cargo a su propio margen y <strong>no incrementa el precio</strong> que
        abonas: es el mismo que obtendrías contratando directamente. En cada presupuesto se indica qué servicios
        nos generan comisión, y esta no condiciona en ningún caso nuestra recomendación.
      </p>

      <h3>3.3. Reparto del ahorro posterior</h3>
      <p>
        Si tras confirmar la reserva el precio baja y la tarifa contratada admite cambio o cancelación sin coste,
        rehacemos la reserva. Del ahorro obtenido, el {Math.round(pricing.savingShare.client * 100)} % corresponde
        al cliente y el {Math.round(pricing.savingShare.agency * 100)} % a la agencia en concepto de honorarios de
        éxito. Si no se consigue ningún ahorro, este seguimiento no tiene coste alguno.
      </p>

      <h2>4. Garantía de ahorro</h2>
      <p>
        Si dentro del plazo de validez del presupuesto acreditas mediante captura o enlace un precio total igual o
        inferior al nuestro <em>para el mismo viaje</em> —mismas fechas, mismo tipo de vuelo y de alojamiento, mismo
        equipaje, mismas condiciones de cancelación y mismos servicios incluidos—, no cobramos la tarifa de gestión.
      </p>

      <h2>5. Pagos, cancelaciones y modificaciones</h2>
      <p>
        Las condiciones de pago, cancelación y modificación son las de cada proveedor y se detallan en el
        presupuesto antes de confirmar. La tarifa de gestión no es reembolsable una vez emitidas las reservas,
        porque el trabajo ya está realizado; sí lo es si la cancelación se produce por causa imputable a nosotros.
      </p>

      <h2>6. Derecho de desistimiento</h2>
      <p>
        Conforme al artículo 103.l) del RDL 1/2007, los servicios de viaje con fecha determinada están excluidos del
        derecho de desistimiento de 14 días propio de la contratación a distancia. Sí se aplican los derechos de
        cancelación previstos en la normativa de viajes combinados cuando el conjunto contratado tenga esa
        consideración.
      </p>

      <h2>7. Viajes combinados y servicios de viaje vinculados</h2>
      <p>
        Cuando la combinación de servicios que contratas constituya un viaje combinado o un servicio de viaje
        vinculado en el sentido de la Directiva (UE) 2015/2302 y del RDL 1/2007, se te entregará el formulario de
        información normalizada correspondiente antes de la contratación, junto con la información sobre la garantía
        frente a insolvencia.
      </p>

      <h2>8. Reclamaciones</h2>
      <p>
        Puedes dirigir cualquier reclamación a {site.contact.email}. Disponemos de hojas de reclamaciones oficiales.
        También puedes acudir a los organismos de consumo de tu comunidad autónoma.
      </p>
    </LegalLayout>
  );
}
