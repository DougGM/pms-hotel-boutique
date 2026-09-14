import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/shared/components/Badge';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { ErrorState } from '@/shared/components/ErrorState';
import { Input } from '@/shared/components/Input';
import { LoadingState } from '@/shared/components/LoadingState';
import { Modal } from '@/shared/components/Modal';
import { guestAccountService } from '@/services/guestAccountService';
import type { Charge, GuestAccount } from '@/shared/types/entities';
import { formatCurrency } from '@/shared/utils/currency';

type FormErrors = { description?: string; amount?: string };

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(
    value,
  );
}

function amountToCents(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export function GuestAccountScreen() {
  const { accountId } = useParams<'accountId'>();
  const [account, setAccount] = useState<GuestAccount | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    if (!accountId) {
      setError('No se indicó la cuenta de la estadía.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const accounts = await guestAccountService.getAccounts();
      const selectedAccount = accounts.find(
        (item) => item.id === accountId || item.bookingId === accountId,
      );
      if (!selectedAccount)
        throw new Error('No encontramos una cuenta para la estadía seleccionada.');
      const selectedCharges = await guestAccountService.getChargesByBookingId(
        selectedAccount.bookingId,
      );
      setAccount(selectedAccount);
      setCharges(selectedCharges);
    } catch (cause: unknown) {
      setAccount(null);
      setCharges([]);
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar la cuenta.');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const chargeColumns = useMemo<DataTableColumn<Charge>[]>(
    () => [
      {
        id: 'description',
        header: 'Concepto',
        cell: (charge) => <strong>{charge.description}</strong>,
        sortValue: (charge) => charge.description,
      },
      {
        id: 'date',
        header: 'Fecha',
        cell: (charge) => formatDate(charge.chargedAt),
        sortValue: (charge) => charge.chargedAt.getTime(),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: (charge) => (
          <Badge tone={charge.status === 'posted' ? 'success' : 'warning'}>
            {charge.status === 'posted' ? 'Aplicado' : charge.status}
          </Badge>
        ),
        sortValue: (charge) => charge.status,
      },
      {
        id: 'amount',
        header: 'Importe',
        cell: (charge) => <strong>{formatCurrency(charge.amountCents, charge.currency)}</strong>,
        sortValue: (charge) => charge.amountCents,
      },
    ],
    [],
  );

  function openChargeModal() {
    setDescription('');
    setAmount('');
    setFormErrors({});
    setSaveError(null);
    setFeedback(null);
    setIsModalOpen(true);
  }

  function closeChargeModal() {
    if (!isSaving) setIsModalOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;

    const nextErrors: FormErrors = {};
    const trimmedDescription = description.trim();
    const amountCents = amountToCents(amount);
    if (!trimmedDescription) nextErrors.description = 'Ingresa el concepto del consumo.';
    if (amountCents === null || amountCents < 1) nextErrors.amount = 'Ingresa un monto mayor a 0.';
    setFormErrors(nextErrors);
    setSaveError(null);
    if (Object.keys(nextErrors).length > 0 || amountCents === null) return;

    setIsSaving(true);
    try {
      const charge = await guestAccountService.createCharge({
        booking_id: account.bookingId,
        description: trimmedDescription,
        quantity: 1,
        unit_price_cents: amountCents,
        currency: account.currency,
      });
      setCharges((current) => [...current, charge]);
      setAccount((current) =>
        current ? { ...current, balanceCents: current.balanceCents + charge.amountCents } : current,
      );
      setFeedback(`Consumo de ${formatCurrency(charge.amountCents, charge.currency)} agregado.`);
      setIsModalOpen(false);
    } catch (cause: unknown) {
      setSaveError(cause instanceof Error ? cause.message : 'No fue posible registrar el consumo.');
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="content">
        <LoadingState label="Cargando la cuenta de la estadía…" />
      </section>
    );
  }

  if (error || !account) {
    return (
      <section className="content">
        <ErrorState
          title="No pudimos cargar la cuenta"
          description={error ?? 'La cuenta no está disponible.'}
          onRetry={loadAccount}
        />
      </section>
    );
  }

  return (
    <section className="content">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">Front desk · Cuenta de estadía</span>
          <h1>Cuenta del huésped</h1>
          <p className="muted">Reserva {account.bookingId}</p>
        </div>
        <div className="welcome-actions">
          <button
            className="button primary"
            type="button"
            onClick={openChargeModal}
            disabled={account.status !== 'open'}
          >
            Registrar consumo
          </button>
        </div>
      </div>

      {feedback && (
        <p className="status-pill success" role="status">
          {feedback}
        </p>
      )}

      <div className="metric-grid">
        <article className="metric-card">
          <div>
            <p>Saldo actual</p>
            <h2>{formatCurrency(account.balanceCents, account.currency)}</h2>
            <span>Cuenta {account.status === 'open' ? 'abierta' : 'cerrada'}</span>
          </div>
        </article>
        <article className="metric-card">
          <div>
            <p>Cargos registrados</p>
            <h2>{charges.length}</h2>
            <span>Desde {formatDate(account.openedAt)}</span>
          </div>
        </article>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Desglose de cargos</h3>
            <p>Consumos y servicios aplicados a esta estadía.</p>
          </div>
        </div>
        <DataTable
          columns={chargeColumns}
          data={charges}
          getRowId={(charge) => charge.id}
          caption="Cargos de la estadía"
          emptyMessage="Todavía no hay cargos registrados para esta estadía."
        />
      </div>

      <Modal open={isModalOpen} onClose={closeChargeModal} title="Registrar consumo">
        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Concepto del consumo"
            placeholder="Ej. Minibar, restaurante o spa"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            error={formErrors.description}
            required
            autoFocus
            disabled={isSaving}
          />
          <Input
            label="Monto (GTQ)"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={formErrors.amount}
            required
            disabled={isSaving}
          />
          {saveError && (
            <div className="ui-state ui-state--error" role="alert">
              <p className="ui-state__description">{saveError}</p>
            </div>
          )}
          <div className="modal-foot">
            <button
              className="button secondary"
              type="button"
              onClick={closeChargeModal}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button className="button primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Agregar a la cuenta'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
