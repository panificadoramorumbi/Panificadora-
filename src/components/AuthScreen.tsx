import React, { useState } from 'react';
import {
  Croissant,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Database,
  Smartphone,
  KeyRound,
  X,
  MessageCircle,
  Tag,
  Phone,
  Calendar,
  DollarSign,
  Send,
  User,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FIREBASE_INFO, testConnection } from '../lib/firebase';
import { PWAInstallButton } from './PWAInstallButton';
import { createRetailOrder, DEFAULT_PRICES } from '../services/dataService';
import { formatCurrency, buildWhatsAppLink } from '../utils/formatters';

export const AuthScreen: React.FC = () => {
  const { login, resetPassword, loginWithGoogle, registerAccount } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  // Self-Registration Form State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('123456');
  const [regEmail, setRegEmail] = useState('');

  // Retail Consumer Order Modal State
  const [showRetailModal, setShowRetailModal] = useState(false);
  const [retailCustomerName, setRetailCustomerName] = useState('');
  const [retailCustomerPhone, setRetailCustomerPhone] = useState('');
  const [retailDeliveryDate, setRetailDeliveryDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [retailQtySalty, setRetailQtySalty] = useState(20);
  const [retailQtySweet, setRetailQtySweet] = useState(0);
  const [retailNotes, setRetailNotes] = useState('');
  const [submittingRetail, setSubmittingRetail] = useState(false);
  const [retailSuccessData, setRetailSuccessData] = useState<{
    orderNumber: string;
    total: number;
    whatsappUrl: string;
  } | null>(null);
  const [retailError, setRetailError] = useState<string | null>(null);

  const handleRetailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRetailError(null);

    if (!retailCustomerName.trim()) {
      setRetailError('Por favor, informe seu nome para a encomenda.');
      return;
    }

    if (!retailCustomerPhone.trim()) {
      setRetailError('Por favor, informe seu WhatsApp para confirmação do pedido.');
      return;
    }

    if (retailQtySalty <= 0 && retailQtySweet <= 0) {
      setRetailError('Informe a quantidade de pães salgados ou doces.');
      return;
    }

    setSubmittingRetail(true);
    try {
      const orderId = await createRetailOrder({
        customerName: retailCustomerName.trim(),
        customerPhone: retailCustomerPhone.trim(),
        orderDate: new Date().toISOString().slice(0, 10),
        deliveryDate: retailDeliveryDate,
        qtySalty: Number(retailQtySalty),
        qtySweet: Number(retailQtySweet),
        notes: retailNotes.trim(),
        currentPrices: DEFAULT_PRICES,
        registeredBy: 'Consumidor Varejo (Site)',
      });

      const total = Number(
        (
          retailQtySalty * DEFAULT_PRICES.retailPriceSalty +
          retailQtySweet * DEFAULT_PRICES.retailPriceSweet
        ).toFixed(2)
      );

      const orderNum = orderId ? `#${orderId.slice(0, 6).toUpperCase()}` : 'VAREJO';

      const whatsappMsg = `🥖 *PANIFICADORA MORUMBI* 🥖
*NOVA ENCOMENDA DE PÃES (VAREJO)*

Olá! Gostaria de confirmar minha encomenda de pães:
👤 *Cliente:* ${retailCustomerName.trim()}
📱 *WhatsApp:* ${retailCustomerPhone.trim()}
📅 *Data para Retirada:* ${retailDeliveryDate}

🥐 *Pães Salgados (R$ 1,00):* ${retailQtySalty} un.
🧁 *Pães Doces (R$ 1,50):* ${retailQtySweet} un.
💰 *Valor Total:* ${formatCurrency(total)}
${retailNotes.trim() ? `📝 *Observação:* ${retailNotes.trim()}\n` : ''}
Aguardando confirmação da padaria!`;

      // Admin / Bakery contact WhatsApp (default to phone or customer phone)
      const whatsappUrl = buildWhatsAppLink('', whatsappMsg);

      setRetailSuccessData({
        orderNumber: orderNum,
        total,
        whatsappUrl,
      });
    } catch (err: any) {
      console.error(err);
      setRetailError('Erro ao registrar encomenda: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setSubmittingRetail(false);
    }
  };

  const handleCloseRetailModal = () => {
    setShowRetailModal(false);
    setRetailSuccessData(null);
    setRetailError(null);
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Falha no login com Google:', err);
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        // Janela fechada pelo usuário
      } else if (err?.code === 'auth/unauthorized-domain') {
        setErrorMsg(
          'Atenção: Para o Google liberar o login de outros usuários neste link, este domínio precisa estar cadastrado no Firebase Console (Authentication -> Configurações -> Domínios autorizados).'
        );
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMsg(
          'O navegador bloqueou a janela do Google. Permita pop-ups ou tente novamente.'
        );
      } else {
        setErrorMsg(
          'Não foi possível autenticar com o Google: ' + (err?.message || 'Tente novamente.')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // REGISTRATION FLOW
    if (authMode === 'register') {
      if (!regName.trim()) {
        setErrorMsg('Por favor, informe seu nome completo.');
        return;
      }
      if (!regPhone.trim()) {
        setErrorMsg('Por favor, informe seu número de WhatsApp.');
        return;
      }
      if (!regPassword || regPassword.length < 6) {
        setErrorMsg('A senha de acesso deve ter pelo menos 6 dígitos (ex: 123456).');
        return;
      }

      setLoading(true);
      try {
        await registerAccount({
          displayName: regName.trim(),
          phone: regPhone.trim(),
          username: regUsername.trim() || regName.trim().toLowerCase().split(' ')[0],
          pass: regPassword,
          email: regEmail.trim() || undefined,
        });
        // Automatically signed in by Firebase
      } catch (err: any) {
        console.error('Falha de cadastro:', err);
        if (err?.code === 'auth/email-already-in-use') {
          setErrorMsg('Este nome de usuário ou e-mail já está em uso. Por favor, escolha outro.');
        } else {
          setErrorMsg('Erro ao criar conta: ' + (err?.message || 'Tente novamente.'));
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // LOGIN FLOW
    if (!email) {
      setErrorMsg('Por favor, informe seu usuário ou e-mail.');
      return;
    }

    if (isForgotPassword) {
      setLoading(true);
      try {
        await resetPassword(email);
        setSuccessMsg(
          'E-mail de recuperação enviado! Verifique sua caixa de entrada e spam.'
        );
      } catch (err: any) {
        setErrorMsg(
          err?.code === 'auth/user-not-found'
            ? 'E-mail não encontrado no sistema.'
            : 'Erro ao enviar e-mail de recuperação. Verifique os dados.'
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Por favor, informe sua senha.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error('Falha de login:', err);
      let friendly = 'Falha ao autenticar. Verifique seus dados de acesso.';
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
        friendly = 'Usuário ou senha incorretos.';
      } else if (err?.code === 'auth/user-not-found') {
        friendly = 'Usuário não encontrado no sistema.';
      } else if (err?.code === 'auth/too-many-requests') {
        friendly = 'Muitas tentativas sem sucesso. Aguarde alguns instantes.';
      }
      setErrorMsg(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleTestDb = async () => {
    setConnectionStatus('Testando conexão com o Firestore...');
    const res = await testConnection();
    setConnectionStatus(res.message);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950 via-red-900 to-stone-900 opacity-95 -z-10" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500 text-stone-950 shadow-2xl mb-4 border-2 border-amber-300">
            <Croissant className="w-11 h-11" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            PANIFICADORA MORUMBI
          </h1>
          <p className="text-amber-300 font-bold text-sm tracking-wide mt-1 uppercase">
            Sistema de Revenda de Pães
          </p>
          <p className="text-stone-300 text-xs mt-1">
            Gestão de pedidos, sobras e acertos em tempo real
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200">
          {/* Auth Mode Toggle Tabs */}
          <div className="flex p-1 bg-stone-100 rounded-2xl mb-6 border border-stone-200">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
                setIsForgotPassword(false);
              }}
              className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition cursor-pointer text-center ${
                authMode === 'login'
                  ? 'bg-red-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Já tenho Conta
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
                setIsForgotPassword(false);
              }}
              className={`flex-1 py-2.5 text-xs font-black uppercase rounded-xl transition cursor-pointer text-center ${
                authMode === 'register'
                  ? 'bg-red-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Criar Conta Grátis
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-black text-stone-900">
              {authMode === 'register'
                ? 'Cadastro Rápido de Revendedor'
                : isForgotPassword
                ? 'Recuperação de Acesso'
                : 'Entrar no Sistema'}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {authMode === 'register'
                ? 'Crie seu acesso em 10 segundos para fazer pedidos de pães'
                : isForgotPassword
                ? 'Informe seu e-mail cadastrado para redefinir sua senha'
                : 'Acesse com seu usuário/e-mail e senha cadastrados'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' ? (
              <>
                {/* Registration Fields */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Seu Nome Completo *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRegName(val);
                        if (!regUsername) {
                          const first = val.trim().toLowerCase().split(' ')[0].replace(/[^a-z0-9._-]/g, '');
                          setRegUsername(first);
                        }
                      }}
                      placeholder="Ex: Carlos Silva"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Seu WhatsApp / Celular *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Nome de Usuário (Login) *
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      Sem e-mail!
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Tag className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) =>
                        setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))
                      }
                      placeholder="Ex: carlos"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-bold text-stone-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Crie uma Senha Simples *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 dígitos (ex: 123456)"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white transition"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Login Fields */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    {isForgotPassword ? 'E-mail cadastrado' : 'Usuário ou E-mail'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      {email.includes('@') ? (
                        <Mail className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <input
                      type={isForgotPassword ? 'email' : 'text'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        isForgotPassword
                          ? 'seu-email@gmail.com'
                          : 'Ex: carlos ou seu-email@gmail.com'
                      }
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white transition"
                    />
                  </div>
                  {!isForgotPassword && (
                    <p className="text-[11px] text-stone-400 mt-1">
                      Revendedores podem entrar digitando apenas seu <strong>nome de usuário</strong> (ex: carlos).
                    </p>
                  )}
                </div>

                {!isForgotPassword && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Senha
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="text-xs text-red-800 font-bold hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white transition"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-red-800 hover:bg-red-900 active:scale-98 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : authMode === 'register' ? (
                <>
                  <span>Criar Conta e Entrar</span>
                  <UserPlus className="w-4 h-4" />
                </>
              ) : isForgotPassword ? (
                <>
                  <span>Enviar E-mail de Recuperação</span>
                  <KeyRound className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Acessar Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {isForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMsg(null);
                }}
                className="w-full py-2.5 text-xs text-stone-600 font-bold hover:text-stone-900 transition text-center"
              >
                Voltar para o login
              </button>
            )}
          </form>

          {/* Quick-fill for configured admin */}
          <div className="mt-6 pt-5 border-t border-stone-100 space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-semibold">Conta Administrativa:</span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setEmail(FIREBASE_INFO.adminEmail);
                  setIsForgotPassword(false);
                }}
                className="text-red-800 font-bold hover:underline flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                Preencher Administrador
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-stone-400">
                <span className="bg-white px-2">Ou acesse com sua conta</span>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 bg-white hover:bg-stone-50 active:scale-98 border border-stone-300 hover:border-stone-400 text-stone-800 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Entrar com Conta Google</span>
            </button>

            {/* Direct Order for Retail Customers (R$ 1,00) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowRetailModal(true)}
                className="w-full py-3 px-4 bg-amber-500/15 hover:bg-amber-500/25 border-2 border-amber-400/60 text-amber-950 font-black text-xs rounded-2xl transition flex items-center justify-center gap-2"
              >
                <Croissant className="w-4 h-4 text-amber-600" />
                <span>Fazer Encomenda de Pães (Consumidor R$ 1,00)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Database Diagnostic & Project Status */}
        <div className="mt-4 p-4 rounded-2xl bg-red-950/80 border border-red-800/60 text-xs text-stone-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Database className="w-4 h-4" />
              <span>Conexão Firebase</span>
            </div>
            <button
              onClick={handleTestDb}
              className="text-[11px] underline text-amber-400 font-bold hover:text-amber-300"
            >
              Testar Conexão
            </button>
          </div>
          <p className="text-[11px] text-stone-300">
            Projeto conectado: <strong className="text-white">{FIREBASE_INFO.projectId}</strong>
          </p>
          {connectionStatus && (
            <p className="mt-1 text-[11px] text-amber-200 font-semibold">{connectionStatus}</p>
          )}
        </div>

        {/* PWA Install prompt on mobile */}
        <div className="mt-4">
          <PWAInstallButton variant="banner" />
        </div>
      </div>

      {/* Retail Customer Order Modal */}
      {showRetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow">
                  <Croissant className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">
                    Encomenda Direta de Pães
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Tag className="w-3 h-3 text-amber-700" />
                      Varejo: Salgado R$ 1,00 | Doce R$ 1,50
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseRetailModal}
                className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6">
              {retailSuccessData ? (
                <div className="text-center py-4 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-stone-900">
                      Encomenda Registrada!
                    </h4>
                    <p className="text-sm text-stone-600 mt-1">
                      Identificador:{' '}
                      <strong className="text-red-900 font-black">
                        {retailSuccessData.orderNumber}
                      </strong>
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Total a pagar na retirada:{' '}
                      <strong className="text-emerald-700 text-sm">
                        {formatCurrency(retailSuccessData.total)}
                      </strong>
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-stone-700 space-y-1">
                    <p className="font-bold text-amber-950">Próximos passos:</p>
                    <p>
                      1. Sua encomenda foi salva com sucesso no sistema da Panificadora Morumbi.
                    </p>
                    <p>
                      2. Você pode enviar a confirmação agora mesmo para a padaria no WhatsApp.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <a
                      href={retailSuccessData.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Enviar Pedido no WhatsApp da Padaria</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCloseRetailModal}
                      className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition"
                    >
                      Concluir e Voltar
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRetailSubmit} className="space-y-4">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 font-medium">
                    🥖 <strong>Atenção:</strong> Esta opção é para consumidores finais comprando a <strong>R$ 1,00</strong> a unidade do pão salgado (sem devolução de sobras). Revendedores devem realizar login na tela inicial.
                  </div>

                  {retailError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                      <span>{retailError}</span>
                    </div>
                  )}

                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Seu Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={retailCustomerName}
                      onChange={(e) => setRetailCustomerName(e.target.value)}
                      placeholder="Ex: Maria Oliveira"
                      required
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Seu WhatsApp / Telefone *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={retailCustomerPhone}
                        onChange={(e) => setRetailCustomerPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Data de Retirada */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Data Desejada para Retirada *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        value={retailDeliveryDate}
                        onChange={(e) => setRetailDeliveryDate(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Quantidades */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-center">
                      <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                        Pães Salgados
                      </label>
                      <span className="text-[10px] text-amber-800 font-bold block mb-2">
                        R$ {DEFAULT_PRICES.retailPriceSalty.toFixed(2)} / un
                      </span>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRetailQtySalty(Math.max(0, retailQtySalty - 5))}
                          className="w-8 h-8 rounded-lg bg-stone-200 hover:bg-stone-300 font-black text-stone-700 transition"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={retailQtySalty}
                          onChange={(e) => setRetailQtySalty(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 text-center font-black text-stone-900 py-1 bg-white border border-stone-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setRetailQtySalty(retailQtySalty + 5)}
                          className="w-8 h-8 rounded-lg bg-stone-200 hover:bg-stone-300 font-black text-stone-700 transition"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-center">
                      <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                        Pães Doces
                      </label>
                      <span className="text-[10px] text-amber-800 font-bold block mb-2">
                        R$ {DEFAULT_PRICES.retailPriceSweet.toFixed(2)} / un
                      </span>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRetailQtySweet(Math.max(0, retailQtySweet - 5))}
                          className="w-8 h-8 rounded-lg bg-stone-200 hover:bg-stone-300 font-black text-stone-700 transition"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={retailQtySweet}
                          onChange={(e) => setRetailQtySweet(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 text-center font-black text-stone-900 py-1 bg-white border border-stone-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setRetailQtySweet(retailQtySweet + 5)}
                          className="w-8 h-8 rounded-lg bg-stone-200 hover:bg-stone-300 font-black text-stone-700 transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Resumo de Valor */}
                  <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-600 uppercase block">
                        Total Estimado
                      </span>
                      <span className="text-xs text-stone-500">
                        {retailQtySalty + retailQtySweet} pães no pedido
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-red-950">
                        {formatCurrency(
                          retailQtySalty * DEFAULT_PRICES.retailPriceSalty +
                            retailQtySweet * DEFAULT_PRICES.retailPriceSweet
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Observação */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Observações (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={retailNotes}
                      onChange={(e) => setRetailNotes(e.target.value)}
                      placeholder="Ex: Pães bem quentinhos para as 07h30, embalados separadamente..."
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-red-800 focus:bg-white"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submittingRetail}
                      className="w-full py-3.5 px-4 bg-red-800 hover:bg-red-900 active:scale-98 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingRetail ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Confirmar Encomenda</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
