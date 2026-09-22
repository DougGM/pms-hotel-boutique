import { toDomain as toOrder, type Order, type OrderDto } from '@/shared/types/entities/order';
import type { ID } from '@/shared/types/common';
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from '@/shared/constants/statuses';
import { bookingsDB, ordersDB, productsDB, roomsDB, usersDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { guestAccountService } from './guestAccountService';
import { hydrateCollection, persistCollection } from './mockPersistence';

const ordersStorageKey = 'PMS_ORDERS_DB';

function getOrdersDB(): OrderDto[] {
  return hydrateCollection(ordersStorageKey, ordersDB);
}

function persistOrdersDB(): void {
  persistCollection(ordersStorageKey, ordersDB);
}

function nextOrderId(): string {
  const max = getOrdersDB().reduce((currentMax, order) => {
    const match = /^ORD-(\d+)$/.exec(order.id);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `ORD-${String(max + 1).padStart(3, '0')}`;
}

function assertOrderExists(id: ID) {
  const order = getOrdersDB().find((item) => item.id === id);
  if (!order) throw new Error(`No existe el pedido ${id}.`);
  return order;
}

function ensureValidTransition(current: OrderStatus, next: OrderStatus): void {
  if (current === next) return;
  if (!ORDER_STATUS_TRANSITIONS[current].includes(next)) {
    throw new Error(`Transicion invalida de pedido: ${current} -> ${next}.`);
  }
}

function toDtoStatus(status: OrderStatus): OrderDto['status'] {
  return status === 'onTheWay' ? 'on_the_way' : status;
}

function validateChargeCreatorId(createdByUserId?: ID): ID | undefined {
  if (!createdByUserId) return undefined;
  const user = usersDB.find((item) => item.id === createdByUserId);
  if (!user) throw new Error(`No existe el usuario operativo ${createdByUserId}.`);
  return user.id;
}

function ensureRoomServiceCharge(order: OrderDto, createdByUserId?: ID): Promise<ID> {
  const existingChargeId = order.charge_id;
  if (existingChargeId) return Promise.resolve(existingChargeId);

  const totalCents = order.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0,
  );
  const validCreatedByUserId = validateChargeCreatorId(createdByUserId);
  return guestAccountService
    .createCharge({
      booking_id: order.booking_id,
      description: `Room service - Pedido ${order.id}`,
      quantity: 1,
      unit_price_cents: totalCents,
      currency: order.currency,
      category: 'consumption',
      created_by_user_id: validCreatedByUserId,
    })
    .then((charge) => charge.id);
}

export const orderService = {
  async getOrders(): Promise<Order[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pedidos.');
    return requireCollection(getOrdersDB(), 'ordersDB').map(toOrder);
  },
  async getOrderById(id: ID): Promise<Order | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar el pedido.');
    const order = getOrdersDB().find((item) => item.id === id);
    return order ? toOrder(order) : undefined;
  },
  async getOrdersByGuestId(guestId: ID): Promise<Order[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pedidos.');
    return requireCollection(getOrdersDB(), 'ordersDB')
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
    getOrdersDB().unshift(order);
    persistOrdersDB();
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
    persistOrdersDB();
    return toOrder(order);
  },
  async updateOrderStatus(
    orderId: ID,
    status: OrderStatus,
    notes?: string,
    options: { createdByUserId?: ID } = {},
  ): Promise<Order> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar el pedido.');

    const order = assertOrderExists(orderId);
    const current = toOrder(order).status;
    ensureValidTransition(current, status);
    if (status === 'delivered') {
      order.charge_id = await ensureRoomServiceCharge(order, options.createdByUserId);
    }
    order.status = toDtoStatus(status);
    if (notes !== undefined) order.notes = notes.trim() || undefined;
    order.updated_at = new Date().toISOString();
    persistOrdersDB();
    return toOrder(order);
  },
  async updateOrderNotes(orderId: ID, notes: string): Promise<Order> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible guardar la observacion del pedido.');

    const order = assertOrderExists(orderId);
    order.notes = notes.trim() || undefined;
    order.updated_at = new Date().toISOString();
    persistOrdersDB();
    return toOrder(order);
  },
};
export default orderService;
