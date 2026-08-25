'use client';

import { useId, useMemo, useState } from 'react';
import {
  baggageOptions,
  boardOptions,
  cabinOptions,
  contactChannels,
  dateModes,
  destinationModes,
  extraServices,
  flightPreferences,
  priorities,
  stayLocations,
  stayMustHaves,
  stayTypes,
  stopsOptions,
} from '@/lib/brief';
import { originAirports, regions, suggestDestinations, vibes } from '@/lib/catalog';
import { pricing, site } from '@/config/site';
import { Badge } from '@/components/ui/Badge';
import { ChoiceCard, Chip, Counter, FieldError, Help, Input, Label, Select, Textarea } from '@/components/ui/Field';
import { cn } from '@/lib/utils';
import { monthLabel } from '@/lib/summary';
import type { Errors, WizardState } from '@/components/wizard/state';

export type StepProps = {
  state: WizardState;
  set: <K extends keyof WizardState>(key: K, value: Partial<WizardState[K]>) => void;
  errors: Errors;
};

/* ------------------------------------------------------------------ *
 * Piezas compartidas
 * ------------------------------------------------------------------ */

function Group({
  legend,
  hint,
  children,
  error,
}: {
  legend: string;
  hint?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <fieldset className="mt-8 first:mt-0">
      <legend className="text-sm font-semibold text-ink-800">{legend}</legend>
      {hint ? <p className="mt-1 text-sm text-ink-500">{hint}</p> : null}
      <div className="mt-3">{children}</div>
      <FieldError>{error}</FieldError>
    </fieldset>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-500/20">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-brand-600' : 'bg-ink-200',
        )}
      >
        <span
          className={cn(
            'size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </span>
      <span>
        <span className="block font-medium text-ink-900">{label}</span>
        {description ? <span className="mt-0.5 block text-sm leading-relaxed text-ink-500">{description}</span> : null}
      </span>
    </label>
  );
}

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/* ------------------------------------------------------------------ *
 * 1 · Destino
 * ------------------------------------------------------------------ */

export function DestinoStep({ state, set, errors }: StepProps) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const suggestions = useMemo(() => (query.trim().length >= 2 ? suggestDestinations(query, 6) : []), [query]);
  const { trip } = state;

  const addDestination = (value: string) => {
    const clean = value.trim();
    if (!clean || trip.destinations.includes(clean) || trip.destinations.length >= 5) return;
    set('trip', { destinations: [...trip.destinations, clean] });
    setQuery('');
  };

  return (
    <>
      <Group legend="¿Tienes claro el destino?">
        <div className="grid gap-3">
          {destinationModes.map((mode) => (
            <ChoiceCard
              key={mode.id}
              name="destinationMode"
              value={mode.id}
              icon={mode.emoji}
              title={mode.label}
              description={mode.description}
              selected={trip.destinationMode === mode.id}
              onSelect={() => set('trip', { destinationMode: mode.id })}
            />
          ))}
        </div>
      </Group>

      {trip.destinationMode === 'known' ? (
        <Group legend="¿A dónde?" hint="Puedes añadir hasta 5 destinos y los comparamos entre ellos." error={errors.destinations}>
          <div className="relative">
            <Label htmlFor={inputId}>Ciudad, isla o país</Label>
            <Input
              id={inputId}
              value={query}
              autoComplete="off"
              placeholder="Ej.: Roma, Tailandia, Canarias…"
              invalid={Boolean(errors.destinations)}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addDestination(query);
                }
              }}
            />
            {suggestions.length > 0 ? (
              <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.slug}>
                    <button
                      type="button"
                      onClick={() => addDestination(suggestion.name)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-brand-50"
                    >
                      <span className="font-medium text-ink-900">{suggestion.name}</span>
                      <span className="text-ink-400">{suggestion.country}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <Help>
              ¿No lo encuentras en la lista? Escríbelo igualmente y pulsa Enter: trabajamos con cualquier destino.
            </Help>
          </div>

          {trip.destinations.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {trip.destinations.map((destination) => (
                <li key={destination}>
                  <span className="inline-flex items-center gap-2 rounded-pill bg-brand-600 py-2 pl-4 pr-2 text-sm font-medium text-white">
                    {destination}
                    <button
                      type="button"
                      onClick={() =>
                        set('trip', { destinations: trip.destinations.filter((d) => d !== destination) })
                      }
                      className="grid size-5 place-items-center rounded-full bg-white/20 hover:bg-white/35"
                      aria-label={`Quitar ${destination}`}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Group>
      ) : null}

      {trip.destinationMode !== 'known' ? (
        <>
          <Group legend="¿Por qué zona?" hint="Marca todas las que te valgan." >
            <div className="flex flex-wrap gap-2">
              {regions.map((region) => (
                <Chip
                  key={region.id}
                  selected={trip.regions.includes(region.id)}
                  onToggle={() => set('trip', { regions: toggle(trip.regions, region.id) })}
                >
                  <span aria-hidden className="mr-1.5">
                    {region.emoji}
                  </span>
                  {region.label}
                </Chip>
              ))}
            </div>
          </Group>

          <Group legend="¿Qué tipo de viaje te apetece?" error={errors.vibes}>
            <div className="flex flex-wrap gap-2">
              {vibes.map((vibe) => (
                <Chip
                  key={vibe.id}
                  selected={trip.vibes.includes(vibe.id)}
                  onToggle={() => set('trip', { vibes: toggle(trip.vibes, vibe.id) })}
                >
                  <span aria-hidden className="mr-1.5">
                    {vibe.emoji}
                  </span>
                  {vibe.label}
                </Chip>
              ))}
            </div>
          </Group>

          <Group legend="¿Cuántas horas de vuelo aguantas como máximo?" hint="Déjalo en blanco si te da igual.">
            <Select
              value={trip.maxFlightHours ?? ''}
              onChange={(event) =>
                set('trip', { maxFlightHours: event.target.value ? Number(event.target.value) : null })
              }
              className="max-w-xs"
            >
              <option value="">Me da igual</option>
              <option value="3">Hasta 3 horas</option>
              <option value="5">Hasta 5 horas</option>
              <option value="8">Hasta 8 horas</option>
              <option value="14">Hasta 14 horas</option>
            </Select>
          </Group>
        </>
      ) : null}

      <Group legend="¿Algo que quieras evitar?" hint="Destinos donde ya has estado, sitios que no te apetecen, climas…">
        <Textarea
          value={trip.avoid}
          maxLength={400}
          onChange={(event) => set('trip', { avoid: event.target.value })}
          placeholder="Ej.: nada de calor extremo, ya conocemos París, preferimos evitar vuelos de más de 8 horas…"
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 2 · Origen
 * ------------------------------------------------------------------ */

export function OrigenStep({ state, set, errors }: StepProps) {
  const [custom, setCustom] = useState('');
  const popular = originAirports.filter((airport) => airport.popular);
  const rest = originAirports.filter((airport) => !airport.popular);
  const { origin } = state;

  const toggleAirport = (code: string) => {
    const next = origin.airports.includes(code)
      ? origin.airports.filter((item) => item !== code)
      : [...origin.airports, code].slice(0, 4);
    set('origin', { airports: next });
  };

  return (
    <>
      <Group legend="Aeropuertos de salida" hint="Marca hasta 4. Cuantos más, más opciones tenemos." error={errors.airports}>
        <div className="flex flex-wrap gap-2">
          {popular.map((airport) => (
            <Chip key={airport.iata} selected={origin.airports.includes(airport.iata)} onToggle={() => toggleAirport(airport.iata)}>
              {airport.city} <span className="opacity-60">{airport.iata}</span>
            </Chip>
          ))}
        </div>

        <details className="mt-4 rounded-2xl border border-ink-100 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink-700">
            Ver todos los aeropuertos ({rest.length} más)
          </summary>
          <div className="mt-4 flex flex-wrap gap-2">
            {rest.map((airport) => (
              <Chip key={airport.iata} selected={origin.airports.includes(airport.iata)} onToggle={() => toggleAirport(airport.iata)}>
                {airport.city} <span className="opacity-60">{airport.iata}</span>
              </Chip>
            ))}
          </div>
        </details>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={custom}
            placeholder="¿Sales de otro sitio? Escríbelo aquí"
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const clean = custom.trim();
              if (clean && !origin.airports.includes(clean)) {
                set('origin', { airports: [...origin.airports, clean].slice(0, 4) });
                setCustom('');
              }
            }}
          />
        </div>

        {origin.airports.length > 0 ? (
          <p className="mt-3 text-sm text-ink-500">
            Seleccionados: <span className="font-semibold text-ink-800">{origin.airports.join(', ')}</span>
          </p>
        ) : null}
      </Group>

      <Group legend="Flexibilidad de origen">
        <div className="grid gap-3">
          <Toggle
            checked={origin.nearbyOk}
            onChange={(value) => set('origin', { nearbyOk: value })}
            label="Acepto salir de un aeropuerto cercano si sale mejor"
            description="Sumamos siempre el coste de llegar hasta allí (tren, bus, gasolina y parking) antes de proponértelo."
          />
          {origin.nearbyOk ? (
            <div>
              <Label htmlFor="maxDrive">¿Cuánto estás dispuesto a desplazarte?</Label>
              <Select
                id="maxDrive"
                className="max-w-xs"
                value={origin.maxDriveMinutes ?? 120}
                onChange={(event) => set('origin', { maxDriveMinutes: Number(event.target.value) })}
              >
                <option value={45}>Hasta 45 minutos</option>
                <option value={90}>Hasta 1 h 30</option>
                <option value={120}>Hasta 2 horas</option>
                <option value={240}>Hasta 4 horas</option>
                <option value={600}>Lo que haga falta si el ahorro es grande</option>
              </Select>
            </div>
          ) : null}
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 3 · Fechas
 * ------------------------------------------------------------------ */

function nextMonths(count: number): string[] {
  const list: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 0; i < count; i += 1) {
    list.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return list;
}

export function FechasStep({ state, set, errors }: StepProps) {
  const { dates } = state;
  const months = useMemo(() => nextMonths(15), []);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Group legend="¿Cómo de atadas están tus fechas?">
        <div className="grid gap-3">
          {dateModes.map((mode) => (
            <ChoiceCard
              key={mode.id}
              name="dateMode"
              value={mode.id}
              icon={mode.emoji}
              title={mode.label}
              description={mode.description}
              badge={mode.savings ? <Badge tone="coral">{mode.savings}</Badge> : undefined}
              selected={dates.mode === mode.id}
              onSelect={() => set('dates', { mode: mode.id })}
            />
          ))}
        </div>
      </Group>

      {dates.mode === 'exact' || dates.mode === 'flexible' ? (
        <Group legend="Tus fechas">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Ida</Label>
              <Input
                id="startDate"
                type="date"
                min={today}
                value={dates.startDate}
                invalid={Boolean(errors.startDate)}
                onChange={(event) => set('dates', { startDate: event.target.value })}
              />
              <FieldError>{errors.startDate}</FieldError>
            </div>
            <div>
              <Label htmlFor="endDate">Vuelta</Label>
              <Input
                id="endDate"
                type="date"
                min={dates.startDate || today}
                value={dates.endDate}
                invalid={Boolean(errors.endDate)}
                onChange={(event) => set('dates', { endDate: event.target.value })}
              />
              <FieldError>{errors.endDate}</FieldError>
            </div>
          </div>

          {dates.mode === 'flexible' ? (
            <div className="mt-4">
              <Label htmlFor="flexDays" hint={`±${dates.flexDays} días`}>
                ¿Cuántos días puedes moverte?
              </Label>
              <input
                id="flexDays"
                type="range"
                min={1}
                max={14}
                value={dates.flexDays}
                onChange={(event) => set('dates', { flexDays: Number(event.target.value) })}
                className="w-full accent-[var(--color-brand-600)]"
              />
              <Help>
                Cada día de margen es dinero. Con ±3 días solemos encontrar diferencias importantes en el vuelo.
              </Help>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              Con fechas cerradas trabajamos igual, pero perdemos la palanca que más ahorra. Si puedes mover aunque
              sea un día, cámbialo arriba: te lo agradecerá el bolsillo.
            </p>
          )}
        </Group>
      ) : null}

      {dates.mode === 'month' ? (
        <Group legend="¿Qué meses te vienen bien?" hint="Marca todos los que te valgan." error={errors.months}>
          <div className="flex flex-wrap gap-2">
            {months.map((month) => (
              <Chip
                key={month}
                selected={dates.months.includes(month)}
                onToggle={() => set('dates', { months: toggle(dates.months, month) })}
              >
                {monthLabel(month)}
              </Chip>
            ))}
          </div>
        </Group>
      ) : null}

      {dates.mode === 'month' || dates.mode === 'cheapest' ? (
        <Group legend="Duración" error={errors.nights}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Counter
              id="nights"
              label="Noches"
              value={dates.nights}
              min={1}
              max={60}
              onChange={(value) => set('dates', { nights: value })}
            />
            <Counter
              id="nightsFlex"
              label="Margen"
              sublabel="Noches arriba o abajo"
              value={dates.nightsFlex}
              min={0}
              max={10}
              onChange={(value) => set('dates', { nightsFlex: value })}
            />
          </div>
        </Group>
      ) : null}

      <Group legend="¿Alguna restricción de calendario?" hint="Festivos, vacaciones del trabajo, exámenes, bodas…">
        <Textarea
          value={dates.notes}
          maxLength={400}
          onChange={(event) => set('dates', { notes: event.target.value })}
          placeholder="Ej.: tengo que estar de vuelta antes del 30, no puedo faltar los lunes…"
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 4 · Viajeros
 * ------------------------------------------------------------------ */

export function ViajerosStep({ state, set, errors }: StepProps) {
  const { travelers } = state;

  const setChildren = (count: number) => {
    const ages = [...travelers.childrenAges];
    while (ages.length < count) ages.push(8);
    set('travelers', { childrenAges: ages.slice(0, count) });
  };

  return (
    <>
      <Group legend="¿Cuántos sois?" error={errors.adults || errors.rooms}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Counter
            id="adults"
            label="Adultos"
            sublabel="18 años o más"
            value={travelers.adults}
            min={1}
            max={20}
            onChange={(value) => set('travelers', { adults: value })}
          />
          <Counter
            id="children"
            label="Niños"
            sublabel="De 2 a 17 años"
            value={travelers.childrenAges.length}
            min={0}
            max={10}
            onChange={setChildren}
          />
          <Counter
            id="infants"
            label="Bebés"
            sublabel="Menos de 2 años, en brazos"
            value={travelers.infants}
            min={0}
            max={6}
            onChange={(value) => set('travelers', { infants: value })}
          />
          <Counter
            id="rooms"
            label="Habitaciones"
            value={travelers.rooms}
            min={1}
            max={10}
            onChange={(value) => set('travelers', { rooms: value })}
          />
        </div>
      </Group>

      {travelers.childrenAges.length > 0 ? (
        <Group
          legend="Edad de los niños al viajar"
          hint="Las aerolíneas y los hoteles cobran distinto según la edad exacta, así que esto cambia el precio."
        >
          <div className="flex flex-wrap gap-3">
            {travelers.childrenAges.map((age, index) => (
              <label key={index} className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5">
                <span className="text-sm text-ink-600">Niño {index + 1}</span>
                <Select
                  aria-label={`Edad del niño ${index + 1}`}
                  className="h-9 w-24 px-3 text-sm"
                  value={age}
                  onChange={(event) => {
                    const ages = [...travelers.childrenAges];
                    ages[index] = Number(event.target.value);
                    set('travelers', { childrenAges: ages });
                  }}
                >
                  {Array.from({ length: 16 }, (_, i) => i + 2).map((value) => (
                    <option key={value} value={value}>
                      {value} años
                    </option>
                  ))}
                </Select>
              </label>
            ))}
          </div>
        </Group>
      ) : null}

      <Group
        legend="¿Alguna necesidad especial?"
        hint="Movilidad reducida, cuna, silla de ruedas, alergias alimentarias, asistencia en el aeropuerto…"
      >
        <Textarea
          value={travelers.mobilityNeeds}
          maxLength={300}
          onChange={(event) => set('travelers', { mobilityNeeds: event.target.value })}
          placeholder="Cuéntanoslo y lo tenemos en cuenta al elegir vuelos y hotel."
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 5 · Vuelos
 * ------------------------------------------------------------------ */

export function VuelosStep({ state, set }: StepProps) {
  const { flights } = state;
  return (
    <>
      <Group legend="¿Escalas?">
        <div className="grid gap-3">
          {stopsOptions.map((option) => (
            <ChoiceCard
              key={option.id}
              name="stops"
              value={option.id}
              icon={option.emoji}
              title={option.label}
              description={option.description}
              selected={flights.stops === option.id}
              onSelect={() => set('flights', { stops: option.id })}
            />
          ))}
        </div>
      </Group>

      <Group legend="¿Qué equipaje llevas?" hint="Lo calculamos siempre con el precio final, extras incluidos.">
        <div className="grid gap-3 sm:grid-cols-2">
          {baggageOptions.map((option) => (
            <ChoiceCard
              key={option.id}
              name="baggage"
              value={option.id}
              icon={option.emoji}
              title={option.label}
              description={option.description}
              selected={flights.baggage === option.id}
              onSelect={() => set('flights', { baggage: option.id })}
            />
          ))}
        </div>
      </Group>

      <Group legend="Clase">
        <div className="flex flex-wrap gap-2">
          {cabinOptions.map((option) => (
            <Chip key={option.id} selected={flights.cabin === option.id} onToggle={() => set('flights', { cabin: option.id })}>
              <span aria-hidden className="mr-1.5">
                {option.emoji}
              </span>
              {option.label}
            </Chip>
          ))}
        </div>
      </Group>

      <Group legend="Tus límites" hint="Marca lo que NO estás dispuesto a aguantar.">
        <div className="flex flex-wrap gap-2">
          {flightPreferences.map((preference) => (
            <Chip
              key={preference.id}
              selected={flights.preferences.includes(preference.id)}
              onToggle={() => set('flights', { preferences: toggle(flights.preferences, preference.id) })}
            >
              {preference.label}
            </Chip>
          ))}
        </div>
      </Group>

      <Group legend="Truco avanzado">
        <Toggle
          checked={flights.separateTicketsOk}
          onChange={(value) => set('flights', { separateTicketsOk: value })}
          label="Acepto billetes separados si el ahorro es importante"
          description="Dos billetes de ida sencilla en compañías distintas suelen salir más baratos, pero si el primer vuelo se retrasa el segundo no te espera. Solo lo proponemos con margen de sobra y siempre te avisamos del riesgo."
        />
      </Group>

      <Group legend="¿Algo más sobre los vuelos?">
        <Textarea
          value={flights.notes}
          maxLength={400}
          onChange={(event) => set('flights', { notes: event.target.value })}
          placeholder="Ej.: tengo tarjeta de una aerolínea, viajo con instrumento musical, prefiero pasillo…"
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 6 · Alojamiento
 * ------------------------------------------------------------------ */

export function AlojamientoStep({ state, set, errors }: StepProps) {
  const { stay } = state;
  const skipStay = stay.types.includes('ninguno');

  const toggleType = (type: (typeof stayTypes)[number]['id']) => {
    if (type === 'ninguno') {
      set('stay', { types: skipStay ? ['hotel3'] : ['ninguno'] });
      return;
    }
    const base = stay.types.filter((item) => item !== 'ninguno');
    set('stay', { types: toggle(base, type) });
  };

  return (
    <>
      <Group legend="¿Qué tipo de alojamiento te vale?" hint="Marca todos los que aceptarías." error={errors.types}>
        <div className="grid gap-3 sm:grid-cols-2">
          {stayTypes.map((type) => (
            <ChoiceCard
              key={type.id}
              type="checkbox"
              name="stayType"
              value={type.id}
              icon={type.emoji}
              title={type.label}
              description={type.description}
              selected={stay.types.includes(type.id)}
              onSelect={() => toggleType(type.id)}
            />
          ))}
        </div>
      </Group>

      {!skipStay ? (
        <>
          <Group legend="Régimen">
            <Select
              className="max-w-sm"
              value={stay.board}
              onChange={(event) => set('stay', { board: event.target.value as typeof stay.board })}
            >
              {boardOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Group>

          <Group legend="Ubicación">
            <div className="grid gap-3 sm:grid-cols-2">
              {stayLocations.map((location) => (
                <ChoiceCard
                  key={location.id}
                  name="stayLocation"
                  value={location.id}
                  title={location.label}
                  description={location.description}
                  selected={stay.location === location.id}
                  onSelect={() => set('stay', { location: location.id })}
                />
              ))}
            </div>
          </Group>

          <Group legend="Imprescindibles" hint="Solo lo que de verdad necesitas: cada filtro sube el precio.">
            <div className="flex flex-wrap gap-2">
              {stayMustHaves.map((item) => (
                <Chip
                  key={item.id}
                  selected={stay.mustHaves.includes(item.id)}
                  onToggle={() => set('stay', { mustHaves: toggle(stay.mustHaves, item.id) })}
                >
                  {item.label}
                </Chip>
              ))}
            </div>
          </Group>

          <Group legend="¿Algo más sobre el alojamiento?">
            <Textarea
              value={stay.notes}
              maxLength={400}
              onChange={(event) => set('stay', { notes: event.target.value })}
              placeholder="Ej.: nos da igual la categoría pero queremos buenas opiniones de limpieza…"
            />
          </Group>
        </>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 7 · Extras
 * ------------------------------------------------------------------ */

export function ExtrasStep({ state, set }: StepProps) {
  const { extras } = state;
  return (
    <>
      <Group legend="¿Qué más te buscamos?" hint="Todo lo que marques entra en el presupuesto, desglosado aparte.">
        <div className="grid gap-3 sm:grid-cols-2">
          {extraServices.map((service) => (
            <ChoiceCard
              key={service.id}
              type="checkbox"
              name="extraService"
              value={service.id}
              icon={service.emoji}
              title={service.label}
              description={service.description}
              selected={extras.services.includes(service.id)}
              onSelect={() => set('extras', { services: toggle(extras.services, service.id) })}
            />
          ))}
        </div>
      </Group>

      <Group legend="¿Qué os gusta hacer en un viaje?" hint="Nos ayuda a elegir zona, hotel y actividades.">
        <div className="flex flex-wrap gap-2">
          {vibes.map((vibe) => (
            <Chip
              key={vibe.id}
              selected={extras.interests.includes(vibe.id)}
              onToggle={() => set('extras', { interests: toggle(extras.interests, vibe.id) })}
            >
              <span aria-hidden className="mr-1.5">
                {vibe.emoji}
              </span>
              {vibe.label}
            </Chip>
          ))}
        </div>
      </Group>

      <Group legend="Cuéntanos lo que quieras" hint="Cuanto más sepamos, mejor afinamos. Aquí no sobra nada.">
        <Textarea
          value={extras.notes}
          maxLength={600}
          className="min-h-36"
          onChange={(event) => set('extras', { notes: event.target.value })}
          placeholder="Ej.: es nuestro aniversario, viajamos con la abuela, queremos un día de buceo, nos gustaría ver auroras…"
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 8 · Presupuesto
 * ------------------------------------------------------------------ */

export function PresupuestoStep({ state, set }: StepProps) {
  const { budget } = state;
  return (
    <>
      <Group legend="¿Cuánto te querrías gastar por persona?" hint="Todo incluido: vuelo, hotel y extras. Déjalo en blanco si no lo tienes claro.">
        <div className="relative max-w-xs">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={50000}
            step={50}
            className="pr-12"
            value={budget.perPerson ?? ''}
            onChange={(event) =>
              set('budget', { perPerson: event.target.value ? Number(event.target.value) : null })
            }
            placeholder="600"
          />
          <span aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400">
            €
          </span>
        </div>
        <div className="mt-3">
          <Toggle
            checked={budget.hardLimit}
            onChange={(value) => set('budget', { hardLimit: value })}
            label="Es un límite estricto"
            description="Si lo marcas, no te enviaremos ninguna opción que lo supere."
          />
        </div>
      </Group>

      <Group legend="Si hubiera que elegir, ¿qué prefieres?">
        <div className="grid gap-3">
          {priorities.map((priority) => (
            <ChoiceCard
              key={priority.id}
              name="priority"
              value={priority.id}
              icon={priority.emoji}
              title={priority.label}
              description={priority.description}
              selected={budget.priority === priority.id}
              onSelect={() => set('budget', { priority: priority.id })}
            />
          ))}
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 9 · Contacto
 * ------------------------------------------------------------------ */

export function ContactoStep({ state, set, errors }: StepProps) {
  const { contact } = state;
  return (
    <>
      <Group legend="Tus datos">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              autoComplete="given-name"
              value={contact.name}
              invalid={Boolean(errors.name)}
              onChange={(event) => set('contact', { name: event.target.value })}
              placeholder="Cómo te llamamos"
            />
            <FieldError>{errors.name}</FieldError>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={contact.email}
              invalid={Boolean(errors.email)}
              onChange={(event) => set('contact', { email: event.target.value })}
              placeholder="tucorreo@ejemplo.com"
            />
            <FieldError>{errors.email}</FieldError>
          </div>
          <div>
            <Label htmlFor="phone" optional={contact.channel === 'email'}>
              Teléfono
            </Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={contact.phone}
              invalid={Boolean(errors.phone)}
              onChange={(event) => set('contact', { phone: event.target.value })}
              placeholder="+34 600 00 00 00"
            />
            <FieldError>{errors.phone}</FieldError>
          </div>
          <div>
            <Label htmlFor="bestTime" optional>
              ¿Cuándo te viene bien que te escribamos?
            </Label>
            <Input
              id="bestTime"
              value={contact.bestTime}
              onChange={(event) => set('contact', { bestTime: event.target.value })}
              placeholder="Ej.: por las tardes"
            />
          </div>
        </div>
      </Group>

      <Group legend="¿Por dónde prefieres que te contestemos?">
        <div className="flex flex-wrap gap-2">
          {contactChannels.map((channel) => (
            <Chip
              key={channel.id}
              selected={contact.channel === channel.id}
              onToggle={() => set('contact', { channel: channel.id })}
            >
              <span aria-hidden className="mr-1.5">
                {channel.emoji}
              </span>
              {channel.label}
            </Chip>
          ))}
        </div>
      </Group>

      <Group
        legend="¿Tienes prisa?"
        hint={`Solo si sales pronto o persigues una tarifa que se agota. Si no, el presupuesto normal te llega igual de bien y es gratis.`}
      >
        <Toggle
          checked={contact.priority}
          onChange={(value) => set('contact', { priority: value })}
          label={`Quiero respuesta prioritaria (${pricing.priority.fee} €)`}
          description={`Presupuesto en ${pricing.priority.hours} horas en lugar de ${site.contact.responseTimeHours}, y hasta ${pricing.priority.revisions} rondas de cambios. Se descuenta de la tarifa si acabas reservando, y si no cumplimos el plazo te lo devolvemos.`}
        />
      </Group>

      <Group legend="Permisos" error={errors.privacyAccepted}>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4">
            <input
              type="checkbox"
              className="mt-1 size-5 accent-[var(--color-brand-600)]"
              checked={contact.privacyAccepted}
              onChange={(event) => set('contact', { privacyAccepted: event.target.checked })}
            />
            <span className="text-sm leading-relaxed text-ink-700">
              He leído y acepto la{' '}
              <a href="/privacidad" target="_blank" className="font-semibold text-brand-800 underline underline-offset-2">
                política de privacidad
              </a>
              . Autorizo el tratamiento de mis datos para preparar y gestionar mi presupuesto.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4">
            <input
              type="checkbox"
              className="mt-1 size-5 accent-[var(--color-brand-600)]"
              checked={contact.marketingOptIn}
              onChange={(event) => set('contact', { marketingOptIn: event.target.checked })}
            />
            <span className="text-sm leading-relaxed text-ink-700">
              Quiero recibir chollos y avisos de precio. Como máximo un correo a la semana y te das de baja con un
              clic. <span className="text-ink-400">(Opcional)</span>
            </span>
          </label>
        </div>
      </Group>
    </>
  );
}
