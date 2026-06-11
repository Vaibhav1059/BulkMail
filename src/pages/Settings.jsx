import { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { API_BASE, authFetch } from '../utils/api';
import {
  Server,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  Save,
  Cpu
} from 'lucide-react';

export const Settings = () => {
  const { settings, updateSettings } = useContext(AppContext);

  const [smtp, setSmtp] = useState({ ...settings.smtp });
  const [limits, setLimits] = useState({ ...settings.limits });
  const [timeouts, setTimeouts] = useState({ ...settings.timeouts });

  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null
  const [isSaved, setIsSaved] = useState(false);

  const [provider, setProvider] = useState(() => {
    if (settings.smtp.host === 'smtp.sendgrid.net' && settings.smtp.username === 'apikey') return 'sendgrid';
    if (settings.smtp.host === 'smtp.mailgun.org') return 'mailgun';
    if (settings.smtp.host && settings.smtp.host.includes('.amazonaws.com')) return 'ses';
    return 'smtp';
  });

  const [sesRegion, setSesRegion] = useState(() => {
    if (settings.smtp.host && settings.smtp.host.includes('.amazonaws.com')) {
      const match = settings.smtp.host.match(/email-smtp\.(.*?)\.amazonaws\.com/);
      return match ? match[1] : 'us-east-1';
    }
    return 'us-east-1';
  });

  const handleProviderChange = (e) => {
    const prov = e.target.value;
    setProvider(prov);
    
    if (prov === 'sendgrid') {
      setSmtp(prev => ({
        ...prev,
        host: 'smtp.sendgrid.net',
        port: '587',
        username: 'apikey',
        encryption: 'TLS'
      }));
    } else if (prov === 'mailgun') {
      setSmtp(prev => ({
        ...prev,
        host: 'smtp.mailgun.org',
        port: '587',
        username: '',
        encryption: 'TLS'
      }));
    } else if (prov === 'ses') {
      setSmtp(prev => ({
        ...prev,
        host: `email-smtp.${sesRegion}.amazonaws.com`,
        port: '587',
        username: '',
        encryption: 'TLS'
      }));
    } else {
      setSmtp(prev => ({
        ...prev,
        host: '',
        port: '587',
        username: '',
        encryption: 'TLS'
      }));
    }
  };

  const handleRegionChange = (e) => {
    const reg = e.target.value;
    setSesRegion(reg);
    setSmtp(prev => ({
      ...prev,
      host: `email-smtp.${reg}.amazonaws.com`
    }));
  };

  const getPasswordLabel = () => {
    switch (provider) {
      case 'sendgrid':
        return 'SendGrid API Key';
      case 'mailgun':
        return 'Mailgun SMTP Password';
      case 'ses':
        return 'Amazon SES SMTP Password';
      default:
        return 'Password / API Key';
    }
  };

  const handleSmtpChange = (e) => {
    const { name, value } = e.target;
    setSmtp(prev => ({ ...prev, [name]: value }));
  };

  const handleLimitsChange = (e) => {
    const { name, value } = e.target;
    setLimits(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleTimeoutsChange = (e) => {
    const { name, value } = e.target;
    setTimeouts(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      const response = await authFetch(`${API_BASE}/settings/verify`, {
        method: 'POST',
        body: JSON.stringify(smtp)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult(data.isMock ? 'mock' : 'success');
      } else {
        setTestResult('error');
        alert('SMTP Connection failed: ' + (data.error || 'Verification timeout/error'));
      }
    } catch (err) {
      console.error(err);
      setTestResult('error');
      alert('Network error when verifying SMTP: ' + err.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateSettings({
      smtp,
      limits,
      timeouts
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Global System Settings</h1>
            <p className="text-sm text-slate-500">Configure SMTP relay server networks, delay intervals, and retry timeouts.</p>
          </div>

          <button
            type="submit"
            className="btn-primary py-2 px-4 text-xs"
          >
            <Save size={14} /> Save System Settings
          </button>
        </div>

        {/* Success Banner */}
        {isSaved && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" /> SMTP and Rate Limit profiles have been successfully updated.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SMTP Config Grid */}
          <div className="lg:col-span-2 bg-white border border-slate-200/85 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Server size={14} className="text-indigo-600" /> SMTP Server Credentials
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pb-3 border-b border-slate-100">
              {/* Delivery Provider */}
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Delivery Provider Gateway</label>
                <select
                  value={provider}
                  onChange={handleProviderChange}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650 font-semibold"
                >
                  <option value="smtp">Standard Custom SMTP Server</option>
                  <option value="sendgrid">SendGrid API / SMTP Gateway</option>
                  <option value="mailgun">Mailgun API / SMTP Gateway</option>
                  <option value="ses">Amazon SES API / SMTP Gateway</option>
                </select>
              </div>

              {provider === 'ses' && (
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">AWS SES Region</label>
                  <select
                    value={sesRegion}
                    onChange={handleRegionChange}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-655"
                  >
                    <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                    <option value="us-west-2">US West (Oregon) - us-west-2</option>
                    <option value="eu-west-1">Europe (Ireland) - eu-west-1</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                    <option value="ap-south-1">Asia Pacific (Mumbai) - ap-south-1</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Host */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider">SMTP Host</label>
                <input
                  type="text"
                  name="host"
                  value={smtp.host}
                  onChange={handleSmtpChange}
                  placeholder="e.g. smtp.mailgun.org"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650 disabled:bg-slate-50 disabled:text-slate-450"
                  disabled={provider !== 'smtp'}
                  required
                />
              </div>

              {/* Port */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider">SMTP Port</label>
                <input
                  type="text"
                  name="port"
                  value={smtp.port}
                  onChange={handleSmtpChange}
                  placeholder="e.g. 587 or 465"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650 disabled:bg-slate-50 disabled:text-slate-450"
                  disabled={provider !== 'smtp'}
                  required
                />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  name="username"
                  value={smtp.username}
                  onChange={handleSmtpChange}
                  placeholder={provider === 'sendgrid' ? 'apikey' : 'e.g. postmaster@yourdomain.com'}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650 disabled:bg-slate-50 disabled:text-slate-450"
                  disabled={provider === 'sendgrid'}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider">{getPasswordLabel()}</label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={smtp.password}
                    onChange={handleSmtpChange}
                    placeholder="SMTP credentials secret"
                    className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'none',
                      border: 'none',
                      padding: 0
                    }}
                    className="text-slate-400 hover:text-slate-650"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {showPassword && smtp.password === '••••••••' && (
                  <p className="text-[10px] text-slate-400 mt-1 lowercase">
                    Note: Saved credentials are encrypted and hidden for security. Type a new password/API key to update.
                  </p>
                )}
              </div>

              {/* Encryption */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider">Encryption Protocol</label>
                <select
                  name="encryption"
                  value={smtp.encryption}
                  onChange={handleSmtpChange}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650 disabled:bg-slate-50 disabled:text-slate-450"
                  disabled={provider !== 'smtp'}
                >
                  <option value="TLS">STARTTLS (587)</option>
                  <option value="SSL">SSL/TLS (465)</option>
                  <option value="None">None (25/80)</option>
                </select>
              </div>

              {/* Sender Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider">Sender Identity Name</label>
                <input
                  type="text"
                  name="senderName"
                  value={smtp.senderName}
                  onChange={handleSmtpChange}
                  placeholder="e.g. AeroSend Sales"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                  required
                />
              </div>

              {/* Sender Email */}
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider">Sender Address Email</label>
                <input
                  type="email"
                  name="senderEmail"
                  value={smtp.senderEmail}
                  onChange={handleSmtpChange}
                  placeholder="e.g. support@yourdomain.com"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                  required
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={testConnection}
                disabled={testingConnection}
                className="btn-secondary py-2 px-3 text-xs disabled:opacity-50"
              >
                {testingConnection ? <RefreshCw size={12} className="animate-spin" /> : <Server size={12} />} Verify SMTP Connectivity
              </button>

              {testResult === 'success' && (
                <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle size={14} className="text-emerald-500" /> Connection Successful. TLS Handshake complete (Real Mode).
                </span>
              )}

              {testResult === 'mock' && (
                <span className="text-amber-700 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle size={14} className="text-amber-500" /> Connection Verified (Mock SMTP Mode).
                </span>
              )}

              {testResult === 'error' && (
                <span className="text-rose-700 text-xs font-semibold flex items-center gap-1">
                  Verification Failed. Check console/logs.
                </span>
              )}
            </div>
          </div>

          {/* Delivery & Timeout throttles */}
          <div className="space-y-6">
            {/* Delivery Rate Limits */}
            <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Cpu size={14} className="text-indigo-650" /> Dispatch Throttling
              </h3>

              <div className="space-y-3 text-xs">
                {/* Emails per hour */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Emails Limit (Hour)</label>
                  <input
                    type="number"
                    name="emailsPerHour"
                    value={limits.emailsPerHour}
                    onChange={handleLimitsChange}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-655"
                  />
                </div>

                {/* Emails per day */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Emails Limit (Day)</label>
                  <input
                    type="number"
                    name="emailsPerDay"
                    value={limits.emailsPerDay}
                    onChange={handleLimitsChange}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-655"
                  />
                </div>

                {/* Delay */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Delay Between Emails (Seconds)</label>
                  <input
                    type="number"
                    name="delaySeconds"
                    value={limits.delaySeconds}
                    onChange={handleLimitsChange}
                    step={0.1}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-655"
                  />
                </div>
              </div>
            </div>

            {/* Timeouts */}
            <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                Timeouts & Retries
              </h3>

              <div className="space-y-3 text-xs">
                {/* Connection Timeout */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Connection Timeout (Seconds)</label>
                  <input
                    type="number"
                    name="connectionTimeout"
                    value={timeouts.connectionTimeout}
                    onChange={handleTimeoutsChange}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-655"
                  />
                </div>

                {/* Retry attempts */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Retry Attempts (Failure)</label>
                  <input
                    type="number"
                    name="retryAttempts"
                    value={timeouts.retryAttempts}
                    onChange={handleTimeoutsChange}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-655"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
  );
};
export default Settings;
