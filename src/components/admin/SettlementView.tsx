import React, { useState, useMemo } from 'react';
import {
  Wallet,
  DollarSign,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  FileText,
  User,
  X,
  History,
  Lock,
  MessageCircle,
  Send,
  ExternalLink,
  Bell,
  Smartphone,
  Sparkles,
  Check,
} from 'lucide-react';
import { Order, UserProfile, PaymentRecord, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, formatDateTime, buildWhatsAppLink } from '../../utils/formatters';
import { registerPayment } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

interface SettlementViewProps {
  orders: Order[];
  clients: UserProfile[];
  payments: PaymentRecord[];
  selectedClientId?: string | null;
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  orders,
  clients,
  payments,
  selectedClientId = null,
}) => {
  const { currentUser, userProfile } = useAuth();

  const resellers = useMemo(() => {
    return clients.filter((c) => c.role === 'revendedor');
  }, [clients]);

  // Selected reseller
  const [activeResellerId, setActiveResellerId] = useState<string>(
    selectedClientId || (resellers[0]?.uid ?? '')
  );

  // Modal state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('pix');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState<string>('');
  
  // Notification options: Admin can choose WhatsApp, App Notification, both, or neither!
  const [sendInAppNotif, setSendInAppNotif] = useState<boolean>(true);
  const [sendWhatsAppNotif, setSendWhatsAppNotif] = useState<boolean>(false);
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success modal with confirmation
  const [confirmedPaymentData, setConfirmedPaymentData] = useState<{
    resellerName: string;
    phone: string;
    amount: number;
    method: PaymentMethod;
    date: string;
    notes: string;
    remainingBalance: number;
    whatsappUrl: string;
    sentInApp: boolean;
    sentWhatsApp: boolean;
  } | null>(null);

  const activeReseller = useMemo(() => {
    return resellers.find((r) => r.uid === activeResellerId) || null;
  }, [resellers, activeResellerId]);

  // Orders for this reseller
  const resellerOrders = useMemo(() => {
    if (!activeResellerId) return [];
    return orders.filter((o) => o.resellerId === activeResellerId);
  }, [orders, activeResellerId]);

  // Payments for this reseller
  const resellerPayments = useMemo(() => {
    if (!activeResellerId) return [];
    return payments.filter((p) => p.resellerId === activeResellerId);
  }, [payments, activeResellerId]);

  // Overall financial summary for active reseller
  const financialSummary = useMemo(() => {
    let totalDue = 0;
    let totalPaid = 0;
    let pendingBalance = 0;

    resellerOrders.forEach((o) => {
      totalDue += o.finalTotal || 0;
      totalPaid += o.amountPaid || 0;
      pendingBalance += o.balanceDue || 0;
    });

    return {
      totalDue,
      totalPaid,
      pendingBalance,
    };
  }, [resellerOrders]);

  const handleOpenPaymentModal = () => {
    setPayAmount(financialSummary.pendingBalance > 0 ? financialSummary.pendingBalance : 0);
    setPayMethod('pix');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes('');
    setErrorMsg(null);
    setConfirmedPaymentData(null);

    // Initialize notification preferences based on client profile
    const clientPref = activeReseller?.notificationPreference || 'both';
    if (clientPref === 'whatsapp') {
      setSendWhatsAppNotif(true);
      setSendInAppNotif(false);
    } else if (clientPref === 'in_app') {
      setSendWhatsAppNotif(false);
      setSendInAppNotif(true);
    } else if (clientPref === 'none') {
      setSendWhatsAppNotif(false);
      setSendInAppNotif(false);
    } else {
      // 'both'
      setSendWhatsAppNotif(true);
      setSendInAppNotif(true);
    }

    setShowPaymentModal(true);
  };

  const buildWhatsAppText = (
    resellerName: string,
    amount: number,
    method: PaymentMethod,
    date: string,
    notes: string,
    remaining: number
  ) => {
    const methodLabels: Record<string, string> = {
      pix: 'PIX',
      dinheiro: 'Dinheiro em Espécie',
      transferencia: 'Transferência Bancária',
      cartao: 'Cartão',
      outro: 'Outro',
    };

    return `🥖 *PANIFICADORA MORUMBI* 🥖
*COMPROVANTE DE PAGAMENTO RECEBIDO*

Olá *${resellerName}*!
Confirmamos o recebimento do seu acerto financeiro:

💰 *Valor Pago:* ${formatCurrency(amount)}
💳 *Forma de Pagamento:* ${methodLabels[method] || method.toUpperCase()}
📅 *Data:* ${formatDate(date)}
${notes ? `📝 *Observação:* ${notes}\n` : ''}
${
  remaining <= 0
    ? '✅ *SITUAÇÃO:* Seu saldo com a padaria está *100% QUITADO*! Muito obrigado pela parceria!'
    : `📊 *Saldo restante a acertar:* ${formatCurrency(remaining)}`
}

Qualquer dúvida estamos à disposição!
_Panificadora Morumbi — Sistema de Revenda_`;
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReseller) return;
    setErrorMsg(null);

    if (payAmount <= 0) {
      setErrorMsg('O valor a pagar deve ser maior que zero (R$ 0,00).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find orders with balance due, ordered from oldest to newest
      const pendingOrders = resellerOrders
        .filter((o) => (o.balanceDue || 0) > 0)
        .sort(
          (a, b) =>
            new Date(a.deliveryDate || a.createdAt).getTime() -
            new Date(b.deliveryDate || b.createdAt).getTime()
        );

      await registerPayment({
        resellerId: activeReseller.uid,
        resellerName: activeReseller.displayName,
        orderIds: pendingOrders.map((o) => o.id),
        amount: Number(payAmount),
        paymentMethod: payMethod,
        paymentDate: payDate,
        notes: payNotes.trim(),
        adminId: currentUser?.uid || 'admin',
        adminName: userProfile?.displayName || 'Administrador',
        ordersToUpdate: pendingOrders,
      });

      const remainingBalance = Math.max(0, financialSummary.pendingBalance - payAmount);
      const text = buildWhatsAppText(
        activeReseller.displayName,
        payAmount,
        payMethod,
        payDate,
        payNotes.trim(),
        remainingBalance
      );
      const whatsappUrl = buildWhatsAppLink(activeReseller.phone || '', text);

      // Open WhatsApp automatically ONLY if user chose to send via WhatsApp and phone exists
      if (sendWhatsAppNotif && activeReseller.phone) {
        window.open(whatsappUrl, '_blank');
      }

      setConfirmedPaymentData({
        resellerName: activeReseller.displayName,
        phone: activeReseller.phone,
        amount: payAmount,
        method: payMethod,
        date: payDate,
        notes: payNotes.trim(),
        remainingBalance,
        whatsappUrl,
        sentInApp: sendInAppNotif,
        sentWhatsApp: sendWhatsAppNotif,
      });

      setShowPaymentModal(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao registrar pagamento: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendExistingPaymentWhatsApp = (pay: PaymentRecord) => {
    if (!activeReseller) return;
    const text = buildWhatsAppText(
      pay.resellerName,
      pay.amount,
      pay.paymentMethod,
      pay.paymentDate,
      pay.notes || '',
      financialSummary.pendingBalance
    );
    const url = buildWhatsAppLink(activeReseller.phone || '', text);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-red-800" />
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              5. Acertos Financeiros e Pagamentos
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Ao confirmar o pagamento, envie o comprovante diretamente no WhatsApp do cliente.
          </p>
        </div>

        {/* Reseller Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-stone-600 uppercase">Revendedor:</label>
          <select
            value={activeResellerId}
            onChange={(e) => setActiveResellerId(e.target.value)}
            className="px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800"
          >
            {resellers.map((r) => (
              <option key={r.uid} value={r.uid}>
                {r.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeReseller ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Devido */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
              <span className="text-xs font-extrabold uppercase text-stone-500 tracking-wider">
                Total Devido Acumulado
              </span>
              <p className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
                {formatCurrency(financialSummary.totalDue)}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">Soma dos pedidos concluídos</p>
            </div>

            {/* Total Já Pago */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
              <span className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">
                Total Já Pago
              </span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                {formatCurrency(financialSummary.totalPaid)}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">Pagamentos confirmados</p>
            </div>

            {/* Saldo Pendente & Button */}
            <div className="bg-amber-400/10 rounded-3xl p-5 border-2 border-amber-400/50 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase text-amber-950 tracking-wider">
                  Saldo Pendente Atual
                </span>
                <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">
                  {formatCurrency(financialSummary.pendingBalance)}
                </p>
              </div>

              <button
                onClick={handleOpenPaymentModal}
                className="mt-3 w-full py-2.5 px-4 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>Registrar Pagamento / Acerto</span>
              </button>
            </div>
          </div>

          {/* Orders Included in Settlement */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h3 className="text-base font-black text-stone-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-800" />
              <span>Pedidos Incluídos no Acerto Financeiro ({resellerOrders.length})</span>
            </h3>

            {resellerOrders.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs italic">
                Nenhum pedido registrado para este revendedor.
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
                      <th className="pb-3 text-right">Já Pago</th>
                      <th className="pb-3 text-right">Saldo Devedor</th>
                      <th className="pb-3 text-center">Status Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {resellerOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-stone-50 transition">
                        <td className="py-3 font-bold text-stone-900">{o.orderNumber}</td>
                        <td className="py-3 text-stone-600">{formatDate(o.deliveryDate)}</td>
                        <td className="py-3 text-right">
                          {o.qtySaltyPickup}s / {o.qtySweetPickup}d
                        </td>
                        <td className="py-3 text-right text-stone-600">
                          {o.leftoversRecorded
                            ? `${o.qtySaltyLeftover}s / ${o.qtySweetLeftover}d`
                            : 'Pendente'}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {o.qtySaltySold}s / {o.qtySweetSold}d
                        </td>
                        <td className="py-3 text-right font-black text-stone-900">
                          {formatCurrency(o.finalTotal)}
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-700">
                          {formatCurrency(o.amountPaid)}
                        </td>
                        <td className="py-3 text-right font-black text-rose-700">
                          {formatCurrency(o.balanceDue)}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              o.paymentStatus === 'pago'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.paymentStatus === 'parcial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {o.paymentStatus === 'pago'
                              ? 'Quitado'
                              : o.paymentStatus === 'parcial'
                              ? 'Parcial'
                              : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historical Payments Ledger with WhatsApp confirmation buttons */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h3 className="text-base font-black text-stone-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-700" />
              <span>Histórico de Lançamentos de Pagamento ({resellerPayments.length})</span>
            </h3>

            {resellerPayments.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-xs italic">
                Nenhum pagamento registrado ainda para este revendedor.
              </div>
            ) : (
              <div className="space-y-2.5">
                {resellerPayments.map((pay) => (
                  <div
                    key={pay.id}
                    className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-stone-900 text-sm">
                          {formatCurrency(pay.amount)}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-800 font-bold uppercase text-[10px]">
                          {pay.paymentMethod}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Data: <strong>{formatDate(pay.paymentDate)}</strong> • Registrado por: {pay.registeredByName || 'Admin'}
                      </p>
                      {pay.notes && (
                        <p className="text-[11px] text-stone-600 mt-1 italic">Obs: "{pay.notes}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendExistingPaymentWhatsApp(pay)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                        title="Enviar comprovante deste pagamento para o WhatsApp do cliente"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Enviar no WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm text-stone-500 text-xs">
          Nenhum revendedor selecionado ou cadastrado no sistema.
        </div>
      )}

      {/* MODAL: REGISTRAR PAGAMENTO */}
      {showPaymentModal && activeReseller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Registrar Pagamento</h3>
                  <p className="text-xs text-stone-500">{activeReseller.displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterPayment} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Valor Pago (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-base font-black text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Saldo pendente atual: {formatCurrency(financialSummary.pendingBalance)} (aceita pagamento parcial)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Forma de Pagamento *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro em Espécie</option>
                  <option value="transferencia">Transferência Bancária (TED/DOC)</option>
                  <option value="cartao">Cartão de Débito/Crédito</option>
                  <option value="outro">Outro Acerto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Data do Pagamento *
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Comprovante de PIX nº, entrega presencial, etc..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Notification Channels Selection */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Como Notificar Este Pagamento?</span>
                  </span>
                  {activeReseller.notificationPreference && (
                    <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-bold">
                      Preferência: {
                        activeReseller.notificationPreference === 'in_app'
                          ? '📱 No App'
                          : activeReseller.notificationPreference === 'whatsapp'
                          ? '💬 WhatsApp'
                          : activeReseller.notificationPreference === 'both'
                          ? '⚡ Ambos'
                          : '🔕 Silencioso'
                      }
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Option 1: In-App Notification (Status Bar / System Tray) */}
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      sendInAppNotif
                        ? 'bg-red-50 border-red-300 text-red-950 font-bold shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sendInAppNotif}
                      onChange={(e) => setSendInAppNotif(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-red-800 focus:ring-red-800"
                    />
                    <div className="text-xs flex-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Smartphone className="w-3.5 h-3.5 text-red-800" />
                        <span>Notificação no Celular / Aplicativo</span>
                      </div>
                      <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                        Aparece na barra de status/notificações do celular do revendedor e fica gravada no sininho do app.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: WhatsApp Message */}
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      sendWhatsAppNotif
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sendWhatsAppNotif}
                      onChange={(e) => setSendWhatsAppNotif(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-600"
                    />
                    <div className="text-xs flex-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Abrir WhatsApp com Comprovante Formatado</span>
                      </div>
                      <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                        {activeReseller.phone
                          ? `Envia mensagem para ${activeReseller.phone} com todos os dados e saldo quitado.`
                          : 'Atenção: Revendedor sem telefone cadastrado.'}
                      </p>
                    </div>
                  </label>
                </div>

                {!sendInAppNotif && !sendWhatsAppNotif && (
                  <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ℹ️ Nenhuma notificação será enviada. O acerto será gravado de forma 100% silenciosa no sistema.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || payAmount <= 0}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Gravando...'
                      : sendWhatsAppNotif && sendInAppNotif
                      ? 'Confirmar (App + WhatsApp)'
                      : sendWhatsAppNotif
                      ? 'Confirmar e Abrir WhatsApp'
                      : sendInAppNotif
                      ? 'Confirmar e Notificar no App'
                      : 'Confirmar Pagamento'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUCESSO DO PAGAMENTO COM CANAIS ESPECIFICADOS */}
      {confirmedPaymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-stone-900">Pagamento Registrado com Sucesso!</h3>
            <p className="text-xs text-stone-500 mt-1">
              O saldo de <strong>{confirmedPaymentData.resellerName}</strong> foi atualizado.
            </p>

            {/* Notification dispatch badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 mb-2">
              {confirmedPaymentData.sentInApp ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                  <Smartphone className="w-3.5 h-3.5" /> Alerta no Celular Enviado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-500">
                  Sem alerta no celular
                </span>
              )}

              {confirmedPaymentData.sentWhatsApp ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Acionado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-500">
                  WhatsApp não enviado
                </span>
              )}
            </div>

            <div className="my-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-stone-500">Valor Recebido:</span>
                <span className="text-emerald-700 font-bold">
                  {formatCurrency(confirmedPaymentData.amount)}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-stone-500">Forma:</span>
                <span className="uppercase text-stone-800">{confirmedPaymentData.method}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-stone-500">Saldo Restante:</span>
                <span className="text-rose-700 font-bold">
                  {formatCurrency(confirmedPaymentData.remainingBalance)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {confirmedPaymentData.sentWhatsApp ? (
                <a
                  href={confirmedPaymentData.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Reabrir WhatsApp do Cliente</span>
                </a>
              ) : (
                <a
                  href={confirmedPaymentData.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 font-bold text-xs rounded-xl border border-stone-200 hover:border-emerald-300 transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Mudar de ideia: Enviar Comprovante no WhatsApp</span>
                </a>
              )}

              <button
                onClick={() => setConfirmedPaymentData(null)}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition shadow-xs"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
