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
  User,
  KeyRound,
  Phone,
  Mail,
  UserCog,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { ProductPrices, NotificationPreference } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { updateProductPrices, cleanAppKeepOnlyFrancisca } from '../../services/dataService';
import { FIREBASE_INFO, testConnection } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../PWAInstallButton';
import { getPublicAppUrl, getPublicHostname } from '../../config/appConfig';

interface SettingsViewProps {
  currentPrices: ProductPrices;
  initialTab?: 'dados' | 'precos' | 'zerar' | 'apk';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentPrices, initialTab = 'dados' }) => {
  const { currentUser, userProfile, updateUserCredentials } = useAuth();
  const [activeTab, setActiveTab] = useState<'dados' | 'precos' | 'zerar' | 'apk'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Tab 1: User Profile & Password States
  const [adminName, setAdminName] = useState(userProfile?.displayName || 'Administrador Morumbi');
  const [adminPhone, setAdminPhone] = useState(userProfile?.phone || '');
  const [adminUsername, setAdminUsername] = useState(
    userProfile?.username || (userProfile?.email ? userProfile.email.split('@')[0] : 'admin')
  );
  const [adminEmail, setAdminEmail] = useState(userProfile?.email || '');
  const [adminPassword, setAdminPassword] = useState(userProfile?.simplePasswordHint || '123456');
  const [adminNotifPref, setAdminNotifPref] = useState<NotificationPreference>(
    userProfile?.notificationPreference || 'both'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setAdminName(userProfile.displayName || 'Administrador Morumbi');
      setAdminPhone(userProfile.phone || '');
      setAdminUsername(userProfile.username || (userProfile.email ? userProfile.email.split('@')[0] : 'admin'));
      setAdminEmail(userProfile.email || '');
      if (userProfile.simplePasswordHint) {
        setAdminPassword(userProfile.simplePasswordHint);
      }
      if (userProfile.notificationPreference) {
        setAdminNotifPref(userProfile.notificationPreference);
      }
    }
  }, [userProfile]);

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!adminName.trim()) {
      setProfileError('Por favor, informe seu nome de administrador.');
      return;
    }

    if (adminPassword && adminPassword.length < 6) {
      setProfileError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateUserCredentials({
        displayName: adminName.trim(),
        phone: adminPhone.trim(),
        username: adminUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''),
        email: adminEmail.trim() || undefined,
        newPassword: adminPassword.trim() || undefined,
        notificationPreference: adminNotifPref,
      });

      setProfileSuccess('Seus dados pessoais e senha foram atualizados com sucesso!');
      setTimeout(() => setProfileSuccess(null), 3500);
    } catch (err: any) {
      console.error(err);
      setProfileError('Erro ao salvar dados: ' + (err?.message || err));
    } finally {
      setSavingProfile(false);
    }
  };

  // Tab 2: Product Prices States
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

  // Tab 3: Reset Test Values & Keep Only Dona Francisca
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [resetErrorMsg, setResetErrorMsg] = useState<string | null>(null);

  const handleRunResetFrancisca = async () => {
    const confirmed = window.confirm(
      'Atenção: Deseja realmente zerar todos os pedidos e pagamentos do aplicativo e manter apenas a Dona Francisca como revendedora?\n\n• Todos os saldos de teste voltarão para R$ 0,00.\n• Clientes fictícios de teste serão removidos.\n• O próximo pedido começará como Pedido #01.'
    );

    if (!confirmed) return;

    setIsResetting(true);
    setResetErrorMsg(null);
    setResetSuccessMsg(null);

    try {
      const res = await cleanAppKeepOnlyFrancisca();
      setResetSuccessMsg(
        `Limpeza concluída com sucesso! ${res.deletedOrders} pedidos e ${res.deletedPayments} pagamentos de teste foram apagados. Os saldos estão em R$ 0,00 e apenas a Dona Francisca está salva como cliente. O próximo pedido será o #01.`
      );
    } catch (err: any) {
      console.error(err);
      setResetErrorMsg('Erro ao executar limpeza: ' + (err?.message || err));
    } finally {
      setIsResetting(false);
    }
  };

  // Tab 4: Diagnostics & APK
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const currentAppUrl = getPublicAppUrl();
  const publicHostname = getPublicHostname();
  const pwaBuilderUrl = `https://www.pwabuilder.com?url=${encodeURIComponent(currentAppUrl)}`;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-red-800" />
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Configurações do Sistema & Perfil
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Altere seus dados pessoais, senha de acesso, preços dos pães ou zere o histórico de teste.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 gap-2 mt-5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={`pb-3 px-4 font-black text-xs uppercase transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'dados'
                ? 'border-red-800 text-red-800'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <UserCog className="w-4 h-4" />
            <span>Meus Dados & Senha</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('precos')}
            className={`pb-3 px-4 font-black text-xs uppercase transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'precos'
                ? 'border-red-800 text-red-800'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Preços dos Pães</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('zerar')}
            className={`pb-3 px-4 font-black text-xs uppercase transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'zerar'
                ? 'border-amber-600 text-amber-900 bg-amber-50/60 rounded-t-xl'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Trash2 className="w-4 h-4 text-amber-600" />
            <span>Zerar Valores & Só Dona Francisca</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`pb-3 px-4 font-black text-xs uppercase transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'apk'
                ? 'border-red-800 text-red-800'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>APK & Conexão Firebase</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MEUS DADOS & SENHA (ADMIN) */}
      {activeTab === 'dados' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-stone-200 max-w-2xl">
          <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-red-800 text-amber-300 flex items-center justify-center font-black shadow-md">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">
                Meus Dados Pessoais & Senha de Acesso
              </h3>
              <p className="text-xs text-stone-500">
                Altere seu nome de exibição, celular, nome de usuário e senha de login
              </p>
            </div>
          </div>

          {profileSuccess && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveAdminProfile} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Nome Completo / Como deseja ser chamado *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ex: Wiliam - Panificadora Morumbi"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Phone / WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Celular / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Nome de Usuário (para entrar sem digitar e-mail)
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                placeholder="Ex: admin ou wiliam"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Você pode usar este usuário para fazer login rapidamente em qualquer celular.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Sua Senha de Acesso *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Mínimo 6 dígitos (ex: 123456)"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                Senha simples e direta para acesso no aplicativo (mínimo de 6 dígitos).
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                E-mail Vinculado (Opcional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="seuemail@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-3 bg-red-800 hover:bg-red-900 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>{savingProfile ? 'Salvando...' : 'Salvar Meus Dados & Senha'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PREÇOS DOS PÃES */}
      {activeTab === 'precos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
            <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
                <Croissant className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Preços Oficiais dos Pães</h3>
                <p className="text-xs text-stone-500">Tabela de Revenda e Varejo</p>
              </div>
            </div>

            {priceSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{priceSuccess}</span>
              </div>
            )}

            {priceError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{priceError}</span>
              </div>
            )}

            <form onSubmit={handleSavePrices} className="space-y-4 mt-4">
              <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block mb-2">
                  1. Tabela de Revenda (Revendedores Cadastrados)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Pão Francês (Salgado)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.10"
                        value={priceSalty}
                        onChange={(e) => setPriceSalty(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Pão Doce
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.10"
                        value={priceSweet}
                        onChange={(e) => setPriceSweet(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-black uppercase text-stone-600 tracking-wider block mb-2">
                  2. Tabela de Varejo (Consumidor Final - Sem Sobras)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Varejo Salgado
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.10"
                        value={retailPriceSalty}
                        onChange={(e) => setRetailPriceSalty(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Varejo Doce
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.10"
                        value={retailPriceSweet}
                        onChange={(e) => setRetailPriceSweet(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPrices}
                className="w-full py-3 bg-red-800 hover:bg-red-900 text-white font-black text-xs uppercase rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>{savingPrices ? 'Gravando Preços...' : 'Salvar Todos os Preços'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: ZERAR VALORES & MANTER SÓ DONA FRANCISCA */}
      {activeTab === 'zerar' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-stone-200 max-w-2xl space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">
                Limpeza de Testes & Zerar Aplicativo
              </h3>
              <p className="text-xs text-stone-500">
                Deixar somente o usuário da Dona Francisca e zerar todos os valores para começar pra valer
              </p>
            </div>
          </div>

          {resetSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm font-black text-emerald-950">Valores Zerados com Sucesso!</span>
              </div>
              <p className="leading-relaxed text-emerald-800">{resetSuccessMsg}</p>
            </div>
          )}

          {resetErrorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{resetErrorMsg}</span>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-white to-amber-50 border-2 border-amber-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Zerar Valores e Manter Apenas Dona Francisca</span>
              </span>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Começar do Pedido #01
              </span>
            </div>

            <p className="text-stone-700 text-xs leading-relaxed">
              Esta ação foi preparada exatamente para o início da operação real:
            </p>

            <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-inside">
              <li>Apaga todos os pedidos de teste (o saldo geral e o extrato voltam para <strong>R$ 0,00</strong>).</li>
              <li>Apaga todos os pagamentos e acertos de teste já feitos.</li>
              <li>Exclui os clientes fictícios criados para teste.</li>
              <li>
                <strong>Mantém o cadastro da Dona Francisca</strong> pronto como revendedora, com usuário para login e saldo zerado.
              </li>
              <li>O próximo pedido que você lançar para ela será automaticamente o <strong>Pedido #01</strong>.</li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={handleRunResetFrancisca}
                className="w-full py-3.5 bg-red-800 hover:bg-red-900 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-amber-300" />
                <span>
                  {isResetting
                    ? 'Limpando dados de teste...'
                    : 'Executar: Zerar Todo o Histórico e Deixar Apenas Dona Francisca'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: APK & CONEXÃO FIREBASE */}
      {activeTab === 'apk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 2: PWABuilder Android APK Generator */}
          <div className="bg-gradient-to-br from-stone-900 to-red-950 text-white rounded-3xl p-6 shadow-md border border-red-800">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Central do Aplicativo Android (APK)</h3>
                <p className="text-xs text-stone-300">Instalação e distribuição para celulares</p>
              </div>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                <span className="font-bold text-amber-300 text-[10px] uppercase block mb-1">
                  1. Instalação Imediata no Celular (Sem Loja)
                </span>
                <p className="text-[11px] text-stone-300 mb-2">
                  Qualquer pessoa com o link oficial pode clicar no botão abaixo para instalar o app na tela inicial:
                </p>
                <PWAInstallButton className="w-full" />
              </div>

              <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-300 text-[10px] uppercase block">
                    2. Gerador Oficial de APK (PWABuilder)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white">
                    100% Gratuito
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 mb-2 leading-relaxed">
                  Gere o arquivo instalador <strong>.apk</strong> com 1 clique através do PWABuilder (ferramenta oficial da Microsoft/Google).
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
        </div>
      )}
    </div>
  );
};
