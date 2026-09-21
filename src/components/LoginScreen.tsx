import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Sparkles,
  HelpCircle,
  ArrowLeft,
  KeyRound,
  Mail,
  Phone
} from 'lucide-react';
import { ProfileId, ProfileConfig, UserSession } from '../types';
import { 
  validateLogin, 
  getStoredCredentials, 
  getUserProfileData, 
  verifyRecoveryData, 
  resetPasswordWithRecovery 
} from '../utils/auth';

interface LoginScreenProps {
  profilesConfig: Record<ProfileId, ProfileConfig>;
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  profilesConfig,
  onLoginSuccess,
}) => {
  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('transuniao123');
  const [selectedProfile, setSelectedProfile] = useState<ProfileId>('perfil_1');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Password Recovery Flow state
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'verify' | 'new_password'>('verify');
  const [verifiedName, setVerifiedName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState('');

  // --- Handlers: Standard Login ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('Por favor, informe o usuário ou e-mail de acesso.');
      return;
    }
    if (!password) {
      setErrorMsg('Por favor, informe a senha de acesso.');
      return;
    }

    const isValid = validateLogin(username, password);

    if (isValid) {
      const session: UserSession = {
        isAuthenticated: true,
        username: username.trim(),
        loginTime: new Date().toISOString(),
        activeProfileId: selectedProfile,
        rememberMe,
      };
      onLoginSuccess(session);
    } else {
      setErrorMsg('Credenciais incorretas. Verifique o usuário e a senha informados.');
    }
  };

  const handleQuickLogin = (profileId: ProfileId) => {
    const creds = getStoredCredentials();
    const session: UserSession = {
      isAuthenticated: true,
      username: creds.username || 'admin',
      loginTime: new Date().toISOString(),
      activeProfileId: profileId,
      rememberMe: true,
    };
    onLoginSuccess(session);
  };

  // --- Handlers: Password Recovery by Personal Data ---
  const handleStartRecovery = () => {
    setIsRecoveryMode(true);
    setRecoveryStep('verify');
    setRecoveryInput('');
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorMsg('');
    setRecoverySuccessMsg('');
  };

  const handleBackToLogin = () => {
    setIsRecoveryMode(false);
    setRecoveryStep('verify');
    setErrorMsg('');
    setRecoverySuccessMsg('');
  };

  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!recoveryInput.trim()) {
      setErrorMsg('Informe o e-mail ou o telefone cadastrado no sistema.');
      return;
    }

    const verification = verifyRecoveryData(recoveryInput);

    if (verification.success) {
      const userProfile = getUserProfileData();
      setVerifiedName(userProfile.nomeCompleto);
      setRecoveryStep('new_password');
    } else {
      setErrorMsg(verification.message || 'Dados de contato não encontrados no cadastro do sistema.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('A confirmação de senha não confere.');
      return;
    }

    resetPasswordWithRecovery(newPassword);
    setPassword(newPassword);
    setRecoverySuccessMsg('Senha redefinida com sucesso! Você já pode realizar o login com a nova senha.');

    setTimeout(() => {
      setIsRecoveryMode(false);
      setRecoveryStep('verify');
      setRecoverySuccessMsg('');
    }, 2500);
  };

  const profile1 = profilesConfig.perfil_1;
  const profile2 = profilesConfig.perfil_2;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Icon and Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 shadow-xl mb-4">
            <Building2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Transunião
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestão Financeira & Controle Empresarial
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acesso Restrito & Seguro</span>
          </div>
        </div>

        {/* Card Container */}
        <div className="mt-6 bg-slate-800/90 backdrop-blur-md py-8 px-5 sm:px-8 shadow-2xl rounded-2xl border border-slate-700">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {recoverySuccessMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold">Sucesso!</p>
                <p className="text-xs text-emerald-200 mt-0.5">{recoverySuccessMsg}</p>
              </div>
            </div>
          )}

          {/* MODE 1: Standard Login Form */}
          {!isRecoveryMode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Usuário ou E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin ou seu e-mail"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Senha de Acesso
                  </label>
                  {/* Link para redefinição caso o usuário esqueça a senha */}
                  <button
                    type="button"
                    id="btn-link-esqueci-senha"
                    onClick={handleStartRecovery}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer font-medium flex items-center gap-1"
                    title="Clique para recuperar o acesso com seus dados pessoais cadastrados"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Esqueceu a senha?</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-10 py-2 bg-slate-900/80 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Profile Selector (2 Independent Profiles) */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Selecione o Perfil para Acessar:</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Lançamentos Independentes
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Profile 1 */}
                  <button
                    type="button"
                    id="btn-select-profile-1"
                    onClick={() => setSelectedProfile('perfil_1')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedProfile === 'perfil_1'
                        ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Building2 className="w-4 h-4" />
                      </span>
                      {selectedProfile === 'perfil_1' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate">
                        {profile1.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {profile1.subtitle}
                      </p>
                    </div>
                  </button>

                  {/* Profile 2 */}
                  <button
                    type="button"
                    id="btn-select-profile-2"
                    onClick={() => setSelectedProfile('perfil_2')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedProfile === 'perfil_2'
                        ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Building className="w-4 h-4" />
                      </span>
                      {selectedProfile === 'perfil_2' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate">
                        {profile2.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {profile2.subtitle}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="ml-2">Manter conectado</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-login-submit"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Acessar {selectedProfile === 'perfil_1' ? profile1.name : profile2.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* MODE 2: Password Recovery Form (Validação de Dados Pessoais) */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Recuperação de Senha
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Confirmação por dados pessoais cadastrados
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>
              </div>

              {recoveryStep === 'verify' ? (
                /* Step 1: Confirm registered email or phone */
                <form onSubmit={handleVerifyIdentity} className="space-y-4">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/70 text-xs text-slate-300 space-y-1">
                    <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verificação de Segurança</span>
                    </p>
                    <p className="text-[11.5px] text-slate-400 leading-relaxed">
                      Informe o <strong>e-mail</strong> ou o <strong>telefone</strong> cadastrado na sua conta para validar sua identidade e redefinir a senha.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      E-mail ou Telefone Cadastrado
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="input-recovery-contact"
                        required
                        value={recoveryInput}
                        onChange={(e) => setRecoveryInput(e.target.value)}
                        placeholder="Ex: faturamentotransuniao@gmail.com ou (11) 98765-4321"
                        className="block w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="w-1/3 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      id="btn-verify-recovery"
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Verificar Meus Dados</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Set New Password after verification */
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Identidade confirmada!</p>
                      <p className="text-[11.5px] text-emerald-200 mt-0.5">
                        Titular: <strong>{verifiedName}</strong>. Defina sua nova senha abaixo:
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      id="input-recovery-newpass"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="block w-full px-3 py-2 bg-slate-900/80 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      id="input-recovery-confirmpass"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="block w-full px-3 py-2 bg-slate-900/80 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep('verify')}
                      className="w-1/3 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      id="btn-confirm-new-password"
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer"
                    >
                      Salvar Nova Senha
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Quick Access Helper & 1-Click Entry Buttons */}
          {!isRecoveryMode && (
            <div className="mt-6 pt-5 border-t border-slate-700/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Acesso Rápido de Operador:</span>
                </span>
                <span className="text-[10px] text-slate-500">1 clique</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-quick-login-p1"
                  onClick={() => handleQuickLogin('perfil_1')}
                  className="py-2 px-2.5 rounded-lg bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-700/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">Entrar Perfil 1</span>
                </button>

                <button
                  type="button"
                  id="btn-quick-login-p2"
                  onClick={() => handleQuickLogin('perfil_2')}
                  className="py-2 px-2.5 rounded-lg bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-700/40 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span className="truncate">Entrar Perfil 2</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                Credenciais padrão: <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded">admin</code> / <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded">transuniao123</code>
              </p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Transunião • Cada perfil possui sua própria base de pagamentos, boletos, NFs e OS 100% isoladas.
        </p>
      </div>
    </div>
  );
};
