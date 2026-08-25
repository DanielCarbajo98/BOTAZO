import type { Metadata } from 'next';
import { LegalLayout } from '@/components/site/LegalLayout';
import { site } from '@/config/site';

export const metadata: Metadata = { title: 'Política de privacidad' };

export default function PrivacidadPage() {
  return (
    <LegalLayout title="Política de privacidad" updated="pendiente de publicación">
      <h2>1. Responsable del tratamiento</h2>
      <p>
        {site.legal.company} (NIF {site.legal.nif}), con domicilio en {site.legal.address}. Contacto en materia de
        protección de datos: {site.legal.dpoEmail}.
      </p>

      <h2>2. Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Datos del formulario de presupuesto</strong> (nombre, email, teléfono, preferencias de viaje,
          número y edades de los acompañantes, necesidades especiales que nos indiques): para elaborar y gestionar
          tu presupuesto. Base jurídica: ejecución de un contrato o medidas precontractuales a tu solicitud.
        </li>
        <li>
          <strong>Datos de la reserva</strong>, si contratas: para gestionar el viaje con los proveedores. Base
          jurídica: ejecución del contrato.
        </li>
        <li>
          <strong>Correo comercial</strong>, solo si lo marcas expresamente: para enviarte ofertas y avisos de
          precio. Base jurídica: tu consentimiento, revocable en cualquier momento.
        </li>
        <li>
          <strong>Datos técnicos mínimos</strong> (un identificador derivado de tu dirección IP, cifrado de forma
          irreversible): para prevenir abusos del formulario. Base jurídica: interés legítimo en la seguridad del
          servicio. No conservamos la IP en claro.
        </li>
      </ul>
      <p>
        Si nos indicas necesidades de salud o movilidad para adaptar el viaje, esos datos son de categoría especial
        y los tratamos únicamente con tu consentimiento explícito y solo para ese fin.
      </p>

      <h2>3. Destinatarios</h2>
      <p>
        Para poder reservar tu viaje comunicamos los datos imprescindibles a los proveedores implicados (aerolíneas,
        hoteles, receptivos, aseguradoras) y a nuestros proveedores tecnológicos, que actúan como encargados del
        tratamiento. Si el viaje es fuera del Espacio Económico Europeo, la comunicación de tus datos al proveedor
        es necesaria para ejecutar el contrato. No vendemos ni cedemos datos con fines publicitarios de terceros.
      </p>

      <h2>4. Plazo de conservación</h2>
      <p>
        Las solicitudes que no acaban en reserva se conservan un máximo de 12 meses. Los expedientes de viajes
        contratados se conservan durante los plazos legales de prescripción fiscal y de responsabilidad (hasta 6
        años). Los datos usados para el envío comercial, hasta que retires el consentimiento.
      </p>

      <h2>5. Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
        escribiendo a {site.legal.dpoEmail}, adjuntando un documento que acredite tu identidad. También puedes
        reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).
      </p>

      <h2>6. Seguridad</h2>
      <p>
        El sitio funciona íntegramente sobre HTTPS, aplica una política de seguridad de contenidos estricta y limita
        el número de envíos por conexión. Las contraseñas del área de gestión se guardan con derivación de clave
        (scrypt) y los enlaces privados de cada presupuesto utilizan un identificador aleatorio del que solo
        almacenamos su huella.
      </p>

      <h2>7. Menores</h2>
      <p>
        El formulario solo debe cumplimentarlo una persona mayor de edad. Los datos de menores que viajan se
        facilitan bajo la responsabilidad de su progenitor o tutor.
      </p>
    </LegalLayout>
  );
}
