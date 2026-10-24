import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Edit3,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  History,
  X,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Order, UserProfile, AuditLog } from '../../types';
import { formatCurrency, formatDate, formatDateTime, calculateOrderMetrics } from '../../utils/formatters';
import { adminUpdateQuantity } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

interface AuditViewProps {
  orders: Order[];
  clients: UserProfile[];
  auditLogs: AuditLog[];
  initialOrderToCorrect?: Order | null;
  onClearInitialOrder?: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({
  orders,
  clients,
  auditLogs,
  initialOrderToCorrect = null,
  onClearInitialOrder,
}) => {
  const { currentUser, userProfile } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Selected Order for Quantity Correction Modal
  const [correctingOrder, setCorrectingOrder] = useState<Order | null>(initialOrderToCorrect);

  // Form inputs for correction
  const [editSaltyPickup, setEditSaltyPickup] = useState<number>(0);
  const [editSweetPickup, setEditSweetPickup] = useState<number>(0);
  const [editSaltyLeftover, setEditSaltyLeftover] = useState<number>(0);
  const [editSweetLeftover, setEditSweetLeftover] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [confirmedExplicitly, setConfirmedExplicitly] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'logs'>('orders');

  // Populate form when an order is opened for correction
  const handleOpenCorrection = (order: Order) => {
    setCorrectingOrder(order);
    setEditSaltyPickup(order.qtySaltyPickup);
    setEditSweetPickup(order.qtySweetPickup);
    setEditSaltyLeftover(order.qtySaltyLeftover);
    setEditSweetLeftover(order.qtySweetLeftover);
    setReason('');
    setConfirmedExplicitly(false);
    setErrorMsg(null);
  };

  const handleCloseCorrection = () => {
    setCorrectingOrder(null);
    if (onClearInitialOrder) onClearInitialOrder();
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(term) ||
        order.resellerName.toLowerCase().includes(term);

      const matchesClient = clientFilter === 'all' || order.resellerId === clientFilter;
      const matchesDate =
        !dateFilter ||
        order.deliveryDate === dateFilter ||
        order.orderDate === dateFilter;
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment =
        paymentFilter === 'all' || order.paymentStatus === paymentFilter;

      return matchesSearch && matchesClient && matchesDate && matchesStatus && matchesPayment;
    });
  }, [orders, searchTerm, clientFilter, dateFilter, statusFilter, paymentFilter]);

  // Live calculation of preview for modal
  const simulatedNewMetrics = useMemo(() => {
    if (!correctingOrder) return null;
    return calculateOrderMetrics({
      qtySaltyPickup: editSaltyPickup,
      qtySweetPickup: editSweetPickup,
      qtySaltyLeftover: editSaltyLeftover,
      qtySweetLeftover: editSweetLeftover,
      leftoversRecorded: editSaltyLeftover > 0 || editSweetLeftover > 0 || correctingOrder.leftoversRecorded,
      unitPriceSalty: correctingOrder.unitPriceSalty,
      unitPriceSweet: correctingOrder.unitPriceSweet,
      amountPaid: correctingOrder.amountPaid,
    });
  }, [
    correctingOrder,
    editSaltyPickup,
    editSweetPickup,
    editSaltyLeftover,
    editSweetLeftover,
  ]);

  // Handle Save Correction
  const handleSaveCorrection = async () => {
    if (!correctingOrder) return;
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('A justificativa é obrigatória para registrar a correção no log de auditoria.');
      return;
    }

    if (!confirmedExplicitly) {
      setErrorMsg('Marque a confirmação explícita de responsabilidade pela alteração.');
      return;
    }

    if (editSaltyPickup < 0 || editSweetPickup < 0) {
      setErrorMsg('As quantidades retiradas não podem ser negativas.');
      return;
    }
    if (editSaltyLeftover < 0 || editSweetLeftover < 0) {
      setErrorMsg('As sobras não podem ser negativas.');
      return;
    }
    if (editSaltyLeftover > editSaltyPickup) {
      setErrorMsg('As sobras de pão salgado não podem exceder a quantidade retirada.');
      return;
    }
    if (editSweetLeftover > editSweetPickup) {
      setErrorMsg('As sobras de pão doce não podem exceder a quantidade retirada.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminUpdateQuantity({
        order: correctingOrder,
        newQtySaltyPickup: Number(editSaltyPickup),
        newQtySweetPickup: Number(editSweetPickup),
        newQtySaltyLeftover: Number(editSaltyLeftover),
        newQtySweetLeftover: Number(editSweetLeftover),
        reason: reason.trim(),
        adminId: currentUser?.uid || 'admin',
        adminEmail: currentUser?.email || 'admin@morumbi.com',
      });

      handleCloseCorrection();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Falha ao salvar correção de auditoria: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-800" />
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              4. Auditoria de Pedidos & Alteração de Quantidades
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Ferramenta exclusiva do Administrador para correção excepcional com trilha de auditoria completa.
          </p>
        </div>

        {/* View Switcher: Orders vs Audit Log Trail */}
        <div className="flex items-center p-1 bg-stone-100 rounded-2xl border border-stone-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'orders'
                ? 'bg-red-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Pedidos Auditáveis ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'logs'
                ? 'bg-red-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Trilha de Histórico ({auditLogs.length})
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Audit Filters Bar */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar pedido ou revendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-800"
              />
            </div>

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-red-800"
            >
              <option value="all">Todos os Clientes</option>
              {clients
                .filter((c) => c.role === 'revendedor')
                .map((c) => (
                  <option key={c.uid} value={c.uid}>
                    {c.displayName}
                  </option>
                ))}
            </select>

            {/* Date filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-red-800"
            />

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-red-800"
            >
              <option value="all">Todas Situações</option>
              <option value="aguardando_sobras">Aguardando Sobras</option>
              <option value="concluido">Concluído</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-red-800"
            >
              <option value="all">Todos Pagamentos</option>
              <option value="pendente">Pendente</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Quitado</option>
            </select>
          </div>

          {/* Orders Audit Table */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] font-bold">
                    <th className="pb-3">Pedido</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3 text-right">Retiradas</th>
                    <th className="pb-3 text-right">Sobras</th>
                    <th className="pb-3 text-right">Qtd Vendida</th>
                    <th className="pb-3 text-right">Previsto</th>
                    <th className="pb-3 text-right">Final</th>
                    <th className="pb-3 text-right">Pago</th>
                    <th className="pb-3 text-right">Saldo</th>
                    <th className="pb-3 text-center">Ação Excepcional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-stone-400 text-xs italic">
                        Nenhum pedido encontrado com os filtros de auditoria selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-stone-50 transition">
                        <td className="py-3 font-bold text-stone-900">{order.orderNumber}</td>
                        <td className="py-3 font-medium text-stone-800">{order.resellerName}</td>
                        <td className="py-3 text-right font-medium">
                          {order.qtySaltyPickup} salg / {order.qtySweetPickup} doce
                        </td>
                        <td className="py-3 text-right text-stone-600">
                          {order.leftoversRecorded ? (
                            `${order.qtySaltyLeftover} salg / ${order.qtySweetLeftover} doce`
                          ) : (
                            <span className="text-amber-600 italic">Pendente</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-bold text-stone-800">
                          {order.qtySaltySold} salg / {order.qtySweetSold} doce
                        </td>
                        <td className="py-3 text-right text-stone-600">
                          {formatCurrency(order.expectedTotal)}
                        </td>
                        <td className="py-3 text-right font-black text-stone-900">
                          {formatCurrency(order.finalTotal)}
                        </td>
                        <td className="py-3 text-right text-emerald-700 font-semibold">
                          {formatCurrency(order.amountPaid)}
                        </td>
                        <td className="py-3 text-right font-black text-rose-700">
                          {formatCurrency(order.balanceDue)}
                        </td>
                        <td className="py-3 text-center">
                          {/* BOTÃO OBRIGATÓRIO: "Alterar Quantidade" */}
                          <button
                            onClick={() => handleOpenCorrection(order)}
                            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-stone-950 font-black text-[11px] shadow-sm transition flex items-center gap-1.5 mx-auto"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-stone-900" />
                            <span>Alterar Quantidade</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* AUDIT LOGS TRAIL TABLE */
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <h3 className="text-base font-black text-stone-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-red-800" />
            <span>Trilha de Auditoria (Modificações Administrativas Registradas)</span>
          </h3>

          {auditLogs.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-xs italic">
              Nenhuma alteração de quantidade foi realizada até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] font-bold">
                    <th className="pb-3">Data/Hora</th>
                    <th className="pb-3">Pedido</th>
                    <th className="pb-3">Revendedor</th>
                    <th className="pb-3">Administrador</th>
                    <th className="pb-3">Valores Anteriores</th>
                    <th className="pb-3">Novos Valores</th>
                    <th className="pb-3">Justificativa Registrada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50 transition">
                      <td className="py-3 text-stone-600 whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-3 font-bold text-stone-900">{log.orderNumber}</td>
                      <td className="py-3 font-medium text-stone-800">{log.resellerName}</td>
                      <td className="py-3 text-stone-600 font-semibold">{log.adminEmail}</td>
                      <td className="py-3 text-rose-700 font-medium">
                        Retirada: {log.previousData?.qtySaltyPickup || 0}s /{' '}
                        {log.previousData?.qtySweetPickup || 0}d
                        <br />
                        Total: {formatCurrency(log.previousData?.finalTotal)}
                      </td>
                      <td className="py-3 text-emerald-700 font-bold">
                        Retirada: {log.newData?.qtySaltyPickup || 0}s /{' '}
                        {log.newData?.qtySweetPickup || 0}d
                        <br />
                        Total: {formatCurrency(log.newData?.finalTotal)}
                      </td>
                      <td className="py-3 text-stone-700 font-medium italic max-w-xs">
                        "{log.reason}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ALTERAR QUANTIDADE (CONFORME REQUISITO SEÇÃO 11) */}
      {correctingOrder && simulatedNewMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Alterar Quantidade — Auditoria
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pedido {correctingOrder.orderNumber} • Revendedor: {correctingOrder.resellerName}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseCorrection}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4 mt-5 text-xs">
              {/* Step 2 & 3: Current vs New Quantities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quantidades Retiradas */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider">
                    Quantidades Retiradas
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Pão Salgado Retirado (unidades)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editSaltyPickup}
                      onChange={(e) => setEditSaltyPickup(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Anterior: {correctingOrder.qtySaltyPickup} un
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Pão Doce Retirado (unidades)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editSweetPickup}
                      onChange={(e) => setEditSweetPickup(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Anterior: {correctingOrder.qtySweetPickup} un
                    </span>
                  </div>
                </div>

                {/* Quantidades Sobras */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider">
                    Quantidades que Sobraram
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Sobras Pão Salgado (unidades)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={editSaltyPickup}
                      value={editSaltyLeftover}
                      onChange={(e) => setEditSaltyLeftover(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Anterior: {correctingOrder.qtySaltyLeftover} un
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Sobras Pão Doce (unidades)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={editSweetPickup}
                      value={editSweetLeftover}
                      onChange={(e) => setEditSweetLeftover(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Anterior: {correctingOrder.qtySweetLeftover} un
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 5: Side-by-Side Comparison of Previous vs New Values */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <h4 className="font-black text-amber-950 mb-3 text-xs uppercase">
                  5. Comparativo: Valores Anteriores vs Novos Valores
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-xl border border-amber-200">
                    <span className="font-bold text-stone-400 uppercase text-[10px] block">
                      Valores Anteriores
                    </span>
                    <p className="mt-1 font-semibold text-stone-800">
                      Salgados Vendidos: {correctingOrder.qtySaltySold} un
                    </p>
                    <p className="font-semibold text-stone-800">
                      Doces Vendidos: {correctingOrder.qtySweetSold} un
                    </p>
                    <p className="mt-2 font-black text-sm text-stone-900">
                      Total Final: {formatCurrency(correctingOrder.finalTotal)}
                    </p>
                    <p className="font-bold text-rose-700">
                      Saldo Devido: {formatCurrency(correctingOrder.balanceDue)}
                    </p>
                  </div>

                  <div className="p-3 bg-amber-400/20 rounded-xl border border-amber-400">
                    <span className="font-bold text-amber-900 uppercase text-[10px] block">
                      Novos Valores Após Correção
                    </span>
                    <p className="mt-1 font-bold text-amber-950">
                      Salgados Vendidos: {simulatedNewMetrics.qtySaltySold} un
                    </p>
                    <p className="font-bold text-amber-950">
                      Doces Vendidos: {simulatedNewMetrics.qtySweetSold} un
                    </p>
                    <p className="mt-2 font-black text-sm text-amber-950">
                      Novo Total: {formatCurrency(simulatedNewMetrics.finalTotal)}
                    </p>
                    <p className="font-black text-rose-800">
                      Novo Saldo Devido: {formatCurrency(simulatedNewMetrics.balanceDue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 6: Solicitar Justificativa */}
              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase mb-1">
                  6. Justificativa da Alteração *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explique o motivo da correção (ex: contagem incorreta na entrega, devolução de lote danificado, etc.)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                />
              </div>

              {/* Step 7: Exigir Confirmação Explícita */}
              <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-audit"
                  checked={confirmedExplicitly}
                  onChange={(e) => setConfirmedExplicitly(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-red-800 focus:ring-red-800"
                />
                <label
                  htmlFor="confirm-audit"
                  className="text-[11px] font-bold text-red-950 cursor-pointer select-none"
                >
                  Confirmo explicitamente esta correção. Estou ciente de que meu usuário administrativo (
                  {currentUser?.email}), a data, o horário, a justificativa e os valores anteriores
                  serão registrados permanentemente na auditoria do sistema.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCloseCorrection}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !confirmedExplicitly || !reason.trim()}
                  onClick={handleSaveCorrection}
                  className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white font-black text-xs uppercase rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando Auditoria...' : 'Confirmar e Salvar Correção'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
