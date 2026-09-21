import { 
  doc, 
  onSnapshot, 
  setDoc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ProfileId, 
  ProfileConfig, 
  ProfileData, 
  UserProfileData,
  PagamentoFeito,
  NotaFiscalEntrada,
  BoletoAPagar,
  OrdemServico
} from '../types';
import { 
  loadProfileData as loadLocalProfileData,
  saveProfileData as saveLocalProfileData,
  getProfilesConfig as getLocalProfilesConfig,
  saveProfilesConfig as saveLocalProfilesConfig
} from '../utils/profileStorage';
import { 
  getUserProfileData as getLocalUserProfile, 
  saveUserProfileData as saveLocalUserProfile,
  getStoredCredentials as getLocalCredentials,
  saveStoredCredentials as saveLocalCredentials,
  StoredCredentials
} from '../utils/auth';

// Collection and document constants in Firestore
const COLLECTIONS = {
  PROFILES_DATA: 'transuniao_profiles_data',
  SYSTEM_CONFIG: 'transuniao_system_config',
  USER_PROFILES: 'transuniao_user_profiles',
};

const DOCS = {
  PROFILES_CONFIG: 'profiles_config',
  ADMIN_PROFILE: 'admin_profile',
  CREDENTIALS: 'auth_credentials',
  FINANCIAL_OPTIONS: 'financial_options',
};

/**
 * Strips all undefined properties and symbols from objects and arrays,
 * preventing Firestore 'Unsupported field value: undefined' errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) {
    return null as unknown as T;
  }
  return JSON.parse(JSON.stringify(data));
}

/**
 * Real-time listener for profile data (pagamentos, notasFiscais, boletos, ordensServico).
 * Automatically reconciles any locally saved items that were created offline or before sync.
 */
export function subscribeToProfileData(
  profileId: ProfileId,
  onUpdate: (data: ProfileData) => void,
  onError?: (error: Error) => void
): () => void {
  const profileDocRef = doc(db, COLLECTIONS.PROFILES_DATA, profileId);

  const unsubscribe = onSnapshot(
    profileDocRef,
    async (snapshot) => {
      try {
        if (snapshot.exists()) {
          const firestoreData = snapshot.data();
          let firestorePagamentos: PagamentoFeito[] = Array.isArray(firestoreData.pagamentos) 
            ? firestoreData.pagamentos 
            : [];
          let firestoreNotas: NotaFiscalEntrada[] = Array.isArray(firestoreData.notasFiscais) 
            ? firestoreData.notasFiscais 
            : [];
          let firestoreBoletos: BoletoAPagar[] = Array.isArray(firestoreData.boletos) 
            ? firestoreData.boletos 
            : [];
          let firestoreOS: OrdemServico[] = Array.isArray(firestoreData.ordensServico) 
            ? firestoreData.ordensServico 
            : [];

          // Compare with local storage to avoid losing any launches made while offline or before sync
          const localData = loadLocalProfileData(profileId);
          let needsUpload = false;

          // Reconcile pagamentos
          const firestorePagIds = new Set(firestorePagamentos.map(p => p.id));
          const missingPagamentos = localData.pagamentos.filter(p => !firestorePagIds.has(p.id));
          if (missingPagamentos.length > 0) {
            firestorePagamentos = [...missingPagamentos, ...firestorePagamentos];
            needsUpload = true;
          }

          // Reconcile notas fiscais
          const firestoreNfIds = new Set(firestoreNotas.map(n => n.id));
          const missingNotas = localData.notasFiscais.filter(n => !firestoreNfIds.has(n.id));
          if (missingNotas.length > 0) {
            firestoreNotas = [...missingNotas, ...firestoreNotas];
            needsUpload = true;
          }

          // Reconcile boletos
          const firestoreBoletoIds = new Set(firestoreBoletos.map(b => b.id));
          const missingBoletos = localData.boletos.filter(b => !firestoreBoletoIds.has(b.id));
          if (missingBoletos.length > 0) {
            firestoreBoletos = [...missingBoletos, ...firestoreBoletos];
            needsUpload = true;
          }

          // Reconcile ordens de serviço
          const firestoreOsIds = new Set(firestoreOS.map(o => o.id));
          const missingOS = localData.ordensServico.filter(o => !firestoreOsIds.has(o.id));
          if (missingOS.length > 0) {
            firestoreOS = [...missingOS, ...firestoreOS];
            needsUpload = true;
          }

          const reconciledData: ProfileData = {
            pagamentos: firestorePagamentos,
            notasFiscais: firestoreNotas,
            boletos: firestoreBoletos,
            ordensServico: firestoreOS,
          };

          // If local items were found and merged, push back to Firestore immediately
          if (needsUpload) {
            const payload = sanitizeForFirestore({
              ...reconciledData,
              updatedAt: new Date().toISOString(),
            });
            await setDoc(profileDocRef, payload);
          }

          saveLocalProfileData(profileId, reconciledData);
          onUpdate(reconciledData);
        } else {
          // Document does not exist in Firestore yet: upload initial/local data
          const localData = loadLocalProfileData(profileId);
          try {
            const payload = sanitizeForFirestore({
              ...localData,
              updatedAt: new Date().toISOString(),
            });
            await setDoc(profileDocRef, payload);
          } catch (err) {
            console.warn(`[Firestore] Initial sync error for ${profileId}:`, err);
          }
          onUpdate(localData);
        }
      } catch (err) {
        console.error(`[Firestore] Snapshot processing error for ${profileId}:`, err);
        const fallback = loadLocalProfileData(profileId);
        onUpdate(fallback);
      }
    },
    (error) => {
      console.error(`[Firestore] Error subscribing to profile ${profileId}:`, error);
      if (onError) onError(error);
      onUpdate(loadLocalProfileData(profileId));
    }
  );

  return unsubscribe;
}

/**
 * Persist profile data to Firestore (and mirror to localStorage)
 */
export async function syncSaveProfileData(profileId: ProfileId, data: ProfileData): Promise<void> {
  // Mirror locally first for zero-latency UI
  saveLocalProfileData(profileId, data);

  try {
    const profileDocRef = doc(db, COLLECTIONS.PROFILES_DATA, profileId);
    const payload = sanitizeForFirestore({
      pagamentos: data.pagamentos,
      notasFiscais: data.notasFiscais,
      boletos: data.boletos,
      ordensServico: data.ordensServico,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(profileDocRef, payload);
  } catch (error) {
    console.error(`[Firestore] Failed to save profile ${profileId}:`, error);
  }
}

/**
 * Real-time listener for profiles configuration (names, CNPJs, colors)
 */
export function subscribeToProfilesConfig(
  onUpdate: (config: Record<ProfileId, ProfileConfig>) => void
): () => void {
  const configDocRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, DOCS.PROFILES_CONFIG);

  const unsubscribe = onSnapshot(
    configDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.config && data.config.perfil_1 && data.config.perfil_2) {
          saveLocalProfilesConfig(data.config);
          onUpdate(data.config);
          return;
        }
      }
      const localConfig = getLocalProfilesConfig();
      try {
        const payload = sanitizeForFirestore({
          config: localConfig,
          updatedAt: new Date().toISOString(),
        });
        await setDoc(configDocRef, payload);
      } catch (err) {
        console.warn('[Firestore] Config sync warning:', err);
      }
      onUpdate(localConfig);
    },
    (err) => {
      console.error('[Firestore] Error subscribing to profiles config:', err);
      onUpdate(getLocalProfilesConfig());
    }
  );

  return unsubscribe;
}

/**
 * Persist profiles config to Firestore
 */
export async function syncSaveProfilesConfig(config: Record<ProfileId, ProfileConfig>): Promise<void> {
  saveLocalProfilesConfig(config);
  try {
    const configDocRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, DOCS.PROFILES_CONFIG);
    const payload = sanitizeForFirestore({
      config,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(configDocRef, payload);
  } catch (error) {
    console.error('[Firestore] Failed to save profiles config:', error);
  }
}

/**
 * Real-time listener for user administrative profile
 */
export function subscribeToUserProfile(
  onUpdate: (profile: UserProfileData) => void
): () => void {
  const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, DOCS.ADMIN_PROFILE);

  const unsubscribe = onSnapshot(
    userDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfileData;
        saveLocalUserProfile(data);
        onUpdate(data);
      } else {
        const local = getLocalUserProfile();
        try {
          const payload = sanitizeForFirestore(local);
          await setDoc(userDocRef, payload);
        } catch (err) {
          console.warn('[Firestore] User profile initial sync warning:', err);
        }
        onUpdate(local);
      }
    },
    (err) => {
      console.error('[Firestore] Error subscribing to user profile:', err);
      onUpdate(getLocalUserProfile());
    }
  );

  return unsubscribe;
}

/**
 * Save user profile to Firestore
 */
export async function syncSaveUserProfile(profile: UserProfileData): Promise<void> {
  saveLocalUserProfile(profile);
  try {
    const userDocRef = doc(db, COLLECTIONS.USER_PROFILES, DOCS.ADMIN_PROFILE);
    const payload = sanitizeForFirestore({
      ...profile,
      atualizadoEm: new Date().toISOString(),
    });
    await setDoc(userDocRef, payload);
  } catch (error) {
    console.error('[Firestore] Failed to save user profile:', error);
  }
}

/**
 * Real-time sync for options: Bancos & Formas de Pagamento
 */
export function subscribeToFinancialOptions(
  onUpdate: (options: { bancos: string[]; formasPagamento: string[] }) => void
): () => void {
  const docRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, DOCS.FINANCIAL_OPTIONS);

  const unsubscribe = onSnapshot(
    docRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const bancos = Array.isArray(data.bancos) ? data.bancos : [];
        const formasPagamento = Array.isArray(data.formasPagamento) ? data.formasPagamento : [];
        
        if (bancos.length > 0) {
          localStorage.setItem('transuniao_bancos_opcoes', JSON.stringify(bancos));
        }
        if (formasPagamento.length > 0) {
          localStorage.setItem('transuniao_formas_pagamento_opcoes', JSON.stringify(formasPagamento));
        }
        
        onUpdate({ bancos, formasPagamento });
      } else {
        const defaultBanks = ['Banco do Brasil', 'Itaú', 'Pagbank'];
        const defaultFormas = ['PIX', 'Liquidação de boleto', 'Cartão de crédito'];
        try {
          await setDoc(docRef, {
            bancos: defaultBanks,
            formasPagamento: defaultFormas,
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[Firestore] Options sync warning:', e);
        }
        onUpdate({ bancos: defaultBanks, formasPagamento: defaultFormas });
      }
    },
    (err) => {
      console.error('[Firestore] Error subscribing to financial options:', err);
    }
  );

  return unsubscribe;
}

/**
 * Persist custom bank and payment method options to Firestore
 */
export async function syncSaveFinancialOptions(options: {
  bancos?: string[];
  formasPagamento?: string[];
}): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, DOCS.FINANCIAL_OPTIONS);
    const snap = await getDoc(docRef);
    const existing = snap.exists() ? snap.data() : {};
    
    const payload = sanitizeForFirestore({
      bancos: options.bancos ?? existing.bancos ?? ['Banco do Brasil', 'Itaú', 'Pagbank'],
      formasPagamento: options.formasPagamento ?? existing.formasPagamento ?? ['PIX', 'Liquidação de boleto', 'Cartão de crédito'],
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload);
  } catch (err) {
    console.error('[Firestore] Failed to save financial options:', err);
  }
}

/**
 * Real-time sync for admin credentials (passwords)
 */
export function subscribeToCredentials(
  onUpdate: (credentials: StoredCredentials) => void
): () => void {
  const credsDocRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, DOCS.CREDENTIALS);

  const unsubscribe = onSnapshot(
    credsDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as StoredCredentials;
        if (data.username && data.password) {
          saveLocalCredentials(data);
          onUpdate(data);
          return;
        }
      }
      const local = getLocalCredentials();
      try {
        await setDoc(credsDocRef, sanitizeForFirestore(local));
      } catch (err) {
        console.warn('[Firestore] Credentials initial sync warning:', err);
      }
      onUpdate(local);
    },
    (err) => {
      console.error('[Firestore] Error subscribing to credentials:', err);
      onUpdate(getLocalCredentials());
    }
  );

  return unsubscribe;
}

/**
 * Save updated credentials to Firestore
 */
export async function syncSaveCredentials(credentials: StoredCredentials): Promise<void> {
  saveLocalCredentials(credentials);
  try {
    const credsDocRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, DOCS.CREDENTIALS);
    await setDoc(credsDocRef, sanitizeForFirestore({
      ...credentials,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[Firestore] Failed to save credentials:', err);
  }
}
