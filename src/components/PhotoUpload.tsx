import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface PhotoUploadProps {
  value?: string;
  onChange: (photoBase64: string) => void;
  error?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  value,
  onChange,
  error: parentError,
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setInternalError(null);

    // Validate MIME type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setInternalError('Please upload a valid JPG, JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setInternalError('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    setCompressing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress & scale to passport size (max 800px)
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 800;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onChange(compressedDataUrl);
        } else {
          onChange(e.target?.result as string);
        }
        setCompressing(false);
      };

      img.onerror = () => {
        setInternalError('Failed to read image file.');
        setCompressing(false);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      setInternalError('Error reading file.');
      setCompressing(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const error = parentError || internalError;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Student Photograph <span className="text-red-500">*</span>
        </label>
        <span className="text-[11px] text-slate-500 font-medium">
          Official Passport Format
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {!value ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 bg-white text-center space-y-4 cursor-pointer transition ${
            isDragging
              ? 'border-teal-500 bg-teal-50/50'
              : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50/50'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-100">
            {compressing ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">
              Upload Passport Photo
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Drag and drop your photo here, or click to browse files.
            </p>
          </div>

          <div className="max-w-xs mx-auto pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={compressing}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center space-x-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>{compressing ? 'Processing Photo...' : 'Browse & Upload Photo'}</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400">
            JPG, PNG or WebP up to 5MB. Automatic passport crop & optimization applied.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-4">
          {/* Photo Preview Thumbnail */}
          <div className="relative w-20 h-24 rounded-xl overflow-hidden border-2 border-teal-600/70 bg-slate-100 flex-shrink-0 shadow-xs">
            <img
              src={value}
              alt="Student preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center">
              <CheckCircle className="w-3 h-3" />
            </div>
          </div>

          {/* Details & replacement controls */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-xs font-bold text-slate-900">
                Photo Attached Successfully
              </p>
              <p className="text-[11px] text-slate-500">
                Optimized for A4 delegate badge & pass printing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Change Photo</span>
              </button>

              <button
                type="button"
                onClick={() => onChange('')}
                className="py-1.5 px-2 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-1.5 text-xs text-red-600 px-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
