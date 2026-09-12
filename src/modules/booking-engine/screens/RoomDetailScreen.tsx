import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { roomService } from '@/services/roomService';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import type { Rate } from '@/shared/types/entities/rate';
import type { RoomFeature } from '@/shared/types/entities/room-feature';
import type { RoomType } from '@/shared/types/entities/room-type';
import { formatCurrency } from '@/shared/utils/currency';
import { calculateNights, formatDateGT } from '@/shared/utils/date';
import './booking-engine.css';

type DetailStatus = 'loading' | 'success' | 'error';

type DetailState = {
  roomType?: RoomType;
  features: RoomFeature[];
  rates: Rate[];
};

function dateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function isValidStay(checkIn: Date | null, checkOut: Date | null): checkIn is Date {
  if (!checkIn || !checkOut) return false;
  try {
    return calculateNights(checkIn, checkOut) > 0;
  } catch {
    return false;
  }
}

function findRateForStay(
  rates: Rate[],
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
): Rate | undefined {
  const nights = calculateNights(checkIn, checkOut);

  return rates
    .filter(
      (rate) =>
        rate.active &&
        rate.roomTypeId === roomTypeId &&
        dateKey(rate.validFrom) <= dateKey(checkIn) &&
        dateKey(rate.validTo) >= dateKey(checkOut) &&
        rate.minimumNights <= nights,
    )
    .sort((left, right) => dateKey(right.validFrom).localeCompare(dateKey(left.validFrom)))[0];
}

function findFallbackRate(rates: Rate[], roomTypeId: string): Rate | undefined {
  return rates
    .filter((rate) => rate.active && rate.roomTypeId === roomTypeId)
    .sort((left, right) => left.priceCents - right.priceCents)[0];
}

export function RoomDetailScreen() {
  const navigate = useNavigate();
  const { roomTypeId } = useParams<'roomTypeId'>();
  const [searchParams] = useSearchParams();
  const checkIn = parseDateKey(searchParams.get('checkIn'));
  const checkOut = parseDateKey(searchParams.get('checkOut'));

  const [status, setStatus] = useState<DetailStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState>({ features: [], rates: [] });

  const loadDetail = useCallback(async () => {
    if (!roomTypeId) return;

    setStatus('loading');
    setError(null);

    try {
      const [roomTypes, features, rates] = await Promise.all([
        roomService.getRoomTypes(),
        roomService.getRoomFeatures(),
        roomService.getRates(),
      ]);

      setDetail({
        roomType: roomTypes.find((roomType) => roomType.id === roomTypeId && roomType.active),
        features,
        rates,
      });
      setStatus('success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar el detalle.');
      setStatus('error');
    }
  }, [roomTypeId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const featureNames = useMemo(() => {
    if (!detail.roomType) return [];
    const featureById = new Map(detail.features.map((feature) => [feature.id, feature.name]));

    return detail.roomType.roomFeatureIds.map(
      (featureId) => featureById.get(featureId) ?? featureId,
    );
  }, [detail.features, detail.roomType]);

  if (status === 'loading') {
    return (
      <section className="content booking-detail-page">
        <LoadingState label="Cargando detalle de habitacion..." />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="content booking-detail-page">
        <ErrorState description={error ?? 'Intenta nuevamente.'} onRetry={loadDetail} />
      </section>
    );
  }

  if (!detail.roomType) {
    return (
      <section className="content booking-detail-page">
        <EmptyState
          title="Habitacion no encontrada"
          description="El tipo de habitacion solicitado no existe o no esta disponible."
          action={
            <Link className="ui-action" to="/">
              Buscar disponibilidad
            </Link>
          }
        />
      </section>
    );
  }

  const hasValidDates = isValidStay(checkIn, checkOut);
  const rate = hasValidDates
    ? findRateForStay(detail.rates, detail.roomType.id, checkIn, checkOut!)
    : findFallbackRate(detail.rates, detail.roomType.id);
  const nights = hasValidDates ? calculateNights(checkIn, checkOut!) : 0;
  const totalAmount = rate && hasValidDates ? rate.priceCents * nights : undefined;
  const bookingUrl = hasValidDates
    ? `/booking/new?roomTypeId=${detail.roomType.id}&checkIn=${dateKey(checkIn)}&checkOut=${dateKey(checkOut!)}`
    : `/booking/new?roomTypeId=${detail.roomType.id}`;

  return (
    <section className="content booking-detail-page">
      <div className="booking-detail-heading">
        <div>
          <p className="eyebrow">Detalle de habitacion</p>
          <h1>{detail.roomType.name}</h1>
          <p>{detail.roomType.description}</p>
        </div>
        <Link className="ui-action" to="/">
          Cambiar fechas
        </Link>
      </div>

      <div className="booking-detail-layout">
        <div className="booking-detail-main">
          <div className="booking-photo-grid" aria-label="Fotografias de la habitacion">
            <div className="booking-photo-card">
              <span>{detail.roomType.name}</span>
            </div>
            <div className="booking-photo-card">
              <span>Descanso</span>
            </div>
            <div className="booking-photo-card">
              <span>Ambiente</span>
            </div>
          </div>

          <article className="booking-detail-card">
            <h2>Caracteristicas</h2>
            <div className="booking-roomtype-meta">
              <span>{detail.roomType.capacity} huespedes</span>
              <span>{detail.roomType.bedConfiguration}</span>
              <span>Codigo {detail.roomType.code}</span>
            </div>
            <div className="booking-feature-list">
              {featureNames.map((featureName) => (
                <Badge key={featureName} tone="info">
                  {featureName}
                </Badge>
              ))}
            </div>
          </article>
        </div>

        <aside className="booking-rate-card">
          <h2>Tarifa</h2>
          {rate ? (
            <>
              <p className="booking-rate-name">{rate.name}</p>
              <p className="booking-rate-price">{formatCurrency(rate.priceCents, rate.currency)}</p>
              <p className="booking-muted">por noche</p>
            </>
          ) : (
            <p className="booking-muted">No hay tarifa activa para este tipo de habitacion.</p>
          )}

          <div className="booking-rate-summary">
            <div>
              <span>Entrada</span>
              <strong>{hasValidDates ? formatDateGT(checkIn) : 'Por definir'}</strong>
            </div>
            <div>
              <span>Salida</span>
              <strong>{hasValidDates ? formatDateGT(checkOut!) : 'Por definir'}</strong>
            </div>
            <div>
              <span>Noches</span>
              <strong>{hasValidDates ? nights : 'Por definir'}</strong>
            </div>
            <div>
              <span>Total estimado</span>
              <strong>
                {totalAmount !== undefined
                  ? formatCurrency(totalAmount, rate?.currency)
                  : 'Por definir'}
              </strong>
            </div>
          </div>

          <Button
            disabled={!rate}
            onClick={() => {
              navigate(bookingUrl);
            }}
          >
            Reservar
          </Button>
        </aside>
      </div>
    </section>
  );
}
