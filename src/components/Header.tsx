import React from 'react';
import { 
  Building2, 
  Download, 
  Upload, 
  RotateCcw, 
  LogOut, 
  User, 
  Layers, 
  KeyRound, 
  UserCheck,
  CloudCheck,
  CloudAlert
} from 'lucide-react';
import { PagamentoFeito, NotaFiscalEntrada, BoletoAPagar, ProfileId, ProfileConfig } from '../types';
import { FiltroData } from '../utils/dateFilter';
import { DateFilterBar } from './DateFilterBar';
import { ProfileSwitcher } from './ProfileSwitcher';

interface HeaderProps {
  pagamentos: PagamentoFeito[];
  notasFiscais: NotaFiscalEntrada[];
  boletos: BoletoAPagar[];
  filtroData: FiltroData;
  activeProfileId: ProfileId;
  profilesConfig: Record<ProfileId, ProfileConfig>;
  currentUser?: string;
  isCloudSynced?: boolean;
  onSwitchProfile: (novoPerfil: ProfileId) => void;
  onOpenEditProfileModal: () => void;
  onOpenChangePasswordModal?: () => void;
  onOpenUserProfileModal?: () => void;
  onLogout: () => void;
  onFilterChange: (novoFiltro: FiltroData) => void;
  onResetData: () => void;
  onExportData: () => void;
  onExportAmbosPerfis?: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportExcelGeral?: () => void;
  onExportPdfGeral?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pagamentos,
  notasFiscais,
  boletos,
  filtroData,
  activeProfileId,
  profilesConfig,
  currentUser = 'admin',
  isCloudSynced = true,
  onSwitchProfile,
  onOpenEditProfileModal,
  onOpenChangePasswordModal,
  onOpenUserProfileModal,
  onLogout,
  onFilterChange,
  onResetData,
  onExportData,
  onExportAmbosPerfis,
  onImportData,
  onExportExcelGeral,
  onExportPdfGeral,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const activeProfile = profilesConfig[activeProfileId];

  return (
    <header className="bg-white border-b border-slate-200">
      {/* Top Status Bar with Active Profile and User / Logout */}
      <div className={`border-b text-xs py-1.5 px-3 sm:px-5 lg:px-6 transition-colors ${
        activeProfileId === 'perfil_1'
          ? 'bg-emerald-900 text-emerald-100 border-emerald-950'
          : 'bg-indigo-900 text-indigo-100 border-indigo-950'
      }`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">
              Ambiente Ativo: {activeProfile.name}
            </span>
            {activeProfile.documento && (
              <span className="hidden sm:inline text-slate-300 font-mono text-[11px]">
                • {activeProfile.documento}
              </span>
            )}
            {/* Cloud Sync Status Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
              isCloudSynced
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
            }`} title="Sincronização em tempo real na nuvem entre navegadores e dispositivos">
              {isCloudSynced ? (
                <>
                  <CloudCheck className="w-3 h-3 text-emerald-300" />
                  <span>Nuvem Sincronizada (Firebase)</span>
                </>
              ) : (
                <>
                  <CloudAlert className="w-3 h-3 text-amber-300 animate-pulse" />
                  <span>Reconectando Nuvem...</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 opacity-90 text-[11px]">
              <User className="w-3.5 h-3.5" />
              <span>Conectado como: <strong>{currentUser}</strong></span>
            </span>

            {onOpenUserProfileModal && (
              <button
                type="button"
                id="btn-header-user-profile"
                onClick={onOpenUserProfileModal}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer text-xs"
                title="Acessar dados pessoais para recuperação de senha (Nome, E-mail, Telefone)"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Dados Pessoais</span>
              </button>
            )}

            {onOpenChangePasswordModal && (
              <button
                type="button"
                id="btn-header-change-password"
                onClick={onOpenChangePasswordModal}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer text-xs"
                title="Alterar senha de acesso ao sistema"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>Alterar Senha</span>
              </button>
            )}

            <button
              type="button"
              id="btn-logout-header"
              onClick={onLogout}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer text-xs"
              title="Encerrar sessão e bloquear o aplicativo"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-300" />
              <span>Sair / Bloquear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-sm ${
              activeProfileId === 'perfil_1' ? 'bg-slate-900 text-emerald-400' : 'bg-slate-900 text-indigo-400'
            }`}>
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Gestão Financeira Empresarial
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${
                  activeProfileId === 'perfil_1'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}>
                  {activeProfileId === 'perfil_1' ? 'Perfil 1' : 'Perfil 2'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {activeProfile.name} • {activeProfile.subtitle}
              </p>
            </div>
          </div>

          {/* Profile Switcher and Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Dual Profile Switcher Control */}
            <ProfileSwitcher
              activeProfileId={activeProfileId}
              profilesConfig={profilesConfig}
              onSwitchProfile={onSwitchProfile}
              onOpenEditModal={onOpenEditProfileModal}
              countBoletosCurrent={boletos.length}
              countPagamentosCurrent={pagamentos.length}
            />

            {/* Botão de Dados Pessoais do Usuário ao lado do perfil */}
            {onOpenUserProfileModal && (
              <button
                type="button"
                id="btn-open-user-profile"
                onClick={onOpenUserProfileModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-500 rounded-xl transition-all cursor-pointer shadow-xs"
                title="Acessar dados pessoais do usuário (Nome, E-mail, Telefone para recuperação de senha)"
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Dados Pessoais</span>
              </button>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={onImportData} 
              accept=".json" 
              className="hidden" 
            />
            
            <button
              id="btn-import-data"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Importar backup em formato JSON no perfil atual"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Importar</span>
            </button>

            <button
              id="btn-export-data"
              onClick={onExportData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Exportar backup dos dados deste perfil em JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Backup Perfil</span>
            </button>

            {onExportAmbosPerfis && (
              <button
                id="btn-export-both-profiles"
                onClick={onExportAmbosPerfis}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                title="Exportar backup geral de ambos os perfis reunidos"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Backup Geral (2 Perfis)</span>
              </button>
            )}

            <button
              id="btn-reset-sample"
              onClick={onResetData}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-transparent hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Restaurar dados padrão deste perfil"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar Exemplo</span>
            </button>
          </div>
        </div>

        {/* Date Filter Bar (Compact & Expandable) */}
        <div className="mt-4">
          <DateFilterBar
            filtro={filtroData}
            onFilterChange={onFilterChange}
            onExportExcelGeral={onExportExcelGeral}
            onExportPdfGeral={onExportPdfGeral}
          />
        </div>
      </div>
    </header>
  );
};
