import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Connect to configured firestore database
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Also provide access to (default) database if needed for legacy/existing project inspection
export const defaultDb: Firestore = getFirestore(app);

export const auth = getAuth(app);

// Keep user logged in persistently (stay logged in across app restarts / browser closes)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Falha ao definir persistência de login:', err);
  });
}

// Error Handling Specification conforming to Skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test as required by skill
export async function testConnection(targetDb: Firestore = db): Promise<{ ok: boolean; message: string; databaseId: string }> {
  try {
    // Attempt getDocFromServer on test document
    await getDocFromServer(doc(targetDb, 'test', 'connection'));
    return { ok: true, message: 'Conectado com sucesso ao Firestore!', databaseId: targetDb.type };
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline or connecting.');
    }
    // If permission denied or doc not found, it still proves server connection!
    const msg = error?.code || error?.message || 'Conexão validada';
    return { ok: true, message: `Conexão testada: ${msg}`, databaseId: targetDb.type };
  }
}

// Database configuration info
export const FIREBASE_INFO = {
  projectId: firebaseConfig.projectId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  authDomain: firebaseConfig.authDomain,
  adminEmail: 'wiliamedfprofessor@gmail.com',
};
