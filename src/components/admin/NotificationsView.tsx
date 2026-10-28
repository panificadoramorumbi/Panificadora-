import React, { useState } from 'react';
import {
  Bell,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Send,
  Sliders,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { InAppNotification, UserProfile, NotificationPreference, Order } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../services/dataService';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showSystemNotification,
  playNotificationTone,
} from '../../services/notificationService';
import { NotificationDetailModal } from '../common/NotificationDetailModal';

interface NotificationsViewProps {
  notifications: InAppNotification[];
  clients: UserProfile[];
  orders?: Order[];
  onNavigateToSituation?: (type: string, order?: Order, orderId?: string, resellerId?: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  clients,
  orders = [],
  onNavigateToSituation,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [selectedNotif, setSelectedNotif] = useState<InAppNotification | null>(null);
  const [pref, setPref] = useState<NotificationPreference>(
    userProfile?.notificationPreference || 'both'
  );
  const [savingPref, setSavingPref] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  // Native notification bar permission state
  const [systemPerm, setSystemPerm] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission()
  );
  const [testSuccess, setTestSuccess] = useState(false);

  // Manual WhatsApp helper test
  const [selectedClientPhone, setSelectedClientPhone] = useState('');
  const [customMsg, setCustomMsg] = useState(
    'Olá, informamos que o seu pedido da Panificadora Morumbi já está pronto para retirada.'
  );

  const handleSavePref = async (newPref: NotificationPreference) => {
    setPref(newPref);
    if (!currentUser) return;
    setSavingPref(true);
    try {
      await updateUserProfile(currentUser.uid, {
        notificationPreference: newPref,
      });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPref(false);
    }
  };

  const handleRequestNativePermission = async () => {
    const res = await requestNotificationPermission();
    setSystemPerm(res);
  };

  const handleTestSystemNotification = async () => {
    playNotificationTone();
    const sent = await showSystemNotification('Panificadora Morumbi 🥖', {
      body: '🔔 Teste de Notificação: Alerta exibido com sucesso na barra de notificações do seu aparelho!',
      tag: 'morumbi-test',
    });
    if (sent) {
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 3000);
    } else {
      alert('Não foi possível exibir notificação nativa. Verifique se a permissão foi concedida no navegador.');
    }
  };

  const handleOpenDirectWhatsApp = () => {
    if (!selectedClientPhone) {
      alert('Selecione um revendedor com telefone cadastrado.');
      return;
    }
    const digits = selectedClientPhone.replace(/\D/g, '');
    const intl = digits.startsWith('55') ? digits : `55${digits}`;
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(customMsg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-red-800" />
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            6. Central de Notificações & WhatsApp
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Acompanhe alertas em tempo real no app e configure as preferências de notificação.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Notification Feed */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-800" />
                <span>Notificações no Aplicativo ({notifications.length})</span>
              </h3>
              <span className="text-[11px] text-stone-400">Tempo real</span>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs italic">
                Nenhuma notificação recente recebida.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition ${
                      notif.read
                        ? 'bg-stone-50 border-stone-200'
                        : 'bg-amber-50/70 border-amber-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-stone-900">{notif.title}</p>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-stone-400 mt-2 block">
                          {formatDateTime(notif.createdAt)}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-stone-200 text-stone-700 shrink-0">
                        {notif.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preferences & WhatsApp Integration Specs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Channel Preference Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2 mb-2">
              <Sliders className="w-4 h-4 text-red-800" />
              <span>Canais de Recebimento</span>
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Escolha por onde deseja ser alertado sobre novos pedidos, sobras e acertos:
            </p>

            <div className="space-y-2">
              <label
                onClick={() => handleSavePref('in_app')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  pref === 'in_app'
                    ? 'bg-red-50 border-red-800 text-red-950 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-red-800" />
                  <span className="text-xs">Apenas Dentro do Aplicativo</span>
                </div>
                <input
                  type="radio"
                  name="pref"
                  checked={pref === 'in_app'}
                  onChange={() => {}}
                  className="text-red-800"
                />
              </label>

              <label
                onClick={() => handleSavePref('whatsapp')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  pref === 'whatsapp'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs">Por WhatsApp</span>
                </div>
                <input
                  type="radio"
                  name="pref"
                  checked={pref === 'whatsapp'}
                  onChange={() => {}}
                  className="text-emerald-600"
                />
              </label>

              <label
                onClick={() => handleSavePref('both')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  pref === 'both'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <span className="text-xs">Ambos (App + WhatsApp)</span>
                </div>
                <input
                  type="radio"
                  name="pref"
                  checked={pref === 'both'}
                  onChange={() => {}}
                  className="text-amber-600"
                />
              </label>
            </div>

            {prefSuccess && (
              <p className="text-[11px] font-bold text-emerald-700 mt-3 text-center">
                Preferência de notificação salva com sucesso!
              </p>
            )}
          </div>

          {/* Direct WhatsApp Message Dispatcher */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Envio Direto via WhatsApp</span>
            </h3>
            <p className="text-xs text-stone-500 mb-3">
              Abra uma conversa oficial no WhatsApp com mensagem pré-formatada para um revendedor:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Selecione o Revendedor:
                </label>
                <select
                  value={selectedClientPhone}
                  onChange={(e) => setSelectedClientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients
                    .filter((c) => c.role === 'revendedor' && c.phone)
                    .map((c) => (
                      <option key={c.uid} value={c.phone}>
                        {c.displayName} ({c.phone})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Mensagem:
                </label>
                <textarea
                  rows={3}
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-medium"
                />
              </div>

              <button
                onClick={handleOpenDirectWhatsApp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Disparar WhatsApp Oficial</span>
              </button>
            </div>
          </div>

          {/* Official Provider Technical Requirement Notice */}
          <div className="bg-stone-50 rounded-3xl p-5 border border-stone-200 text-xs text-stone-600 space-y-2">
            <div className="flex items-center gap-2 text-stone-800 font-black">
              <HelpCircle className="w-4 h-4 text-red-800" />
              <span>Requisitos para Disparos Automáticos de Fundo:</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              O envio automático <em>sem intervenção humana</em> requer a contratação e ativação de
              uma conta oficial na <strong>WhatsApp Cloud API (Meta)</strong> ou provedor parceiro (ex:
              Twilio / Z-API), com:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Número de telefone comercial verificado no Meta Business Manager.</li>
              <li>Templates de mensagens pré-aprovados pela Meta.</li>
              <li>Token de acesso de longa duração configurado no servidor.</li>
            </ul>
            <p className="text-[11px] text-stone-500 italic">
              Enquanto a API comercial de disparos em lote não for ativada no seu painel Meta, o
              aplicativo fornece links diretos (wa.me) totalmente funcionais e gratuitos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
