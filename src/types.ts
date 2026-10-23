export type WillingnessType = 'WILLING' | 'NON_WILLING';

export type CoatSizeType = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';

export interface MedicalCollegeItem {
  id: number;
  name: string;
  city: string;
  district?: string | null;
  state: string;
  type?: string | null;
  aliases?: string | null;
}

export interface CampusLocationItem {
  id: string;
  name: string;
  city: string;
  region?: string;
  tag: 'Tirunelveli' | 'Regional' | 'Online';
  address?: string;
  code: string;
  phone?: string;
  keywords: string[];
}

export interface StudentRegistrationData {
  studentName: string;
  fatherName: string;
  email: string;
  contactNumber: string;
  campusLocation?: string;
  courseProgram?: string;
  targetYear?: string;
  age?: number | null;
  ntaScore?: number | null;
  photoUrl?: string;
  medicalCollegeId?: number;
  medicalCollegeName?: string;
  medicalCollegeCity?: string;
  medicalCollegeDistrict?: string;
  medicalCollegeState?: string;
  foodVegCount: number;
  foodNonVegCount: number;
  coatSize?: CoatSizeType;
}

export interface ComprehensiveRegistrationData {
  studentName: string;
  fatherName: string;
  email: string;
  contactNumber: string;
  campusLocation: string;
  courseProgram?: string;
  targetYear?: string;
  notes?: string;
}

export interface RegistrationRecord {
  id: number;
  studentCode?: string | null;
  studentName: string;
  fatherName: string;
  email: string;
  contactNumber: string;
  campusLocation?: string | null;
  courseProgram?: string | null;
  targetYear?: string | null;
  age?: number | null;
  ntaScore?: number | null;
  photoUrl?: string | null;
  medicalCollegeId?: number | null;
  medicalCollegeName?: string | null;
  medicalCollegeCity?: string | null;
  medicalCollegeDistrict?: string | null;
  medicalCollegeState?: string | null;
  foodVegCount: number;
  foodNonVegCount: number;
  coatSize?: CoatSizeType | null;
  attendanceChoice?: string | null;
  willingness: WillingnessType;
  checkInStatus?: 'IN' | 'OUT' | 'PENDING' | null;
  checkInTime?: string | null;
  responseId: string;
  notes?: string | null;
  foodCollected?: boolean;
  foodCollectedVegCount?: number;
  foodCollectedNonVegCount?: number;
  foodCollectedAt?: string | null;
  foodCollectedStaff?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FoodManagementStats {
  totalOrderedFood: number;
  totalOrderedVeg: number;
  totalOrderedNonVeg: number;
  checkedInOrderedVeg: number;
  checkedInOrderedNonVeg: number;
  checkedInTotalFood: number;
  collectedVegCount: number;
  collectedNonVegCount: number;
  totalCollectedFood: number;
  pendingVegCount: number;
  pendingNonVegCount: number;
  totalPendingFood: number;
  totalCheckedInStudents: number;
  totalCollectedStudents: number;
  totalPendingStudents: number;
}

export interface EventSettingsRecord {
  id: number;
  academyName: string;
  eventName: string;
  description: string;
  codePrefix: string;
  nextCodeNumber: number;
  codeDigits: number;
  logoUrl?: string | null;
  pdfHeader?: string | null;
  pdfFooter?: string | null;
  maxFoodCount: number;
}

export interface DashboardStats {
  totalRegistrations: number;
  totalWilling: number;
  totalNonWilling: number;
  willingCount?: number;
  nonWillingCount?: number;
  totalAttendees?: number;
  checkedInCount?: number;
  pendingCheckInCount?: number;
  totalPendingAttendees?: number;
  foodVegCount: number;
  foodNonVegCount: number;
  vegCount?: number;
  nonVegCount?: number;
  totalFoodCount: number;
  foodCollectedCount?: number;
  foodPendingCount?: number;
  coatSizes: Record<string, number>;
  coatSizeBreakdown?: Array<{ size: string; count: number }>;
  stateStats: Array<{ state: string; count: number }>;
  collegeStats: Array<{ college: string; count: number }>;
  recentRegistrations: RegistrationRecord[];
  campusBreakdown?: Array<{ campus: string; count: number }>;
}
