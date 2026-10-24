import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Croissant,
  Phone,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  MessageCircle,
  Search,
  X,
  AlertCircle,
  Send,
  User,
  Tag,
} from 'lucide-react';
import { Order, ProductPrices } from '../../types';
import { formatCurrency, formatDate, formatDateTime, formatPhone, buildWhatsAppLink } from '../../utils/formatters';
import { createRetailOrder } from '../../services/dataService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface RetailOrdersViewProps {
  orders: Order[];
  prices: ProductPrices;
}

export const RetailOrdersView: React.FC<RetailOrdersViewProps> = ({ orders, prices }) => {
  const { currentUser, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pronto_retirada' | 'entregue'>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  // New retail order form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [qtySalty, setQtySalty] = useState<number>(20);
  const [qtySweet, setQtySweet] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter only retail orders
  const retailOrders = useMemo(() => {
    return orders.filter((o) => o.orderType === 'varejo' || o.resellerId === 'varejo');
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return retailOrders.filter((order) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(term) ||
        order.resellerName.toLowerCase().includes(term) ||
        (order.customerPhone && order.customerPhone.includes(term));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pronto_retirada' && order.status !== 'entregue' && order.status !== 'concluido') ||
        (statusFilter === 'entregue' && (order.status === 'entregue' || order.status === 'concluido'));

      return matchesSearch && matchesStatus;
    });
  }, [retailOrders, searchTerm, statusFilter]);

  // Financial and volume metrics
  const metrics = useMemo(() => {
    let totalSalty = 0;
    let totalSweet = 0;
    let totalRevenue = 0;
    let pendingBalance = 0;
    let pendingPickup = 0;

    retailOrders.forEach((o) => {
      totalSalty += o.qtySaltySold || o.qtySaltyPickup || 0;
      totalSweet += o.qtySweetSold || o.qtySweetPickup || 0;
      totalRevenue += o.finalTotal || 0;
      pendingBalance += o.balanceDue || 0;
      if (o.status !== 'entregue' && o.status !== 'concluido') {
        pendingPickup += 1;
      }
    });

    return {
      totalOrders: retailOrders.length,
      totalSalty,
      totalSweet,
      totalRevenue,
      pendingBalance,
      pendingPickup,
    };
  }, [retailOrders]);

  const unitSalty = prices.retailPriceSalty || 1.0;
  const unitSweet = prices.retailPriceSweet || 1.5;
  const calculatedTotal = Number((qtySalty * unitSalty + qtySweet * unitSweet).toFixed(2));

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg('Informe o nome do cliente que fez a encomenda.');
      return;
    }

    if (qtySalty <= 0 && qtySweet <= 0) {
      setErrorMsg('Informe a quantidade de pães para a encomenda.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRetailOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        orderDate,
        deliveryDate,
        qtySalty: Number(qtySalty),
        qtySweet: Number(qtySweet),
        notes: notes.trim(),
        currentPrices: prices,
        registeredBy: userProfile?.displayName || 'Administrador',
      });

      setShowNewModal(false);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setQtySalty(20);
      setQtySweet(0);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao cadastrar encomenda: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsDelivered = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'entregue',
        paymentStatus: 'pago',
        amountPaid: order.finalTotal,
        balanceDue: 0,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err?.message);
    }
  };

  const handleSendReadyWhatsApp = (order: Order) => {
    if (!order.customerPhone) {
      alert('Cliente sem telefone cadastrado.');
      return;
    }

    const text = `🥖 *PANIFICADORA MORUMBI* 🥖
Olá *${order.resellerName}*! Tudo bem?

Informamos que a sua encomenda de pães (*${order.orderNumber}*) já está pronta e quentinha para retirada no balcão!

📦 *Resumo da Encomenda:*
- ${order.qtySaltyPickup} Pães Salgados (R$ ${unitSalty.toFixed(2)}/un)
${order.qtySweetPickup > 0 ? `- ${order.qtySweetPickup} Pães Doces (R$ ${unitSweet.toFixed(2)}/un)\n` : ''}
💰 *Valor Total:* ${formatCurrency(order.finalTotal)}
${order.notes ? `📝 *Observação:* ${order.notes}\n` : ''}
Aguardamos você na padaria!`;

    const url = buildWhatsAppLink(order.customerPhone, text);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-6 h-6 text-red-800" />
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Encomendas Varejo (Consumidor Final — R$ {unitSalty.toFixed(2)})
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Aba exclusiva para clientes que compram direto pelo balcão ou encomendam sem preço de revenda.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setShowNewModal(true);
          }}
          className="bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black text-xs uppercase px-5 py-3 rounded-2xl shadow-md transition flex items-center justify-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-amber-400" />
          <span>+ Nova Encomenda Varejo (R$ {unitSalty.toFixed(2)})</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
          <span className="text-xs font-extrabold uppercase text-stone-500 tracking-wider">
            Total Encomendas
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
            {metrics.totalOrders}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Clientes finais</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
          <span className="text-xs font-extrabold uppercase text-amber-900 tracking-wider">
            Pães Salgados (R$ {unitSalty.toFixed(2)})
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-800 mt-1">
            {metrics.totalSalty} <span className="text-sm font-bold text-stone-500">un</span>
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">{metrics.totalSweet} doces</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
          <span className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">
            Faturamento Varejo
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
            {formatCurrency(metrics.totalRevenue)}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Calculado a preço de tabela</p>
        </div>

        <div className="bg-amber-400/10 rounded-3xl p-5 border-2 border-amber-400/40 shadow-sm">
          <span className="text-xs font-extrabold uppercase text-amber-950 tracking-wider">
            Aguardando Retirada
          </span>
          <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">
            {metrics.pendingPickup}
          </p>
          <p className="text-[11px] text-amber-900 mt-0.5">Prontos no balcão</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por nome do cliente, telefone ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-800"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700"
        >
          <option value="all">Todas as Encomendas</option>
          <option value="pronto_retirada">Aguardando Retirada no Balcão</option>
          <option value="entregue">Já Retiradas / Entregues</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-xs italic">
            Nenhuma encomenda de consumidor final registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] font-bold">
                  <th className="pb-3">Código</th>
                  <th className="pb-3">Cliente Varejo</th>
                  <th className="pb-3">Telefone</th>
                  <th className="pb-3">Data/Hora</th>
                  <th className="pb-3 text-right">Pão Salgado (R$ {unitSalty.toFixed(2)})</th>
                  <th className="pb-3 text-right">Pão Doce</th>
                  <th className="pb-3 text-right">Total a Pagar</th>
                  <th className="pb-3 text-center">Situação</th>
                  <th className="pb-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((order) => {
                  const isDelivered = order.status === 'entregue' || order.status === 'concluido';
                  return (
                    <tr key={order.id} className="hover:bg-stone-50 transition">
                      <td className="py-3.5 font-black text-stone-900">{order.orderNumber}</td>
                      <td className="py-3.5 font-bold text-stone-900">{order.resellerName}</td>
                      <td className="py-3.5 text-stone-600">
                        {order.customerPhone ? formatPhone(order.customerPhone) : '—'}
                      </td>
                      <td className="py-3.5 text-stone-600">{formatDate(order.deliveryDate)}</td>
                      <td className="py-3.5 text-right font-bold text-amber-900">
                        {order.qtySaltyPickup} un
                      </td>
                      <td className="py-3.5 text-right font-medium text-stone-600">
                        {order.qtySweetPickup} un
                      </td>
                      <td className="py-3.5 text-right font-black text-stone-900">
                        {formatCurrency(order.finalTotal)}
                      </td>
                      <td className="py-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isDelivered ? 'Entregue / Pago' : 'Aguardando Retirada'}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {order.customerPhone && (
                            <button
                              onClick={() => handleSendReadyWhatsApp(order)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                              title="Avisar no WhatsApp que a encomenda está pronta"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isDelivered ? (
                            <button
                              onClick={() => handleMarkAsDelivered(order)}
                              className="px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] shadow-xs transition"
                            >
                              Baixar / Pago
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Quitado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVA ENCOMENDA VAREJO */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-800 text-white flex items-center justify-center font-black">
                  <Croissant className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Nova Encomenda Varejo (Consumidor Final)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Preço fixo de balcão: Pão Salgado a {formatCurrency(unitSalty)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4 mt-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dona Neide (Igreja)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98888-7777"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Data de Retirada *
                </label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium"
                />
              </div>

              {/* Quantities */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <h4 className="font-black text-stone-900 uppercase text-[11px]">
                  Quantidades da Encomenda
                </h4>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-stone-700">Pão Salgado (unidades)</label>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      Preço: {formatCurrency(unitSalty)} / un
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={qtySalty}
                    onChange={(e) => setQtySalty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl font-black text-sm text-stone-900"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-stone-700">Pão Doce (unidades)</label>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      Preço: {formatCurrency(unitSweet)} / un
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={qtySweet}
                    onChange={(e) => setQtySweet(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl font-black text-sm text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Pães bem quentinhos para as 16h, café da tarde da empresa..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium"
                />
              </div>

              {/* Total Card */}
              <div className="p-4 bg-amber-400/20 rounded-2xl border border-amber-400 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-950 block">
                    Valor Total da Encomenda
                  </span>
                  <span className="text-xs text-amber-900 font-medium">
                    {qtySalty} salgados + {qtySweet} doces
                  </span>
                </div>
                <span className="text-2xl font-black text-amber-950">
                  {formatCurrency(calculatedTotal)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || calculatedTotal <= 0}
                  className="px-6 py-2.5 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black uppercase text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>{isSubmitting ? 'Salvando...' : 'Salvar Encomenda Varejo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
