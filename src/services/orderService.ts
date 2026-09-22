import { toDomain as toOrder, type Order } from '@/shared/types/entities/order';
import type { ID } from '@/shared/types/common';
import { bookingsDB, ordersDB, productsDB, roomsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

function nextOrderId(): string {
  const max = ordersDB.reduce((currentMax, order) => {
    const match = /^ORD-(\d+)$/.exec(order.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `ORD-${String(max + 1).padStart(3, '0')}`;
}

function assertOrderExists(id: ID) {
  const order = ordersDB.find((item) => item.id === id);
  if (!order) throw new Error(`No existe el pedido ${id}.`);
  return order;
}

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
  async createOrder(data: {
    bookingId: ID;
    roomId: ID;
    guestId: ID;
    items: { productId: ID; quantity: number }[];
    notes?: string;
  }): Promise<Order> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear el pedido.');

    const booking = bookingsDB.find((item) => item.id === data.bookingId);
    if (!booking) throw new Error(`No existe la reserva ${data.bookingId}.`);
    if (booking.guest_id !== data.guestId) {
      throw new Error('La reserva no pertenece al huesped autenticado.');
    }
    if (booking.room_id !== data.roomId) {
      throw new Error('La habitacion no coincide con la reserva activa.');
    }
    const room = roomsDB.find((item) => item.id === data.roomId);
    if (!room) throw new Error(`No existe la habitacion ${data.roomId}.`);
    if (data.items.length === 0) throw new Error('Agrega al menos un producto al pedido.');

    const items = data.items.map((item) => {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new Error('La cantidad del producto debe ser mayor a cero.');
      }
      const product = productsDB.find((productItem) => productItem.id === item.productId);
      if (!product || !product.active) {
        throw new Error(`El producto ${item.productId} no esta disponible.`);
      }
      return {
        product_id: product.id,
        quantity: item.quantity,
        unit_price_cents: product.price_cents,
      };
    });

    const now = new Date().toISOString();
    const order = {
      id: nextOrderId(),
      booking_id: booking.id,
      room_id: room.id,
      guest_id: data.guestId,
      items,
      status: 'pending' as const,
      notes: data.notes?.trim() || undefined,
      currency: booking.currency,
      requested_at: now,
      created_at: now,
      updated_at: now,
    };
    ordersDB.unshift(order);
    return toOrder(order);
  },
  async cancelOrder(orderId: ID, guestId?: ID): Promise<Order> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cancelar el pedido.');

    const order = assertOrderExists(orderId);
    if (guestId && order.guest_id !== guestId) {
      throw new Error('El pedido no pertenece al huesped autenticado.');
    }
    if (order.status !== 'pending' && order.status !== 'accepted') {
      throw new Error('Este pedido ya no se puede cancelar.');
    }

    order.status = 'cancelled';
    order.updated_at = new Date().toISOString();
    return toOrder(order);
  },
};
export default orderService;
