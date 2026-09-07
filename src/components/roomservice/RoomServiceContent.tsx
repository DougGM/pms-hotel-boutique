import { useState } from 'react';
import {
  ArrowRight, Ban, Check, ChevronDown, ClipboardList, Clock, DoorOpen,
  FileText, Package, Plus, Search, ShieldCheck, Utensils, Wallet, X,
} from 'lucide-react';
import type { OrderStatus, RoomServiceOrder } from '@/app/App';

const money = (n: number) => `$${n.toLocaleString('es-MX')}`;

const statusClass = (status: OrderStatus): string =>
  status === 'Pendiente' ? 'warning'
  : status === 'Aceptado' || status === 'En preparación' ? 'info'
  : status === 'Listo' || status === 'En camino' ? 'gold'
  : status === 'Entregado' ? 'success'
  : 'terracotta';

const orderTotal = (order: RoomServiceOrder) =>
  order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

type MenuItem = { name: string; description: string; price: number; category: string };
const menuItems: MenuItem[] = [
  { name: 'Desayuno Aurora', description: 'Huevos benedictinos, pan brioche, fruta de temporada', price: 280, category: 'Desayunos' },
  { name: 'Club sandwich', description: 'Pavo, tocino, huevo, lechuga, tomate', price: 240, category: 'Almuerzos' },
  { name: 'Pasta al pesto', description: 'Pasta fresca, pesto de albahaca, parmesano', price: 320, category: 'Cenas' },
  { name: 'Café americano', description: 'Café de grano recién molido', price: 65, category: 'Bebidas' },
  { name: 'Agua mineral', description: 'Con o sin gas · 500 ml', price: 45, category: 'Bebidas' },
  { name: 'Jugo verde', description: 'Espinaca, manzana, jengibre, limón', price: 110, category: 'Bebidas' },
  { name: 'Tabla de quesos', description: 'Selección de quesos artesanales, frutos secos, miel', price: 390, category: 'Botanas' },
  { name: 'Sopa del día', description: 'Consulta con el chef la opción del día', price: 180, category: 'Cenas' },
];

type InventoryItem = { name: string; stock: number; unit: string; status: 'Disponible' | 'Bajo' | 'Agotado' };
const inventoryItems: InventoryItem[] = [
  { name: 'Café de grano', stock: 3, unit: 'kg', status: 'Disponible' },
  { name: 'Leche entera', stock: 8, unit: 'L', status: 'Disponible' },
  { name: 'Pan brioche', stock: 4, unit: 'piezas', status: 'Disponible' },
  { name: 'Huevos', stock: 12, unit: 'docenas', status: 'Disponible' },
  { name: 'Pasta fresca', stock: 2, unit: 'kg', status: 'Bajo' },
  { name: 'Queso parmesano', stock: 1, unit: 'kg', status: 'Bajo' },
  { name: 'Albahaca fresca', stock: 0, unit: 'kg', status: 'Agotado' },
  { name: 'Jugo de naranja', stock: 6, unit: 'L', status: 'Disponible' },
  { name: 'Agua mineral', stock: 24, unit: 'botellas', status: 'Disponible' },
];

const menuCategories = ['Desayunos', 'Almuerzos', 'Cenas', 'Bebidas', 'Botanas'];

const inventoryStatusClass = (status: string) =>
  status === 'Disponible' ? 'success' : status === 'Bajo' ? 'warning' : 'terracotta';

export function RoomServiceContent({
  nav, orders, selectedOrder, onSelectOrder, onCloseOrder,
  onUpdateStatus, onUpdateNote, onReject, onCancel, onCharge, onAction,
  search, setSearch, filter, setFilter,
}: {
  nav: string;
  orders: RoomServiceOrder[];
  selectedOrder: RoomServiceOrder | null;
  onSelectOrder: (id: number) => void;
  onCloseOrder: () => void;
  onUpdateStatus: (id: number, status: OrderStatus) => void;
  onUpdateNote: (id: number, note: string) => void;
  onReject: (id: number, reason: string) => void;
  onCancel: (id: number, reason: string) => void;
  onCharge: (id: number) => void;
  onAction: (msg: string) => void;
  search: string;
  setSearch: (v: string) => void;
  filter: 'Todos' | OrderStatus;
  setFilter: (v: 'Todos' | OrderStatus) => void;
}) {
  const [rejectionOrderId, setRejectionOrderId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const activeOrders = orders.filter((o) => !['Entregado', 'Rechazado', 'Cancelado'].includes(o.status));
  const completedOrders = orders.filter((o) => ['Entregado', 'Rechazado', 'Cancelado'].includes(o.status));

  const nextAction = (order: RoomServiceOrder) => {
    switch (order.status) {
      case 'Pendiente':
        return <>
          <button className="button small primary" onClick={() => onUpdateStatus(order.id, 'Aceptado')}>Aceptar pedido</button>
          <button className="button small secondary" onClick={() => setRejectionOrderId(order.id)}>Rechazar</button>
        </>;
      case 'Aceptado':
        return <button className="button small primary" onClick={() => onUpdateStatus(order.id, 'En preparación')}>En preparación</button>;
      case 'En preparación':
        return <button className="button small primary" onClick={() => onUpdateStatus(order.id, 'Listo')}>Marcar listo</button>;
      case 'Listo':
        return <button className="button small primary" onClick={() => onUpdateStatus(order.id, 'En camino')}>En camino</button>;
      case 'En camino':
        return <button className="button small primary" onClick={() => onUpdateStatus(order.id, 'Entregado')}>Entregado</button>;
      default:
        return null;
    }
  };

  const renderOrder = (order: RoomServiceOrder) => (
    <article className="rs-order-card" key={order.id}>
      <div className="rs-order-head">
        <div>
          <span className="rs-order-number">Pedido #{order.id}</span>
          <h3>Habitación {order.room} · {order.guest}</h3>
          <p>Recibido a las {order.time}</p>
        </div>
        <span className={`status-pill ${statusClass(order.status)}`}>{order.status}</span>
      </div>
      <div className="rs-order-items">
        {order.items.map((item, i) => (
          <div key={i}>
            <span><strong>{item.quantity}×</strong> {item.name}</span>
            <span>{money(item.quantity * item.price)}</span>
          </div>
        ))}
      </div>
      <div className="rs-order-foot">
        <strong>{money(orderTotal(order))}</strong>
        {order.note && <span className="rs-note"><ClipboardList size={13} /> {order.note}</span>}
        {order.rejectionReason && <span className="rs-note" style={{ background: 'var(--color-legacy-f2d6cd)', color: 'var(--color-terracotta)' }}><Ban size={13} /> {order.rejectionReason}</span>}
        {order.charged && <span className="rs-charged"><Check size={13} /> Cargado a habitación</span>}
        <div className="rs-order-actions">
          {nextAction(order)}
          {!['Entregado', 'Rechazado', 'Cancelado'].includes(order.status) && (
            <button className="button small secondary" onClick={() => setCancelOrderId(order.id)}>Cancelar</button>
          )}
          {order.status === 'Entregado' && !order.charged && (
            <button className="button small primary" onClick={() => onCharge(order.id)}>
              <Wallet size={14} /> Cargar a habitación
            </button>
          )}
          <button className="button small secondary" onClick={() => onSelectOrder(order.id)}>Ver detalle</button>
        </div>
      </div>
    </article>
  );

  const filteredActive = activeOrders.filter((order) => {
    const matchesSearch = `${order.id} ${order.room} ${order.guest} ${order.items.map((i) => i.name).join(' ')}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'Todos' || order.status === filter;
    return matchesSearch && matchesFilter;
  });

  /* ---------- Pedidos activos ---------- */
  if (nav === 'Pedidos activos') {
    return (
      <>
        <div className="rs-layout">
          <div className="panel rs-view">
            <div className="panel-heading">
              <div>
                <h3>Pedidos activos</h3>
                <p>Gestiona cada pedido desde su recepción hasta la entrega</p>
              </div>
              <span className="rs-live"><i /> Actualizado ahora</span>
            </div>
            <div className="toolbar">
              <div className="search-box">
                <Search size={17} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pedido, habitación, huésped..." />
              </div>
              <div className="filter-dropdown">
                <button className="filter-button"><span>{filter}</span><ChevronDown size={15} /></button>
                <div className="filter-menu">
                  <button className={filter === 'Todos' ? 'active' : ''} onClick={() => setFilter('Todos')}>Todos</button>
                  <button className={filter === 'Pendiente' ? 'active' : ''} onClick={() => setFilter('Pendiente')}>Pendientes</button>
                  <button className={filter === 'Aceptado' ? 'active' : ''} onClick={() => setFilter('Aceptado')}>Aceptados</button>
                  <button className={filter === 'En preparación' ? 'active' : ''} onClick={() => setFilter('En preparación')}>En preparación</button>
                  <button className={filter === 'Listo' ? 'active' : ''} onClick={() => setFilter('Listo')}>Listos</button>
                  <button className={filter === 'En camino' ? 'active' : ''} onClick={() => setFilter('En camino')}>En camino</button>
                </div>
              </div>
            </div>
            <div className="rs-summary">
              <div>
                <span className="status-pill warning">Pendientes</span>
                <strong>{orders.filter((o) => o.status === 'Pendiente').length}</strong>
              </div>
              <div>
                <span className="status-pill info">En proceso</span>
                <strong>{orders.filter((o) => ['Aceptado', 'En preparación'].includes(o.status)).length}</strong>
              </div>
              <div>
                <span className="status-pill gold">Por entregar</span>
                <strong>{orders.filter((o) => ['Listo', 'En camino'].includes(o.status)).length}</strong>
              </div>
            </div>
            <div className="rs-order-list">
              {filteredActive.length === 0 ? (
                <div className="hk-empty"><Package size={22} /><p>No hay pedidos activos</p></div>
              ) : (
                filteredActive.map(renderOrder)
              )}
            </div>
          </div>
          <aside className="panel rs-side-panel">
            <div className="panel-heading">
              <div>
                <h3>Turno de Douglas</h3>
                <p>Room service · Hotel Aurora</p>
              </div>
              <span className="avatar blue">DG</span>
            </div>
            <div className="rs-shift-card">
              <div><span>Pedidos del turno</span><strong>{orders.length}</strong></div>
              <div><span>Entregados</span><strong>{orders.filter((o) => o.status === 'Entregado').length}</strong></div>
              <div><span>Rechazados</span><strong>{orders.filter((o) => o.status === 'Rechazado').length}</strong></div>
              <div><span>Cancelados</span><strong>{orders.filter((o) => o.status === 'Cancelado').length}</strong></div>
            </div>
            <div className="rs-legend">
              <strong>Flujo del pedido</strong>
              <span><i className="warning" /> Pendiente de aceptación</span>
              <span><i className="info" /> Aceptado o en preparación</span>
              <span><i className="gold" /> Listo o en camino</span>
              <span><i className="success" /> Entregado</span>
              <span><i className="terracotta" /> Rechazado o cancelado</span>
            </div>
            <div className="rs-legend" style={{ borderTop: 'none', paddingTop: 0 }}>
              <strong>Ventas del turno</strong>
              <span style={{ fontSize: 'var(--font-size-legacy-18)', color: 'var(--color-brand-gold-dark)', fontWeight: 'var(--font-weight-bold)' }}>
                {money(orders.filter((o) => o.status === 'Entregado').reduce((s, o) => s + orderTotal(o), 0))}
              </span>
            </div>
          </aside>
        </div>
        {selectedOrder && (
          <RoomServiceOrderModal
            order={selectedOrder}
            onClose={onCloseOrder}
            onUpdateStatus={onUpdateStatus}
            onUpdateNote={onUpdateNote}
            onCharge={onCharge}
          />
        )}
        {rejectionOrderId !== null && (
          <div className="modal-backdrop" onMouseDown={() => setRejectionOrderId(null)}>
            <div className="modal" style={{ width: 'var(--size-legacy-420)' }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <p className="eyebrow">RECHAZAR PEDIDO</p>
                  <h2>Indica el motivo</h2>
                </div>
                <button className="icon-btn" onClick={() => setRejectionOrderId(null)}><X size={18} /></button>
              </div>
              <p className="login-helper">El huésped podrá consultar por qué no fue posible atender su pedido.</p>
              <textarea
                className="rs-rejection-textarea"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej. Cocina cerrada temporalmente, ingredientes no disponibles..."
              />
              <div className="modal-foot">
                <button className="button secondary" onClick={() => setRejectionOrderId(null)}>Cancelar</button>
                <button
                  className="button primary"
                  disabled={!rejectionReason.trim()}
                  onClick={() => {
                    const id = rejectionOrderId;
                    onReject(id, rejectionReason.trim());
                    setRejectionOrderId(null);
                    setRejectionReason('');
                    onCloseOrder();
                  }}
                >Confirmar rechazo</button>
              </div>
            </div>
          </div>
        )}
        {cancelOrderId !== null && (
          <div className="modal-backdrop" onMouseDown={() => setCancelOrderId(null)}>
            <div className="modal" style={{ width: 'var(--size-legacy-420)' }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <p className="eyebrow">CANCELAR PEDIDO</p>
                  <h2>Indica el motivo</h2>
                </div>
                <button className="icon-btn" onClick={() => setCancelOrderId(null)}><X size={18} /></button>
              </div>
              <p className="login-helper">El sistema y el huésped conocerán el estado correcto del pedido.</p>
              <textarea
                className="rs-rejection-textarea"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej. El huésped no se encuentra en la habitación..."
              />
              <div className="modal-foot">
                <button className="button secondary" onClick={() => setCancelOrderId(null)}>Cerrar</button>
                <button
                  className="button primary"
                  disabled={!cancelReason.trim()}
                  onClick={() => {
                    const id = cancelOrderId;
                    onCancel(id, cancelReason.trim());
                    setCancelOrderId(null);
                    setCancelReason('');
                    onCloseOrder();
                  }}
                >Confirmar cancelación</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ---------- Menú ---------- */
  if (nav === 'Menú') {
    return (
      <div className="panel rs-view">
        <div className="panel-heading">
          <div>
            <h3>Menú de Room Service</h3>
            <p>Carta disponible para pedidos de habitación</p>
          </div>
          <button className="button small secondary" onClick={() => onAction('Menú actualizado')}>
            <FileText size={14} /> Actualizar
          </button>
        </div>
        <div className="rs-menu-categories">
          {menuCategories.map((cat) => (
            <span key={cat} className="rs-menu-cat">{cat}</span>
          ))}
        </div>
        <div className="rs-menu-grid">
          {menuItems.map((item) => (
            <div className="rs-menu-item" key={item.name}>
              <div className="rs-menu-icon"><Utensils size={18} /></div>
              <div>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <span className="rs-menu-cat-tag">{item.category}</span>
              </div>
              <b>{money(item.price)}</b>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Historial ---------- */
  if (nav === 'Historial') {
    return (
      <div className="panel rs-view">
        <div className="panel-heading">
          <div>
            <h3>Historial de pedidos</h3>
            <p>Consulta los pedidos entregados, rechazados y cancelados</p>
          </div>
          <button className="button small secondary" onClick={() => onAction('Historial actualizado')}>
            <FileText size={14} /> Actualizar
          </button>
        </div>
        <div className="rs-history-list">
          {completedOrders.length === 0 ? (
            <div className="hk-empty"><FileText size={22} /><p>Aún no hay pedidos finalizados</p></div>
          ) : (
            completedOrders.map((order) => (
              <div className="rs-history-row" key={order.id}>
                <div>
                  <strong>#{order.id} · Habitación {order.room}</strong>
                  <span>{order.guest} · {order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'} · {money(orderTotal(order))}</span>
                  {order.rejectionReason && <small style={{ color: 'var(--color-terracotta)' }}>Motivo: {order.rejectionReason}</small>}
                </div>
                <span className={`status-pill ${statusClass(order.status)}`}>{order.status}</span>
                {order.charged && <span className="rs-charged"><Check size={13} /> Cargado</span>}
                <button className="button small secondary" onClick={() => onSelectOrder(order.id)}>Ver detalle</button>
              </div>
            ))
          )}
        </div>
        {selectedOrder && (
          <RoomServiceOrderModal
            order={selectedOrder}
            onClose={onCloseOrder}
            onUpdateStatus={onUpdateStatus}
            onUpdateNote={onUpdateNote}
            onCharge={onCharge}
          />
        )}
      </div>
    );
  }

  /* ---------- Inventario ---------- */
  if (nav === 'Inventario') {
    return (
      <div className="panel rs-view">
        <div className="panel-heading">
          <div>
            <h3>Inventario de cocina</h3>
            <p>Insumos disponibles para preparar pedidos</p>
          </div>
          <button className="button small primary" onClick={() => onAction('Inventario actualizado')}>
            <Plus size={14} /> Registrar insumo
          </button>
        </div>
        <div className="rs-inventory-grid">
          {inventoryItems.map((item) => (
            <div className="rs-inventory-item" key={item.name}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.stock} {item.unit}</span>
              </div>
              <span className={`status-pill ${inventoryStatusClass(item.status)}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function RoomServiceOrderModal({
  order, onClose, onUpdateStatus, onUpdateNote, onCharge,
}: {
  order: RoomServiceOrder;
  onClose: () => void;
  onUpdateStatus: (id: number, status: OrderStatus) => void;
  onUpdateNote: (id: number, note: string) => void;
  onCharge: (id: number) => void;
}) {
  const [note, setNote] = useState(order.note);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal rs-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">DETALLE DE PEDIDO</p>
            <h2>Pedido #{order.id}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="rs-detail-header">
          <div>
            <strong>Habitación {order.room}</strong>
            <span>{order.guest} · recibido a las {order.time}</span>
          </div>
          <span className={`status-pill ${statusClass(order.status)}`}>{order.status}</span>
        </div>
        <div className="rs-detail-items">
          {order.items.map((item, i) => (
            <div key={i}>
              <span><strong>{item.quantity}×</strong> {item.name} · {money(item.price)} c/u</span>
              <span>{money(item.quantity * item.price)}</span>
            </div>
          ))}
        </div>
        <div className="rs-detail-total">
          <span>Total del pedido</span>
          <strong>{money(orderTotal(order))}</strong>
        </div>
        {order.rejectionReason && (
          <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-5)', background: 'var(--color-legacy-f2d6cd)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <Ban size={16} style={{ color: 'var(--color-terracotta)', flexShrink: 0, marginTop: 'var(--space-1)' }} />
            <div>
              <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-terracotta)', display: 'block' }}>Motivo de rechazo</strong>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-terracotta)', margin: 'var(--space-1) 0 0' }}>{order.rejectionReason}</p>
            </div>
          </div>
        )}
        <label className="rs-note-label">
          Observaciones
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Agrega información sobre la preparación o entrega..."
          />
        </label>
        <div className="rs-detail-actions">
          <button className="button secondary" onClick={() => onUpdateNote(order.id, note)}>
            Guardar observación
          </button>
          {order.status === 'Pendiente' && <button className="button primary" onClick={() => { onUpdateStatus(order.id, 'Aceptado'); }}>Aceptar pedido</button>}
          {order.status === 'Aceptado' && <button className="button primary" onClick={() => onUpdateStatus(order.id, 'En preparación')}>En preparación</button>}
          {order.status === 'En preparación' && <button className="button primary" onClick={() => onUpdateStatus(order.id, 'Listo')}>Marcar listo</button>}
          {order.status === 'Listo' && <button className="button primary" onClick={() => onUpdateStatus(order.id, 'En camino')}>En camino</button>}
          {order.status === 'En camino' && <button className="button primary" onClick={() => onUpdateStatus(order.id, 'Entregado')}>Entregado</button>}
          {order.status === 'Entregado' && !order.charged && <button className="button primary" onClick={() => onCharge(order.id)}><Wallet size={15} /> Cargar a habitación</button>}
          {order.status === 'Entregado' && order.charged && <span className="rs-charged"><Check size={15} /> Consumo cargado a la habitación</span>}
        </div>
      </div>
    </div>
  );
}
