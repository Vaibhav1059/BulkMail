import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Protected } from '../components/Protected';
import {
  FileCode,
  Sparkles,
  Eye,
  CheckCircle,
  Save,
  Plus,
  Trash2,
  Edit3,
  Undo,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  X
} from 'lucide-react';

export const TemplateManager = () => {
  const {
    templates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    logEvent
  } = useContext(AppContext);

  // Form local states
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  // Selection / Mode states
  const [editingId, setEditingId] = useState(null); 
  const [emailTheme, setEmailTheme] = useState('slate-minimal'); // Preview theme
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // New preview state configurations
  const [deviceView, setDeviceView] = useState('desktop');
  const [sandboxRecipient, setSandboxRecipient] = useState('jane');
  const [modalTab, setModalTab] = useState('visual');
  const [copiedSource, setCopiedSource] = useState(false);

  const sandboxRecipients = [
    { id: 'jane', name: 'Jane Doe', email: 'jane@google.com', company: 'Google LLC' },
    { id: 'alex', name: 'Alex Rivera', email: 'alex.rivera@stripe.com', company: 'Stripe Inc' },
    { id: 'sarah', name: 'Sarah Chen', email: 'sarah.chen@netflix.com', company: 'Netflix' }
  ];

  const currentRecipient = sandboxRecipients.find(r => r.id === sandboxRecipient) || sandboxRecipients[0];

  // Pre-configured CSS themes for live preview rendering
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

  // Helper to compile template tags for visual personalization preview
  const getCompiledHTML = (bodyText, recipient = sandboxRecipients[0]) => {
    let raw = bodyText || 'Draft your HTML/Plaintext message here...';
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(raw);//preview ke liye ye check kar raha hai ki body mein HTML tags hain ya nahi

    // Replace Markdown double newlines with standard paragraphs
    raw = raw.replace(/\n\n/g, '</p><p style="margin-top: 12px; margin-bottom: 12px;">');
    raw = raw.replace(/\n/g, '<br/>');

    // Highlight placeholders in preview so the user knows they are dynamic as beautiful pills
    const highlight = (val) => 
      `<span style="background: linear-gradient(135deg, #e0e7ff, #e8e8ff); border: 1px solid #c7d2fe; padding: 2px 6px; border-radius: 6px; color: #4f46e5; font-weight: 600; font-family: inherit; font-size: 0.9em; display: inline-flex; align-items: center; box-shadow: 0 1px 2px rgba(79, 70, 229, 0.05);" title="Dynamic Field">${val}</span>`;

    const compiledBody = raw
      .replace(/{{name}}/g, highlight(recipient.name))
      .replace(/{{email}}/g, highlight(recipient.email))
      .replace(/{{company}}/g, highlight(recipient.company));

      if (isHtml) {
        return compiledBody;
      }
      
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; min-height: 300px; transition: all 0.3s; ${currentTheme.bg}">
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
            ${compiledBody}
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
    setBody(nextBody);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 10);
  };

  // Submit Handler (Supports both Save and Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const templateData = { name, subject, body };

    if (editingId) {
      // Edit mode
      await updateTemplate(editingId, templateData);
      logEvent(`Updated email template: "${name}"`);
    } else {
      // Create mode
      await saveTemplate(templateData);
      logEvent(`Created new email template: "${name}"`);
    }

    // Reset Form
    resetForm();
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const startEdit = (tpl) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setSubject(tpl.subject);
    setBody(tpl.body);
    // Smooth scroll to form on mobile devices
    const formElement = document.getElementById('template-form-pane');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDelete = async (id, nameVal) => {
    if (window.confirm(`Are you sure you want to delete template "${nameVal}"?`)) {
      await deleteTemplate(id);
      logEvent(`Deleted email template: "${nameVal}"`);
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSubject('');
    setBody('');
  };

  // Filter templates list based on search term
  const filteredTemplates = templates.filter(tpl =>
    tpl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tpl.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Protected allowedRoles={['Admin', 'Manager']}>
      <div className="space-y-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Global Email Templates</h1>
            <p className="text-sm text-slate-505">Create, edit, and delete reusable templates for SaaS campaigns.</p>
          </div>

          {/* Theme selector */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-1.5 rounded-lg shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-bold px-2">Preview Layout Theme:</span>
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

        {/* Success Alert */}
        {showSaveSuccess && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" /> Template configurations have been successfully saved.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left: Templates Listing (Width 5 cols on large screens) */}
          <div className="xl:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-650" /> Saved Templates ({templates.length})
                </h3>
                
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus size={12} /> Create Mode
                  </button>
                )}
              </div>

              {/* Search filter input */}
              <input
                type="text"
                placeholder="Search templates by name or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-650"
              />

              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs space-y-2">
                  <FileCode size={28} className="mx-auto text-slate-300" />
                  <p>No matching templates found.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredTemplates.map(tpl => {
                    const isSelected = editingId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        className={`p-4 rounded-xl border transition-all duration-300 text-xs relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/30 border-indigo-200 shadow-sm'
                            : 'bg-slate-50/40 hover:bg-slate-50 border-slate-200/85 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-semibold text-slate-800 text-[13px]">{tpl.name}</span>
                            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                              <Calendar size={10} />
                              {tpl.date ? new Date(tpl.date).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <p className="text-slate-500 font-medium mt-1 truncate">
                            <span className="font-semibold text-slate-400 mr-1.5">Subject:</span>
                            {tpl.subject}
                          </p>
                          <p className="text-slate-450 mt-1.5 line-clamp-2 leading-normal">
                            {tpl.body}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setPreviewTemplate(tpl)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-white text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/20 border border-slate-200 hover:border-indigo-200 transition-colors shadow-sm"
                          >
                            <Eye size={11} /> Preview
                          </button>

                          <button
                            type="button"
                            onClick={() => startEdit(tpl)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-655 hover:text-slate-800 border-slate-200 hover:border-slate-350 shadow-sm'
                            }`}
                          >
                            <Edit3 size={11} /> Edit
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDelete(tpl.id, tpl.name)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-white text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 border border-slate-200 hover:border-rose-200 transition-colors shadow-sm"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Form Editor & Previewer (Width 7 cols on large screens) */}
          <div id="template-form-pane" className="xl:col-span-7 space-y-6">
            {/* Editor container card */}
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <FileCode size={14} className="text-indigo-650" />
                {editingId ? `Modify Template Configuration: ${name}` : 'Design Reusable Email Template'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Template Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Template Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Premium Welcome Letter"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    required
                  />
                </div>

                {/* Subject Line */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject Line *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Welcome onboard {{name}}! 🚀"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    required
                  />
                </div>
              </div>

              {/* Body Content Editor */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center bg-slate-50 border-t border-x border-slate-205 rounded-t-lg px-3 py-1.5">
                  <span className="text-[10px] text-slate-550 font-bold uppercase">Insert Personalization variables</span>
                  <div className="flex gap-1.5">
                    {['{{name}}', '{{email}}', '{{company}}'].map(tag => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleInsertPlaceholder(tag)}
                        className="px-2.5 py-0.5 text-[9px] font-mono font-bold bg-white border border-slate-200 hover:border-slate-350 text-indigo-650 hover:text-indigo-700 rounded transition-colors shadow-sm"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                
                <textarea
                  id="template-body-textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder="Design HTML layout or plaintext contents. Add {{name}}, {{email}}, or {{company}} placeholders to inject personalized sender metadata."
                  className="w-full bg-white border-b border-x border-slate-205 rounded-b-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-650 editor-font"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Undo size={13} /> Cancel Edit
                  </button>
                )}
                
                <button
                  type="submit"
                  className="btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-550 hover:to-violet-600 shadow-sm border border-indigo-700/25"
                >
                  <Save size={13} /> {editingId ? 'Save Changes' : 'Save New Template'}
                </button>
              </div>
            </form>

            {/* Live Personalization Previewer */}
            <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-555 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={14} className="text-indigo-650" /> Real-time Personalized Preview
                </h3>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Sandbox active: {currentRecipient.name}
                </div>
              </div>

              {/* macOS Window simulator */}
              <div className="bg-slate-100/50 border border-slate-200 rounded-xl overflow-hidden shadow-inner flex flex-col transition-all duration-300">
                {/* macOS Topbar controls */}
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
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
                    <span className="text-[9px] uppercase font-bold text-slate-400">Sandbox Recipient:</span>
                    <select
                      value={sandboxRecipient}
                      onChange={(e) => setSandboxRecipient(e.target.value)}
                      className="bg-white border border-slate-200 text-[10px] font-semibold text-indigo-705 rounded-md py-0.5 px-2 focus:ring-0 focus:outline-none w-auto shadow-sm"
                    >
                      {sandboxRecipients.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.company})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Email Client Headers */}
                <div className="bg-white px-5 py-4 border-b border-slate-200/60 text-xs text-slate-600 space-y-2 leading-relaxed font-sans shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
                        {name.trim() ? name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">AeroSend System</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">vaibhavsoni1059@gmail.com</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          To: <span className="text-slate-655 font-medium">{currentRecipient.name} &lt;{currentRecipient.email}&gt;</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Just now
                    </div>
                  </div>
                  
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Subject:</span>
                    <span className="text-slate-800 font-bold text-[12px] bg-slate-55/40 px-2 py-0.5 rounded border border-slate-150">
                      {subject.trim() 
                        ? subject
                            .replace(/{{name}}/g, currentRecipient.name)
                            .replace(/{{email}}/g, currentRecipient.email)
                            .replace(/{{company}}/g, currentRecipient.company)
                        : '(No Subject)'}
                    </span>
                  </div>
                </div>

                {/* Content previewer frame */}
                <div className="flex-1 overflow-hidden bg-slate-100/30 p-4 flex justify-center items-start">
                  <div
                    className={`bg-white rounded-xl overflow-y-auto custom-scrollbar shadow-sm border border-slate-200/50 transition-all duration-300 ${
                      deviceView === 'mobile'
                        ? 'w-[375px] h-[450px]'
                        : deviceView === 'tablet'
                        ? 'w-[600px] h-[500px]'
                        : 'w-full min-h-[320px] max-h-[550px]'
                    }`}
                  >
                    <div dangerouslySetInnerHTML={{ __html: getCompiledHTML(body, currentRecipient) }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PREVIEW MODAL */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full p-6 shadow-xl relative flex flex-col max-h-[90vh] animate-fadeIn">
              <div className="flex flex-col sm:flex-row border-b border-slate-150 pb-3.5 mb-4 justify-between sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-855 uppercase tracking-wider flex items-center gap-2">
                    <FileCode size={16} className="text-indigo-655" />
                    Template Preview: {previewTemplate.name}
                  </h3>
                  <p className="text-[10px] text-slate-455 font-medium mt-0.5 font-sans">
                    Subject template: <span className="text-indigo-650 font-mono font-semibold">{previewTemplate.subject}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Tabs */}
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setModalTab('visual')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        modalTab === 'visual'
                          ? 'bg-white text-indigo-700 shadow-sm shadow-indigo-100'
                          : 'text-slate-500 hover:text-slate-705'
                      }`}
                    >
                      Visual Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTab('code')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        modalTab === 'code'
                          ? 'bg-white text-indigo-705 shadow-sm shadow-indigo-100'
                          : 'text-slate-500 hover:text-slate-705'
                      }`}
                    >
                      HTML Source Code
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewTemplate(null);
                      setModalTab('visual');
                    }}
                    className="text-slate-450 hover:text-slate-700 transition-colors bg-slate-100 hover:bg-slate-200/60 p-1.5 rounded-full"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Preview Wrapper */}
              <div className="flex-1 min-h-[400px] overflow-hidden flex flex-col">
                {modalTab === 'visual' ? (
                  /* macOS style window mockup in modal */
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col flex-1 shadow-inner">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
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
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <span>{device.icon}</span>
                            <span>{device.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Sandbox recipient */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Sandbox Recipient:</span>
                        <select
                          value={sandboxRecipient}
                          onChange={(e) => setSandboxRecipient(e.target.value)}
                          className="bg-white border border-slate-200 text-[10px] font-semibold text-indigo-705 rounded-md py-0.5 px-2 focus:ring-0 focus:outline-none w-auto shadow-sm"
                        >
                          {sandboxRecipients.map(r => (
                            <option key={r.id} value={r.id}>{r.name} ({r.company})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-white px-5 py-3 border-b border-slate-200/65 text-xs text-slate-605 space-y-1.5 leading-relaxed font-sans shadow-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-slate-400 mr-2">To Recipient:</span>
                          <span className="text-slate-700 font-mono font-medium">{currentRecipient.name} &lt;{currentRecipient.email}&gt;</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Today</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 mr-2">Subject line:</span>
                        <span className="text-slate-800 font-bold bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-[11px]">
                          {previewTemplate.subject
                            .replace(/{{name}}/g, currentRecipient.name)
                            .replace(/{{email}}/g, currentRecipient.email)
                            .replace(/{{company}}/g, currentRecipient.company)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden bg-slate-100/30 p-4 flex justify-center items-start">
                      <div
                        className={`bg-white rounded-xl overflow-y-auto custom-scrollbar shadow-sm border border-slate-200/50 transition-all duration-300 ${
                          deviceView === 'mobile'
                            ? 'w-[375px] h-[360px]'
                            : deviceView === 'tablet'
                            ? 'w-[600px] h-[400px]'
                            : 'w-full h-[450px]'
                        }`}
                      >
                        <div dangerouslySetInnerHTML={{ __html: getCompiledHTML(previewTemplate.body, currentRecipient) }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* HTML code tab */
                  <div className="flex-1 bg-slate-950 text-slate-200 p-5 rounded-xl font-mono text-[11px] overflow-auto custom-scrollbar select-all relative min-h-[400px] border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getCompiledHTML(previewTemplate.body, currentRecipient));
                        setCopiedSource(true);
                        setTimeout(() => setCopiedSource(false), 2000);
                      }}
                      className="absolute top-3.5 right-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 px-3 py-1.5 rounded text-[10px] font-bold tracking-wide transition-all uppercase flex items-center gap-1.5 z-10"
                    >
                      {copiedSource ? 'Copied!' : 'Copy Code'}
                    </button>
                    <pre className="whitespace-pre-wrap leading-relaxed select-text pr-20">
                      {getCompiledHTML(previewTemplate.body, currentRecipient)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTemplate(null);
                    setModalTab('visual');
                  }}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
};

export default TemplateManager;
