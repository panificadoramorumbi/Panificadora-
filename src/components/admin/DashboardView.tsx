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
} from 'lucide-react';
import { Order, UserProfile, PaymentRecord } from '../../types';
import { formatCurrency, formatDate, buildWhatsAppLink } from '../../utils/formatters';
import { getPublicAppUrl } from '../../config/appConfig';

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
                  onClick={() => onNavigate('orders')}
                  className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-red-800 transition"
                >
                  <div>
                    <p className="text-xs font-bold text-stone-900">{order.resellerName}</p>
                    <p className="text-[11px] text-stone-500">
                      {order.orderNumber} • Entrega: {formatDate(order.deliveryDate)}
                    </p>
                    <p className="text-[11px] font-semibold text-amber-900 mt-1">
                      Retirada: {order.qtySaltyPickup} salg. + {order.qtySweetPickup} doces
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800">
                      Pendente
                    </span>
                  </div>
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
    </div>
  );
};
