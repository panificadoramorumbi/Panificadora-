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
} from '../types';
import { calculateOrderMetrics } from '../utils/formatters';

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
 * Dispatch an in-app notification
 */
export async function sendNotification(data: {
  targetUserId: string;
  title: string;
  message: string;
  type: InAppNotification['type'];
  link?: string;
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
    notes,
    currentPrices,
  } = params;

  const metrics = calculateOrderMetrics({
    qtySaltyPickup,
    qtySweetPickup,
    qtySaltyLeftover: 0,
    qtySweetLeftover: 0,
    leftoversRecorded: false,
    unitPriceSalty: currentPrices.priceSalty,
    unitPriceSweet: currentPrices.priceSweet,
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
    unitPriceSalty: currentPrices.priceSalty,
    unitPriceSweet: currentPrices.priceSweet,
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
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Admin Permanently Delete Reseller Profile
 * Cascade deletes the client and all associated orders, payments, and notifications
 * so no historical balances or amounts linger in the system.
 */
export async function deleteUserProfile(uid: string) {
  try {
    // 1. Delete user profile doc
    const docRef = doc(db, 'users', uid);
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
 */
export async function resetAllHistoricalData(): Promise<{ deletedOrders: number; deletedPayments: number }> {
  try {
    let deletedOrders = 0;
    let deletedPayments = 0;

    const ordersSnap = await getDocs(collection(db, 'orders'));
    for (const d of ordersSnap.docs) {
      await deleteDoc(doc(db, 'orders', d.id));
      deletedOrders++;
    }

    const paymentsSnap = await getDocs(collection(db, 'payments'));
    for (const d of paymentsSnap.docs) {
      await deleteDoc(doc(db, 'payments', d.id));
      deletedPayments++;
    }

    const auditSnap = await getDocs(collection(db, 'audit_logs'));
    for (const d of auditSnap.docs) {
      await deleteDoc(doc(db, 'audit_logs', d.id));
    }

    return { deletedOrders, deletedPayments };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'reset');
    return { deletedOrders: 0, deletedPayments: 0 };
  }
}
