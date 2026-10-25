import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Croissant,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  DollarSign,
  FileText,
  X,
  Sparkles,
  ArrowRight,
  Wallet,
  ShieldCheck,
  Receipt,
  Info,
  Phone,
  Bell,
  Smartphone,
} from 'lucide-react';
import { Order, ProductPrices, PaymentRecord, InAppNotification, NotificationPreference } from '../../types';
import { formatCurrency, formatDate, formatDateTime, calculateOrderMetrics, formatPhone } from '../../utils/formatters';
import { createOrder, recordLeftovers, updateUserProfile } from '../../services/dataService';
import {
  requestNotificationPermission,
  getNotificationPermission,
  showSystemNotification,
  playNotificationTone,
} from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../PWAInstallButton';

interface ResellerHomeProps {
  orders: Order[];
  payments: PaymentRecord[];
  prices: ProductPrices;
  notifications: InAppNotification[];
  activeTab: 'orders' | 'leftovers' | 'financial' | 'notifications';
  setActiveTab: (tab: 'orders' | 'leftovers' | 'financial' | 'notifications') => void;
}

export const ResellerHome: React.FC<ResellerHomeProps> = ({
  orders,
  payments,
  prices,
  notifications,
  activeTab,
  setActiveTab,
}) => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  // New Order Modal State
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10) // Tomorrow
  );
  const [qtySalty, setQtySalty] = useState<number>(50);
  const [qtySweet, setQtySweet] = useState<number>(20);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [showConfirmSummary, setShowConfirmSummary] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Leftover Modal State
  const [selectedOrderForLeftovers, setSelectedOrderForLeftovers] = useState<Order | null>(null);
  const [saltyLeftover, setSaltyLeftover] = useState<number>(0);
  const [sweetLeftover, setSweetLeftover] = useState<number>(0);
  const [isSubmittingLeftovers, setIsSubmittingLeftovers] = useState(false);
  const [leftoverError, setLeftoverError] = useState<string | null>(null);

  // Phone registration modal state (especially for users logging in via Google)
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState(userProfile?.phone || '');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setPhoneError(null);

    if (!phoneInput.trim()) {
      setPhoneError('Por favor, informe seu número de WhatsApp.');
      return;
    }

    setIsSavingPhone(true);
    try {
      await updateUserProfile(currentUser.uid, {
        phone: phoneInput.trim(),
      });
      await refreshProfile();
      setShowPhoneModal(false);
    } catch (err: any) {
      console.error(err);
      setPhoneError('Erro ao salvar WhatsApp: ' + (err?.message || err));
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Notification status & preferences state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    return getNotificationPermission();
  });
  const [savingPref, setSavingPref] = useState(false);
  const [testNotifSent, setTestNotifSent] = useState(false);

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
  };

  const handleUpdateMyPreference = async (pref: NotificationPreference) => {
    if (!currentUser) return;
    setSavingPref(true);
    try {
      await updateUserProfile(currentUser.uid, {
        notificationPreference: pref,
      });
      await refreshProfile();
    } catch (err: any) {
      alert('Erro ao salvar preferência de notificação: ' + (err?.message || err));
    } finally {
      setSavingPref(false);
    }
  };

  const handleTestNotification = async () => {
    await showSystemNotification('🥖 Panificadora Morumbi', {
      body: 'Teste de aviso no celular! Seus pedidos, sobras e acertos aparecerão diretamente na barra de notificações.',
      tag: 'morumbi-test',
    });
    playNotificationTone();
    setTestNotifSent(true);
    setTimeout(() => setTestNotifSent(false), 3000);
  };

  // Filter only orders for current reseller
  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter((o) => o.resellerId === currentUser.uid);
  }, [orders, currentUser]);

  // Orders awaiting leftovers
  const ordersAwaitingLeftovers = useMemo(() => {
    return myOrders.filter((o) => !o.leftoversRecorded && o.status === 'aguardando_sobras');
  }, [myOrders]);

  // Financial summary
  const financialSummary = useMemo(() => {
    let totalDue = 0;
    let totalPaid = 0;
    let balanceDue = 0;

    myOrders.forEach((o) => {
      totalDue += o.finalTotal || 0;
      totalPaid += o.amountPaid || 0;
      balanceDue += o.balanceDue || 0;
    });

    return { totalDue, totalPaid, balanceDue };
  }, [myOrders]);

  // Calculated preview for new order modal
  const newOrderPreview = useMemo(() => {
    return calculateOrderMetrics({
      qtySaltyPickup: qtySalty,
      qtySweetPickup: qtySweet,
      qtySaltyLeftover: 0,
      qtySweetLeftover: 0,
      leftoversRecorded: false,
      unitPriceSalty: prices.priceSalty,
      unitPriceSweet: prices.priceSweet,
    });
  }, [qtySalty, qtySweet, prices]);

  // Calculated preview for leftovers modal
  const leftoversPreview = useMemo(() => {
    if (!selectedOrderForLeftovers) return null;
    return calculateOrderMetrics({
      qtySaltyPickup: selectedOrderForLeftovers.qtySaltyPickup,
      qtySweetPickup: selectedOrderForLeftovers.qtySweetPickup,
      qtySaltyLeftover: saltyLeftover,
      qtySweetLeftover: sweetLeftover,
      leftoversRecorded: true,
      unitPriceSalty: selectedOrderForLeftovers.unitPriceSalty,
      unitPriceSweet: selectedOrderForLeftovers.unitPriceSweet,
      amountPaid: selectedOrderForLeftovers.amountPaid,
    });
  }, [selectedOrderForLeftovers, saltyLeftover, sweetLeftover]);

  // Submit new order
  const handleConfirmCreateOrder = async () => {
    if (!currentUser || !userProfile) return;
    setOrderError(null);

    if (qtySalty <= 0 && qtySweet <= 0) {
      setOrderError('Informe ao menos uma quantidade de pão salgado ou doce.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      await createOrder({
        resellerId: currentUser.uid,
        resellerName: userProfile.displayName,
        orderDate,
        deliveryDate,
        qtySaltyPickup: Number(qtySalty),
        qtySweetPickup: Number(qtySweet),
        notes: orderNotes.trim(),
        currentPrices: prices,
      });

      setShowNewOrderModal(false);
      setShowConfirmSummary(false);
      setOrderNotes('');
      setActiveTab('orders');
    } catch (err: any) {
      console.error(err);
      setOrderError('Erro ao registrar pedido: ' + (err?.message || err));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Submit leftovers
  const handleSaveLeftovers = async () => {
    if (!selectedOrderForLeftovers || !currentUser || !userProfile) return;
    setLeftoverError(null);

    if (saltyLeftover < 0 || sweetLeftover < 0) {
      setLeftoverError('A quantidade de sobras não pode ser negativa.');
      return;
    }
    if (saltyLeftover > selectedOrderForLeftovers.qtySaltyPickup) {
      setLeftoverError('A sobra de pão salgado não pode ser maior que a retirada.');
      return;
    }
    if (sweetLeftover > selectedOrderForLeftovers.qtySweetPickup) {
      setLeftoverError('A sobra de pão doce não pode ser maior que a retirada.');
      return;
    }

    setIsSubmittingLeftovers(true);
    try {
      await recordLeftovers({
        order: selectedOrderForLeftovers,
        qtySaltyLeftover: Number(saltyLeftover),
        qtySweetLeftover: Number(sweetLeftover),
        recordedByUid: currentUser.uid,
        recordedByName: userProfile.displayName,
      });

      setSelectedOrderForLeftovers(null);
    } catch (err: any) {
      console.error(err);
      setLeftoverError('Erro ao registrar sobras: ' + (err?.message || err));
    } finally {
      setIsSubmittingLeftovers(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-950 via-red-900 to-red-950 rounded-3xl p-6 shadow-xl text-white border border-red-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-red-950/80 px-2.5 py-1 rounded-full border border-amber-400/30">
            Área Exclusiva do Revendedor
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
            Olá, {userProfile?.displayName || 'Revendedor'}!
          </h2>
          <p className="text-xs text-amber-200 mt-0.5">
            Faça seus pedidos diários e registre suas sobras com cálculo financeiro automático.
          </p>
        </div>

        <button
          onClick={() => {
            setOrderError(null);
            setShowConfirmSummary(false);
            setShowNewOrderModal(true);
          }}
          className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-xs uppercase px-5 py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 shrink-0"
        >
          <PlusCircle className="w-5 h-5 text-stone-950" />
          <span>Fazer Novo Pedido</span>
        </button>
      </div>

      {/* Notification Bar Permission Banner (if not yet granted) */}
      {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
        <div className="bg-gradient-to-r from-red-950 via-stone-900 to-red-950 text-white rounded-3xl p-5 shadow-md border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 font-black shadow-md">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                Ativar Avisos na Barra do Celular
              </p>
              <p className="text-xs text-stone-300 mt-0.5">
                Receba alertas quando a fornada sair quentinha, lembretes de sobras e comprovantes de pagamentos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestPermission}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 text-xs font-black uppercase rounded-2xl transition shadow-md shrink-0 flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4 text-stone-950" />
            <span>Ativar Avisos no Celular</span>
          </button>
        </div>
      )}

      {/* Financial Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
          <span className="text-xs font-extrabold uppercase text-stone-500 tracking-wider">
            Total em Pedidos Realizados
          </span>
          <p className="text-2xl font-black text-stone-900 mt-1">
            {formatCurrency(financialSummary.totalDue)}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">{myOrders.length} pedidos no histórico</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
          <span className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">
            Total Já Pago
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(financialSummary.totalPaid)}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Pagamentos confirmados pela padaria</p>
        </div>

        <div className="bg-amber-400/10 rounded-3xl p-5 border-2 border-amber-400/50 shadow-sm">
          <span className="text-xs font-extrabold uppercase text-amber-950 tracking-wider">
            Seu Saldo a Acertar
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {formatCurrency(financialSummary.balanceDue)}
          </p>
          <p className="text-[11px] text-amber-900 mt-0.5">Saldo pendente de quitação</p>
        </div>
      </div>

      {/* Missing WhatsApp Banner (especially useful for users logging in via Google) */}
      {!userProfile?.phone && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-950">
                Complete seu cadastro com seu WhatsApp
              </p>
              <p className="text-xs text-emerald-800">
                Assim a padaria pode enviar comprovantes de pagamento e confirmações dos seus pedidos.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPhoneInput(userProfile?.phone || '');
              setShowPhoneModal(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl shadow-xs transition shrink-0"
          >
            Cadastrar WhatsApp
          </button>
        </div>
      )}

      {/* Pending Leftovers Alert Banner */}
      {ordersAwaitingLeftovers.length > 0 && (
        <div className="bg-amber-500/15 border-2 border-amber-500/60 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-800 shrink-0" />
            <div>
              <p className="text-sm font-black text-amber-950">
                Você possui {ordersAwaitingLeftovers.length} pedido(s) aguardando registro de sobras!
              </p>
              <p className="text-xs text-amber-900">
                Informe as sobras para calcularmos o valor exato a pagar.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('leftovers')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase rounded-xl shadow-xs transition shrink-0"
          >
            Registrar Sobras Agora
          </button>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-stone-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 font-black text-xs uppercase transition border-b-2 whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-red-800 text-red-800'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Meus Pedidos ({myOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('leftovers')}
          className={`pb-3 px-4 font-black text-xs uppercase transition border-b-2 whitespace-nowrap ${
            activeTab === 'leftovers'
              ? 'border-red-800 text-red-800'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Registrar Sobras ({ordersAwaitingLeftovers.length})
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`pb-3 px-4 font-black text-xs uppercase transition border-b-2 whitespace-nowrap ${
            activeTab === 'financial'
              ? 'border-red-800 text-red-800'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Extrato Financeiro
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-4 font-black text-xs uppercase transition border-b-2 whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-red-800 text-red-800'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Notificações
        </button>
      </div>

      {/* TAB CONTENT 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-stone-900">Histórico de Pedidos</h3>
            <span className="text-xs text-stone-500 font-semibold">
              Cada pedido possui identificador único
            </span>
          </div>

          {myOrders.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs italic">
              Você ainda não fez nenhum pedido. Clique em "Fazer Novo Pedido" acima para começar!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] font-bold">
                    <th className="pb-3">Identificador</th>
                    <th className="pb-3">Data Entrega</th>
                    <th className="pb-3 text-right">Retiradas</th>
                    <th className="pb-3 text-right">Sobras</th>
                    <th className="pb-3 text-right">Qtd Vendida</th>
                    <th className="pb-3 text-right">Valor Final</th>
                    <th className="pb-3 text-right">Saldo a Pagar</th>
                    <th className="pb-3 text-center">Situação</th>
                    <th className="pb-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {myOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-stone-50 transition">
                      <td className="py-3 font-bold text-stone-900">{order.orderNumber}</td>
                      <td className="py-3 text-stone-600">{formatDate(order.deliveryDate)}</td>
                      <td className="py-3 text-right font-medium">
                        {order.qtySaltyPickup} salg / {order.qtySweetPickup} doce
                      </td>
                      <td className="py-3 text-right text-stone-600">
                        {order.leftoversRecorded ? (
                          `${order.qtySaltyLeftover} salg / ${order.qtySweetLeftover} doce`
                        ) : (
                          <span className="text-amber-600 font-bold italic">Aguardando</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-bold text-stone-900">
                        {order.qtySaltySold} salg / {order.qtySweetSold} doce
                      </td>
                      <td className="py-3 text-right font-black text-stone-900">
                        {formatCurrency(order.finalTotal)}
                        {!order.leftoversRecorded && (
                          <span className="block text-[9px] text-amber-700 font-normal">
                            (previsão antes de sobras)
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-black text-rose-700">
                        {formatCurrency(order.balanceDue)}
                      </td>
                      <td className="py-3 text-center">
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
                      <td className="py-3 text-center">
                        {!order.leftoversRecorded && (
                          <button
                            onClick={() => {
                              setSelectedOrderForLeftovers(order);
                              setSaltyLeftover(0);
                              setSweetLeftover(0);
                              setLeftoverError(null);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 font-bold text-[10px] text-stone-950 shadow-xs transition"
                          >
                            Informar Sobras
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: LEFTOVERS */}
      {activeTab === 'leftovers' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <h3 className="text-base font-black text-stone-900 mb-2">
            Pedidos Aguardando Registro de Sobras
          </h3>
          <p className="text-xs text-stone-500 mb-5">
            Ao informar as sobras de cada pedido, o cálculo de venda real e o valor final a pagar são atualizados instantaneamente.
          </p>

          {ordersAwaitingLeftovers.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-stone-800">Tudo em dia!</p>
              <p>Não há pedidos pendentes de registro de sobras no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ordersAwaitingLeftovers.map((order) => (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl border border-amber-300 bg-amber-50/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-sm text-stone-900">{order.orderNumber}</span>
                      <p className="text-xs text-stone-500">
                        Entrega: {formatDate(order.deliveryDate)}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                      Pendente de Sobras
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-stone-700">
                      <span>Pão Salgado Retirado:</span>
                      <span>{order.qtySaltyPickup} un</span>
                    </div>
                    <div className="flex justify-between font-bold text-stone-700">
                      <span>Pão Doce Retirado:</span>
                      <span>{order.qtySweetPickup} un</span>
                    </div>
                    <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-100">
                      <span>Valor Previsto:</span>
                      <span>{formatCurrency(order.expectedTotal)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOrderForLeftovers(order);
                      setSaltyLeftover(0);
                      setSweetLeftover(0);
                      setLeftoverError(null);
                    }}
                    className="w-full py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold text-xs uppercase rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Lançar Sobras Deste Pedido</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: FINANCIAL EXTRATO */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h3 className="text-base font-black text-stone-900 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-700" />
              <span>Extrato de Pagamentos Confirmados ({payments.length})</span>
            </h3>

            {payments.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs italic">
                Nenhum pagamento registrado no sistema até o momento.
              </div>
            ) : (
              <div className="space-y-2.5">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-black text-sm text-stone-900">
                        {formatCurrency(p.amount)}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Data: {formatDate(p.paymentDate)} • Forma: {p.paymentMethod.toUpperCase()}
                      </p>
                      {p.notes && <p className="text-[11px] text-stone-600 mt-1 italic">"{p.notes}"</p>}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Confirmado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Card 1: System Notification Bar & Status */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-800 text-amber-300 flex items-center justify-center shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Avisos na Barra de Notificação do Celular
                  </h3>
                  <p className="text-xs text-stone-500">
                    Controle como e onde os alertas da Panificadora Morumbi devem aparecer no seu aparelho
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {notificationPermission === 'granted' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Barra do Celular Ativada
                  </span>
                ) : notificationPermission === 'denied' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs border border-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Bloqueado no Navegador
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs uppercase rounded-xl transition shadow-xs flex items-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Permitir Notificações</span>
                  </button>
                )}

                {/* Test notification button */}
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testNotifSent}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition border border-stone-200 flex items-center gap-1.5"
                  title="Fazer um teste de envio agora na barra de notificações"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{testNotifSent ? 'Enviado!' : 'Testar no Celular'}</span>
                </button>
              </div>
            </div>

            {/* Preference Selector */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wide block">
                Onde você prefere receber avisos da Padaria Morumbi?
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    key: 'both' as NotificationPreference,
                    label: '⚡ Em Ambos',
                    desc: 'Barra do Celular + WhatsApp',
                  },
                  {
                    key: 'in_app' as NotificationPreference,
                    label: '📱 No Aplicativo',
                    desc: 'Barra de Status do Celular',
                  },
                  {
                    key: 'whatsapp' as NotificationPreference,
                    label: '💬 No WhatsApp',
                    desc: 'Mensagens no seu WhatsApp',
                  },
                  {
                    key: 'none' as NotificationPreference,
                    label: '🔕 Silencioso',
                    desc: 'Sem notificações sonoras',
                  },
                ].map((item) => {
                  const current = userProfile?.notificationPreference || 'both';
                  const isSelected = current === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={savingPref}
                      onClick={() => handleUpdateMyPreference(item.key)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-400/20 border-amber-500 shadow-xs ring-2 ring-amber-500/30'
                          : 'bg-stone-50 border-stone-200 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-xs text-stone-900">{item.label}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-amber-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-500 italic">
                Sua preferência fica salva automaticamente e informa a administração da padaria.
              </p>
            </div>
          </div>

          {/* Card 2: Notifications List */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h3 className="text-base font-black text-stone-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-800" />
              <span>Histórico de Notificações Recebidas ({notifications.length})</span>
            </h3>

            {notifications.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs italic">
                Nenhuma notificação recebida até o momento.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 bg-stone-50 hover:bg-amber-50/30 rounded-2xl border border-stone-200 text-xs space-y-1 transition"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-stone-900 flex items-center gap-1.5">
                        <Croissant className="w-3.5 h-3.5 text-amber-500" />
                        <span>{n.title}</span>
                      </p>
                      <span className="text-[10px] text-stone-400">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-stone-600 leading-relaxed pl-5">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: NOVO PEDIDO (COM RESUMO E PREVISÃO OBRIGATÓRIOS) */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-800 text-white flex items-center justify-center font-black">
                  <Croissant className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Novo Pedido de Pães</h3>
                  <p className="text-xs text-stone-500">Panificadora Morumbi</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderError && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{orderError}</span>
              </div>
            )}

            {!showConfirmSummary ? (
              <div className="space-y-4 mt-5 text-xs">
                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                      Data do Pedido *
                    </label>
                    <input
                      type="date"
                      required
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                      Data de Entrega *
                    </label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium"
                    />
                  </div>
                </div>

                {/* Quantities */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <h4 className="font-black text-stone-900 uppercase text-[11px]">
                    Quantidades Desejadas
                  </h4>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-stone-700">
                        Pão Salgado (unidades)
                      </label>
                      <span className="text-[10px] text-stone-500 font-semibold">
                        Preço: {formatCurrency(prices.priceSalty)} / un
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
                      <label className="font-bold text-stone-700">
                        Pão Doce (unidades)
                      </label>
                      <span className="text-[10px] text-stone-500 font-semibold">
                        Preço: {formatCurrency(prices.priceSweet)} / un
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

                {/* Observações */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    Observações Opcionais
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instruções de entrega, horário específico, etc..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium"
                  />
                </div>

                {/* Live value preview */}
                <div className="p-4 bg-amber-400/20 rounded-2xl border border-amber-400/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black text-amber-950">
                      Previsão Estimada Inicial
                    </span>
                    <p className="text-xs text-amber-900 font-medium">
                      {qtySalty} salgados + {qtySweet} doces
                    </p>
                  </div>
                  <span className="text-xl font-black text-amber-950">
                    {formatCurrency(newOrderPreview.expectedTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowNewOrderModal(false)}
                    className="px-4 py-2.5 font-bold text-stone-600 hover:text-stone-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={qtySalty <= 0 && qtySweet <= 0}
                    onClick={() => setShowConfirmSummary(true)}
                    className="px-5 py-2.5 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black uppercase text-xs rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>Avançar para Resumo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* CONFIRMATION SCREEN (REQUISITO SEÇÃO 9) */
              <div className="space-y-4 mt-5 text-xs">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300">
                  <h4 className="font-black text-amber-950 text-sm mb-3">
                    Confirmação do Pedido e Previsão
                  </h4>

                  <div className="space-y-2 text-stone-700">
                    <div className="flex justify-between">
                      <span className="font-bold">Data de Entrega:</span>
                      <span className="font-extrabold text-stone-900">{formatDate(deliveryDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pão Salgado:</span>
                      <span className="font-bold">
                        {qtySalty} un × {formatCurrency(prices.priceSalty)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pão Doce:</span>
                      <span className="font-bold">
                        {qtySweet} un × {formatCurrency(prices.priceSweet)}
                      </span>
                    </div>
                    {orderNotes && (
                      <div className="pt-1 border-t border-amber-200">
                        <span className="font-bold block">Obs:</span>
                        <span className="italic">{orderNotes}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-amber-300 flex justify-between font-black text-sm text-stone-900">
                      <span>Valor Previsto:</span>
                      <span className="text-amber-900">{formatCurrency(newOrderPreview.expectedTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200 text-stone-600 text-[11px] space-y-1">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-red-800" />
                    <span>Regras do Pedido:</span>
                  </p>
                  <p>1. Um pedido confirmado não pode ser editado pelo revendedor.</p>
                  <p>2. Se precisar de mais pães nesta mesma data, crie outro pedido normalmente.</p>
                  <p>3. O valor final será recalculado após o lançamento das sobras.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowConfirmSummary(false)}
                    className="px-4 py-2.5 font-bold text-stone-600 hover:text-stone-900"
                  >
                    Voltar e Editar
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingOrder}
                    onClick={handleConfirmCreateOrder}
                    className="px-6 py-2.5 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black uppercase text-xs rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {isSubmittingOrder ? 'Gravando Pedido...' : 'Confirmar e Enviar Pedido'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR SOBRAS */}
      {selectedOrderForLeftovers && leftoversPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Registrar Sobras</h3>
                  <p className="text-xs text-stone-500">
                    Pedido {selectedOrderForLeftovers.orderNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForLeftovers(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {leftoverError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{leftoverError}</span>
              </div>
            )}

            <div className="space-y-4 mt-5 text-xs">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="font-bold text-stone-500 uppercase text-[10px] block">
                  Quantidades Retiradas Neste Pedido:
                </span>
                <p className="font-black text-stone-900">
                  {selectedOrderForLeftovers.qtySaltyPickup} pães salgados /{' '}
                  {selectedOrderForLeftovers.qtySweetPickup} pães doces
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Sobras de Pão Salgado (unidades)
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedOrderForLeftovers.qtySaltyPickup}
                  value={saltyLeftover}
                  onChange={(e) => setSaltyLeftover(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-black text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Sobras de Pão Doce (unidades)
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedOrderForLeftovers.qtySweetPickup}
                  value={sweetLeftover}
                  onChange={(e) => setSweetLeftover(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-black text-sm text-stone-900"
                />
              </div>

              {/* Automatic Calculation Preview */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 space-y-1.5">
                <span className="font-extrabold text-[10px] uppercase text-amber-900 block">
                  Cálculo Automático de Venda
                </span>
                <div className="flex justify-between font-bold text-stone-800">
                  <span>Pão Salgado Vendido:</span>
                  <span>{leftoversPreview.qtySaltySold} un</span>
                </div>
                <div className="flex justify-between font-bold text-stone-800">
                  <span>Pão Doce Vendido:</span>
                  <span>{leftoversPreview.qtySweetSold} un</span>
                </div>
                <div className="pt-2 border-t border-amber-200 flex justify-between font-black text-sm text-stone-900">
                  <span>Novo Valor Final a Pagar:</span>
                  <span className="text-amber-900">
                    {formatCurrency(leftoversPreview.finalTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForLeftovers(null)}
                  className="px-4 py-2.5 font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingLeftovers}
                  onClick={handleSaveLeftovers}
                  className="px-5 py-2.5 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black text-xs uppercase rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmittingLeftovers ? 'Calculando...' : 'Confirmar e Salvar Sobras'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone / WhatsApp Registration Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Seu WhatsApp</h3>
                  <p className="text-[11px] text-stone-500">Para envio de comprovantes e pedidos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {phoneError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{phoneError}</span>
              </div>
            )}

            <form onSubmit={handleSavePhone} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Número do WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 98765-4321"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  O patrão usará este número para mandar confirmações de pagamento e avisos pelo WhatsApp.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPhone}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSavingPhone ? 'Salvando...' : 'Salvar WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
