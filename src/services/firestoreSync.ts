import { 
  doc, 
  onSnapshot, 
  setDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProfileId, ProfileConfig, ProfileData, UserProfileData } from '../types';
import { 
  loadProfileData as loadLocalProfileData,
  saveProfileData as saveLocalProfileData,
  getProfilesConfig as getLocalProfilesConfig,
  saveProfilesConfig as saveLocalProfilesConfig
} from '../utils/profileStorage';
import { getUserProfileData as getLocalUserProfile, saveUserProfileData as saveLocalUserProfile } from '../utils/auth';

// Collection and document constants in Firestore
const COLLECTIONS = {
  PROFILES_DATA: 'transuniao_profiles_data',
  SYSTEM_CONFIG: 'transuniao_system_config',
  USER_PROFILES: 'transuniao_user_profiles',
};

const DOCS = {
  PROFILES_CONFIG: 'profiles_config',
  ADMIN_PROFILE: 'admin_profile',
};

/**
 * Real-time listener for profile data (pagamentos, notasFiscais, boletos, ordensServico)
 * If Firestore doesn't have data yet, it automatically migrates local data to Firestore.
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
      if (snapshot.exists()) {
        const firestoreData = snapshot.data();
        const cleanData: ProfileData = {
          pagamentos: Array.isArray(firestoreData.pagamentos) ? firestoreData.pagamentos : [],
          notasFiscais: Array.isArray(firestoreData.notasFiscais) ? firestoreData.notasFiscais : [],
          boletos: Array.isArray(firestoreData.boletos) ? firestoreData.boletos : [],
          ordensServico: Array.isArray(firestoreData.ordensServico) ? firestoreData.ordensServico : [],
        };
        // Keep local storage synced as fallback/cache
        saveLocalProfileData(profileId, cleanData);
        onUpdate(cleanData);
      } else {
        // Document doesn't exist in Firestore yet: upload initial/local data to Firestore
        const localData = loadLocalProfileData(profileId);
        try {
          await setDoc(profileDocRef, {
            ...localData,
            updatedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.warn(`[Firestore] Initial sync warning for ${profileId}:`, err);
        }
        onUpdate(localData);
      }
    },
    (error) => {
      console.error(`[Firestore] Error subscribing to profile ${profileId}:`, error);
      if (onError) onError(error);
      // Fallback to local data
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
    await setDoc(profileDocRef, {
      pagamentos: data.pagamentos,
      notasFiscais: data.notasFiscais,
      boletos: data.boletos,
      ordensServico: data.ordensServico,
      updatedAt: new Date().toISOString(),
    });
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
      // If doesn't exist, initialize Firestore with local or default config
      const localConfig = getLocalProfilesConfig();
      try {
        await setDoc(configDocRef, {
          config: localConfig,
          updatedAt: new Date().toISOString(),
        });
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
    await setDoc(configDocRef, {
      config,
      updatedAt: new Date().toISOString(),
    });
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
          await setDoc(userDocRef, local);
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
    await setDoc(userDocRef, {
      ...profile,
      atualizadoEm: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Firestore] Failed to save user profile:', error);
  }
}
