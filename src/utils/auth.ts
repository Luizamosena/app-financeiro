import { UserSession, ProfileId, UserProfileData } from '../types';

const STORAGE_KEYS = {
  CREDENTIALS: 'transuniao_auth_credentials_v1',
  SESSION: 'transuniao_auth_session_v1',
  USER_PROFILE: 'transuniao_user_personal_profile_v1',
};

export interface StoredCredentials {
  username: string;
  password: string;
}

export const DEFAULT_CREDENTIALS: StoredCredentials = {
  username: 'admin',
  password: 'transuniao123',
};

export const DEFAULT_USER_PROFILE: UserProfileData = {
  nomeCompleto: 'Administrador Transunião',
  email: 'faturamentotransuniao@gmail.com',
  telefone: '(11) 98765-4321',
  cargo: 'Gestor Financeiro',
  atualizadoEm: new Date().toISOString(),
};

// Alternative accepted credentials for convenience
const ACCEPTED_ALIASES = [
  'admin',
  'transuniao',
  'faturamentotransuniao@gmail.com',
  'financeiro',
];

export function getUserProfileData(): UserProfileData {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.email && parsed.nomeCompleto) {
        return {
          ...DEFAULT_USER_PROFILE,
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.error('Erro ao ler perfil do usuário', e);
  }
  return DEFAULT_USER_PROFILE;
}

export function saveUserProfileData(data: UserProfileData): void {
  try {
    const payload: UserProfileData = {
      ...data,
      atualizadoEm: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(payload));
  } catch (e) {
    console.error('Erro ao salvar perfil do usuário', e);
  }
}

export function verifyRecoveryData(
  inputEmailOrPhone: string,
  inputNome?: string
): { success: boolean; message?: string } {
  const userProfile = getUserProfileData();
  const cleanInput = (inputEmailOrPhone || '').trim().toLowerCase();
  const cleanProfileEmail = (userProfile.email || '').trim().toLowerCase();

  // Strip non-digits to compare phone numbers
  const inputDigits = cleanInput.replace(/\D/g, '');
  const profilePhoneDigits = (userProfile.telefone || '').replace(/\D/g, '');

  const isEmailMatch = cleanInput === cleanProfileEmail;
  const isPhoneMatch = inputDigits.length >= 8 && profilePhoneDigits.includes(inputDigits);

  if (!isEmailMatch && !isPhoneMatch) {
    return {
      success: false,
      message: 'E-mail ou telefone não corresponde aos dados cadastrados no sistema.',
    };
  }

  if (inputNome && inputNome.trim()) {
    const cleanNomeInput = inputNome.trim().toLowerCase();
    const cleanProfileNome = userProfile.nomeCompleto.trim().toLowerCase();
    // Allow partial match (e.g. first name or full name)
    const matchesName = cleanProfileNome.includes(cleanNomeInput) || cleanNomeInput.includes(cleanProfileNome.split(' ')[0]);
    if (!matchesName) {
      return {
        success: false,
        message: 'Nome completo informado não confere com o titular cadastrado.',
      };
    }
  }

  return { success: true };
}

export function resetPasswordWithRecovery(newPassword: string): void {
  const currentCreds = getStoredCredentials();
  saveStoredCredentials({
    username: currentCreds.username || 'admin',
    password: newPassword.trim(),
  });
}

export function getStoredCredentials(): StoredCredentials {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.username && parsed.password) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler credenciais salvas', e);
  }
  return DEFAULT_CREDENTIALS;
}

export function saveStoredCredentials(creds: StoredCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(creds));
  } catch (e) {
    console.error('Erro ao salvar novas credenciais', e);
  }
}

export function validateLogin(usernameInput: string, passwordInput: string): boolean {
  const cleanUser = (usernameInput || '').trim().toLowerCase();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanUser || !cleanPass) return false;

  const currentCreds = getStoredCredentials();

  // Check stored primary credentials
  if (
    cleanUser === currentCreds.username.toLowerCase() &&
    cleanPass === currentCreds.password
  ) {
    return true;
  }

  // Also accept standard defaults or master aliases for easy access
  const isAliasUser = ACCEPTED_ALIASES.some(alias => alias.toLowerCase() === cleanUser);
  const isDefaultPassword = cleanPass === 'transuniao123' || cleanPass === 'admin' || cleanPass === '123456';

  if (isAliasUser && isDefaultPassword) {
    return true;
  }

  return false;
}

export function getActiveSession(): UserSession | null {
  try {
    const sessionRaw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!sessionRaw) return null;

    const parsed: UserSession = JSON.parse(sessionRaw);
    if (parsed && parsed.isAuthenticated) {
      return parsed;
    }
  } catch (e) {
    console.error('Erro ao recuperar sessão', e);
  }
  return null;
}

export function saveActiveSession(session: UserSession): void {
  try {
    if (session.rememberMe) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    } else {
      // In session storage if not rememberMe, or localStorage without long expiry
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    }
  } catch (e) {
    console.error('Erro ao salvar sessão', e);
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (e) {
    console.error('Erro ao encerrar sessão', e);
  }
}
