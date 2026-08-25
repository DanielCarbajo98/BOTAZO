'use client';

import { useState, useTransition } from 'react';
import { setStatusAction } from '@/app/admin/actions';
import { REQUEST_STATUSES, STATUS_META, type RequestStatus } from '@/lib/request-status';
import { cn } from '@/lib/utils';

export function StatusControl({ requestId, status }: { requestId: string; status: RequestStatus }) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const change = (next: RequestStatus) => {
    const previous = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const result = await setStatusAction(requestId, next);
      if (result.error) {
        setCurrent(previous);
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Estado de la solicitud">
        {REQUEST_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending}
            onClick={() => change(item)}
            aria-pressed={current === item}
            className={cn(
              'rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60',
              current === item
                ? 'bg-ink-900 text-white'
                : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-100',
            )}
          >
            {STATUS_META[item].label}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-coral-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
