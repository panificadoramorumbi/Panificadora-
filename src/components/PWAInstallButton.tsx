import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, ArrowRight, Share2, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  className?: string;
  variant?: 'primary' | 'sidebar' | 'banner' | 'header';
  compactOnMobile?: boolean;
}

export const PWAInstallButton: React.FC<Props> = ({
  className = '',
  variant = 'sidebar',
  compactOnMobile = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [deviceTab, setDeviceTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');

  // If already running standalone inside PWA (no browser chrome)
  if (isInstalled) {
    return null;
  }

  const handleOpenInstall = async () => {
    if (isInstallable) {
      try {
        const accepted = await install();
        if (accepted) return;
      } catch (err) {
        console.log('Install prompt error, showing guide modal', err);
      }
    }
    setShowModal(true);
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className={`bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 p-4 rounded-2xl shadow-lg border border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950 text-amber-400 flex items-center justify-center shrink-0 shadow">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-sm text-stone-950 leading-tight">
                Usar como Aplicativo no Celular
              </p>
              <p className="text-xs text-stone-800 font-medium">
                Remove a barra do navegador, 3 pontinhos e abre em tela cheia.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenInstall}
            className="w-full sm:w-auto bg-red-900 hover:bg-red-950 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-300" />
            <span>Instalar Aplicativo</span>
          </button>
        </div>
      ) : variant === 'header' || compactOnMobile ? (
        <button
          onClick={handleOpenInstall}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-black text-[11px] sm:text-xs shadow-sm transition active:scale-95 cursor-pointer ${className}`}
          title="Instalar como aplicativo no celular para remover a barra do navegador"
        >
          <Smartphone className="w-3.5 h-3.5 text-stone-950" />
          <span className="hidden xs:inline">Instalar App</span>
          <span className="xs:hidden">App</span>
        </button>
      ) : (
        <button
          onClick={handleOpenInstall}
          className={`flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 px-4 py-3 text-xs sm:text-sm font-bold shadow-md transition cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 text-stone-950" />
          <span>Instalar como Aplicativo</span>
        </button>
      )}

      {/* Instructional Modal for Fullscreen App-Mode */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 leading-tight">
                    Usar como Aplicativo Puro
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Remove a barra de site, os 3 pontinhos e o topo do navegador
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex bg-stone-100 p-1 rounded-xl mt-4">
              <button
                type="button"
                onClick={() => setDeviceTab('android')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition ${
                  deviceTab === 'android'
                    ? 'bg-red-800 text-white shadow'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                No Android (Google Chrome)
              </button>
              <button
                type="button"
                onClick={() => setDeviceTab('ios')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition ${
                  deviceTab === 'ios'
                    ? 'bg-red-800 text-white shadow'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                No iPhone / iPad (Safari)
              </button>
            </div>

            <div className="mt-4 overflow-y-auto pr-1 flex-1 space-y-3">
              {deviceTab === 'android' ? (
                <div className="space-y-3 text-xs sm:text-sm text-stone-700">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-950 font-medium">
                      Ao adicionar à tela inicial, o aplicativo abre <strong>sem a barra de endereço</strong>, <strong>sem o menu de 3 pontinhos</strong> e <strong>sem botão de compartilhar</strong>, funcionando exatamente como um APK do Google Play.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="w-6 h-6 rounded-full bg-red-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div className="text-xs leading-relaxed">
                        Toque no botão dos <strong>3 pontinhos (⋮)</strong> no canto superior direito do seu navegador Google Chrome.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="w-6 h-6 rounded-full bg-red-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        2
                      </div>
                      <div className="text-xs leading-relaxed">
                        Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="w-6 h-6 rounded-full bg-red-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div className="text-xs leading-relaxed">
                        Toque em <strong>Instalar</strong>. Pronto! O ícone <strong>Pão Morumbi</strong> vai aparecer junto com seus outros aplicativos e abrirá sempre 100% limpo!
                      </div>
                    </div>
                  </div>

                  {isInstallable && (
                    <button
                      onClick={async () => {
                        await install();
                        setShowModal(false);
                      }}
                      className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Instalar Agora Direto</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-xs sm:text-sm text-stone-700">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-950 font-medium">
                      No iPhone / iPad, adicionar à Tela de Início remove as barras do Safari e ativa o modo tela cheia.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="w-6 h-6 rounded-full bg-red-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div className="text-xs leading-relaxed">
                        No navegador Safari, toque no botão <strong>Compartilhar</strong> (ícone quadrado com a seta para cima na barra inferior).
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="w-6 h-6 rounded-full bg-red-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        2
                      </div>
                      <div className="text-xs leading-relaxed">
                        Role para baixo na lista e toque em <strong>"Adicionar à Tela de Início"</strong>.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="w-6 h-6 rounded-full bg-red-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div className="text-xs leading-relaxed">
                        Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full rounded-2xl bg-stone-900 py-3 text-xs sm:text-sm font-black text-white hover:bg-stone-800 transition"
            >
              Fechar Instruções
            </button>
          </div>
        </div>
      )}
    </>
  );
};

