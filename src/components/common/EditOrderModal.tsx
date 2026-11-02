import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Croissant,
  Save,
  Edit3,
} from 'lucide-react';
import { Order, ProductPrices } from '../../types';
import { formatCurrency, formatDate, calculateOrderMetrics } from '../../utils/formatters';
import { updateOrderDetails, DEFAULT_PRICES } from '../../services/dataService';

interface EditOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  prices?: ProductPrices;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  prices = DEFAULT_PRICES,
  onOrderUpdated,
}) => {
  if (!isOpen || !order) return null;

  // Form states initialized with current order data
  const [deliveryDate, setDeliveryDate] = useState<string>(
    order.deliveryDate || order.orderDate || new Date().toISOString().slice(0, 10)
  );
  const [orderDate, setOrderDate] = useState<string>(
    order.orderDate || order.deliveryDate || new Date().toISOString().slice(0, 10)
  );
  const [qtySaltyPickup, setQtySaltyPickup] = useState<number | string>(order.qtySaltyPickup);
  const [qtySweetPickup, setQtySweetPickup] = useState<number | string>(order.qtySweetPickup);
  const [unitPriceSalty, setUnitPriceSalty] = useState<number | string>(order.unitPriceSalty);
  const [unitPriceSweet, setUnitPriceSweet] = useState<number | string>(order.unitPriceSweet);
  const [qtySaltyLeftover, setQtySaltyLeftover] = useState<number | string>(
    order.leftoversRecorded ? order.qtySaltyLeftover : 0
  );
  const [qtySweetLeftover, setQtySweetLeftover] = useState<number | string>(
    order.leftoversRecorded ? order.qtySweetLeftover : 0
  );
  const [notes, setNotes] = useState<string>(order.notes || '');
  const [changeReason, setChangeReason] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick Date Helpers
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const inTwoDaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }, []);

  // Real-time calculated preview
  const previewMetrics = useMemo(() => {
    const saltyPick = Math.max(0, Number(qtySaltyPickup) || 0);
    const sweetPick = Math.max(0, Number(qtySweetPickup) || 0);
    const saltyPrice = Number(unitPriceSalty) > 0 ? Number(unitPriceSalty) : order.unitPriceSalty;
    const sweetPrice = Number(unitPriceSweet) > 0 ? Number(unitPriceSweet) : order.unitPriceSweet;

    const sLeft = Math.max(0, Number(qtySaltyLeftover) || 0);
    const wLeft = Math.max(0, Number(qtySweetLeftover) || 0);
    const hasLeftovers = order.leftoversRecorded || sLeft > 0 || wLeft > 0;

    return calculateOrderMetrics({
      qtySaltyPickup: saltyPick,
      qtySweetPickup: sweetPick,
      qtySaltyLeftover: sLeft,
      qtySweetLeftover: wLeft,
      leftoversRecorded: hasLeftovers,
      unitPriceSalty: saltyPrice,
      unitPriceSweet: sweetPrice,
      amountPaid: order.amountPaid || 0,
    });
  }, [
    order,
    qtySaltyPickup,
    qtySweetPickup,
    unitPriceSalty,
    unitPriceSweet,
    qtySaltyLeftover,
    qtySweetLeftover,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!deliveryDate.trim()) {
      setErrorMsg('Por favor, informe a data de entrega.');
      return;
    }

    const saltyNum = Math.max(0, Number(qtySaltyPickup) || 0);
    const sweetNum = Math.max(0, Number(qtySweetPickup) || 0);

    if (saltyNum === 0 && sweetNum === 0) {
      setErrorMsg('O pedido deve conter pelo menos 1 pão (salgado ou doce).');
      return;
    }

    if (order.leftoversRecorded) {
      const sLeft = Number(qtySaltyLeftover) || 0;
      const wLeft = Number(qtySweetLeftover) || 0;
      if (sLeft > saltyNum) {
        setErrorMsg(`A sobra de pão salgado (${sLeft}) não pode ser maior que a retirada (${saltyNum}).`);
        return;
      }
      if (wLeft > sweetNum) {
        setErrorMsg(`A sobra de pão doce (${wLeft}) não pode ser maior que a retirada (${sweetNum}).`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateOrderDetails({
        order,
        deliveryDate: deliveryDate.trim(),
        orderDate: orderDate.trim(),
        qtySaltyPickup: saltyNum,
        qtySweetPickup: sweetNum,
        qtySaltyLeftover: Number(qtySaltyLeftover) || 0,
        qtySweetLeftover: Number(qtySweetLeftover) || 0,
        unitPriceSalty: Number(unitPriceSalty) || order.unitPriceSalty,
        unitPriceSweet: Number(unitPriceSweet) || order.unitPriceSweet,
        notes: notes.trim(),
        changeReason: changeReason.trim() || 'Alteração de dados/data pelo administrador',
      });

      setSuccessMsg('Pedido atualizado com sucesso! As datas e valores foram recalculados.');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1400);
    } catch (err: any) {
      console.error('Erro ao atualizar pedido:', err);
      setErrorMsg('Erro ao salvar alterações: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full my-6 shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950 via-stone-900 to-red-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-inner">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Editar Pedido {order.orderNumber}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                  {order.resellerName}
                </span>
              </div>
              <p className="text-xs text-amber-200">
                Altere a data de entrega, quantidades, preços unitários e observações
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* DATES SECTION: Solução direta para "escolhi a data errada, quero poder mudar também" */}
          <div className="p-4 bg-amber-50/70 border-2 border-amber-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>Datas do Pedido (Corrigir Data)</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                Entrega / Retirada
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Delivery Date */}
              <div>
                <label className="block text-[11px] font-bold text-stone-800 uppercase mb-1">
                  Data de Entrega / Retirada *
                </label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
                <div className="flex items-center gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryDate(todayStr)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                      deliveryDate === todayStr
                        ? 'bg-red-800 text-white border-red-800'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryDate(tomorrowStr)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                      deliveryDate === tomorrowStr
                        ? 'bg-red-800 text-white border-red-800'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryDate(inTwoDaysStr)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                      deliveryDate === inTwoDaysStr
                        ? 'bg-red-800 text-white border-red-800'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    +2 Dias
                  </button>
                </div>
              </div>

              {/* Order Creation Date */}
              <div>
                <label className="block text-[11px] font-bold text-stone-800 uppercase mb-1">
                  Data da Realização do Pedido
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
                <span className="text-[10px] text-stone-500 block mt-1">
                  Data em que a encomenda foi solicitada.
                </span>
              </div>
            </div>
          </div>

          {/* QUANTITIES & UNIT PRICES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Salty Bread */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                  <Croissant className="w-4 h-4 text-amber-700" />
                  <span>Pão Salgado (Francês)</span>
                </span>
                <span className="text-[10px] font-black text-amber-900">
                  {formatCurrency(Number(unitPriceSalty) || order.unitPriceSalty)}/un
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                  Quantidade Retirada
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={qtySaltyPickup}
                  onChange={(e) => setQtySaltyPickup(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1">
                {[10, 20, 50].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setQtySaltyPickup((prev) => (Number(prev) || 0) + delta)}
                    className="flex-1 py-1 text-[10px] font-bold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700"
                  >
                    +{delta}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                  Preço Unitário Cobrado (R$/un)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={unitPriceSalty}
                  onChange={(e) => setUnitPriceSalty(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="pt-2 border-t border-stone-200">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[10px] font-bold text-amber-900 uppercase">
                    Sobras Devolvidas (Salgado)
                  </label>
                  <span className="text-[9px] text-stone-500 font-medium">0 = vendeu tudo</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={qtySaltyLeftover}
                  onChange={(e) => setQtySaltyLeftover(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-black text-amber-950 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Sweet Bread */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                  <Croissant className="w-4 h-4 text-amber-600" />
                  <span>Pão Doce</span>
                </span>
                <span className="text-[10px] font-black text-amber-900">
                  {formatCurrency(Number(unitPriceSweet) || order.unitPriceSweet)}/un
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                  Quantidade Retirada
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={qtySweetPickup}
                  onChange={(e) => setQtySweetPickup(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1">
                {[10, 20, 50].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setQtySweetPickup((prev) => (Number(prev) || 0) + delta)}
                    className="flex-1 py-1 text-[10px] font-bold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700"
                  >
                    +{delta}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                  Preço Unitário Cobrado (R$/un)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={unitPriceSweet}
                  onChange={(e) => setUnitPriceSweet(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="pt-2 border-t border-stone-200">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[10px] font-bold text-amber-900 uppercase">
                    Sobras Devolvidas (Doce)
                  </label>
                  <span className="text-[9px] text-stone-500 font-medium">0 = vendeu tudo</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={qtySweetLeftover}
                  onChange={(e) => setQtySweetLeftover(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-black text-amber-950 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Notes and Reason */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Observações do Pedido
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: entregar de manhã, embalar em 2 pacotes..."
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:ring-2 focus:ring-amber-500 resize-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Motivo da Alteração (Opcional)
              </label>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Ex: Data de entrega alterada a pedido do cliente"
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Real-time Calculation Summary Box */}
          <div className="p-4 bg-stone-900 text-white rounded-2xl space-y-2 shadow-inner">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
              Valores Atualizados deste Pedido:
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-[10px] text-stone-300 block">Total de Pães</span>
                <span className="text-sm font-black text-white">
                  {(Number(qtySaltyPickup) || 0) + (Number(qtySweetPickup) || 0)} un
                </span>
              </div>
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-[10px] text-stone-300 block">Valor Final</span>
                <span className="text-sm font-black text-amber-400">
                  {formatCurrency(previewMetrics.finalTotal)}
                </span>
              </div>
              <div className="bg-white/10 p-2 rounded-xl">
                <span className="text-[10px] text-stone-300 block">Saldo a Pagar</span>
                <span className="text-sm font-black text-emerald-400">
                  {formatCurrency(previewMetrics.balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-100">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-red-800 hover:bg-red-900 text-white font-black text-xs uppercase rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações do Pedido'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
