import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, setDoc, getDoc, collection, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import type { RegistrationRecord } from '../types.ts';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || 'ai-studio-keralaneetacadem-d11f9ecb-1bac-47a5-89ab-4b32fdce9cc6'
);

// Initialize Auth
export const auth = getAuth(app);

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

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
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate connection to Firestore as mandated by Firebase guidelines
 */
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Connected to Firebase Firestore successfully');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Please check your network and Firebase configuration.');
    } else {
      console.log('Firebase connection initialized:', (error as any)?.message || error);
    }
    return false;
  }
}

/**
 * Saves or synchronizes a registration record to Firestore
 */
export async function saveRegistrationToFirestore(record: Partial<RegistrationRecord>): Promise<void> {
  try {
    const docId = (record.studentCode || record.responseId || `REG-${Date.now()}`).trim();
    if (!docId) return;

    const regRef = doc(db, 'registrations', docId);
    
    // Clean and normalize payload (never pass undefined to Firestore)
    const payload: Record<string, any> = {
      studentCode: record.studentCode || null,
      studentName: record.studentName || 'Student Delegate',
      fatherName: record.fatherName || null,
      email: record.email || null,
      contactNumber: record.contactNumber || null,
      age: record.age !== undefined ? record.age : null,
      ntaScore: record.ntaScore !== undefined ? record.ntaScore : null,
      medicalCollegeName: record.medicalCollegeName || null,
      medicalCollegeState: record.medicalCollegeState || null,
      coatSize: record.coatSize || 'M',
      foodVegCount: Number(record.foodVegCount || 0),
      foodNonVegCount: Number(record.foodNonVegCount || 0),
      attendanceChoice: record.attendanceChoice || 'ATTENDING',
      photoUrl: record.photoUrl || null,
      willingness: record.willingness || 'WILLING',
      checkInStatus: record.checkInStatus || 'PENDING',
      checkInTime: record.checkInTime || null,
      foodCollected: (record as any).foodCollected ?? false,
      foodCollectedVegCount: Number((record as any).foodCollectedVegCount || 0),
      foodCollectedNonVegCount: Number((record as any).foodCollectedNonVegCount || 0),
      foodCollectedAt: (record as any).foodCollectedAt || null,
      foodCollectedStaff: (record as any).foodCollectedStaff || null,
      responseId: record.responseId || docId,
      campusLocation: (record as any).campusLocation || null,
      courseProgram: (record as any).courseProgram || null,
      targetYear: (record as any).targetYear || null,
      createdAt: record.createdAt || new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    };

    // Replace any remaining undefined with null
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) {
        payload[key] = null;
      }
    }

    await setDoc(regRef, payload, { merge: true });
    console.log(`Successfully synced registration ${docId} to Firebase Firestore`);
  } catch (error) {
    console.error('Error syncing registration to Firestore:', error);
  }
}

/**
 * Retrieves a registration record from Firestore by Code or Response ID
 */
export async function getRegistrationFromFirestore(codeOrId: string): Promise<any | null> {
  try {
    const docId = codeOrId.trim();
    if (!docId) return null;

    const regRef = doc(db, 'registrations', docId);
    const snap = await getDoc(regRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching registration from Firestore:', error);
    return null;
  }
}

/**
 * Real-time listener for Firestore registrations
 */
export function subscribeToFirestoreRegistrations(onUpdate: (registrations: any[]) => void): () => void {
  try {
    const colRef = collection(db, 'registrations');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        onUpdate(items);
      },
      (err) => {
        console.warn('Firestore subscription notice:', err.message);
      }
    );
  } catch (e) {
    console.warn('Could not establish Firestore subscription:', e);
    return () => {};
  }
}

/**
 * Deletes a registration record from Firestore by Code or Response ID
 */
export async function deleteRegistrationFromFirestore(codeOrId: string): Promise<void> {
  try {
    const docId = codeOrId?.trim();
    if (!docId) return;

    await deleteDoc(doc(db, 'registrations', docId));
    console.log(`Successfully deleted registration ${docId} from Firebase Firestore`);
  } catch (error) {
    console.error('Error deleting registration from Firestore:', error);
  }
}
