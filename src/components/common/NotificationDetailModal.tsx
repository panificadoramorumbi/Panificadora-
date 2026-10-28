import React from 'react';
import {
  X,
  Bell,
  Croissant,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { InAppNotification, Order } from '../../types';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

interface NotificationDetailModalProps {
  notification: InAppNotification | null;
  onClose: () => void;
  orders?: Order[];
  onNavigateAction?: (type: string, order?: Order, orderId?: string, resellerId?: string) => void;
  isAdmin?: boolean;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  onClose,
  orders = [],
  onNavigateAction,
  isAdmin = false,
}) => {
  if (!notification) return null;

  // Find linked order if orderId or orderNumber is present
  const linkedOrder = orders.find(
    (o) =>
      (notification.orderId && o.id === notification.orderId) ||
      (notification.orderNumber && o.orderNumber === notification.orderNumber) ||
      (notification.title && notification.title.includes(o.orderNumber)) ||
      (notification.message && notification.message.includes(o.orderNumber))
  );

  const isLeftoversType =
    notification.type === 'sobras' ||
    notification.title.toLowerCase().includes('sobra') ||
    notification.message.toLowerCase().includes('sobra');

  const isOrderType =
    notification.type === 'pedido' ||
    notification.title.toLowerCase().includes('pedido') ||
    notification.message.toLowerCase().includes('pedido');

  const isPaymentType =
    notification.type === 'pagamento' ||
    notification.title.toLowerCase().includes('pagamento') ||
    notification.message.toLowerCase().includes('pagamento');

  const handleAction = () => {
    if (!onNavigateAction) return;

    if (isLeftoversType) {
      onNavigateAction('sobras', linkedOrder, notification.orderId, notification.resellerId);
    } else if (isPaymentType) {
      onNavigateAction('pagamento', linkedOrder, notification.orderId, notification.resellerId);
    } else if (isOrderType) {
      onNavigateAction('pedido', linkedOrder, notification.orderId, notification.resellerId);
    } else {
      onNavigateAction(notification.type, linkedOrder, notification.orderId, notification.resellerId);
    }
    onClose();
  };

  const getActionLabel = () => {
    if (isLeftoversType) {
      return isAdmin
        ? 'Ir para Pedidos e Registrar / Ver Sobras'
        : 'Digitar Minhas Sobras Agora';
    }
    if (isPaymentType) {
      return isAdmin ? 'Abrir Extrato de Acertos & Pagamentos' : 'Ver Extrato de Pagamentos';
    }
    if (isOrderType) {
      return isAdmin ? 'Abrir e Gerenciar este Pedido' : 'Ver Meus Pedidos';
    }
    return 'Ir para a Situação';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-900 text-amber-300 flex items-center justify-center font-black shadow-md shrink-0">
              {isLeftoversType ? (
                <Croissant className="w-6 h-6 text-amber-400" />
              ) : isOrderType ? (
                <ShoppingBag className="w-6 h-6 text-amber-300" />
              ) : isPaymentType ? (
                <DollarSign className="w-6 h-6 text-emerald-400" />
              ) : (
                <Bell className="w-6 h-6 text-amber-300" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {notification.type.toUpperCase()}
              </span>
              <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1 leading-snug">
                {notification.title}
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {formatDateTime(notification.createdAt)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Complete Notification Message */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
          <span className="text-[10px] font-black uppercase text-stone-400 block mb-1">
            Mensagem Completa da Notificação
          </span>
          <p className="text-sm font-medium text-stone-800 leading-relaxed whitespace-pre-wrap">
            {notification.message}
          </p>
        </div>

        {/* Linked Order Preview if found */}
        {linkedOrder && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-amber-950 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                <span>Dados do {linkedOrder.orderNumber}</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  linkedOrder.status === 'concluido'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-200 text-amber-900'
                }`}
              >
                {linkedOrder.status === 'concluido' ? 'Concluído' : 'Aguardando Sobras'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-stone-700 pt-1">
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Revendedor</span>
                <span className="font-extrabold text-stone-900">{linkedOrder.resellerName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Entrega</span>
                <span className="font-extrabold text-stone-900">{formatDate(linkedOrder.deliveryDate)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Retiradas</span>
                <span className="font-bold text-stone-800">
                  {linkedOrder.qtySaltyPickup} salg / {linkedOrder.qtySweetPickup} doce
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Valor Total</span>
                <span className="font-black text-stone-900">
                  {formatCurrency(linkedOrder.finalTotal || linkedOrder.expectedTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition"
          >
            Fechar
          </button>

          {onNavigateAction && (
            <button
              type="button"
              onClick={handleAction}
              className="px-5 py-2.5 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center gap-2"
            >
              <span>{getActionLabel()}</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
