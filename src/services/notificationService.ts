import type { ID } from '@/shared/types/common';
import { orderService } from './orderService';
import { serviceRequestService } from './serviceRequestService';

/**
 * No tiene colección propia en `data/db.ts` ni contrato de entidad — se
 * compone a partir de `serviceRequestService`+`orderService`. Ver
 * docs/DECISIONES.md: móvil (MOV-21) sí asume una entidad `notification`
 * propia, es una divergencia de contrato pendiente de resolver en sesión
 * de revisión, no algo que este servicio deba imitar.
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  category: 'service' | 'order';
  read: boolean;
  occurredAt: Date;
}

const readNotificationIdsByGuest = new Map<ID, Set<ID>>();

function isNotificationRead(guestId: ID, notification: Notification): boolean {
  return (
    notification.read || (readNotificationIdsByGuest.get(guestId)?.has(notification.id) ?? false)
  );
}

function requestTitle(status: string): string {
  return status === 'completed' ? 'Solicitud completada' : 'Solicitud registrada';
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'pendiente',
  accepted: 'aceptado',
  preparing: 'en preparación',
  ready: 'listo',
  onTheWay: 'en camino',
  delivered: 'entregado',
  rejected: 'rechazado',
  cancelled: 'cancelado',
};

function orderTitle(status: string): string {
  return `Pedido de Room Service ${ORDER_STATUS_LABELS[status] ?? status}`;
}

export const notificationService = {
  async getNotificationsByGuestId(guestId: ID): Promise<Notification[]> {
    const [requests, orders] = await Promise.all([
      serviceRequestService.getRequestsByGuestId(guestId),
      orderService.getOrdersByGuestId(guestId),
    ]);

    const fromRequests: Notification[] = requests.map((request) => ({
      id: `sr-${request.id}`,
      title: requestTitle(request.status),
      message: request.description,
      category: 'service',
      read: request.status === 'completed',
      occurredAt: request.requestedAt,
    }));

    const fromOrders: Notification[] = orders.map((order) => ({
      id: `ord-${order.id}`,
      title: orderTitle(order.status),
      message: `Pedido #${order.id}`,
      category: 'order',
      read:
        order.status === 'delivered' || order.status === 'cancelled' || order.status === 'rejected',
      occurredAt: order.requestedAt,
    }));

    return [...fromRequests, ...fromOrders]
      .map((notification) => ({
        ...notification,
        read: isNotificationRead(guestId, notification),
      }))
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
  },
  async markNotificationRead(guestId: ID, notificationId: ID): Promise<Notification> {
    const notifications = await this.getNotificationsByGuestId(guestId);
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification) throw new Error(`No existe la notificacion ${notificationId}.`);

    const readIds = readNotificationIdsByGuest.get(guestId) ?? new Set<ID>();
    readIds.add(notificationId);
    readNotificationIdsByGuest.set(guestId, readIds);
    return { ...notification, read: true };
  },
  async markAllRead(guestId: ID): Promise<Notification[]> {
    const notifications = await this.getNotificationsByGuestId(guestId);
    const readIds = readNotificationIdsByGuest.get(guestId) ?? new Set<ID>();
    notifications.forEach((notification) => readIds.add(notification.id));
    readNotificationIdsByGuest.set(guestId, readIds);
    return notifications.map((notification) => ({ ...notification, read: true }));
  },
};
export default notificationService;
