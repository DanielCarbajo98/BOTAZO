import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { repo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'referencia',
  'estado',
  'creada',
  'nombre',
  'email',
  'telefono',
  'canal',
  'destino',
  'fechas',
  'viajeros',
  'presupuesto_persona',
  'estimacion_min',
  'estimacion_max',
] as const;

/** Escapa un campo CSV y neutraliza fórmulas (=, +, -, @) para abrirlo en Excel sin riesgo. */
function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const requests = repo().listRequests({ limit: 200 });

  const rows = requests.map((request) =>
    [
      request.reference,
      request.status,
      request.created_at,
      request.contact_name,
      request.contact_email,
      request.contact_phone ?? '',
      request.contact_channel,
      request.destination_summary,
      request.dates_summary,
      request.travelers,
      request.budget_per_person ?? '',
      request.estimate?.low ?? '',
      request.estimate?.high ?? '',
    ]
      .map(csvCell)
      .join(','),
  );

  // BOM para que Excel en Windows reconozca el UTF-8.
  const csv = `﻿${COLUMNS.join(',')}\n${rows.join('\n')}`;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="solicitudes-${date}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
