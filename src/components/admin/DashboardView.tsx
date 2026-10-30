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
  Trash2,
  RotateCcw,
  Search,
  Eye,
  Receipt,
  Archive,
} from 'lucide-react';
import { Order, UserProfile, PaymentRecord } from '../../types';
import { formatCurrency, formatDate, buildWhatsAppLink } from '../../utils/formatters';
import { getPublicAppUrl } from '../../config/appConfig';
import {
  recordLeftovers,
  resetAllHistoricalData,
  cleanAppKeepOnlyAdmin,
  clearClientHistory,
  DEFAULT_PRICES,
} from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { TrashModal } from './TrashModal';

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

  // Painel Detalhado Financeiro (Valor Final Realizado & Total Recebido)
  const [showFinancialDetailModal, setShowFinancialDetailModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [financialDetailTab, setFinancialDetailTab] = useState<'orders' | 'payments' | 'clients'>('orders');
  const [financialSearchTerm, setFinancialSearchTerm] = useState('');
  const [isClearingSingleClient, setIsClearingSingleClient] = useState(false);
  const [clientClearedSuccess, setClientClearedSuccess] = useState<string | null>(null);

  const handleOpenFinancialDetail = (tab: 'orders' | 'payments' | 'clients') => {
    setFinancialDetailTab(tab);
    setFinancialSearchTerm('');
    setClientClearedSuccess(null);
    setShowFinancialDetailModal(true);
  };

  const handleClearSingleClientHistory = async (clientId: string, clientName: string) => {
    const confirmed = window.confirm(
      `Deseja realmente apagar todo o histórico de pedidos e pagamentos de ${clientName}?\n\n• O saldo devedor deste cliente voltará para R$ 0,00.\n• O cadastro continuará ativo para fazer novos pedidos.`
    );
    if (!confirmed) return;

    setIsClearingSingleClient(true);
    try {
      const res = await clearClientHistory(clientId);
      setClientClearedSuccess(
        `Histórico de ${clientName} zerado com sucesso! ${res.deletedOrders} pedido(s) e ${res.deletedPayments} pagamento(s) foram apagados. O saldo agora é R$ 0,00.`
      );
      setTimeout(() => setClientClearedSuccess(null), 3500);
    } catch (err: any) {
      alert('Erro ao zerar histórico do cliente: ' + (err?.message || err));
    } finally {
      setIsClearingSingleClient(false);
    }
  };

  // Zerar Painel Geral State
  const [showResetDashboardModal, setShowResetDashboardModal] = useState(false);
  const [isResettingDashboard, setIsResettingDashboard] = useState(false);
  const [resetDashboardSuccess, setResetDashboardSuccess] = useState<string | null>(null);

  const handleResetDashboard = async (mode: 'orders_only' | 'keep_admin_only') => {
    setIsResettingDashboard(true);
    try {
      if (mode === 'keep_admin_only') {
        const res = await cleanAppKeepOnlyAdmin();
        setResetDashboardSuccess(
          `Painel geral e aplicativo zerados! Foram excluídos ${res.deletedUsers} revendedor(es), ${res.deletedOrders} pedido(s) e ${res.deletedPayments} pagamento(s). Apenas sua conta de Administrador foi mantida.`
        );
      } else {
        const res = await resetAllHistoricalData();
        setResetDashboardSuccess(
          `Painel geral zerado com sucesso! Foram excluídos ${res.deletedOrders} pedido(s) e ${res.deletedPayments} pagamento(s). Todas as métricas do painel estão em R$ 0,00 e os revendedores continuam cadastrados prontos para novas vendas.`
        );
      }
      setTimeout(() => {
        setShowResetDashboardModal(false);
        setResetDashboardSuccess(null);
      }, 3000);
    } catch (err: any) {
      alert('Erro ao zerar painel: ' + (err?.message || err));
    } finally {
      setIsResettingDashboard(false);
    }
  };

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

  // Filter payments according to period
  const filteredPayments = useMemo(() => {
    if (period === 'all') return payments;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return payments.filter((p) => {
      const pDate = p.paymentDate || p.createdAt?.slice(0, 10) || '';

      if (period === 'today') {
        return pDate === todayStr;
      }

      if (period === '7days') {
        const pTime = new Date(pDate).getTime();
        const diffDays = (now.getTime() - pTime) / (1000 * 3600 * 24);
        return diffDays >= -1 && diffDays <= 7;
      }

      if (period === 'month') {
        const pMonth = pDate.slice(0, 7);
        const currentMonth = todayStr.slice(0, 7);
        return pMonth === currentMonth;
      }

      return true;
    });
  }, [payments, period]);

  // Summary per client with balance and actions
  const clientsSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        uid: string;
        name: string;
        username?: string;
        phone?: string;
        active: boolean;
        totalOrders: number;
        finalTotal: number;
        totalPaid: number;
        pendingBalance: number;
        saltySold: number;
        sweetSold: number;
      }
    >();

    // Seed with all resellers
    clients
      .filter((c) => c.role === 'revendedor')
      .forEach((c) => {
        map.set(c.uid, {
          uid: c.uid,
          name: c.displayName,
          username: c.username,
          phone: c.phone,
          active: c.active,
          totalOrders: 0,
          finalTotal: 0,
          totalPaid: 0,
          pendingBalance: 0,
          saltySold: 0,
          sweetSold: 0,
        });
      });

    // Populate with filtered orders
    filteredOrders.forEach((o) => {
      let entry = map.get(o.resellerId);
      if (!entry) {
        entry = {
          uid: o.resellerId,
          name: o.resellerName || 'Varejo / Outro',
          username: undefined,
          phone: undefined,
          active: true,
          totalOrders: 0,
          finalTotal: 0,
          totalPaid: 0,
          pendingBalance: 0,
          saltySold: 0,
          sweetSold: 0,
        };
        map.set(o.resellerId, entry);
      }
      entry.totalOrders += 1;
      entry.finalTotal += o.finalTotal || 0;
      entry.totalPaid += o.amountPaid || 0;
      entry.pendingBalance += o.balanceDue || 0;
      entry.saltySold += o.qtySaltySold || 0;
      entry.sweetSold += o.qtySweetSold || 0;
    });

    return Array.from(map.values()).sort((a, b) => b.pendingBalance - a.pendingBalance);
  }, [clients, filteredOrders]);

  // Filtered lists for the Financial Detail Panel
  const displayedOrders = useMemo(() => {
    if (!financialSearchTerm.trim()) return filteredOrders;
    const term = financialSearchTerm.toLowerCase();
    return filteredOrders.filter(
      (o) =>
        o.resellerName.toLowerCase().includes(term) ||
        o.orderNumber.toLowerCase().includes(term) ||
        (o.deliveryDate && o.deliveryDate.includes(term)) ||
        (o.notes && o.notes.toLowerCase().includes(term))
    );
  }, [filteredOrders, financialSearchTerm]);

  const displayedPayments = useMemo(() => {
    if (!financialSearchTerm.trim()) return filteredPayments;
    const term = financialSearchTerm.toLowerCase();
    return filteredPayments.filter(
      (p) =>
        p.resellerName.toLowerCase().includes(term) ||
        p.paymentMethod.toLowerCase().includes(term) ||
        (p.notes && p.notes.toLowerCase().includes(term)) ||
        (p.paymentDate && p.paymentDate.includes(term))
    );
  }, [filteredPayments, financialSearchTerm]);

  const displayedClients = useMemo(() => {
    if (!financialSearchTerm.trim()) return clientsSummary;
    const term = financialSearchTerm.toLowerCase();
    return clientsSummary.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.username && c.username.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term))
    );
  }, [clientsSummary, financialSearchTerm]);

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

          <button
            onClick={() => {
              setResetDashboardSuccess(null);
              setShowResetDashboardModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black text-xs uppercase flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Zerar vendas, pedidos e saldo para deixar o painel geral limpo"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
            <span>Zerar Painel Geral</span>
          </button>

          <button
            onClick={() => setShowTrashModal(true)}
            className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-black text-xs uppercase flex items-center gap-1.5 shadow-sm transition cursor-pointer border border-stone-700"
            title="Visualizar lixeira e histórico de vendas apagadas"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span>Lixeira de Vendas</span>
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

      {/* Primary Financial Highlights (Yellow / Gold Focus) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valor Final Realizado (Clickable) */}
        <div
          onClick={() => handleOpenFinancialDetail('orders')}
          className="bg-amber-400/10 border-2 border-amber-400/50 hover:border-amber-500 rounded-3xl p-5 shadow-sm hover:shadow-md transition relative overflow-hidden bg-white cursor-pointer group select-none"
          title="Clique para abrir o painel detalhado de pedidos e vendas do período"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase text-amber-900 tracking-wider">
              Valor Final Realizado
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black group-hover:scale-110 transition shadow-2xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">
            {formatCurrency(metrics.finalTotal)}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-stone-500">
              Calculado com sobras deduzidas
            </p>
            <span className="text-[10px] font-black text-amber-900 bg-amber-100 group-hover:bg-amber-200 px-2 py-0.5 rounded-full transition flex items-center gap-0.5">
              <span>Ver Pedidos</span>
              <ArrowUpRight className="w-3 h-3 text-amber-900" />
            </span>
          </div>
        </div>

        {/* Total Recebido (Clickable) */}
        <div
          onClick={() => handleOpenFinancialDetail('payments')}
          className="bg-emerald-500/5 border border-emerald-500/30 hover:border-emerald-600 rounded-3xl p-5 shadow-sm hover:shadow-md transition bg-white cursor-pointer group select-none"
          title="Clique para abrir o painel detalhado de pagamentos recebidos"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">
              Total Recebido
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black group-hover:scale-110 transition shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">
            {formatCurrency(metrics.totalPaid)}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-stone-500">Pagamentos liquidados</p>
            <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 group-hover:bg-emerald-200 px-2 py-0.5 rounded-full transition flex items-center gap-0.5">
              <span>Ver Pagamentos</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-900" />
            </span>
          </div>
        </div>

        {/* Saldo Pendente (Clickable) */}
        <div
          onClick={() => handleOpenFinancialDetail('clients')}
          className="bg-rose-500/5 border border-rose-500/30 hover:border-rose-600 rounded-3xl p-5 shadow-sm hover:shadow-md transition bg-white cursor-pointer group select-none"
          title="Clique para ver saldos por cliente e zerar histórico cliente por cliente"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase text-rose-800 tracking-wider">
              Saldo Pendente
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-black group-hover:scale-110 transition shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-700">
            {formatCurrency(metrics.pendingBalance)}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-stone-500">A receber dos revendedores</p>
            <span className="text-[10px] font-black text-rose-900 bg-rose-100 group-hover:bg-rose-200 px-2 py-0.5 rounded-full transition flex items-center gap-0.5">
              <span>Por Cliente</span>
              <ArrowUpRight className="w-3 h-3 text-rose-900" />
            </span>
          </div>
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

      {/* MODAL: ZERAR PAINEL GERAL (VENDAS & PEDIDOS) */}
      {showResetDashboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center font-bold">
                  <RotateCcw className="w-5 h-5 text-red-800" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Zerar Painel Geral</h3>
                  <p className="text-xs text-stone-500">Limpar histórico de vendas e reiniciar métricas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetDashboardModal(false);
                  setResetDashboardSuccess(null);
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetDashboardSuccess && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{resetDashboardSuccess}</span>
              </div>
            )}

            <div className="mt-5 space-y-4 text-xs">
              <p className="text-stone-600">
                Selecione como deseja zerar as métricas do painel geral:
              </p>

              {/* Option 1: Reset Only Sales & Orders (Keep Clients) */}
              <div className="p-4 rounded-2xl border-2 border-red-500 bg-red-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-red-950 text-xs uppercase flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-red-700" />
                    <span>1. Zerar Vendas e Pedidos (Manter Clientes)</span>
                  </h4>
                  <span className="text-[10px] font-black text-white bg-red-800 px-2.5 py-0.5 rounded-full">
                    Mais Utilizado
                  </span>
                </div>
                <p className="text-stone-700 leading-relaxed text-[11px]">
                  Apaga todos os pedidos e pagamentos. Todas as métricas do painel (Total de Pedidos, Salgados Vendidos, Doces Vendidos, Faturamento e Saldo Pendente) voltam imediatamente para <strong>R$ 0,00</strong>. Os clientes continuam cadastrados para fazer novos pedidos.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isResettingDashboard}
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja zerar todos os pedidos e pagamentos? O painel voltará a R$ 0,00 e os revendedores continuarão cadastrados.')) {
                        handleResetDashboard('orders_only');
                      }
                    }}
                    className="w-full py-2.5 bg-red-800 hover:bg-red-900 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isResettingDashboard ? 'Zerando painel...' : 'Zerar Painel Geral (Manter Clientes)'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Full Wipe - Keep ONLY Admin */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-stone-900 text-xs uppercase flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-stone-600" />
                    <span>2. Apagar Todos os Usuários e Deixar Só Admin</span>
                  </h4>
                  <span className="text-[10px] font-bold text-stone-700 bg-stone-200 px-2 py-0.5 rounded-full">
                    Começo do Zero
                  </span>
                </div>
                <p className="text-stone-600 leading-relaxed text-[11px]">
                  Apaga todos os revendedores cadastrados e todo o histórico de testes. Mantém apenas a sua conta de Administrador (dyko) e a tabela de preços para você começar do zero.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isResettingDashboard}
                    onClick={() => {
                      if (window.confirm('ATENÇÃO: Deseja apagar todos os revendedores e histórico, mantendo APENAS a conta do Administrador?')) {
                        handleResetDashboard('keep_admin_only');
                      }
                    }}
                    className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-white font-black text-xs uppercase rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isResettingDashboard ? 'Apagando tudo...' : 'Apagar Todos os Revendedores e Zerar Tudo'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetDashboardModal(false);
                    setResetDashboardSuccess(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAINEL DETALHADO FINANCEIRO (VALOR FINAL REALIZADO, TOTAL RECEBIDO & ZERAR POR CLIENTE) */}
      {showFinancialDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-stone-200 my-4 sm:my-8 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                    Painel Financeiro Detalhado
                  </h3>
                  <p className="text-xs text-stone-500">
                    Filtro atual: <strong className="text-red-900 font-bold uppercase">{period === 'today' ? 'Hoje' : period === '7days' ? 'Últimos 7 dias' : period === 'month' ? 'Este Mês' : 'Todo o Histórico'}</strong> • Clique nas abas para detalhar ou zerar cliente por cliente
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFinancialDetailModal(false);
                    setShowTrashModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Abrir lixeira de vendas e históricos apagados"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Lixeira de Vendas</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFinancialDetailModal(false);
                    setClientClearedSuccess(null);
                  }}
                  className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards inside Modal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-4 shrink-0">
              <div
                onClick={() => setFinancialDetailTab('orders')}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  financialDetailTab === 'orders'
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span className="text-[10px] font-black uppercase text-amber-900 block">
                  Valor Final Realizado
                </span>
                <p className="text-lg font-black text-stone-900 mt-0.5">
                  {formatCurrency(metrics.finalTotal)}
                </p>
                <span className="text-[10px] font-bold text-amber-800">
                  {filteredOrders.length} pedido(s)
                </span>
              </div>

              <div
                onClick={() => setFinancialDetailTab('payments')}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  financialDetailTab === 'payments'
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span className="text-[10px] font-black uppercase text-emerald-900 block">
                  Total Recebido
                </span>
                <p className="text-lg font-black text-emerald-700 mt-0.5">
                  {formatCurrency(metrics.totalPaid)}
                </p>
                <span className="text-[10px] font-bold text-emerald-800">
                  {filteredPayments.length} pagamento(s)
                </span>
              </div>

              <div
                onClick={() => setFinancialDetailTab('clients')}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  financialDetailTab === 'clients'
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span className="text-[10px] font-black uppercase text-rose-900 block">
                  Saldo Pendente
                </span>
                <p className="text-lg font-black text-rose-700 mt-0.5">
                  {formatCurrency(metrics.pendingBalance)}
                </p>
                <span className="text-[10px] font-bold text-rose-800">
                  {clientsSummary.filter((c) => c.pendingBalance > 0).length} revendedor(es) c/ débito
                </span>
              </div>
            </div>

            {/* Success message banner */}
            {clientClearedSuccess && (
              <div className="mb-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-bold flex items-center gap-2 shrink-0 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{clientClearedSuccess}</span>
              </div>
            )}

            {/* Tabs and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 shrink-0">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setFinancialDetailTab('orders')}
                  className={`py-2 px-2.5 rounded-xl transition text-center truncate ${
                    financialDetailTab === 'orders'
                      ? 'bg-red-800 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  🥖 Vendas ({displayedOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialDetailTab('payments')}
                  className={`py-2 px-2.5 rounded-xl transition text-center truncate ${
                    financialDetailTab === 'payments'
                      ? 'bg-red-800 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  💰 Pagamentos ({displayedPayments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialDetailTab('clients')}
                  className={`py-2 px-2.5 rounded-xl transition text-center truncate ${
                    financialDetailTab === 'clients'
                      ? 'bg-red-800 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  👥 Por Cliente ({displayedClients.length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filtrar por revendedor..."
                  value={financialSearchTerm}
                  onChange={(e) => setFinancialSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                />
              </div>
            </div>

            {/* Tab Contents: Scrollable list */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {/* TAB 1: ORDERS (VALOR FINAL REALIZADO) */}
              {financialDetailTab === 'orders' && (
                <>
                  {displayedOrders.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 text-xs italic">
                      Nenhum pedido encontrado no período selecionado.
                    </div>
                  ) : (
                    displayedOrders.map((order) => {
                      const isPaid = order.paymentStatus === 'pago';
                      const isPartial = order.paymentStatus === 'parcial';

                      return (
                        <div
                          key={order.id}
                          className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-red-950 bg-red-100 px-2 py-0.5 rounded-lg">
                                {order.orderNumber}
                              </span>
                              <span className="font-black text-xs text-stone-900">
                                {order.resellerName}
                              </span>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isPartial
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isPaid ? 'Pago' : isPartial ? 'Parcial' : 'Pendente'}
                              </span>
                            </div>

                            <p className="text-[11px] text-stone-600">
                              Entrega: <strong>{formatDate(order.deliveryDate || order.orderDate)}</strong> •{' '}
                              Vendido: <strong className="text-stone-900">{order.qtySaltySold} salgados</strong> e{' '}
                              <strong className="text-stone-900">{order.qtySweetSold} doces</strong>
                              {order.leftoversRecorded && (
                                <span className="text-amber-800 font-bold ml-1">
                                  (Sobras: {order.qtySaltyLeftover} salg, {order.qtySweetLeftover} doce)
                                </span>
                              )}
                            </p>

                            <p className="text-[10px] text-stone-500">
                              Preço un: Salgado {formatCurrency(order.unitPriceSalty)} | Doce {formatCurrency(order.unitPriceSweet)}
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-stone-200">
                            <div className="text-right">
                              <span className="text-[10px] font-bold uppercase text-stone-500 block">
                                Valor Final Realizado
                              </span>
                              <span className="text-sm font-black text-stone-900">
                                {formatCurrency(order.finalTotal)}
                              </span>
                              {order.balanceDue > 0 && (
                                <p className="text-[10px] font-black text-rose-700">
                                  A Pagar: {formatCurrency(order.balanceDue)}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={isClearingSingleClient}
                              onClick={() => handleClearSingleClientHistory(order.resellerId, order.resellerName)}
                              className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-[10px] uppercase flex items-center gap-1 transition shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                              title="Zerar todo o histórico de pedidos e pagamentos deste cliente específico"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-700" />
                              <span className="hidden xs:inline">Zerar Cliente</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* TAB 2: PAYMENTS (TOTAL RECEBIDO) */}
              {financialDetailTab === 'payments' && (
                <>
                  {displayedPayments.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 text-xs italic">
                      Nenhum pagamento registrado no período selecionado.
                    </div>
                  ) : (
                    displayedPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-stone-900">
                              {payment.resellerName}
                            </span>
                            <span className="font-black text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {payment.paymentMethod?.toUpperCase() || 'PAGAMENTO'}
                            </span>
                          </div>

                          <p className="text-[11px] text-stone-600">
                            Data do pagamento: <strong>{formatDate(payment.paymentDate || payment.createdAt)}</strong>
                            {payment.registeredByName && (
                              <span className="text-stone-500 ml-1.5">• Recebido por: {payment.registeredByName}</span>
                            )}
                          </p>

                          {payment.notes && (
                            <p className="text-[11px] text-stone-500 italic bg-white p-1.5 rounded-lg border border-stone-200/60 inline-block">
                              &quot;{payment.notes}&quot;
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-stone-200">
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-stone-500 block">
                              Valor Recebido
                            </span>
                            <span className="text-base font-black text-emerald-700">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isClearingSingleClient}
                            onClick={() => handleClearSingleClientHistory(payment.resellerId, payment.resellerName)}
                            className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-[10px] uppercase flex items-center gap-1 transition shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                            title="Zerar todo o histórico de pedidos e pagamentos deste cliente específico"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-700" />
                            <span className="hidden xs:inline">Zerar Cliente</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* TAB 3: CLIENT SUMMARY & ZERAR CLIENTE POR CLIENTE */}
              {financialDetailTab === 'clients' && (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 mb-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                      <span>Opção de Zerar Cliente por Cliente:</span>
                    </p>
                    <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                      Clique no botão <strong>&quot;Zerar Histórico deste Cliente&quot;</strong> ao lado de qualquer revendedor para limpar todos os pedidos e pagamentos dele, deixando o saldo dele em <strong>R$ 0,00</strong> sem precisar excluir o cadastro dele.
                    </p>
                  </div>

                  {displayedClients.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 text-xs italic">
                      Nenhum revendedor localizado.
                    </div>
                  ) : (
                    displayedClients.map((client) => (
                      <div
                        key={client.uid}
                        className="p-3.5 rounded-2xl border border-stone-200 bg-white hover:border-amber-400 transition shadow-2xs space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-stone-900">
                                {client.name}
                              </span>
                              {client.username && (
                                <span className="font-mono text-[10px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md font-bold">
                                  Login: {client.username}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  client.active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-stone-200 text-stone-600'
                                }`}
                              >
                                {client.active ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              {client.totalOrders} pedidos no período • Vendido: {client.saltySold} salgados, {client.sweetSold} doces
                            </p>
                          </div>

                          {/* Financial values badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200 text-right">
                              <span className="text-[9px] uppercase font-bold text-stone-500 block">
                                Realizado
                              </span>
                              <span className="text-xs font-black text-stone-900">
                                {formatCurrency(client.finalTotal)}
                              </span>
                            </div>

                            <div className="bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 text-right">
                              <span className="text-[9px] uppercase font-bold text-emerald-800 block">
                                Já Pago
                              </span>
                              <span className="text-xs font-black text-emerald-700">
                                {formatCurrency(client.totalPaid)}
                              </span>
                            </div>

                            <div className="bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 text-right">
                              <span className="text-[9px] uppercase font-bold text-rose-800 block">
                                Saldo Pendente
                              </span>
                              <span className="text-xs font-black text-rose-700">
                                {formatCurrency(client.pendingBalance)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons for this single client */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() => {
                              setShowFinancialDetailModal(false);
                              onNavigate('clients', client.uid);
                            }}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs transition flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-stone-600" />
                            <span>Ver Cadastro</span>
                          </button>

                          <button
                            type="button"
                            disabled={isClearingSingleClient}
                            onClick={() => handleClearSingleClientHistory(client.uid, client.name)}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Apagar histórico e zerar saldo deste cliente para R$ 0,00"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-stone-950" />
                            <span>Zerar Histórico deste Cliente</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-stone-500 font-medium">
                💡 Dica: O valor final realizado já calcula o desconto automático das sobras devolvidas.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowFinancialDetailModal(false);
                  setClientClearedSuccess(null);
                }}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lixeira de Vendas Modal */}
      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
      />
    </div>
  );
};
