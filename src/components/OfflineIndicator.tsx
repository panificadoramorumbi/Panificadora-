import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:right-auto z-50 flex items-center justify-between md:justify-start gap-3 rounded-xl bg-amber-500 text-stone-950 px-4 py-2.5 text-xs font-bold shadow-2xl border border-amber-600 animate-pulse">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-stone-900" />
        <span>Modo Offline — Exibindo dados locais sincronizados.</span>
      </div>
    </div>
  );
};
