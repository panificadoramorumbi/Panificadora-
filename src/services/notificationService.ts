/**
 * Native Device & Web Notification Service
 * Controls system status bar notifications (Android / PWA / Desktop)
 * and coordinates with In-App & WhatsApp preferences.
 */

export interface SystemNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  vibrate?: number[];
  silent?: boolean;
}

/**
 * Check if the browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Current permission status: 'default' | 'granted' | 'denied' | 'unsupported'
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Trigger a welcoming native status bar notification
      await showSystemNotification('Panificadora Morumbi 🥖', {
        body: 'Notificações na barra do celular ativadas com sucesso! Você receberá avisos de pedidos, sobras e pagamentos.',
        tag: 'morumbi-welcome',
      });
    }
    return permission;
  } catch (err) {
    console.warn('Erro ao solicitar permissão de notificações:', err);
    return Notification.permission;
  }
}

/**
 * Show a native system notification that appears in the device's status bar / notification tray
 */
export async function showSystemNotification(
  title: string,
  options?: SystemNotificationOptions
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const defaultIcon = '/pwa-192x192.png';
  const notificationOptions: any = {
    body: options?.body || '',
    icon: options?.icon || defaultIcon,
    badge: options?.badge || defaultIcon,
    tag: options?.tag || `morumbi-${Date.now()}`,
    vibrate: options?.vibrate || [200, 100, 200],
    data: options?.data || { url: '/' },
    silent: options?.silent || false,
  };

  try {
    // 1. Try ServiceWorkerRegistration (Best for Android status bar and PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, notificationOptions);
          return true;
        }
      } catch (swErr) {
        // Fallback to standard Notification constructor
        console.warn('ServiceWorker showNotification fallback:', swErr);
      }
    }

    // 2. Fallback to standard Notification API
    new Notification(title, notificationOptions);
    return true;
  } catch (err) {
    console.error('Falha ao exibir notificação nativa:', err);
    return false;
  }
}

/**
 * Play a light alert sound using Web Audio API (does not require external audio files)
 */
export function playNotificationTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio context might be restricted before interaction, ignore safely
  }
}
