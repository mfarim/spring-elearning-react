import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Classrooms } from './pages/admin/Classrooms';
import { Subjects } from './pages/admin/Subjects';
import { Teachers } from './pages/admin/Teachers';
import { Students } from './pages/admin/Students';
import { Announcements } from './pages/admin/Announcements';
import { MaterialsList } from './pages/materials/MaterialsList';
import { MaterialDetail } from './pages/materials/MaterialDetail';
import { ExamList } from './pages/exams/ExamList';
import { ExamEditor } from './pages/exams/ExamEditor';
import { ExamMonitor } from './pages/exams/ExamMonitor';
import { ExamRunner } from './pages/exams/ExamRunner';
import { AssignmentList } from './pages/assignments/AssignmentList';
import { AssignmentDetail } from './pages/assignments/AssignmentDetail';
import { Grades } from './pages/student/Grades';

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Dedicated Standalone CBT Fullscreen Test Room */}
        <Route element={<ProtectedRoute allowedRoles={['ROLE_STUDENT', 'ROLE_ADMIN']} />}>
          <Route path="/exams/:id/runner" element={<ExamRunner />} />
        </Route>

        {/* Main Application Layout with Navigation Shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Admin Academic Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ROLE_ADMIN']} />}>
              <Route path="/classrooms" element={<Classrooms />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/students" element={<Students />} />
              <Route path="/announcements" element={<Announcements />} />
            </Route>

            {/* Examination & Question Bank */}
            <Route path="/exams" element={<ExamList />} />
            <Route element={<ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_TEACHER']} />}>
              <Route path="/exams/:id/questions" element={<ExamEditor />} />
              <Route path="/exams/:id/monitor" element={<ExamMonitor />} />
            </Route>

            {/* Learning Materials */}
            <Route path="/materials" element={<MaterialsList />} />
            <Route path="/materials/:id" element={<MaterialDetail />} />

            {/* Assignments & Forums */}
            <Route path="/assignments" element={<AssignmentList />} />
            <Route path="/assignments/:id" element={<AssignmentDetail />} />

            {/* Student Grades & Report */}
            <Route element={<ProtectedRoute allowedRoles={['ROLE_STUDENT', 'ROLE_ADMIN']} />}>
              <Route path="/grades" element={<Grades />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
