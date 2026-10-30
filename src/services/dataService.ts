import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Order,
  UserProfile,
  PaymentRecord,
  AuditLog,
  ProductPrices,
  InAppNotification,
  TrashItem,
} from '../types';
import { calculateOrderMetrics, sanitizeUsername } from '../utils/formatters';

// Default initial prices if settings doc is empty
export const DEFAULT_PRICES: ProductPrices = {
  priceSalty: 0.85,
  priceSweet: 1.25,
  retailPriceSalty: 1.00,
  retailPriceSweet: 1.50,
};

/**
 * Real-time Orders subscription
 */
export function subscribeOrders(
  onUpdate: (orders: Order[]) => void,
  resellerId?: string
): () => void {
  const collRef = collection(db, 'orders');
  let q = query(collRef, orderBy('createdAt', 'desc'));

  if (resellerId) {
    q = query(collRef, where('resellerId', '==', resellerId), orderBy('createdAt', 'desc'));
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          orderNumber: data.orderNumber || `#${docSnap.id.slice(0, 6).toUpperCase()}`,
          resellerId: data.resellerId,
          resellerName: data.resellerName || 'Revendedor',
          orderDate: data.orderDate || '',
          deliveryDate: data.deliveryDate || '',
          qtySaltyPickup: Number(data.qtySaltyPickup) || 0,
          qtySweetPickup: Number(data.qtySweetPickup) || 0,
          qtySaltyLeftover: Number(data.qtySaltyLeftover) || 0,
          qtySweetLeftover: Number(data.qtySweetLeftover) || 0,
          leftoversRecorded: Boolean(data.leftoversRecorded),
          leftoversRecordedAt: data.leftoversRecordedAt,
          leftoversRecordedBy: data.leftoversRecordedBy,
          qtySaltySold: Number(data.qtySaltySold) || 0,
          qtySweetSold: Number(data.qtySweetSold) || 0,
          unitPriceSalty: Number(data.unitPriceSalty) || DEFAULT_PRICES.priceSalty,
          unitPriceSweet: Number(data.unitPriceSweet) || DEFAULT_PRICES.priceSweet,
          expectedTotal: Number(data.expectedTotal) || 0,
          finalTotal: Number(data.finalTotal) || 0,
          status: data.status || 'aguardando_sobras',
          paymentStatus: data.paymentStatus || 'pendente',
          amountPaid: Number(data.amountPaid) || 0,
          balanceDue: Number(data.balanceDue) || 0,
          notes: data.notes || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          lastModifiedBy: data.lastModifiedBy,
          lastModifiedReason: data.lastModifiedReason,
        };
      });
      onUpdate(orders);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );

  return unsubscribe;
}

/**
 * Real-time Resellers (Users) subscription
 */
export function subscribeUsers(onUpdate: (users: UserProfile[]) => void): () => void {
  const collRef = collection(db, 'users');
  const q = query(collRef, orderBy('displayName', 'asc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const users: UserProfile[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          uid: docSnap.id,
          email: d.email || '',
          username: d.username || (d.email ? d.email.split('@')[0] : ''),
          simplePasswordHint: d.simplePasswordHint || '',
          displayName: d.displayName || 'Sem nome',
          phone: d.phone || '',
          role: d.role || 'revendedor',
          clientType: d.clientType || 'revendedor',
          active: d.active !== undefined ? d.active : true,
          customPriceSalty:
            d.customPriceSalty !== undefined && Number(d.customPriceSalty) > 0
              ? Number(d.customPriceSalty)
              : undefined,
          customPriceSweet:
            d.customPriceSweet !== undefined && Number(d.customPriceSweet) > 0
              ? Number(d.customPriceSweet)
              : undefined,
          createdAt: d.createdAt || '',
          updatedAt: d.updatedAt,
          notificationPreference: d.notificationPreference || 'in_app',
        };
      });
      onUpdate(users);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );

  return unsubscribe;
}

/**
 * Real-time Payments subscription
 */
export function subscribePayments(
  onUpdate: (payments: PaymentRecord[]) => void,
  resellerId?: string
): () => void {
  const collRef = collection(db, 'payments');
  let q = query(collRef, orderBy('createdAt', 'desc'));

  if (resellerId) {
    q = query(collRef, where('resellerId', '==', resellerId), orderBy('createdAt', 'desc'));
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const payments: PaymentRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          resellerId: d.resellerId,
          resellerName: d.resellerName || '',
          orderIds: Array.isArray(d.orderIds) ? d.orderIds : [],
          amount: Number(d.amount) || 0,
          paymentMethod: d.paymentMethod || 'pix',
          paymentDate: d.paymentDate || '',
          notes: d.notes || '',
          registeredBy: d.registeredBy || '',
          registeredByName: d.registeredByName || '',
          createdAt: d.createdAt || '',
        };
      });
      onUpdate(payments);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payments');
    }
  );

  return unsubscribe;
}

/**
 * Real-time Audit Logs subscription
 */
export function subscribeAuditLogs(onUpdate: (logs: AuditLog[]) => void): () => void {
  const collRef = collection(db, 'audit_logs');
  const q = query(collRef, orderBy('timestamp', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const logs: AuditLog[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          orderId: d.orderId,
          orderNumber: d.orderNumber || '',
          resellerName: d.resellerName || '',
          adminId: d.adminId,
          adminEmail: d.adminEmail || '',
          actionType: d.actionType || 'alteracao_quantidade',
          previousData: d.previousData || {},
          newData: d.newData || {},
          reason: d.reason || '',
          timestamp: d.timestamp || '',
        };
      });
      onUpdate(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
    }
  );

  return unsubscribe;
}

/**
 * Real-time Product Prices subscription
 */
export function subscribePrices(onUpdate: (prices: ProductPrices) => void): () => void {
  const docRef = doc(db, 'settings', 'prices');

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        onUpdate({
          priceSalty: Number(d.priceSalty) || DEFAULT_PRICES.priceSalty,
          priceSweet: Number(d.priceSweet) || DEFAULT_PRICES.priceSweet,
          retailPriceSalty: Number(d.retailPriceSalty) || DEFAULT_PRICES.retailPriceSalty,
          retailPriceSweet: Number(d.retailPriceSweet) || DEFAULT_PRICES.retailPriceSweet,
          updatedAt: d.updatedAt,
          updatedBy: d.updatedBy,
        });
      } else {
        onUpdate(DEFAULT_PRICES);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/prices');
    }
  );

  return unsubscribe;
}

/**
 * Real-time Notifications subscription
 */
export function subscribeNotifications(
  onUpdate: (notifications: InAppNotification[]) => void,
  userId?: string
): () => void {
  const collRef = collection(db, 'notifications');
  const q = query(collRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const notifs: InAppNotification[] = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            targetUserId: d.targetUserId || 'all',
            title: d.title || '',
            message: d.message || '',
            type: d.type || 'sistema',
            read: Boolean(d.read),
            createdAt: d.createdAt || '',
            link: d.link,
            orderId: d.orderId,
            orderNumber: d.orderNumber,
            resellerId: d.resellerId,
          };
        })
        .filter((n) => !userId || n.targetUserId === 'all' || n.targetUserId === userId);

      onUpdate(notifs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  );

  return unsubscribe;
}

/**
 * Real-time Trash / Lixeira subscription
 */
export function subscribeTrash(onUpdate: (items: TrashItem[]) => void): () => void {
  const collRef = collection(db, 'trash_history');
  const q = query(collRef, orderBy('deletedAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: TrashItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          itemType: d.itemType || 'historico_cliente',
          title: d.title || 'Histórico Apagado',
          clientName: d.clientName || 'Cliente',
          clientId: d.clientId || '',
          deletedAt: d.deletedAt || new Date().toISOString(),
          deletedBy: d.deletedBy || 'Administrador',
          totalValue: Number(d.totalValue) || 0,
          ordersCount: Number(d.ordersCount) || 0,
          paymentsCount: Number(d.paymentsCount) || 0,
          orders: Array.isArray(d.orders) ? d.orders : [],
          payments: Array.isArray(d.payments) ? d.payments : [],
          notes: d.notes || '',
        };
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trash_history');
    }
  );

  return unsubscribe;
}

/**
 * Dispatch an in-app notification
 */
export async function sendNotification(data: {
  targetUserId: string;
  title: string;
  message: string;
  type: InAppNotification['type'];
  link?: string;
  orderId?: string;
  orderNumber?: string;
  resellerId?: string;
}) {
  try {
    const collRef = collection(db, 'notifications');
    await addDoc(collRef, {
      ...data,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Falha ao enviar notificação:', err);
  }
}

/**
 * Create a new Order
 * Enforces unique ID, stores unit price snapshot, calculates predicted total
 */
export async function createOrder(params: {
  resellerId: string;
  resellerName: string;
  orderDate: string;
  deliveryDate: string;
  qtySaltyPickup: number;
  qtySweetPickup: number;
  unitPriceSalty?: number;
  unitPriceSweet?: number;
  notes?: string;
  currentPrices: ProductPrices;
}): Promise<string> {
  const {
    resellerId,
    resellerName,
    orderDate,
    deliveryDate,
    qtySaltyPickup,
    qtySweetPickup,
    unitPriceSalty: customSaltyPrice,
    unitPriceSweet: customSweetPrice,
    notes,
    currentPrices,
  } = params;

  const unitPriceSalty =
    customSaltyPrice !== undefined && Number(customSaltyPrice) > 0
      ? Number(customSaltyPrice)
      : currentPrices.priceSalty;
  const unitPriceSweet =
    customSweetPrice !== undefined && Number(customSweetPrice) > 0
      ? Number(customSweetPrice)
      : currentPrices.priceSweet;

  const metrics = calculateOrderMetrics({
    qtySaltyPickup,
    qtySweetPickup,
    qtySaltyLeftover: 0,
    qtySweetLeftover: 0,
    leftoversRecorded: false,
    unitPriceSalty,
    unitPriceSweet,
  });

  // Sequential order numbering per client: Pedido #01, #02, #03...
  let orderNumber = 'Pedido #01';
  try {
    const qResellerOrders = query(collection(db, 'orders'), where('resellerId', '==', resellerId));
    const snap = await getDocs(qResellerOrders);
    const nextNumber = snap.size + 1;
    orderNumber = `Pedido #${String(nextNumber).padStart(2, '0')}`;
  } catch (err) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    orderNumber = `Pedido #${randomSuffix}`;
  }

  const orderData = {
    orderNumber,
    resellerId,
    resellerName,
    orderDate,
    deliveryDate,
    qtySaltyPickup: metrics.qtySaltyPickup,
    qtySweetPickup: metrics.qtySweetPickup,
    qtySaltyLeftover: 0,
    qtySweetLeftover: 0,
    leftoversRecorded: false,
    qtySaltySold: metrics.qtySaltySold,
    qtySweetSold: metrics.qtySweetSold,
    unitPriceSalty,
    unitPriceSweet,
    expectedTotal: metrics.expectedTotal,
    finalTotal: metrics.expectedTotal,
    status: 'aguardando_sobras',
    paymentStatus: 'pendente',
    amountPaid: 0,
    balanceDue: metrics.expectedTotal,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, 'orders'), orderData);

    // Send in-app notification to admins
    await sendNotification({
      targetUserId: 'all',
      title: `Novo Pedido ${orderNumber}`,
      message: `${resellerName} enviou pedido: ${qtySaltyPickup} pães salgados e ${qtySweetPickup} pães doces para entrega em ${deliveryDate}.`,
      type: 'pedido',
      link: '/pedidos',
      orderId: docRef.id,
      orderNumber,
      resellerId,
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'orders');
  }
}

/**
 * Record Leftovers for an Order
 * Calculates sold quantities and final amount
 */
export async function recordLeftovers(params: {
  order: Order;
  qtySaltyLeftover: number;
  qtySweetLeftover: number;
  recordedByUid: string;
  recordedByName: string;
}) {
  const { order, qtySaltyLeftover, qtySweetLeftover, recordedByUid, recordedByName } = params;

  if (qtySaltyLeftover < 0 || qtySweetLeftover < 0) {
    throw new Error('A quantidade de sobras não pode ser negativa.');
  }
  if (qtySaltyLeftover > order.qtySaltyPickup) {
    throw new Error('As sobras de pão salgado não podem exceder a quantidade retirada.');
  }
  if (qtySweetLeftover > order.qtySweetPickup) {
    throw new Error('As sobras de pão doce não podem exceder a quantidade retirada.');
  }

  const metrics = calculateOrderMetrics({
    qtySaltyPickup: order.qtySaltyPickup,
    qtySweetPickup: order.qtySweetPickup,
    qtySaltyLeftover,
    qtySweetLeftover,
    leftoversRecorded: true,
    unitPriceSalty: order.unitPriceSalty,
    unitPriceSweet: order.unitPriceSweet,
    amountPaid: order.amountPaid,
  });

  const paymentStatus =
    order.amountPaid >= metrics.finalTotal
      ? 'pago'
      : order.amountPaid > 0
      ? 'parcial'
      : 'pendente';

  const updateData = {
    qtySaltyLeftover: metrics.qtySaltyLeftover,
    qtySweetLeftover: metrics.qtySweetLeftover,
    qtySaltySold: metrics.qtySaltySold,
    qtySweetSold: metrics.qtySweetSold,
    leftoversRecorded: true,
    leftoversRecordedAt: new Date().toISOString(),
    leftoversRecordedBy: recordedByName,
    finalTotal: metrics.finalTotal,
    balanceDue: metrics.balanceDue,
    status: 'concluido',
    paymentStatus,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'orders', order.id);
    await updateDoc(docRef, updateData);

    await sendNotification({
      targetUserId: 'all',
      title: `Sobras Registradas - Pedido ${order.orderNumber}`,
      message: `${recordedByName} registrou sobras: ${qtySaltyLeftover} salgados, ${qtySweetLeftover} doces. Valor final: R$ ${metrics.finalTotal.toFixed(2)}.`,
      type: 'sobras',
      orderId: order.id,
      orderNumber: order.orderNumber,
      resellerId: order.resellerId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
  }
}

/**
 * Admin Quantity Correction ("Alterar Quantidade")
 * Modifies order values, logs into audit_logs with admin info and justification
 */
export async function adminUpdateQuantity(params: {
  order: Order;
  newQtySaltyPickup: number;
  newQtySweetPickup: number;
  newQtySaltyLeftover: number;
  newQtySweetLeftover: number;
  reason: string;
  adminId: string;
  adminEmail: string;
}) {
  const {
    order,
    newQtySaltyPickup,
    newQtySweetPickup,
    newQtySaltyLeftover,
    newQtySweetLeftover,
    reason,
    adminId,
    adminEmail,
  } = params;

  if (!reason.trim()) {
    throw new Error('A justificativa é obrigatória para realizar correções de auditoria.');
  }

  if (newQtySaltyPickup < 0 || newQtySweetPickup < 0) {
    throw new Error('As quantidades retiradas não podem ser negativas.');
  }
  if (newQtySaltyLeftover < 0 || newQtySweetLeftover < 0) {
    throw new Error('As quantidades de sobra não podem ser negativas.');
  }
  if (newQtySaltyLeftover > newQtySaltyPickup) {
    throw new Error('A sobra de pão salgado não pode ser maior que a retirada.');
  }
  if (newQtySweetLeftover > newQtySweetPickup) {
    throw new Error('A sobra de pão doce não pode ser maior que a retirada.');
  }

  const previousData = {
    qtySaltyPickup: order.qtySaltyPickup,
    qtySweetPickup: order.qtySweetPickup,
    qtySaltyLeftover: order.qtySaltyLeftover,
    qtySweetLeftover: order.qtySweetLeftover,
    qtySaltySold: order.qtySaltySold,
    qtySweetSold: order.qtySweetSold,
    expectedTotal: order.expectedTotal,
    finalTotal: order.finalTotal,
  };

  const metrics = calculateOrderMetrics({
    qtySaltyPickup: newQtySaltyPickup,
    qtySweetPickup: newQtySweetPickup,
    qtySaltyLeftover: newQtySaltyLeftover,
    qtySweetLeftover: newQtySweetLeftover,
    leftoversRecorded: order.leftoversRecorded || (newQtySaltyLeftover > 0 || newQtySweetLeftover > 0),
    unitPriceSalty: order.unitPriceSalty,
    unitPriceSweet: order.unitPriceSweet,
    amountPaid: order.amountPaid,
  });

  const newData = {
    qtySaltyPickup: metrics.qtySaltyPickup,
    qtySweetPickup: metrics.qtySweetPickup,
    qtySaltyLeftover: metrics.qtySaltyLeftover,
    qtySweetLeftover: metrics.qtySweetLeftover,
    qtySaltySold: metrics.qtySaltySold,
    qtySweetSold: metrics.qtySweetSold,
    expectedTotal: metrics.expectedTotal,
    finalTotal: metrics.finalTotal,
  };

  const paymentStatus =
    order.amountPaid >= metrics.finalTotal
      ? 'pago'
      : order.amountPaid > 0
      ? 'parcial'
      : 'pendente';

  const orderUpdateData = {
    qtySaltyPickup: metrics.qtySaltyPickup,
    qtySweetPickup: metrics.qtySweetPickup,
    qtySaltyLeftover: metrics.qtySaltyLeftover,
    qtySweetLeftover: metrics.qtySweetLeftover,
    qtySaltySold: metrics.qtySaltySold,
    qtySweetSold: metrics.qtySweetSold,
    expectedTotal: metrics.expectedTotal,
    finalTotal: metrics.finalTotal,
    balanceDue: metrics.balanceDue,
    paymentStatus,
    updatedAt: new Date().toISOString(),
    lastModifiedBy: adminEmail,
    lastModifiedReason: reason.trim(),
  };

  try {
    // 1. Update order
    await updateDoc(doc(db, 'orders', order.id), orderUpdateData);

    // 2. Insert into audit_logs
    await addDoc(collection(db, 'audit_logs'), {
      orderId: order.id,
      orderNumber: order.orderNumber,
      resellerName: order.resellerName,
      adminId,
      adminEmail,
      actionType: 'alteracao_quantidade',
      previousData,
      newData,
      reason: reason.trim(),
      timestamp: new Date().toISOString(),
    });

    // 3. Notify reseller
    await sendNotification({
      targetUserId: order.resellerId,
      title: `Correção no Pedido ${order.orderNumber}`,
      message: `A administração corrigiu as quantidades do seu pedido. Motivo: "${reason}". Novo total: R$ ${metrics.finalTotal.toFixed(2)}.`,
      type: 'alteracao',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
  }
}

/**
 * Register Payment / Settlement
 */
export async function registerPayment(params: {
  resellerId: string;
  resellerName: string;
  orderIds: string[];
  amount: number;
  paymentMethod: PaymentRecord['paymentMethod'];
  paymentDate: string;
  notes?: string;
  adminId: string;
  adminName: string;
  ordersToUpdate?: Order[];
}) {
  const {
    resellerId,
    resellerName,
    orderIds,
    amount,
    paymentMethod,
    paymentDate,
    notes,
    adminId,
    adminName,
    ordersToUpdate = [],
  } = params;

  if (amount <= 0) {
    throw new Error('O valor do pagamento deve ser maior que zero.');
  }

  try {
    // Save payment document
    const paymentDocRef = await addDoc(collection(db, 'payments'), {
      resellerId,
      resellerName,
      orderIds,
      amount,
      paymentMethod,
      paymentDate,
      notes: notes || '',
      registeredBy: adminId,
      registeredByName: adminName,
      createdAt: new Date().toISOString(),
    });

    // Distribute payment across targeted orders if provided
    let remainingPayment = amount;
    for (const order of ordersToUpdate) {
      if (remainingPayment <= 0) break;
      const orderDue = Math.max(0, order.finalTotal - order.amountPaid);
      const applyAmount = Math.min(orderDue, remainingPayment);
      const newPaid = Number((order.amountPaid + applyAmount).toFixed(2));
      const newBalance = Number(Math.max(0, order.finalTotal - newPaid).toFixed(2));
      const newPaymentStatus = newBalance <= 0 ? 'pago' : 'parcial';

      await updateDoc(doc(db, 'orders', order.id), {
        amountPaid: newPaid,
        balanceDue: newBalance,
        paymentStatus: newPaymentStatus,
        updatedAt: new Date().toISOString(),
      });

      remainingPayment -= applyAmount;
    }

    // Send notification to reseller
    await sendNotification({
      targetUserId: resellerId,
      title: 'Pagamento Registrado',
      message: `Recebemos seu pagamento de R$ ${amount.toFixed(2)} (${paymentMethod.toUpperCase()}) em ${paymentDate}. Saldo atualizado com sucesso.`,
      type: 'pagamento',
      resellerId,
      orderId: ordersToUpdate[0]?.id,
      orderNumber: ordersToUpdate[0]?.orderNumber,
    });

    return paymentDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'payments');
  }
}

/**
 * Update Product Prices (Revenda & Varejo R$ 1,00)
 */
export async function updateProductPrices(params: {
  priceSalty: number;
  priceSweet: number;
  retailPriceSalty: number;
  retailPriceSweet: number;
  adminEmail: string;
}) {
  const { priceSalty, priceSweet, retailPriceSalty, retailPriceSweet, adminEmail } = params;

  if (priceSalty <= 0 || priceSweet <= 0 || retailPriceSalty <= 0 || retailPriceSweet <= 0) {
    throw new Error('Todos os preços unitários devem ser maiores que zero.');
  }

  try {
    const docRef = doc(db, 'settings', 'prices');
    await setDoc(
      docRef,
      {
        priceSalty: Number(priceSalty),
        priceSweet: Number(priceSweet),
        retailPriceSalty: Number(retailPriceSalty),
        retailPriceSweet: Number(retailPriceSweet),
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/prices');
  }
}

/**
 * Create a Retail Customer Order (Encomenda Varejo R$ 1,00 - Sem Sobras)
 */
export async function createRetailOrder(params: {
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  qtySalty: number;
  qtySweet: number;
  notes?: string;
  currentPrices: ProductPrices;
  registeredBy: string;
}): Promise<string> {
  const {
    customerName,
    customerPhone,
    orderDate,
    deliveryDate,
    qtySalty,
    qtySweet,
    notes,
    currentPrices,
    registeredBy,
  } = params;

  const unitPriceSalty = currentPrices.retailPriceSalty || 1.0;
  const unitPriceSweet = currentPrices.retailPriceSweet || 1.5;

  const total = Number((qtySalty * unitPriceSalty + qtySweet * unitPriceSweet).toFixed(2));

  // Sequential order numbering for retail: Encomenda #01, #02...
  let orderNumber = 'Encomenda #01';
  try {
    const qVarejo = query(collection(db, 'orders'), where('orderType', '==', 'varejo'));
    const snap = await getDocs(qVarejo);
    const nextNum = snap.size + 1;
    orderNumber = `Encomenda #${String(nextNum).padStart(2, '0')}`;
  } catch (err) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    orderNumber = `ENC-${new Date().getFullYear().toString().slice(-2)}${randomSuffix}`;
  }

  const orderData = {
    orderNumber,
    orderType: 'varejo',
    resellerId: 'varejo',
    resellerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    orderDate,
    deliveryDate,
    qtySaltyPickup: qtySalty,
    qtySweetPickup: qtySweet,
    qtySaltyLeftover: 0,
    qtySweetLeftover: 0,
    leftoversRecorded: true, // Varejo is a direct final order, no leftovers!
    qtySaltySold: qtySalty,
    qtySweetSold: qtySweet,
    unitPriceSalty,
    unitPriceSweet,
    expectedTotal: total,
    finalTotal: total,
    status: 'pronto_retirada',
    paymentStatus: 'pendente',
    amountPaid: 0,
    balanceDue: total,
    notes: notes || '',
    createdAt: new Date().toISOString(),
    lastModifiedBy: registeredBy,
  };

  try {
    const docRef = await addDoc(collection(db, 'orders'), orderData);

    await sendNotification({
      targetUserId: 'all',
      title: `Nova Encomenda Varejo ${orderNumber}`,
      message: `${customerName} encomendou ${qtySalty} pães salgados e ${qtySweet} doces (Total: R$ ${total.toFixed(2)}) para ${deliveryDate}.`,
      type: 'pedido',
      link: '/varejo',
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'orders');
  }
}

/**
 * Admin Update Reseller Profile
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
) {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });

    // Sync /usernames directory mapping
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const full = snap.data();
        const rawUser = full.username || sanitizeUsername(full.displayName) || '';
        const cleanUser = sanitizeUsername(rawUser);
        if (cleanUser) {
          await setDoc(
            doc(db, 'usernames', cleanUser),
            {
              uid,
              email: full.email || `${cleanUser}@morumbi.app`,
              username: cleanUser,
              displayName: full.displayName || cleanUser,
              role: full.role || 'revendedor',
              simplePasswordHint: full.simplePasswordHint || '123456',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }
    } catch (uErr) {
      console.warn('Erro ao sincronizar /usernames:', uErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Admin Permanently Delete Reseller Profile
 * Cascade deletes the client and all associated orders, payments, notifications and username mappings
 * so no historical balances or amounts linger in the system.
 */
export async function deleteUserProfile(uid: string) {
  try {
    const docRef = doc(db, 'users', uid);

    // Look up username to clean up from /usernames
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const full = snap.data();
        const cleanUser = sanitizeUsername(full.username || full.displayName);
        if (cleanUser) {
          await deleteDoc(doc(db, 'usernames', cleanUser));
        }
      }
    } catch {}

    // 1. Delete user profile doc
    await deleteDoc(docRef);

    // 2. Cascade delete all orders for this reseller
    const ordersSnap = await getDocs(query(collection(db, 'orders'), where('resellerId', '==', uid)));
    for (const d of ordersSnap.docs) {
      await deleteDoc(doc(db, 'orders', d.id));
    }

    // 3. Cascade delete all payments for this reseller
    const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('resellerId', '==', uid)));
    for (const d of paymentsSnap.docs) {
      await deleteDoc(doc(db, 'payments', d.id));
    }

    // 4. Cascade delete notifications for this reseller
    const notifsSnap = await getDocs(query(collection(db, 'notifications'), where('targetUserId', '==', uid)));
    for (const d of notifsSnap.docs) {
      await deleteDoc(doc(db, 'notifications', d.id));
    }

    // 5. Cascade delete audit logs for this reseller's orders
    for (const d of ordersSnap.docs) {
      const auditSnap = await getDocs(query(collection(db, 'audit_logs'), where('orderId', '==', d.id)));
      for (const a of auditSnap.docs) {
        await deleteDoc(doc(db, 'audit_logs', a.id));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

/**
 * Clean up orphaned orders and payments from clients that were already deleted
 */
export async function cleanupOrphanedHistory(): Promise<{ deletedOrders: number; deletedPayments: number }> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const activeUids = new Set(usersSnap.docs.map((d) => d.id));

    let deletedOrders = 0;
    let deletedPayments = 0;

    const ordersSnap = await getDocs(collection(db, 'orders'));
    for (const d of ordersSnap.docs) {
      const data = d.data();
      // If reseller is not 'varejo' and does not belong to an active user, delete it
      if (data.resellerId !== 'varejo' && !activeUids.has(data.resellerId)) {
        await deleteDoc(doc(db, 'orders', d.id));
        deletedOrders++;
      }
    }

    const paymentsSnap = await getDocs(collection(db, 'payments'));
    for (const d of paymentsSnap.docs) {
      const data = d.data();
      if (!activeUids.has(data.resellerId)) {
        await deleteDoc(doc(db, 'payments', d.id));
        deletedPayments++;
      }
    }

    return { deletedOrders, deletedPayments };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'cleanup');
    return { deletedOrders: 0, deletedPayments: 0 };
  }
}

/**
 * Reset all historical test orders, payments and logs (clean slate for new operations)
 * Saves all wiped orders and payments to trash_history so the user can inspect or restore them anytime.
 */
export async function resetAllHistoricalData(adminName = 'Administrador'): Promise<{ deletedOrders: number; deletedPayments: number }> {
  try {
    let deletedOrders = 0;
    let deletedPayments = 0;

    const ordersSnap = await getDocs(collection(db, 'orders'));
    const paymentsSnap = await getDocs(collection(db, 'payments'));

    const archivedOrders: Order[] = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
    const archivedPayments: PaymentRecord[] = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));

    // Archive into trash_history before wiping
    if (archivedOrders.length > 0 || archivedPayments.length > 0) {
      try {
        await addDoc(collection(db, 'trash_history'), {
          itemType: 'zeramento_geral',
          title: `Zeramento Geral (${new Date().toLocaleDateString('pt-BR')})`,
          clientName: 'Painel Geral (Todos os Clientes)',
          deletedAt: new Date().toISOString(),
          deletedBy: adminName,
          totalValue: Number(archivedOrders.reduce((sum, o) => sum + (o.finalTotal || 0), 0).toFixed(2)),
          ordersCount: archivedOrders.length,
          paymentsCount: archivedPayments.length,
          orders: archivedOrders,
          payments: archivedPayments,
          notes: 'Histórico de vendas e pagamentos zerado pelo administrador.',
        });
      } catch (tErr) {
        console.warn('Erro ao salvar na lixeira:', tErr);
      }
    }

    for (const d of ordersSnap.docs) {
      try {
        await deleteDoc(doc(db, 'orders', d.id));
        deletedOrders++;
      } catch (err) {
        console.warn(`Erro ao excluir pedido ${d.id}:`, err);
      }
    }

    for (const d of paymentsSnap.docs) {
      try {
        await deleteDoc(doc(db, 'payments', d.id));
        deletedPayments++;
      } catch (err) {
        console.warn(`Erro ao excluir pagamento ${d.id}:`, err);
      }
    }

    const auditSnap = await getDocs(collection(db, 'audit_logs'));
    for (const d of auditSnap.docs) {
      try {
        await deleteDoc(doc(db, 'audit_logs', d.id));
      } catch (err) {
        console.warn(`Erro ao excluir log de auditoria ${d.id}:`, err);
      }
    }

    // Also clear notifications
    try {
      const notifsSnap = await getDocs(collection(db, 'notifications'));
      for (const d of notifsSnap.docs) {
        try {
          await deleteDoc(doc(db, 'notifications', d.id));
        } catch (err) {
          console.warn(`Erro ao excluir notificação ${d.id}:`, err);
        }
      }
    } catch {}

    return { deletedOrders, deletedPayments };
  } catch (error) {
    console.error('Erro em resetAllHistoricalData:', error);
    return { deletedOrders: 0, deletedPayments: 0 };
  }
}

/**
 * Clear the entire transaction history (orders, payments, notifications) of a specific client.
 * Leaves the client user account completely intact (same name, username, password hint, and custom prices),
 * but resets their pending balance, orders, and payments to R$ 0,00.
 * Automatically archives the wiped orders and payments to trash_history so the admin can inspect them anytime.
 */
export async function clearClientHistory(
  clientId: string,
  clientName = 'Revendedor',
  adminName = 'Administrador'
): Promise<{ deletedOrders: number; deletedPayments: number }> {
  try {
    let deletedOrders = 0;
    let deletedPayments = 0;

    // 1. Fetch orders and payments to archive in trash_history first
    const ordersSnap = await getDocs(query(collection(db, 'orders'), where('resellerId', '==', clientId)));
    const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('resellerId', '==', clientId)));

    const archivedOrders: Order[] = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
    const archivedPayments: PaymentRecord[] = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));

    // Archive into trash_history before wiping
    if (archivedOrders.length > 0 || archivedPayments.length > 0) {
      try {
        await addDoc(collection(db, 'trash_history'), {
          itemType: 'historico_cliente',
          title: `Histórico Zerado - ${clientName}`,
          clientName,
          clientId,
          deletedAt: new Date().toISOString(),
          deletedBy: adminName,
          totalValue: Number(archivedOrders.reduce((sum, o) => sum + (o.finalTotal || 0), 0).toFixed(2)),
          ordersCount: archivedOrders.length,
          paymentsCount: archivedPayments.length,
          orders: archivedOrders,
          payments: archivedPayments,
          notes: `Histórico zerado pelo administrador. Saldo de ${clientName} voltou a R$ 0,00.`,
        });
      } catch (tErr) {
        console.warn('Erro ao salvar na lixeira:', tErr);
      }
    }

    // 2. Delete all orders for this specific reseller
    for (const d of ordersSnap.docs) {
      try {
        // Remove audit logs for this order
        try {
          const auditSnap = await getDocs(query(collection(db, 'audit_logs'), where('orderId', '==', d.id)));
          for (const a of auditSnap.docs) {
            try {
              await deleteDoc(doc(db, 'audit_logs', a.id));
            } catch {}
          }
        } catch {}

        await deleteDoc(doc(db, 'orders', d.id));
        deletedOrders++;
      } catch (err) {
        console.warn(`Erro ao apagar pedido ${d.id} do cliente ${clientId}:`, err);
      }
    }

    // 3. Delete all payments for this specific reseller
    for (const d of paymentsSnap.docs) {
      try {
        await deleteDoc(doc(db, 'payments', d.id));
        deletedPayments++;
      } catch (err) {
        console.warn(`Erro ao apagar pagamento ${d.id} do cliente ${clientId}:`, err);
      }
    }

    // 4. Delete notifications for this client
    try {
      const notifsSnap = await getDocs(query(collection(db, 'notifications'), where('targetUserId', '==', clientId)));
      for (const d of notifsSnap.docs) {
        try {
          await deleteDoc(doc(db, 'notifications', d.id));
        } catch {}
      }
    } catch {}

    return { deletedOrders, deletedPayments };
  } catch (error) {
    console.error('Erro em clearClientHistory:', error);
    return { deletedOrders: 0, deletedPayments: 0 };
  }
}

/**
 * Restore an item from trash back into active orders and payments
 */
export async function restoreTrashItem(trashItem: TrashItem): Promise<void> {
  try {
    // 1. Re-insert orders
    for (const order of trashItem.orders) {
      try {
        await setDoc(doc(db, 'orders', order.id), order);
      } catch (err) {
        console.warn(`Erro ao restaurar pedido ${order.id}:`, err);
      }
    }

    // 2. Re-insert payments
    for (const payment of trashItem.payments) {
      try {
        await setDoc(doc(db, 'payments', payment.id), payment);
      } catch (err) {
        console.warn(`Erro ao restaurar pagamento ${payment.id}:`, err);
      }
    }

    // 3. Remove from trash_history
    await deleteDoc(doc(db, 'trash_history', trashItem.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trash_history/${trashItem.id}`);
  }
}

/**
 * Permanently delete a single trash record
 */
export async function permanentlyDeleteTrashItem(trashId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'trash_history', trashId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `trash_history/${trashId}`);
  }
}

/**
 * Empty the entire trash permanently
 */
export async function emptyTrash(): Promise<number> {
  try {
    let deletedCount = 0;
    const snap = await getDocs(collection(db, 'trash_history'));
    for (const d of snap.docs) {
      try {
        await deleteDoc(doc(db, 'trash_history', d.id));
        deletedCount++;
      } catch (err) {
        console.warn(`Erro ao esvaziar item ${d.id} da lixeira:`, err);
      }
    }
    return deletedCount;
  } catch (error) {
    console.error('Erro em emptyTrash:', error);
    return 0;
  }
}

/**
 * Clean app and keep ONLY Dona Francisca as reseller client.
 * Wipes out all test orders, payments, audit logs, and any other test clients.
 * Guarantees Dona Francisca exists with R$ 0,00 balance and the next order will be Pedido #01.
 */
export async function cleanAppKeepOnlyFrancisca(): Promise<{
  deletedOrders: number;
  deletedPayments: number;
  deletedUsers: number;
  franciscaUid: string;
}> {
  try {
    let deletedOrders = 0;
    let deletedPayments = 0;
    let deletedUsers = 0;

    // 1. Delete all orders (so all balances become 0,00)
    const ordersSnap = await getDocs(collection(db, 'orders'));
    for (const d of ordersSnap.docs) {
      try {
        await deleteDoc(doc(db, 'orders', d.id));
        deletedOrders++;
      } catch (err) {
        console.warn(`Erro ao excluir pedido ${d.id}:`, err);
      }
    }

    // 2. Delete all payments
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    for (const d of paymentsSnap.docs) {
      try {
        await deleteDoc(doc(db, 'payments', d.id));
        deletedPayments++;
      } catch (err) {
        console.warn(`Erro ao excluir pagamento ${d.id}:`, err);
      }
    }

    // 3. Delete all audit logs
    const auditSnap = await getDocs(collection(db, 'audit_logs'));
    for (const d of auditSnap.docs) {
      try {
        await deleteDoc(doc(db, 'audit_logs', d.id));
      } catch (err) {
        console.warn(`Erro ao excluir audit_log ${d.id}:`, err);
      }
    }

    // 4. Delete notifications
    try {
      const notifsSnap = await getDocs(collection(db, 'notifications'));
      for (const d of notifsSnap.docs) {
        try {
          await deleteDoc(doc(db, 'notifications', d.id));
        } catch {}
      }
    } catch {}

    // 5. Inspect users: find or create Dona Francisca, delete any other fictitious clients
    const usersSnap = await getDocs(collection(db, 'users'));
    let franciscaDoc = usersSnap.docs.find((d) => {
      const data = d.data();
      const name = (data.displayName || '').toLowerCase();
      const user = (data.username || '').toLowerCase();
      return name.includes('francisca') || user.includes('francisca');
    });

    let franciscaUid = '';

    if (franciscaDoc) {
      franciscaUid = franciscaDoc.id;
      try {
        await updateDoc(doc(db, 'users', franciscaUid), {
          displayName: 'Dona Francisca',
          username: franciscaDoc.data().username || 'francisca',
          simplePasswordHint: franciscaDoc.data().simplePasswordHint || '123456',
          role: 'revendedor',
          clientType: 'revendedor',
          active: true,
          updatedAt: new Date().toISOString(),
        });
      } catch {}
    } else {
      franciscaUid = 'revendedor_francisca';
      try {
        await setDoc(doc(db, 'users', franciscaUid), {
          uid: franciscaUid,
          displayName: 'Dona Francisca',
          username: 'francisca',
          simplePasswordHint: '123456',
          email: 'francisca@morumbi.app',
          phone: '',
          role: 'revendedor',
          clientType: 'revendedor',
          active: true,
          createdAt: new Date().toISOString(),
          notificationPreference: 'both',
        });
      } catch {}
    }

    // 6. Delete all other test clients (protecting admin and Dona Francisca)
    for (const d of usersSnap.docs) {
      const data = d.data();
      const isAdm =
        data.role === 'admin' ||
        d.id === 'admin' ||
        d.id === 'administrador' ||
        (data.email && data.email.toLowerCase().includes('wiliamedfprofessor')) ||
        (data.email && data.email.toLowerCase().includes('dyko')) ||
        (data.email && data.email.toLowerCase().includes('raidyko')) ||
        (data.username && data.username.toLowerCase() === 'dyko') ||
        (data.username && data.username.toLowerCase() === 'admin');
      const isFrancisca = d.id === franciscaUid;

      if (!isAdm && !isFrancisca) {
        try {
          await deleteDoc(doc(db, 'users', d.id));
          deletedUsers++;
        } catch (err) {
          console.warn(`Erro ao excluir usuário ${d.id}:`, err);
        }
      }
    }

    return { deletedOrders, deletedPayments, deletedUsers, franciscaUid };
  } catch (error) {
    console.error('Erro em cleanAppKeepOnlyFrancisca:', error);
    return { deletedOrders: 0, deletedPayments: 0, deletedUsers: 0, franciscaUid: '' };
  }
}

/**
 * Clean app and keep ONLY the Administrator account (dyko / wiliamedfprofessor@gmail.com).
 * Completely deletes all other reseller / client profiles, orders, payments, notifications, audit logs,
 * and /usernames mappings (preserving only dyko / admin).
 * Leaves all application settings, price configurations, and system rules completely intact.
 */
export async function cleanAppKeepOnlyAdmin(): Promise<{
  deletedOrders: number;
  deletedPayments: number;
  deletedUsers: number;
  deletedUsernames: number;
}> {
  try {
    let deletedOrders = 0;
    let deletedPayments = 0;
    let deletedUsers = 0;
    let deletedUsernames = 0;

    // 0. Archive existing orders and payments into trash_history before wiping
    try {
      const preOrdersSnap = await getDocs(collection(db, 'orders'));
      const prePaymentsSnap = await getDocs(collection(db, 'payments'));
      const archivedOrders: Order[] = preOrdersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      const archivedPayments: PaymentRecord[] = prePaymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));

      if (archivedOrders.length > 0 || archivedPayments.length > 0) {
        await addDoc(collection(db, 'trash_history'), {
          itemType: 'zeramento_geral',
          title: `Reinício do Sistema - Deixar Só Administrador (${new Date().toLocaleDateString('pt-BR')})`,
          clientName: 'Painel Geral (Todos os Revendedores Anteriores)',
          deletedAt: new Date().toISOString(),
          deletedBy: 'Administrador (dyko)',
          totalValue: Number(archivedOrders.reduce((sum, o) => sum + (o.finalTotal || 0), 0).toFixed(2)),
          ordersCount: archivedOrders.length,
          paymentsCount: archivedPayments.length,
          orders: archivedOrders,
          payments: archivedPayments,
          notes: 'Histórico arquivado automaticamente antes de reiniciar o aplicativo para começar do zero com novos clientes.',
        });
      }
    } catch (tErr) {
      console.warn('Erro ao arquivar na lixeira antes de limpar:', tErr);
    }

    // 1. Delete all orders
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      for (const d of ordersSnap.docs) {
        try {
          await deleteDoc(doc(db, 'orders', d.id));
          deletedOrders++;
        } catch (err) {
          console.warn(`Falha ao excluir pedido ${d.id}:`, err);
        }
      }
    } catch (err) {
      console.warn('Erro ao ler orders para exclusão:', err);
    }

    // 2. Delete all payments
    try {
      const paymentsSnap = await getDocs(collection(db, 'payments'));
      for (const d of paymentsSnap.docs) {
        try {
          await deleteDoc(doc(db, 'payments', d.id));
          deletedPayments++;
        } catch (err) {
          console.warn(`Falha ao excluir pagamento ${d.id}:`, err);
        }
      }
    } catch (err) {
      console.warn('Erro ao ler payments para exclusão:', err);
    }

    // 3. Delete all notifications
    try {
      const notifsSnap = await getDocs(collection(db, 'notifications'));
      for (const d of notifsSnap.docs) {
        try {
          await deleteDoc(doc(db, 'notifications', d.id));
        } catch (err) {
          console.warn(`Falha ao excluir notificação ${d.id}:`, err);
        }
      }
    } catch (err) {
      console.warn('Erro ao ler notifications para exclusão:', err);
    }

    // 4. Delete all audit logs
    try {
      const auditSnap = await getDocs(collection(db, 'audit_logs'));
      for (const d of auditSnap.docs) {
        try {
          await deleteDoc(doc(db, 'audit_logs', d.id));
        } catch (err) {
          console.warn(`Falha ao excluir audit_log ${d.id}:`, err);
        }
      }
    } catch (err) {
      console.warn('Erro ao ler audit_logs para exclusão:', err);
    }

    // 5. Delete all users except administrator
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        const data = d.data();
        const isAdm =
          data.role === 'admin' ||
          d.id === 'admin' ||
          d.id === 'administrador' ||
          (data.email && data.email.toLowerCase().includes('wiliamedfprofessor')) ||
          (data.email && data.email.toLowerCase().includes('dyko')) ||
          (data.email && data.email.toLowerCase().includes('raidyko')) ||
          (data.username && data.username.toLowerCase() === 'dyko') ||
          (data.username && data.username.toLowerCase() === 'admin');

        if (!isAdm) {
          try {
            await deleteDoc(doc(db, 'users', d.id));
            deletedUsers++;
          } catch (err) {
            console.warn(`Falha ao excluir usuário ${d.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao ler users para exclusão:', err);
    }

    // 6. Delete all username directory records except dyko and admin
    try {
      const usernamesSnap = await getDocs(collection(db, 'usernames'));
      for (const d of usernamesSnap.docs) {
        const uId = d.id.toLowerCase();
        const uData = d.data();
        const isAdm =
          uId === 'dyko' ||
          uId === 'admin' ||
          uData.role === 'admin' ||
          (uData.email && uData.email.toLowerCase().includes('wiliamedfprofessor')) ||
          (uData.email && uData.email.toLowerCase().includes('dyko')) ||
          (uData.email && uData.email.toLowerCase().includes('raidyko'));

        if (!isAdm) {
          try {
            await deleteDoc(doc(db, 'usernames', d.id));
            deletedUsernames++;
          } catch (err) {
            console.warn(`Falha ao excluir username ${d.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao ler usernames para exclusão:', err);
    }

    return { deletedOrders, deletedPayments, deletedUsers, deletedUsernames };
  } catch (error) {
    console.error('Erro geral em cleanAppKeepOnlyAdmin:', error);
    return { deletedOrders: 0, deletedPayments: 0, deletedUsers: 0, deletedUsernames: 0 };
  }
}
