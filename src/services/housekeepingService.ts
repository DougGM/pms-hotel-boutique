import type { ID } from '@/shared/types/common';
import type { RoomHousekeepingStatus } from '@/shared/constants/statuses';
import { mockUtils, simulateLatency } from './mockUtils';
import { hydrateRecord, persistRecord } from './mockPersistence';

export type HousekeepingChecklistItem = {
  label: string;
  done: boolean;
};

export type HousekeepingTaskSnapshot = {
  roomId: ID;
  status: RoomHousekeepingStatus;
  startTime: string | null;
  endTime: string | null;
  duration: string | null;
  checklist: HousekeepingChecklistItem[];
  updatedAt: string;
};

export type HousekeepingHistoryRecord = {
  id: ID;
  roomId: ID;
  roomNumber: string;
  taskType: string;
  startedAt: string;
  completedAt: string;
  duration: string;
};

type HousekeepingStore = {
  tasks: HousekeepingTaskSnapshot[];
  history: HousekeepingHistoryRecord[];
};

const storageKey = 'PMS_HOUSEKEEPING_STORE';
const store: HousekeepingStore = hydrateRecord<HousekeepingStore>(storageKey, {
  tasks: [],
  history: [],
});

function persistStore(): void {
  persistRecord(storageKey, store);
}

function upsertTask(roomId: ID, update: Omit<HousekeepingTaskSnapshot, 'roomId' | 'updatedAt'>) {
  const next: HousekeepingTaskSnapshot = {
    roomId,
    ...update,
    updatedAt: new Date().toISOString(),
  };
  const index = store.tasks.findIndex((item) => item.roomId === roomId);
  if (index >= 0) store.tasks[index] = next;
  else store.tasks.push(next);
  persistStore();
  return next;
}

export const housekeepingService = {
  async getTaskSnapshots(): Promise<HousekeepingTaskSnapshot[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las tareas de limpieza.');
    return store.tasks.map((item) => ({
      ...item,
      checklist: item.checklist.map((task) => ({ ...task })),
    }));
  },
  async getHistory(): Promise<HousekeepingHistoryRecord[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el historial de limpieza.');
    return [...store.history];
  },
  async saveTaskSnapshot(
    roomId: ID,
    update: Omit<HousekeepingTaskSnapshot, 'roomId' | 'updatedAt'>,
  ): Promise<HousekeepingTaskSnapshot> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible guardar la tarea de limpieza.');
    return upsertTask(roomId, update);
  },
  async saveChecklist(
    roomId: ID,
    checklist: HousekeepingChecklistItem[],
    current: Omit<HousekeepingTaskSnapshot, 'roomId' | 'updatedAt' | 'checklist'>,
  ): Promise<HousekeepingTaskSnapshot> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible guardar el checklist de limpieza.');
    return upsertTask(roomId, {
      ...current,
      checklist: checklist.map((item) => ({ ...item })),
    });
  },
  async recordHistory(
    record: Omit<HousekeepingHistoryRecord, 'id'>,
  ): Promise<HousekeepingHistoryRecord> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible registrar el historial de limpieza.');

    const entry: HousekeepingHistoryRecord = {
      ...record,
      id: `HKH-${Date.now()}`,
    };
    store.history.unshift(entry);
    persistStore();
    return entry;
  },
};

export default housekeepingService;
