import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Building, 
  ChevronDown, 
  ArrowLeftRight, 
  CheckCircle2, 
  Settings2,
  ShieldAlert
} from 'lucide-react';
import { ProfileId, ProfileConfig } from '../types';

interface ProfileSwitcherProps {
  activeProfileId: ProfileId;
  profilesConfig: Record<ProfileId, ProfileConfig>;
  onSwitchProfile: (targetId: ProfileId) => void;
  onOpenEditModal: () => void;
  countBoletosCurrent: number;
  countPagamentosCurrent: number;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  activeProfileId,
  profilesConfig,
  onSwitchProfile,
  onOpenEditModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProfile = profilesConfig[activeProfileId];
  const otherProfileId: ProfileId = activeProfileId === 'perfil_1' ? 'perfil_2' : 'perfil_1';
  const otherProfile = profilesConfig[otherProfileId];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Active Profile Pill / Trigger Button */}
      <button
        type="button"
        id="btn-profile-switcher-dropdown"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-left transition-all cursor-pointer shadow-xs ${
          activeProfileId === 'perfil_1'
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 hover:bg-emerald-100/90'
            : 'bg-indigo-50/90 border-indigo-300 text-indigo-950 hover:bg-indigo-100/90'
        }`}
        title="Clique para alternar entre Perfis ou configurar nomes"
      >
        <div className={`p-1.5 rounded-lg text-white ${
          activeProfileId === 'perfil_1' ? 'bg-emerald-600' : 'bg-indigo-600'
        }`}>
          {activeProfileId === 'perfil_1' ? (
            <Building2 className="w-4 h-4" />
          ) : (
            <Building className="w-4 h-4" />
          )}
        </div>

        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold truncate max-w-[150px] sm:max-w-[200px]">
              {activeProfile.name}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
              activeProfileId === 'perfil_1' 
                ? 'bg-emerald-200 text-emerald-800' 
                : 'bg-indigo-200 text-indigo-800'
            }`}>
              Ativo
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium truncate max-w-[170px]">
            {activeProfile.subtitle}
          </p>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Perfis de Lançamento
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenEditModal();
              }}
              className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Settings2 className="w-3 h-3" />
              <span>Personalizar nomes</span>
            </button>
          </div>

          <div className="p-2 space-y-1.5">
            {/* Perfil 1 item */}
            <div
              onClick={() => {
                if (activeProfileId !== 'perfil_1') {
                  onSwitchProfile('perfil_1');
                  setIsOpen(false);
                }
              }}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeProfileId === 'perfil_1'
                  ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg text-white ${
                  activeProfileId === 'perfil_1' ? 'bg-emerald-600' : 'bg-slate-500'
                }`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {profilesConfig.perfil_1.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {profilesConfig.perfil_1.subtitle}
                  </p>
                </div>
              </div>

              {activeProfileId === 'perfil_1' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition-colors shrink-0">
                  Acessar
                </span>
              )}
            </div>

            {/* Perfil 2 item */}
            <div
              onClick={() => {
                if (activeProfileId !== 'perfil_2') {
                  onSwitchProfile('perfil_2');
                  setIsOpen(false);
                }
              }}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                activeProfileId === 'perfil_2'
                  ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400/30'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg text-white ${
                  activeProfileId === 'perfil_2' ? 'bg-indigo-600' : 'bg-slate-500'
                }`}>
                  <Building className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {profilesConfig.perfil_2.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {profilesConfig.perfil_2.subtitle}
                  </p>
                </div>
              </div>

              {activeProfileId === 'perfil_2' ? (
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              ) : (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2 py-0.5 rounded-md transition-colors shrink-0">
                  Acessar
                </span>
              )}
            </div>
          </div>

          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Os lançamentos de cada perfil são 100% isolados e independentes.</span>
          </div>
        </div>
      )}
    </div>
  );
};
