/**
 * Formats a number to Brazilian Real (BRL) currency
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) to Brazilian format (DD/MM/AAAA)
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    // If it's YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

/**
 * Formats an ISO string to Brazilian date and time (DD/MM/AAAA às HH:mm)
 */
export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return dateStr;
  }
}

/**
 * Cleans and formats phone number for display
 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Builds official WhatsApp URL with pre-filled message
 * Uses direct api.whatsapp.com/send to prevent wa.me redirect from corrupting multi-byte UTF-8 emojis into 
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const international = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://api.whatsapp.com/send?phone=${international}&text=${encodeURIComponent(message)}`;
}

/**
 * Strict Order Financial & Inventory calculations
 */
export function calculateOrderMetrics(params: {
  qtySaltyPickup: number;
  qtySweetPickup: number;
  qtySaltyLeftover: number;
  qtySweetLeftover: number;
  leftoversRecorded: boolean;
  unitPriceSalty: number;
  unitPriceSweet: number;
  amountPaid?: number;
}) {
  const qtySaltyPickup = Math.max(0, Number(params.qtySaltyPickup) || 0);
  const qtySweetPickup = Math.max(0, Number(params.qtySweetPickup) || 0);
  const qtySaltyLeftover = Math.max(0, Number(params.qtySaltyLeftover) || 0);
  const qtySweetLeftover = Math.max(0, Number(params.qtySweetLeftover) || 0);
  const unitPriceSalty = Number(params.unitPriceSalty) || 0;
  const unitPriceSweet = Number(params.unitPriceSweet) || 0;
  const amountPaid = Number(params.amountPaid) || 0;

  const expectedTotal = Number(
    (qtySaltyPickup * unitPriceSalty + qtySweetPickup * unitPriceSweet).toFixed(2)
  );

  let qtySaltySold = qtySaltyPickup;
  let qtySweetSold = qtySweetPickup;
  let finalTotal = expectedTotal;

  if (params.leftoversRecorded) {
    qtySaltySold = Math.max(0, qtySaltyPickup - Math.min(qtySaltyLeftover, qtySaltyPickup));
    qtySweetSold = Math.max(0, qtySweetPickup - Math.min(qtySweetLeftover, qtySweetPickup));
    finalTotal = Number(
      (qtySaltySold * unitPriceSalty + qtySweetSold * unitPriceSweet).toFixed(2)
    );
  }

  const balanceDue = Number(Math.max(0, finalTotal - amountPaid).toFixed(2));

  return {
    qtySaltyPickup,
    qtySweetPickup,
    qtySaltyLeftover,
    qtySweetLeftover,
    qtySaltySold,
    qtySweetSold,
    expectedTotal,
    finalTotal,
    balanceDue,
  };
}

/**
 * Normalizes and cleans username inputs:
 * - strips leading/trailing spaces
 * - removes accents/diacritics (e.g. Célia -> celia, José -> jose, João -> joao)
 * - converts to lowercase
 * - strips any character that isn't a-z, 0-9, dot, underscore, or hyphen
 */
export function sanitizeUsername(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

/**
 * Deterministic color palette for clients / resellers
 * Ensures each client has a distinct, recognizable color identity across the entire system.
 */
export interface ClientColorTheme {
  id: string;
  name: string;
  badge: string;       // Tailwind pill badge styling (bg, text, border)
  bg: string;          // Soft card/section background
  bgHover: string;     // Hover state
  border: string;      // Border color
  text: string;        // High contrast text
  accent: string;      // Solid accent fill (for avatars or headers)
  dot: string;         // Solid indicator dot
  ring: string;        // Focus / active ring
}

export const CLIENT_COLOR_PALETTES: ClientColorTheme[] = [
  {
    id: 'emerald',
    name: 'Esmeralda',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    bg: 'bg-emerald-50',
    bgHover: 'hover:bg-emerald-100',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    accent: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-400',
  },
  {
    id: 'blue',
    name: 'Azul',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    bg: 'bg-blue-50',
    bgHover: 'hover:bg-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-800',
    accent: 'bg-blue-600 text-white',
    dot: 'bg-blue-500',
    ring: 'ring-blue-400',
  },
  {
    id: 'purple',
    name: 'Roxo',
    badge: 'bg-purple-100 text-purple-900 border-purple-300',
    bg: 'bg-purple-50',
    bgHover: 'hover:bg-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-800',
    accent: 'bg-purple-600 text-white',
    dot: 'bg-purple-500',
    ring: 'ring-purple-400',
  },
  {
    id: 'amber',
    name: 'Âmbar',
    badge: 'bg-amber-100 text-amber-950 border-amber-300',
    bg: 'bg-amber-50',
    bgHover: 'hover:bg-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-900',
    accent: 'bg-amber-500 text-stone-950',
    dot: 'bg-amber-500',
    ring: 'ring-amber-400',
  },
  {
    id: 'rose',
    name: 'Rosa',
    badge: 'bg-rose-100 text-rose-900 border-rose-300',
    bg: 'bg-rose-50',
    bgHover: 'hover:bg-rose-100',
    border: 'border-rose-300',
    text: 'text-rose-800',
    accent: 'bg-rose-600 text-white',
    dot: 'bg-rose-500',
    ring: 'ring-rose-400',
  },
  {
    id: 'teal',
    name: 'Turquesa',
    badge: 'bg-teal-100 text-teal-900 border-teal-300',
    bg: 'bg-teal-50',
    bgHover: 'hover:bg-teal-100',
    border: 'border-teal-300',
    text: 'text-teal-800',
    accent: 'bg-teal-600 text-white',
    dot: 'bg-teal-500',
    ring: 'ring-teal-400',
  },
  {
    id: 'indigo',
    name: 'Índigo',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    bg: 'bg-indigo-50',
    bgHover: 'hover:bg-indigo-100',
    border: 'border-indigo-300',
    text: 'text-indigo-800',
    accent: 'bg-indigo-600 text-white',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-400',
  },
  {
    id: 'cyan',
    name: 'Ciano',
    badge: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    bg: 'bg-cyan-50',
    bgHover: 'hover:bg-cyan-100',
    border: 'border-cyan-300',
    text: 'text-cyan-800',
    accent: 'bg-cyan-600 text-white',
    dot: 'bg-cyan-500',
    ring: 'ring-cyan-400',
  },
  {
    id: 'orange',
    name: 'Laranja',
    badge: 'bg-orange-100 text-orange-950 border-orange-300',
    bg: 'bg-orange-50',
    bgHover: 'hover:bg-orange-100',
    border: 'border-orange-300',
    text: 'text-orange-900',
    accent: 'bg-orange-600 text-white',
    dot: 'bg-orange-500',
    ring: 'ring-orange-400',
  },
  {
    id: 'fuchsia',
    name: 'Fúcsia',
    badge: 'bg-fuchsia-100 text-fuchsia-950 border-fuchsia-300',
    bg: 'bg-fuchsia-50',
    bgHover: 'hover:bg-fuchsia-100',
    border: 'border-fuchsia-300',
    text: 'text-fuchsia-900',
    accent: 'bg-fuchsia-600 text-white',
    dot: 'bg-fuchsia-500',
    ring: 'ring-fuchsia-400',
  },
  {
    id: 'lime',
    name: 'Lima',
    badge: 'bg-lime-100 text-lime-950 border-lime-300',
    bg: 'bg-lime-50',
    bgHover: 'hover:bg-lime-100',
    border: 'border-lime-300',
    text: 'text-lime-900',
    accent: 'bg-lime-600 text-stone-950',
    dot: 'bg-lime-500',
    ring: 'ring-lime-400',
  },
  {
    id: 'violet',
    name: 'Violeta',
    badge: 'bg-violet-100 text-violet-950 border-violet-300',
    bg: 'bg-violet-50',
    bgHover: 'hover:bg-violet-100',
    border: 'border-violet-300',
    text: 'text-violet-900',
    accent: 'bg-violet-700 text-white',
    dot: 'bg-violet-500',
    ring: 'ring-violet-400',
  },
];

/**
 * Returns a deterministic color scheme based on user ID or name
 */
export function getClientColor(identifier?: string | null): ClientColorTheme {
  if (!identifier) return CLIENT_COLOR_PALETTES[0];
  let hash = 0;
  const str = identifier.trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CLIENT_COLOR_PALETTES.length;
  return CLIENT_COLOR_PALETTES[index];
}
