import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Phone,
  Calendar,
  Award,
  AlertCircle,
  Loader2,
  Utensils,
  Shirt,
  Edit2,
  ShieldCheck,
  BookOpen,
  ChevronDown,
  X,
} from 'lucide-react';
import { StudentRegistrationData, CoatSizeType } from '../types.ts';
import { PhotoUpload } from './PhotoUpload.tsx';
import { MedicalCollegeSelector } from './MedicalCollegeSelector.tsx';
import { CampusLocationSelector } from './CampusLocationSelector.tsx';
import { studentRegistrationSchema, sanitizePhoneNumber } from '../lib/validation.ts';

interface WillingRegistrationFormProps {
  onBackToLanding: () => void;
  onSubmitSuccess: (data: { studentCode: string; responseId: string; record: any }) => void;
  maxFoodCount?: number;
}

const COAT_SIZES: CoatSizeType[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export const COURSE_PROGRAM_OPTIONS = [
  {
    name: 'REPEATER',
    badge: '1-Year',
    desc: 'Full-time repeaters intensive coaching with daily tests',
  },
  {
    name: 'CHALLENGER',
    badge: 'Elite',
    desc: 'Target 650+ advanced problem solving & mock analysis',
  },
  {
    name: 'TEST SERIES',
    badge: 'Tests',
    desc: 'Comprehensive NEET mock test series with discussions',
  },
  {
    name: 'CRASH',
    badge: 'Fast Track',
    desc: 'High-yield final lap revision & rapid crash program',
  },
  {
    name: 'WEEKEND',
    badge: 'Weekend',
    desc: 'Saturday & Sunday classroom batches for students',
  },
  {
    name: 'SUPREME HYBRID',
    badge: 'Hybrid',
    desc: 'Classroom coaching + interactive online live access',
  },
] as const;

export const WillingRegistrationForm: React.FC<WillingRegistrationFormProps> = ({
  onBackToLanding,
  onSubmitSuccess,
  maxFoodCount = 5,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [formData, setFormData] = useState<StudentRegistrationData>({
    studentName: '',
    fatherName: '',
    email: '',
    contactNumber: '',
    campusLocation: '',
    courseProgram: '',
    age: 18,
    ntaScore: undefined,
    photoUrl: '',
    medicalCollegeId: undefined,
    medicalCollegeName: '',
    medicalCollegeState: 'Kerala',
    foodVegCount: 0,
    foodNonVegCount: 0,
    coatSize: 'M',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Courses Type or Select Dropdown State
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [courseHighlightedIndex, setCourseHighlightedIndex] = useState(-1);
  const courseContainerRef = useRef<HTMLDivElement>(null);
  const courseInputRef = useRef<HTMLInputElement>(null);
  const autoSelectedSupremeHybridRef = useRef(false);

  // Close course dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (courseContainerRef.current && !courseContainerRef.current.contains(e.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter courses based on user typing
  const filteredCourses = COURSE_PROGRAM_OPTIONS.filter((c) => {
    if (!formData.courseProgram || !formData.courseProgram.trim()) return true;
    const q = formData.courseProgram.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q) ||
      c.badge.toLowerCase().includes(q)
    );
  });

  const handleSelectCourse = (courseName: string) => {
    autoSelectedSupremeHybridRef.current = false;
    setFormData((prev) => ({ ...prev, courseProgram: courseName }));
    setIsCourseDropdownOpen(false);
    setCourseHighlightedIndex(-1);
  };

  const handleClearCourse = (e: React.MouseEvent) => {
    e.stopPropagation();
    autoSelectedSupremeHybridRef.current = false;
    setFormData((prev) => ({ ...prev, courseProgram: '' }));
    setIsCourseDropdownOpen(true);
    courseInputRef.current?.focus();
  };

  const handleCourseKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCourseDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsCourseDropdownOpen(true);
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCourseHighlightedIndex((prev) =>
        prev < filteredCourses.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCourseHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCourses.length - 1
      );
    } else if (e.key === 'Enter') {
      if (courseHighlightedIndex >= 0 && courseHighlightedIndex < filteredCourses.length) {
        e.preventDefault();
        handleSelectCourse(filteredCourses[courseHighlightedIndex].name);
      }
    } else if (e.key === 'Escape') {
      setIsCourseDropdownOpen(false);
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.studentName.trim() || formData.studentName.trim().length < 2) {
      newErrors.studentName = 'Student Name must be at least 2 characters';
    }
    if (!formData.fatherName.trim() || formData.fatherName.trim().length < 2) {
      newErrors.fatherName = "Father's Name must be at least 2 characters";
    }
    const cleanPhone = sanitizePhoneNumber(formData.contactNumber);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.contactNumber = 'Please enter a valid 10-digit Indian mobile number (e.g. 9847012345)';
    }
    if (formData.ntaScore === undefined || formData.ntaScore === null || isNaN(formData.ntaScore) || formData.ntaScore < 0 || formData.ntaScore > 720) {
      newErrors.ntaScore = 'Please enter your NTA NEET Score (between 0 and 720)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation (Photo & Medical College)
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.photoUrl) {
      newErrors.photoUrl = 'Please upload or take a student photo for your delegate badge';
    }
    if (!formData.medicalCollegeName || !formData.medicalCollegeName.trim()) {
      newErrors.medicalCollegeName = 'Please search and select your Medical College';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const totalFood = formData.foodVegCount + formData.foodNonVegCount;
    if (totalFood < 0) {
      newErrors.food = 'Food count cannot be negative';
    }
    if (totalFood > maxFoodCount) {
      newErrors.food = `Maximum total meal tokens allowed per student is ${maxFoodCount}`;
    }
    if (!formData.coatSize) {
      newErrors.coatSize = 'Please select your apron / coat size';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    setServerError(null);
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    } else if (step === 3) {
      if (validateStep3()) setStep(4);
    }
  };

  const handlePrev = () => {
    setServerError(null);
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    } else {
      onBackToLanding();
    }
  };

  // Final Submit
  const handleSubmit = async () => {
    setServerError(null);
    setSubmitting(true);

    try {
      const parsed = studentRegistrationSchema.parse(formData);
      const payload = {
        ...parsed,
        campusLocation: formData.campusLocation?.trim() || parsed.campusLocation || null,
      };

      const res = await fetch('/api/register/willing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.existingStudentCode) {
          // Attempt to retrieve existing pass immediately for the user
          try {
            const existingRes = await fetch(`/api/registration/${encodeURIComponent(data.existingStudentCode)}`);
            if (existingRes.ok) {
              const existingRecord = await existingRes.json();
              onSubmitSuccess({
                success: true,
                studentCode: existingRecord.studentCode || existingRecord.student_code || data.existingStudentCode,
                responseId: existingRecord.responseId || existingRecord.response_id,
                record: existingRecord,
              });
              return;
            }
          } catch {
            // fallback to error message below
          }
          throw new Error(`A registration already exists under Student Code ${data.existingStudentCode}. We have retrieved your pass.`);
        }
        throw new Error(data.error || 'Unable to submit registration. Please check your internet connection.');
      }

      onSubmitSuccess(data);
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setServerError(err.message || 'Something went wrong. Please try again or contact the administration.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalFood = formData.foodVegCount + formData.foodNonVegCount;

  return (
    <div className="w-full max-w-md mx-auto sm:max-w-xl lg:max-w-2xl px-4 py-4 space-y-5 pb-32">
      {/* Top Navigation & Step Indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-slate-900 p-1 -ml-1 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Cancel' : 'Back'}</span>
          </button>

          <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            Step {step} of 4
          </span>
        </div>

        {/* Progress 1 -> 2 -> 3 -> 4 Bar */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, label: 'Details' },
            { num: 2, label: 'Photo & College' },
            { num: 3, label: 'Food & Coat' },
            { num: 4, label: 'Review' },
          ].map((s) => (
            <div key={s.num} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= s.num ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              />
              <p
                className={`text-[10px] font-bold text-center truncate ${
                  step >= s.num ? 'text-teal-900' : 'text-slate-400'
                }`}
              >
                {s.num}. {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: STUDENT DETAILS */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
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
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                className={`w-full pl-10 pr-3 py-3 bg-white border-2 rounded-xl text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                className={`w-full pl-10 pr-3 py-3 bg-white border-2 rounded-xl text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.fatherName ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.fatherName && (
              <p className="text-xs font-semibold text-red-600">{errors.fatherName}</p>
            )}
          </div>

          {/* Contact Number & Age Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Contact Number */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-slate-500 text-sm font-bold border-r border-slate-200 pr-2">
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
                  }}
                  className={`w-full pl-20 pr-3 py-3 bg-white border-2 rounded-xl text-base font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.contactNumber ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.contactNumber && (
                <p className="text-xs font-semibold text-red-600">{errors.contactNumber}</p>
              )}
            </div>

            {/* NTA Score */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                NTA Score <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={720}
                  placeholder="e.g. 620"
                  value={formData.ntaScore !== undefined && formData.ntaScore !== null ? formData.ntaScore : ''}
                  onChange={(e) => {
                    const parsed = e.target.value === '' ? undefined : parseInt(e.target.value);
                    setFormData({ ...formData, ntaScore: parsed, age: 18 });
                    if (errors.ntaScore) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.ntaScore;
                        return copy;
                      });
                    }
                  }}
                  className={`w-full pl-9 pr-3 py-3 bg-white border-2 rounded-xl text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.ntaScore ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.ntaScore && (
                <p className="text-xs font-semibold text-red-600">{errors.ntaScore}</p>
              )}
            </div>
          </div>

          {/* Study Campus & Courses Track Grid (Campus 2 cols, Courses 1 col like Age) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Campus Branch Location (Searchable Dropdown, 2/3 width like Mobile Number) */}
            <div className="sm:col-span-2 space-y-1">
              <CampusLocationSelector
                value={formData.campusLocation || ''}
                onChange={(name, campusObj) => {
                  const isOnline =
                    campusObj?.id === 'online-course' ||
                    campusObj?.tag === 'Online' ||
                    name.trim().toLowerCase() === 'online course' ||
                    name.trim().toLowerCase() === 'online';

                  setFormData((prev) => {
                    let nextCourse = prev.courseProgram;

                    if (isOnline) {
                      // 1. If user selects 'Online Course', automatically select 'Supreme Hybrid'
                      nextCourse = 'SUPREME HYBRID';
                      autoSelectedSupremeHybridRef.current = true;
                    } else {
                      // 2. If user cancels, deselects, or picks any other campus:
                      // If 'Supreme Hybrid' was auto-selected (or is currently Supreme Hybrid from Online Course), clear it!
                      if (
                        autoSelectedSupremeHybridRef.current ||
                        prev.courseProgram?.toUpperCase().trim() === 'SUPREME HYBRID'
                      ) {
                        nextCourse = '';
                        autoSelectedSupremeHybridRef.current = false;
                      }
                      // For any other option selected in the 'Where did you study?' dropdown,
                      // the 'Courses' dropdown remains for the user to select their desired course manually.
                    }

                    return {
                      ...prev,
                      campusLocation: name,
                      courseProgram: nextCourse,
                    };
                  });
                }}
                required={false}
                label="Where Did You Study Kerala NEET Academy"
                placeholder="Select or type campus..."
              />
            </div>

            {/* Courses / Program (Small 1/3 width, exactly matching Age text box) */}
            <div className="sm:col-span-1 space-y-1 relative" ref={courseContainerRef}>
              <div className="flex items-center justify-between min-h-[18px]">
                <label
                  htmlFor="courses-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Courses
                </label>
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400">
                  <BookOpen
                    className={`w-4 h-4 transition-colors ${
                      isCourseDropdownOpen ? 'text-teal-600' : 'text-slate-400'
                    }`}
                  />
                </div>

                <input
                  ref={courseInputRef}
                  type="text"
                  id="courses-input"
                  value={formData.courseProgram || ''}
                  onChange={(e) => {
                    autoSelectedSupremeHybridRef.current = false;
                    setFormData({ ...formData, courseProgram: e.target.value });
                    if (!isCourseDropdownOpen) setIsCourseDropdownOpen(true);
                  }}
                  onFocus={() => setIsCourseDropdownOpen(true)}
                  onKeyDown={handleCourseKeyDown}
                  placeholder="Select course..."
                  autoComplete="off"
                  className={`w-full pl-9 pr-14 py-3 bg-white border-2 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition shadow-2xs ${
                    isCourseDropdownOpen
                      ? 'border-teal-500'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                />

                {/* Right side controls: Clear & Dropdown Chevron */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-0.5">
                  {formData.courseProgram && (
                    <button
                      type="button"
                      onClick={handleClearCourse}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                      title="Clear course selection"
                      aria-label="Clear course"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsCourseDropdownOpen(!isCourseDropdownOpen);
                      courseInputRef.current?.focus();
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    aria-label="Toggle courses dropdown"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                        isCourseDropdownOpen ? 'rotate-180 text-teal-600' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* DROPDOWN MENU */}
              {isCourseDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 w-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Dropdown Options List */}
                  <div className="max-h-[204px] overflow-y-auto divide-y divide-slate-100 p-1 pr-1">
                    {filteredCourses.length === 0 ? (
                      <div className="p-3 text-center">
                        <p className="text-xs text-slate-500">
                          No exact match for "{formData.courseProgram}".
                        </p>
                        <p className="text-[11px] text-teal-700 font-semibold mt-1">
                          Custom value will be saved upon submission.
                        </p>
                      </div>
                    ) : (
                      filteredCourses.map((course, idx) => {
                        const isSelected =
                          formData.courseProgram?.toUpperCase().trim() === course.name;
                        const isHighlighted = idx === courseHighlightedIndex;

                        return (
                          <button
                            key={course.name}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectCourse(course.name);
                            }}
                            onMouseEnter={() => setCourseHighlightedIndex(idx)}
                            className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between group ${
                              isSelected
                                ? 'bg-teal-50 text-teal-950 font-semibold'
                                : isHighlighted
                                ? 'bg-slate-100 text-slate-900'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <span className="font-semibold text-xs text-slate-800 group-hover:text-teal-700">
                              {course.name}
                            </span>

                            <div className="shrink-0 flex items-center pl-2">
                              {isSelected ? (
                                <div className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-300 opacity-0 group-hover:opacity-100 flex items-center justify-center text-slate-400">
                                  <Check className="w-2.5 h-2.5" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: STUDENT PHOTO & MEDICAL COLLEGE */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Photo & Medical College
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your official delegate photograph and select your medical college affiliation.
            </p>
          </div>

          {/* Student Photo */}
          <PhotoUpload
            value={formData.photoUrl}
            onChange={(photo) => {
              setFormData({ ...formData, photoUrl: photo });
              if (errors.photoUrl) {
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.photoUrl;
                  return copy;
                });
              }
            }}
            error={errors.photoUrl}
          />

          <div className="border-t border-slate-100 pt-5">
            {/* Smart Medical College Search & Dropdown Component */}
            <MedicalCollegeSelector
              value={{
                id: formData.medicalCollegeId,
                name: formData.medicalCollegeName || '',
                city: formData.medicalCollegeCity,
                district: formData.medicalCollegeDistrict,
                state: formData.medicalCollegeState,
              }}
              onChange={(col) => {
                setFormData({
                  ...formData,
                  medicalCollegeId: col.id,
                  medicalCollegeName: col.name,
                  medicalCollegeCity: col.city,
                  medicalCollegeDistrict: col.district,
                  medicalCollegeState: col.state,
                });
                if (errors.medicalCollegeName) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.medicalCollegeName;
                    return copy;
                  });
                }
              }}
              error={errors.medicalCollegeName}
            />
          </div>
        </div>
      )}

      {/* STEP 3: FOOD & COAT DETAILS */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Food Preference & Apron Size
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your meal tokens for you and accompanying family members, plus coat size.
            </p>
          </div>

          {/* Food Steppers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Utensils className="w-3.5 h-3.5 text-teal-600" />
                <span>Food Preferences</span>
              </label>

              {/* Total calculation indicator */}
              <div className="px-3 py-1 bg-teal-50 border border-teal-200 rounded-lg text-xs font-bold text-teal-800">
                Total Food Count: <span className="text-sm font-extrabold">{totalFood}</span>
              </div>
            </div>

            {/* Stepper Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Veg Stepper */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                    <span className="text-sm font-bold text-slate-800">Vegetarian</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Traditional Veg Thali</span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        foodVegCount: Math.max(0, formData.foodVegCount - 1),
                      })
                    }
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 text-xl font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 transition"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-lg font-extrabold text-slate-900">
                    {formData.foodVegCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (totalFood < maxFoodCount) {
                        setFormData({ ...formData, foodVegCount: formData.foodVegCount + 1 });
                      }
                    }}
                    disabled={totalFood >= maxFoodCount}
                    className="w-10 h-10 rounded-xl bg-teal-600 text-white text-xl font-bold flex items-center justify-center hover:bg-teal-700 active:scale-95 disabled:opacity-40 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Non-Veg Stepper */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                    <span className="text-sm font-bold text-slate-800">Non-Veg</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Chicken / Meat Meals</span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        foodNonVegCount: Math.max(0, formData.foodNonVegCount - 1),
                      })
                    }
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 text-xl font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 transition"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-lg font-extrabold text-slate-900">
                    {formData.foodNonVegCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (totalFood < maxFoodCount) {
                        setFormData({ ...formData, foodNonVegCount: formData.foodNonVegCount + 1 });
                      }
                    }}
                    disabled={totalFood >= maxFoodCount}
                    className="w-10 h-10 rounded-xl bg-teal-600 text-white text-xl font-bold flex items-center justify-center hover:bg-teal-700 active:scale-95 disabled:opacity-40 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {errors.food && <p className="text-xs font-semibold text-red-600">{errors.food}</p>}
          </div>

          {/* Coat Size Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Shirt className="w-3.5 h-3.5 text-teal-600" />
                <span>Doctor's Apron / Coat Size <span className="text-red-500">*</span></span>
              </label>
              <span className="text-xs font-bold text-teal-700">
                Selected: {formData.coatSize}
              </span>
            </div>

            {/* Large touch-friendly grid as per specification */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {COAT_SIZES.map((size) => {
                const isSelected = formData.coatSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFormData({ ...formData, coatSize: size })}
                    className={`min-h-[50px] rounded-xl font-bold text-base transition flex items-center justify-center space-x-1 active:scale-95 ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-500 ring-offset-2'
                        : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{size}</span>
                    {isSelected && <Check className="w-4 h-4 ml-1" />}
                  </button>
                );
              })}
            </div>
            {errors.coatSize && (
              <p className="text-xs font-semibold text-red-600">{errors.coatSize}</p>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & SUBMIT */}
      {step === 4 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Review Your Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Please double-check all information before final submission.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          {/* Photo & Key Identifiers Header */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-4">
            <div className="w-18 h-22 rounded-xl overflow-hidden bg-slate-200 border-2 border-teal-600 flex-shrink-0 shadow-xs">
              {formData.photoUrl ? (
                <img
                  src={formData.photoUrl}
                  alt="Student"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  No Photo
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-slate-900 truncate">
                {formData.studentName}
              </h4>
              <p className="text-xs text-slate-500">
                S/o or D/o: <span className="font-semibold text-slate-700">{formData.fatherName}</span>
              </p>
              {formData.ntaScore !== undefined && formData.ntaScore !== null ? (
                <p className="text-xs text-slate-500">
                  NTA Score: <span className="font-semibold text-teal-700">{formData.ntaScore} / 720</span>
                </p>
              ) : null}
              <div className="mt-1 flex items-center space-x-1 text-xs text-teal-700 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Willing Delegate</span>
              </div>
            </div>
          </div>

          {/* Structured Review Table */}
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between items-start">
              <span className="text-slate-500">Medical College</span>
              <div className="text-right">
                <span className="font-bold text-slate-800">{formData.medicalCollegeName || 'Not Selected'}</span>
                {formData.medicalCollegeCity && (
                  <span className="block text-[11px] text-teal-700 font-medium">
                    {formData.medicalCollegeCity}, {formData.medicalCollegeState}
                  </span>
                )}
              </div>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Contact Number</span>
              <span className="font-mono font-semibold text-slate-800">+91 {formData.contactNumber}</span>
            </div>
            {formData.campusLocation && (
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500">Academy Campus</span>
                <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {formData.campusLocation}
                </span>
              </div>
            )}
            {formData.courseProgram && (
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500">Courses</span>
                <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {formData.courseProgram}
                </span>
              </div>
            )}
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Food Allocation</span>
              <span className="font-semibold text-slate-800">
                {formData.foodVegCount} Veg, {formData.foodNonVegCount} Non-Veg ({totalFood} Total)
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Apron Coat Size</span>
              <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                Size {formData.coatSize}
              </span>
            </div>
          </div>

          {/* Server error banner */}
          {serverError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}
        </div>
      )}

      {/* FIXED/STICKY MOBILE ACTION BAR (Safe area padded) */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 pb-safe z-40 shadow-lg">
        <div className="max-w-md mx-auto sm:max-w-xl lg:max-w-2xl flex items-center space-x-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              disabled={submitting}
              className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition flex items-center justify-center space-x-1 flex-shrink-0 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Back</span>
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 min-h-[50px] px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                  <span className="hidden xs:inline">Submitting Registration & Code...</span>
                  <span className="xs:hidden">Submitting...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <span>SUBMIT REGISTRATION</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
