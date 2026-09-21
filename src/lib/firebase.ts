import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely (singleton pattern)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore using the database ID configured in firebase-applet-config.json
export const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

export default db;
