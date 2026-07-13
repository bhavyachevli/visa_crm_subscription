import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './lib/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import NewLead from './pages/NewLead';
import LeadDetail from './pages/LeadDetail';
import EditLead from './pages/EditLead';
import Finance from './pages/Finance';
import Agreements from './pages/Agreements';
import CreateAccount from './pages/CreateAccount';
import ManageDirectors from './pages/ManageDirectors';
import ManageBranchAdmins from './pages/ManageBranchAdmins';
import ManageBranches from './pages/ManageBranches';
import Attendance from './pages/Attendance';
import LeadTransfer from './pages/LeadTransfer';
import Profile from './pages/Profile';
import AgentDashboard from './pages/AgentDashboard';
import ClientPortal from './pages/ClientPortal';
import Tasks from './pages/Tasks';
import HR from './pages/HR';
import Appointments from './pages/Appointments';

// Replace with your real Google Client ID from .env / Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* All authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/immigration" element={<AgentDashboard />} />
                <Route path="/client-portal" element={<ClientPortal />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/leads/new" element={<NewLead />} />
                <Route path="/leads/:id" element={<LeadDetail />} />
                <Route path="/leads/:id/edit" element={<EditLead />} />
                <Route path="/agreements" element={<Agreements />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/appointments" element={<Appointments />} />

                {/* CEO + Director only */}
                <Route element={<ProtectedRoute roles={['CEO', 'DIRECTOR']} />}>
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/create-account" element={<CreateAccount />} />
                  <Route path="/branch-admins" element={<ManageBranchAdmins />} />
                  <Route path="/leads/transfer" element={<LeadTransfer />} />
                </Route>

                {/* CEO + Director + HR */}
                <Route element={<ProtectedRoute roles={['CEO', 'DIRECTOR', 'HR']} />}>
                  <Route path="/hr" element={<HR />} />
                </Route>

                {/* CEO only */}
                <Route element={<ProtectedRoute roles={['CEO']} />}>
                  <Route path="/directors" element={<ManageDirectors />} />
                </Route>

                {/* CEO + Director — manage branches */}
                <Route element={<ProtectedRoute roles={['CEO', 'DIRECTOR']} />}>
                  <Route path="/branches" element={<ManageBranches />} />
                </Route>

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
