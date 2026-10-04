export type Role = 'ROLE_ADMIN' | 'ROLE_TEACHER' | 'ROLE_STUDENT';

export interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  active: boolean;
  impersonatedBy?: number | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  name: string;
  email: string;
  roles: Role[];
  impersonatedBy?: number | null;
}

export interface Classroom {
  id: number;
  name: string;
  level: number;
  capacity: number;
  academicYear: string;
  homeroomTeacherId?: number | null;
  homeroomTeacherName?: string | null;
  createdAt: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  teacherId?: number | null;
  teacherName?: string | null;
  credits: number;
  createdAt: string;
}

export interface Teacher {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone?: string;
  nip: string;
  address?: string;
  photo?: string;
  active: boolean;
  createdAt: string;
}

export interface Student {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone?: string;
  nis: string;
  nisn?: string;
  birthDate?: string;
  gender: 'M' | 'F';
  address?: string;
  photo?: string;
  classroomId?: number | null;
  classroomName?: string | null;
  active: boolean;
  createdAt: string;
}

export interface StudentExamCard {
  studentId: number;
  name: string;
  nis: string;
  nisn?: string;
  gender: 'M' | 'F';
  birthDate?: string;
  classroomName: string;
  academicYear: string;
  barcodeData: string;
}

export interface LearningMaterial {
  id: number;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  classroomId?: number | null;
  classroomName?: string;
  title: string;
  description?: string;
  type: string;
  content?: string;
  fileUrl?: string;
  filePath?: string;
  published: boolean;
  totalViews: number;
  hasViewed: boolean;
  createdAt: string;
}

export type ExamType = 'quiz' | 'midterm' | 'final' | 'tryout';
export type ExamStatus = 'draft' | 'published' | 'archived';
export type AttemptStatus = 'in_progress' | 'submitted' | 'needs_grading' | 'completed';

export interface Exam {
  id: number;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  classroomId: number;
  classroomName: string;
  title: string;
  description?: string;
  type: ExamType;
  durationMinutes: number;
  passingScore: number;
  startAt: string;
  endAt: string;
  examDate?: string;
  totalQuestions: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResult: boolean;
  allowRetry: boolean;
  status: ExamStatus;
  createdAt: string;
  studentAttemptStatus?: AttemptStatus | null;
  studentScore?: number | null;
  studentPassed?: boolean | null;
  currentAttemptId?: number | null;
}

export interface Question {
  id: number;
  examinationId: number;
  questionText: string;
  questionType: 'multiple_choice' | 'essay' | 'true_false';
  options?: string[];
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  correctAnswer?: string;
  explanation?: string;
  studentAnswer?: string;
  audioPath?: string;
  imagePath?: string;
}

export interface ExamStartResponse {
  attemptId: number;
  examId: number;
  examTitle: string;
  durationMinutes: number;
  remainingSeconds: number;
  startedAt: string;
  totalQuestions: number;
  questions: Question[];
}

export interface ExamMonitorItem {
  attemptId: number;
  studentId: number;
  studentName: string;
  nis: string;
  status: AttemptStatus;
  score?: number | null;
  passed?: boolean | null;
  violations: number;
  answeredCount: number;
  totalQuestions: number;
  startedAt: string;
  finishedAt?: string | null;
}

export interface Assignment {
  id: number;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  classroomId: number;
  classroomName: string;
  title: string;
  description?: string;
  instructions?: string;
  maxScore: number;
  dueDate: string;
  allowLateSubmission: boolean;
  status: ExamStatus;
  createdAt: string;
  hasSubmitted?: boolean;
  studentScore?: number | null;
  studentSubmissionStatus?: string | null;
  studentSubmittedAt?: string | null;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  studentName: string;
  studentNis: string;
  filePath?: string;
  notes?: string;
  score?: number | null;
  feedback?: string;
  status: string;
  submittedAt: string;
  gradedAt?: string | null;
}

export interface Discussion {
  id: number;
  assignmentId: number;
  userId: number;
  userName: string;
  userRole: string;
  message: string;
  createdAt: string;
  replies: Discussion[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string>;
  timestamp: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  target: string;
  published: boolean;
  createdAt: string;
}

export interface SubjectGradeItem {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  credits: number;
  avgExamScore: number;
  totalExams: number;
  passedExams: number;
  avgAssignmentScore: number;
  totalAssignments: number;
  overallScore: number;
}

export interface GradeReportResponse {
  studentId: number;
  studentName: string;
  nis: string;
  classroomName: string;
  overallGpa: number;
  totalCompletedExams: number;
  totalPassedExams: number;
  subjects: SubjectGradeItem[];
}
