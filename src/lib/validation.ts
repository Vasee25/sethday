import { z } from 'zod';

export const phoneRegex = /^[6-9]\d{9}$/;

export function sanitizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

export const studentRegistrationSchema = z.object({
  studentName: z.string().trim().min(2, 'Student Name must be at least 2 characters').max(100, 'Student Name is too long'),
  fatherName: z.string().trim().min(2, "Father's Name must be at least 2 characters").max(100, "Father's Name is too long"),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val ? val.toLowerCase() : ''))
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Please enter a valid email address',
    }),
  contactNumber: z.string().trim().refine(
    (val) => phoneRegex.test(sanitizePhoneNumber(val)),
    { message: 'Please enter a valid 10-digit Indian mobile number (e.g., 9847012345)' }
  ),
  age: z.coerce.number().int().optional().nullable().default(18),
  ntaScore: z.coerce.number().int().min(0, 'NTA Score must be at least 0').max(720, 'NTA Score cannot exceed 720').optional().nullable(),
  photoUrl: z.string().min(1, 'Please upload your student photo'),
  medicalCollegeId: z.coerce.number().optional(),
  medicalCollegeName: z.string().optional(),
  medicalCollegeCity: z.string().optional(),
  medicalCollegeDistrict: z.string().optional(),
  medicalCollegeState: z.string().optional(),
  foodVegCount: z.coerce.number().int().min(0, 'Veg count cannot be negative').default(0),
  foodNonVegCount: z.coerce.number().int().min(0, 'Non-veg count cannot be negative').default(0),
  coatSize: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']),
  campusLocation: z.string().optional().nullable(),
  courseProgram: z.string().optional().nullable(),
  targetYear: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  attendanceChoice: z.string().optional().nullable(),
});

export type RegistrationFormValues = z.infer<typeof studentRegistrationSchema>;
