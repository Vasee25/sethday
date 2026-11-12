import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  X,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { MedicalCollegeItem } from '../types.ts';

interface AdminCollegesManagerProps {
  authToken: string;
}

export const AdminCollegesManager: React.FC<AdminCollegesManagerProps> = ({ authToken }) => {
  const [colleges, setColleges] = useState<MedicalCollegeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<MedicalCollegeItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    district: '',
    state: 'Kerala',
    type: 'Government',
    aliases: '',
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Import State
  const [importJsonText, setImportJsonText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const fetchColleges = async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        pageSize: pageSize.toString(),
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedState !== 'ALL') params.set('state', selectedState);
      if (selectedType !== 'ALL') params.set('type', selectedType);

      const res = await fetch(`/api/admin/colleges?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch colleges');
      const data = await res.json();

      setColleges(data.colleges || []);
      setTotalCount(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error loading colleges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges(1);
  }, [searchQuery, selectedState, selectedType]);

  const handleSaveCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.city.trim() || !formData.state.trim()) {
      setFormError('College Name, City, and State are required.');
      return;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      const isEdit = !!editingCollege;
      const url = isEdit
        ? `/api/admin/colleges/${editingCollege.id}`
        : '/api/admin/colleges';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save college');
      }

      setSuccessMessage(isEdit ? 'College updated successfully!' : 'College added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsAddModalOpen(false);
      setEditingCollege(null);
      fetchColleges(page);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteCollege = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/colleges/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteConfirmId(null);
      fetchColleges(page);
      setSuccessMessage('Medical college removed from directory.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert('Failed to delete medical college');
    }
  };

  const handleExportCsv = () => {
    window.open(`/api/admin/colleges/export/csv?token=${encodeURIComponent(authToken)}`, '_blank');
  };

  const handleImportSubmit = async () => {
    setImportLoading(true);
    setImportError(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(importJsonText);
      } catch {
        throw new Error('Invalid JSON format. Please supply a valid JSON array of college objects.');
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('JSON must be a non-empty array of objects with name, city, state.');
      }

      const res = await fetch('/api/admin/colleges/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ colleges: parsed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setSuccessMessage(`Successfully imported/synced ${data.count} colleges!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsImportModalOpen(false);
      setImportJsonText('');
      fetchColleges(1);
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const openEditModal = (col: MedicalCollegeItem) => {
    setEditingCollege(col);
    setFormData({
      name: col.name,
      city: col.city,
      district: col.district || col.city,
      state: col.state,
      type: col.type || 'Government',
      aliases: col.aliases || '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openAddModal = () => {
    setEditingCollege(null);
    setFormData({
      name: '',
      city: '',
      district: '',
      state: 'Kerala',
      type: 'Government',
      aliases: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const states = [
    'ALL',
    'Andaman and Nicobar Islands',
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chandigarh',
    'Chhattisgarh',
    'Dadra and Nagar Haveli',
    'Delhi',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu and Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Odisha',
    'Puducherry',
    'Punjab',
    'Rajasthan',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
  ];

  return (
    <div className="space-y-4">
      {/* Toast message */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-display flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            <span>Medical Colleges Directory</span>
          </h3>
          <p className="text-xs text-slate-500">
            {totalCount} accredited medical colleges available in search & dropdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add College</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Import Data</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search college, city, alias..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {states.map((st) => (
              <option key={st} value={st}>
                {st === 'ALL' ? 'All States & UTs' : st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All College Types</option>
            <option value="Government">Government</option>
            <option value="Dental (BDS)">Dental (B.D.S.)</option>
            <option value="Private">Private</option>
            <option value="AIIMS">AIIMS / Central</option>
            <option value="Trust">Trust / Society</option>
            <option value="Deemed">Deemed University</option>
          </select>
        </div>
      </div>

      {/* Colleges Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-600">Loading medical colleges...</p>
          </div>
        ) : colleges.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No medical colleges match your search.</p>
            <p className="text-xs text-slate-400">Try changing your search term or clearing filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">College Name</th>
                  <th className="px-4 py-3">City / District</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Aliases</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colleges.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">#{col.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 min-w-[200px]">
                      {col.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-semibold">{col.city}</span>
                      {col.district && col.district !== col.city && (
                        <span className="text-[10px] text-slate-400 block">{col.district}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{col.state}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/50">
                        {col.type || 'Government'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 max-w-[150px] truncate">
                      {col.aliases || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(col)}
                          className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg transition"
                          title="Edit college"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(col.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                          title="Delete college"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page <strong className="text-slate-800">{page}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong> ({totalCount} total colleges)
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchColleges(page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => fetchColleges(page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= ADD / EDIT MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-bold font-display">
                {editingCollege ? 'Edit Medical College' : 'Add Medical College'}
              </h4>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCollege} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  College Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Tirunelveli Medical College"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Tirunelveli"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="e.g. Tirunelveli"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    State / UT <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Tamil Nadu"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Government">Government</option>
                    <option value="Dental (BDS)">Dental (B.D.S.)</option>
                    <option value="Private">Private</option>
                    <option value="AIIMS">AIIMS / Central</option>
                    <option value="Trust">Trust</option>
                    <option value="Deemed">Deemed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Aliases & Acronyms <span className="text-slate-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={formData.aliases}
                  onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                  placeholder="e.g. TVMC, TMC, Tirunelveli GMC"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
                >
                  {formSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCollege ? 'Update College' : 'Add College'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRM MODAL ================= */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Delete College?</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this medical college from the searchable directory?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCollege(deleteConfirmId)}
                className="px-3.5 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition shadow-2xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IMPORT JSON MODAL ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-bold font-display flex items-center space-x-2">
                <Upload className="w-4 h-4 text-teal-400" />
                <span>Import Medical Colleges</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              {importError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {importError}
                </div>
              )}

              <p className="text-xs text-slate-600">
                Paste an array of medical college JSON objects to bulk upsert or import into the directory:
              </p>

              <textarea
                rows={8}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder={`[\n  {\n    "name": "Madurai Medical College",\n    "city": "Madurai",\n    "state": "Tamil Nadu",\n    "type": "Government",\n    "aliases": "MMC, Madurai GMC"\n  }\n]`}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importLoading || !importJsonText.trim()}
                  onClick={handleImportSubmit}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs disabled:opacity-40"
                >
                  {importLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Import Records</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
