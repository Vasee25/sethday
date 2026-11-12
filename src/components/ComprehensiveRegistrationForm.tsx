import React, { useState } from 'react';
import {
  User,
  Phone,
  GraduationCap,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FileText,
  MapPin,
} from 'lucide-react';
import { CampusLocationSelector } from './CampusLocationSelector.tsx';
import { sanitizePhoneNumber } from '../lib/validation.ts';
import { CampusLocationItem } from '../types.ts';

interface ComprehensiveFormProps {
  onSuccess?: (result: {
    studentCode: string;
    responseId: string;
    record: any;
  }) => void;
  onBack?: () => void;
}

const COURSE_PROGRAMS = [
  {
    id: 'repeaters',
    name: 'NEET Repeaters Batch',
    desc: 'Targeted intensive 1-year program with daily test series & mentor support',
  },
  {
    id: 'long-term',
    name: 'NEET Long-Term (Class 11 & 12)',
    desc: '2-Year foundation & advanced medical entrance coaching',
  },
  {
    id: 'crash-course',
    name: 'NEET Rapid Crash Course',
    desc: 'High-yield revision, 100+ mock tests & problem-solving drills',
  },
  {
    id: 'weekend',
    name: 'Weekend Medical Batch',
    desc: 'Special weekend classroom sessions for school-going aspirants',
  },
];

const TARGET_YEARS = ['NEET 2026', 'NEET 2027', 'NEET 2028'];

export const ComprehensiveRegistrationForm: React.FC<ComprehensiveFormProps> = ({
  onSuccess,
  onBack,
}) => {
  const [formData, setFormData] = useState({
    studentName: '',
    fatherName: '',
    email: '',
    contactNumber: '',
    campusLocation: '',
    courseProgram: 'NEET Repeaters Batch',
    targetYear: 'NEET 2026',
    notes: '',
  });

  const [selectedCampusObj, setSelectedCampusObj] = useState<CampusLocationItem | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    studentCode: string;
    responseId: string;
    record: any;
  } | null>(null);

  // Field Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.studentName.trim() || formData.studentName.trim().length < 2) {
      errs.studentName = 'Student Name must be at least 2 characters';
    }

    if (!formData.fatherName.trim() || formData.fatherName.trim().length < 2) {
      errs.fatherName = "Father's / Guardian's Name must be at least 2 characters";
    }

    const cleanPhone = sanitizePhoneNumber(formData.contactNumber);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.contactNumber = 'Please enter a valid 10-digit Indian mobile number (e.g. 9847012345)';
    }

    if (!formData.campusLocation.trim()) {
      errs.campusLocation = 'Please select or type your preferred campus branch location';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCampusChange = (name: string, obj?: CampusLocationItem) => {
    setFormData((prev) => ({ ...prev, campusLocation: name }));
    setSelectedCampusObj(obj);
    if (errors.campusLocation) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.campusLocation;
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      const firstErrorEl = document.querySelector('.text-red-600');
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/register/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: formData.studentName.trim(),
          fatherName: formData.fatherName.trim(),
          email: formData.email.trim().toLowerCase(),
          contactNumber: formData.contactNumber.trim(),
          campusLocation: formData.campusLocation.trim(),
          courseProgram: formData.courseProgram,
          targetYear: formData.targetYear,
          notes: formData.notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.existingStudentCode) {
          try {
            const existingRes = await fetch(`/api/registration/${encodeURIComponent(data.existingStudentCode)}`);
            if (existingRes.ok) {
              const existingRecord = await existingRes.json();
              const payload = {
                success: true,
                studentCode: existingRecord.studentCode || existingRecord.student_code || data.existingStudentCode,
                responseId: existingRecord.responseId || existingRecord.response_id,
                record: existingRecord,
              };
              setSuccessData(payload);
              if (onSuccess) onSuccess(payload);
              return;
            }
          } catch {
            // fallback
          }
        }
        throw new Error(data.error || 'Failed to submit registration');
      }

      setSuccessData(data);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setServerError(err.message || 'Something went wrong. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // If already registered and submitted successfully
  if (successData) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-6 sm:p-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600" />
              Enrollment Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              Registration Successful!
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Welcome to Kerala NEET Academy. Your registration has been securely recorded in our admission system.
            </p>
          </div>

          {/* Registration Details Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-left space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Student Enrollment Code
                </p>
                <p className="text-xl font-extrabold text-teal-700 font-mono tracking-wider">
                  {successData.studentCode || successData.responseId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Campus / Branch
                </p>
                <p className="text-sm font-bold text-slate-800">
                  {formData.campusLocation}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Student Name</span>
                <span className="font-bold text-slate-900 text-sm">{formData.studentName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Father's Name</span>
                <span className="font-bold text-slate-900 text-sm">{formData.fatherName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Contact Number</span>
                <span className="font-semibold text-slate-800">+91 {formData.contactNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Program</span>
                <span className="font-semibold text-teal-800">{formData.courseProgram}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Target Year</span>
                <span className="font-semibold text-slate-800">{formData.targetYear}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSuccessData(null);
                setFormData({
                  studentName: '',
                  fatherName: '',
                  email: '',
                  contactNumber: '',
                  campusLocation: '',
                  courseProgram: 'NEET Repeaters Batch',
                  targetYear: 'NEET 2026',
                  notes: '',
                });
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition shadow-sm inline-flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Register Another Student</span>
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition"
              >
                Return to Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Academy Title Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold shadow-2xs">
          <GraduationCap className="w-4 h-4 text-teal-600" />
          <span>Kerala NEET Academy • Admissions 2026-2027</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
          Comprehensive Registration Form
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Complete the student enrollment form below. Please provide accurate candidate credentials and select your preferred academy campus branch location.
        </p>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-md p-5 sm:p-8 space-y-6">
        {serverError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Registration Failed</p>
              <p className="text-xs mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        {/* Section 1: Candidate Personal Details */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <span>Student & Parent Information</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 ml-8">
                Basic contact and identification details as per official school/NEET records.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Student Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => {
                    setFormData({ ...formData, studentName: e.target.value });
                    if (errors.studentName) setErrors({ ...errors, studentName: '' });
                  }}
                  placeholder="e.g. Rahul Sharma / Ananya Menon"
                  className={`w-full pl-10 pr-3 py-3 bg-white border-2 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.studentName ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.studentName && (
                <p className="text-xs font-semibold text-red-600">{errors.studentName}</p>
              )}
            </div>

            {/* Father's Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Father's / Guardian's Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => {
                    setFormData({ ...formData, fatherName: e.target.value });
                    if (errors.fatherName) setErrors({ ...errors, fatherName: '' });
                  }}
                  placeholder="e.g. S. Sharma / K. R. Menon"
                  className={`w-full pl-10 pr-3 py-3 bg-white border-2 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.fatherName ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.fatherName && (
                <p className="text-xs font-semibold text-red-600">{errors.fatherName}</p>
              )}
            </div>

            {/* Contact Number */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Contact Number (Mobile) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-slate-600 text-sm font-bold border-r border-slate-200 pr-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.contactNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, contactNumber: cleaned });
                    if (errors.contactNumber) setErrors({ ...errors, contactNumber: '' });
                  }}
                  placeholder="9847012345"
                  className={`w-full pl-20 pr-3 py-3 bg-white border-2 rounded-xl text-base font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.contactNumber ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.contactNumber && (
                <p className="text-xs font-semibold text-red-600">{errors.contactNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Campus Location (Searchable Dropdown) */}
        <div className="space-y-4 pt-2">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-base font-bold text-slate-900 font-display flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <span>Preferred Campus Location / Branch</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 ml-8">
              Select or type the Kerala NEET Academy campus nearest to you across Tamil Nadu.
            </p>
          </div>

          {/* Searchable Campus Dropdown Component */}
          <CampusLocationSelector
            value={formData.campusLocation}
            onChange={handleCampusChange}
            error={errors.campusLocation}
            required
            label="Campus Location / Branch"
            placeholder="Type or select: Tirunelveli (Rohini, Jeba, Corporate), Nagercoil, Madurai..."
          />

          {/* Quick Info snippet if a known campus is selected */}
          {selectedCampusObj && (
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-start space-x-3 text-xs text-teal-900 animate-in fade-in">
              <Building2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">{selectedCampusObj.name}</span>
                {selectedCampusObj.region && (
                  <span className="text-teal-700 ml-1.5 font-medium">({selectedCampusObj.region})</span>
                )}
                {selectedCampusObj.address && (
                  <p className="text-[11px] text-teal-800 mt-0.5">{selectedCampusObj.address}</p>
                )}
                {selectedCampusObj.phone && (
                  <p className="text-[10px] text-teal-600 font-medium mt-0.5">
                    Branch Admissions Desk: {selectedCampusObj.phone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Academic Program & Target Year */}
        <div className="space-y-4 pt-2">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-base font-bold text-slate-900 font-display flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <span>Academic Program & Target NEET Year</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 ml-8">
              Specify your target medical entrance year and learning batch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Target Year */}
            <div className="space-y-1 sm:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Target Exam Year
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={formData.targetYear}
                  onChange={(e) => setFormData({ ...formData, targetYear: e.target.value })}
                  className="w-full pl-10 pr-8 py-3 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                >
                  {TARGET_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Course Program */}
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Academic Program Track
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={formData.courseProgram}
                  onChange={(e) => setFormData({ ...formData, courseProgram: e.target.value })}
                  className="w-full pl-10 pr-8 py-3 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                >
                  {COURSE_PROGRAMS.map((prog) => (
                    <option key={prog.id} value={prog.name}>
                      {prog.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Optional notes / comments */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Additional Notes or Previous NEET Score (Optional)
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Previous NEET 2025 score: 480, hostel accommodation required, etc."
              className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Live Enrollment Verification Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-teal-800 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <p className="font-bold text-slate-800">
                Official Admission Verification
              </p>
              <p className="text-[11px] text-slate-500">
                Student details are verified against Kerala NEET Academy central records.
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Selected Campus
            </span>
            <span className="font-bold text-teal-800 text-sm">
              {formData.campusLocation || 'None Selected Yet'}
            </span>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
            >
              Back to Home
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto flex-1 sm:max-w-xs ml-auto px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-md hover:shadow-lg transition active:scale-[0.985] flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting Registration...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
