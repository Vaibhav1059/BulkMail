import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Protected } from '../components/Protected';
import {
  Eye,
  CheckCircle,
  AlertTriangle,
  Play,
  ArrowLeft,
  Server,
  Users,
  Check
} from 'lucide-react';

export const PreviewCampaign = () => {
  const {
    campaignWorkspace,
    csvData,
    settings,
    launchCampaign,
    saveCampaign,
    logEvent
  } = useContext(AppContext);
  const navigate = useNavigate();

  const hasCSV = csvData.rawRows.length > 0;
  const validationSummary = csvData.validationReport?.summary || { total: 0, valid: 0, duplicates: 0, invalid: 0 };

  // Sending Controls local states
  const [rangeOption, setRangeOption] = useState('all');
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(validationSummary.valid || 1);
  const [concurrency, setConcurrency] = useState(1);
  const [delayOverride, setDelayOverride] = useState(settings.limits.delaySeconds || 0.5);
  const [isLaunching, setIsLaunching] = useState(false);
  const [deviceView, setDeviceView] = useState('desktop');

  // Generate personalized version for the very first recipient in the CSV rows
  const getPersonalizedPreview = () => {
    let rawBody = campaignWorkspace.body || '';
    let rawSubject = campaignWorkspace.subject || '';

    // Default sample record if no CSV uploaded
    let sampleRecord = { email: 'john@example.com', name: 'John Doe', company: 'Acme Corp' };
    
    if (hasCSV && csvData.validationReport && csvData.validationReport.rows.length > 0) {
      // Find the first valid row
      const firstValid = csvData.validationReport.rows.find(r => r.status === 'Valid');
      if (firstValid) {
        sampleRecord = {
          email: firstValid.email,
          name: firstValid.data[csvData.mappedFields.name] || 'Customer',
          company: firstValid.data[csvData.mappedFields.company] || 'Enterprise'
        };
      }
    }

    const compile = (text) => {
      return text
        .replace(/{{name}}/g, sampleRecord.name)
        .replace(/{{email}}/g, sampleRecord.email)
        .replace(/{{company}}/g, sampleRecord.company)
        .replace(/\n\n/g, '</p><p style="margin-top: 10px; margin-bottom: 10px;">')
        .replace(/\n/g, '<br/>');
    };

    const compiledSubject = rawSubject
      .replace(/{{name}}/g, sampleRecord.name)
      .replace(/{{email}}/g, sampleRecord.email)
      .replace(/{{company}}/g, sampleRecord.company);

    const compiledBody = compile(rawBody);

    return {
      subject: compiledSubject,
      to: `${sampleRecord.name} <${sampleRecord.email}>`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; min-height: 250px; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; font-size: 15px; line-height: 1.6; border-radius: 12px; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.03);">
            <!-- Header Logo Simulation -->
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 15px;">A</div>
              <div>
                <div style="font-size: 14px; font-weight: bold; color: #0f172a;">AeroSend System</div>
                <div style="font-size: 10px; color: #94a3b8; font-weight: 500;">Campaign Broadcast</div>
              </div>
            </div>

            <div style="color: #0f172a;">
              <p style="margin: 0 0 12px 0;">${compiledBody}</p>
            </div>

            <div style="margin-top: 40px; padding-top: 20px; font-size: 11px; text-align: center; line-height: 1.7; border-top: 1px solid #f1f5f9; color: #64748b;">
              You are receiving this email because you are registered under ${sampleRecord.name} (${sampleRecord.email}).<br/>
              AeroSend Inc, 100 Pine St, San Francisco, CA. <br/>
              <a href="#" style="color: #6366f1; text-decoration: none; font-weight: 500;">Manage Preferences</a> &bull; <a href="#" style="color: #6366f1; text-decoration: none; font-weight: 500;">Unsubscribe</a>
            </div>
          </div>
        </div>
      `
    };
  };

  const previewContent = getPersonalizedPreview();

  const handleLaunch = async () => {
    if (isLaunching) return;
    setIsLaunching(true);

    const range = rangeOption === 'custom' ? { from: parseInt(rangeFrom), to: parseInt(rangeTo) } : null;
    const finalRecipientsCount = range 
      ? Math.max(0, parseInt(rangeTo) - parseInt(rangeFrom) + 1)
      : validationSummary.valid;

    // 1. Save campaign draft to campaigns list
    const newCampId = await saveCampaign({
      name: campaignWorkspace.name,
      subject: campaignWorkspace.subject,
      body: campaignWorkspace.body,
      recipientsCount: finalRecipientsCount,
      scheduleDate: campaignWorkspace.scheduleOption === 'schedule' ? campaignWorkspace.scheduleDate : null,
      status: campaignWorkspace.scheduleOption === 'schedule' ? 'Scheduled' : 'Draft'
    });

    if (campaignWorkspace.scheduleOption === 'schedule') {
      alert(`Campaign "${campaignWorkspace.name}" successfully scheduled for ${new Date(campaignWorkspace.scheduleDate).toLocaleString()}`);
      navigate('/');
    } else {
      // 2. Launch live simulation and navigate to Sending Monitor
      const validRecipients = csvData.validationReport.rows.filter(r => r.status === 'Valid');
      launchCampaign(newCampId, campaignWorkspace.name, campaignWorkspace.subject, campaignWorkspace.body, validRecipients, range, concurrency, delayOverride);
      navigate('/sending-monitor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Preview Campaign</h1>
        <p className="text-sm text-slate-500">Perform final review of layouts and validation reports before launching.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personalized Email Render */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Eye size={14} className="text-indigo-600" /> First Recipient Personalized Preview
          </h3>

          {/* macOS style frame for preview campaign */}
          <div className="bg-slate-100/50 border border-slate-205 rounded-xl overflow-hidden shadow-sm flex flex-col transition-all duration-300">
            {/* macOS Topbar controls */}
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dfa123]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
              </div>

              {/* Device selectors */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg border border-slate-300/30">
                {[
                  { id: 'desktop', label: 'Desktop', icon: '🖥️' },
                  { id: 'tablet', label: 'Tablet', icon: '📟' },
                  { id: 'mobile', label: 'Mobile', icon: '📱' }
                ].map(device => (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => setDeviceView(device.id)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all duration-300 ${
                      deviceView === device.id
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-707'
                    }`}
                  >
                    <span>{device.icon}</span>
                    <span>{device.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="w-[48px]" /> {/* Spacer to center device selectors */}
            </div>

            {/* Header info */}
            <div className="bg-white p-4 border-b border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed font-sans shadow-sm">
              <div>
                <span className="font-semibold text-slate-400 mr-2">Campaign:</span>
                <span className="text-slate-800 font-semibold">{campaignWorkspace.name || 'Untitled Campaign'}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-400 mr-2">To Recipient:</span>
                  <span className="text-indigo-650 font-mono font-medium">{previewContent.to}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">1 recipient seed</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400 mr-2">Subject line:</span>
                <span className="text-slate-800 font-semibold bg-slate-55/40 border border-slate-150 px-2 py-0.5 rounded text-[11px]">{previewContent.subject}</span>
              </div>
              {campaignWorkspace.attachments?.length > 0 && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="font-semibold text-slate-400 mr-2">Attachments ({campaignWorkspace.attachments.length}):</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-medium">{campaignWorkspace.attachments.map(a => a.name).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Content previewer frame */}
            <div className="flex-1 overflow-hidden bg-slate-100/30 p-4 flex justify-center items-start">
              <div
                className={`bg-white rounded-xl overflow-y-auto custom-scrollbar shadow-sm border border-slate-200/50 transition-all duration-300 ${
                  deviceView === 'mobile'
                    ? 'w-[375px] h-[400px]'
                    : deviceView === 'tablet'
                    ? 'w-[600px] h-[450px]'
                    : 'w-full min-h-[300px] max-h-[500px]'
                }`}
              >
                <div dangerouslySetInnerHTML={{ __html: previewContent.html }} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              to="/template-builder"
              className="btn-secondary py-2 px-4 text-xs font-semibold"
            >
            Edit Template
            </Link>
          </div>
        </div>

        {/* Right checklist & metadata summary */}
        <div className="space-y-6">
          {/* Preflight checks */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              Pre-flight Checklist
            </h3>

            <div className="space-y-3">
              {/* Check 1: CSV loaded */}
              <div className="flex gap-3 text-xs">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${hasCSV ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 font-sans">Recipient Dataset</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {hasCSV 
                      ? `${validationSummary.valid} valid emails ready to send.`
                      : 'No active recipient list uploaded.'}
                  </p>
                </div>
              </div>

              {/* Check 2: SMTP details */}
              <div className="flex gap-3 text-xs">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex-shrink-0">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 font-sans">SMTP Host Connection</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Configured to <span className="font-mono text-indigo-650">{settings.smtp.host || 'Local Mock'}</span> on port {settings.smtp.port || '587'}.
                  </p>
                </div>
              </div>

              {/* Check 3: Placeholder tags validation */}
              <div className="flex gap-3 text-xs">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex-shrink-0">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 font-sans">Placeholder Variables</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Mappers linked. Auto-fallback variables will handle missing fields.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sending Mechanism Configurations */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              Dispatch Configurations
            </h3>

            {/* Recipient Range Options */}
            <div className="space-y-2 text-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipients Selection</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="rangeOption"
                    value="all"
                    checked={rangeOption === 'all'}
                    onChange={() => setRangeOption('all')}
                    className="text-indigo-650 focus:ring-0 focus:ring-offset-0 bg-white border-slate-350"
                  />
                  Send to All ({validationSummary.valid})
                </label>
                <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="rangeOption"
                    value="custom"
                    checked={rangeOption === 'custom'}
                    onChange={() => setRangeOption('custom')}
                    className="text-indigo-655 focus:ring-0 focus:ring-offset-0 bg-white border-slate-350"
                  />
                  Custom Range
                </label>
              </div>

              {rangeOption === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">From Index</label>
                    <input
                      type="number"
                      min={1}
                      max={validationSummary.valid}
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">To Index</label>
                    <input
                      type="number"
                      min={1}
                      max={validationSummary.valid}
                      value={rangeTo}
                      onChange={(e) => setRangeTo(Math.min(validationSummary.valid, parseInt(e.target.value) || validationSummary.valid))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Delay Override (seconds) */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Sending Delay</span>
                <span className="text-indigo-650 font-mono font-bold">{delayOverride}s</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.1}
                value={delayOverride}
                onChange={(e) => setDelayOverride(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 bg-slate-200 h-1 rounded cursor-pointer"
              />
              <p className="text-[9px] text-slate-450">Wait interval between email dispatches.</p>
            </div>

            {/* Concurrency (Simultaneous) */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Simultaneous Sends</span>
                <span className="text-indigo-655 font-mono font-bold">x{concurrency} thread(s)</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value))}
                className="w-full accent-indigo-600 bg-slate-200 h-1 rounded cursor-pointer"
              />
              <p className="text-[9px] text-slate-455">Send multiple emails in parallel simultaneously.</p>
            </div>
          </div>

          {/* Recipient summary details */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={12} className="text-indigo-500" /> Dispatch Summary
            </h3>
            
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500 font-sans">Total Valid Receivers</span>
                <span className="font-mono font-bold text-slate-800">{validationSummary.valid}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500 font-sans">Filtered Duplicates</span>
                <span className="font-mono font-bold text-amber-600">{validationSummary.duplicates}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500 font-sans">Sending Mode</span>
                <span className="font-semibold text-slate-800 capitalize">{campaignWorkspace.scheduleOption}</span>
              </div>
              {campaignWorkspace.scheduleOption === 'schedule' && (
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 font-sans">Schedule Date</span>
                  <span className="font-mono text-slate-800 font-medium">{new Date(campaignWorkspace.scheduleDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleLaunch}
            disabled={!hasCSV || validationSummary.valid === 0 || isLaunching}
            className="btn-primary w-full py-3 text-xs disabled:opacity-50"
          >
            <Play size={12} /> {isLaunching ? 'Launching Campaign...' : campaignWorkspace.scheduleOption === 'schedule' ? 'Schedule Campaign' : 'Start Sending Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default PreviewCampaign;
