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
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const international = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
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
