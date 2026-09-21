import React, { useState } from 'react';
import { X, Building2, Building, Check, Save } from 'lucide-react';
import { ProfileId, ProfileConfig } from '../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profilesConfig: Record<ProfileId, ProfileConfig>;
  onSaveProfiles: (updatedConfig: Record<ProfileId, ProfileConfig>) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profilesConfig,
  onSaveProfiles,
}) => {
  const [config, setConfig] = useState<Record<ProfileId, ProfileConfig>>(profilesConfig);

  if (!isOpen) return null;

  const handleUpdate = (id: ProfileId, field: keyof ProfileConfig, val: string) => {
    setConfig(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: val,
      }
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfiles(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Personalizar Perfis de Trabalho
              </h3>
              <p className="text-xs text-slate-500">
                Altere os nomes das empresas/unidades para refletir sua estrutura
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Perfil 1 */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Configuração do Perfil 1</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome de Exibição do Perfil 1
              </label>
              <input
                type="text"
                required
                value={config.perfil_1.name}
                onChange={e => handleUpdate('perfil_1', 'name', e.target.value)}
                placeholder="Ex: Transunião Matriz"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subtítulo / Descrição
                </label>
                <input
                  type="text"
                  value={config.perfil_1.subtitle}
                  onChange={e => handleUpdate('perfil_1', 'subtitle', e.target.value)}
                  placeholder="Ex: Operação Rodoviária"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CNPJ / Documento (Opcional)
                </label>
                <input
                  type="text"
                  value={config.perfil_1.documento || ''}
                  onChange={e => handleUpdate('perfil_1', 'documento', e.target.value)}
                  placeholder="Ex: 00.000.000/0001-00"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Perfil 2 */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
            <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Configuração do Perfil 2</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome de Exibição do Perfil 2
              </label>
              <input
                type="text"
                required
                value={config.perfil_2.name}
                onChange={e => handleUpdate('perfil_2', 'name', e.target.value)}
                placeholder="Ex: Transunião Filial"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subtítulo / Descrição
                </label>
                <input
                  type="text"
                  value={config.perfil_2.subtitle}
                  onChange={e => handleUpdate('perfil_2', 'subtitle', e.target.value)}
                  placeholder="Ex: Manutenção / Filial"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CNPJ / Documento (Opcional)
                </label>
                <input
                  type="text"
                  value={config.perfil_2.documento || ''}
                  onChange={e => handleUpdate('perfil_2', 'documento', e.target.value)}
                  placeholder="Ex: 00.000.000/0002-00"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
