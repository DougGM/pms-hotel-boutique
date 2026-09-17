import { toDomain as toOrder, type Order } from '@/shared/types/entities/order';
import type { ID } from '@/shared/types/common';
import { ordersDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

export const orderService = {
  async getOrders(): Promise<Order[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pedidos.');
    return requireCollection(ordersDB, 'ordersDB').map(toOrder);
  },
  async getOrderById(id: ID): Promise<Order | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el pedido.');
    const order = ordersDB.find((item) => item.id === id);
    return order ? toOrder(order) : undefined;
  },
  async getOrdersByGuestId(guestId: ID): Promise<Order[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pedidos.');
    return requireCollection(ordersDB, 'ordersDB')
      .filter((item) => item.guest_id === guestId)
      .map(toOrder);
  },
};
export default orderService;
