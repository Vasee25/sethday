import express, { type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  getMedicalColleges,
  checkDuplicate,
  createNonWillingResponse,
  createWillingRegistration,
  createComprehensiveRegistration,
  getRegistrationByCodeOrId,
  getDashboardStats,
  getRegistrationsList,
  getAllRegistrationsForExport,
  deleteRegistration,
  updateRegistration,
  toggleCheckIn,
  getSettings,
  updateSettings,
  adminLogin,
  verifyAdminToken,
  adminGetCollegesList,
  adminCreateCollege,
  adminUpdateCollege,
  adminDeleteCollege,
  adminGetAllCollegesForExport,
  adminImportColleges,
} from './src/lib/firestoreHelpers.ts';
import { studentRegistrationSchema } from './src/lib/validation.ts';
import { generateStudentPDF } from './src/lib/pdf.ts';
import { getRegistrationFromFirestore, saveRegistrationToFirestore, deleteRegistrationFromFirestore } from './src/lib/firebase.ts';
import {
  getFoodManagementData,
  findAttendeeForFood,
  markFoodCollected,
  revertFoodCollected,
} from './src/lib/foodHelpers.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Support larger payloads for student photos (base64 compressed)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize DB seed tables lazily
initDatabase().catch((err) => console.error('Error in initDatabase:', err));

// Safe ISO string formatter for strings, Dates, and Firestore Timestamps
function toIsoStringSafe(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val.toISOString === 'function') return val.toISOString();
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

// Admin Auth Middleware (supports Bearer header and ?token= query parameter)
const requireAdmin = (req: Request, res: Response, next: Function) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }
  next();
};

// ==================== PUBLIC API ROUTES ====================

// Direct Asset Routes for Uploaded Images
app.get('/03-1.jpeg', (req, res) => {
  const filePath = path.join(process.cwd(), 'public', '03-1.jpeg');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.redirect('https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1920&q=80');
});

app.get(['/KNA.png', '/kna.png'], (req, res) => {
  const knaPath = path.join(process.cwd(), 'public', 'KNA.png');
  if (fs.existsSync(knaPath)) {
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(knaPath);
  }
  res.status(404).send('Logo not found');
});

app.get(['/kna_logo_..png', '/Kna_logo_..png'], (req, res) => {
  const bigPngPath = path.join(process.cwd(), 'public', 'kna_logo_..png');
  if (fs.existsSync(bigPngPath)) {
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(bigPngPath);
  }
  res.status(404).send('Logo not found');
});

app.get(['/kna_logo_.png', '/kna_logo.png'], (req, res) => {
  const pngPath = path.join(process.cwd(), 'public', 'kna_logo_.png');
  if (fs.existsSync(pngPath)) {
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(pngPath);
  }
  res.status(404).send('Logo not found');
});

// Backend logo upload endpoint to save KNA.png
app.post(['/api/admin/upload-logo', '/api/upload-logo'], async (req: Request, res: Response) => {
  try {
    const imageBase64 = req.body.imageBase64 || req.body.image;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image base64 provided' });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const publicTarget = path.join(process.cwd(), 'public', 'KNA.png');
    fs.writeFileSync(publicTarget, buffer);

    const distDir = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, 'KNA.png'), buffer);
    }

    res.json({
      success: true,
      message: 'Official KNA.png logo saved and updated successfully',
      filename: 'KNA.png',
      url: `/KNA.png?t=${Date.now()}`,
    });
  } catch (err: any) {
    console.error('Error saving uploaded logo:', err);
    res.status(500).json({ error: 'Failed to save logo: ' + err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Public Event Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      academyName: settings?.academyName || 'Kerala NEET Academy',
      eventName: settings?.eventName || 'STETH DAY',
      description: settings?.description || 'Your Journey Towards Medicine Starts Here',
      codePrefix: settings?.codePrefix || 'KNA',
      maxFoodCount: settings?.maxFoodCount || 5,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch event settings' });
  }
});

// Smart Medical College Search & Directory
app.get('/api/colleges', async (req, res) => {
  try {
    const search = (req.query.search || req.query.q || '') as string;
    const state = (req.query.state || '') as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;

    const result = await getMedicalColleges({ search, state, page, limit });
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/colleges:', error);
    res.status(500).json({ error: 'Failed to load medical colleges' });
  }
});

// Duplicate Detection
app.post('/api/register/check-duplicate', async (req, res) => {
  try {
    const { email, contactNumber } = req.body;
    if (!email || !contactNumber) {
      return res.status(400).json({ error: 'Email and contact number are required' });
    }
    const duplicate = await checkDuplicate(email, contactNumber);
    if (duplicate) {
      return res.json({
        exists: true,
        studentCode: duplicate.studentCode,
        message: 'A registration with these details already exists. Please contact the administration if you need to make a correction.',
      });
    }
    res.json({ exists: false });
  } catch (error: any) {
    res.status(500).json({ error: 'Error checking duplicate status' });
  }
});

// Non-Willing Registration Flow
app.post('/api/register/non-willing', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const record = await createNonWillingResponse(clientIp);
    res.status(201).json({
      success: true,
      responseId: record.responseId,
      willingness: record.willingness,
      createdAt: record.createdAt,
      message: 'Your response has been recorded successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record response. Please try again.' });
  }
});

// Willing Registration Flow (Sequential KNA Code Generation)
app.post('/api/register/willing', async (req, res) => {
  try {
    // 1. Validate payload with Zod
    const validation = studentRegistrationSchema.safeParse(req.body);
    if (!validation.success) {
      const firstError = validation.error.issues?.[0]?.message || 'Invalid registration data';
      return res.status(400).json({ error: firstError, details: validation.error.format() });
    }

    // 2. Process registration atomically
    const record = await createWillingRegistration(validation.data as any);

    res.status(record.isUpdated ? 200 : 201).json({
      success: true,
      isUpdated: Boolean(record.isUpdated),
      message: record.isUpdated ? 'Registration updated successfully!' : 'Registration submitted successfully!',
      studentCode: record.student_code,
      responseId: record.response_id,
      record: {
        id: record.id,
        studentCode: record.student_code,
        studentName: record.student_name,
        fatherName: record.father_name,
        email: record.email,
        contactNumber: record.contact_number,
        age: record.age,
        ntaScore: record.ntaScore ?? record.nta_score,
        photoUrl: record.photo_url,
        medicalCollegeName: record.medical_college_name,
        medicalCollegeState: record.medical_college_state,
        foodVegCount: record.food_veg_count,
        foodNonVegCount: record.food_non_veg_count,
        coatSize: record.coat_size,
        campusLocation: record.campus_location,
        courseProgram: record.course_program,
        targetYear: record.target_year,
        willingness: record.willingness,
        responseId: record.response_id,
        createdAt: record.created_at,
      },
    });
  } catch (error: any) {
    if (error.code === 'DUPLICATE_REGISTRATION') {
      return res.status(409).json({
        error: 'A registration with these details already exists. Please contact the administration if you need to make a correction.',
        existingStudentCode: error.existingStudentCode,
      });
    }
    console.error('Registration processing error:', error);
    res.status(500).json({ error: 'Unable to submit your registration. Please try again or contact the administration.' });
  }
});

// Comprehensive Registration Flow (Direct Academy Form)
app.post('/api/register/comprehensive', async (req, res) => {
  try {
    const { studentName, fatherName, email, contactNumber, campusLocation, courseProgram, targetYear, notes } = req.body;

    if (!studentName || typeof studentName !== 'string' || studentName.trim().length < 2) {
      return res.status(400).json({ error: 'Student Name is required (min 2 characters)' });
    }
    if (!fatherName || typeof fatherName !== 'string' || fatherName.trim().length < 2) {
      return res.status(400).json({ error: "Father's Name is required (min 2 characters)" });
    }
    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    const cleanPhone = contactNumber ? String(contactNumber).replace(/\D/g, '') : '';
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number' });
    }
    if (!campusLocation || typeof campusLocation !== 'string' || !campusLocation.trim()) {
      return res.status(400).json({ error: 'Campus branch location is required' });
    }

    const record = await createComprehensiveRegistration({
      studentName: studentName.trim(),
      fatherName: fatherName.trim(),
      email: email.trim().toLowerCase(),
      contactNumber: cleanPhone,
      campusLocation: campusLocation.trim(),
      courseProgram: courseProgram || 'NEET Repeaters Batch',
      targetYear: targetYear || 'NEET 2026',
      notes: notes || undefined,
    });

    res.status(record.isUpdated ? 200 : 201).json({
      success: true,
      isUpdated: Boolean(record.isUpdated),
      message: record.isUpdated ? 'Enrollment updated successfully!' : 'Enrollment submitted successfully!',
      studentCode: record.student_code,
      responseId: record.response_id,
      record: {
        id: record.id,
        studentCode: record.student_code,
        studentName: record.student_name,
        fatherName: record.father_name,
        email: record.email,
        contactNumber: record.contact_number,
        campusLocation: record.campus_location,
        courseProgram: record.course_program,
        targetYear: record.target_year,
        willingness: record.willingness,
        responseId: record.response_id,
        createdAt: record.created_at,
      },
    });
  } catch (error: any) {
    if (error.code === 'DUPLICATE_REGISTRATION') {
      return res.status(409).json({
        error: 'A student registration with this email or mobile number already exists.',
        existingStudentCode: error.existingStudentCode,
      });
    }
    console.error('Comprehensive registration error:', error);
    res.status(500).json({ error: 'Unable to submit your registration. Please try again.' });
  }
});

// Fetch Registration by Student Code or Response ID (Strictly Active Records)
app.get('/api/registration/:codeOrId', async (req, res) => {
  try {
    const rawParam = req.params.codeOrId ? decodeURIComponent(req.params.codeOrId).trim() : '';
    const record: any = await getRegistrationByCodeOrId(rawParam);
    if (!record) {
      return res.status(404).json({ error: 'Registration not found or no longer active in admin console.' });
    }
    res.json(record);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve registration' });
  }
});

// Server-side PDF generation & download (Strictly Active Records)
app.get('/api/registration/:codeOrId/pdf', async (req, res) => {
  try {
    const rawParam = req.params.codeOrId ? decodeURIComponent(req.params.codeOrId).trim() : '';
    const record: any = await getRegistrationByCodeOrId(rawParam);
    if (!record) {
      return res.status(404).json({ error: `Active registration pass not found for: ${rawParam}. If this record was deleted from the admin console, the pass is inactive.` });
    }
    const settings = await getSettings();
    const { doc, filename } = await generateStudentPDF(record as any, settings);
    
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to generate registration PDF',
      message: error?.message || String(error)
    });
  }
});

// ==================== ADMIN API ROUTES ====================

// Admin, Staff & Food Login
app.post(['/api/admin/login', '/api/staff/login', '/api/food/login'], async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const authResult = await adminLogin(email, password);
    if (!authResult) {
      return res.status(401).json({ error: 'Invalid administrative credentials' });
    }
    res.json(authResult);
  } catch (error: any) {
    res.status(500).json({ error: 'Admin authentication failed' });
  }
});

// Admin Dashboard Stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Admin List Registrations
app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
  try {
    const search = req.query.search as string;
    const willingness = req.query.willingness as string;
    const coatSize = req.query.coatSize as string;
    const campusLocation = req.query.campusLocation as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const data = await getRegistrationsList({
      search,
      willingness,
      coatSize,
      campusLocation,
      page,
      pageSize,
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list registrations' });
  }
});

// Admin Update Registration
app.put('/api/admin/registrations/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await updateRegistration(id, req.body);
    if (updated) {
      saveRegistrationToFirestore(updated as any);
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update student registration' });
  }
});

// Admin Check-In / Attendance Toggle
app.post('/api/admin/check-in', requireAdmin, async (req, res) => {
  try {
    const { identifier, status, allowDuplicate } = req.body;
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ error: 'Student code or ID is required' });
    }
    const result: any = await toggleCheckIn(identifier, status, { allowDuplicate: !!allowDuplicate });
    if (!result) {
      return res.status(404).json({ error: 'Student registration not found' });
    }

    if (result.alreadyIn) {
      return res.status(200).json({
        success: false,
        alreadyIn: true,
        error: 'Already In',
        message: `${result.studentName} is already checked in.`,
        record: result,
        studentCode: result.studentCode || result.responseId,
        studentName: result.studentName,
        checkInStatus: 'IN',
        checkInTime: toIsoStringSafe(result.checkInTime),
      });
    }

    // Real-time Firestore sync
    saveRegistrationToFirestore({
      ...result,
      checkInStatus: result.checkInStatus as any,
      checkInTime: toIsoStringSafe(result.checkInTime),
    } as any);

    res.json({
      success: true,
      alreadyIn: false,
      record: result,
      checkInStatus: result.checkInStatus,
      checkInTime: toIsoStringSafe(result.checkInTime),
      studentCode: result.studentCode,
      studentName: result.studentName,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: error.message || 'Check-in failed' });
  }
});

// Live Event Real-Time Analytics & Live Attendee Stream
app.get('/api/event/analytics', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    const attendeesData = await getRegistrationsList({
      willingness: 'WILLING',
      page: 1,
      pageSize: 500,
    });
    res.json({
      stats,
      attendees: attendeesData.items || [],
      totalCount: attendeesData.total || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching event analytics:', error);
    res.status(500).json({ error: 'Failed to fetch event analytics' });
  }
});

// Event Reception Gate Quick Check-In (with real-time Firestore sync & entry validation)
app.post(['/api/event/check-in', '/api/check-in'], async (req, res) => {
  try {
    const { identifier, status, allowDuplicate } = req.body;
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ error: 'Student code or ID is required' });
    }
    const result: any = await toggleCheckIn(identifier, status, { allowDuplicate: !!allowDuplicate });
    if (!result) {
      return res.status(404).json({ error: 'Student registration not found' });
    }

    // Entry validation: detect duplicate check-in
    if (result.alreadyIn) {
      return res.status(200).json({
        success: false,
        alreadyIn: true,
        error: 'Already In',
        message: `${result.studentName} (${result.studentCode || result.responseId}) has already checked in.`,
        record: result,
        studentCode: result.studentCode || result.responseId,
        studentName: result.studentName,
        checkInStatus: 'IN',
        checkInTime: toIsoStringSafe(result.checkInTime),
      });
    }

    saveRegistrationToFirestore({
      ...result,
      checkInStatus: result.checkInStatus as any,
      checkInTime: toIsoStringSafe(result.checkInTime),
    } as any);

    const stats = await getDashboardStats();

    res.json({
      success: true,
      alreadyIn: false,
      record: result,
      checkInStatus: result.checkInStatus,
      checkInTime: toIsoStringSafe(result.checkInTime),
      studentCode: result.studentCode,
      studentName: result.studentName,
      stats,
    });
  } catch (error: any) {
    console.error('Error in event check-in:', error);
    res.status(500).json({ error: error.message || 'Check-in failed' });
  }
});

// Live Event Analytics alias
app.get(['/api/event/analytics', '/api/analytics'], async (req, res) => {
  try {
    const stats = await getDashboardStats();
    const attendeesData = await getRegistrationsList({
      willingness: 'WILLING',
      page: 1,
      pageSize: 500,
    });
    res.json({
      stats,
      attendees: attendeesData.items || [],
      totalCount: attendeesData.total || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching event analytics:', error);
    res.status(500).json({ error: 'Failed to fetch event analytics' });
  }
});

// ==================== FOOD CATERING & COUNTER API ROUTES ====================

// Get all food data, counts and attendees
app.get('/api/food/data', async (req, res) => {
  try {
    const data = await getFoodManagementData();
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching food data:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch food management data' });
  }
});

// Verify attendee by student code or name for food collection
app.post('/api/food/verify', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query (Student ID or Name) is required.' });
    }
    const attendee = await findAttendeeForFood(query);
    if (!attendee) {
      return res.status(404).json({ error: `No attendee found matching "${query}". Please check the student code or name.` });
    }

    const totalOrdered = (attendee.foodVegCount || 0) + (attendee.foodNonVegCount || 0);
    const collectedVeg = attendee.foodCollectedVegCount || 0;
    const collectedNonVeg = attendee.foodCollectedNonVegCount || 0;
    const totalCollected = collectedVeg + collectedNonVeg;
    const remainingLimit = Math.max(0, totalOrdered - (attendee.foodCollected ? totalOrdered : totalCollected));

    let scanValidationStatus: 'VALID' | 'INVALID' = 'VALID';
    let scanValidationReason = '';

    if (totalOrdered === 0) {
      scanValidationStatus = 'INVALID';
      scanValidationReason = 'Invalid: 0 food items were ordered on this registration pass.';
    } else if (attendee.foodCollected === true || remainingLimit <= 0) {
      scanValidationStatus = 'INVALID';
      scanValidationReason = `Invalid: Food limit exceeded. All ${totalOrdered} ordered food items have already been collected.`;
    }

    res.json({
      success: true,
      record: attendee,
      isCheckedIn: attendee.checkInStatus === 'IN',
      isCollected: attendee.foodCollected === true,
      orderedVeg: attendee.foodVegCount || 0,
      orderedNonVeg: attendee.foodNonVegCount || 0,
      totalOrdered,
      totalCollected,
      remainingLimit,
      scanValidationStatus,
      scanValidationReason,
    });
  } catch (error: any) {
    console.error('Error verifying student for food:', error);
    res.status(500).json({ error: error.message || 'Failed to verify attendee' });
  }
});

// Register meal collection for a student
app.post('/api/food/collect', async (req, res) => {
  try {
    const { identifier, vegCount, nonVegCount, staffEmail } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Student identifier is required.' });
    }
    const result = await markFoodCollected(
      identifier,
      vegCount !== undefined ? Number(vegCount) : undefined,
      nonVegCount !== undefined ? Number(nonVegCount) : undefined,
      staffEmail
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error collecting food:', error);
    res.status(400).json({ error: error.message || 'Failed to register food collection' });
  }
});

// Revert meal collection (undo)
app.post('/api/food/revert', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Student identifier is required.' });
    }
    const result = await revertFoodCollected(identifier);
    res.json(result);
  } catch (error: any) {
    console.error('Error reverting food collection:', error);
    res.status(400).json({ error: error.message || 'Failed to revert food collection' });
  }
});

// Admin Delete Registration
app.delete('/api/admin/registrations/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await deleteRegistration(id);
    if (deleted) {
      if (deleted.studentCode) {
        await deleteRegistrationFromFirestore(deleted.studentCode);
      }
      if (deleted.responseId) {
        await deleteRegistrationFromFirestore(deleted.responseId);
      }
    }
    res.json({ success: true, message: 'Registration deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

// Admin Export CSV
app.get('/api/admin/export/csv', requireAdmin, async (req, res) => {
  try {
    const rows = await getAllRegistrationsForExport();
    
    // Build CSV string with RFC-4180 escaping
    const headers = [
      'Student Code',
      'Student Name',
      "Father's Name",
      'Email ID',
      'Contact Number',
      'Campus Location',
      'Course Program',
      'Target Year',
      'Age',
      'Medical College',
      'State',
      'Veg Meals',
      'Non-Veg Meals',
      'Total Meals',
      'Coat Size',
      'Willingness Status',
      'Registration Date',
      'Response ID',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    const csvLines = [headers.map(escapeCsv).join(',')];

    for (const r of rows) {
      const totalFood = (r.foodVegCount || 0) + (r.foodNonVegCount || 0);
      const row = [
        r.studentCode || 'N/A',
        r.studentName,
        r.fatherName || '',
        r.email,
        r.contactNumber,
        r.campusLocation || '',
        r.courseProgram || '',
        r.targetYear || '',
        r.age || '',
        r.medicalCollegeName || '',
        r.medicalCollegeState || '',
        r.foodVegCount,
        r.foodNonVegCount,
        totalFood,
        r.coatSize || '',
        r.willingness,
        new Date(r.createdAt).toISOString(),
        r.responseId,
      ];
      csvLines.push(row.map(escapeCsv).join(','));
    }

    const csvOutput = csvLines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="KNA_STETH_DAY_Registrations_${Date.now()}.csv"`);
    res.send(csvOutput);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Admin Export Excel (.xlsx format with styled sheet and columns)
app.get('/api/admin/export/excel', requireAdmin, async (req, res) => {
  try {
    const rows = await getAllRegistrationsForExport();

    const formattedData = rows.map((r: any, idx: number) => {
      const totalFood = (Number(r.foodVegCount) || 0) + (Number(r.foodNonVegCount) || 0);
      return {
        'S.No': idx + 1,
        'Student Code': r.studentCode || 'N/A',
        'Student Name': r.studentName || '',
        "Father's Name": r.fatherName || '',
        'Email ID': r.email || '',
        'Contact Number': r.contactNumber || '',
        'Campus Location': r.campusLocation || '',
        'Course Program': r.courseProgram || '',
        'Target Year': r.targetYear || '',
        'Age': r.age ?? '',
        'NTA Score': r.ntaScore ?? r.nta_score ?? '',
        'Medical College': r.medicalCollegeName || '',
        'College State': r.medicalCollegeState || '',
        'Veg Meals': r.foodVegCount ?? 0,
        'Non-Veg Meals': r.foodNonVegCount ?? 0,
        'Total Meals': totalFood,
        'Coat / Apron Size': r.coatSize || '',
        'Willingness Status': r.willingness || 'ATTENDING',
        'Registration Date': r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
        'Response ID': r.responseId || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 6 },  // S.No
      { wch: 15 }, // Student Code
      { wch: 24 }, // Student Name
      { wch: 20 }, // Father Name
      { wch: 26 }, // Email
      { wch: 16 }, // Contact
      { wch: 18 }, // Campus
      { wch: 18 }, // Course
      { wch: 12 }, // Target Year
      { wch: 8 },  // Age
      { wch: 32 }, // Medical College
      { wch: 16 }, // College State
      { wch: 12 }, // Veg
      { wch: 14 }, // Non-Veg
      { wch: 12 }, // Total Meals
      { wch: 16 }, // Coat Size
      { wch: 18 }, // Status
      { wch: 22 }, // Date
      { wch: 20 }, // Response ID
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="KNA_STETH_DAY_Registrations_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Failed to export Excel:', error);
    res.status(500).json({ error: 'Failed to export Excel: ' + (error.message || '') });
  }
});

// Admin Settings
app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const updated = await updateSettings(req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==================== ADMIN MEDICAL COLLEGES CRUD ====================

// List colleges with search, state, type, pagination
app.get('/api/admin/colleges', requireAdmin, async (req, res) => {
  try {
    const search = (req.query.search || '') as string;
    const state = (req.query.state || '') as string;
    const type = (req.query.type || '') as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const data = await adminGetCollegesList({ search, state, type, page, pageSize });
    res.json(data);
  } catch (error: any) {
    console.error('Error in /api/admin/colleges:', error);
    res.status(500).json({ error: 'Failed to list medical colleges' });
  }
});

// Create college
app.post('/api/admin/colleges', requireAdmin, async (req, res) => {
  try {
    const { name, city, district, state, type, aliases } = req.body;
    if (!name || !city || !state) {
      return res.status(400).json({ error: 'Name, City, and State are required' });
    }
    const college = await adminCreateCollege({ name, city, district, state, type, aliases });
    res.status(201).json(college);
  } catch (error: any) {
    console.error('Error adding college:', error);
    res.status(500).json({ error: 'Failed to add medical college' });
  }
});

// Update college
app.put('/api/admin/colleges/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await adminUpdateCollege(id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating college:', error);
    res.status(500).json({ error: 'Failed to update medical college' });
  }
});

// Delete college
app.delete('/api/admin/colleges/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await adminDeleteCollege(id);
    res.json({ success: true, message: 'Medical college removed successfully' });
  } catch (error: any) {
    console.error('Error deleting college:', error);
    res.status(500).json({ error: 'Failed to delete medical college' });
  }
});

// Export colleges to CSV
app.get('/api/admin/colleges/export/csv', requireAdmin, async (req, res) => {
  try {
    const rows = await adminGetAllCollegesForExport();
    const csvLines = [
      'ID,College Name,City,District,State,College Type,Aliases,Created At'
    ];

    const escape = (str: any) => {
      if (str === null || str === undefined) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    for (const r of rows) {
      csvLines.push([
        r.id,
        escape(r.name),
        escape(r.city),
        escape(r.district || ''),
        escape(r.state),
        escape(r.type || ''),
        escape(r.aliases || ''),
        (r as any).created_at || (r as any).createdAt ? new Date((r as any).created_at || (r as any).createdAt).toISOString() : new Date().toISOString(),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Medical_Colleges_Directory_${Date.now()}.csv"`);
    res.send(csvLines.join('\r\n'));
  } catch (error: any) {
    console.error('Error exporting colleges:', error);
    res.status(500).json({ error: 'Failed to export medical colleges' });
  }
});

// Import colleges in bulk
app.post('/api/admin/colleges/import', requireAdmin, async (req, res) => {
  try {
    const { colleges } = req.body;
    if (!Array.isArray(colleges) || colleges.length === 0) {
      return res.status(400).json({ error: 'Invalid colleges list. Must be non-empty array.' });
    }
    const result = await adminImportColleges(colleges);
    res.json(result);
  } catch (error: any) {
    console.error('Error importing colleges:', error);
    res.status(500).json({ error: 'Failed to import medical colleges' });
  }
});

// Explicit 404 JSON fallback for unhandled /api/* routes (prevents returning HTML <!doctype ...>)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// ==================== VITE CLIENT INTEGRATION ====================

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.K_SERVICE && !process.env.K_SERVICE.startsWith('ais-dev')) ||
    (hasDist && process.env.NODE_ENV !== 'development');

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err && !res.headersSent) {
          res.status(500).send('Application loading error');
        }
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`STETH DAY Server running on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
