import React, { useState, useEffect } from 'react';
import {
  Settings,
  DollarSign,
  Croissant,
  Database,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Save,
  RefreshCw,
  ShieldCheck,
  Info,
  Download,
  ExternalLink,
  Package,
  Globe,
  Share2,
} from 'lucide-react';
import { ProductPrices } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { updateProductPrices } from '../../services/dataService';
import { FIREBASE_INFO, testConnection } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../PWAInstallButton';
import { getPublicAppUrl, getPublicHostname } from '../../config/appConfig';

interface SettingsViewProps {
  currentPrices: ProductPrices;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentPrices }) => {
  const { currentUser } = useAuth();
  const [priceSalty, setPriceSalty] = useState<number>(currentPrices.priceSalty);
  const [priceSweet, setPriceSweet] = useState<number>(currentPrices.priceSweet);
  const [retailPriceSalty, setRetailPriceSalty] = useState<number>(currentPrices.retailPriceSalty || 1.0);
  const [retailPriceSweet, setRetailPriceSweet] = useState<number>(currentPrices.retailPriceSweet || 1.5);
  const [savingPrices, setSavingPrices] = useState(false);
  const [priceSuccess, setPriceSuccess] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    setPriceSalty(currentPrices.priceSalty);
    setPriceSweet(currentPrices.priceSweet);
    setRetailPriceSalty(currentPrices.retailPriceSalty || 1.0);
    setRetailPriceSweet(currentPrices.retailPriceSweet || 1.5);
  }, [currentPrices]);

  // Diagnostic state
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Active public URL for clients / PWABuilder
  const currentAppUrl = getPublicAppUrl();
  const publicHostname = getPublicHostname();
  const pwaBuilderUrl = `https://www.pwabuilder.com?url=${encodeURIComponent(currentAppUrl)}`;

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriceError(null);
    setPriceSuccess(null);

    if (priceSalty <= 0 || priceSweet <= 0 || retailPriceSalty <= 0 || retailPriceSweet <= 0) {
      setPriceError('Todos os preços unitários de revenda e varejo devem ser maiores que R$ 0,00.');
      return;
    }

    setSavingPrices(true);
    try {
      await updateProductPrices({
        priceSalty: Number(priceSalty),
        priceSweet: Number(priceSweet),
        retailPriceSalty: Number(retailPriceSalty),
        retailPriceSweet: Number(retailPriceSweet),
        adminEmail: currentUser?.email || 'admin@morumbi.com',
      });
      setPriceSuccess('Preços de Revenda e Varejo atualizados com sucesso no Firestore!');
      setTimeout(() => setPriceSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setPriceError('Falha ao atualizar preços: ' + (err?.message || err));
    } finally {
      setSavingPrices(false);
    }
  };

  const handleTestDatabase = async () => {
    setTestingDb(true);
    try {
      const res = await testConnection();
      setDbTestResult(res);
    } catch (err: any) {
      setDbTestResult({ ok: false, message: 'Falha: ' + err?.message });
    } finally {
      setTestingDb(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-red-800" />
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            7. Configurações, Preços & Central de Publicação (APK)
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Defina os preços dos pães, gere o pacote APK instalador e gerencie o Firebase oficial.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Product Unit Prices */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
              <Croissant className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">Preços Unitários de Revenda</h3>
              <p className="text-xs text-stone-500">Pão Salgado e Pão Doce</p>
            </div>
          </div>

          {priceSuccess && (
            <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{priceSuccess}</span>
            </div>
          )}

          {priceError && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{priceError}</span>
            </div>
          )}

          <form onSubmit={handleSavePrices} className="space-y-4 mt-5">
            {/* 1. Preços de Revenda / Atacado */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center justify-between">
                <span>1. Tabela Revendedores (Atacado)</span>
                <span className="text-[10px] text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full font-bold">
                  Com Sobras
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    Pão Salgado (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={priceSalty}
                      onChange={(e) => setPriceSalty(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    Pão Doce (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={priceSweet}
                      onChange={(e) => setPriceSweet(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Preços de Varejo / Consumidor Final */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-300 space-y-3">
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center justify-between">
                <span>2. Tabela Consumidor Final (Varejo / Balcão)</span>
                <span className="text-[10px] text-red-900 bg-amber-200 px-2 py-0.5 rounded-full font-bold">
                  Normalmente R$ 1,00
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    Pão Salgado Varejo (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={retailPriceSalty}
                      onChange={(e) => setRetailPriceSalty(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900"
                    />
                  </div>
                  <span className="text-[10px] text-amber-900 font-semibold mt-0.5 block">
                    Preço de encomenda direta
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    Pão Doce Varejo (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={retailPriceSweet}
                      onChange={(e) => setRetailPriceSweet(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-900"
                    />
                  </div>
                  <span className="text-[10px] text-amber-900 font-semibold mt-0.5 block">
                    Preço de encomenda direta
                  </span>
                </div>
              </div>
            </div>

            {/* Immutability guarantee notice */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong>Garantia de Não Retroatividade:</strong> Os novos preços serão aplicados
                somente para novos pedidos criados a partir deste momento. Pedidos anteriores retêm
                o registro do preço original em seu arquivo para preservar o histórico contábil.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingPrices}
              className="w-full py-3 bg-red-800 hover:bg-red-900 active:scale-95 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingPrices ? 'Salvando...' : 'Salvar Novos Preços'}</span>
            </button>
          </form>
        </div>

        {/* Card 2: Como Baixar o APK e Publicar Definitivamente */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-red-950 via-stone-900 to-red-950 text-white rounded-3xl p-6 shadow-xl border border-red-800">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-md">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Aplicativo Baixável (.APK Android)
                </h3>
                <p className="text-xs text-amber-300">Instalação sem depender de navegador</p>
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed mb-4">
              O aplicativo já está equipado com todos os arquivos oficiais necessários (ícones de alta resolução, manifesto e service worker) para gerar o instalador <strong>.APK</strong> para você e seus revendedores.
            </p>

            <div className="space-y-3">
              {/* Option 1: Direct WebAPK Install */}
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-400">1. Instalação Imediata (WebAPK Nativo)</span>
                </div>
                <p className="text-[11px] text-stone-300 mb-2 leading-relaxed">
                  Ao clicar em <strong>"Instalar App no Android"</strong> no celular, o Android cria o WebAPK oficial automaticamente. O app fica na gaveta de aplicativos com ícone próprio e abre em tela cheia, <strong>sem abrir o Google nem barra de navegador</strong>.
                </p>
                <PWAInstallButton className="w-full" />
              </div>

              {/* Option 2: PWABuilder Direct APK Generator */}
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-400">2. Gerar Arquivo .APK para Enviar no WhatsApp</span>
                </div>
                <p className="text-[11px] text-stone-300 mb-2 leading-relaxed">
                  Gere o arquivo instalador <strong>.apk</strong> com 1 clique através do PWABuilder (ferramenta oficial da Microsoft/Google). Assim você pode mandar o arquivo direto pelo WhatsApp para os clientes instalarem:
                </p>
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs uppercase rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-stone-950" />
                  <span>Gerar e Baixar Pacote APK Android</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Card 3: Firebase Connection & Diagnostics */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
              <div className="w-10 h-10 rounded-xl bg-red-800 text-white flex items-center justify-center font-black">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Conexão Firebase & Firestore</h3>
                <p className="text-xs text-stone-500">Parâmetros do projeto oficial conectado</p>
              </div>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="flex justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 font-bold">Firebase Project ID:</span>
                <span className="font-mono font-bold text-stone-900">{FIREBASE_INFO.projectId}</span>
              </div>

              <div className="flex justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 font-bold">Instância Firestore:</span>
                <span className="font-mono text-[11px] font-semibold text-stone-800 truncate max-w-[220px]">
                  {FIREBASE_INFO.firestoreDatabaseId}
                </span>
              </div>

              <div className="flex justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 font-bold">Administrador Mestre:</span>
                <span className="font-semibold text-red-800">{FIREBASE_INFO.adminEmail}</span>
              </div>

              {dbTestResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    dbTestResult.ok
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-bold text-[11px]">{dbTestResult.message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleTestDatabase}
                disabled={testingDb}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                <span>{testingDb ? 'Testando Conexão...' : 'Testar Comunicação com Firestore'}</span>
              </button>
            </div>
          </div>

          {/* Card 4: Google Auth & Authorized Domains */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Login com Google para Todos</h3>
                <p className="text-xs text-stone-500">Configuração de domínios autorizados no Firebase</p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-stone-600">
              <p>
                Para que outras pessoas consigam usar o aplicativo no celular delas sem nenhum erro, siga estas 2 etapas simples:
              </p>

              {/* Step 1: Use the Public URL */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 text-stone-800 space-y-1">
                <p className="font-black text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  1. Enviar sempre o Link Público Oficial
                </p>
                <p className="text-[11px] text-stone-600">
                  O link de desenvolvimento (<code>ais-dev-...</code>) só funciona no seu computador de administrador. Para os clientes e revendedores, envie este link público:
                </p>
                <code className="block p-2 bg-white rounded-lg border border-emerald-300 font-mono text-xs text-emerald-950 select-all font-bold break-all">
                  {currentAppUrl}
                </code>
              </div>

              {/* Step 2: Google OAuth Consent Screen */}
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-stone-700 space-y-1.5">
                <p className="font-black text-amber-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  2. Liberar o Login com Google no Google Cloud Console
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Por padrão, novos projetos Google vêm em modo <strong>"Em Teste" (Testing)</strong>. Por isso só o seu e-mail (<code>{FIREBASE_INFO.adminEmail}</code>) consegue entrar com o Google!
                </p>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-[11px] text-stone-700 space-y-1">
                  <p className="font-bold text-stone-900">Como liberar para todo mundo:</p>
                  <p>1. Acesse o <strong>Google Cloud Console</strong> &gt; <strong>APIs e Serviços</strong> &gt; <strong>Tela de consentimento OAuth</strong>.</p>
                  <p>2. Clique no botão <strong>"PUBLICAR APP"</strong> (Publish App) para mudar de "Em teste" para "Em produção".</p>
                </div>
              </div>

              {/* Step 3: Firebase Authorized Domains */}
              <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 text-stone-700 space-y-1.5">
                <p className="font-black text-blue-950 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-700 shrink-0" />
                  3. Domínio Autorizado no Firebase
                </p>
                <p className="text-[11px] text-stone-600">
                  Adicione o domínio abaixo em <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong>:
                </p>
                <code className="block p-2 bg-white rounded-lg border border-blue-200 font-mono text-xs text-blue-950 select-all font-bold break-all">
                  {publicHostname}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
