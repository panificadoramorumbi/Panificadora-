import React, { useState, useMemo } from 'react';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Filter,
  Croissant,
  Layers,
  Share2,
  Copy,
  Check,
  Globe,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Order, UserProfile, PaymentRecord } from '../../types';
import { formatCurrency, formatDate, buildWhatsAppLink } from '../../utils/formatters';
import { getPublicAppUrl } from '../../config/appConfig';
import { recordLeftovers, DEFAULT_PRICES } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

interface DashboardViewProps {
  orders: Order[];
  clients: UserProfile[];
  payments: PaymentRecord[];
  onNavigate: (view: string, clientId?: string) => void;
}

export type PeriodFilter = 'today' | '7days' | 'month' | 'all';

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  clients,
  payments,
  onNavigate,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [copiedLink, setCopiedLink] = useState(false);
  const publicUrl = getPublicAppUrl();

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `🥖 *PANIFICADORA MORUMBI* 🥖
Olá! Segue o link do nosso aplicativo para você fazer pedidos de pães e acompanhar suas entregas:
📲 ${publicUrl}

Abra pelo navegador do celular e clique em "Instalar Aplicativo" para salvar na sua tela inicial!`;
    const url = buildWhatsAppLink('', text);
    window.open(url, '_blank');
  };

  // Direct Leftovers Recording for Admin
  const { currentUser } = useAuth();
  const [orderForLeftovers, setOrderForLeftovers] = useState<Order | null>(null);
  const [adminSaltyLeftover, setAdminSaltyLeftover] = useState<number>(0);
  const [adminSweetLeftover, setAdminSweetLeftover] = useState<number>(0);
  const [isSavingAdminLeftovers, setIsSavingAdminLeftovers] = useState(false);
  const [adminLeftoverError, setAdminLeftoverError] = useState<string | null>(null);
  const [adminLeftoverSuccess, setAdminLeftoverSuccess] = useState<string | null>(null);

  const handleOpenRecordLeftovers = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOrderForLeftovers(order);
    setAdminSaltyLeftover(0);
    setAdminSweetLeftover(0);
    setAdminLeftoverError(null);
    setAdminLeftoverSuccess(null);
  };

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
        recordedByName: 'Administrador (Padaria)',
      });

      setAdminLeftoverSuccess(
        `Sobras gravadas com sucesso para ${orderForLeftovers.resellerName}! O valor final foi atualizado.`
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

  // Filter orders according to period
  const filteredOrders = useMemo(() => {
    if (period === 'all') return orders;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return orders.filter((order) => {
      const orderDate = order.deliveryDate || order.orderDate || order.createdAt.slice(0, 10);

      if (period === 'today') {
        return orderDate === todayStr;
      }

      if (period === '7days') {
        const orderTime = new Date(orderDate).getTime();
        const diffDays = (now.getTime() - orderTime) / (1000 * 3600 * 24);
        return diffDays >= -1 && diffDays <= 7;
      }

      if (period === 'month') {
        const orderMonth = orderDate.slice(0, 7);
        const currentMonth = todayStr.slice(0, 7);
        return orderMonth === currentMonth;
      }

      return true;
    });
  }, [orders, period]);

  // Real calculated metrics
  const activeClientsCount = useMemo(() => {
    return clients.filter((c) => c.role === 'revendedor' && c.active).length;
  }, [clients]);

  const metrics = useMemo(() => {
    let saltySold = 0;
    let sweetSold = 0;
    let expectedTotal = 0;
    let finalTotal = 0;
    let totalPaid = 0;
    let pendingBalance = 0;
    let awaitingLeftovers = 0;
    let paidOrders = 0;

    filteredOrders.forEach((o) => {
      saltySold += o.qtySaltySold || 0;
      sweetSold += o.qtySweetSold || 0;
      expectedTotal += o.expectedTotal || 0;
      finalTotal += o.finalTotal || 0;
      totalPaid += o.amountPaid || 0;
      pendingBalance += o.balanceDue || 0;

      if (!o.leftoversRecorded && o.status === 'aguardando_sobras') {
        awaitingLeftovers += 1;
      }
      if (o.paymentStatus === 'pago') {
        paidOrders += 1;
      }
    });

    return {
      totalOrders: filteredOrders.length,
      saltySold,
      sweetSold,
      expectedTotal,
      finalTotal,
      totalPaid,
      pendingBalance,
      awaitingLeftovers,
      paidOrders,
    };
  }, [filteredOrders]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Period Filter */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            1. Painel Geral de Gestão
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Métricas consolidadas em tempo real do banco de dados oficial.
          </p>
        </div>

        {/* Controls: Period Selector & Quick Price Edit */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onNavigate('settings')}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-xs uppercase flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-stone-950" />
            <span>Mudar Preço dos Pães</span>
          </button>

          <div className="inline-flex p-1 bg-stone-100 rounded-2xl border border-stone-200">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                period === 'today'
                  ? 'bg-red-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                period === '7days'
                  ? 'bg-red-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                period === 'month'
                  ? 'bg-red-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                period === 'all'
                  ? 'bg-red-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todos
            </button>
          </div>
        </div>
      </div>

      {/* Public Shareable Link for Customers & Resellers (ais-pre URL) */}
      <div className="bg-gradient-to-r from-red-950 via-stone-900 to-red-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-red-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                Link Oficial para Clientes e Revendedores Acessarem
              </h3>
            </div>
            <p className="text-xs text-stone-300">
              Envie este link para qualquer pessoa acessar no celular. Ele funciona publicamente em qualquer aparelho:
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono text-xs bg-black/40 px-3 py-2 rounded-xl border border-white/10 text-amber-200 select-all max-w-xl truncate">
              <Globe className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="truncate">{publicUrl}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-md ${
                copiedLink
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white hover:bg-stone-100 text-stone-900'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Financial Highlights (Yellow / Gold Focus) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valor Final a Receber */}
        <div className="bg-amber-400/10 border-2 border-amber-400/40 rounded-3xl p-5 shadow-sm relative overflow-hidden bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase text-amber-900 tracking-wider">
              Valor Final Realizado
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">
            {formatCurrency(metrics.finalTotal)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            Calculado com sobras deduzidas
          </p>
        </div>

        {/* Total Recebido */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-5 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">
              Total Recebido
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">
            {formatCurrency(metrics.totalPaid)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Pagamentos liquidados</p>
        </div>

        {/* Saldo Pendente */}
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-5 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase text-rose-800 tracking-wider">
              Saldo Pendente
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-black">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-700">
            {formatCurrency(metrics.pendingBalance)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">A receber dos revendedores</p>
        </div>

        {/* Valor Previsto a Receber */}
        <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase text-stone-600 tracking-wider">
              Valor Previsto
            </span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-black">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-800">
            {formatCurrency(metrics.expectedTotal)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">Baseado na retirada inicial</p>
        </div>
      </div>

      {/* Secondary Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Clientes Ativos */}
        <div
          onClick={() => onNavigate('clients')}
          className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs hover:border-red-800 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <Users className="w-4 h-4 text-red-800" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-stone-900">{activeClientsCount}</p>
          <p className="text-[11px] font-bold text-stone-500">Revendedores Ativos</p>
        </div>

        {/* Pedidos do período */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs hover:border-red-800 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <ShoppingBag className="w-4 h-4 text-amber-600" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-stone-900">{metrics.totalOrders}</p>
          <p className="text-[11px] font-bold text-stone-500">Pedidos no Período</p>
        </div>

        {/* Pães Salgados Vendidos */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <Croissant className="w-4 h-4 text-amber-700" />
          </div>
          <p className="text-xl font-black text-amber-800">{metrics.saltySold}</p>
          <p className="text-[11px] font-bold text-stone-500">Pães Salgados Vendidos</p>
        </div>

        {/* Pães Doces Vendidos */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <Croissant className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-600">{metrics.sweetSold}</p>
          <p className="text-[11px] font-bold text-stone-500">Pães Doces Vendidos</p>
        </div>

        {/* Aguardando Sobras */}
        <div
          onClick={() => onNavigate('orders')}
          className={`rounded-2xl p-4 border shadow-xs transition cursor-pointer ${
            metrics.awaitingLeftovers > 0
              ? 'bg-amber-50 border-amber-300'
              : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <Clock className="w-4 h-4 text-amber-700" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-amber-900">{metrics.awaitingLeftovers}</p>
          <p className="text-[11px] font-bold text-amber-800">Aguardando Sobras</p>
        </div>

        {/* Pedidos Pagos */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs hover:border-emerald-600 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-emerald-800">{metrics.paidOrders}</p>
          <p className="text-[11px] font-bold text-stone-500">Pedidos Pagos</p>
        </div>
      </div>

      {/* Orders awaiting leftovers quick action list */}
      {metrics.awaitingLeftovers > 0 && (
        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
              <Clock className="w-5 h-5 text-amber-700" />
              <span>Pedidos Aguardando Registro de Sobras ({metrics.awaitingLeftovers})</span>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-red-900 hover:underline"
            >
              Ver todos os pedidos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOrders
              .filter((o) => !o.leftoversRecorded && o.status === 'aguardando_sobras')
              .slice(0, 6)
              .map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between hover:border-amber-400 transition space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-stone-900">{order.resellerName}</p>
                      <p className="text-[11px] text-stone-500">
                        {order.orderNumber} • Entrega: {formatDate(order.deliveryDate)}
                      </p>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800">
                      Pendente
                    </span>
                  </div>

                  <div className="text-[11px] font-semibold text-amber-950 bg-amber-50/70 p-2.5 rounded-xl border border-amber-100">
                    Retirada: <strong>{order.qtySaltyPickup} salg. + {order.qtySweetPickup} doces</strong>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleOpenRecordLeftovers(order, e)}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                    <span>Lançar Sobras Agora</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Orders Overview */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-stone-900">
            Últimos Pedidos Registrados
          </h3>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-red-800 hover:underline flex items-center gap-1"
          >
            <span>Ver Todos</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            Nenhum pedido registrado no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Identificador</th>
                  <th className="pb-3">Revendedor</th>
                  <th className="pb-3">Data Entrega</th>
                  <th className="pb-3 text-right">Retiradas</th>
                  <th className="pb-3 text-right">Sobras</th>
                  <th className="pb-3 text-right">Valor Final</th>
                  <th className="pb-3 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.slice(0, 8).map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => onNavigate('orders')}
                    className="hover:bg-stone-50 cursor-pointer transition"
                  >
                    <td className="py-3 font-bold text-stone-900">{order.orderNumber}</td>
                    <td className="py-3 font-medium text-stone-800">{order.resellerName}</td>
                    <td className="py-3 text-stone-600">{formatDate(order.deliveryDate)}</td>
                    <td className="py-3 text-right font-medium">
                      {order.qtySaltyPickup} salg / {order.qtySweetPickup} doces
                    </td>
                    <td className="py-3 text-right text-stone-600">
                      {order.leftoversRecorded ? (
                        `${order.qtySaltyLeftover} salg / ${order.qtySweetLeftover} doces`
                      ) : (
                        <span className="text-amber-600 font-semibold italic">Não registradas</span>
                      )}
                    </td>
                    <td className="py-3 text-right font-bold text-stone-900">
                      {formatCurrency(order.finalTotal)}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Administrador Lançar Sobras pelo Cliente no Dashboard */}
      {orderForLeftovers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Lançar Sobras ({orderForLeftovers.orderNumber})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Revendedor: <strong className="text-stone-800">{orderForLeftovers.resellerName}</strong>
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
                  sSold * (orderForLeftovers.unitPriceSalty || DEFAULT_PRICES.priceSalty) +
                  wSold * (orderForLeftovers.unitPriceSweet || DEFAULT_PRICES.priceSweet);
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
