import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import CreateCampaign from './pages/CreateCampaign';
import CSVUploadMapping from './pages/CSVUploadMapping';
import TemplateBuilder from './pages/TemplateBuilder';
import TemplateManager from './pages/TemplateManager';
import PreviewCampaign from './pages/PreviewCampaign';
import SendingMonitor from './pages/SendingMonitor';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campaigns/new" element={<CreateCampaign />} />
            <Route path="/csv-upload" element={<CSVUploadMapping />} />
            <Route path="/template-builder" element={<TemplateBuilder />} />
            <Route path="/templates" element={<TemplateManager />} />
            <Route path="/preview" element={<PreviewCampaign />} />
            <Route path="/sending-monitor" element={<SendingMonitor />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;
