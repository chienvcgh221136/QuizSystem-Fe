import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import UserDashboard from './pages/user/UserDashboard';
import ExamTaking from './pages/user/ExamTaking';
import ExamResult from './pages/user/ExamResult';
import History from './pages/user/History';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminExams from './pages/admin/AdminExams';
import AdminUsers from './pages/admin/AdminUsers';
import AdminQuestions from './pages/admin/AdminQuestions.tsx';
import AdminChatbot from './pages/admin/AdminChatbot';
import AllExams from './pages/user/AllExams';

const FallbackRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'User') return <Navigate to="/user/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

const PrivateRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user } = useAuth();
  
  // Nếu có token trên URL thì đang trong quá trình auto-login từ QuizSystemApp
  // Không redirect về login vội, để AuthProvider xử lý trước
  const urlParams = new URLSearchParams(window.location.search);
  const hasUrlToken = urlParams.get('token');
  
  if (!user && hasUrlToken) return null; // Đang load, chờ AuthProvider xử lý
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* User Routes */}
          <Route path="/user/dashboard" element={<PrivateRoute roles={['User', 'Admin']}><UserDashboard /></PrivateRoute>} />
          <Route path="/user/exam/:resultId/:examId" element={<PrivateRoute roles={['User', 'Admin']}><ExamTaking /></PrivateRoute>} />
          <Route path="/user/result/:resultId" element={<PrivateRoute roles={['User', 'Admin']}><ExamResult /></PrivateRoute>} />
          <Route path="/user/history" element={<PrivateRoute roles={['User', 'Admin']}><History /></PrivateRoute>} />
          
          {/* Default User routes mapping to existing pages */}
          <Route path="/user/exams" element={<PrivateRoute roles={['User', 'Admin']}><AllExams /></PrivateRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<PrivateRoute roles={['Admin']}><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/exams" element={<PrivateRoute roles={['Admin']}><AdminExams /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute roles={['Admin']}><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/questions" element={<PrivateRoute roles={['Admin']}><AdminQuestions /></PrivateRoute>} />
          <Route path="/admin/chatbot" element={<PrivateRoute roles={['Admin']}><AdminChatbot /></PrivateRoute>} />
          
          {/* Default Admin routes mapping to existing pages */}
          <Route path="*" element={<FallbackRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
