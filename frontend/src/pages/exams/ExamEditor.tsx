import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import type { Exam, Question, ApiResponse } from '../../types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  UploadCloud,
  FileQuestion,
  CheckCircle,
  X,
} from 'lucide-react';

export const ExamEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const [form, setForm] = useState({
    questionText: '',
    questionType: 'multiple_choice' as 'multiple_choice' | 'essay' | 'true_false',
    optA: '',
    optB: '',
    optC: '',
    optD: '',
    optE: '',
    correctAnswer: '',
    points: 1,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    explanation: '',
  });

  const loadExamAndQuestions = async () => {
    try {
      setLoading(true);
      const [eRes, qRes] = await Promise.all([
        api.get<ApiResponse<Exam>>(`/exams/${id}`),
        api.get<ApiResponse<Question[]>>(`/exams/${id}/questions`),
      ]);
      setExam(eRes.data.data);
      setQuestions(qRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadExamAndQuestions();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let options: string[] = [];
      let correctAnswer = form.correctAnswer;

      if (form.questionType === 'multiple_choice') {
        options = [form.optA, form.optB, form.optC, form.optD, form.optE].filter(Boolean);
      } else if (form.questionType === 'true_false') {
        options = ['Benar', 'Salah'];
      }

      const payload = {
        examinationId: Number(id),
        questionText: form.questionText,
        questionType: form.questionType,
        options,
        correctAnswer,
        points: Number(form.points),
        difficulty: form.difficulty,
        explanation: form.explanation,
      };

      await api.post(`/exams/${id}/questions`, payload);
      setModalOpen(false);
      setForm({
        questionText: '',
        questionType: 'multiple_choice',
        optA: '',
        optB: '',
        optC: '',
        optD: '',
        optE: '',
        correctAnswer: '',
        points: 1,
        difficulty: 'medium',
        explanation: '',
      });
      loadExamAndQuestions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add question');
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return;

    const formData = new FormData();
    formData.append('file', excelFile);

    try {
      setImportLoading(true);
      const res = await api.post(`/exams/${id}/questions/import-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(`Imported ${res.data.data.importedCount} questions successfully!`);
      setExcelModalOpen(false);
      setExcelFile(null);
      loadExamAndQuestions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to import questions');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (confirm('Delete this question from examination?')) {
      await api.delete(`/exams/${id}/questions/${questionId}`);
      loadExamAndQuestions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/exams"
          className="inline-flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Examinations</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setExcelModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Excel Batch Import</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {exam && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
              {exam.subjectName}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">{exam.title}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Class: <strong>{exam.classroomName}</strong> | Total Questions: <strong>{questions.length}</strong> | Duration:{' '}
              <strong>{exam.durationMinutes} mins</strong>
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading questions...</div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <FileQuestion className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-medium">No questions in this examination</p>
          <p className="text-xs mt-1 text-slate-400">Click "Add Question" or "Excel Batch Import" to populate questions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Type: <strong>{q.questionType}</strong> | Points: <strong>{q.points}</strong>
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-sm font-semibold text-slate-900 whitespace-pre-wrap">{q.questionText}</div>

              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                  {q.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isCorrect = q.correctAnswer === opt || q.correctAnswer === letter;
                    return (
                      <div
                        key={optIdx}
                        className={`text-xs p-3 rounded-xl border flex items-center space-x-2 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md bg-white border border-slate-300 font-bold flex items-center justify-center text-[10px]">
                          {letter}
                        </span>
                        <span>{opt}</span>
                        {isCorrect && <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.correctAnswer && (
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  Correct Answer: <strong className="text-emerald-700 font-mono">{q.correctAnswer}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Question Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Examination Question</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Question Type</label>
                  <select
                    value={form.questionType}
                    onChange={(e) => setForm({ ...form, questionType: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="multiple_choice">Multiple Choice (Pilihan Ganda)</option>
                    <option value="true_false">True / False (Benar / Salah)</option>
                    <option value="essay">Essay / Descriptive</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Points / Score</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={50}
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question Text</label>
                <textarea
                  rows={3}
                  required
                  value={form.questionText}
                  onChange={(e) => setForm({ ...form, questionText: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Enter the problem statement or question..."
                />
              </div>

              {form.questionType === 'multiple_choice' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="font-semibold text-slate-700">Answer Options & Correct Key</div>
                  {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                    const keyName = `opt${letter}` as keyof typeof form;
                    return (
                      <div key={letter} className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 font-bold text-xs flex items-center justify-center">
                          {letter}
                        </span>
                        <input
                          type="text"
                          required={letter === 'A' || letter === 'B'}
                          placeholder={`Option ${letter} text...`}
                          value={String(form[keyName])}
                          onChange={(e) => setForm({ ...form, [keyName]: e.target.value })}
                          className="flex-1 border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
                        />
                        <label className="flex items-center space-x-1 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="correctAnswerKey"
                            checked={form.correctAnswer === String(form[keyName]) && form.correctAnswer !== ''}
                            onChange={() => setForm({ ...form, correctAnswer: String(form[keyName]) })}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Correct</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}

              {form.questionType === 'true_false' && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="block font-semibold text-slate-700">Correct Answer</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tf"
                        value="Benar"
                        checked={form.correctAnswer === 'Benar'}
                        onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Benar (True)</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tf"
                        value="Salah"
                        checked={form.correctAnswer === 'Salah'}
                        onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Salah (False)</span>
                    </label>
                  </div>
                </div>
              )}

              {form.questionType === 'essay' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grading Rubric / Answer Key Notes</label>
                  <textarea
                    rows={2}
                    value={form.correctAnswer}
                    onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Key concepts required for maximum score..."
                  />
                </div>
              )}

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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-xs cursor-pointer"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Question Import Modal */}
      {excelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setExcelModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Bulk Import Questions from Excel</h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload an <code>.xlsx</code> spreadsheet with columns:{' '}
              <strong>Question Text, Type, Opt A, Opt B, Opt C, Opt D, Opt E, Correct Answer, Points, Explanation</strong>.
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

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExcelModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importLoading || !excelFile}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {importLoading ? 'Uploading & Parsing...' : 'Import Questions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
