import { db, auth } from './firebase.ts';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  runTransaction,
} from 'firebase/firestore';
import crypto from 'crypto';
import collegeDataRaw from '../../data/medical-colleges.json' with { type: 'json' };
import type {
  StudentRegistrationData,
  ComprehensiveRegistrationData,
  RegistrationRecord,
  DashboardStats,
  MedicalCollegeItem,
} from '../types.ts';

// Secret salt for admin password hashing and token generation
const SECRET_SALT = 'kna_steth_salt_2026';
const TOKEN_SECRET = 'kna_steth_jwt_secret_token_2026_firebase';

// In-memory cache for fast college lookups synchronized with Firestore
let cachedColleges: MedicalCollegeItem[] = [];
let collegesInitialized = false;

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SECRET_SALT).digest('hex');
}

export function createAdminToken(user: { email: string; role: string; name: string }): string {
  const payload = {
    email: user.email.toLowerCase(),
    role: user.role,
    name: user.name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyAdminToken(token: string): boolean {
  try {
    if (!token || typeof token !== 'string') return false;
    const parts = token.trim().split('.');
    if (parts.length !== 2) return false;
    const [data, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
    if (signature !== expectedSig) return false;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (!payload.exp || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function decodeAdminToken(token: string): { email: string; role: string; name: string } | null {
  try {
    if (!verifyAdminToken(token)) return null;
    const parts = token.trim().split('.');
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Normalizes a raw Firestore registration document into a consistent RegistrationRecord
 */
export function normalizeRegistration(id: string, data: any): RegistrationRecord {
  const studentCode = data.studentCode || (id.startsWith('KNA') ? id : null);
  const responseId = data.responseId || (studentCode ? `STETH-${studentCode}-REC` : id);
  const vegCount = Number(data.foodVegCount ?? data.food_veg_count ?? 0);
  const nonVegCount = Number(data.foodNonVegCount ?? data.food_non_veg_count ?? 0);

  return {
    id: data.id || Math.abs(hashCode(id)),
    studentCode: studentCode || null,
    studentName: data.studentName || 'Student Delegate',
    fatherName: data.fatherName || '',
    email: data.email || (studentCode ? `${studentCode.toLowerCase()}@keralaneetacademy.org` : ''),
    contactNumber: data.contactNumber || '',
    campusLocation: data.campusLocation || null,
    courseProgram: data.courseProgram || null,
    targetYear: data.targetYear || null,
    age: data.age !== undefined && data.age !== null ? Number(data.age) : null,
    ntaScore: data.ntaScore !== undefined && data.ntaScore !== null ? Number(data.ntaScore) : null,
    photoUrl: data.photoUrl || null,
    medicalCollegeId: data.medicalCollegeId ? Number(data.medicalCollegeId) : null,
    medicalCollegeName: data.medicalCollegeName || null,
    medicalCollegeCity: data.medicalCollegeCity || null,
    medicalCollegeDistrict: data.medicalCollegeDistrict || null,
    medicalCollegeState: data.medicalCollegeState || null,
    foodVegCount: vegCount,
    foodNonVegCount: nonVegCount,
    coatSize: data.coatSize || 'M',
    attendanceChoice: data.attendanceChoice || 'ATTENDING',
    willingness: data.willingness || 'WILLING',
    checkInStatus: data.checkInStatus || 'PENDING',
    checkInTime: data.checkInTime || null,
    responseId: responseId,
    notes: typeof data.notes === 'string' ? data.notes : (data.notes ? JSON.stringify(data.notes) : null),
    foodCollected: Boolean(data.foodCollected),
    foodCollectedVegCount: Number(data.foodCollectedVegCount ?? (data.foodCollected ? vegCount : 0)),
    foodCollectedNonVegCount: Number(data.foodCollectedNonVegCount ?? (data.foodCollected ? nonVegCount : 0)),
    foodCollectedAt: data.foodCollectedAt || null,
    foodCollectedStaff: data.foodCollectedStaff || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Initializes Firestore default documents: event settings, admin accounts, and medical colleges
 */
export async function initDatabase(): Promise<void> {
  try {
    console.log('Initializing Firebase Firestore database and collections...');

    // 1. Ensure Event Settings exist in Firestore
    const settingsRef = doc(db, 'event_settings', 'default');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        academyName: 'Kerala NEET Academy',
        eventName: 'STETH DAY',
        description: 'Your Journey Towards Medicine Starts Here',
        codePrefix: 'KNA',
        nextCodeNumber: 20,
        codeDigits: 3,
        pdfHeader: 'KERALA NEET ACADEMY — STETH DAY 2026 OFFICIAL REGISTRATION PASS',
        pdfFooter: 'Kerala NEET Academy • stethday@keralaneetacademy.org • Call: +91 98470 12345',
        maxFoodCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('Firebase Firestore: Default event_settings document created.');
    }

    // 2. Ensure Default Admins exist in Firestore
    const defaultAdmins = [
      {
        email: 'admin@keralaneetacademy.org',
        name: 'KNA Lead Admin',
        role: 'superadmin',
        passwordHash: hashPassword('admin123'),
      },
      {
        email: 'staff@keralaneetacademy.org',
        name: 'KNA Event Staff',
        role: 'staff',
        passwordHash: hashPassword('staff123'),
      },
      {
        email: 'food@keralaneetacademy.org',
        name: 'KNA Catering & Food Counter',
        role: 'food',
        passwordHash: hashPassword('food123'),
      },
    ];

    for (const adm of defaultAdmins) {
      const adminDocRef = doc(db, 'admins', adm.email);
      const adminSnap = await getDoc(adminDocRef);
      if (!adminSnap.exists()) {
        await setDoc(adminDocRef, {
          ...adm,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`Firebase Firestore: Initialized admin account ${adm.email} (${adm.role})`);
      }
    }

    // 3. Load Medical Colleges into memory & Firestore if not already loaded
    await initMedicalColleges();

    console.log('Firebase Firestore initialized successfully.');
  } catch (err: any) {
    console.error('Error during Firestore initialization:', err?.message || err);
  }
}

async function initMedicalColleges(): Promise<void> {
  if (collegesInitialized && cachedColleges.length > 0) return;

  const rawColleges = (collegeDataRaw as any[]) || [];
  cachedColleges = rawColleges.map((c, index) => ({
    id: c.id || index + 1,
    name: c.name,
    city: c.city,
    district: c.district || c.city,
    state: c.state,
    type: c.type || 'Government',
    aliases: c.aliases || '',
  }));

  collegesInitialized = true;
  console.log(`Loaded ${cachedColleges.length} medical colleges into memory cache.`);
}

/**
 * Checks for existing registration with duplicate email or contact number in Firestore
 */
export async function checkDuplicate(email: string, contactNumber: string): Promise<RegistrationRecord | null> {
  try {
    const cleanContact = (contactNumber || '').trim().replace(/\D/g, '');
    const cleanEmail = (email || '').trim().toLowerCase();

    const regCol = collection(db, 'registrations');
    const snapshot = await getDocs(regCol);

    for (const docSnap of snapshot.docs) {
      const d = docSnap.data();
      if (d.willingness !== 'WILLING') continue;

      const docPhone = (d.contactNumber || '').trim().replace(/\D/g, '');
      const docEmail = (d.email || '').trim().toLowerCase();

      const phoneMatch = cleanContact.length >= 10 && (docPhone === cleanContact || docPhone.slice(-10) === cleanContact.slice(-10));
      const emailMatch = cleanEmail.length > 3 && docEmail === cleanEmail;

      if (phoneMatch || emailMatch) {
        return normalizeRegistration(docSnap.id, d);
      }
    }
    return null;
  } catch (error) {
    console.error('Error checking duplicate in Firestore:', error);
    return null;
  }
}

/**
 * Creates a sequential willing registration in Firestore
 */
export async function createWillingRegistration(data: StudentRegistrationData): Promise<any> {
  const cleanContact = (data.contactNumber || '').trim().replace(/\D/g, '');
  const cleanEmail = (data.email || '').trim().toLowerCase();

  // 1. Check duplicate
  const duplicate = await checkDuplicate(cleanEmail, cleanContact);
  if (duplicate) {
    const docId = duplicate.studentCode || duplicate.responseId;
    const regRef = doc(db, 'registrations', docId);

    const updatedData = {
      studentName: data.studentName.trim(),
      fatherName: data.fatherName.trim(),
      email: cleanEmail,
      contactNumber: cleanContact,
      age: data.age || 18,
      ntaScore: data.ntaScore !== undefined && data.ntaScore !== null ? Number(data.ntaScore) : null,
      photoUrl: data.photoUrl || duplicate.photoUrl || null,
      medicalCollegeId: data.medicalCollegeId || duplicate.medicalCollegeId || null,
      medicalCollegeName: data.medicalCollegeName || duplicate.medicalCollegeName || null,
      medicalCollegeCity: data.medicalCollegeCity || duplicate.medicalCollegeCity || null,
      medicalCollegeDistrict: data.medicalCollegeDistrict || duplicate.medicalCollegeDistrict || null,
      medicalCollegeState: data.medicalCollegeState || duplicate.medicalCollegeState || null,
      foodVegCount: Number(data.foodVegCount || 0),
      foodNonVegCount: Number(data.foodNonVegCount || 0),
      coatSize: data.coatSize || duplicate.coatSize || 'M',
      campusLocation: data.campusLocation?.trim() || duplicate.campusLocation || null,
      courseProgram: data.courseProgram || duplicate.courseProgram || null,
      targetYear: data.targetYear || duplicate.targetYear || null,
      willingness: 'WILLING',
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(regRef, updatedData);
    const updatedRecord = normalizeRegistration(docId, { ...duplicate, ...updatedData });
    return {
      ...updatedRecord,
      isUpdated: true,
      student_code: updatedRecord.studentCode,
      response_id: updatedRecord.responseId,
      student_name: updatedRecord.studentName,
      father_name: updatedRecord.fatherName,
      contact_number: updatedRecord.contactNumber,
      food_veg_count: updatedRecord.foodVegCount,
      food_non_veg_count: updatedRecord.foodNonVegCount,
      coat_size: updatedRecord.coatSize,
      campus_location: updatedRecord.campusLocation,
      course_program: updatedRecord.courseProgram,
      target_year: updatedRecord.targetYear,
      medical_college_name: updatedRecord.medicalCollegeName,
      medical_college_state: updatedRecord.medicalCollegeState,
      photo_url: updatedRecord.photoUrl,
      nta_score: updatedRecord.ntaScore,
      ntaScore: updatedRecord.ntaScore,
      created_at: updatedRecord.createdAt,
    };
  }

  // 2. Atomic code generation via Firestore transaction on event_settings
  let studentCode = '';
  let responseId = '';

  const settingsRef = doc(db, 'event_settings', 'default');

  await runTransaction(db, async (tx) => {
    const settingsSnap = await tx.get(settingsRef);
    let nextNum = 1;
    let prefix = 'KNA';
    let digits = 3;

    if (settingsSnap.exists()) {
      const s = settingsSnap.data();
      nextNum = Number(s.nextCodeNumber) || 1;
      prefix = s.codePrefix || 'KNA';
      digits = Number(s.codeDigits) || 3;
    }

    studentCode = `${prefix}${String(nextNum).padStart(digits, '0')}`;
    responseId = `STETH-${studentCode}-${Date.now().toString(36).toUpperCase()}`;

    tx.set(
      settingsRef,
      {
        nextCodeNumber: nextNum + 1,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  });

  // 3. Write registration document to Firestore
  const newRegData: any = {
    studentCode,
    studentName: data.studentName.trim(),
    fatherName: data.fatherName.trim(),
    email: cleanEmail || `${studentCode.toLowerCase()}@keralaneetacademy.org`,
    contactNumber: cleanContact,
    age: data.age || 18,
    ntaScore: data.ntaScore !== undefined && data.ntaScore !== null ? Number(data.ntaScore) : null,
    photoUrl: data.photoUrl || null,
    medicalCollegeId: data.medicalCollegeId || null,
    medicalCollegeName: data.medicalCollegeName || null,
    medicalCollegeCity: data.medicalCollegeCity || null,
    medicalCollegeDistrict: data.medicalCollegeDistrict || null,
    medicalCollegeState: data.medicalCollegeState || null,
    foodVegCount: Number(data.foodVegCount || 0),
    foodNonVegCount: Number(data.foodNonVegCount || 0),
    coatSize: data.coatSize || 'M',
    campusLocation: data.campusLocation?.trim() || null,
    courseProgram: data.courseProgram || null,
    targetYear: data.targetYear || null,
    willingness: 'WILLING',
    checkInStatus: 'PENDING',
    checkInTime: null,
    responseId,
    foodCollected: false,
    foodCollectedVegCount: 0,
    foodCollectedNonVegCount: 0,
    foodCollectedAt: null,
    foodCollectedStaff: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const regRef = doc(db, 'registrations', studentCode);
  await setDoc(regRef, newRegData);

  const finalRecord = normalizeRegistration(studentCode, newRegData);
  return {
    ...finalRecord,
    isUpdated: false,
    student_code: studentCode,
    response_id: responseId,
    student_name: finalRecord.studentName,
    father_name: finalRecord.fatherName,
    contact_number: finalRecord.contactNumber,
    food_veg_count: finalRecord.foodVegCount,
    food_non_veg_count: finalRecord.foodNonVegCount,
    coat_size: finalRecord.coatSize,
    campus_location: finalRecord.campusLocation,
    course_program: finalRecord.courseProgram,
    target_year: finalRecord.targetYear,
    medical_college_name: finalRecord.medicalCollegeName,
    medical_college_state: finalRecord.medicalCollegeState,
    photo_url: finalRecord.photoUrl,
    nta_score: finalRecord.ntaScore,
    ntaScore: finalRecord.ntaScore,
    created_at: finalRecord.createdAt,
  };
}

/**
 * Creates a comprehensive registration in Firestore
 */
export async function createComprehensiveRegistration(data: ComprehensiveRegistrationData): Promise<any> {
  const cleanContact = (data.contactNumber || '').trim().replace(/\D/g, '');
  const cleanEmail = (data.email || '').trim().toLowerCase();

  const responseId = `RESP-COMP-${Date.now().toString(36).toUpperCase()}`;
  const regData = {
    studentName: data.studentName.trim(),
    fatherName: data.fatherName.trim(),
    email: cleanEmail,
    contactNumber: cleanContact,
    campusLocation: data.campusLocation?.trim() || null,
    courseProgram: data.courseProgram || null,
    targetYear: data.targetYear || null,
    notes: data.notes || null,
    willingness: 'WILLING',
    checkInStatus: 'PENDING',
    checkInTime: null,
    responseId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const regRef = doc(db, 'registrations', responseId);
  await setDoc(regRef, regData);
  return normalizeRegistration(responseId, regData);
}

/**
 * Creates a non-willing response record in Firestore
 */
export async function createNonWillingResponse(clientIp?: string): Promise<any> {
  const responseId = `RESP-NW-${Date.now().toString(36).toUpperCase()}`;
  const regData = {
    studentName: 'Non-Attending Delegate',
    willingness: 'NON_WILLING',
    responseId,
    notes: clientIp ? `Client IP: ${clientIp}` : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const regRef = doc(db, 'registrations', responseId);
  await setDoc(regRef, regData);
  return {
    responseId,
    willingness: 'NON_WILLING',
    createdAt: regData.createdAt,
  };
}

/**
 * Retrieves a single registration record by code, response ID, phone, email, or name
 */
export async function getRegistrationByCodeOrId(identifier: string): Promise<RegistrationRecord | null> {
  try {
    const trimmed = (identifier || '').trim();
    if (!trimmed) return null;

    // 1. Direct document ID lookup
    const directDoc = await getDoc(doc(db, 'registrations', trimmed));
    if (directDoc.exists()) {
      return normalizeRegistration(directDoc.id, directDoc.data());
    }

    const upperDoc = await getDoc(doc(db, 'registrations', trimmed.toUpperCase()));
    if (upperDoc.exists()) {
      return normalizeRegistration(upperDoc.id, upperDoc.data());
    }

    // 2. Query search across all registrations
    const cleanPhone = trimmed.replace(/\D/g, '');
    const cleanEmail = trimmed.toLowerCase();
    const cleanLower = trimmed.toLowerCase();

    const snapshot = await getDocs(collection(db, 'registrations'));
    for (const docSnap of snapshot.docs) {
      const d = docSnap.data();
      const code = (d.studentCode || '').toUpperCase();
      const respId = (d.responseId || '').toLowerCase();
      const name = (d.studentName || '').toLowerCase();
      const email = (d.email || '').toLowerCase();
      const phone = (d.contactNumber || '').replace(/\D/g, '');

      if (code === trimmed.toUpperCase()) return normalizeRegistration(docSnap.id, d);
      if (respId === cleanLower) return normalizeRegistration(docSnap.id, d);
      if (cleanPhone.length >= 10 && phone.slice(-10) === cleanPhone.slice(-10)) return normalizeRegistration(docSnap.id, d);
      if (cleanEmail && email === cleanEmail) return normalizeRegistration(docSnap.id, d);
      if (name === cleanLower || name.includes(cleanLower)) return normalizeRegistration(docSnap.id, d);
    }

    return null;
  } catch (error) {
    console.error('Error in getRegistrationByCodeOrId from Firestore:', error);
    return null;
  }
}

/**
 * Computes dashboard statistics from Firestore
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const snapshot = await getDocs(collection(db, 'registrations'));

  let totalRegistrations = 0;
  let willingCount = 0;
  let nonWillingCount = 0;
  let checkedInCount = 0;
  let pendingCheckInCount = 0;
  let vegCount = 0;
  let nonVegCount = 0;
  let foodCollectedCount = 0;
  let foodPendingCount = 0;

  const coatSizeMap: Record<string, number> = {
    XS: 0,
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
    XXXL: 0,
  };

  const campusMap: Record<string, number> = {};
  const allWilling: RegistrationRecord[] = [];

  for (const docSnap of snapshot.docs) {
    const reg = normalizeRegistration(docSnap.id, docSnap.data());
    totalRegistrations++;

    if (reg.willingness === 'WILLING') {
      willingCount++;
      allWilling.push(reg);

      const veg = reg.foodVegCount || 0;
      const nonVeg = reg.foodNonVegCount || 0;
      vegCount += veg;
      nonVegCount += nonVeg;

      if (reg.coatSize && coatSizeMap[reg.coatSize] !== undefined) {
        coatSizeMap[reg.coatSize]++;
      }

      const campus = reg.campusLocation || 'General Registration';
      campusMap[campus] = (campusMap[campus] || 0) + 1;

      if (reg.checkInStatus === 'IN') {
        checkedInCount++;
        if (reg.foodCollected) {
          foodCollectedCount += (reg.foodCollectedVegCount || veg) + (reg.foodCollectedNonVegCount || nonVeg);
        } else {
          foodPendingCount += veg + nonVeg;
        }
      } else {
        pendingCheckInCount++;
      }
    } else {
      nonWillingCount++;
    }
  }

  // Sort recent by createdAt desc
  allWilling.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recentRegistrations = allWilling.slice(0, 8);

  const coatSizeBreakdown = Object.entries(coatSizeMap).map(([size, count]) => ({
    size,
    count,
  }));

  const campusBreakdown = Object.entries(campusMap).map(([campus, count]) => ({
    campus,
    count,
  }));

  return {
    totalRegistrations,
    totalWilling: willingCount,
    totalNonWilling: nonWillingCount,
    willingCount,
    nonWillingCount,
    checkedInCount,
    pendingCheckInCount,
    vegCount,
    nonVegCount,
    foodVegCount: vegCount,
    foodNonVegCount: nonVegCount,
    totalFoodCount: vegCount + nonVegCount,
    foodCollectedCount,
    foodPendingCount,
    coatSizes: coatSizeMap,
    coatSizeBreakdown,
    stateStats: [],
    collegeStats: [],
    recentRegistrations,
    campusBreakdown,
  };
}

/**
 * Lists registrations with search, filtering, and pagination from Firestore
 */
export async function getRegistrationsList(params: {
  page?: number;
  pageSize?: number;
  willingness?: string;
  checkInStatus?: string;
  campusLocation?: string;
  courseProgram?: string;
  coatSize?: string;
  search?: string;
  query?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  registrations: RegistrationRecord[];
  items: RegistrationRecord[];
  totalCount: number;
  total: number;
  page: number;
  totalPages: number;
}> {
  const snapshot = await getDocs(collection(db, 'registrations'));
  let items: RegistrationRecord[] = snapshot.docs.map((d) => normalizeRegistration(d.id, d.data()));

  // 1. Filter
  if (params.willingness && params.willingness !== 'ALL') {
    items = items.filter((r) => r.willingness === params.willingness);
  }

  if (params.checkInStatus && params.checkInStatus !== 'ALL') {
    items = items.filter((r) => r.checkInStatus === params.checkInStatus);
  }

  if (params.coatSize && params.coatSize !== 'ALL') {
    items = items.filter((r) => r.coatSize === params.coatSize);
  }

  if (params.campusLocation && params.campusLocation !== 'ALL') {
    items = items.filter((r) => (r.campusLocation || '').toLowerCase().includes(params.campusLocation!.toLowerCase()));
  }

  if (params.courseProgram && params.courseProgram !== 'ALL') {
    items = items.filter((r) => (r.courseProgram || '').toLowerCase() === params.courseProgram!.toLowerCase());
  }

  const searchQuery = params.search || params.query;
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    items = items.filter(
      (r) =>
        (r.studentName && r.studentName.toLowerCase().includes(q)) ||
        (r.studentCode && r.studentCode.toLowerCase().includes(q)) ||
        (r.responseId && r.responseId.toLowerCase().includes(q)) ||
        (r.contactNumber && r.contactNumber.includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.medicalCollegeName && r.medicalCollegeName.toLowerCase().includes(q))
    );
  }

  // 2. Sort
  const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
  const sortBy = params.sortBy || 'createdAt';

  items.sort((a: any, b: any) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === 'createdAt' || sortBy === 'checkInTime') {
      const timeA = valA ? new Date(valA).getTime() : 0;
      const timeB = valB ? new Date(valB).getTime() : 0;
      return (timeA - timeB) * sortOrder;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB) * sortOrder;
    }

    if (valA < valB) return -1 * sortOrder;
    if (valA > valB) return 1 * sortOrder;
    return 0;
  });

  // 3. Paginate
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 25);
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);

  return {
    registrations: paginatedItems,
    items: paginatedItems,
    totalCount,
    total: totalCount,
    page,
    totalPages,
  };
}

/**
 * Returns all registrations from Firestore for CSV and Excel download
 */
export async function getAllRegistrationsForExport(): Promise<RegistrationRecord[]> {
  const snapshot = await getDocs(collection(db, 'registrations'));
  const items = snapshot.docs.map((d) => normalizeRegistration(d.id, d.data()));
  items.sort((a, b) => (a.studentCode || a.responseId).localeCompare(b.studentCode || b.responseId));
  return items;
}

/**
 * Deletes a registration document from Firestore
 */
export async function deleteRegistration(idOrCode: any): Promise<RegistrationRecord | null> {
  const target = await getRegistrationByCodeOrId(String(idOrCode));
  if (!target) return null;

  const docId = target.studentCode || target.responseId;
  await deleteDoc(doc(db, 'registrations', docId));
  return target;
}

/**
 * Updates a registration document in Firestore
 */
export async function updateRegistration(idOrCode: any, data: Partial<RegistrationRecord>): Promise<RegistrationRecord | null> {
  const target = await getRegistrationByCodeOrId(String(idOrCode));
  if (!target) return null;

  const docId = target.studentCode || target.responseId;
  const regRef = doc(db, 'registrations', docId);

  const cleanData: any = { ...data, updatedAt: new Date().toISOString() };
  delete cleanData.id;

  await updateDoc(regRef, cleanData);
  const updatedSnap = await getDoc(regRef);
  return normalizeRegistration(docId, updatedSnap.data());
}

/**
 * Toggles or updates student check-in status in Firestore
 */
export async function toggleCheckIn(
  idOrCode: any,
  status: 'IN' | 'OUT' | 'PENDING',
  optionsOrStaff?: string | { allowDuplicate?: boolean; staffEmail?: string }
): Promise<any> {
  const target = await getRegistrationByCodeOrId(String(idOrCode));
  if (!target) return null;

  const docId = target.studentCode || target.responseId;
  const regRef = doc(db, 'registrations', docId);

  let staffEmail = 'staff@keralaneetacademy.org';
  let allowDuplicate = false;

  if (typeof optionsOrStaff === 'string') {
    staffEmail = optionsOrStaff;
  } else if (optionsOrStaff && typeof optionsOrStaff === 'object') {
    staffEmail = optionsOrStaff.staffEmail || staffEmail;
    allowDuplicate = !!optionsOrStaff.allowDuplicate;
  }

  // Duplicate check-in detection
  if (status === 'IN' && target.checkInStatus === 'IN' && !allowDuplicate) {
    return {
      alreadyIn: true,
      studentName: target.studentName,
      studentCode: target.studentCode,
      checkInTime: target.checkInTime || null,
      record: target,
    };
  }

  const checkInTime = status === 'IN' ? new Date().toISOString() : null;
  const updatePayload = {
    checkInStatus: status,
    checkInTime,
    lastCheckInStaff: staffEmail,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(regRef, updatePayload);
  const updatedSnap = await getDoc(regRef);
  const record = normalizeRegistration(docId, updatedSnap.data());
  return {
    ...record,
    alreadyIn: false,
    success: true,
  };
}

/**
 * Retrieves event settings from Firestore
 */
export async function getSettings(): Promise<any> {
  const settingsSnap = await getDoc(doc(db, 'event_settings', 'default'));
  if (settingsSnap.exists()) {
    return settingsSnap.data();
  }
  return {
    academyName: 'Kerala NEET Academy',
    eventName: 'STETH DAY',
    description: 'Your Journey Towards Medicine Starts Here',
    codePrefix: 'KNA',
    nextCodeNumber: 20,
    codeDigits: 3,
    pdfHeader: 'KERALA NEET ACADEMY — STETH DAY 2026 OFFICIAL REGISTRATION PASS',
    pdfFooter: 'Kerala NEET Academy • stethday@keralaneetacademy.org • Call: +91 98470 12345',
    maxFoodCount: 5,
  };
}

/**
 * Updates event settings in Firestore
 */
export async function updateSettings(data: any): Promise<any> {
  const settingsRef = doc(db, 'event_settings', 'default');
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(settingsRef, payload, { merge: true });
  const updatedSnap = await getDoc(settingsRef);
  return updatedSnap.data();
}

/**
 * Admin authentication verifying against Firestore credentials
 */
export async function adminLogin(email: string, passwordPlain: string): Promise<any> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const passHash = hashPassword(passwordPlain);

  const adminDoc = await getDoc(doc(db, 'admins', cleanEmail));
  if (adminDoc.exists()) {
    const user = adminDoc.data();
    if (user.passwordHash === passHash) {
      const token = createAdminToken({
        email: user.email,
        name: user.name,
        role: user.role,
      });
      return {
        token,
        admin: {
          id: cleanEmail,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }
  }

  // Fallback check across all admins in Firestore
  const snap = await getDocs(collection(db, 'admins'));
  for (const d of snap.docs) {
    const u = d.data();
    if ((u.email || '').toLowerCase() === cleanEmail && u.passwordHash === passHash) {
      const token = createAdminToken({
        email: u.email,
        name: u.name,
        role: u.role,
      });
      return {
        token,
        admin: {
          id: d.id,
          email: u.email,
          name: u.name,
          role: u.role,
        },
      };
    }
  }

  // Auto-bootstrap default credentials if admins were cleared
  const defaultCredentials: Record<string, { name: string; role: string; pass: string }> = {
    'admin@keralaneetacademy.org': { name: 'KNA Lead Admin', role: 'superadmin', pass: 'admin123' },
    'staff@keralaneetacademy.org': { name: 'KNA Event Staff', role: 'staff', pass: 'staff123' },
    'food@keralaneetacademy.org': { name: 'KNA Catering & Food Counter', role: 'food', pass: 'food123' },
  };

  if (defaultCredentials[cleanEmail] && defaultCredentials[cleanEmail].pass === passwordPlain) {
    const def = defaultCredentials[cleanEmail];
    await setDoc(doc(db, 'admins', cleanEmail), {
      email: cleanEmail,
      name: def.name,
      role: def.role,
      passwordHash: hashPassword(def.pass),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const token = createAdminToken({ email: cleanEmail, name: def.name, role: def.role });
    return {
      token,
      admin: { id: cleanEmail, email: cleanEmail, name: def.name, role: def.role },
    };
  }

  throw new Error('Invalid administrative email or password');
}

export interface SearchCollegesOptions {
  search?: string;
  state?: string;
  page?: number;
  limit?: number;
}

export interface CollegeSearchResult {
  colleges: MedicalCollegeItem[];
  total: number;
  page: number;
  totalPages: number;
  didYouMean?: string | null;
  detectedLocation?: string | null;
}

/**
 * Searches medical colleges in Firestore / cache
 */
export async function getMedicalColleges(options: SearchCollegesOptions = {}): Promise<CollegeSearchResult> {
  await initMedicalColleges();

  let results = [...cachedColleges];
  const search = (options.search || '').trim().toLowerCase();
  const stateFilter = (options.state || '').trim();

  if (stateFilter && stateFilter !== 'ALL') {
    results = results.filter((c) => c.state.toLowerCase() === stateFilter.toLowerCase());
  }

  if (search) {
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.city.toLowerCase().includes(search) ||
        (c.district && c.district.toLowerCase().includes(search)) ||
        (c.aliases && c.aliases.toLowerCase().includes(search)) ||
        c.state.toLowerCase().includes(search)
    );
  }

  const page = Math.max(1, options.page || 1);
  const limitCount = Math.min(100, Math.max(1, options.limit || 30));
  const total = results.length;
  const totalPages = Math.ceil(total / limitCount) || 1;
  const start = (page - 1) * limitCount;
  const paginated = results.slice(start, start + limitCount);

  return {
    colleges: paginated,
    total,
    page,
    totalPages,
    didYouMean: null,
    detectedLocation: null,
  };
}

export async function adminGetCollegesList(options: any = {}): Promise<any> {
  const res = await getMedicalColleges(options);
  return {
    colleges: res.colleges,
    total: res.total,
    page: res.page,
    pageSize: options.limit || 20,
    totalPages: res.totalPages,
  };
}

export async function adminCreateCollege(data: {
  name: string;
  city: string;
  district?: string;
  state: string;
  type?: string;
  aliases?: string;
}): Promise<any> {
  await initMedicalColleges();
  const newId = cachedColleges.length + 1;
  const newCollege: MedicalCollegeItem = {
    id: newId,
    name: data.name.trim(),
    city: data.city.trim(),
    district: data.district?.trim() || data.city.trim(),
    state: data.state.trim(),
    type: data.type?.trim() || 'Government',
    aliases: data.aliases?.trim() || '',
  };

  cachedColleges.unshift(newCollege);
  await setDoc(doc(db, 'medical_colleges', String(newId)), newCollege);
  return newCollege;
}

export async function adminUpdateCollege(id: number, data: any): Promise<any> {
  await initMedicalColleges();
  const idx = cachedColleges.findIndex((c) => c.id === Number(id));
  if (idx !== -1) {
    cachedColleges[idx] = { ...cachedColleges[idx], ...data };
    await setDoc(doc(db, 'medical_colleges', String(id)), cachedColleges[idx], { merge: true });
    return cachedColleges[idx];
  }
  return null;
}

export async function adminDeleteCollege(id: number): Promise<boolean> {
  await initMedicalColleges();
  cachedColleges = cachedColleges.filter((c) => c.id !== Number(id));
  await deleteDoc(doc(db, 'medical_colleges', String(id)));
  return true;
}

export async function adminGetAllCollegesForExport(): Promise<MedicalCollegeItem[]> {
  await initMedicalColleges();
  return cachedColleges;
}

export async function adminImportColleges(colleges: Array<any>): Promise<{ imported: number }> {
  await initMedicalColleges();
  let count = 0;
  for (const c of colleges) {
    if (!c.name || !c.state) continue;
    const newId = cachedColleges.length + 1;
    const item: MedicalCollegeItem = {
      id: newId,
      name: c.name.trim(),
      city: (c.city || '').trim(),
      district: (c.district || c.city || '').trim(),
      state: c.state.trim(),
      type: c.type || 'Government',
      aliases: c.aliases || '',
    };
    cachedColleges.push(item);
    await setDoc(doc(db, 'medical_colleges', String(newId)), item);
    count++;
  }
  return { imported: count };
}
