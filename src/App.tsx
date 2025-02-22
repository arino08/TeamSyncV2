import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Loader2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Workspaces from './pages/Workspaces';
import Tasks from './pages/Tasks';
import WorkspaceDetails from './pages/WorkspaceDetails';

function App() {
  const user = useAuthStore((state) => state.user);
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Router>
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />}>
            <Route index element={<Overview />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="workspaces/:workspaceId" element={<WorkspaceDetails />} />
            <Route path="tasks" element={<Tasks />} />
          </Route>
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
