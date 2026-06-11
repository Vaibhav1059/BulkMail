import { useState, useContext } from 'react';
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
  X,
  Laptop,
  Tablet as TabletIcon,
  Smartphone
} from 'lucide-react';

export const TemplateManager = () => {
  const {
    templates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    logEvent
  } = useContext(AppContext);

  // Tabs state
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'builder'

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

  // Preview state configurations
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
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(raw);

    const highlight = (val) => 
      `<span style="background: linear-gradient(135deg, #e0e7ff, #e8e8ff); border: 1px solid #c7d2fe; padding: 2px 6px; border-radius: 6px; color: #4f46e5; font-weight: 600; font-family: inherit; font-size: 0.9em; display: inline-flex; align-items: center; box-shadow: 0 1px 2px rgba(79, 70, 229, 0.05);" title="Dynamic Field">${val}</span>`;

    let compiledBody = raw
      .replace(/{{name}}/g, highlight(recipient.name))
      .replace(/{{email}}/g, highlight(recipient.email))
      .replace(/{{company}}/g, highlight(recipient.company));

    if (isHtml) {
      return compiledBody;
    }

    // Replace Markdown newlines
    compiledBody = compiledBody
      .replace(/\n\n/g, '</p><p style="margin-top: 12px; margin-bottom: 12px;">')
      .replace(/\n/g, '<br/>');
      
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; min-height: 250px; transition: all 0.3s; ${currentTheme.bg}">
        <div style="max-width: 550px; margin: 0 auto; padding: 24px; font-size: 14px; line-height: 1.6; box-shadow: 0 4px 6px rgba(0,0,0,0.02); ${currentTheme.card}">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
            <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px;">A</div>
            <div>
              <div style="font-size: 13px; font-weight: bold; ${currentTheme.text}">AeroSend System</div>
              <div style="font-size: 9px; color: #94a3b8; font-weight: 500;">Template Canvas</div>
            </div>
          </div>

          <div style="${currentTheme.text}">
            ${compiledBody}
          </div>  

          <div style="margin-top: 30px; padding-top: 15px; font-size: 11px; text-align: center; border-top: 1px solid #f1f5f9; color: #64748b;">
            You are receiving this email because you are registered under ${recipient.name} (${recipient.email}).<br/>
            AeroSend Inc, 100 Pine St, San Francisco, CA. <br/>
            <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const templateData = { name, subject, body };

    if (editingId) {
      await updateTemplate(editingId, templateData);
      logEvent(`Updated email template: "${name}"`);
    } else {
      await saveTemplate(templateData);
      logEvent(`Created new email template: "${name}"`);
    }

    resetForm();
    setShowSaveSuccess(true);
    setActiveTab('library');
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const startEdit = (tpl) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setActiveTab('builder');
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

  const filteredTemplates = templates.filter(tpl =>
    tpl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tpl.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Email Templates Hub</h1>
        <p className="text-sm text-slate-500">Design reusable, personalizable layouts with simulated device frame previews.</p>
      </div>

      {/* Success Alert */}
      {showSaveSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-500" /> Template has been successfully updated.
        </div>
      )}

      {/* Tab Switcher Headers */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => {
            setActiveTab('library');
            resetForm();
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'library'
              ? 'border-indigo-650 text-indigo-650'
              : 'border-transparent text-slate-550 hover:text-slate-800'
          }`}
        >
          Saved Templates Library
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'builder'
              ? 'border-indigo-650 text-indigo-650'
              : 'border-transparent text-slate-550 hover:text-slate-800'
          }`}
        >
          {editingId ? 'Modify Active Template' : 'HTML Editor Canvas'}
        </button>
      </div>

      {/* TAB CONTENT: SAVED TEMPLATES LIBRARY */}
      {activeTab === 'library' && (
        <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 w-full">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-600" /> Active Templates Repository ({templates.length})
            </h3>
            <button
              onClick={() => {
                resetForm();
                setActiveTab('builder');
              }}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 justify-center"
            >
              <Plus size={14} /> New Template
            </button>
          </div>

          <input
            type="text"
            placeholder="Search templates by key name or subject line..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-650"
          />

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs space-y-2">
              <FileCode size={28} className="mx-auto text-slate-300" />
              <p>No email templates loaded. Add a template or compose in the editor canvas tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[640px] overflow-y-auto pr-1">
              {filteredTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all duration-300 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-slate-800 text-[13px]">{tpl.name}</span>
                      <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1 flex-shrink-0">
                        <Calendar size={10} />
                        {tpl.date ? new Date(tpl.date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <p className="text-slate-655 font-medium mt-1 truncate">
                      <span className="font-semibold text-slate-400 mr-1">Subject:</span>
                      {tpl.subject}
                    </p>
                    <p className="text-slate-450 mt-2 line-clamp-3 leading-relaxed">
                      {tpl.body}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(tpl)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-white text-indigo-600 hover:text-indigo-705 hover:bg-indigo-50/20 border border-slate-200 hover:border-indigo-200 transition-colors shadow-sm"
                    >
                      <Eye size={11} /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(tpl)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-white text-slate-655 hover:text-slate-800 border border-slate-200 hover:border-slate-350 shadow-sm"
                    >
                      <Edit3 size={11} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tpl.id, tpl.name)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-white text-rose-600 hover:text-rose-705 hover:bg-rose-50/50 border border-slate-200 hover:border-rose-200 transition-colors shadow-sm"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: HTML BUILDER CANVAS */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Editor Form Panel */}
          <form onSubmit={handleSubmit} className="xl:col-span-6 bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FileCode size={14} className="text-indigo-650" />
              {editingId ? `Modify Template Configuration: ${name}` : 'Design Reusable Email Template'}
            </h3>

            <div className="space-y-3">
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

            {/* Body Editor Textarea */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center bg-slate-50 border-t border-x border-slate-205 rounded-t-lg px-3 py-1.5">
                <span className="text-[10px] text-slate-550 font-bold uppercase">Insert Personalization Tags</span>
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
                rows={11}
                placeholder="Draft HTML layouts or plaintext template body. Use tag variables dynamically."
                className="w-full bg-white border-b border-x border-slate-205 rounded-b-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-650 editor-font"
                required
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-1">
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
                className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 justify-center"
              >
                <Save size={13} /> {editingId ? 'Save Changes' : 'Save Template'}
              </button>
            </div>
          </form>

          {/* Editor Interactive Preview Panel */}
          <div className="xl:col-span-6 bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
            <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-2 w-full">
              <h3 className="text-xs font-semibold text-slate-555 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-655" /> Personalization Previewer
              </h3>
              
              {/* Preview Theme */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase font-bold text-slate-400">Theme:</span>
                <select
                  value={emailTheme}
                  onChange={(e) => setEmailTheme(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700 rounded py-0.5 px-2 outline-none w-auto shadow-sm"
                >
                  <option value="slate-minimal">Slate Minimal</option>
                  <option value="modern-indigo">Indigo Tint</option>
                  <option value="warm-amber">Amber Tint</option>
                  <option value="dark-nebula">Dark Nebula</option>
                </select>
              </div>
            </div>

            {/* macOS Window Simulator */}
            <div className="bg-slate-100/50 border border-slate-200 rounded-xl overflow-hidden shadow-inner flex flex-col transition-all duration-300">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-[#dfa123]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                </div>

                {/* Device selects */}
                <div className="flex items-center gap-0.5 bg-slate-200/60 p-0.5 rounded border border-slate-300/30">
                  {[
                    { id: 'desktop', icon: Laptop },
                    { id: 'tablet', icon: TabletIcon },
                    { id: 'mobile', icon: Smartphone }
                  ].map(device => {
                    const DevIcon = device.icon;
                    return (
                      <button
                        key={device.id}
                        onClick={() => setDeviceView(device.id)}
                        className={`p-1 rounded transition-colors ${
                          deviceView === device.id
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <DevIcon size={11} />
                      </button>
                    );
                  })}
                </div>

                {/* Sandbox selector */}
                <div className="flex items-center gap-1 select-none flex-shrink-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Sandbox:</span>
                  <select
                    value={sandboxRecipient}
                    onChange={(e) => setSandboxRecipient(e.target.value)}
                    className="bg-white border border-slate-200 text-[9px] font-semibold text-indigo-705 rounded py-0.5 px-2 focus:ring-0 focus:outline-none w-auto shadow-sm"
                  >
                    {sandboxRecipients.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email Headers info */}
              <div className="bg-white px-4 py-3 border-b border-slate-200/60 text-[10px] text-slate-550 space-y-1 leading-normal font-sans shadow-sm">
                <div>
                  To: <span className="text-slate-800 font-semibold">{currentRecipient.name} &lt;{currentRecipient.email}&gt;</span>
                </div>
                <div>
                  Subject: <span className="text-slate-800 font-semibold bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                    {subject.trim() 
                      ? subject
                          .replace(/{{name}}/g, currentRecipient.name)
                          .replace(/{{email}}/g, currentRecipient.email)
                          .replace(/{{company}}/g, currentRecipient.company)
                      : '(No Subject)'}
                  </span>
                </div>
              </div>

              {/* Render preview in device container */}
              <div className="flex-1 overflow-hidden bg-slate-100/30 p-3 flex justify-center items-start">
                <div
                  className={`bg-white rounded-lg overflow-y-auto custom-scrollbar shadow-sm border border-slate-200/50 transition-all duration-300 ${
                    deviceView === 'mobile'
                      ? 'w-[260px] h-[320px]'
                      : deviceView === 'tablet'
                      ? 'w-[360px] h-[360px]'
                      : 'w-full min-h-[260px] max-h-[400px]'
                  }`}
                >
                  <div dangerouslySetInnerHTML={{ __html: getCompiledHTML(body, currentRecipient) }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL PREVIEW MODAL */}
      {previewTemplate && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setPreviewTemplate(null); setModalTab('visual'); } }}
        >
          <div
            style={{ width: '92%', maxWidth: '640px', maxHeight: '85vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}
            className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xl relative"
          >
            
            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white flex-shrink-0">
              <div className="flex items-center justify-between w-full sm:w-auto min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-indigo-50 text-indigo-650 rounded-lg flex-shrink-0">
                    <FileCode size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate leading-snug">
                      {previewTemplate.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                      Subject: {previewTemplate.subject}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setPreviewTemplate(null); setModalTab('visual'); }}
                  className="sm:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                {/* Visual vs Source Code toggle */}
                <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-semibold w-full sm:w-auto justify-center">
                  <button
                    onClick={() => setModalTab('visual')}
                    className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-md transition-all ${
                      modalTab === 'visual'
                        ? 'bg-white text-indigo-650 shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Visual Preview
                  </button>
                  <button
                    onClick={() => setModalTab('code')}
                    className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-md transition-all ${
                      modalTab === 'code'
                        ? 'bg-white text-indigo-650 shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    HTML Source
                  </button>
                </div>
                <button
                  onClick={() => { setPreviewTemplate(null); setModalTab('visual'); }}
                  className="hidden sm:block text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-50">
              {modalTab === 'visual' ? (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  {/* Top sub-header selection bar */}
                  <div className="px-4 py-2 sm:px-5 border-b border-slate-100 bg-white flex flex-col gap-2.5 sm:flex-row sm:justify-between sm:items-center text-[10px] text-slate-500 flex-shrink-0">
                    <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-between sm:justify-start">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                        <span className="font-medium">Simulation:</span>
                      </div>
                      <select
                        value={sandboxRecipient}
                        onChange={(e) => setSandboxRecipient(e.target.value)}
                        className="bg-slate-50 border border-slate-200 font-semibold text-slate-700 hover:border-slate-350 rounded px-2 py-0.5 outline-none transition-colors cursor-pointer text-[10px] max-w-full truncate"
                      >
                        {sandboxRecipients.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.company})</option>
                        ))}
                      </select>
                    </div>

                    {/* Device selector */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 p-0.5 rounded-lg border border-slate-200/85 w-full sm:w-auto">
                      <span className="text-slate-450 font-medium pl-2 sm:hidden">Device:</span>
                      <div className="flex items-center gap-0.5">
                        {[
                          { id: 'desktop', icon: Laptop, label: 'Desktop' },
                          { id: 'tablet', icon: TabletIcon, label: 'Tablet' },
                          { id: 'mobile', icon: Smartphone, label: 'Mobile' }
                        ].map(device => {
                          const DevIcon = device.icon;
                          return (
                            <button
                              key={device.id}
                              onClick={() => setDeviceView(device.id)}
                              title={device.label}
                              className={`p-1.5 rounded-md transition-all ${
                                deviceView === device.id
                                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                                  : 'text-slate-450 hover:text-slate-700'
                              }`}
                            >
                              <DevIcon size={12} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Render content */}
                  <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start">
                    <div
                      className={`flex flex-col shadow-2xl rounded-xl border border-slate-200/80 bg-white transition-all duration-300 max-w-full ${
                        deviceView === 'mobile'
                          ? 'w-[320px]'
                          : deviceView === 'tablet'
                          ? 'w-[500px]'
                          : 'w-full max-w-[600px]'
                      }`}
                    >
                      {/* Browser mockup bar */}
                      <div className="bg-slate-900 text-slate-400 px-4 py-2 flex items-center justify-between text-[10px] border-b border-slate-800 rounded-t-xl">
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="w-2 h-2 rounded-full bg-rose-500/90" />
                          <span className="w-2 h-2 rounded-full bg-amber-500/90" />
                          <span className="w-2 h-2 rounded-full bg-emerald-500/90" />
                        </div>
                        <div className="bg-slate-950/80 px-4 py-0.5 rounded-md text-[9px] text-slate-500 font-mono tracking-wide w-3/5 text-center truncate border border-slate-800/50">
                          aerosend-preview.local
                        </div>
                        <div className="w-10" />
                      </div>

                      {/* Device Render Body */}
                      <div
                        className="overflow-y-auto custom-scrollbar bg-slate-50 rounded-b-xl"
                        style={{ height: deviceView === 'mobile' ? '360px' : deviceView === 'tablet' ? '400px' : '440px' }}
                      >
                        <div dangerouslySetInnerHTML={{ __html: getCompiledHTML(previewTemplate.body, currentRecipient) }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-slate-900 text-slate-300 p-5 font-mono text-[11px] overflow-auto relative min-h-0 flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-3 flex-shrink-0">
                    <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold">Email HTML Code</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getCompiledHTML(previewTemplate.body, currentRecipient));
                        setCopiedSource(true);
                        setTimeout(() => setCopiedSource(false), 2000);
                      }}
                      className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold py-1 px-3 rounded text-[10px] cursor-pointer transition-colors"
                    >
                      {copiedSource ? '✓ Copied!' : 'Copy Source Code'}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed flex-1 overflow-auto custom-scrollbar">{getCompiledHTML(previewTemplate.body, currentRecipient)}</pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2.5 flex-shrink-0 bg-white rounded-b-xl">
              <button
                onClick={() => { setPreviewTemplate(null); setModalTab('visual'); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 font-bold rounded-lg transition-all text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TemplateManager;
