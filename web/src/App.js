import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Users from './pages/Users';
import Payments from './pages/Payments';
import Quotations from './pages/Quotations';
import ViewQuotation from './pages/ViewQuotation';
import Reports from './pages/Reports';
import ReportDetails from './pages/ReportDetails';
import AddExtraCharge from './pages/AddExtraCharge';
import CreateAdmin from './pages/CreateAdmin';
import CreateSuperAdmin from './pages/CreateSuperAdmin';
import AuditLogs from './pages/AuditLogs';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import CreateOrder from './pages/CreateOrder';
import './App.css';
import SitePlans from './pages/SitePlans';
import SitePlansList from './pages/SitePlansList';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
          <Route path="/projects/:id" element={<PrivateRoute><ProjectDetails /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute roles={['admin', 'super_admin']}><Users /></PrivateRoute>} />
          <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
          <Route path="/quotations" element={<PrivateRoute><Quotations /></PrivateRoute>} />
          <Route path="/quotations/:id" element={<PrivateRoute><ViewQuotation /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/reports/:id" element={<PrivateRoute><ReportDetails /></PrivateRoute>} />
          <Route path="/projects/:id/add-extra-charge" element={<PrivateRoute roles={['finance']}><AddExtraCharge /></PrivateRoute>} />
          <Route path="/create-admin" element={<PrivateRoute roles={['super_admin']}><CreateAdmin /></PrivateRoute>} />
          <Route path="/create-super-admin" element={<PrivateRoute roles={['super_admin']}><CreateSuperAdmin /></PrivateRoute>} />
          <Route path="/audit-logs" element={<PrivateRoute roles={['super_admin', 'admin']}><AuditLogs /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute roles={['admin', 'super_admin', 'finance']}><Orders /></PrivateRoute>} />
          <Route path="/orders/create" element={<PrivateRoute roles={['admin', 'super_admin']}><CreateOrder /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute roles={['admin', 'super_admin', 'finance']}><OrderDetail /></PrivateRoute>} />
          <Route path="/projects/:projectId/site-plans" element={<SitePlans />} />
          <Route path="/site-plans" element={<PrivateRoute><SitePlansList /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
