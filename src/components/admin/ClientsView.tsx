import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Edit2,
  Calendar,
  Croissant,
  DollarSign,
  AlertCircle,
  X,
  MessageCircle,
  ShoppingBag,
  History,
  Shield,
  KeyRound,
  User,
  Eye,
  EyeOff,
  Share2,
  Bell,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { UserProfile, Order, PaymentRecord, NotificationPreference } from '../../types';
import { formatCurrency, formatDate, formatDateTime, formatPhone, buildWhatsAppLink } from '../../utils/formatters';
import { updateUserProfile } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { getPublicAppUrl } from '../../config/appConfig';

interface ClientsViewProps {
  clients: UserProfile[];
  orders: Order[];
  payments: PaymentRecord[];
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  openNewModalInitially?: boolean;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  orders,
  payments,
  selectedClientId,
  onSelectClient,
  openNewModalInitially = false,
}) => {
  const { registerNewReseller } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(openNewModalInitially);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<UserProfile | null>(null);

  // New reseller form state (simplified without mandatory email)
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newPref, setNewPref] = useState<NotificationPreference>('both');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showPasswordHint, setShowPasswordHint] = useState(false);

  const resellers = useMemo(() => {
    return clients.filter((c) => c.role === 'revendedor');
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return resellers;
    const term = searchTerm.toLowerCase();
    return resellers.filter(
      (c) =>
        c.displayName.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.includes(term)
    );
  }, [resellers, searchTerm]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return resellers.find((c) => c.uid === selectedClientId) || null;
  }, [resellers, selectedClientId]);

  // Orders of selected client
  const clientOrders = useMemo(() => {
    if (!selectedClient) return [];
    return orders.filter((o) => o.resellerId === selectedClient.uid);
  }, [orders, selectedClient]);

  // Payments of selected client
  const clientPayments = useMemo(() => {
    if (!selectedClient) return [];
    return payments.filter((p) => p.resellerId === selectedClient.uid);
  }, [payments, selectedClient]);

  // Financial summary for selected client
  const clientStats = useMemo(() => {
    let totalSaltyPickup = 0;
    let totalSweetPickup = 0;
    let totalSaltyLeftover = 0;
    let totalSweetLeftover = 0;
    let totalSaltySold = 0;
    let totalSweetSold = 0;
    let expectedTotal = 0;
    let finalTotal = 0;
    let totalPaid = 0;
    let pendingBalance = 0;

    clientOrders.forEach((o) => {
      totalSaltyPickup += o.qtySaltyPickup || 0;
      totalSweetPickup += o.qtySweetPickup || 0;
      totalSaltyLeftover += o.qtySaltyLeftover || 0;
      totalSweetLeftover += o.qtySweetLeftover || 0;
      totalSaltySold += o.qtySaltySold || 0;
      totalSweetSold += o.qtySweetSold || 0;
      expectedTotal += o.expectedTotal || 0;
      finalTotal += o.finalTotal || 0;
      totalPaid += o.amountPaid || 0;
      pendingBalance += o.balanceDue || 0;
    });

    return {
      totalOrders: clientOrders.length,
      totalSaltyPickup,
      totalSweetPickup,
      totalSaltyLeftover,
      totalSweetLeftover,
      totalSaltySold,
      totalSweetSold,
      expectedTotal,
      finalTotal,
      totalPaid,
      pendingBalance,
    };
  }, [clientOrders]);

  // Handle register reseller
  const handleCreateReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newName.trim()) {
      setFormError('Informe o Nome Completo do revendedor.');
      return;
    }

    if (!newPhone.trim()) {
      setFormError('Informe o Telefone / WhatsApp do revendedor.');
      return;
    }

    // Generate or clean username
    const rawUser = newUsername.trim() || newName.trim().toLowerCase().split(' ')[0];
    const cleanUsername = rawUser.toLowerCase().replace(/[^a-z0-9._-]/g, '');

    if (!cleanUsername) {
      setFormError('Informe um Nome de Usuário válido (apenas letras minúsculas e números).');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setFormError('A senha simples deve ter no mínimo 6 dígitos (ex: 123456).');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerNewReseller({
        displayName: newName.trim(),
        username: cleanUsername,
        phone: newPhone.trim(),
        pass: newPassword,
        email: newEmail.trim() || undefined,
        notificationPreference: newPref,
      });

      setFormSuccess(`Revendedor "${cleanUsername}" cadastrado com sucesso!`);
      setNewName('');
      setNewUsername('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('123456');
      setNewPref('both');
      setTimeout(() => {
        setShowNewModal(false);
        setFormSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/email-already-in-use') {
        setFormError(`O nome de usuário "${cleanUsername}" já está em uso. Escolha outro.`);
      } else {
        setFormError('Erro ao cadastrar revendedor: ' + (err?.message || 'Falha no servidor'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dispatch WhatsApp with credentials directly to the reseller
  const handleSendCredentialsWhatsApp = (client: UserProfile) => {
    if (!client.phone) return;
    const loginUser = client.username || (client.email ? client.email.split('@')[0] : client.displayName);
    const passHint = client.simplePasswordHint || '123456';
    const appUrl = getPublicAppUrl();

    const text = `🥖 *PANIFICADORA MORUMBI* 🥖
Olá *${client.displayName}*!

Seu acesso ao sistema de pedidos de pães está liberado:
👤 *Usuário de Acesso:* ${loginUser}
🔑 *Sua Senha:* ${passHint}
📲 *Link Oficial do Aplicativo:* ${appUrl}

Para acessar:
1. Abra o link acima no seu celular.
2. Digite seu usuário: *${loginUser}* e sua senha.
3. Clique em "Instalar Aplicativo" no topo da página para salvar o ícone da padaria no seu celular!`;

    const url = buildWhatsAppLink(client.phone, text);
    window.open(url, '_blank');
  };

  // Toggle active status without deleting history
  const handleToggleActive = async (client: UserProfile) => {
    const nextStatus = !client.active;
    const confirmMsg = nextStatus
      ? `Deseja reativar a conta de ${client.displayName}?`
      : `Deseja desativar a conta de ${client.displayName}? O histórico de pedidos e pagamentos será preservado intacto.`;

    if (window.confirm(confirmMsg)) {
      try {
        await updateUserProfile(client.uid, { active: nextStatus });
      } catch (err) {
        alert('Erro ao alterar status: ' + err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-red-800" />
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              2. Gestão de Clientes e Revendedores
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Visualize pedidos, retiradas, sobras e saldos financeiros de cada revendedor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormError(null);
              setFormSuccess(null);
              setShowNewModal(true);
            }}
            className="bg-red-800 hover:bg-red-900 text-white font-bold text-xs uppercase px-4 py-3 rounded-xl shadow-md transition flex items-center gap-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Revendedor</span>
          </button>
        </div>
      </div>

      {/* Main split view: Clients List vs Selected Client Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: List of Resellers */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200">
            {/* Search input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-stone-500 mb-2 px-1">
              <span>Revendedores ({filteredClients.length})</span>
              {selectedClientId && (
                <button
                  onClick={() => onSelectClient(null)}
                  className="text-red-800 text-[11px] hover:underline"
                >
                  Limpar seleção
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredClients.length === 0 ? (
                <div className="text-center py-6 text-stone-400 text-xs italic">
                  Nenhum revendedor localizado.
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedClientId === client.uid;
                  // Calculate quick pending balance
                  const pending = orders
                    .filter((o) => o.resellerId === client.uid)
                    .reduce((sum, o) => sum + (o.balanceDue || 0), 0);

                  return (
                    <div
                      key={client.uid}
                      onClick={() => onSelectClient(client.uid)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-400/20 border-amber-500 shadow-sm'
                          : 'bg-stone-50 border-stone-200/80 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                            client.active
                              ? 'bg-red-800 text-white'
                              : 'bg-stone-300 text-stone-600'
                          }`}
                        >
                          {client.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-stone-900 truncate">
                            {client.displayName}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate">
                            {formatPhone(client.phone) || client.email}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              client.active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {client.active ? 'Ativo' : 'Inativo'}
                          </span>
                          {client.notificationPreference === 'in_app' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-red-100 text-red-800" title="Notificação no Celular / App">
                              📱 App
                            </span>
                          )}
                          {client.notificationPreference === 'whatsapp' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800" title="Notificação por WhatsApp">
                              💬 Zap
                            </span>
                          )}
                          {(!client.notificationPreference || client.notificationPreference === 'both') && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-900" title="Ambos (App + Zap)">
                              ⚡ Ambos
                            </span>
                          )}
                          {client.notificationPreference === 'none' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-stone-200 text-stone-600" title="Silencioso">
                              🔕 Silêncio
                            </span>
                          )}
                        </div>
                        {pending > 0 && (
                          <p className="text-[10px] font-extrabold text-rose-700 mt-0.5">
                            Pendente: {formatCurrency(pending)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column: Selected Client Profile & History */}
        <div className="lg:col-span-8">
          {selectedClient ? (
            <div className="space-y-6">
              {/* Client Info Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-800 text-amber-300 flex items-center justify-center font-black text-xl shadow-md">
                      {selectedClient.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-stone-900">
                          {selectedClient.displayName}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            selectedClient.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {selectedClient.active ? 'Conta Ativa' : 'Conta Desativada'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500 mt-1.5">
                        <span className="inline-flex items-center gap-1 font-bold text-stone-800 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-lg">
                          <User className="w-3.5 h-3.5 text-amber-600" />
                          Usuário: <strong className="text-red-950 font-black">{selectedClient.username || selectedClient.email?.split('@')[0]}</strong>
                        </span>

                        {selectedClient.simplePasswordHint ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-950 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                            <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                            Senha: <strong className="font-mono text-red-950">{showPasswordHint ? selectedClient.simplePasswordHint : '••••••'}</strong>
                            <button
                              type="button"
                              onClick={() => setShowPasswordHint(!showPasswordHint)}
                              className="ml-1 p-0.5 text-stone-500 hover:text-stone-800"
                              title={showPasswordHint ? 'Ocultar senha' : 'Ver senha'}
                            >
                              {showPasswordHint ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </span>
                        ) : null}

                        {selectedClient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            {formatPhone(selectedClient.phone)}
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-stone-400">
                          <Mail className="w-3.5 h-3.5" />
                          {selectedClient.email}
                        </span>
                      </div>

                      {/* Notification Preference Selector in Dossier */}
                      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5 text-red-800" />
                          Preferência de Notificação:
                        </span>
                        {(['in_app', 'whatsapp', 'both', 'none'] as NotificationPreference[]).map((prefKey) => {
                          const currentPref = selectedClient.notificationPreference || 'both';
                          const isSelected = currentPref === prefKey;
                          const labels: Record<NotificationPreference, string> = {
                            in_app: '📱 Apenas no App',
                            whatsapp: '💬 Apenas no Zap',
                            both: '⚡ Ambos (App + Zap)',
                            none: '🔕 Silencioso',
                          };

                          return (
                            <button
                              key={prefKey}
                              type="button"
                              onClick={async () => {
                                try {
                                  await updateUserProfile(selectedClient.uid, {
                                    notificationPreference: prefKey,
                                  });
                                } catch (err) {
                                  alert('Erro ao atualizar preferência: ' + err);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                isSelected
                                  ? 'bg-red-800 text-white border-red-800 shadow-2xs'
                                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              {labels[prefKey]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this client */}
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedClient.phone && (
                      <button
                        type="button"
                        onClick={() => handleSendCredentialsWhatsApp(selectedClient)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs font-bold"
                        title="Enviar dados de acesso (usuário e senha) no WhatsApp do revendedor"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Enviar Acesso WhatsApp</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleActive(selectedClient)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedClient.active
                          ? 'border-rose-300 text-rose-800 hover:bg-rose-50'
                          : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      {selectedClient.active ? 'Desativar Conta' : 'Reativar Conta'}
                    </button>
                  </div>
                </div>

                {/* Client Financial Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                    <p className="text-[10px] font-extrabold uppercase text-amber-900 tracking-wider">
                      Saldo Pendente
                    </p>
                    <p className="text-xl font-black text-rose-700 mt-1">
                      {formatCurrency(clientStats.pendingBalance)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                    <p className="text-[10px] font-extrabold uppercase text-emerald-900 tracking-wider">
                      Total Já Pago
                    </p>
                    <p className="text-xl font-black text-emerald-700 mt-1">
                      {formatCurrency(clientStats.totalPaid)}
                    </p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <p className="text-[10px] font-extrabold uppercase text-stone-600 tracking-wider">
                      Valor Final (Vendido)
                    </p>
                    <p className="text-xl font-black text-stone-900 mt-1">
                      {formatCurrency(clientStats.finalTotal)}
                    </p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <p className="text-[10px] font-extrabold uppercase text-stone-600 tracking-wider">
                      Pães Salgados / Doces
                    </p>
                    <p className="text-sm font-black text-stone-900 mt-1">
                      {clientStats.totalSaltySold} salg. / {clientStats.totalSweetSold} doces
                    </p>
                    <p className="text-[10px] text-stone-500">
                      Sobras: {clientStats.totalSaltyLeftover} salg / {clientStats.totalSweetLeftover} doce
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Orders History */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-red-800" />
                    <span>Pedidos do Revendedor ({clientOrders.length})</span>
                  </h4>
                </div>

                {clientOrders.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs italic">
                    Nenhum pedido registrado para este revendedor ainda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] font-bold">
                          <th className="pb-3">Identificador</th>
                          <th className="pb-3">Data Entrega</th>
                          <th className="pb-3 text-right">Retirada</th>
                          <th className="pb-3 text-right">Sobras</th>
                          <th className="pb-3 text-right">Valor Final</th>
                          <th className="pb-3 text-right">Pago</th>
                          <th className="pb-3 text-right">Saldo</th>
                          <th className="pb-3 text-center">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {clientOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-stone-50 transition">
                            <td className="py-3 font-bold text-stone-900">{o.orderNumber}</td>
                            <td className="py-3 text-stone-600">{formatDate(o.deliveryDate)}</td>
                            <td className="py-3 text-right">
                              {o.qtySaltyPickup} salg / {o.qtySweetPickup} doce
                            </td>
                            <td className="py-3 text-right">
                              {o.leftoversRecorded ? (
                                `${o.qtySaltyLeftover} salg / ${o.qtySweetLeftover} doce`
                              ) : (
                                <span className="text-amber-600 font-semibold italic">Pendente</span>
                              )}
                            </td>
                            <td className="py-3 text-right font-bold text-stone-900">
                              {formatCurrency(o.finalTotal)}
                            </td>
                            <td className="py-3 text-right font-medium text-emerald-700">
                              {formatCurrency(o.amountPaid)}
                            </td>
                            <td className="py-3 text-right font-bold text-rose-700">
                              {formatCurrency(o.balanceDue)}
                            </td>
                            <td className="py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  o.status === 'concluido'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {o.status === 'concluido' ? 'Concluído' : 'Aguardando Sobras'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Client Payments History */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
                <h4 className="text-sm font-black text-stone-900 flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span>Histórico de Pagamentos e Acertos ({clientPayments.length})</span>
                </h4>

                {clientPayments.length === 0 ? (
                  <div className="text-center py-6 text-stone-400 text-xs italic">
                    Nenhum pagamento registrado ainda para este cliente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientPayments.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-stone-900">
                            Pagamento recebido via {p.paymentMethod.toUpperCase()}
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Data: {formatDate(p.paymentDate)} {p.notes && `• Obs: ${p.notes}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-emerald-700">
                            + {formatCurrency(p.amount)}
                          </p>
                          <span className="text-[10px] text-stone-400">Registrado por Admin</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-800 flex items-center justify-center mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-stone-900">Nenhum Cliente Selecionado</h3>
              <p className="text-xs text-stone-500 max-w-sm mt-1">
                Selecione um revendedor na lista ao lado ou no menu lateral para visualizar os
                detalhes de retiradas, sobras e acertos financeiros.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Cadastrar Novo Revendedor */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-800 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Novo Revendedor</h3>
                  <p className="text-xs text-stone-500">Crie o acesso para o cliente no Firebase</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateReseller} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Nome Completo do Revendedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={newName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewName(val);
                    if (!newUsername) {
                      const first = val.trim().toLowerCase().split(' ')[0].replace(/[^a-z0-9._-]/g, '');
                      setNewUsername(first);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700 uppercase">
                    Nome de Usuário (Login Simples) *
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    Sem e-mail!
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: carlos"
                    value={newUsername}
                    onChange={(e) =>
                      setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white font-mono"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  O cliente só digitará esse nome (ex: <strong>{newUsername || 'carlos'}</strong>) para entrar no celular.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Telefone / WhatsApp do Revendedor *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98765-4321"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Senha Simples de Acesso *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 123456 ou pao2026"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white font-mono"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Mínimo 6 dígitos. A senha fica salva e o patrão pode reenviar para o cliente no WhatsApp a qualquer momento.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  E-mail (Opcional — caso o cliente queira)
                </label>
                <input
                  type="email"
                  placeholder="Deixe em branco para usar apenas o nome de usuário"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Preferência de Notificações do Revendedor
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPref('in_app')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      newPref === 'in_app'
                        ? 'bg-red-50 border-red-800 text-red-950 font-bold shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-red-800 shrink-0" />
                    <div>
                      <p className="text-xs">Apenas no App</p>
                      <p className="text-[10px] text-stone-400 font-normal">Barra do celular</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPref('whatsapp')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      newPref === 'whatsapp'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs">Apenas no Zap</p>
                      <p className="text-[10px] text-stone-400 font-normal">Mensagem direta</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPref('both')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      newPref === 'both'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs">Ambos (App + Zap)</p>
                      <p className="text-[10px] text-stone-400 font-normal">Completo</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPref('none')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      newPref === 'none'
                        ? 'bg-stone-200 border-stone-400 text-stone-900 font-bold shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Bell className="w-4 h-4 text-stone-500 shrink-0" />
                    <div>
                      <p className="text-xs">Silencioso</p>
                      <p className="text-[10px] text-stone-400 font-normal">Sem avisos</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Salvar Revendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
