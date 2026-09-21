import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Mail, 
  Phone, 
  User, 
  Briefcase, 
  ShieldCheck, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { UserProfileData } from '../types';
import { getUserProfileData, saveUserProfileData } from '../utils/auth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (message: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const [profile, setProfile] = useState<UserProfileData>(() => getUserProfileData());
  const [errorMsg, setErrorMsg] = useState('');
  const [successSave, setSuccessSave] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProfile(getUserProfileData());
      setErrorMsg('');
      setSuccessSave(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!profile.nomeCompleto.trim()) {
      setErrorMsg('Por favor, informe seu nome completo.');
      return;
    }

    if (!profile.email.trim() || !profile.email.includes('@')) {
      setErrorMsg('Por favor, insira um e-mail de cadastro válido.');
      return;
    }

    if (!profile.telefone.trim() || profile.telefone.replace(/\D/g, '').length < 8) {
      setErrorMsg('Por favor, insira um telefone válido com DDD (mínimo 8 dígitos).');
      return;
    }

    saveUserProfileData(profile);
    setSuccessSave(true);
    onSuccessToast('Dados pessoais atualizados com sucesso!');

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Dados Pessoais do Usuário</h2>
              <p className="text-xs text-slate-400">
                Informações para contato e recuperação de senha
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security recovery notice */}
        <div className="px-6 py-3 bg-emerald-50/80 border-b border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Segurança e Redefinição de Senha:</span>
            <p className="text-emerald-800 text-[11.5px] mt-0.5">
              O <strong>e-mail</strong> e <strong>telefone</strong> cadastrados abaixo são os dados de segurança solicitados na tela de login para confirmar sua identidade caso precise redefinir sua senha.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successSave && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">Dados salvos com sucesso! Fechando...</span>
            </div>
          )}

          {/* Nome Completo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome Completo *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="input-userprofile-nome"
                required
                value={profile.nomeCompleto}
                onChange={(e) => setProfile(prev => ({ ...prev, nomeCompleto: e.target.value }))}
                placeholder="Ex: João da Silva / Administrador Transunião"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* E-mail de Cadastro */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              E-mail de Cadastro (Recuperação de Senha) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                id="input-userprofile-email"
                required
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Ex: faturamentotransuniao@gmail.com"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Este endereço pode ser usado para validar e recuperar sua senha na tela de login.
            </p>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Telefone / WhatsApp de Contato *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="input-userprofile-telefone"
                required
                value={profile.telefone}
                onChange={(e) => setProfile(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="Ex: (11) 98765-4321"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Utilizado como método alternativo de confirmação na recuperação de acesso.
            </p>
          </div>

          {/* Cargo / Função (opcional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cargo / Função
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="input-userprofile-cargo"
                value={profile.cargo || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, cargo: e.target.value }))}
                placeholder="Ex: Gestor Financeiro / Faturamento"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-user-profile"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Dados</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
