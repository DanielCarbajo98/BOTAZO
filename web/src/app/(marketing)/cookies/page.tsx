import type { Metadata } from 'next';
import { LegalLayout } from '@/components/site/LegalLayout';

export const metadata: Metadata = { title: 'Política de cookies' };

export default function CookiesPage() {
  return (
    <LegalLayout title="Política de cookies" updated="pendiente de publicación">
      <p>
        Este sitio no utiliza cookies de publicidad, de perfilado ni de analítica de terceros. Tampoco carga
        recursos externos que puedan rastrearte: las tipografías se sirven desde nuestro propio dominio.
      </p>

      <h2>Qué guardamos exactamente</h2>
      <ul>
        <li>
          <strong>Borrador del formulario</strong> (<code>zarpea-wizard-v1</code>, almacenamiento local del navegador):
          conserva lo que llevas escrito para que no lo pierdas si cierras la página. No se envía a ningún servidor
          hasta que pulsas Enviar. Se borra solo a los 30 días, o cuando envías la solicitud.
        </li>
        <li>
          <strong>Aviso de cookies</strong> (<code>zarpea-cookies-v1</code>, almacenamiento local): recuerda que ya has
          visto este aviso.
        </li>
        <li>
          <strong>Sesión del área de gestión</strong> (<code>zarpea_session</code>, cookie): solo se crea si eres parte
          del equipo y accedes al backoffice. Es una cookie técnica, firmada, con caducidad de 8 horas.
        </li>
      </ul>

      <h2>Cómo eliminarlos</h2>
      <p>
        Puedes borrar el almacenamiento local y las cookies desde la configuración de tu navegador, en el apartado de
        datos de sitios web. Si lo haces perderás el borrador del formulario, pero nada más.
      </p>

      <p>
        Al tratarse exclusivamente de almacenamiento técnico necesario para prestar el servicio que has solicitado,
        no requiere consentimiento previo conforme al artículo 22.2 de la LSSI-CE. El aviso que ves al entrar es
        meramente informativo.
      </p>
    </LegalLayout>
  );
}
