import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  className?: string;
  variant?: 'primary' | 'sidebar' | 'banner';
}

export const PWAInstallButton: React.FC<Props> = ({ className = '', variant = 'sidebar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running standalone inside PWA
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <div className="bg-amber-500 text-stone-900 px-4 py-3 rounded-xl flex items-center justify-between shadow-md mb-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 shrink-0 text-red-900" />
            <div>
              <p className="font-bold text-sm leading-tight text-red-950">Instalar no Celular Android</p>
              <p className="text-xs text-red-900">Acesse como um aplicativo nativo e rápido.</p>
            </div>
          </div>
          <button
            onClick={install}
            className="bg-red-800 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg shadow hover:bg-red-900 transition flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-4 h-4" />
            Instalar
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        className={`flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 px-4 py-3 text-sm font-bold shadow-md transition ${className}`}
      >
        <Download className="w-4 h-4 text-stone-950" />
        <span>Instalar App no Android</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 px-3 py-2 text-xs font-semibold shadow-sm transition ${className}`}
        >
          <Smartphone className="w-4 h-4 text-amber-700" />
          <span>Instalar no iPhone / iPad</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-red-800">
                  <Smartphone className="w-6 h-6" />
                  <h3 className="text-lg font-black">Instalar no iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-stone-600 mb-4 leading-relaxed">
                Para instalar o app da <strong>Panificadora Morumbi</strong> no seu dispositivo:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-stone-700 font-medium mb-6">
                <li>Toque no botão <strong>Compartilhar</strong> (ícone com seta para cima) na barra do Safari.</li>
                <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</li>
                <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-red-800 py-3 text-sm font-bold text-white shadow-md hover:bg-red-900 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
