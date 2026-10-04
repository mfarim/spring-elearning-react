import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { Student, Classroom, StudentExamCard, ApiResponse } from '../../types';
import {
  Plus,
  Trash2,
  Users,
  ShieldAlert,
  UploadCloud,
  Printer,
  X,
} from 'lucide-react';

export const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [examCards, setExamCards] = useState<StudentExamCard[]>([]);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const { impersonate } = useAuthStore();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    nis: '',
    nisn: '',
    gender: 'M' as 'M' | 'F',
    phone: '',
    classroomId: '',
    address: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const url = selectedClassroom ? `/students?classroomId=${selectedClassroom}` : '/students';
      const [stRes, crRes] = await Promise.all([
        api.get<ApiResponse<Student[]>>(url),
        api.get<ApiResponse<Classroom[]>>('/classrooms'),
      ]);
      setStudents(stRes.data.data);
      setClassrooms(crRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClassroom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/students', {
        ...form,
        classroomId: form.classroomId ? Number(form.classroomId) : null,
      });
      setModalOpen(false);
      setForm({
        name: '',
        email: '',
        password: '',
        nis: '',
        nisn: '',
        gender: 'M',
        phone: '',
        classroomId: '',
        address: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create student');
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return;

    const formData = new FormData();
    formData.append('file', excelFile);
    if (selectedClassroom) {
      formData.append('classroomId', selectedClassroom);
    }

    try {
      setImportLoading(true);
      const res = await api.post('/students/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data.data);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to import Excel');
    } finally {
      setImportLoading(false);
    }
  };

  const loadExamCards = async () => {
    try {
      const url = selectedClassroom ? `/students/exam-cards?classroomId=${selectedClassroom}` : '/students/exam-cards';
      const res = await api.get<ApiResponse<StudentExamCard[]>>(url);
      setExamCards(res.data.data);
      setCardModalOpen(true);
    } catch (err: any) {
      alert('Failed to load exam cards');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete student record?')) {
      await api.delete(`/students/${id}`);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Student Management</h2>
          <p className="text-xs text-slate-500 mt-1">NIS registration, bulk Excel batch onboarding, and CBT exam cards</p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
          >
            <option value="">All Classrooms</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => loadExamCards()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Cards</span>
          </button>

          <button
            onClick={() => {
              setImportResult(null);
              setExcelFile(null);
              setImportModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat data siswa...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium">Belum ada siswa terdaftar</p>
            <p className="text-xs mt-1 text-slate-400">Gunakan "Import Excel" untuk unggah data siswa secara massal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Nama Siswa</th>
                  <th className="px-6 py-4">NIS / NISN</th>
                  <th className="px-6 py-4">Jenis Kelamin</th>
                  <th className="px-6 py-4">Kelas</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      <div>{s.nis}</div>
                      {s.nisn && <div className="text-xs text-slate-400">{s.nisn}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.gender === 'M' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'
                        }`}
                      >
                        {s.gender === 'M' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {s.classroomName || <span className="text-slate-400 italic">Belum ada kelas</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{s.email}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => impersonate(s.userId)}
                        title="Masuk sebagai Siswa"
                        className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-200 transition cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 mr-0.5" />
                        <span>Login As</span>
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus Siswa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Register Student Account</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siti Nurhaliza"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIS</label>
                  <input
                    type="text"
                    required
                    placeholder="102938"
                    value={form.nis}
                    onChange={(e) => setForm({ ...form, nis: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN</label>
                  <input
                    type="text"
                    placeholder="0056123491"
                    value={form.nisn}
                    onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as 'M' | 'F' })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="M">Laki-laki (M)</option>
                    <option value="F">Perempuan (F)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Classroom</label>
                  <select
                    value={form.classroomId}
                    onChange={(e) => setForm({ ...form, classroomId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Choose Classroom --</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="student@school.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    placeholder="Defaults to Student@123"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-xs cursor-pointer transition"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Bulk Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setImportModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Import Students via Excel</h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload an <code>.xlsx</code> spreadsheet with columns:{' '}
              <strong>Name, Email, NIS, NISN, Gender (M/F), Phone, Address</strong>.
            </p>

            <form onSubmit={handleImportExcel} className="space-y-4 text-sm">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition">
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  required
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              {importResult && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-emerald-700">
                    Successfully imported: {importResult.successCount} students
                  </div>
                  {importResult.errorCount > 0 && (
                    <div className="font-bold text-rose-600 mt-1">
                      Failed rows: {importResult.errorCount}
                      <ul className="list-disc pl-4 font-normal mt-1 text-rose-500 space-y-0.5">
                        {importResult.errors?.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importLoading || !excelFile}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {importLoading ? 'Processing Spreadsheet...' : 'Start Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exam Cards Modal */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Student CBT Examination Cards</h3>
                <p className="text-xs text-slate-500">Official student exam hall tickets with NIS barcode verification</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-500 transition cursor-pointer"
                >
                  Print View
                </button>
                <button
                  onClick={() => setCardModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {examCards.map((c) => (
                <div
                  key={c.studentId}
                  className="border-2 border-slate-800 rounded-2xl p-4 bg-white shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                          KARTU PESERTA UJIAN CBT
                        </div>
                        <div className="text-[10px] text-slate-500">Tahun Ajaran {c.academicYear}</div>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-700">{c.classroomName}</div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-700">
                      <div>
                        <strong>Nama:</strong> {c.name}
                      </div>
                      <div>
                        <strong>NIS:</strong> {c.nis} / <strong>NISN:</strong> {c.nisn || '-'}
                      </div>
                      <div>
                        <strong>Gender:</strong> {c.gender === 'M' ? 'Laki-laki' : 'Perempuan'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div className="font-mono text-[10px] text-slate-500 tracking-wider">
                      ||| |||| | ||||| || ||||||
                      <div className="text-[9px] text-slate-400">{c.barcodeData}</div>
                    </div>
                    <div className="text-[10px] text-center border-t border-slate-400 w-24 pt-0.5">
                      Panitia Ujian
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
