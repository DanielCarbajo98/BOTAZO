import type { Metadata } from 'next';
import { LegalLayout } from '@/components/site/LegalLayout';
import { site } from '@/config/site';
import { isAdvisor, modeCopy } from '@/config/mode';

export const metadata: Metadata = { title: 'Aviso legal', robots: { index: true, follow: true } };

export default function AvisoLegalPage() {
  return (
    <LegalLayout title="Aviso legal" updated="pendiente de publicación">
      <h2>1. Titular del sitio web</h2>
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de
        comercio electrónico (LSSI-CE), se informa de los siguientes datos:
      </p>
      <ul>
        <li>Denominación social: {site.legal.company}</li>
        <li>NIF: {site.legal.nif}</li>
        <li>Domicilio: {site.legal.address}</li>
        <li>Datos registrales: {site.legal.registry}</li>
        <li>Correo electrónico: {site.contact.email}</li>
        <li>Teléfono: {site.contact.phoneDisplay}</li>
        {isAdvisor ? null : (
          <>
            <li>Título-licencia de agencia de viajes: {site.legal.travelAgencyLicence}</li>
            <li>Garantía frente a insolvencia: {site.legal.insurer}</li>
          </>
        )}
        <li>Seguro de responsabilidad civil: {site.legal.insurer}</li>
      </ul>

      <h2>2. Objeto</h2>
      <p>{modeCopy.legalObject}</p>

      <h2>3. Condiciones de uso</h2>
      <p>
        El acceso a este sitio es gratuito y no requiere registro. El usuario se compromete a hacer un uso lícito de
        la web y a facilitar información veraz en los formularios. Está prohibido el uso automatizado del sitio para
        extraer datos, así como cualquier intento de acceso no autorizado a las áreas privadas.
      </p>

      <h2>4. Precios y propuestas</h2>
      <p>
        Los importes orientativos que se muestran automáticamente en el formulario son estimaciones estadísticas y
        <strong> no constituyen una oferta contractual</strong>. Solo es vinculante el presupuesto que enviamos de
        forma individual, dentro de su plazo de validez y sujeto a disponibilidad en el momento de la confirmación.
      </p>

      <h2>5. Propiedad intelectual</h2>
      <p>
        Los contenidos, textos, diseño y código de este sitio pertenecen a {site.legal.company} o se utilizan con
        autorización. Queda prohibida su reproducción con fines comerciales sin consentimiento por escrito.
      </p>

      <h2>6. Responsabilidad</h2>
      <p>
        No respondemos de las interrupciones del servicio ajenas a nuestro control, ni de la información publicada
        por terceros a la que se pueda acceder desde enlaces de este sitio.
      </p>

      <h2>7. Legislación aplicable y resolución de conflictos</h2>
      <p>
        Esta relación se rige por la legislación española. Como consumidor puedes acudir a la plataforma europea de
        resolución de litigios en línea o a las juntas arbitrales de consumo de tu comunidad autónoma.
      </p>
    </LegalLayout>
  );
}
