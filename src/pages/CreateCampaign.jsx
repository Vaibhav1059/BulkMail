import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Protected } from '../components/Protected';
import {
  Sparkles,
  Clock,
  Send,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  RefreshCw,
  Eye
} from 'lucide-react';

export const CreateCampaign = () => {
  const { campaignWorkspace, setCampaignWorkspace, saveCampaign, sendTestEmail, logEvent } = useContext(AppContext);
  const navigate = useNavigate();

  // Local Form state initialized from global workspace
  const [formData, setFormData] = useState({
    name: campaignWorkspace.name || '',
    subject: campaignWorkspace.subject || '',
    body: campaignWorkspace.body || '',
    scheduleOption: campaignWorkspace.scheduleOption || 'immediate',
    scheduleDate: campaignWorkspace.scheduleDate || '',
  });

  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSentStatus, setTestSentStatus] = useState(null); // 'success' | 'error' | null
  const [isTestMock, setIsTestMock] = useState(false);

  // Pre-defined templates for quick insertion
  const templates = [
    {
      id: 'news',
      name: 'Monthly Newsletter',
      subject: 'Newsletter: Latest updates from {{company}}',
      body: 'Hi {{name}},\n\nHere are the top stories this month from {{company}}:\n\n1. Product Automations are now live.\n2. Security parameters have been updated.\n\nEnjoy the reads!\n\nBest,\nThe Newsletter Team'
    },
    {
      id: 'welcome',
      name: 'Welcome Onboarding',
      subject: 'Welcome to AeroSend, {{name}}!',
      body: 'Hello {{name}},\n\nThank you for setting up your account under {{email}}. We are excited to support your journey.\n\nLet us know if you need help.\n\nRegards,\nCustomer Success'
    },
    {
      id: 'promo',
      name: 'Exclusive Promo Discount',
      subject: 'Exclusive deal for {{name}}',
      body: 'Hey {{name}},\n\nWe have generated a custom coupon for {{company}} employees. Use code AEROSEND20 to get 20% off your active subscription.\n\nAct fast!\nSales Team'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectTemplate = (tpl) => {
    setFormData(prev => ({
      ...prev,
      subject: tpl.subject,
      body: tpl.body
    }));
  };

  // Helper to insert placeholders at cursor position
  const insertPlaceholder = (tag) => {
    const textarea = document.getElementById('campaign-body-editor');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newBody = before + tag + after;
    setFormData(prev => ({ ...prev, body: newBody }));

    // Reset cursor focus
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 10);
  };


  const triggerTestSend = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestSentStatus('error');
      return;
    }

    setSendingTest(true);
    setTestSentStatus(null);

    try {
      const res = await sendTestEmail(testEmail, formData.subject, formData.body);
      setIsTestMock(!!(res && res.isMock));
      setTestSentStatus('success');
    } catch (err) {
      setTestSentStatus('error');
    } finally {
      setSendingTest(false);
    }
  };

  const handleProceed = () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      alert('Please fill out all required fields: Name, Subject, and Email Body.');
      return;
    }

    // Save temporary details in App Context
    setCampaignWorkspace({
      ...formData,
      attachments: []
    });

    navigate('/csv-upload');
  };

  return (
    <Protected allowedRoles={['Admin', 'Manager']}>
      <div className="space-y-6">
        {/* Title bar */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Create Campaign</h1>
          <p className="text-sm text-slate-500">Draft your campaign content and customize sending options.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Draft Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-5">
              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Campaign Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. June product release discount"
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-650 transition-colors"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Subject Line</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Subject of your mailer"
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-650 transition-colors"
                />
              </div>

              {/* Content Editor */}
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Content</label>
                  
                  {/* Tag placeholders panel */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Variables:</span>
                    {['{{name}}', '{{email}}', '{{company}}'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => insertPlaceholder(tag)}
                        className="btn-pill-indigo"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  id="campaign-body-editor"
                  name="body"
                  value={formData.body}
                  onChange={handleInputChange}
                  rows={10}
                  placeholder="Draft your HTML/Plaintext message here..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-800 focus:outline-none focus:border-indigo-650 transition-colors editor-font"
                />
              </div>

            </div>
          </div>

          {/* Configuration and Presets panel */}
          <div className="space-y-6">
            {/* Quick Templates Panel */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Sparkles size={12} className="text-indigo-500" /> Choose Preset Template
              </h3>
              <div className="space-y-2">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => selectTemplate(tpl)}
                    className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-indigo-100 bg-slate-50 hover:bg-indigo-50/20 text-xs transition-all duration-300"
                  >
                    <div className="font-semibold text-slate-800">{tpl.name}</div>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">{tpl.subject}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Scheduler Panel */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={12} className="text-indigo-500" /> Send Schedule
              </h3>
              
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="scheduleOption"
                    value="immediate"
                    checked={formData.scheduleOption === 'immediate'}
                    onChange={handleInputChange}
                    className="text-indigo-655 focus:ring-0 focus:ring-offset-0 bg-white border-slate-300"
                  />
                  Send immediately
                </label>
                
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="scheduleOption"
                    value="schedule"
                    checked={formData.scheduleOption === 'schedule'}
                    onChange={handleInputChange}
                    className="text-indigo-655 focus:ring-0 focus:ring-offset-0 bg-white border-slate-300"
                  />
                  Schedule for later
                </label>
              </div>

              {formData.scheduleOption === 'schedule' && (
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select Date & Time</label>
                  <input
                    type="datetime-local"
                    name="scheduleDate"
                    value={formData.scheduleDate}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-650"
                  />
                </div>
              )}
            </div>

            {/* Control buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => setShowTestModal(true)}
                className="btn-secondary w-full py-2.5 text-xs"
              >
                <Send size={12} /> Send Test Email
              </button>

              <button
                onClick={handleProceed}
                className="btn-primary w-full py-3 text-xs"
              >
                Proceed to CSV Upload <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* SEND TEST EMAIL MODAL */}
        {showTestModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-xl relative">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestSentStatus(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 transition-colors"
              >
                <X size={16} />
              </button>

              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Send Test Email</h3>
              <p className="text-xs text-slate-550 mb-4">Validate SMTP status and visual rendering with a single mock recipient.</p>

              <div className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter test recipient email..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                  />
                </div>

                {sendingTest && (
                  <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg justify-center">
                    <RefreshCw size={12} className="animate-spin" /> Sending test email...
                  </div>
                )}

                {testSentStatus === 'success' && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {isTestMock ? (
                      <span>Simulated test email sent successfully! (Mock SMTP Mode)</span>
                    ) : (
                      <span>Real test email sent successfully! Check your inbox.</span>
                    )}
                  </div>
                )}

                {testSentStatus === 'error' && (
                  <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 px-3 py-2 rounded-lg">
                    <X size={14} className="text-rose-500" /> Failed sending. Verify recipient format or SMTP.
                  </div>
                )}

                <button
                  disabled={sendingTest}
                  onClick={triggerTestSend}
                  className="btn-primary w-full py-2 text-xs disabled:opacity-55"
                >
                  Send Test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
};
export default CreateCampaign;
