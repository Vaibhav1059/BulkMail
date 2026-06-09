import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import {
  FileCode,
  Sparkles,
  Eye,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export const TemplateBuilder = () => {
  const { campaignWorkspace, setCampaignWorkspace } = useContext(AppContext);
  const navigate = useNavigate();

  const [bodyText, setBodyText] = useState(campaignWorkspace.body || '');
  const [subjectText, setSubjectText] = useState(campaignWorkspace.subject || '');
  
  // Custom styled CSS wrappers for rich rendering
  const [emailTheme, setEmailTheme] = useState('slate-minimal'); // Preview theme
  const [deviceView, setDeviceView] = useState('desktop');
  const [sandboxRecipient, setSandboxRecipient] = useState('jane');

  const sandboxRecipients = [
    { id: 'jane', name: 'Jane Doe', email: 'jane@google.com', company: 'Google LLC' },
    { id: 'alex', name: 'Alex Rivera', email: 'alex.rivera@stripe.com', company: 'Stripe Inc' },
    { id: 'sarah', name: 'Sarah Chen', email: 'sarah.chen@netflix.com', company: 'Netflix' }
  ];

  const currentRecipient = sandboxRecipients.find(r => r.id === sandboxRecipient) || sandboxRecipients[0];

  // Pre-configured CSS themes to inject in the HTML live render (all adjusted to light/premium backgrounds)
  const themes = {
    'slate-minimal': {
      bg: 'background-color: #f8fafc;',
      card: 'background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);',
      text: 'color: #0f172a;',
      subtext: 'color: #475569;',
      accent: 'color: #4f46e5; font-weight: 600;',
      footer: 'border-top: 1px solid #f1f5f9; color: #64748b;'
    },
    'modern-indigo': {
      bg: 'background-color: #f5f3ff;',
      card: 'background-color: #ffffff; border-top: 4px solid #6366f1; border-left: 1px solid #e9d5ff; border-right: 1px solid #e9d5ff; border-bottom: 1px solid #e9d5ff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.05);',
      text: 'color: #1e1b4b;',
      subtext: 'color: #4f46e5;',
      accent: 'color: #6366f1; font-weight: 600;',
      footer: 'border-top: 1px solid #f3e8ff; color: #8b5cf6;'
    },
    'warm-amber': {
      bg: 'background-color: #fffbeb;',
      card: 'background-color: #ffffff; border-top: 4px solid #d97706; border-left: 1px solid #fef3c7; border-right: 1px solid #fef3c7; border-bottom: 1px solid #fef3c7; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(217, 119, 6, 0.05);',
      text: 'color: #451a03;',
      subtext: 'color: #b45309;',
      accent: 'color: #d97706; font-weight: 600;',
      footer: 'border-top: 1px solid #fef3c7; color: #b45309;'
    },
    'dark-nebula': {
      bg: 'background-color: #0f172a;',
      card: 'background-color: #1e293b; border: 1px solid #334155; border-top: 4px solid #8b5cf6; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);',
      text: 'color: #f8fafc;',
      subtext: 'color: #a78bfa;',
      accent: 'color: #c084fc; font-weight: 600;',
      footer: 'border-top: 1px solid #334155; color: #94a3b8;'
    }
  };

  const currentTheme = themes[emailTheme] || themes['slate-minimal'];

  // Helper to compile template tags with mock preview placeholders
  const getCompiledHTML = (recipient = sandboxRecipients[0]) => {
    let raw = bodyText || 'Draft your HTML/Plaintext message here...';
    
    // Replace markdown double newlines with paragraphs for HTML preview format
    raw = raw.replace(/\n\n/g, '</p><p style="margin-top: 12px; margin-bottom: 12px;">');
    raw = raw.replace(/\n/g, '<br/>');

    // Highlight placeholders in preview so the user knows they are dynamic as beautiful pills
    const highlight = (val) => 
      `<span style="background: linear-gradient(135deg, #e0e7ff, #e8e8ff); border: 1px solid #c7d2fe; padding: 2px 6px; border-radius: 6px; color: #4f46e5; font-weight: 600; font-family: inherit; font-size: 0.9em; display: inline-flex; align-items: center; box-shadow: 0 1px 2px rgba(79, 70, 229, 0.05);" title="Dynamic Field">${val}</span>`;

    const compiledBody = raw
      .replace(/{{name}}/g, highlight(recipient.name))
      .replace(/{{email}}/g, highlight(recipient.email))
      .replace(/{{company}}/g, highlight(recipient.company));

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; min-height: 320px; transition: all 0.3s; ${currentTheme.bg}">
        <div style="max-width: 600px; margin: 0 auto; padding: 32px; font-size: 15px; line-height: 1.6; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.03); ${currentTheme.card}">
          <!-- Header Logo Simulation -->
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 15px;">A</div>
            <div>
              <div style="font-size: 14px; font-weight: bold; ${currentTheme.text}">AeroSend System</div>
              <div style="font-size: 10px; color: #94a3b8; font-weight: 500;">Transactional Notification</div>
            </div>
          </div>

          <div style="${currentTheme.text}">
            <p style="margin: 0 0 12px 0;">${compiledBody}</p>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; font-size: 11px; text-align: center; line-height: 1.7; ${currentTheme.footer}">
            You are receiving this email because you are registered under ${recipient.name} (${recipient.email}).<br/>
            AeroSend Inc, 100 Pine St, San Francisco, CA. <br/>
            <a href="#" style="color: #6366f1; text-decoration: none; font-weight: 500;">Manage Preferences</a> &bull; <a href="#" style="color: #6366f1; text-decoration: none; font-weight: 500;">Unsubscribe</a>
          </div>
        </div>
      </div>
    `;
  };

  const handleInsertPlaceholder = (tag) => {
    const textarea = document.getElementById('template-body-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const nextBody = before + tag + after;
    setBodyText(nextBody);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 10);
  };

  const handleSave = () => {
    setCampaignWorkspace(prev => ({
      ...prev,
      subject: subjectText,
      body: bodyText
    }));
    navigate('/preview');
  };

  return (
    <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Email Template Builder</h1>
            <p className="text-sm text-slate-500">Design styled HTML layouts and test placeholders rendering.</p>
          </div>

          {/* Theme selector */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-1.5 rounded-lg shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-bold px-2">Preview Theme:</span>
            <div className="flex gap-1">
              {[
                { id: 'slate-minimal', label: 'Minimal Slate' },
                { id: 'modern-indigo', label: 'Indigo Tint' },
                { id: 'warm-amber', label: 'Amber Tint' },
                { id: 'dark-nebula', label: 'Dark Nebula' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setEmailTheme(t.id)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all duration-300 ${
                    emailTheme === t.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-655 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left editor */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FileCode size={14} className="text-indigo-650" /> HTML Editor Pane
            </h3>

            {/* Subject preview input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject Line</label>
              <input
                type="text"
                value={subjectText}
                onChange={(e) => setSubjectText(e.target.value)}
                className="w-full bg-white border border-slate-205 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
              />
            </div>

            {/* Textarea container */}
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center bg-slate-50 border-t border-x border-slate-205 rounded-t-lg px-3 py-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Dynamic HTML Tags</span>
                <div className="flex gap-1.5">
                  {['{{name}}', '{{email}}', '{{company}}'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleInsertPlaceholder(tag)}
                      className="px-2 py-0.5 text-[9px] font-mono font-bold bg-white border border-slate-200 hover:border-slate-300 text-indigo-650 hover:text-indigo-700 rounded transition-colors shadow-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="template-body-textarea"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={12}
                className="w-full bg-white border-b border-x border-slate-205 rounded-b-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-650 editor-font"
              />
            </div>

            <button
              onClick={handleSave}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-550 hover:to-violet-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-sm"
            >
              Compile & Save Draft <ArrowRight size={14} />
            </button>
          </div>

          {/* Right Live Render */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-semibold text-slate-555 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-650" /> Interactive Personalization Viewer
              </h3>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Sandbox active: {currentRecipient.name}
              </div>
            </div>

            {/* macOS Window simulator */}
            <div className="bg-slate-100/50 border border-slate-200 rounded-xl overflow-hidden shadow-inner flex flex-col transition-all duration-300">
              {/* macOS Topbar controls */}
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
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

                {/* Sandbox selectors */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Sandbox:</span>
                  <select
                    value={sandboxRecipient}
                    onChange={(e) => setSandboxRecipient(e.target.value)}
                    className="bg-white border border-slate-200 text-[10px] font-semibold text-indigo-705 rounded-md py-0.5 px-2 focus:ring-0 focus:outline-none w-auto shadow-sm"
                  >
                    {sandboxRecipients.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email Client Headers */}
              <div className="bg-white px-4 py-3 border-b border-slate-200/60 text-xs text-slate-600 space-y-1.5 leading-relaxed font-sans shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-650 flex items-center justify-center text-white font-bold text-xs shadow-sm select-none">
                      {subjectText.trim() ? subjectText.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-800 text-[11px]">AeroSend System</span>
                      </div>
                      <div className="text-[9px] text-slate-400">
                        To: <span className="text-slate-655 font-medium">{currentRecipient.name} &lt;{currentRecipient.email}&gt;</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Draft</span>
                </div>
                
                <div className="pt-0.5 flex items-center gap-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Subject:</span>
                  <span className="text-slate-800 font-bold text-[11px] bg-slate-50 px-2 py-0.2 rounded border border-slate-200">
                    {subjectText.trim() 
                      ? subjectText
                          .replace(/{{name}}/g, currentRecipient.name)
                          .replace(/{{email}}/g, currentRecipient.email)
                          .replace(/{{company}}/g, currentRecipient.company)
                      : '(No Subject)'}
                  </span>
                </div>
              </div>

              {/* Content previewer frame */}
              <div className="flex-1 overflow-hidden bg-slate-100/30 p-3 flex justify-center items-start">
                <div
                  className={`bg-white rounded-xl overflow-y-auto custom-scrollbar shadow-sm border border-slate-200/50 transition-all duration-300 ${
                    deviceView === 'mobile'
                      ? 'w-[375px] h-[350px]'
                      : deviceView === 'tablet'
                      ? 'w-[600px] h-[400px]'
                      : 'w-full min-h-[300px] max-h-[500px]'
                  }`}
                >
                  <div dangerouslySetInnerHTML={{ __html: getCompiledHTML(currentRecipient) }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};
export default TemplateBuilder;
