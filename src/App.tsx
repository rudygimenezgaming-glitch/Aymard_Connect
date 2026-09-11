import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute, TeacherRoute, StudentRoute } from '@/components/ProtectedRoute';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import TeacherDashboard from '@/pages/TeacherDashboard';
import TeacherSessionDetail from '@/pages/TeacherSessionDetail';
import StudentDashboard from '@/pages/StudentDashboard';
import StudentSessionDetail from '@/pages/StudentSessionDetail';
import Messages from '@/pages/Messages';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/teacher"
            element={
              <TeacherRoute>
                <TeacherDashboard />
              </TeacherRoute>
            }
          />
          <Route
            path="/teacher/session/:id"
            element={
              <TeacherRoute>
                <TeacherSessionDetail />
              </TeacherRoute>
            }
          />
          <Route
            path="/student"
            element={
              <StudentRoute>
                <StudentDashboard />
              </StudentRoute>
            }
          />
          <Route
            path="/student/session/:id"
            element={
              <StudentRoute>
                <StudentSessionDetail />
              </StudentRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
