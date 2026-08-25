import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { modeCopy } from '@/config/mode';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-sand-50 px-6 text-center">
      <p className="font-display text-6xl font-semibold text-brand-200">404</p>
      <h1 className="mt-4 text-2xl">Esta página no existe</h1>
      <p className="mt-3 max-w-md leading-relaxed text-ink-600">
        Puede que el enlace esté mal escrito o que la página haya cambiado de sitio. Desde aquí puedes seguir.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/">Ir al inicio</ButtonLink>
        <ButtonLink href="/presupuesto" variant="outline">
          {modeCopy.ctaShort}
        </ButtonLink>
      </div>
      <p className="mt-8 text-sm text-ink-400">
        <Link href="/contacto" className="underline underline-offset-4">
          ¿Necesitas ayuda? Escríbenos
        </Link>
      </p>
    </div>
  );
}
