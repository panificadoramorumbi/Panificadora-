import React, { useState, useMemo, useEffect } from 'react';
import {
  Trash2,
  RotateCcw,
  X,
  Search,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Receipt,
  Archive,
  Sparkles,
  Filter,
} from 'lucide-react';
import { TrashItem, Order, PaymentRecord } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  subscribeTrash,
  restoreTrashItem,
  permanentlyDeleteTrashItem,
  emptyTrash,
} from '../../services/dataService';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'historico_cliente' | 'zeramento_geral'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Action status states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Real-time subscription to trash collection
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubscribe = subscribeTrash((items) => {
      setTrashItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Toggle item expansion
  const toggleExpand = (id: string) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  // Restore item action
  const handleRestore = async (item: TrashItem) => {
    const confirmRestore = window.confirm(
      `Deseja restaurar as vendas de "${item.title}"?\n\n• ${item.ordersCount} pedido(s) e ${item.paymentsCount} pagamento(s) voltarão ao painel geral e ao saldo do cliente.\n• O item sairá da lixeira.`
    );
    if (!confirmRestore) return;

    setActionLoadingId(item.id);
    setActionError(null);
    try {
      await restoreTrashItem(item);
      setActionSuccess(`As vendas de "${item.clientName}" foram restauradas com sucesso para o painel!`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError('Erro ao restaurar vendas: ' + (err?.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Permanently delete single item action
  const handlePermanentDelete = async (item: TrashItem) => {
    const confirmDelete = window.confirm(
      `ATENÇÃO: Deseja apagar definitivamente "${item.title}" da lixeira?\n\nEsta ação é irreversível e os dados não poderão mais ser recuperados.`
    );
    if (!confirmDelete) return;

    setActionLoadingId(item.id);
    setActionError(null);
    try {
      await permanentlyDeleteTrashItem(item.id);
      setActionSuccess('Item excluído definitivamente da lixeira.');
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err: any) {
      setActionError('Erro ao excluir item: ' + (err?.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Empty entire trash action
  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) return;
    const confirmEmpty = window.confirm(
      `ATENÇÃO: Deseja realmente esvaziar toda a lixeira?\n\nTodos os ${trashItems.length} registros de vendas apagadas serão destruídos permanentemente e não poderão ser recuperados.`
    );
    if (!confirmEmpty) return;

    setIsEmptyingTrash(true);
    setActionError(null);
    try {
      const count = await emptyTrash();
      setActionSuccess(`Lixeira esvaziada! ${count} registros foram excluídos permanentemente.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError('Erro ao esvaziar lixeira: ' + (err?.message || err));
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  // Computed summary metrics of trash
  const metrics = useMemo(() => {
    let totalValue = 0;
    let totalOrders = 0;
    let totalPayments = 0;

    trashItems.forEach((item) => {
      totalValue += item.totalValue || 0;
      totalOrders += item.ordersCount || (item.orders ? item.orders.length : 0);
      totalPayments += item.paymentsCount || (item.payments ? item.payments.length : 0);
    });

    return {
      totalBatches: trashItems.length,
      totalValue,
      totalOrders,
      totalPayments,
    };
  }, [trashItems]);

  // Filtered trash items
  const filteredItems = useMemo(() => {
    return trashItems.filter((item) => {
      // Type filter
      if (filterType !== 'all' && item.itemType !== filterType) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesClient = (item.clientName || '').toLowerCase().includes(term);
        const matchesTitle = (item.title || '').toLowerCase().includes(term);
        const matchesNotes = (item.notes || '').toLowerCase().includes(term);
        const matchesOrder = item.orders?.some(
          (o) =>
            o.orderNumber?.toLowerCase().includes(term) ||
            o.resellerName?.toLowerCase().includes(term)
        );
        return matchesClient || matchesTitle || matchesNotes || matchesOrder;
      }

      return true;
    });
  }, [trashItems, filterType, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950 via-red-900 to-stone-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-inner">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Lixeira de Vendas & Histórico Apagado
                </h3>
                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 shadow-xs">
                  {trashItems.length} {trashItems.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <p className="text-xs text-amber-200">
                Consulte vendas zeradas, veja detalhes dos pedidos ou restaure-os de volta ao painel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trashItems.length > 0 && (
              <button
                type="button"
                disabled={isEmptyingTrash}
                onClick={handleEmptyTrash}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-800/80 hover:bg-red-800 border border-red-700 text-rose-200 hover:text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                title="Apagar todos os itens da lixeira permanentemente"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isEmptyingTrash ? 'Esvaziando...' : 'Esvaziar Lixeira'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Summary Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-stone-50 border-b border-stone-200 shrink-0 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-stone-500 block">Total em Vendas</span>
            <span className="text-sm sm:text-base font-black text-amber-900">
              {formatCurrency(metrics.totalValue)}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-stone-500 block">Pedidos Arquivados</span>
            <span className="text-sm sm:text-base font-black text-stone-900">
              {metrics.totalOrders} {metrics.totalOrders === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-stone-500 block">Pagamentos Arquivados</span>
            <span className="text-sm sm:text-base font-black text-emerald-800">
              {metrics.totalPayments} {metrics.totalPayments === 1 ? 'pagamento' : 'pagamentos'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-stone-500 block">Lotes Zerados</span>
            <span className="text-sm sm:text-base font-black text-stone-800">
              {metrics.totalBatches} {metrics.totalBatches === 1 ? 'lote' : 'lotes'}
            </span>
          </div>
        </div>

        {/* Action feedback banners */}
        {actionSuccess && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="p-3 sm:p-4 border-b border-stone-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterType === 'all'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              Todos ({trashItems.length})
            </button>
            <button
              onClick={() => setFilterType('historico_cliente')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterType === 'historico_cliente'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              Por Cliente ({trashItems.filter((i) => i.itemType === 'historico_cliente').length})
            </button>
            <button
              onClick={() => setFilterType('zeramento_geral')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterType === 'zeramento_geral'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              Zeramento Geral ({trashItems.filter((i) => i.itemType === 'zeramento_geral').length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por cliente ou pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
            />
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-stone-500 text-xs">
              <Archive className="w-8 h-8 mx-auto text-amber-500 animate-pulse mb-2" />
              <p>Carregando vendas da lixeira...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-stone-200 bg-stone-50/50">
              <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Trash2 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-black text-stone-800">
                {trashItems.length === 0
                  ? 'A lixeira está vazia!'
                  : 'Nenhum registro encontrado com este filtro.'}
              </h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 leading-relaxed">
                {trashItems.length === 0
                  ? 'Sempre que você zerar o painel geral ou limpar o histórico de um revendedor, as vendas serão guardadas aqui automaticamente para sua total segurança e consulta.'
                  : 'Tente alterar os termos da busca ou mudar os filtros de exibição acima.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const isItemLoading = actionLoadingId === item.id;
              const isGeneralReset = item.itemType === 'zeramento_geral';

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition shadow-xs overflow-hidden ${
                    isExpanded
                      ? 'border-amber-400 bg-amber-50/30'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isGeneralReset
                              ? 'bg-red-800 text-white'
                              : 'bg-amber-400 text-stone-950 font-black'
                          }`}
                        >
                          {isGeneralReset ? 'Zeramento Geral' : 'Histórico de Cliente'}
                        </span>

                        <h4 className="text-sm font-black text-stone-900">
                          {item.clientName}
                        </h4>

                        <span className="text-[11px] text-stone-500 font-mono">
                          • Apagado em {formatDateTime(item.deletedAt)}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-stone-600 italic">
                          &quot;{item.notes}&quot;
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                        <span className="px-2 py-0.5 bg-stone-100 rounded-lg text-stone-700 font-bold text-[11px]">
                          📦 {item.ordersCount} {item.ordersCount === 1 ? 'pedido' : 'pedidos'}
                        </span>
                        {item.paymentsCount > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[11px]">
                            💰 {item.paymentsCount} {item.paymentsCount === 1 ? 'pagamento' : 'pagamentos'}
                          </span>
                        )}
                        {item.deletedBy && (
                          <span className="text-[11px] text-stone-500">
                            Por: <strong>{item.deletedBy}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side: Total Value and Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-0 border-stone-100">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-stone-500 block">
                          Valor das Vendas
                        </span>
                        <span className="text-base font-black text-amber-900">
                          {formatCurrency(item.totalValue)}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                          title="Ver detalhes dos pedidos apagados"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-stone-600" />
                          <span className="hidden sm:inline">
                            {isExpanded ? 'Ocultar' : 'Ver Pedidos'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isItemLoading}
                          onClick={() => handleRestore(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase flex items-center gap-1 transition shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Restaurar estas vendas de volta ao painel geral"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isItemLoading ? '...' : 'Restaurar'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isItemLoading}
                          onClick={() => handlePermanentDelete(item)}
                          className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Excluir este item da lixeira permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Accordion: Details of each order and payment */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-4 bg-stone-50/80 border-t border-amber-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black uppercase text-stone-800 tracking-wider flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                          <span>Pedidos Arquivados neste Lote ({item.orders?.length || 0})</span>
                        </h5>
                        <span className="text-[11px] text-stone-500 font-medium">
                          Ao clicar em Restaurar, todos estes pedidos voltam para o sistema ativo
                        </span>
                      </div>

                      {/* Orders Cards List */}
                      {(!item.orders || item.orders.length === 0) ? (
                        <p className="text-xs text-stone-500 italic py-2">
                          Nenhum pedido individual detalhado neste lote.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {item.orders.map((order, oIdx) => (
                            <div
                              key={order.id || oIdx}
                              className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-red-950 bg-red-100 px-2 py-0.5 rounded-md text-[11px]">
                                    {order.orderNumber}
                                  </span>
                                  <span className="font-bold text-stone-900">
                                    {order.resellerName}
                                  </span>
                                  <span className="text-[10px] text-stone-500">
                                    • {formatDate(order.deliveryDate || order.orderDate)}
                                  </span>
                                </div>

                                <p className="text-[11px] text-stone-600">
                                  Retirada: <strong>{order.qtySaltyPickup} salg</strong>,{' '}
                                  <strong>{order.qtySweetPickup} doces</strong> • Sobras:{' '}
                                  <strong className="text-amber-800">
                                    {order.qtySaltyLeftover || 0} salg, {order.qtySweetLeftover || 0} doce
                                  </strong>
                                </p>
                                <p className="text-[10px] text-stone-500">
                                  Vendido: <strong>{order.qtySaltySold} salgados</strong> e{' '}
                                  <strong>{order.qtySweetSold} doces</strong> (Preços un: R${' '}
                                  {order.unitPriceSalty.toFixed(2)} / R$ {order.unitPriceSweet.toFixed(2)})
                                </p>
                              </div>

                              <div className="text-right sm:shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-stone-100">
                                <span className="text-[10px] uppercase font-bold text-stone-500 block">
                                  Total Realizado
                                </span>
                                <span className="text-xs font-black text-stone-900">
                                  {formatCurrency(order.finalTotal)}
                                </span>
                                {order.amountPaid > 0 && (
                                  <p className="text-[10px] text-emerald-700 font-bold">
                                    Pago: {formatCurrency(order.amountPaid)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Payments Cards List */}
                      {item.payments && item.payments.length > 0 && (
                        <div className="pt-2 border-t border-stone-200 space-y-2">
                          <h5 className="text-xs font-black uppercase text-stone-800 tracking-wider flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Pagamentos Arquivados ({item.payments.length})</span>
                          </h5>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {item.payments.map((p, pIdx) => (
                              <div
                                key={p.id || pIdx}
                                className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold text-stone-900">{p.resellerName}</span>
                                  <span className="text-stone-500 text-[11px] ml-2">
                                    • {formatDate(p.paymentDate || p.createdAt)} ({p.paymentMethod?.toUpperCase()})
                                  </span>
                                  {p.notes && (
                                    <p className="text-[10px] text-stone-500 italic">&quot;{p.notes}&quot;</p>
                                  )}
                                </div>
                                <span className="font-black text-emerald-800 text-xs">
                                  {formatCurrency(p.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-stone-100 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Restaurar um lote coloca todos os pedidos de volta no painel e recalcula o saldo do revendedor.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {trashItems.length > 0 && (
              <button
                type="button"
                disabled={isEmptyingTrash}
                onClick={handleEmptyTrash}
                className="sm:hidden px-3 py-2 rounded-xl bg-red-100 text-red-900 font-bold text-xs"
              >
                Esvaziar
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition cursor-pointer"
            >
              Fechar Lixeira
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
