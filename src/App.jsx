import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import CreateCampaign from './pages/CreateCampaign';
import CSVUploadMapping from './pages/CSVUploadMapping';
import TemplateManager from './pages/TemplateManager';
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
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;
