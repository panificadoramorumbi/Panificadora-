import React, { useState, useMemo, useEffect } from 'react';
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
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { UserProfile, Order, PaymentRecord, NotificationPreference, ProductPrices } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  buildWhatsAppLink,
  calculateOrderMetrics,
  sanitizeUsername,
} from '../../utils/formatters';
import {
  updateUserProfile,
  deleteUserProfile,
  createOrder,
  recordLeftovers,
  sendNotification,
  cleanupOrphanedHistory,
  resetAllHistoricalData,
  cleanAppKeepOnlyFrancisca,
  cleanAppKeepOnlyAdmin,
  DEFAULT_PRICES,
} from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { getPublicAppUrl } from '../../config/appConfig';

interface ClientsViewProps {
  clients: UserProfile[];
  orders: Order[];
  payments: PaymentRecord[];
  prices?: ProductPrices;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  openNewModalInitially?: boolean;
  onCloseNewModal?: () => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  orders,
  payments,
  prices = DEFAULT_PRICES,
  selectedClientId,
  onSelectClient,
  openNewModalInitially = false,
  onCloseNewModal,
}) => {
  const { currentUser, registerNewReseller } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(openNewModalInitially);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<UserProfile | null>(null);

  // Admin record leftovers state (Patrão lança sobras pelo cliente)
  const [orderForLeftovers, setOrderForLeftovers] = useState<Order | null>(null);
  const [adminSaltyLeftover, setAdminSaltyLeftover] = useState<number>(0);
  const [adminSweetLeftover, setAdminSweetLeftover] = useState<number>(0);
  const [isSavingAdminLeftovers, setIsSavingAdminLeftovers] = useState(false);
  const [adminLeftoverError, setAdminLeftoverError] = useState<string | null>(null);
  const [adminLeftoverSuccess, setAdminLeftoverSuccess] = useState<string | null>(null);

  // Edit client modal form state
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPasswordHint, setEditPasswordHint] = useState('');
  const [editClientType, setEditClientType] = useState<'revendedor' | 'consumidor_final'>('revendedor');
  const [editRole, setEditRole] = useState<'revendedor' | 'admin'>('revendedor');
  const [editCustomPriceSalty, setEditCustomPriceSalty] = useState<string>('');
  const [editCustomPriceSweet, setEditCustomPriceSweet] = useState<string>('');
  const [editNotificationPref, setEditNotificationPref] = useState<NotificationPreference>('both');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editModalSuccess, setEditModalSuccess] = useState<string | null>(null);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Cleanup test data modal state
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  // Sync openNewModalInitially when prop changes
  useEffect(() => {
    if (openNewModalInitially) {
      setShowNewModal(true);
    }
  }, [openNewModalInitially]);

  // Client deletion state
  const [clientToDelete, setClientToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Place order on behalf of client state
  const [clientForOrder, setClientForOrder] = useState<UserProfile | null>(null);
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [qtySalty, setQtySalty] = useState<number | string>(50);
  const [qtySweet, setQtySweet] = useState<number | string>(0);
  const [orderUnitPriceSalty, setOrderUnitPriceSalty] = useState<number | string>('');
  const [orderUnitPriceSweet, setOrderUnitPriceSweet] = useState<number | string>('');
  const [fixPriceForClient, setFixPriceForClient] = useState<boolean>(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Sync custom unit prices when clientForOrder changes
  useEffect(() => {
    if (clientForOrder) {
      setOrderUnitPriceSalty(clientForOrder.customPriceSalty ?? (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty));
      setOrderUnitPriceSweet(clientForOrder.customPriceSweet ?? (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet));
      setFixPriceForClient(false);
    }
  }, [clientForOrder, prices]);

  // In-App Notification Modal State (Notify client on app / system notification bar)
  const [clientForNotification, setClientForNotification] = useState<UserProfile | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifSuccessMsg, setNotifSuccessMsg] = useState<string | null>(null);

  // New user form state (supports both revendedor and administrator)
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newRole, setNewRole] = useState<'revendedor' | 'admin'>('revendedor');
  const [newCustomPriceSalty, setNewCustomPriceSalty] = useState<string>('');
  const [newCustomPriceSweet, setNewCustomPriceSweet] = useState<string>('');
  const [newPref, setNewPref] = useState<NotificationPreference>('both');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showPasswordHint, setShowPasswordHint] = useState(false);

  const resellers = useMemo(() => {
    return clients.filter((c) => c.role === 'revendedor');
  }, [clients]);

  const unnamedClients = useMemo(() => {
    return resellers.filter((c) => {
      const name = (c.displayName || '').toLowerCase().trim();
      return name === 'revendedor' || name === 'sem nome' || name === '';
    });
  }, [resellers]);

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

    // Generate or clean username (strips accents: Célia -> celia)
    const rawUser = newUsername.trim() || newName.trim().split(' ')[0];
    const cleanUsername = sanitizeUsername(rawUser);

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
      const saltyPrice = newCustomPriceSalty !== '' && Number(newCustomPriceSalty) > 0 ? Number(newCustomPriceSalty) : undefined;
      const sweetPrice = newCustomPriceSweet !== '' && Number(newCustomPriceSweet) > 0 ? Number(newCustomPriceSweet) : undefined;

      await registerNewReseller({
        displayName: newName.trim(),
        username: cleanUsername,
        phone: newPhone.trim(),
        pass: newPassword,
        email: newEmail.trim() || undefined,
        role: newRole,
        customPriceSalty: saltyPrice,
        customPriceSweet: sweetPrice,
        notificationPreference: newPref,
      });

      const roleLabel = newRole === 'admin' ? 'Administrador' : 'Revendedor';
      setFormSuccess(`${roleLabel} "${cleanUsername}" cadastrado com sucesso!`);
      setNewName('');
      setNewUsername('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('123456');
      setNewRole('revendedor');
      setNewCustomPriceSalty('');
      setNewCustomPriceSweet('');
      setNewPref('both');
      setTimeout(() => {
        handleCloseNewModal();
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

  // Permanently delete client profile from database
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserProfile(clientToDelete.uid);
      if (selectedClientId === clientToDelete.uid) {
        onSelectClient(null);
      }
      const deletedName = clientToDelete.displayName;
      setClientToDelete(null);
      alert(`Revendedor "${deletedName}" foi excluído permanentemente do sistema.`);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir revendedor: ' + (err?.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Create an order on behalf of a reseller (admin action)
  const handleCreateOrderForClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForOrder) return;

    const sQty = Number(qtySalty) || 0;
    const wQty = Number(qtySweet) || 0;

    if (sQty <= 0 && wQty <= 0) {
      alert('Informe ao menos uma quantidade de pão salgado ou doce.');
      return;
    }

    const saltyPriceNum =
      Number(orderUnitPriceSalty) || (clientForOrder.customPriceSalty ?? (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty));
    const sweetPriceNum =
      Number(orderUnitPriceSweet) || (clientForOrder.customPriceSweet ?? (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet));

    setIsCreatingOrder(true);
    try {
      if (fixPriceForClient) {
        await updateUserProfile(clientForOrder.uid, {
          customPriceSalty: saltyPriceNum,
          customPriceSweet: sweetPriceNum,
        });
      }

      await createOrder({
        resellerId: clientForOrder.uid,
        resellerName: clientForOrder.displayName,
        orderDate: orderDate || new Date().toISOString().split('T')[0],
        deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
        qtySaltyPickup: sQty,
        qtySweetPickup: wQty,
        unitPriceSalty: saltyPriceNum,
        unitPriceSweet: sweetPriceNum,
        notes: orderNotes
          ? `[Lançado pela Panificadora]: ${orderNotes}`
          : '[Lançado pela Panificadora]',
        currentPrices: prices,
      });

      setOrderSuccessMsg(`Pedido lançado com sucesso para ${clientForOrder.displayName}!`);
      setTimeout(() => {
        setClientForOrder(null);
        setOrderSuccessMsg(null);
        setQtySalty(50);
        setQtySweet(0);
        setOrderNotes('');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar pedido para o cliente: ' + (err?.message || err));
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Open notification modal for a specific client
  const handleOpenNotificationModal = (client: UserProfile) => {
    setClientForNotification(client);
    setNotifTitle('🥖 Pães quentinhos prontos para retirada!');
    setNotifMessage(
      `Olá ${client.displayName}! Sua fornada de pães acabou de sair e está quentinha te esperando na Panificadora Morumbi.`
    );
    setNotifSuccessMsg(null);
  };

  // Save client notification preference directly (keeps it saved in Firestore)
  const handleSaveClientNotificationPref = async (clientId: string, pref: NotificationPreference) => {
    try {
      await updateUserProfile(clientId, { notificationPreference: pref });
      if (clientForNotification && clientForNotification.uid === clientId) {
        setClientForNotification({ ...clientForNotification, notificationPreference: pref });
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar preferência de notificação: ' + (err?.message || err));
    }
  };

  // Send in-app notification that appears on client's device notification bar
  const handleSendInAppNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForNotification) return;

    if (!notifTitle.trim()) {
      alert('Informe um título para a notificação.');
      return;
    }
    if (!notifMessage.trim()) {
      alert('Informe a mensagem da notificação.');
      return;
    }

    setIsSendingNotif(true);
    try {
      await sendNotification({
        targetUserId: clientForNotification.uid,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: 'sistema',
      });

      setNotifSuccessMsg(
        `Notificação enviada com sucesso para ${clientForNotification.displayName}! O alerta aparecerá na barra de notificações do celular dele.`
      );

      setTimeout(() => {
        setClientForNotification(null);
        setNotifSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao enviar notificação: ' + (err?.message || err));
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Open record leftovers modal directly for an order
  const handleOpenRecordLeftovers = (order: Order) => {
    setOrderForLeftovers(order);
    setAdminSaltyLeftover(0);
    setAdminSweetLeftover(0);
    setAdminLeftoverError(null);
    setAdminLeftoverSuccess(null);
  };

  // Submit recorded leftovers on behalf of the reseller
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
        `Sobras registradas com sucesso para ${orderForLeftovers.resellerName}! O valor final e as quantidades vendidas foram recalculados.`
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

  // Open edit modal prefilled with current client data
  const handleOpenEditModal = (client: UserProfile) => {
    setEditingClient(client);
    setEditName(client.displayName || '');
    setEditUsername(client.username || (client.email ? client.email.split('@')[0] : ''));
    setEditPhone(client.phone || '');
    setEditEmail(client.email || '');
    setEditPasswordHint(client.simplePasswordHint || '123456');
    setEditClientType(client.clientType || 'revendedor');
    setEditRole(client.role === 'admin' ? 'admin' : 'revendedor');
    setEditCustomPriceSalty(client.customPriceSalty !== undefined ? String(client.customPriceSalty) : '');
    setEditCustomPriceSweet(client.customPriceSweet !== undefined ? String(client.customPriceSweet) : '');
    setEditNotificationPref(client.notificationPreference || 'both');
    setEditModalError(null);
    setEditModalSuccess(null);
    setShowEditModal(true);
  };

  // Save changes to client profile (updates name, username, phone, email, password, etc.)
  const handleSaveEditedClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (!editName.trim()) {
      setEditModalError('Informe o nome do revendedor.');
      return;
    }
    if (!editUsername.trim()) {
      setEditModalError('Informe o nome de usuário para login.');
      return;
    }

    setIsSavingEdit(true);
    setEditModalError(null);
    try {
      const saltyPrice =
        editCustomPriceSalty !== '' && Number(editCustomPriceSalty) > 0
          ? Number(editCustomPriceSalty)
          : null;
      const sweetPrice =
        editCustomPriceSweet !== '' && Number(editCustomPriceSweet) > 0
          ? Number(editCustomPriceSweet)
          : null;

      const cleanUsername = sanitizeUsername(editUsername.trim() || editName.trim().split(' ')[0]);

      const updates: any = {
        displayName: editName.trim(),
        username: cleanUsername,
        phone: editPhone.trim(),
        email: editEmail.trim(),
        simplePasswordHint: editPasswordHint.trim() || '123456',
        clientType: editClientType,
        role: editRole,
        notificationPreference: editNotificationPref,
      };

      if (saltyPrice !== null) {
        updates.customPriceSalty = saltyPrice;
      } else {
        updates.customPriceSalty = null;
      }

      if (sweetPrice !== null) {
        updates.customPriceSweet = sweetPrice;
      } else {
        updates.customPriceSweet = null;
      }

      await updateUserProfile(editingClient.uid, updates);

      setEditModalSuccess('Dados e preços do cliente atualizados com sucesso!');
      setTimeout(() => {
        setShowEditModal(false);
        setEditingClient(null);
        setEditModalSuccess(null);
      }, 1400);
    } catch (err: any) {
      setEditModalError('Erro ao atualizar dados: ' + (err?.message || err));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick 1-click rename for accounts with provisional name "Revendedor"
  const handleQuickRename = async (client: UserProfile, targetName: 'Célia' | 'Manuel') => {
    const cleanU = targetName === 'Célia' ? 'celia' : 'manuel';
    try {
      await updateUserProfile(client.uid, {
        displayName: targetName,
        username: cleanU,
        simplePasswordHint: client.simplePasswordHint || '123456',
      });
      alert(`Revendedor atualizado para "${targetName}" com sucesso!\n\n👤 Usuário de acesso: ${cleanU}\n🔑 Senha: ${client.simplePasswordHint || '123456'}`);
    } catch (err: any) {
      alert('Erro ao atualizar revendedor: ' + (err?.message || err));
    }
  };

  // Run cleanup of orphaned records, reset all test data, or keep ONLY Administrator
  const handleRunCleanup = async (type: 'orphans' | 'all' | 'admin_only' | 'francisca_only') => {
    setIsCleaningUp(true);
    try {
      if (type === 'admin_only') {
        const res = await cleanAppKeepOnlyAdmin();
        setCleanupMessage(
          `Limpeza concluída com sucesso! Foram excluídos ${res.deletedUsers} revendedor(es), ${res.deletedOrders} pedidos e ${res.deletedPayments} pagamentos. Apenas a sua conta de Administrador foi mantida. O aplicativo está 100% zerado e pronto para os novos cadastros!`
        );
        onSelectClient(null);
      } else if (type === 'orphans') {
        const res = await cleanupOrphanedHistory();
        setCleanupMessage(
          `Limpeza concluída! Foram removidos ${res.deletedOrders} pedido(s) e ${res.deletedPayments} pagamento(s) de clientes que já tinham sido excluídos.`
        );
      } else if (type === 'francisca_only') {
        const res = await cleanAppKeepOnlyFrancisca();
        setCleanupMessage(
          `Sucesso! Foram apagados ${res.deletedOrders} pedidos e ${res.deletedPayments} pagamentos. Todos os clientes fictícios foram removidos e apenas a Dona Francisca foi mantida como revendedora com saldo R$ 0,00.`
        );
      } else {
        const res = await resetAllHistoricalData();
        setCleanupMessage(
          `Histórico zerado com sucesso! Foram excluídos ${res.deletedOrders} pedidos e ${res.deletedPayments} pagamentos de teste. O saldo está 100% limpo para os clientes reais!`
        );
      }
    } catch (err: any) {
      alert('Erro ao realizar limpeza: ' + (err?.message || err));
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleCloseNewModal = () => {
    setShowNewModal(false);
    onCloseNewModal?.();
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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cleanup Test Data Button */}
          <button
            type="button"
            onClick={() => {
              setCleanupMessage(null);
              setShowCleanupModal(true);
            }}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs uppercase px-3.5 py-3 rounded-xl border border-stone-300 transition flex items-center gap-2 shrink-0"
            title="Limpar pedidos e pagamentos de clientes excluídos ou zerar histórico de teste"
          >
            <Trash2 className="w-4 h-4 text-stone-500" />
            <span>Limpar Histórico de Teste</span>
          </button>

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

      {/* Alert Banner for Fresh Start: Keep Only Admin */}
      {resellers.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Trash2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-black text-red-950">
                Reinício das Operações: Começar do Zero a Partir de Hoje
              </p>
              <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
                Você solicitou excluir todos os revendedores para começar limpo. Esta ação apaga os {resellers.length} revendedor(es) atuais e pedidos de teste, deixando <strong>apenas a sua conta de Administrador</strong> e mantendo todas as configurações de preços e regras intactas.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isCleaningUp}
            onClick={() => {
              if (
                window.confirm(
                  'ATENÇÃO: Deseja apagar todos os revendedores e pedidos de teste agora, mantendo APENAS a conta do Administrador para começar do zero hoje? Todos os novos cadastros começarão limpos.'
                )
              ) {
                handleRunCleanup('admin_only');
              }
            }}
            className="px-5 py-3 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black text-xs uppercase rounded-2xl shadow-md transition shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-amber-300" />
            <span>{isCleaningUp ? 'Apagando revendedores...' : 'Apagar Todos e Deixar Só Admin'}</span>
          </button>
        </div>
      )}

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

            {/* Quick Rename Alert for "Revendedor" accounts */}
            {unnamedClients.length > 0 && (
              <div className="mb-3 p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-950 font-black">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{unnamedClients.length} conta(s) com nome provisório &quot;Revendedor&quot;</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-snug">
                  Clique abaixo para definir quem é cada revendedor (Célia ou Manuel) ou exclua:
                </p>
                <div className="space-y-1.5 pt-0.5">
                  {unnamedClients.map((uc) => (
                    <div
                      key={uc.uid}
                      className="p-2 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-stone-900 truncate">
                          Login: <span className="font-mono text-red-900">{uc.username || uc.email?.split('@')[0] || 'sem usuário'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setClientToDelete(uc)}
                          className="text-stone-400 hover:text-red-700 p-0.5"
                          title="Excluir este revendedor provisório"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickRename(uc, 'Célia')}
                          className="flex-1 py-1 px-2 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black text-[10px] rounded-lg shadow-2xs transition"
                        >
                          Virar Célia
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickRename(uc, 'Manuel')}
                          className="flex-1 py-1 px-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-[10px] rounded-lg shadow-2xs transition"
                        >
                          Virar Manuel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

                  const isRevendedorProvisional =
                    (client.displayName || '').toLowerCase().trim() === 'revendedor' ||
                    (client.displayName || '').toLowerCase().trim() === 'sem nome';

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
                          <p className="text-xs font-bold text-stone-900 truncate flex items-center gap-1.5">
                            <span>
                              {isRevendedorProvisional && client.username
                                ? `${client.username.charAt(0).toUpperCase() + client.username.slice(1)}`
                                : client.displayName}
                            </span>
                            {isRevendedorProvisional && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-200 text-amber-950 rounded-md">
                                Provisório
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate">
                            {formatPhone(client.phone) || client.email || (client.username ? `Usuário: ${client.username}` : '')}
                          </p>
                          <p className="text-[10px] font-bold text-amber-900 mt-0.5 truncate">
                            {client.customPriceSalty
                              ? `⭐ Salg: ${formatCurrency(client.customPriceSalty)} | Doce: ${formatCurrency(client.customPriceSweet ?? (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet))}`
                              : `🥖 Padrão: ${formatCurrency(prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenNotificationModal(client);
                            }}
                            className="p-1 rounded-md text-stone-400 hover:text-red-800 hover:bg-stone-200 transition"
                            title="Enviar notificação na barra do celular deste cliente"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
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
                {/* Notice for provisional "Revendedor" account */}
                {(selectedClient.displayName || '').toLowerCase().trim() === 'revendedor' && (
                  <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <p className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Nome Provisório &quot;Revendedor&quot;</span>
                      </p>
                      <p className="text-[11px] text-amber-900 mt-0.5">
                        Este cadastro foi criado com usuário <strong className="font-mono text-red-950">{selectedClient.username || selectedClient.email?.split('@')[0]}</strong>. Defina quem é este revendedor com 1 clique:
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQuickRename(selectedClient, 'Célia')}
                        className="px-3.5 py-2 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition"
                      >
                        Virar Célia
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickRename(selectedClient, 'Manuel')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition"
                      >
                        Virar Manuel
                      </button>
                    </div>
                  </div>
                )}

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

                      {/* Fixed Client Pricing Badge in Dossier */}
                      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-amber-700 shrink-0" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-amber-900 block">
                              {selectedClient.customPriceSalty || selectedClient.customPriceSweet
                                ? '⭐ Preço Fixo Especial deste Cliente'
                                : '🥖 Preço Padrão da Padaria'}
                            </span>
                            <span className="text-xs font-black text-stone-900">
                              Pão Salgado:{' '}
                              <strong className="text-amber-900 font-extrabold">
                                {formatCurrency(selectedClient.customPriceSalty ?? (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty))}
                              </strong>{' '}
                              • Pão Doce:{' '}
                              <strong className="text-amber-900 font-extrabold">
                                {formatCurrency(selectedClient.customPriceSweet ?? (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet))}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(selectedClient)}
                          className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 font-black text-[11px] rounded-xl border border-amber-300 shadow-2xs transition flex items-center gap-1"
                          title="Alterar valor fixo deste cliente"
                        >
                          <Edit2 className="w-3 h-3 text-amber-700" />
                          <span>Alterar Preço</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this client */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setClientForOrder(selectedClient);
                        setOrderDate(new Date().toISOString().split('T')[0]);
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        setDeliveryDate(d.toISOString().split('T')[0]);
                        setQtySalty(50);
                        setQtySweet(0);
                        setOrderNotes('');
                      }}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs"
                      title="Lançar um novo pedido para este revendedor"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-stone-950" />
                      <span>Fazer Pedido p/ Revendedor</span>
                    </button>

                    {/* Notify on App / Celular Action Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenNotificationModal(selectedClient)}
                      className={`px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs font-bold ${
                        selectedClient.notificationPreference === 'in_app' ||
                        selectedClient.notificationPreference === 'both' ||
                        !selectedClient.notificationPreference
                          ? 'bg-red-800 hover:bg-red-900 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                      }`}
                      title="Enviar notificação push diretamente para a barra de avisos do celular deste revendedor"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Notificar no App</span>
                      {(selectedClient.notificationPreference === 'in_app' ||
                        selectedClient.notificationPreference === 'both' ||
                        !selectedClient.notificationPreference) && (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                          title="Barra de avisos do celular ativada"
                        />
                      )}
                    </button>

                    {selectedClient.phone && (
                      <button
                        type="button"
                        onClick={() => handleSendCredentialsWhatsApp(selectedClient)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs font-bold"
                        title="Enviar dados de acesso (usuário e senha) no WhatsApp do revendedor"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Enviar Acesso Zap</span>
                      </button>
                    )}

                    {/* Edit Client Data Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(selectedClient)}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs font-bold border border-stone-300"
                      title="Alterar dados do revendedor (nome, celular, usuário, senha, e-mail)"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-stone-700" />
                      <span>Editar Dados</span>
                    </button>

                    <button
                      onClick={() => handleToggleActive(selectedClient)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedClient.active
                          ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
                          : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      {selectedClient.active ? 'Desativar' : 'Reativar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setClientToDelete(selectedClient)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-900 transition flex items-center gap-1.5"
                      title="Excluir revendedor permanentemente do banco de dados"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Excluir Definitivamente</span>
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
                  <>
                    {/* Mobile View: Stacked Cards (Sem arrastar para o lado no celular) */}
                    <div className="block md:hidden space-y-3">
                      {clientOrders.map((o) => (
                        <div
                          key={o.id}
                          className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                            <span className="font-black text-stone-900 text-sm">{o.orderNumber}</span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                o.status === 'concluido'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {o.status === 'concluido' ? 'Concluído' : 'Aguardando Sobras'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-stone-600">
                            <span>Data de Entrega:</span>
                            <span className="font-bold text-stone-900">{formatDate(o.deliveryDate)}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-stone-200">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-stone-400 block">Retiradas</span>
                              <span className="font-bold text-stone-800">
                                {o.qtySaltyPickup} salg / {o.qtySweetPickup} doce
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-stone-400 block">Sobras</span>
                              <span className="font-bold text-amber-700">
                                {o.leftoversRecorded
                                  ? `${o.qtySaltyLeftover} salg / ${o.qtySweetLeftover} doce`
                                  : 'Pendente'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-amber-900 block">Valor Final</span>
                              <span className="font-black text-stone-900 text-sm">{formatCurrency(o.finalTotal)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-stone-500 block">Saldo a Pagar</span>
                              <span className={`font-black text-sm ${o.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {formatCurrency(o.balanceDue)}
                              </span>
                            </div>
                          </div>

                          {!o.leftoversRecorded && (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordLeftovers(o)}
                              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98]"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                              <span>Lançar Sobras Deste Pedido</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop View: Full Table */}
                    <div className="hidden md:block overflow-x-auto">
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
                            <th className="pb-3 text-center">Ações</th>
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
                              <td className="py-3 text-center">
                                {!o.leftoversRecorded ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRecordLeftovers(o)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-lg text-[10px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
                                  >
                                    <Sparkles className="w-3 h-3 text-stone-950" />
                                    <span>Lançar Sobras</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-stone-400 font-medium">Registrado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
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

      {/* Modal: Cadastrar Novo Usuário (Revendedor ou Administrador) */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-800 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Novo Usuário</h3>
                  <p className="text-xs text-stone-500">Cadastrar revendedor (cliente) ou administrador</p>
                </div>
              </div>
              <button
                onClick={handleCloseNewModal}
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
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Tipo de Conta / Função *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('revendedor')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 ${
                      newRole === 'revendedor'
                        ? 'bg-red-800 text-white border-red-800 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>🥖 Revendedor (Cliente)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 ${
                      newRole === 'admin'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>👑 Administrador</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder={newRole === 'admin' ? 'Ex: Maria Gestora' : 'Ex: Carlos Silva / Seu Gil'}
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
                    Nome de Usuário (Login) *
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    Sem @
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: seugil ou carlos"
                    value={newUsername}
                    onChange={(e) =>
                      setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white font-mono"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Basta digitar esse nome (ex: <strong>{newUsername || 'seugil'}</strong>) na tela de login.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Telefone / WhatsApp *
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
                    placeholder="Ex: 123456 ou morumbi"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white font-mono"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Mínimo 6 dígitos. Fica salva para consulta do administrador a qualquer momento.
                </p>
              </div>

              {/* Custom Fixed Prices (Per-client pricing) */}
              {newRole === 'revendedor' && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-700" />
                      Preço Fixo Exclusivo deste Cliente (Opcional)
                    </label>
                    <span className="text-[10px] text-amber-800 font-bold">
                      Personalizável
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Defina o preço fixo deste cliente (ex: seu Gil a 0,85, outros a 0,70 ou 0,90). Deixe vazio para usar o padrão da padaria ({formatCurrency(prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)}).
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Pão Salgado (R$/un)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder={String(prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)}
                        value={newCustomPriceSalty}
                        onChange={(e) => setNewCustomPriceSalty(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900 focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Pão Doce (R$/un)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder={String(prices?.priceSweet ?? DEFAULT_PRICES.priceSweet)}
                        value={newCustomPriceSweet}
                        onChange={(e) => setNewCustomPriceSweet(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900 focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  E-mail (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="Deixe em branco para usar apenas o login por usuário"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Preferência de Notificações
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
                  onClick={handleCloseNewModal}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Cadastrando...'
                    : newRole === 'admin'
                    ? 'Salvar Administrador'
                    : 'Salvar Revendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Excluir Revendedor Definitivamente */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Excluir Revendedor?</h3>
                <p className="text-xs text-rose-600 font-semibold">Ação irreversível no banco de dados</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-stone-600">
              <p>
                Tem certeza que deseja apagar permanentemente o cadastro de{' '}
                <strong className="text-stone-950 font-bold">{clientToDelete.displayName}</strong>?
              </p>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1 text-[11px]">
                <p>
                  <strong>Usuário:</strong> {clientToDelete.username || clientToDelete.email}
                </p>
                {clientToDelete.phone && (
                  <p>
                    <strong>WhatsApp:</strong> {formatPhone(clientToDelete.phone)}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-stone-500 italic">
                * Os pedidos anteriores vinculados a este revendedor continuarão preservados nos registros de auditoria e relatórios com o nome dele.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteClient}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lançar Pedido pelo Cliente (Ação do Patrão) */}
      {clientForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Novo Pedido p/ Revendedor</h3>
                  <p className="text-xs text-amber-700 font-bold">{clientForOrder.displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setClientForOrder(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderSuccessMsg && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{orderSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrderForClient} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Data do Pedido
                  </label>
                  <input
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Data de Entrega / Retirada *
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Unit Price per Bread (Editable per order & Option to fix for client) */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-700" />
                    Valor Unitário deste Pedido (Personalizável)
                  </span>
                  {clientForOrder.customPriceSalty && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 self-start sm:self-auto">
                      ⭐ Preço Fixo Especial deste Cliente
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Valor Pão Salgado (R$/un)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={orderUnitPriceSalty}
                      onChange={(e) => setOrderUnitPriceSalty(e.target.value)}
                      placeholder={String(clientForOrder.customPriceSalty ?? (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Padrão da padaria: {formatCurrency(prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)} (ex: 0.70 ou 0.85)
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Valor Pão Doce (R$/un)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={orderUnitPriceSweet}
                      onChange={(e) => setOrderUnitPriceSweet(e.target.value)}
                      placeholder={String(clientForOrder.customPriceSweet ?? (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Padrão da padaria: {formatCurrency(prices?.priceSweet ?? DEFAULT_PRICES.priceSweet)}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none border-t border-amber-200/60 mt-1">
                  <input
                    type="checkbox"
                    checked={fixPriceForClient}
                    onChange={(e) => setFixPriceForClient(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                  />
                  <span className="text-xs font-bold text-stone-800">
                    Fixar este valor como padrão para este cliente daqui em diante
                  </span>
                </label>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Salty */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-stone-800">Pão Salgado (Francês)</span>
                    <span className="text-[10px] font-extrabold text-amber-800">
                      {formatCurrency(Number(orderUnitPriceSalty) || (clientForOrder.customPriceSalty ?? (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)))} / un
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={qtySalty}
                    onChange={(e) => setQtySalty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[20, 50, 100].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQtySalty((prev) => (Number(prev) || 0) + q)}
                        className="flex-1 py-1 text-[10px] font-bold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700"
                      >
                        +{q}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQtySalty(0)}
                      className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-rose-50 border border-stone-200 rounded-lg text-rose-600"
                    >
                      Zerar
                    </button>
                  </div>
                </div>

                {/* Sweet */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-stone-800">Pão Doce</span>
                    <span className="text-[10px] font-extrabold text-amber-800">
                      {formatCurrency(Number(orderUnitPriceSweet) || (clientForOrder.customPriceSweet ?? (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet)))} / un
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={qtySweet}
                    onChange={(e) => setQtySweet(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[10, 20, 50].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQtySweet((prev) => (Number(prev) || 0) + q)}
                        className="flex-1 py-1 text-[10px] font-bold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700"
                      >
                        +{q}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQtySweet(0)}
                      className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-rose-50 border border-stone-200 rounded-lg text-rose-600"
                    >
                      Zerar
                    </button>
                  </div>
                </div>
              </div>

              {/* Order total preview */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-amber-900 tracking-wider">
                    Total Estimado do Pedido
                  </p>
                  <p className="text-xs text-stone-600">
                    {Number(qtySalty) || 0} salgados ({formatCurrency(Number(orderUnitPriceSalty) || (clientForOrder.customPriceSalty ?? (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)))}) + {Number(qtySweet) || 0} doces ({formatCurrency(Number(orderUnitPriceSweet) || (clientForOrder.customPriceSweet ?? (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet)))})
                  </p>
                </div>
                <p className="text-xl font-black text-amber-950">
                  {formatCurrency(
                    (Number(qtySalty) || 0) * (Number(orderUnitPriceSalty) || (clientForOrder.customPriceSalty ?? (prices?.priceSalty ?? DEFAULT_PRICES.priceSalty))) +
                      (Number(qtySweet) || 0) * (Number(orderUnitPriceSweet) || (clientForOrder.customPriceSweet ?? (prices?.priceSweet ?? DEFAULT_PRICES.priceSweet)))
                  )}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Observações / Detalhes de Produção (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Entregar quentinho às 06:00, pães um pouco mais morenos..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isCreatingOrder}
                  onClick={() => setClientForOrder(null)}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrder}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{isCreatingOrder ? 'Lançando...' : 'Confirmar e Lançar Pedido'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENVIAR NOTIFICAÇÃO NO APLICATIVO / BARRA DO CELULAR */}
      {clientForNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-800 text-amber-300 flex items-center justify-center shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Notificar no Aplicativo / Celular
                  </h3>
                  <p className="text-xs text-stone-500">
                    Destinatário: <strong className="text-stone-900">{clientForNotification.displayName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClientForNotification(null);
                  setNotifSuccessMsg(null);
                }}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success message banner */}
            {notifSuccessMsg && (
              <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-start gap-2 shadow-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{notifSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSendInAppNotification} className="space-y-4 mt-5 text-xs">
              {/* Preference selector to keep saved */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-700 uppercase flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-red-800" />
                    Preferência Salva do Cliente:
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium italic">
                    (Salvo no banco de dados)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['in_app', 'whatsapp', 'both', 'none'] as NotificationPreference[]).map((prefKey) => {
                    const currentPref = clientForNotification.notificationPreference || 'both';
                    const isSelected = currentPref === prefKey;
                    const labels: Record<NotificationPreference, string> = {
                      in_app: '📱 Só no App',
                      whatsapp: '💬 Só no Zap',
                      both: '⚡ Ambos',
                      none: '🔕 Silêncio',
                    };

                    return (
                      <button
                        key={prefKey}
                        type="button"
                        onClick={() => handleSaveClientNotificationPref(clientForNotification.uid, prefKey)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-black border transition text-center ${
                          isSelected
                            ? 'bg-red-800 text-white border-red-800 shadow-xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {labels[prefKey]}
                      </button>
                    );
                  })}
                </div>

                {/* Status explanation */}
                <p className="text-[10px] text-stone-500 mt-1">
                  {(clientForNotification.notificationPreference === 'in_app' ||
                    clientForNotification.notificationPreference === 'both' ||
                    !clientForNotification.notificationPreference) ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Notificação no aplicativo ativada! O aviso aparecerá na barra de notificações do celular.
                    </span>
                  ) : clientForNotification.notificationPreference === 'whatsapp' ? (
                    <span className="text-amber-700 font-medium">
                      ⚠️ O cliente está marcado para receber apenas pelo WhatsApp. Você pode enviar o aviso no app mesmo assim ou selecionar "Ambos" acima.
                    </span>
                  ) : (
                    <span className="text-stone-500 italic">
                      🔕 Notificações estão desativadas para este cliente.
                    </span>
                  )}
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1.5">
                  Modelos Rápidos da Padaria (Clique para Preencher):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifTitle('🥖 Pães quentinhos prontos para retirada!');
                      setNotifMessage(
                        `Olá ${clientForNotification.displayName}! Sua fornada de pães acabou de sair e está quentinha te esperando na Panificadora Morumbi.`
                      );
                    }}
                    className="p-2.5 text-left bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl transition text-[11px] font-bold text-amber-950 flex items-center gap-2"
                  >
                    <span className="text-base">🥖</span>
                    <div>
                      <p className="leading-tight">Pães Quentinhos</p>
                      <span className="text-[10px] font-normal text-amber-800">Prontos p/ retirada</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotifTitle('⏰ Lembrete: Envie suas sobras de hoje');
                      setNotifMessage(
                        `Olá ${clientForNotification.displayName}! Não se esqueça de registrar as sobras de hoje no aplicativo para que possamos fechar sua conta com o valor exato.`
                      );
                    }}
                    className="p-2.5 text-left bg-red-50 hover:bg-red-100/80 border border-red-200 rounded-xl transition text-[11px] font-bold text-red-950 flex items-center gap-2"
                  >
                    <span className="text-base">⏰</span>
                    <div>
                      <p className="leading-tight">Lembrete de Sobras</p>
                      <span className="text-[10px] font-normal text-red-800">Fechamento do dia</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotifTitle('💰 Acerto de contas disponível no aplicativo');
                      setNotifMessage(
                        `Olá ${clientForNotification.displayName}! Seu extrato financeiro foi atualizado na Panificadora Morumbi. Acesse a aba Financeiro para conferir.`
                      );
                    }}
                    className="p-2.5 text-left bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition text-[11px] font-bold text-emerald-950 flex items-center gap-2"
                  >
                    <span className="text-base">💰</span>
                    <div>
                      <p className="leading-tight">Acerto Financeiro</p>
                      <span className="text-[10px] font-normal text-emerald-800">Extrato disponível</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotifTitle('🍞 Aviso da Panificadora Morumbi');
                      setNotifMessage(
                        `Informamos que nossa produção de pães para amanhã já começou. Garanta que seus pedidos estejam confirmados no aplicativo!`
                      );
                    }}
                    className="p-2.5 text-left bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition text-[11px] font-bold text-stone-900 flex items-center gap-2"
                  >
                    <span className="text-base">📢</span>
                    <div>
                      <p className="leading-tight">Aviso de Fornada</p>
                      <span className="text-[10px] font-normal text-stone-600">Produção de amanhã</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Título da Notificação *
                </label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Ex: Pães quentinhos prontos!"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Mensagem (Aparece na barra de notificações do celular) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Digite a mensagem que o cliente lerá na notificação..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white resize-none font-medium"
                />
              </div>

              {/* System Notification Bar Preview */}
              <div className="p-3 bg-stone-900 text-white rounded-2xl border border-stone-800 space-y-1 shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Croissant className="w-3.5 h-3.5 text-amber-400" />
                    Panificadora Morumbi • agora
                  </span>
                  <span className="text-stone-400 text-[9px]">Barra de Notificação</span>
                </div>
                <p className="font-bold text-xs text-white truncate">
                  {notifTitle || 'Título da notificação'}
                </p>
                <p className="text-[11px] text-stone-300 line-clamp-2 leading-tight">
                  {notifMessage || 'O texto da mensagem aparecerá aqui no celular do cliente.'}
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isSendingNotif}
                  onClick={() => {
                    setClientForNotification(null);
                    setNotifSuccessMsg(null);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSendingNotif}
                  className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isSendingNotif ? 'Enviando...' : 'Enviar Notificação no Celular'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DADOS DO REVENDEDOR (ADMIN) */}
      {showEditModal && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Editar Dados do Cliente</h3>
                  <p className="text-xs text-stone-500">{editingClient.displayName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingClient(null);
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editModalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{editModalError}</span>
              </div>
            )}

            {editModalSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{editModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditedClient} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Nome de Usuário (Login) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) =>
                      setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Telefone / WhatsApp *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Senha Simples de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={editPasswordHint}
                    onChange={(e) => setEditPasswordHint(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  E-mail (Opcional)
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                />
              </div>

              {/* Custom Fixed Prices for this Client */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-700" />
                    Preço Fixo Exclusivo deste Cliente
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                    ⭐ Preço Especial
                  </span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Fixe o preço especial deste cliente (ex: 0,85 para o Seu Gil, 0,70 para outros). Deixe em branco para usar o padrão da padaria ({formatCurrency(prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)}).
                </p>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Pão Salgado (R$/un)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={String(prices?.priceSalty ?? DEFAULT_PRICES.priceSalty)}
                      value={editCustomPriceSalty}
                      onChange={(e) => setEditCustomPriceSalty(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900 focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Pão Doce (R$/un)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={String(prices?.priceSweet ?? DEFAULT_PRICES.priceSweet)}
                      value={editCustomPriceSweet}
                      onChange={(e) => setEditCustomPriceSweet(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900 focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Tipo de Conta / Função
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('revendedor')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      editRole === 'revendedor'
                        ? 'bg-red-800 text-white border-red-800 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    🥖 Revendedor (Cliente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      editRole === 'admin'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    👑 Administrador
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Tipo de Atendimento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditClientType('revendedor')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      editClientType === 'revendedor'
                        ? 'bg-red-800 text-white border-red-800 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    🥖 Revendedor (Atacado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditClientType('consumidor_final')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      editClientType === 'consumidor_final'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    🛒 Consumidor Final (Varejo)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Preferência de Notificação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['both', 'in_app', 'whatsapp', 'none'] as NotificationPreference[]).map((pref) => {
                    const isSel = editNotificationPref === pref;
                    const labels: Record<NotificationPreference, string> = {
                      both: '⚡ Ambos (App + Zap)',
                      in_app: '📱 Apenas no App',
                      whatsapp: '💬 Apenas no Zap',
                      none: '🔕 Silencioso',
                    };
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => setEditNotificationPref(pref)}
                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-center transition ${
                          isSel
                            ? 'bg-stone-900 text-amber-300 border-stone-900 shadow-2xs'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {labels[pref]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIMPAR HISTÓRICO DE TESTE E SALDOS RESIDUAIS */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Limpeza do Histórico de Testes</h3>
                  <p className="text-xs text-stone-500">Zerar saldos residuais e pedidos de teste</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCleanupModal(false);
                  setCleanupMessage(null);
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cleanupMessage && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{cleanupMessage}</span>
              </div>
            )}

            <div className="mt-5 space-y-4 text-xs">
              <p className="text-stone-600">
                Como você excluiu clientes fictícios de teste, selecione a opção desejada para que os saldos e valores fiquem 100% corretos:
              </p>

              {/* Option 1: Full Clean - Keep ONLY Admin */}
              <div className="p-4 rounded-2xl border-2 border-red-500 bg-red-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-red-950 text-xs uppercase flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-red-700" />
                    <span>1. Apagar Todos os Revendedores & Deixar Só Administrador</span>
                  </h4>
                  <span className="text-[10px] font-black text-white bg-red-800 px-2.5 py-0.5 rounded-full">
                    Solicitado / Recomendado
                  </span>
                </div>
                <p className="text-stone-700 leading-relaxed text-[11px]">
                  Apaga todos os revendedores, contas provisórias e todo o histórico de testes (pedidos e pagamentos). Mantém <strong>apenas a sua conta de Administrador (dyko)</strong> e as configurações de preços da padaria intactas para começar do zero com os novos cadastros a partir de hoje!
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isCleaningUp}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Atenção: Deseja apagar todos os revendedores cadastrados e pedidos de teste, mantendo apenas o Administrador? Todos os novos cadastros começarão do zero.'
                        )
                      ) {
                        handleRunCleanup('admin_only');
                      }
                    }}
                    className="w-full py-2.5 bg-red-800 hover:bg-red-900 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isCleaningUp ? 'Executando limpeza...' : 'Apagar Todos os Revendedores e Deixar Só Admin'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Clean only orphans */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-stone-900 text-xs uppercase flex items-center gap-1.5">
                    <span>2. Limpar Registros de Clientes Excluídos</span>
                  </h4>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Mais Seguro
                  </span>
                </div>
                <p className="text-stone-600 leading-relaxed text-[11px]">
                  Apaga somente os pedidos e pagamentos que ficaram órfãos (de clientes fictícios que já foram deletados). Os clientes que continuam cadastrados não serão afetados.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isCleaningUp}
                    onClick={() => handleRunCleanup('orphans')}
                    className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isCleaningUp ? 'Limpando...' : 'Remover Pedidos de Clientes Deletados'}</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Full reset of test history */}
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-rose-950 text-xs uppercase flex items-center gap-1.5">
                    <span>3. Zerar Apenas os Pedidos (Manter Clientes)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                    Zerar Saldos para R$ 0,00
                  </span>
                </div>
                <p className="text-stone-600 leading-relaxed text-[11px]">
                  Apaga todos os pedidos e pagamentos de teste já registrados no sistema. Os cadastros dos seus revendedores reais continuarão salvos, e o próximo pedido começará como <strong>Pedido #01</strong> com saldo zero.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isCleaningUp}
                    onClick={() => {
                      if (window.confirm('Atenção: Deseja realmente zerar todos os pedidos e pagamentos de teste? Os clientes cadastrados serão mantidos, mas todo o histórico financeiro voltará a zero para começar do Pedido #01.')) {
                        handleRunCleanup('all');
                      }
                    }}
                    className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isCleaningUp ? 'Zerando histórico...' : 'Zerar Todos os Pedidos e Saldos de Teste'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCleanupModal(false);
                    setCleanupMessage(null);
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

      {/* Modal: Administrador Lançar Sobras pelo Cliente */}
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
                  sSold * (orderForLeftovers.unitPriceSalty || prices?.priceSalty || DEFAULT_PRICES.priceSalty) +
                  wSold * (orderForLeftovers.unitPriceSweet || prices?.priceSweet || DEFAULT_PRICES.priceSweet);
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

