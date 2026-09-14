import { toDomain as toCashSession, type CashSession } from '@/shared/types/entities/cash-session';
import {
  toDomain as toCashMovement,
  type CashMovement,
} from '@/shared/types/entities/cash-movement';
import type { ID } from '@/shared/types/common';
import { cashMovementsDB, cashSessionsDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';

export const cashService = {
  async getSessions(): Promise<CashSession[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las jornadas de caja.');
    return cashSessionsDB.map(toCashSession);
  },
  async getSessionById(id: ID): Promise<CashSession | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la jornada de caja.');
    const session = cashSessionsDB.find((item) => item.id === id);
    return session ? toCashSession(session) : undefined;
  },
  async getMovementsBySessionId(sessionId: ID): Promise<CashMovement[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los movimientos de caja.');
    return cashMovementsDB.filter((item) => item.cash_session_id === sessionId).map(toCashMovement);
  },
};
export default cashService;
