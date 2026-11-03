import { db } from './firebase.ts';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import type { RegistrationRecord, FoodManagementStats } from '../types.ts';
import { normalizeRegistration } from './firestoreHelpers.ts';

export interface ParsedFoodInfo {
  foodCollected: boolean;
  foodCollectedVegCount: number;
  foodCollectedNonVegCount: number;
  foodCollectedAt: string | null;
  foodCollectedStaff: string | null;
}

export function parseFoodInfo(record: any): ParsedFoodInfo {
  if (!record) {
    return {
      foodCollected: false,
      foodCollectedVegCount: 0,
      foodCollectedNonVegCount: 0,
      foodCollectedAt: null,
      foodCollectedStaff: null,
    };
  }

  // 1. Direct fields
  if (record.foodCollected === true || record.food_collected === true) {
    return {
      foodCollected: true,
      foodCollectedVegCount: Number(
        record.foodCollectedVegCount ?? record.food_collected_veg_count ?? record.foodVegCount ?? record.food_veg_count ?? 0
      ),
      foodCollectedNonVegCount: Number(
        record.foodCollectedNonVegCount ?? record.food_collected_non_veg_count ?? record.foodNonVegCount ?? record.food_non_veg_count ?? 0
      ),
      foodCollectedAt: record.foodCollectedAt || record.food_collected_at || null,
      foodCollectedStaff: record.foodCollectedStaff || record.food_collected_staff || null,
    };
  }

  // 2. Parse from notes JSON if present
  if (record.notes) {
    try {
      const parsed = typeof record.notes === 'string' ? JSON.parse(record.notes) : record.notes;
      if (parsed && typeof parsed === 'object') {
        const fc = parsed.foodCollection || parsed;
        if (fc.foodCollected === true || fc.collected === true) {
          return {
            foodCollected: true,
            foodCollectedVegCount: Number(
              fc.foodCollectedVegCount ?? fc.vegCount ?? record.foodVegCount ?? record.food_veg_count ?? 0
            ),
            foodCollectedNonVegCount: Number(
              fc.foodCollectedNonVegCount ?? fc.nonVegCount ?? record.foodNonVegCount ?? record.food_non_veg_count ?? 0
            ),
            foodCollectedAt: fc.foodCollectedAt || fc.collectedAt || null,
            foodCollectedStaff: fc.foodCollectedStaff || fc.staff || fc.staffEmail || null,
          };
        }
      }
    } catch {}
  }

  return {
    foodCollected: false,
    foodCollectedVegCount: 0,
    foodCollectedNonVegCount: 0,
    foodCollectedAt: null,
    foodCollectedStaff: null,
  };
}

export function attachFoodInfo(record: any): RegistrationRecord {
  const norm = normalizeRegistration(record.id ? String(record.id) : record.studentCode || record.responseId, record);
  const fi = parseFoodInfo(record);

  return {
    ...norm,
    foodCollected: fi.foodCollected,
    foodCollectedVegCount: fi.foodCollectedVegCount,
    foodCollectedNonVegCount: fi.foodCollectedNonVegCount,
    foodCollectedAt: fi.foodCollectedAt,
    foodCollectedStaff: fi.foodCollectedStaff,
  };
}

export async function getFoodManagementData(): Promise<{
  stats: FoodManagementStats;
  attendees: RegistrationRecord[];
}> {
  const snapshot = await getDocs(collection(db, 'registrations'));
  const attendees: RegistrationRecord[] = [];

  for (const docSnap of snapshot.docs) {
    const d = docSnap.data();
    if (d.willingness === 'WILLING') {
      attendees.push(attachFoodInfo({ ...d, id: docSnap.id }));
    }
  }

  // Sort by studentCode
  attendees.sort((a, b) => (a.studentCode || a.responseId).localeCompare(b.studentCode || b.responseId));

  // Calculate statistics
  let totalOrderedVeg = 0;
  let totalOrderedNonVeg = 0;
  let checkedInOrderedVeg = 0;
  let checkedInOrderedNonVeg = 0;
  let collectedVegCount = 0;
  let collectedNonVegCount = 0;
  let totalCheckedInStudents = 0;
  let totalCollectedStudents = 0;
  let totalPendingStudents = 0;

  for (const a of attendees) {
    const veg = a.foodVegCount || 0;
    const nonVeg = a.foodNonVegCount || 0;
    totalOrderedVeg += veg;
    totalOrderedNonVeg += nonVeg;

    const isCheckedIn = a.checkInStatus === 'IN';
    const isCollected = a.foodCollected === true;

    if (isCheckedIn) {
      totalCheckedInStudents++;
      checkedInOrderedVeg += veg;
      checkedInOrderedNonVeg += nonVeg;

      if (!isCollected) {
        totalPendingStudents++;
      }
    }

    if (isCollected) {
      totalCollectedStudents++;
      collectedVegCount += a.foodCollectedVegCount || veg;
      collectedNonVegCount += a.foodCollectedNonVegCount || nonVeg;
    }
  }

  const totalOrderedFood = totalOrderedVeg + totalOrderedNonVeg;
  const checkedInTotalFood = checkedInOrderedVeg + checkedInOrderedNonVeg;
  const totalCollectedFood = collectedVegCount + collectedNonVegCount;
  const pendingVegCount = Math.max(0, checkedInOrderedVeg - collectedVegCount);
  const pendingNonVegCount = Math.max(0, checkedInOrderedNonVeg - collectedNonVegCount);
  const totalPendingFood = pendingVegCount + pendingNonVegCount;

  const stats: FoodManagementStats = {
    totalOrderedFood,
    totalOrderedVeg,
    totalOrderedNonVeg,
    checkedInOrderedVeg,
    checkedInOrderedNonVeg,
    checkedInTotalFood,
    collectedVegCount,
    collectedNonVegCount,
    totalCollectedFood,
    pendingVegCount,
    pendingNonVegCount,
    totalPendingFood,
    totalCheckedInStudents,
    totalCollectedStudents,
    totalPendingStudents,
  };

  return { stats, attendees };
}

export async function findAttendeeForFood(query: string): Promise<RegistrationRecord | null> {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return null;

  const snapshot = await getDocs(collection(db, 'registrations'));
  const cleanPhone = cleanQ.replace(/\D/g, '');

  let bestMatch: RegistrationRecord | null = null;
  let highestScore = 0;

  for (const docSnap of snapshot.docs) {
    const d = docSnap.data();
    if (d.willingness !== 'WILLING') continue;

    const code = (d.studentCode || '').toLowerCase();
    const respId = (d.responseId || '').toLowerCase();
    const name = (d.studentName || '').toLowerCase();
    const phone = (d.contactNumber || '').replace(/\D/g, '');

    let score = 0;
    if (code === cleanQ) score = 100;
    else if (respId === cleanQ) score = 90;
    else if (name === cleanQ) score = 80;
    else if (cleanPhone.length >= 10 && phone.slice(-10) === cleanPhone.slice(-10)) score = 75;
    else if (code.includes(cleanQ)) score = 60;
    else if (name.includes(cleanQ)) score = 50;

    if (score > highestScore) {
      highestScore = score;
      bestMatch = attachFoodInfo({ ...d, id: docSnap.id });
    }
  }

  return bestMatch;
}

export async function markFoodCollected(
  studentCodeOrId: string,
  vegCount: number,
  nonVegCount: number,
  staffEmail: string
): Promise<{ success: boolean; record: RegistrationRecord; stats: FoodManagementStats }> {
  const attendee = await findAttendeeForFood(studentCodeOrId);
  if (!attendee) {
    throw new Error(`Attendee not found matching "${studentCodeOrId}".`);
  }

  const docId = attendee.studentCode || attendee.responseId;
  const regRef = doc(db, 'registrations', docId);

  const maxVeg = attendee.foodVegCount || 0;
  const maxNonVeg = attendee.foodNonVegCount || 0;
  const targetVeg = Math.max(0, Math.min(vegCount, maxVeg));
  const targetNonVeg = Math.max(0, Math.min(nonVegCount, maxNonVeg));

  if (targetVeg > maxVeg) {
    throw new Error(`Invalid: Cannot collect ${targetVeg} Vegetarian meals. Ordered limit for this pass is ${maxVeg}.`);
  }
  if (targetNonVeg > maxNonVeg) {
    throw new Error(`Invalid: Cannot collect ${targetNonVeg} Non-Veg meals. Ordered limit for this pass is ${maxNonVeg}.`);
  }

  const collectedAt = new Date().toISOString();
  const staff = staffEmail || 'food@keralaneetacademy.org';

  const updateData = {
    foodCollected: true,
    foodCollectedVegCount: targetVeg,
    foodCollectedNonVegCount: targetNonVeg,
    foodCollectedAt: collectedAt,
    foodCollectedStaff: staff,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(regRef, updateData);

  const updatedDoc = await getDoc(regRef);
  const updatedRecord = attachFoodInfo({ ...updatedDoc.data(), id: docId });

  const { stats } = await getFoodManagementData();
  return { success: true, record: updatedRecord, stats };
}

export async function revertFoodCollected(
  identifier: string,
  staffEmail?: string
): Promise<{ success: boolean; record: RegistrationRecord; stats: FoodManagementStats }> {
  const attendee = await findAttendeeForFood(identifier);
  if (!attendee) {
    throw new Error(`Attendee not found matching "${identifier}".`);
  }

  const docId = attendee.studentCode || attendee.responseId;
  const regRef = doc(db, 'registrations', docId);

  const updateData = {
    foodCollected: false,
    foodCollectedVegCount: 0,
    foodCollectedNonVegCount: 0,
    foodCollectedAt: null,
    foodCollectedStaff: null,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(regRef, updateData);

  const updatedDoc = await getDoc(regRef);
  const updatedRecord = attachFoodInfo({ ...updatedDoc.data(), id: docId });

  const { stats } = await getFoodManagementData();
  return { success: true, record: updatedRecord, stats };
}
