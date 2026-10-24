export type UserRole = 'admin' | 'revendedor' | 'cliente';
export type ClientType = 'revendedor' | 'consumidor_final';

export type NotificationPreference = 'in_app' | 'whatsapp' | 'both' | 'none';

export interface UserProfile {
  uid: string;
  email: string;
  username?: string; // Nome de usuário simplificado (ex: 'carlos', 'joao')
  simplePasswordHint?: string; // Senha simples visível para o administrador passar para o cliente
  displayName: string;
  phone: string;
  role: UserRole;
  clientType?: ClientType; // 'revendedor' (preço de atacado com sobras) ou 'consumidor_final' (R$ 1,00 encomendas)
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  notificationPreference?: NotificationPreference;
}

export type OrderStatus = 'aguardando_sobras' | 'concluido' | 'cancelado' | 'pronto_retirada' | 'entregue';
export type PaymentStatus = 'pendente' | 'parcial' | 'pago';
export type OrderType = 'revenda' | 'varejo'; // 'revenda' (com sobras) ou 'varejo' (encomenda direta consumidor R$ 1,00)

export interface Order {
  id: string;
  orderNumber: string;
  orderType?: OrderType; // 'revenda' ou 'varejo'
  resellerId: string;
  resellerName: string;
  customerPhone?: string;
  orderDate: string; // YYYY-MM-DD
  deliveryDate: string; // YYYY-MM-DD
  qtySaltyPickup: number;
  qtySweetPickup: number;
  qtySaltyLeftover: number;
  qtySweetLeftover: number;
  leftoversRecorded: boolean;
  leftoversRecordedAt?: string;
  leftoversRecordedBy?: string;
  qtySaltySold: number;
  qtySweetSold: number;
  unitPriceSalty: number;
  unitPriceSweet: number;
  expectedTotal: number;
  finalTotal: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  lastModifiedBy?: string;
  lastModifiedReason?: string;
}

export type PaymentMethod = 'pix' | 'dinheiro' | 'transferencia' | 'cartao' | 'outro';

export interface PaymentRecord {
  id: string;
  resellerId: string;
  resellerName: string;
  orderIds: string[];
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes?: string;
  registeredBy: string;
  registeredByName?: string;
  createdAt: string;
}

export interface AuditQuantityData {
  qtySaltyPickup: number;
  qtySweetPickup: number;
  qtySaltyLeftover: number;
  qtySweetLeftover: number;
  qtySaltySold: number;
  qtySweetSold: number;
  expectedTotal: number;
  finalTotal: number;
}

export interface AuditLog {
  id: string;
  orderId: string;
  orderNumber: string;
  resellerName: string;
  adminId: string;
  adminEmail: string;
  actionType: 'alteracao_quantidade' | 'cancelamento' | 'estorno';
  previousData: AuditQuantityData;
  newData: AuditQuantityData;
  reason: string;
  timestamp: string;
}

export interface ProductPrices {
  // Preços de Revenda / Atacado
  priceSalty: number; // ex: 0.85
  priceSweet: number; // ex: 1.25

  // Preços de Varejo / Consumidor Final (Normalmente R$ 1,00)
  retailPriceSalty: number; // ex: 1.00
  retailPriceSweet: number; // ex: 1.50

  updatedAt?: string;
  updatedBy?: string;
}

export interface InAppNotification {
  id: string;
  targetUserId: string; // user id or 'all' or 'admins'
  title: string;
  message: string;
  type: 'pedido' | 'sobras' | 'alteracao' | 'pagamento' | 'revendedor' | 'sistema';
  read: boolean;
  createdAt: string;
  link?: string;
}
