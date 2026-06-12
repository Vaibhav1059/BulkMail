import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';

// Lazy load pages for bundle optimization
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const CreateCampaign = lazy(() => import('./pages/CreateCampaign'));
const CSVUploadMapping = lazy(() => import('./pages/CSVUploadMapping'));
const TemplateManager = lazy(() => import('./pages/TemplateManager'));
const SendingMonitor = lazy(() => import('./pages/SendingMonitor'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', color: '#94a3b8', fontFamily: 'sans-serif' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>Loading page assets...</p>
              </div>
            </div>
          }>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/campaigns/new" element={<CreateCampaign />} />
              <Route path="/csv-upload" element={<CSVUploadMapping />} />
              <Route path="/templates" element={<TemplateManager />} />
              <Route path="/sending-monitor" element={<SendingMonitor />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;
