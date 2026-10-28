import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar, AdminView } from './components/Sidebar';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/admin/DashboardView';
import { ClientsView } from './components/admin/ClientsView';
import { OrdersView } from './components/admin/OrdersView';
import { AuditView } from './components/admin/AuditView';
import { SettlementView } from './components/admin/SettlementView';
import { NotificationsView } from './components/admin/NotificationsView';
import { SettingsView } from './components/admin/SettingsView';
import { RetailOrdersView } from './components/admin/RetailOrdersView';
import { ResellerHome } from './components/reseller/ResellerHome';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  subscribeOrders,
  subscribeUsers,
  subscribePayments,
  subscribeAuditLogs,
  subscribePrices,
  subscribeNotifications,
  DEFAULT_PRICES,
} from './services/dataService';
import {
  showSystemNotification,
  playNotificationTone,
} from './services/notificationService';
import { Order, UserProfile, PaymentRecord, AuditLog, ProductPrices, InAppNotification } from './types';
import { Croissant } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, userProfile, isAdmin, isLoading } = useAuth();

  // Navigation state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminView, setAdminView] = useState<string>('dashboard');
  const [resellerTab, setResellerTab] = useState<'orders' | 'leftovers' | 'financial' | 'profit' | 'notifications' | 'profile'>('orders');

  // Client selection for "Meus Clientes" submenu
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [openNewClientModal, setOpenNewClientModal] = useState<boolean>(false);

  // Correction order selected from Orders view to open in Audit view
  const [orderToCorrect, setOrderToCorrect] = useState<Order | null>(null);

  // Real-time collections data
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [prices, setPrices] = useState<ProductPrices>(DEFAULT_PRICES);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // Track known notifications so we only trigger system bar alerts on NEW arrivals
  const initialNotifsLoadedRef = React.useRef(false);
  const seenNotifIdsRef = React.useRef<Set<string>>(new Set());

  // Trigger system notification bar and sound when new notification arrives
  useEffect(() => {
    if (notifications.length === 0 && !initialNotifsLoadedRef.current) {
      return;
    }

    // First snapshot load: populate without ringing all past alerts
    if (!initialNotifsLoadedRef.current) {
      notifications.forEach((n) => seenNotifIdsRef.current.add(n.id));
      initialNotifsLoadedRef.current = true;
      return;
    }

    // Subsequent snapshots: find new unread notifications targeted at this user
    const newArrivals = notifications.filter(
      (n) => !seenNotifIdsRef.current.has(n.id) && !n.read
    );

    if (newArrivals.length > 0) {
      newArrivals.forEach((n) => {
        seenNotifIdsRef.current.add(n.id);

        const pref = userProfile?.notificationPreference || 'both';
        // Only trigger system notification bar if user didn't disable app notifications
        if (pref !== 'none' && pref !== 'whatsapp') {
          showSystemNotification(n.title, {
            body: n.message,
            icon: '/pwa-192x192.png',
            tag: `notif-${n.id}`,
          });
          playNotificationTone();
        }
      });
    }
  }, [notifications, userProfile]);

  // Subscriptions setup
  useEffect(() => {
    if (!currentUser) return;

    // Prices subscription
    const unsubPrices = subscribePrices((p) => setPrices(p));

    // Notifications subscription
    const unsubNotifs = subscribeNotifications(
      (n) => setNotifications(n),
      isAdmin ? undefined : currentUser.uid
    );

    // Orders subscription (all if admin, own if reseller)
    const unsubOrders = subscribeOrders(
      (o) => setOrders(o),
      isAdmin ? undefined : currentUser.uid
    );

    // Payments subscription
    const unsubPayments = subscribePayments(
      (pay) => setPayments(pay),
      isAdmin ? undefined : currentUser.uid
    );

    let unsubUsers: (() => void) | undefined;
    let unsubAudit: (() => void) | undefined;

    if (isAdmin) {
      unsubUsers = subscribeUsers((u) => setClients(u));
      unsubAudit = subscribeAuditLogs((a) => setAuditLogs(a));
    }

    return () => {
      unsubPrices();
      unsubNotifs();
      unsubOrders();
      unsubPayments();
      if (unsubUsers) unsubUsers();
      if (unsubAudit) unsubAudit();
    };
  }, [currentUser, isAdmin]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500 text-stone-950 flex items-center justify-center mb-4 animate-bounce shadow-2xl">
          <Croissant className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-black text-white tracking-wide">PANIFICADORA MORUMBI</h2>
        <p className="text-amber-400 text-xs mt-1">Carregando sistema em tempo real...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        unreadCount={unreadNotifsCount}
        onOpenNotifications={() => {
          if (isAdmin) setAdminView('notifications');
          else setResellerTab('notifications');
        }}
        onOpenProfile={() => {
          if (isAdmin) setAdminView('profile');
          else setResellerTab('profile');
        }}
        onGoHome={() => {
          if (isAdmin) {
            setAdminView('dashboard');
            setSelectedClientId(null);
          } else {
            setResellerTab('orders');
          }
          if (sidebarOpen) {
            setSidebarOpen(false);
          }
        }}
      />

      <div className="flex-1 flex">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          activeView={isAdmin ? adminView : resellerTab}
          setActiveView={(view) => {
            if (isAdmin) {
              setAdminView(view);
            } else {
              setResellerTab(view as any);
            }
          }}
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClient={(clientId) => {
            setSelectedClientId(clientId);
            setAdminView('clients');
          }}
          onOpenNewClientModal={() => {
            setSelectedClientId(null);
            setAdminView('clients');
            setOpenNewClientModal(true);
          }}
        />

        {/* Main Content View Container */}
        <main className="flex-1 lg:pl-72 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all">
          {isAdmin ? (
            /* ADMIN VIEWS */
            <>
              {adminView === 'dashboard' && (
                <DashboardView
                  orders={orders}
                  clients={clients}
                  payments={payments}
                  onNavigate={(view, clientId) => {
                    if (clientId) setSelectedClientId(clientId);
                    setAdminView(view);
                  }}
                />
              )}

              {adminView === 'clients' && (
                <ClientsView
                  clients={clients}
                  orders={orders}
                  payments={payments}
                  prices={prices}
                  selectedClientId={selectedClientId}
                  onSelectClient={(id) => setSelectedClientId(id)}
                  openNewModalInitially={openNewClientModal}
                  onCloseNewModal={() => setOpenNewClientModal(false)}
                />
              )}

              {adminView === 'orders' && (
                <OrdersView
                  orders={orders}
                  clients={clients}
                  prices={prices}
                  onOpenAuditCorrection={(order) => {
                    setOrderToCorrect(order);
                    setAdminView('audit');
                  }}
                />
              )}

              {adminView === 'retail' && (
                <RetailOrdersView orders={orders} prices={prices} />
              )}

              {adminView === 'audit' && (
                <AuditView
                  orders={orders}
                  clients={clients}
                  auditLogs={auditLogs}
                  initialOrderToCorrect={orderToCorrect}
                  onClearInitialOrder={() => setOrderToCorrect(null)}
                />
              )}

              {adminView === 'settlement' && (
                <SettlementView
                  orders={orders}
                  clients={clients}
                  payments={payments}
                  selectedClientId={selectedClientId}
                />
              )}

              {adminView === 'notifications' && (
                <NotificationsView notifications={notifications} clients={clients} />
              )}

              {adminView === 'profile' && (
                <SettingsView currentPrices={prices} initialTab="dados" />
              )}

              {adminView === 'settings' && (
                <SettingsView currentPrices={prices} initialTab="precos" />
              )}
            </>
          ) : (
            /* RESELLER VIEWS */
            <ResellerHome
              orders={orders}
              payments={payments}
              prices={prices}
              notifications={notifications}
              activeTab={resellerTab}
              setActiveTab={setResellerTab}
            />
          )}
        </main>
      </div>

      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
