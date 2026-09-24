import {
  toDomain as toCashSession,
  type CashSession,
  type CashSessionDto,
} from '@/shared/types/entities/cash-session';
import {
  toDomain as toCashMovement,
  type CashMovement,
  type CashMovementDto,
} from '@/shared/types/entities/cash-movement';
import type { ID } from '@/shared/types/common';
import { cashMovementsDB, cashSessionsDB, usersDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { hydrateCollection, persistCollection } from './mockPersistence';

const cashSessionsStorageKey = 'PMS_CASH_SESSIONS_DB';
const cashMovementsStorageKey = 'PMS_CASH_MOVEMENTS_DB';

function getCashSessionsDB(): CashSessionDto[] {
  return hydrateCollection(cashSessionsStorageKey, cashSessionsDB);
}

function persistCashSessionsDB(): void {
  persistCollection(cashSessionsStorageKey, cashSessionsDB);
}

function getCashMovementsDB(): CashMovementDto[] {
  return hydrateCollection(cashMovementsStorageKey, cashMovementsDB);
}

function persistCashMovementsDB(): void {
  persistCollection(cashMovementsStorageKey, cashMovementsDB);
}

function createCashSessionId(): ID {
  const max = getCashSessionsDB().reduce((currentMax, session) => {
    const match = /^CS-(\d+)$/.exec(session.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `CS-${String(max + 1).padStart(3, '0')}`;
}

function createCashMovementId(): ID {
  const max = getCashMovementsDB().reduce((currentMax, movement) => {
    const match = /^CM-(\d+)$/.exec(movement.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `CM-${String(max + 1).padStart(3, '0')}`;
}

function resolveResponsibleUserId(responsibleUserId?: ID): ID | undefined {
  if (!responsibleUserId) return undefined;
  if (usersDB.some((user) => user.id === responsibleUserId)) return responsibleUserId;
  throw new Error(`No existe el usuario responsable ${responsibleUserId}.`);
}

function getOpenSession(): CashSessionDto | undefined {
  return [...getCashSessionsDB()]
    .sort((left, right) => right.opened_at.localeCompare(left.opened_at))
    .find((session) => session.status === 'open');
}

function calculateExpectedBalanceCents(sessionId: ID): number {
  const session = getCashSessionsDB().find((item) => item.id === sessionId);
  if (!session) throw new Error(`No existe la jornada de caja ${sessionId}.`);
  const movements = getCashMovementsDB().filter(
    (movement) => movement.cash_session_id === sessionId,
  );
  return movements.reduce(
    (sum, movement) =>
      movement.type === 'income' ? sum + movement.amount_cents : sum - movement.amount_cents,
    session.opening_balance_cents,
  );
}

export const cashService = {
  async getSessions(): Promise<CashSession[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las jornadas de caja.');
    return requireCollection(getCashSessionsDB(), 'cashSessionsDB').map(toCashSession);
  },
  async getSessionById(id: ID): Promise<CashSession | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la jornada de caja.');
    const session = getCashSessionsDB().find((item) => item.id === id);
    return session ? toCashSession(session) : undefined;
  },
  async getMovementsBySessionId(sessionId: ID): Promise<CashMovement[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los movimientos de caja.');
    return requireCollection(getCashMovementsDB(), 'cashMovementsDB')
      .filter((item) => item.cash_session_id === sessionId)
      .map(toCashMovement);
  },
  async getMovements(): Promise<CashMovement[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los movimientos de caja.');
    return requireCollection(getCashMovementsDB(), 'cashMovementsDB').map(toCashMovement);
  },
  async openSession(data: {
    openingBalanceCents: number;
    responsibleUserId?: ID;
    notes?: string;
  }): Promise<CashSession> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible abrir la caja.');
    if (getOpenSession()) throw new Error('Ya existe una jornada de caja abierta.');
    if (!Number.isInteger(data.openingBalanceCents) || data.openingBalanceCents < 0) {
      throw new Error('El saldo inicial debe ser un entero mayor o igual a 0.');
    }

    const now = new Date().toISOString();
    const session: CashSessionDto = {
      id: createCashSessionId(),
      opened_by_user_id: resolveResponsibleUserId(data.responsibleUserId),
      opened_at: now,
      opening_balance_cents: data.openingBalanceCents,
      currency: 'GTQ',
      status: 'open',
      notes: data.notes?.trim() || undefined,
      created_at: now,
      updated_at: now,
    };
    getCashSessionsDB().push(session);
    persistCashSessionsDB();
    return toCashSession(session);
  },
  async closeSession(
    data: {
      sessionId?: ID;
      countedBalanceCents?: number;
      responsibleUserId?: ID;
      notes?: string;
    } = {},
  ): Promise<CashSession> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cerrar la caja.');
    const session = data.sessionId
      ? getCashSessionsDB().find((item) => item.id === data.sessionId)
      : getOpenSession();
    if (!session) throw new Error('No existe una jornada de caja abierta.');
    if (session.status !== 'open') throw new Error('La jornada de caja ya esta cerrada.');

    const expected = calculateExpectedBalanceCents(session.id);
    const counted = data.countedBalanceCents ?? expected;
    const now = new Date().toISOString();
    session.status = 'closed';
    session.closed_by_user_id = resolveResponsibleUserId(data.responsibleUserId);
    session.closed_at = now;
    session.expected_balance_cents = expected;
    session.counted_balance_cents = counted;
    session.difference_cents = counted - expected;
    session.notes = data.notes?.trim() || session.notes;
    session.updated_at = now;
    persistCashSessionsDB();
    return toCashSession(session);
  },
  async createMovement(data: {
    type: 'income' | 'expense';
    concept: string;
    amountCents: number;
    responsibleUserId?: ID;
  }): Promise<CashMovement> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible registrar el movimiento de caja.');
    const session = getOpenSession();
    if (!session) throw new Error('No existe una jornada de caja abierta.');
    if (!data.concept.trim()) throw new Error('El movimiento requiere concepto.');
    if (!Number.isInteger(data.amountCents) || data.amountCents <= 0) {
      throw new Error('El monto debe ser un entero mayor a 0.');
    }

    const now = new Date().toISOString();
    const movement: CashMovementDto = {
      id: createCashMovementId(),
      cash_session_id: session.id,
      type: data.type,
      concept: data.concept.trim(),
      amount_cents: data.amountCents,
      currency: 'GTQ',
      responsible_user_id: resolveResponsibleUserId(data.responsibleUserId),
      occurred_at: now,
      created_at: now,
    };
    getCashMovementsDB().unshift(movement);
    persistCashMovementsDB();
    return toCashMovement(movement);
  },
};
export default cashService;
