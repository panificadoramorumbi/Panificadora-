import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Eye,
  X,
  FileText,
  DollarSign,
  Croissant,
} from 'lucide-react';
import { Order, UserProfile } from '../../types';
import { formatCurrency, formatDate, formatDateTime, buildWhatsAppLink } from '../../utils/formatters';

interface OrdersViewProps {
  orders: Order[];
  clients: UserProfile[];
  onOpenAuditCorrection?: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  clients,
  onOpenAuditCorrection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aguardando_sobras' | 'concluido'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pendente' | 'parcial' | 'pago'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(term) ||
        order.resellerName.toLowerCase().includes(term) ||
        (order.notes && order.notes.toLowerCase().includes(term));

      // Status
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter;

      // Payment
      const matchesPayment =
        paymentFilter === 'all' || order.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, searchTerm, statusFilter, paymentFilter]);

  const handleShareWhatsApp = (order: Order) => {
    const client = clients.find((c) => c.uid === order.resellerId);
    const phone = client?.phone || '';

    const text = `*PANIFICADORA MORUMBI - PEDIDO ${order.orderNumber}*
Revendedor: ${order.resellerName}
Data Entrega: ${formatDate(order.deliveryDate)}

*Retiradas:*
- Pão Salgado: ${order.qtySaltyPickup} un
- Pão Doce: ${order.qtySweetPickup} un

*Sobras Registradas:*
- Pão Salgado: ${order.leftoversRecorded ? `${order.qtySaltyLeftover} un` : 'Aguardando'}
- Pão Doce: ${order.leftoversRecorded ? `${order.qtySweetLeftover} un` : 'Aguardando'}

*Vendido Efetivo:*
- Pão Salgado: ${order.qtySaltySold} un
- Pão Doce: ${order.qtySweetSold} un

*Financeiro:*
- Valor Final: ${formatCurrency(order.finalTotal)}
- Valor Pago: ${formatCurrency(order.amountPaid)}
- *Saldo a Pagar: ${formatCurrency(order.balanceDue)}*
- Situação: ${order.paymentStatus === 'pago' ? 'PAGO' : 'PENDENTE'}

Agradecemos a parceria!`;

    const url = buildWhatsAppLink(phone, text);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-red-800" />
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              3. Gestão de Pedidos
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Acompanhe pedidos em tempo real, registros de sobras e comprovantes.
          </p>
        </div>

        {/* Counter badges */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 border border-stone-200">
            Total: {orders.length}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
            Aguardando Sobras: {orders.filter((o) => o.status === 'aguardando_sobras').length}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por número do pedido (#PM-...), nome do revendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-hidden focus:ring-2 focus:ring-red-800"
          >
            <option value="all">Todas as Situações</option>
            <option value="aguardando_sobras">Aguardando Sobras</option>
            <option value="concluido">Concluído</option>
          </select>

          {/* Payment filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-hidden focus:ring-2 focus:ring-red-800"
          >
            <option value="all">Todos Pagamentos</option>
            <option value="pendente">Pagamento Pendente</option>
            <option value="parcial">Pagamento Parcial</option>
            <option value="pago">Quitado / Pago</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-xs italic">
            Nenhum pedido encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] font-bold">
                  <th className="pb-3">Identificador</th>
                  <th className="pb-3">Revendedor</th>
                  <th className="pb-3">Data Entrega</th>
                  <th className="pb-3 text-right">Retiradas</th>
                  <th className="pb-3 text-right">Sobras</th>
                  <th className="pb-3 text-right">Qtd Vendida</th>
                  <th className="pb-3 text-right">Total Final</th>
                  <th className="pb-3 text-right">Saldo Devido</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50 transition">
                    <td className="py-3.5 font-black text-stone-900">{order.orderNumber}</td>
                    <td className="py-3.5 font-bold text-stone-800">{order.resellerName}</td>
                    <td className="py-3.5 text-stone-600">{formatDate(order.deliveryDate)}</td>
                    <td className="py-3.5 text-right font-medium">
                      <span className="text-amber-800">{order.qtySaltyPickup} salg</span> /{' '}
                      <span className="text-amber-600">{order.qtySweetPickup} doce</span>
                    </td>
                    <td className="py-3.5 text-right text-stone-600">
                      {order.leftoversRecorded ? (
                        <span>
                          {order.qtySaltyLeftover} salg / {order.qtySweetLeftover} doce
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold italic">Aguardando</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-stone-900">
                      {order.qtySaltySold} salg / {order.qtySweetSold} doce
                    </td>
                    <td className="py-3.5 text-right font-black text-stone-900">
                      {formatCurrency(order.finalTotal)}
                    </td>
                    <td className="py-3.5 text-right font-black text-rose-700">
                      {formatCurrency(order.balanceDue)}
                    </td>
                    <td className="py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          order.status === 'concluido'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.status === 'concluido' ? 'Concluído' : 'Aguardando Sobras'}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition"
                          title="Ver detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(order)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                          title="Enviar comprovante no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        {onOpenAuditCorrection && (
                          <button
                            onClick={() => onOpenAuditCorrection(order)}
                            className="px-2 py-1 rounded-lg bg-red-50 text-red-800 font-bold text-[10px] hover:bg-red-100 transition"
                            title="Alterar quantidade no modo auditoria"
                          >
                            Corrigir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Detalhes do Pedido {selectedOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Revendedor: {selectedOrder.resellerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-5 text-xs">
              {/* Dates & Status */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <span className="text-stone-400 font-bold uppercase text-[10px] block">
                    Data do Pedido
                  </span>
                  <span className="font-bold text-stone-800">
                    {formatDate(selectedOrder.orderDate)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 font-bold uppercase text-[10px] block">
                    Data de Entrega
                  </span>
                  <span className="font-bold text-stone-800">
                    {formatDate(selectedOrder.deliveryDate)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 font-bold uppercase text-[10px] block">
                    Situação
                  </span>
                  <span className="font-bold capitalize text-stone-800">
                    {selectedOrder.status === 'concluido' ? 'Concluído' : 'Aguardando Sobras'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 font-bold uppercase text-[10px] block">
                    Pagamento
                  </span>
                  <span className="font-bold capitalize text-emerald-700">
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Quantities breakdown */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200">
                <h4 className="font-black text-amber-950 mb-2">Composição de Quantidades</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-stone-500 block">Retiradas</span>
                    <span className="font-bold text-stone-800">
                      {selectedOrder.qtySaltyPickup} salg / {selectedOrder.qtySweetPickup} doce
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-stone-500 block">Sobras</span>
                    <span className="font-bold text-stone-800">
                      {selectedOrder.leftoversRecorded
                        ? `${selectedOrder.qtySaltyLeftover} salg / ${selectedOrder.qtySweetLeftover} doce`
                        : 'Não informadas'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-stone-500 block">Vendido Efetivo</span>
                    <span className="font-black text-amber-900">
                      {selectedOrder.qtySaltySold} salg / {selectedOrder.qtySweetSold} doce
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Snapshot */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <h4 className="font-black text-stone-900">Preços Aplicados no Pedido</h4>
                <div className="flex justify-between text-stone-600">
                  <span>Pão Salgado (Unitário):</span>
                  <span className="font-bold text-stone-800">
                    {formatCurrency(selectedOrder.unitPriceSalty)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Pão Doce (Unitário):</span>
                  <span className="font-bold text-stone-800">
                    {formatCurrency(selectedOrder.unitPriceSweet)}
                  </span>
                </div>
                <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-stone-700">
                  <span>Valor Previsto Inicial:</span>
                  <span>{formatCurrency(selectedOrder.expectedTotal)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-stone-900">
                  <span>Valor Final a Pagar:</span>
                  <span className="text-amber-800">{formatCurrency(selectedOrder.finalTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-700">
                  <span>Valor Pago:</span>
                  <span className="text-emerald-700">{formatCurrency(selectedOrder.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-rose-700">
                  <span>Saldo Pendente:</span>
                  <span>{formatCurrency(selectedOrder.balanceDue)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-600">
                  <span className="font-bold text-stone-800 block text-[11px] mb-0.5">
                    Observações do Pedido:
                  </span>
                  <span>{selectedOrder.notes}</span>
                </div>
              )}

              {selectedOrder.lastModifiedReason && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900">
                  <span className="font-bold text-red-950 block text-[11px] mb-0.5">
                    Última Alteração de Auditoria:
                  </span>
                  <span>{selectedOrder.lastModifiedReason}</span>
                  <span className="block text-[10px] text-red-700 mt-1">
                    Por: {selectedOrder.lastModifiedBy}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => handleShareWhatsApp(selectedOrder)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
