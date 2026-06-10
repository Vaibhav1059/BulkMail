import React, { useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../context/AppContext';
import {
  FileCode,
  Eye,
  CheckCircle,
  Save,
  Plus,
  Trash2,
  Edit3,
  Undo,
  Calendar,
  Layers,
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
                <div className="bg-slate-100 px-3 py-2.5 border-b border-slate-200 flex flex-wrap gap-2 items-center justify-between">
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
                <div className="flex-1 overflow-auto bg-slate-100/30 p-3 sm:p-4 flex justify-center items-start">
                  <div
                    className={`bg-white rounded-xl overflow-y-auto custom-scrollbar shadow-sm border border-slate-200/50 transition-all duration-300 ${
                      deviceView === 'mobile'
                        ? 'w-full max-w-[375px] h-[420px]'
                        : deviceView === 'tablet'
                        ? 'w-full max-w-[600px] h-[470px]'
                        : 'w-full min-h-[300px] max-h-[520px]'
                    }`}
                  >
                    <div dangerouslySetInnerHTML={{ __html: getCompiledHTML(body, currentRecipient) }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PREVIEW MODAL — Portal renders at document.body, always viewport-fixed regardless of page scroll */}
        {previewTemplate && createPortal(
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
            onClick={(e) => { if (e.target === e.currentTarget) { setPreviewTemplate(null); setModalTab('visual'); } }}
          >
            <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: 'calc(100vh - 24px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}>

              {/* Header */}
              <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                    <FileCode size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewTemplate.name}</span>
                  </div>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Subject: <span style={{ color: '#6366f1', fontFamily: 'monospace' }}>{previewTemplate.subject}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '2px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {[['visual', '👁 Visual'], ['code', '<> Source']].map(([tab, label]) => (
                      <button key={tab} type="button" onClick={() => setModalTab(tab)}
                        style={{ padding: '5px 12px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'all .2s',
                          background: modalTab === tab ? '#fff' : 'transparent',
                          color: modalTab === tab ? '#4f46e5' : '#64748b',
                          boxShadow: modalTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => { setPreviewTemplate(null); setModalTab('visual'); }}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                {modalTab === 'visual' ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* Controls bar */}
                    <div style={{ flexShrink: 0, background: '#f8fafc', borderBottom: '1px solid #f1f5f9', padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', border: '1px solid #e0443e', display: 'inline-block' }} />
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', border: '1px solid #dfa123', display: 'inline-block' }} />
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', border: '1px solid #1aab29', display: 'inline-block' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '2px', background: 'rgba(148,163,184,0.2)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(203,213,225,0.3)' }}>
                          {[{id:'desktop',label:'Desktop',icon:'🖥️'},{id:'tablet',label:'Tablet',icon:'📟'},{id:'mobile',label:'Mobile',icon:'📱'}].map(d => (
                            <button key={d.id} type="button" onClick={() => setDeviceView(d.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '10px', fontWeight: 700, border: deviceView===d.id ? '1px solid #e2e8f0' : 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all .2s',
                                background: deviceView===d.id ? '#fff' : 'transparent',
                                color: deviceView===d.id ? '#1e293b' : '#64748b',
                                boxShadow: deviceView===d.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                              <span>{d.icon}</span><span>{d.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Sandbox:</span>
                        <select value={sandboxRecipient} onChange={(e) => setSandboxRecipient(e.target.value)}
                          style={{ background: '#fff', border: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 600, color: '#4f46e5', borderRadius: '6px', padding: '3px 8px', outline: 'none' }}>
                          {sandboxRecipients.map(r => <option key={r.id} value={r.id}>{r.name} ({r.company})</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Email header */}
                    <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '10px 20px', fontSize: '12px', color: '#475569' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span><span style={{ color: '#94a3b8', marginRight: '6px' }}>To:</span><span style={{ fontWeight: 500, color: '#334155' }}>{currentRecipient.name} &lt;{currentRecipient.email}&gt;</span></span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>Today</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#94a3b8' }}>Subject:</span>
                        <span style={{ fontWeight: 700, color: '#1e293b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '5px', fontSize: '11px' }}>
                          {previewTemplate.subject.replace(/{{name}}/g, currentRecipient.name).replace(/{{email}}/g, currentRecipient.email).replace(/{{company}}/g, currentRecipient.company)}
                        </span>
                      </div>
                    </div>

                    {/* Scrollable preview frame */}
                    <div style={{ flex: 1, overflow: 'auto', background: 'rgba(241,245,249,0.5)', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid rgba(226,232,240,0.6)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'auto', transition: 'all .3s',
                        width: deviceView === 'mobile' ? 'min(390px, 100%)' : deviceView === 'tablet' ? 'min(640px, 100%)' : '100%',
                        minHeight: '280px' }}>
                        <div dangerouslySetInnerHTML={{ __html: getCompiledHTML(previewTemplate.body, currentRecipient) }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, background: '#0f172a', color: '#e2e8f0', padding: '20px', fontFamily: 'monospace', fontSize: '11px', overflow: 'auto', position: 'relative', minHeight: 0 }}>
                    <button type="button"
                      onClick={() => { navigator.clipboard.writeText(getCompiledHTML(previewTemplate.body, currentRecipient)); setCopiedSource(true); setTimeout(() => setCopiedSource(false), 2000); }}
                      style={{ position: 'sticky', top: 0, float: 'right', marginLeft: '12px', marginBottom: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '5px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', zIndex: 10 }}>
                      {copiedSource ? '✓ Copied!' : 'Copy Code'}
                    </button>
                    <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{getCompiledHTML(previewTemplate.body, currentRecipient)}</pre>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ flexShrink: 0, borderTop: '1px solid #f1f5f9', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setPreviewTemplate(null); setModalTab('visual'); }}
                  className="btn-secondary" style={{ padding: '7px 20px', fontSize: '12px', fontWeight: 600 }}>Close Preview</button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
  );
};

export default TemplateManager;
