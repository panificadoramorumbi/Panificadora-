import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Eye,
  X,
  FileText,
  DollarSign,
  Croissant,
  PlusCircle,
  Sparkles,
  Bell,
  Smartphone,
} from 'lucide-react';
import { Order, UserProfile, ProductPrices } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  buildWhatsAppLink,
  calculateOrderMetrics,
} from '../../utils/formatters';
import {
  createOrder,
  recordLeftovers,
  sendNotification,
  updateUserProfile,
  DEFAULT_PRICES,
} from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

interface OrdersViewProps {
  orders: Order[];
  clients: UserProfile[];
  prices?: ProductPrices;
  onOpenAuditCorrection?: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  clients,
  prices = DEFAULT_PRICES,
  onOpenAuditCorrection,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aguardando_sobras' | 'concluido'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pendente' | 'parcial' | 'pago'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Admin record leftovers state (Patrão lança sobras pelo cliente)
  const [orderForLeftovers, setOrderForLeftovers] = useState<Order | null>(null);
  const [adminSaltyLeftover, setAdminSaltyLeftover] = useState<number>(0);
  const [adminSweetLeftover, setAdminSweetLeftover] = useState<number>(0);
  const [isSavingAdminLeftovers, setIsSavingAdminLeftovers] = useState(false);
  const [adminLeftoverError, setAdminLeftoverError] = useState<string | null>(null);
  const [adminLeftoverSuccess, setAdminLeftoverSuccess] = useState<string | null>(null);

  // New Order Modal state
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedResellerId, setSelectedResellerId] = useState<string>('');
  const [newOrderDate, setNewOrderDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newDeliveryDate, setNewDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [newQtySalty, setNewQtySalty] = useState<number | string>(50);
  const [newQtySweet, setNewQtySweet] = useState<number | string>(0);
  const [orderUnitPriceSalty, setOrderUnitPriceSalty] = useState<number | string>('');
  const [orderUnitPriceSweet, setOrderUnitPriceSweet] = useState<number | string>('');
  const [fixPriceForClient, setFixPriceForClient] = useState<boolean>(false);
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderModalSuccess, setOrderModalSuccess] = useState<string | null>(null);

  const resellers = useMemo(() => {
    return clients.filter((c) => c.role === 'revendedor');
  }, [clients]);

  // Sync default prices when selected reseller changes in new order modal
  useEffect(() => {
    if (!selectedResellerId) {
      setOrderUnitPriceSalty(prices?.priceSalty ?? DEFAULT_PRICES.priceSalty);
      setOrderUnitPriceSweet(prices?.priceSweet ?? DEFAULT_PRICES.priceSweet);
      return;
    }
    const res = resellers.find((r) => r.uid === selectedResellerId);
    if (res) {
      setOrderUnitPriceSalty(res.customPriceSalty ?? (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty));
      setOrderUnitPriceSweet(res.customPriceSweet ?? (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet));
      setFixPriceForClient(false);
    }
  }, [selectedResellerId, resellers, prices]);

  // Today & Tomorrow string dates for quick filter
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const selectedFilterClient = useMemo(() => {
    if (clientFilter === 'all') return null;
    return resellers.find((r) => r.uid === clientFilter) || null;
  }, [resellers, clientFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(term) ||
        order.resellerName.toLowerCase().includes(term) ||
        (order.notes && order.notes.toLowerCase().includes(term));

      // Client filter
      const matchesClient =
        clientFilter === 'all' || order.resellerId === clientFilter;

      // Status
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter;

      // Payment
      const matchesPayment =
        paymentFilter === 'all' || order.paymentStatus === paymentFilter;

      // Calendar Date filter
      const matchesDate =
        !dateFilter ||
        order.deliveryDate === dateFilter ||
        order.orderDate === dateFilter ||
        order.orderDate.startsWith(dateFilter);

      return matchesSearch && matchesClient && matchesStatus && matchesPayment && matchesDate;
    });
  }, [orders, searchTerm, clientFilter, statusFilter, paymentFilter, dateFilter]);

  // Summary statistics for the chosen calendar date or view
  const calendarSummary = useMemo(() => {
    let count = 0;
    let totalSalty = 0;
    let totalSweet = 0;
    let totalValue = 0;

    filteredOrders.forEach((o) => {
      count++;
      totalSalty += o.qtySaltyPickup || 0;
      totalSweet += o.qtySweetPickup || 0;
      totalValue += o.finalTotal || o.expectedTotal || 0;
    });

    return { count, totalSalty, totalSweet, totalValue };
  }, [filteredOrders]);

  const handleShareWhatsApp = (order: Order) => {
    const client = clients.find((c) => c.uid === order.resellerId);
    const phone = client?.phone || '';

    const text = `🥖 *PANIFICADORA MORUMBI* 🥖
📋 *PEDIDO ${order.orderNumber}*
👤 *Revendedor:* ${order.resellerName}
📅 *Data de Entrega:* ${formatDate(order.deliveryDate)}

🥖 *Retiradas:*
- Pão Salgado: ${order.qtySaltyPickup} un
- Pão Doce: ${order.qtySweetPickup} un

🥐 *Sobras Registradas:*
- Pão Salgado: ${order.leftoversRecorded ? `${order.qtySaltyLeftover} un` : 'Aguardando registro'}
- Pão Doce: ${order.leftoversRecorded ? `${order.qtySweetLeftover} un` : 'Aguardando registro'}

🛒 *Vendido Efetivo:*
- Pão Salgado: ${order.qtySaltySold} un
- Pão Doce: ${order.qtySweetSold} un

💰 *Financeiro:*
- Valor Final: ${formatCurrency(order.finalTotal)}
- Valor Pago: ${formatCurrency(order.amountPaid)}
- *Saldo a Pagar:* ${formatCurrency(order.balanceDue)}
- *Situação:* ${order.paymentStatus === 'pago' ? '✅ QUITADO / PAGO' : '⏳ PENDENTE'}

Agradecemos a parceria!
_Panificadora Morumbi — Sistema de Revenda_`;

    const url = buildWhatsAppLink(phone, text);
    window.open(url, '_blank');
  };

  const [notifySuccessMsg, setNotifySuccessMsg] = useState<string | null>(null);

  const handleNotifyInApp = async (order: Order) => {
    try {
      await sendNotification({
        targetUserId: order.resellerId,
        title: `🥖 Pedido ${order.orderNumber} - Panificadora Morumbi`,
        message: `Olá ${order.resellerName}! Seu pedido para entrega em ${formatDate(
          order.deliveryDate
        )} (${order.qtySaltyPickup} salgados e ${order.qtySweetPickup} doces) está pronto e confirmado na padaria!`,
        type: 'pedido',
      });
      setNotifySuccessMsg(
        `Notificação enviada com sucesso para ${order.resellerName}! O aviso aparecerá na barra de notificações do celular dele.`
      );
      setTimeout(() => setNotifySuccessMsg(null), 3500);
    } catch (err: any) {
      alert('Erro ao enviar notificação: ' + (err?.message || err));
    }
  };

  // Open record leftovers modal directly for an order
  const handleOpenRecordLeftovers = (order: Order) => {
    setOrderForLeftovers(order);
    setAdminSaltyLeftover(0);
    setAdminSweetLeftover(0);
    setAdminLeftoverError(null);
    setAdminLeftoverSuccess(null);
  };

  // Submit recorded leftovers on behalf of the reseller
  const handleSaveAdminLeftovers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForLeftovers || !currentUser) return;
    setAdminLeftoverError(null);

    const sLeft = Number(adminSaltyLeftover) || 0;
    const wLeft = Number(adminSweetLeftover) || 0;

    if (sLeft < 0 || wLeft < 0) {
      setAdminLeftoverError('A quantidade de sobras não pode ser negativa.');
      return;
    }
    if (sLeft > orderForLeftovers.qtySaltyPickup) {
      setAdminLeftoverError(
        `A sobra de pão salgado (${sLeft}) não pode ser maior que a retirada (${orderForLeftovers.qtySaltyPickup}).`
      );
      return;
    }
    if (wLeft > orderForLeftovers.qtySweetPickup) {
      setAdminLeftoverError(
        `A sobra de pão doce (${wLeft}) não pode ser maior que a retirada (${orderForLeftovers.qtySweetPickup}).`
      );
      return;
    }

    setIsSavingAdminLeftovers(true);
    try {
      await recordLeftovers({
        order: orderForLeftovers,
        qtySaltyLeftover: sLeft,
        qtySweetLeftover: wLeft,
        recordedByUid: currentUser.uid,
        recordedByName: userProfile?.displayName || 'Administrador (Padaria)',
      });

      setAdminLeftoverSuccess(
        `Sobras registradas com sucesso para ${orderForLeftovers.resellerName}! O valor final e as quantidades vendidas foram recalculados.`
      );

      setTimeout(() => {
        setOrderForLeftovers(null);
        setAdminLeftoverSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setAdminLeftoverError('Erro ao gravar sobras: ' + (err?.message || err));
    } finally {
      setIsSavingAdminLeftovers(false);
    }
  };

  const handleCreateOrderFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const reseller = resellers.find((r) => r.uid === selectedResellerId);
    if (!reseller) {
      alert('Selecione um revendedor cadastrado.');
      return;
    }
    const sQty = Number(newQtySalty) || 0;
    const wQty = Number(newQtySweet) || 0;
    if (sQty <= 0 && wQty <= 0) {
      alert('Informe ao menos uma quantidade de pão salgado ou doce.');
      return;
    }

    const saltyPriceNum = Number(orderUnitPriceSalty) || (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty);
    const sweetPriceNum = Number(orderUnitPriceSweet) || (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet);

    setIsSubmittingOrder(true);
    try {
      if (fixPriceForClient) {
        await updateUserProfile(reseller.uid, {
          customPriceSalty: saltyPriceNum,
          customPriceSweet: sweetPriceNum,
        });
      }

      await createOrder({
        resellerId: reseller.uid,
        resellerName: reseller.displayName,
        orderDate: newOrderDate || todayStr,
        deliveryDate: newDeliveryDate || tomorrowStr,
        qtySaltyPickup: sQty,
        qtySweetPickup: wQty,
        unitPriceSalty: saltyPriceNum,
        unitPriceSweet: sweetPriceNum,
        notes: newOrderNotes
          ? `[Lançado pelo Patrão/Admin]: ${newOrderNotes}`
          : '[Lançado pelo Patrão/Admin]',
        currentPrices: prices,
      });

      setOrderModalSuccess(`Pedido lançado com sucesso para ${reseller.displayName}!`);
      setTimeout(() => {
        setShowNewOrderModal(false);
        setOrderModalSuccess(null);
        setNewQtySalty(50);
        setNewQtySweet(0);
        setNewOrderNotes('');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar pedido: ' + (err?.message || err));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert for in-app notification */}
      {notifySuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{notifySuccessMsg}</span>
          </div>
          <button
            onClick={() => setNotifySuccessMsg(null)}
            className="p-1 rounded-lg hover:bg-emerald-700 text-emerald-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
            Acompanhe pedidos em tempo real, registros de sobras e calendário de produção.
          </p>
        </div>

        {/* Action button & Counter badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (resellers.length > 0 && !selectedResellerId) {
                setSelectedResellerId(resellers[0].uid);
              }
              setShowNewOrderModal(true);
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs uppercase rounded-xl shadow-md transition flex items-center gap-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-stone-950" />
            <span>+ Novo Pedido de Revenda</span>
          </button>

          <span className="px-3 py-2 rounded-xl bg-stone-100 text-stone-700 border border-stone-200 text-xs font-bold">
            Total: {orders.length}
          </span>
          <span className="px-3 py-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
            Sobras: {orders.filter((o) => o.status === 'aguardando_sobras').length}
          </span>
        </div>
      </div>

      {/* Calendar & Filters Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-stone-200 space-y-3">
        {/* Row 1: Search & Status / Payment */}
        <div className="flex flex-col md:flex-row items-center gap-3">
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
            {/* Client / Reseller filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className={`px-3 py-2.5 border rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-red-800 transition max-w-[210px] truncate ${
                clientFilter !== 'all'
                  ? 'bg-amber-100 text-amber-950 border-amber-400 font-black shadow-2xs'
                  : 'bg-stone-50 border-stone-200 text-stone-700'
              }`}
            >
              <option value="all">Todos os Clientes</option>
              {resellers.map((r) => (
                <option key={r.uid} value={r.uid}>
                  {r.displayName}
                </option>
              ))}
            </select>

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

        {/* Row 2: Interactive Date / Calendar Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-stone-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-red-800" />
              <span>Ver Data no Calendário:</span>
            </span>

            {/* Quick buttons */}
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                !dateFilter
                  ? 'bg-red-800 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Todos os Dias
            </button>

            <button
              type="button"
              onClick={() => setDateFilter(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                dateFilter === todayStr
                  ? 'bg-red-800 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Hoje ({formatDate(todayStr)})
            </button>

            <button
              type="button"
              onClick={() => setDateFilter(tomorrowStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                dateFilter === tomorrowStr
                  ? 'bg-red-800 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Amanhã ({formatDate(tomorrowStr)})
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-red-800 focus-within:border-red-800">
              <Calendar className="w-3.5 h-3.5 text-red-800 shrink-0" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-stone-900 focus:outline-hidden"
              />
            </div>
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
                title="Limpar filtro de data"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Summary Highlight Banner */}
        {dateFilter && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                  Relatório do Dia: {formatDate(dateFilter)}
                </p>
                <p className="text-[11px] text-stone-600">
                  {calendarSummary.count} {calendarSummary.count === 1 ? 'pedido agendado' : 'pedidos agendados'} para esta data
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-stone-400 text-[10px] block uppercase">Pães Salgados</span>
                <span className="text-sm font-black text-stone-900">{calendarSummary.totalSalty} un</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-stone-400 text-[10px] block uppercase">Pães Doces</span>
                <span className="text-sm font-black text-stone-900">{calendarSummary.totalSweet} un</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-stone-400 text-[10px] block uppercase">Total a Faturar</span>
                <span className="text-sm font-black text-amber-900">{formatCurrency(calendarSummary.totalValue)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Client Filter Banner */}
      {selectedFilterClient && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-bold text-amber-950">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0">
              👤
            </span>
            <div>
              <p className="text-xs font-black">
                Mostrando pedidos de: <span className="underline decoration-amber-600">{selectedFilterClient.displayName}</span>
              </p>
              <p className="text-[11px] text-stone-600 font-normal">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'} para este revendedor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClientFilter('all')}
            className="text-[11px] font-black uppercase text-amber-900 hover:text-red-900 bg-white hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300 transition flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Ver Todos os Clientes</span>
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-xs italic">
            Nenhum pedido encontrado para os filtros selecionados.
          </div>
        ) : (
          <>
            {/* MOBILE VIEW (NO HORIZONTAL SCROLL - 100% RESPONSIVE) */}
            <div className="block md:hidden space-y-3.5">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3 text-xs shadow-2xs"
                >
                  {/* Card Header: Order Number & Status */}
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-stone-900">{order.orderNumber}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'concluido'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.status === 'concluido' ? 'Concluído' : 'Aguardando Sobras'}
                      </span>
                    </div>

                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.paymentStatus === 'pago'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {order.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>

                  {/* Reseller Name & Delivery Date */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">
                        Revendedor
                      </span>
                      <span className="font-bold text-stone-900 text-xs">{order.resellerName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">
                        Entrega
                      </span>
                      <span className="font-bold text-stone-700 text-xs">{formatDate(order.deliveryDate)}</span>
                    </div>
                  </div>

                  {/* Quantities Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-white p-2.5 rounded-xl border border-stone-200">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-stone-400 block">Retiradas</span>
                      <span className="font-bold text-stone-800 text-[11px]">
                        {order.qtySaltyPickup}s / {order.qtySweetPickup}d
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-stone-400 block">Sobras</span>
                      <span className="font-bold text-amber-700 text-[11px]">
                        {order.leftoversRecorded
                          ? `${order.qtySaltyLeftover}s / ${order.qtySweetLeftover}d`
                          : 'Pendente'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-stone-400 block">Vendido</span>
                      <span className="font-black text-stone-900 text-[11px]">
                        {order.qtySaltySold}s / {order.qtySweetSold}d
                      </span>
                    </div>
                  </div>

                  {/* Financial Values */}
                  <div className="flex items-center justify-between bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-bold block">Total Final</span>
                      <span className="font-black text-stone-900 text-sm">{formatCurrency(order.finalTotal)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 uppercase font-bold block">Saldo a Pagar</span>
                      <span className="font-black text-rose-700 text-sm">{formatCurrency(order.balanceDue)}</span>
                    </div>
                  </div>

                  {/* Action Buttons on Mobile (Full width touch targets) */}
                  <div className="space-y-2 pt-1">
                    {!order.leftoversRecorded && (
                      <button
                        type="button"
                        onClick={() => handleOpenRecordLeftovers(order)}
                        className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-500 active:scale-95 text-stone-950 font-black text-xs uppercase rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4 text-stone-950" />
                        <span>Lançar Sobras Deste Pedido</span>
                      </button>
                    )}

                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="py-2 px-1 bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-bold rounded-xl flex items-center justify-center gap-1 text-[11px]"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>
                      <button
                        onClick={() => handleNotifyInApp(order)}
                        className="py-2 px-1 bg-red-100 hover:bg-red-200 text-red-900 font-bold rounded-xl flex items-center justify-center gap-1 text-[11px]"
                        title="Notificar no App"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Aviso</span>
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(order)}
                        className="py-2 px-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xl flex items-center justify-center gap-1 text-[11px]"
                        title="Enviar no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Zap</span>
                      </button>
                      {onOpenAuditCorrection ? (
                        <button
                          onClick={() => onOpenAuditCorrection(order)}
                          className="py-2 px-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-xl flex items-center justify-center gap-1 text-[11px]"
                          title="Corrigir Quantidades"
                        >
                          <span>Corrigir</span>
                        </button>
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block overflow-x-auto">
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
                          {!order.leftoversRecorded && (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordLeftovers(order)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 active:scale-95 text-stone-950 font-black text-[11px] shadow-xs transition flex items-center gap-1 shrink-0"
                              title="Lançar sobras deste pedido pelo cliente"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                              <span>Lançar Sobras</span>
                            </button>
                          )}
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
                          <button
                            onClick={() => handleNotifyInApp(order)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-800 hover:bg-red-100 transition"
                            title="Enviar notificação na barra do celular do revendedor"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
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
          </>
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

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => handleNotifyInApp(selectedOrder)}
                  className="px-4 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl flex items-center gap-2 shadow-xs transition"
                  title="Enviar aviso push na barra do celular do cliente"
                >
                  <Smartphone className="w-4 h-4 text-amber-300" />
                  <span>Notificar no App</span>
                </button>
                <button
                  onClick={() => handleShareWhatsApp(selectedOrder)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-xs transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lançar Novo Pedido de Revenda pelo Admin */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Novo Pedido de Revenda</h3>
                  <p className="text-xs text-stone-500">Lançar pedido diretamente para um revendedor</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderModalSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{orderModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrderFromModal} className="space-y-4 mt-4">
              {/* Select Reseller */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Selecione o Revendedor *
                </label>
                {resellers.length === 0 ? (
                  <p className="text-xs text-rose-600 font-bold">
                    Nenhum revendedor cadastrado. Cadastre um revendedor na aba 2 primeiro.
                  </p>
                ) : (
                  <select
                    required
                    value={selectedResellerId}
                    onChange={(e) => setSelectedResellerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Selecione um revendedor...</option>
                    {resellers.map((r) => (
                      <option key={r.uid} value={r.uid}>
                        {r.displayName} ({r.username || r.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Data do Pedido
                  </label>
                  <input
                    type="date"
                    required
                    value={newOrderDate}
                    onChange={(e) => setNewOrderDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Data de Entrega / Retirada *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Unit Price per Bread (Editable per order & Option to fix for client) */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-700" />
                    Valor Unitário deste Pedido (Personalizável)
                  </span>
                  {selectedResellerId && resellers.find((r) => r.uid === selectedResellerId)?.customPriceSalty && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 self-start sm:self-auto">
                      ⭐ Preço Fixo Especial deste Cliente
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Valor Pão Salgado (R$/un)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={orderUnitPriceSalty}
                      onChange={(e) => setOrderUnitPriceSalty(e.target.value)}
                      placeholder={String(prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Padrão da padaria: {formatCurrency(prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)} (ex: 0.70 ou 0.85)
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Valor Pão Doce (R$/un)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={orderUnitPriceSweet}
                      onChange={(e) => setOrderUnitPriceSweet(e.target.value)}
                      placeholder={String(prices?.priceSweet ?? DEFAULT_PRICES.priceSweet)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Padrão da padaria: {formatCurrency(prices?.priceSweet ?? DEFAULT_PRICES.priceSweet)}
                    </p>
                  </div>
                </div>

                {selectedResellerId && (
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none border-t border-amber-200/60 mt-1">
                    <input
                      type="checkbox"
                      checked={fixPriceForClient}
                      onChange={(e) => setFixPriceForClient(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                    />
                    <span className="text-xs font-bold text-stone-800">
                      Fixar este valor como padrão para este cliente daqui em diante
                    </span>
                  </label>
                )}
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Salty */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-stone-800">Pão Salgado (Francês)</span>
                    <span className="text-[10px] font-extrabold text-amber-800">
                      {formatCurrency(Number(orderUnitPriceSalty) || (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty))} / un
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newQtySalty}
                    onChange={(e) => setNewQtySalty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[20, 50, 100].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setNewQtySalty((prev) => (Number(prev) || 0) + q)}
                        className="flex-1 py-1 text-[10px] font-bold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700"
                      >
                        +{q}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewQtySalty(0)}
                      className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-rose-50 border border-stone-200 rounded-lg text-rose-600"
                    >
                      Zerar
                    </button>
                  </div>
                </div>

                {/* Sweet */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-stone-800">Pão Doce</span>
                    <span className="text-[10px] font-extrabold text-amber-800">
                      {formatCurrency(Number(orderUnitPriceSweet) || (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet))} / un
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newQtySweet}
                    onChange={(e) => setNewQtySweet(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[10, 20, 50].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setNewQtySweet((prev) => (Number(prev) || 0) + q)}
                        className="flex-1 py-1 text-[10px] font-bold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700"
                      >
                        +{q}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewQtySweet(0)}
                      className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-rose-50 border border-stone-200 rounded-lg text-rose-600"
                    >
                      Zerar
                    </button>
                  </div>
                </div>
              </div>

              {/* Order total preview */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-amber-900 tracking-wider">
                    Total Estimado do Pedido
                  </p>
                  <p className="text-xs text-stone-600">
                    {Number(newQtySalty) || 0} salgados ({formatCurrency(Number(orderUnitPriceSalty) || (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty))}) + {Number(newQtySweet) || 0} doces ({formatCurrency(Number(orderUnitPriceSweet) || (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet))})
                  </p>
                </div>
                <p className="text-xl font-black text-amber-950">
                  {formatCurrency(
                    (Number(newQtySalty) || 0) * (Number(orderUnitPriceSalty) || (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)) +
                      (Number(newQtySweet) || 0) * (Number(orderUnitPriceSweet) || (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet))
                  )}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Observações / Detalhes de Produção (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Entregar quentinho às 06:00, pães um pouco mais morenos..."
                  value={newOrderNotes}
                  onChange={(e) => setNewOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmittingOrder}
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder || resellers.length === 0}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{isSubmittingOrder ? 'Lançando...' : 'Confirmar e Lançar Pedido'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR SOBRAS PELO CLIENTE (ADMINISTRADOR) */}
      {orderForLeftovers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Lançar Sobras pelo Cliente</h3>
                  <p className="text-xs text-amber-800 font-bold">
                    {orderForLeftovers.resellerName} • {orderForLeftovers.orderNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderForLeftovers(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminLeftoverError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{adminLeftoverError}</span>
              </div>
            )}

            {adminLeftoverSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{adminLeftoverSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdminLeftovers} className="space-y-4 mt-4 text-xs">
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="font-bold text-stone-500 uppercase text-[10px] block">
                  Quantidades Retiradas pelo Revendedor:
                </span>
                <p className="font-black text-stone-900 text-xs">
                  {orderForLeftovers.qtySaltyPickup} pães salgados / {orderForLeftovers.qtySweetPickup} pães doces
                </p>
                <p className="text-[11px] text-stone-500">
                  Data de Entrega: {formatDate(orderForLeftovers.deliveryDate)}
                </p>
              </div>

              {/* Salty Leftover */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-stone-800">
                    Sobras de Pão Salgado (unidades)
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Máx: {orderForLeftovers.qtySaltyPickup}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={orderForLeftovers.qtySaltyPickup}
                  value={adminSaltyLeftover}
                  onChange={(e) => setAdminSaltyLeftover(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-black text-sm text-stone-900"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdminSaltyLeftover(0)}
                    className="flex-1 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-[10px]"
                  >
                    Vendeu Tudo (0 sobra)
                  </button>
                  {[5, 10, 20].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setAdminSaltyLeftover(Math.min(orderForLeftovers.qtySaltyPickup, v))
                      }
                      className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-[10px]"
                    >
                      {v} un
                    </button>
                  ))}
                </div>
              </div>

              {/* Sweet Leftover */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-stone-800">
                    Sobras de Pão Doce (unidades)
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Máx: {orderForLeftovers.qtySweetPickup}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={orderForLeftovers.qtySweetPickup}
                  value={adminSweetLeftover}
                  onChange={(e) => setAdminSweetLeftover(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-black text-sm text-stone-900"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdminSweetLeftover(0)}
                    className="flex-1 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-[10px]"
                  >
                    Vendeu Tudo (0 sobra)
                  </button>
                  {[5, 10].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setAdminSweetLeftover(Math.min(orderForLeftovers.qtySweetPickup, v))
                      }
                      className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-[10px]"
                    >
                      {v} un
                    </button>
                  ))}
                </div>
              </div>

              {/* Live calculation */}
              {(() => {
                const sSold = Math.max(0, orderForLeftovers.qtySaltyPickup - adminSaltyLeftover);
                const wSold = Math.max(0, orderForLeftovers.qtySweetPickup - adminSweetLeftover);
                const finalTot =
                  sSold * (orderForLeftovers.unitPriceSalty || prices?.priceSalty || DEFAULT_PRICES.priceSalty) +
                  wSold * (orderForLeftovers.unitPriceSweet || prices?.priceSweet || DEFAULT_PRICES.priceSweet);
                const bal = Math.max(0, finalTot - (orderForLeftovers.amountPaid || 0));

                return (
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300 space-y-1.5">
                    <span className="font-extrabold text-[10px] uppercase text-amber-900 block">
                      Cálculo Automático de Venda Efetiva
                    </span>
                    <div className="flex justify-between font-bold text-stone-800">
                      <span>Pão Salgado Vendido:</span>
                      <span>{sSold} un</span>
                    </div>
                    <div className="flex justify-between font-bold text-stone-800">
                      <span>Pão Doce Vendido:</span>
                      <span>{wSold} un</span>
                    </div>
                    <div className="pt-2 border-t border-amber-200 flex justify-between font-black text-stone-900 text-xs">
                      <span>Novo Valor Final da Conta:</span>
                      <span className="text-sm font-black text-amber-950">{formatCurrency(finalTot)}</span>
                    </div>
                    <div className="flex justify-between font-black text-rose-700 text-xs">
                      <span>Saldo Final a Pagar:</span>
                      <span>{formatCurrency(bal)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isSavingAdminLeftovers}
                  onClick={() => setOrderForLeftovers(null)}
                  className="px-4 py-2.5 font-bold text-stone-600 hover:text-stone-900 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdminLeftovers}
                  className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white font-black text-xs uppercase rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isSavingAdminLeftovers ? 'Gravando...' : 'Confirmar e Gravar Sobras'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

