import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { API_BASE, authFetch } from '../utils/api';
import { parseCSV, generateValidationReport } from '../utils/csvParser';
import * as XLSX from 'xlsx';
import {
  Sparkles,
  Send,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  RefreshCw,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Users,
  Check,
  Layers,
  Info,
  Copy,
  Laptop,
  Tablet as TabletIcon,
  Smartphone
} from 'lucide-react';
import { FollowupSequenceBuilder } from '../components/FollowupSequenceBuilder';

export const CreateCampaign = () => {
  const { templates, settings, launchCampaign, saveCampaign, sendTestEmail } = useContext(AppContext);
  const navigate = useNavigate();

  // ─── Draft persistence key ────────────────────────────────────────
  const DRAFT_KEY = 'aerosend_wizard_draft';

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);
  // ─────────────────────────────────────────────────────────────────

  const savedDraft = loadDraft();

  // Wizard state — restored from draft if available
  const [currentStep, setCurrentStep] = useState(savedDraft?.currentStep || 1);
  const [hasDraft, setHasDraft] = useState(!!savedDraft);

  // Step 1 states
  const [campaignDetails, setCampaignDetails] = useState(
    savedDraft?.campaignDetails || {
      name: 'New Promotional Campaign',
      subject: 'Special offer for {{name}} at {{company}}!',
      smtpUsed: 'default',
      scheduleOption: 'immediate',
      scheduleDate: '',
    }
  );
  const [smtpConfigs, setSmtpConfigs] = useState([]);

  // Step 2 states
  const [recipientSource, setRecipientSource] = useState(savedDraft?.recipientSource || 'list');
  const [savedLists, setSavedLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(savedDraft?.selectedListId || '');

  const [csvFileDetails, setCsvFileDetails] = useState(
    savedDraft?.csvFileDetails || {
      fileName: '',
      headers: [],
      rawRows: [],
      mappedFields: { email: '', name: '', company: '' }
    }
  );
  const [dragActive, setDragActive] = useState(false);
  const [validationReport, setValidationReport] = useState(savedDraft?.validationReport || null);
  const [wizardRecipients, setWizardRecipients] = useState(savedDraft?.wizardRecipients || []);

  // Step 4 states
  const [bodyText, setBodyText] = useState(
    savedDraft?.bodyText || 'Hi {{name}},\n\nWe would love to offer {{company}} special pricing. Let us know if this works for you!\n\nBest,\nSales Team'
  );
  const [deviceView, setDeviceView] = useState('desktop');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSentStatus, setTestSentStatus] = useState(null);
  const [isTestMock, setIsTestMock] = useState(false);

  // Step 5 states
  const [rangeOption, setRangeOption] = useState(savedDraft?.rangeOption || 'all');
  const [rangeFrom, setRangeFrom] = useState(savedDraft?.rangeFrom || 1);
  const [rangeTo, setRangeTo] = useState(savedDraft?.rangeTo || 1);
  const [concurrency, setConcurrency] = useState(savedDraft?.concurrency || 1);
  const [delayOverride, setDelayOverride] = useState(savedDraft?.delayOverride || settings.limits.delaySeconds || 0.5);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Follow-up sequence state
  const [followupSequences, setFollowupSequences] = useState(savedDraft?.followupSequences || []);

  // ─── Auto-save draft to localStorage on any state change ─────────
  useEffect(() => {
    const draft = {
      currentStep,
      campaignDetails,
      recipientSource,
      selectedListId,
      csvFileDetails,
      validationReport,
      wizardRecipients,
      bodyText,
      rangeOption,
      rangeFrom,
      rangeTo,
      concurrency,
      delayOverride,
      followupSequences,
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage full or unavailable — silently skip
    }
  }, [
    currentStep, campaignDetails, recipientSource, selectedListId,
    csvFileDetails, validationReport, wizardRecipients, bodyText,
    rangeOption, rangeFrom, rangeTo, concurrency, delayOverride, followupSequences
  ]);
  // ─────────────────────────────────────────────────────────────────

  const handleClearDraft = () => {
    if (!window.confirm('Clear all progress and start a fresh campaign?')) return;
    clearDraft();
    setHasDraft(false);
    setCurrentStep(1);
    setCampaignDetails({ name: 'New Promotional Campaign', subject: 'Special offer for {{name}} at {{company}}!', smtpUsed: 'default', scheduleOption: 'immediate', scheduleDate: '' });
    setRecipientSource('list');
    setSelectedListId('');
    setCsvFileDetails({ fileName: '', headers: [], rawRows: [], mappedFields: { email: '', name: '', company: '' } });
    setValidationReport(null);
    setWizardRecipients([]);
    setBodyText('Hi {{name}},\n\nWe would love to offer {{company}} special pricing. Let us know if this works for you!\n\nBest,\nSales Team');
    setRangeOption('all');
    setRangeFrom(1);
    setRangeTo(1);
    setConcurrency(1);
    setFollowupSequences([]);
  };

  // Load SMTP configurations & Contact Lists
  useEffect(() => {
    const loadWizardData = async () => {
      try {
        const smtpRes = await authFetch(`${API_BASE}/smtp-configs`);
        if (smtpRes.ok) {
          const smtpData = await smtpRes.json();
          setSmtpConfigs(smtpData);
        }
        const listRes = await authFetch(`${API_BASE}/lists`);
        if (listRes.ok) {
          const listData = await listRes.json();
          setSavedLists(listData);
        }
      } catch (err) {
        console.error('Failed to load wizard setup configurations:', err);
      }
    };
    loadWizardData();
  }, []);



  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    setCampaignDetails(prev => ({ ...prev, [name]: value }));
  };

  // Step 2: Handle list selection
  const handleListSelect = async (listId) => {
    setSelectedListId(listId);
    if (!listId) {
      setWizardRecipients([]);
      setValidationReport(null);
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/lists/${listId}/contacts`);
      if (res.ok) {
        const contacts = await res.json();
        const mappedRows = contacts.map(c => ({
          email: c.email,
          name: c.name,
          company: c.company
        }));

        const report = generateValidationReport(mappedRows, 'email');
        setValidationReport(report);
        setRangeTo(report.summary.valid);

        const formatted = report.rows.map((row, idx) => ({
          id: contacts[idx]?.id || 'ct-' + idx,
          email: row.email,
          name: row.data.name || 'Customer',
          company: row.data.company || 'Enterprise',
          status: row.status,
          reason: row.reason,
          data: row.data
        }));

        setWizardRecipients(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch list contacts:', err);
    }
  };

  // Step 2: Handle CSV drag & drop parser
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit. Please upload a smaller file.');
      return;
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

          // Auto-map headers
          const emailMap = headers.find(h => /email/i.test(h)) || headers[0] || '';
          const nameMap = headers.find(h => /name|first/i.test(h)) || headers[1] || '';
          const companyMap = headers.find(h => /company|org|firm/i.test(h)) || headers[2] || '';

          const defaultMapping = { email: emailMap, name: nameMap, company: companyMap };

          setCsvFileDetails({
            fileName: file.name,
            headers: headers,
            rawRows: rows,
            mappedFields: defaultMapping
          });

          if (emailMap) {
            const report = generateValidationReport(rows, emailMap);
            setValidationReport(report);
            setRangeTo(report.summary.valid);

            const formatted = report.rows.map(row => ({
              email: row.email,
              name: row.data[nameMap] || 'Customer',
              company: row.data[companyMap] || 'Enterprise',
              status: row.status,
              reason: row.reason,
              data: row.data
            }));
            setWizardRecipients(formatted);
          }
        } catch (err) {
          alert('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExtension === 'csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const parsed = parseCSV(text);

        if (parsed.error) {
          alert(parsed.error);
          return;
        }

        const emailMap = parsed.headers.find(h => /email/i.test(h)) || parsed.headers[0] || '';
        const nameMap = parsed.headers.find(h => /name|first/i.test(h)) || parsed.headers[1] || '';
        const companyMap = parsed.headers.find(h => /company|org|firm/i.test(h)) || parsed.headers[2] || '';

        const defaultMapping = { email: emailMap, name: nameMap, company: companyMap };

        setCsvFileDetails({
          fileName: file.name,
          headers: parsed.headers,
          rawRows: parsed.rows,
          mappedFields: defaultMapping
        });

        if (emailMap) {
          const report = generateValidationReport(parsed.rows, emailMap);
          setValidationReport(report);
          setRangeTo(report.summary.valid);

          const formatted = report.rows.map(row => ({
            email: row.email,
            name: row.data[nameMap] || 'Customer',
            company: row.data[companyMap] || 'Enterprise',
            status: row.status,
            reason: row.reason,
            data: row.data
          }));
          setWizardRecipients(formatted);
        }
      };
      reader.readAsText(file);
    } else {
      alert('Invalid file format. Please upload a .csv, .xlsx, or .xls file.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleHeaderMappingChange = (field, val) => {
    const updatedMappedFields = { ...csvFileDetails.mappedFields, [field]: val };
    setCsvFileDetails(prev => ({
      ...prev,
      mappedFields: updatedMappedFields
    }));

    if (csvFileDetails.rawRows.length > 0 && updatedMappedFields.email) {
      const report = generateValidationReport(csvFileDetails.rawRows, updatedMappedFields.email);
      setValidationReport(report);
      setRangeTo(report.summary.valid);

      const formatted = report.rows.map(row => ({
        email: row.email,
        name: row.data[updatedMappedFields.name] || 'Customer',
        company: row.data[updatedMappedFields.company] || 'Enterprise',
        status: row.status,
        reason: row.reason,
        data: row.data
      }));
      setWizardRecipients(formatted);
    }
  };

  // Step 3: Selection
  const handleSelectTemplate = (tpl) => {
    setBodyText(tpl.body);
    setCampaignDetails(prev => ({ ...prev, subject: tpl.subject }));
    setCurrentStep(4);
  };

  // Step 4: Variable Cursor Insert
  const insertPlaceholder = (tag) => {
    const textarea = document.getElementById('wizard-body-editor');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newBody = before + tag + after;
    setBodyText(newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 10);
  };

  // Send test email
  const triggerTestSend = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestSentStatus('error');
      return;
    }
    setSendingTest(true);
    setTestSentStatus(null);
    try {
      const res = await sendTestEmail(testEmail, campaignDetails.subject, bodyText, campaignDetails.smtpUsed);
      setIsTestMock(!!(res && res.isMock));
      setTestSentStatus('success');
    } catch (err) {
      console.error('Test sending failed:', err);
      setTestSentStatus('error');
    } finally {
      setSendingTest(false);
    }
  };

  // Step 4: Compile preview for first recipient
  const getPersonalizedPreview = () => {
    let rawBody = bodyText || '';
    let rawSubject = campaignDetails.subject || '';
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(rawBody);

    let sampleRecord = { email: 'john@example.com', name: 'John Doe', company: 'Acme Corp' };
    const validRecipients = wizardRecipients.filter(r => r.status === 'Valid');

    if (validRecipients.length > 0) {
      const firstValid = validRecipients[0];
      sampleRecord = {
        email: firstValid.email,
        name: firstValid.name,
        company: firstValid.company
      };
    }

    const compile = (text) => {
      let compiled = text || '';
      compiled = compiled
        .replace(/{{name}}/g, sampleRecord.name)
        .replace(/{{email}}/g, sampleRecord.email)
        .replace(/{{company}}/g, sampleRecord.company);

      if (validRecipients.length > 0 && validRecipients[0].data) {
        const firstValid = validRecipients[0];
        Object.keys(firstValid.data).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          compiled = compiled.replace(regex, firstValid.data[key] || '');
        });
      }

      if (isHtml) {
        return compiled;
      }

      return compiled
        .replace(/\n\n/g, '</p><p style="margin-top: 10px; margin-bottom: 10px;">')
        .replace(/\n/g, '<br/>');
    };

    let compiledSubject = rawSubject
      .replace(/{{name}}/g, sampleRecord.name)
      .replace(/{{email}}/g, sampleRecord.email)
      .replace(/{{company}}/g, sampleRecord.company);

    if (validRecipients.length > 0 && validRecipients[0].data) {
      const firstValid = validRecipients[0];
      Object.keys(firstValid.data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        compiledSubject = compiledSubject.replace(regex, firstValid.data[key] || '');
      });
    }

    const compiledBody = compile(rawBody);

    return {
      subject: compiledSubject,
      to: `${sampleRecord.name} <${sampleRecord.email}>`,
      html: isHtml ? compiledBody : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; min-height: 250px; background-color: #f8fafc;">
          <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; padding: 24px; font-size: 14px; line-height: 1.6; border-radius: 12px; border: 1px solid #e2e8f0; color: #0f172a; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
              <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px;">A</div>
              <div>
                <div style="font-size: 13px; font-weight: bold; color: #0f172a;">AeroSend System</div>
                <div style="font-size: 9px; color: #94a3b8; font-weight: 500;">Campaign Preview</div>
              </div>
            </div>
            <div style="color: #0f172a;">
              <p style="margin: 0 0 12px 0;">${compiledBody}</p>
            </div>
            <div style="margin-top: 30px; padding-top: 15px; font-size: 11px; text-align: center; border-top: 1px solid #f1f5f9; color: #64748b;">
              You are receiving this email because you are registered under ${sampleRecord.name} (${sampleRecord.email}).<br/>
              AeroSend Inc, 100 Pine St, San Francisco, CA. <br/>
              <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
            </div>
          </div>
        </div>
      `
    };
  };

  const previewContent = getPersonalizedPreview();

  // Step 5: Save & Launch Campaign
  const handleLaunch = async () => {
    if (isLaunching) return;
    setIsLaunching(true);

    const validRecipients = wizardRecipients.filter(r => r.status === 'Valid');
    const range = rangeOption === 'custom' ? { from: parseInt(rangeFrom), to: parseInt(rangeTo) } : null;
    const finalRecipientsCount = range
      ? Math.max(0, parseInt(rangeTo) - parseInt(rangeFrom) + 1)
      : validRecipients.length;

    try {
      const newCampId = await saveCampaign({
        name: campaignDetails.name,
        subject: campaignDetails.subject,
        body: bodyText,
        recipientsCount: finalRecipientsCount,
        smtpUsed: campaignDetails.smtpUsed,
        scheduleDate: (campaignDetails.scheduleOption === 'schedule' && campaignDetails.scheduleDate)
          ? new Date(campaignDetails.scheduleDate).toISOString()
          : null,
        status: campaignDetails.scheduleOption === 'schedule' ? 'Scheduled' : 'Draft',
        recipients: campaignDetails.scheduleOption === 'schedule' ? validRecipients : null,
        mappedFields: campaignDetails.scheduleOption === 'schedule'
          ? (recipientSource === 'list' ? { name: 'name', email: 'email', company: 'company' } : csvFileDetails.mappedFields)
          : null
      });

      // Save follow-up sequences if configured
      if (followupSequences.length > 0) {
        try {
          const token = localStorage.getItem('aerosend_token');
          await fetch(`${API_BASE}/campaigns/${newCampId}/followups`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ sequences: followupSequences })
          });
        } catch (fuErr) {
          console.error('Failed to save follow-up sequences:', fuErr);
        }
      }

      // Clear draft on successful launch/schedule
      clearDraft();
      setHasDraft(false);

      if (campaignDetails.scheduleOption === 'schedule') {
        alert(`Campaign "${campaignDetails.name}" successfully scheduled for ${new Date(campaignDetails.scheduleDate).toLocaleString()}`);
        navigate('/');
      } else {
        await launchCampaign(
          newCampId,
          campaignDetails.name,
          campaignDetails.subject,
          bodyText,
          validRecipients,
          range,
          concurrency,
          delayOverride,
          campaignDetails.smtpUsed
        );
        navigate('/sending-monitor');
      }
    } catch (err) {
      console.error(err);
      alert('Launch failed. Please check settings/connection.');
    } finally {
      setIsLaunching(false);
    }
  };

  const variablesToDisplay = csvFileDetails.headers.length > 0
    ? [...new Set(['name', 'email', 'company', ...csvFileDetails.headers])].map(h => `{{${h}}}`)
    : ['{{name}}', '{{email}}', '{{company}}'];

  const selectedSmtpName = campaignDetails.smtpUsed === 'default'
    ? 'System Default SMTP Relay'
    : smtpConfigs.find(c => c.id === campaignDetails.smtpUsed)?.name || 'Standard SMTP Profile';

  // Navigation steps validation logic
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!campaignDetails.name.trim() || !campaignDetails.subject.trim()) {
        alert('Please fill out Name and Subject Line.');
        return;
      }
      if (campaignDetails.scheduleOption === 'schedule') {
        if (!campaignDetails.scheduleDate) {
          alert('Please select a valid schedule date.');
          return;
        }
        if (new Date(campaignDetails.scheduleDate) <= new Date()) {
          alert('Please select a date/time in the future.');
          return;
        }
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const validRecipients = wizardRecipients.filter(r => r.status === 'Valid');
      if (validRecipients.length === 0) {
        alert('You must load a target list with at least 1 valid recipient to proceed.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!bodyText.trim()) {
        alert('Please compose your email content.');
        return;
      }
      setCurrentStep(5);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const renderNavigationButtons = (position = 'bottom') => {
    return (
      <div className={`flex justify-between items-center ${position === 'top' ? 'pb-3 border-b border-slate-100 mb-4' : 'pt-3 border-t border-slate-100 mt-4'}`}>
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 1}
          className="btn-secondary py-2 px-4 text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="btn-primary py-2 px-4 text-xs flex items-center gap-1"
          >
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLaunch}
            disabled={isLaunching || wizardRecipients.filter(r => r.status === 'Valid').length === 0}
            className="btn-success py-2 px-5 text-xs flex items-center gap-1.5 font-bold shadow-md"
          >
            {isLaunching
              ? 'Launching dispatch...'
              : campaignDetails.scheduleOption === 'schedule'
                ? 'Schedule Campaign'
                : 'Start Bulk Send'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Campaign Wizard</h1>
          <p className="text-sm text-slate-500">Configure, target, preview, and deploy bulk email campaigns.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginTop: '2px' }}>
          {/* Draft saved badge */}
          {hasDraft && savedDraft?.savedAt && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '10px', fontWeight: 600,
              color: 'var(--emerald-700)',
              background: 'hsl(160 60% 96%)',
              border: '1px solid hsl(160 60% 85%)',
              padding: '3px 8px',
              borderRadius: '9999px',
              whiteSpace: 'nowrap'
            }}>
              💾 Draft saved {new Date(savedDraft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              <button
                onClick={handleClearDraft}
                title="Clear draft and start fresh"
                style={{
                  marginLeft: '2px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'hsl(160 50% 45%)',
                  fontSize: '11px', fontWeight: 700, padding: '0 2px',
                  lineHeight: 1
                }}
              >✕</button>
            </span>
          )}
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--indigo-600)',
            background: 'var(--indigo-50)',
            border: '1px solid hsl(250 100% 93%)',
            padding: '3px 10px',
            borderRadius: '9999px',
            whiteSpace: 'nowrap'
          }}>
            Step {currentStep} of 5
          </span>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm" style={{ padding: '20px 24px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

          {/* Dotted connector track (grey) */}
          <div style={{
            position: 'absolute',
            top: '18px',
            left: '28px',
            right: '28px',
            height: '2px',
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: '6px 2px',
            backgroundRepeat: 'repeat-x',
            zIndex: 0
          }} />

          {/* Filled dotted progress (indigo) */}
          <div style={{
            position: 'absolute',
            top: '18px',
            left: '28px',
            height: '2px',
            backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
            backgroundSize: '6px 2px',
            backgroundRepeat: 'repeat-x',
            zIndex: 0,
            width: `calc(${((currentStep - 1) / 4) * 100}% - 0px)`,
            maxWidth: 'calc(100% - 56px)',
            transition: 'width 0.5s ease'
          }} />

          {[
            { num: 1, name: 'Details' },
            { num: 2, name: 'Audience' },
            { num: 3, name: 'Template' },
            { num: 4, name: 'Composer' },
            { num: 5, name: 'Send' }
          ].map((s) => {
            const isCompleted = currentStep > s.num;
            const isActive = currentStep === s.num;

            const bubbleStyle = {
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              border: '2px solid',
              transition: 'all 0.3s ease',
              position: 'relative',
              zIndex: 1,
              transform: isActive ? 'scale(1.12)' : 'scale(1)',
              ...(isCompleted
                ? { background: 'var(--emerald-500)', color: '#fff', borderColor: 'var(--emerald-500)', boxShadow: '0 0 0 4px hsl(160 60% 93%)' }
                : isActive
                  ? { background: 'var(--indigo-600)', color: '#fff', borderColor: 'var(--indigo-600)', boxShadow: '0 0 0 4px hsl(250 100% 93%), 0 4px 12px rgba(99,102,241,0.3)' }
                  : { background: '#fff', color: 'var(--slate-400)', borderColor: 'var(--slate-200)' })
            };

            const labelStyle = {
              fontSize: '10px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              marginTop: '8px',
              transition: 'color 0.2s ease',
              color: isActive ? 'var(--indigo-600)' : isCompleted ? 'var(--emerald-600)' : 'var(--slate-400)'
            };

            return (
              <div key={s.num} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={bubbleStyle}>
                  {isCompleted
                    ? <Check size={14} strokeWidth={3} />
                    : s.num
                  }
                </div>
                <span style={labelStyle}>{s.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {renderNavigationButtons('top')}

      {/* STEP 1: CAMPAIGN DETAILS */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Info size={14} className="text-indigo-600" /> Step 1: Campaign Details & Schedule
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Campaign Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Campaign Name</label>
              <input
                type="text"
                name="name"
                value={campaignDetails.name}
                onChange={handleDetailsChange}
                placeholder="e.g. Q3 Sales Promotion"
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
              />
            </div>

            {/* Subject line */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Subject Line</label>
              <input
                type="text"
                name="subject"
                value={campaignDetails.subject}
                onChange={handleDetailsChange}
                placeholder="Enter email subject line..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
              />
            </div>

            {/* Sender Gateway Info (Single profile enforced) */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sender SMTP Gateway</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-600 font-semibold">
                System Default Config ({settings.smtp.host || 'Local Mock'})
              </div>
            </div>

            {/* Schedule Option */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Delivery Time</label>
              <div className="flex gap-4 py-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="scheduleOption"
                    value="immediate"
                    checked={campaignDetails.scheduleOption === 'immediate'}
                    onChange={handleDetailsChange}
                    className="text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-white border-slate-300"
                  />
                  Send immediately
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="scheduleOption"
                    value="schedule"
                    checked={campaignDetails.scheduleOption === 'schedule'}
                    onChange={handleDetailsChange}
                    className="text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-white border-slate-300"
                  />
                  Schedule dispatch
                </label>
              </div>
            </div>

            {/* Schedule Date */}
            {campaignDetails.scheduleOption === 'schedule' && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Dispatch Date & Time</label>
                <input
                  type="datetime-local"
                  name="scheduleDate"
                  value={campaignDetails.scheduleDate}
                  onChange={handleDetailsChange}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-650"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: AUDIENCE TARGETS */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-655" /> Step 2: Choose Target Recipients
              </h3>

              {/* Source Picker */}
              <div className="flex gap-4 pb-2 text-xs border-b border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="recipientSource"
                    value="list"
                    checked={recipientSource === 'list'}
                    onChange={() => {
                      setRecipientSource('list');
                      setValidationReport(null);
                      setWizardRecipients([]);
                      setSelectedListId('');
                    }}
                    className="text-indigo-650 focus:ring-0 focus:ring-offset-0 bg-white border-slate-300"
                  />
                  Select Database Contact List
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="radio"
                    name="recipientSource"
                    value="upload"
                    checked={recipientSource === 'upload'}
                    onChange={() => {
                      setRecipientSource('upload');
                      setValidationReport(null);
                      setWizardRecipients([]);
                    }}
                    className="text-indigo-650 focus:ring-0 focus:ring-offset-0 bg-white border-slate-300"
                  />
                  Upload CSV/Excel Dataset File
                </label>
              </div>

              {/* LIST SELECTOR */}
              {recipientSource === 'list' && (
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Contact List</label>
                    <select
                      value={selectedListId}
                      onChange={(e) => handleListSelect(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                    >
                      <option value="">-- Choose a contact list --</option>
                      {savedLists.map(lst => (
                        <option key={lst.id} value={lst.id}>{lst.name} ({lst.description || 'No description'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* UPLOAD FILE SECTION */}
              {recipientSource === 'upload' && (
                <div className="space-y-4 pt-1">
                  {/* File Pick Dropzone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-white text-center transition-all duration-300 relative ${dragActive ? 'border-indigo-650 bg-indigo-50/20' : 'border-slate-250 hover:border-slate-350 shadow-sm'
                      }`}
                  >
                    <UploadCloud size={32} className="text-slate-400 mb-2" />
                    <h3 className="text-xs font-semibold text-slate-850">Drag and drop your CSV or Excel file here</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 mb-3">Accepts CSV and Excel files up to 5MB</p>

                    <label className="btn-secondary py-1.5 px-3 text-[10px] cursor-pointer">
                      Browse Files
                      <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileInput} className="hidden" />
                    </label>

                    {csvFileDetails.fileName && (
                      <div className="mt-4 flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg text-[10px] text-indigo-700">
                        <FileCheck size={12} className="text-indigo-500" /> Active File: <span className="font-semibold text-slate-800">{csvFileDetails.fileName}</span>
                      </div>
                    )}
                  </div>

                  {/* Header Mapping Selection */}
                  {csvFileDetails.headers.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address *</label>
                        <select
                          value={csvFileDetails.mappedFields.email}
                          onChange={(e) => handleHeaderMappingChange('email', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-808 focus:outline-none focus:border-indigo-650"
                        >
                          <option value="">-- Choose email --</option>
                          {csvFileDetails.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Name ({"{{name}}"})</label>
                        <select
                          value={csvFileDetails.mappedFields.name}
                          onChange={(e) => handleHeaderMappingChange('name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-808 focus:outline-none focus:border-indigo-650"
                        >
                          <option value="">-- Unmapped --</option>
                          {csvFileDetails.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company ({"{{company}}"})</label>
                        <select
                          value={csvFileDetails.mappedFields.company}
                          onChange={(e) => handleHeaderMappingChange('company', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-808 focus:outline-none focus:border-indigo-650"
                        >
                          <option value="">-- Unmapped --</option>
                          {csvFileDetails.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recipient sample list */}
            {wizardRecipients.length > 0 && (
              <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recipients Sample (First 3 Rows)</h3>
                <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <th className="py-2 px-3">Index</th>
                        <th className="py-2 px-3">Email Address</th>
                        <th className="py-2 px-3">Personalized Name</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {wizardRecipients.slice(0, 3).map((row, index) => (
                        <tr key={index}>
                          <td className="py-2 px-3 font-mono text-slate-400">#{index + 1}</td>
                          <td className="py-2 px-3 font-semibold">{row.email}</td>
                          <td className="py-2 px-3">{row.name}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${row.status === 'Valid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Validation report widget */}
          <div>
            <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                Audience Analysis
              </h3>

              {!validationReport ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  Upload a dataset or select a database contact list to view report.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-lg flex items-center gap-2">
                      <Users size={16} className="text-indigo-600" />
                      <div>
                        <div className="font-semibold text-slate-808">{validationReport.summary.total}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Total</div>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-lg flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <div>
                        <div className="font-semibold text-slate-808">{validationReport.summary.valid}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Valid</div>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-lg flex items-center gap-2">
                      <Copy size={16} className="text-amber-500" />
                      <div>
                        <div className="font-semibold text-slate-808">{validationReport.summary.duplicates}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Duplicates</div>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-lg flex items-center gap-2">
                      <AlertCircle size={16} className="text-rose-500" />
                      <div>
                        <div className="font-semibold text-slate-808">{validationReport.summary.invalid}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Invalid</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-[10px] text-slate-550 leading-relaxed">
                    <Info size={12} className="inline mr-1 text-slate-400" /> Only <strong>{validationReport.summary.valid} valid recipient(s)</strong> are eligible to receive campaign dispatches. Duplicates and syntactically invalid addresses are skipped automatically.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: TEMPLATE SELECTOR */}
      {currentStep === 3 && (
        <div className="space-y-4 bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600" /> Step 3: Choose Preset Template
            </h3>
            <button
              onClick={() => setCurrentStep(4)}
              className="text-xs text-indigo-650 hover:underline font-semibold"
            >
              Skip & compose from scratch &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(tpl => (
              <div
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                className="group border border-slate-100 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50/20 p-4 rounded-xl cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-800 group-hover:text-indigo-700 text-sm transition-colors">{tpl.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.subject}</p>
                </div>
                <div className="text-[10px] text-indigo-600 font-semibold mt-3 flex items-center justify-between">
                  <span>Select template</span>
                  <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs italic">
                No templates configured. Proceed to next step to write campaign body.
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: COMPOSEM LIVE PREVIEW */}
      {currentStep === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Draft Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-600" /> Step 4: Compose Email Text
                </h3>

                {/* Placeholders injection */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Inject variables:</span>
                  {variablesToDisplay.map(tag => (
                    <button
                      key={tag}
                      onClick={() => insertPlaceholder(tag)}
                      className="btn-pill-indigo text-[9px] py-0.5 px-2"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                id="wizard-body-editor"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={11}
                placeholder="Write your email body with dynamic tags (e.g. {{name}}, {{company}})..."
                className="w-full bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-800 focus:outline-none focus:border-indigo-650 transition-colors editor-font"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowTestModal(true)}
                className="btn-secondary py-2 px-3 text-xs"
              >
                <Send size={12} /> Send Test Email
              </button>
            </div>
          </div>

          {/* Live Device Preview Frame */}
          <div>
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Device Render Preview</h3>

                {/* Device selectors */}
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
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
                        className={`p-1 rounded transition-colors ${deviceView === device.id
                          ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                          : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        <DevIcon size={12} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex justify-center overflow-x-hidden">
                <div
                  className={`bg-white rounded-lg shadow-sm border border-slate-150 overflow-y-auto custom-scrollbar transition-all duration-300 ${deviceView === 'mobile'
                    ? 'w-[260px] h-[340px]'
                    : deviceView === 'tablet'
                      ? 'w-[360px] h-[360px]'
                      : 'w-full min-h-[300px] max-h-[380px]'
                    }`}
                  style={{ transformOrigin: 'top center' }}
                >
                  <div className="p-2 border-b border-slate-100 text-[10px] text-slate-450 leading-snug">
                    <div><strong>To:</strong> <span className="font-mono text-indigo-600">{previewContent.to}</span></div>
                    <div><strong>Subject:</strong> <span className="font-semibold text-slate-800">{previewContent.subject}</span></div>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: previewContent.html }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & SEND */}
      {currentStep === 5 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checklist Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Pre-flight Dispatch Checklist
              </h3>

              <div className="space-y-3">
                {/* 1. SMTP Check */}
                <div className="flex gap-3 text-xs">
                  <div className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex-shrink-0">
                    <Check size={12} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Sender Gateway Connected</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Configured via: <strong>{selectedSmtpName}</strong>.
                    </p>
                  </div>
                </div>

                {/* 2. Recipient check */}
                <div className="flex gap-3 text-xs">
                  <div className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex-shrink-0">
                    <Check size={12} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Recipient Database Validated</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Targeting <strong>{wizardRecipients.filter(r => r.status === 'Valid').length} valid email destination(s)</strong>.
                    </p>
                  </div>
                </div>

                {/* 3. Variables map */}
                <div className="flex gap-3 text-xs">
                  <div className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex-shrink-0">
                    <Check size={12} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Placeholders Evaluated</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Template content parsed. Custom header fallback fields will compile dynamically.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Follow-up Sequence Builder */}
            <FollowupSequenceBuilder
              sequences={followupSequences}
              onChange={setFollowupSequences}
            />

            {/* Configs Slider */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 hover:text-indigo-600 transition-colors"
              >
                <span>Advanced Delivery Options</span>
                <span className="text-slate-400 font-semibold">{showAdvancedSettings ? 'Hide ▲' : 'Show ▼'}</span>
              </button>

              {showAdvancedSettings && (
                <div className="space-y-4 text-xs pt-2">
                  {/* Concurrency thread limits */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Simultaneous Dispatch Threads</span>
                      <span className="text-indigo-650 font-mono font-bold">x{concurrency} thread(s)</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={concurrency}
                      onChange={(e) => setConcurrency(parseInt(e.target.value))}
                      className="w-full accent-indigo-600 bg-slate-200 h-1.5 rounded cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-450">Execute multiple sending requests in parallel threads simultaneously.</p>
                  </div>

                  {/* Delay Range slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Dispatch Delay Interval</span>
                      <span className="text-indigo-650 font-mono font-bold">{delayOverride}s</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={delayOverride}
                      onChange={(e) => setDelayOverride(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 bg-slate-200 h-1.5 rounded cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-450">Wait timeout offset between email sends.</p>
                  </div>

                  {/* Recipient Range Options */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recipients Range Selection</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="rangeOption"
                          value="all"
                          checked={rangeOption === 'all'}
                          onChange={() => setRangeOption('all')}
                          className="text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-white border-slate-300"
                        />
                        Send to All ({wizardRecipients.filter(r => r.status === 'Valid').length})
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="rangeOption"
                          value="custom"
                          checked={rangeOption === 'custom'}
                          onChange={() => setRangeOption('custom')}
                          className="text-indigo-650 focus:ring-0 focus:ring-offset-0 bg-white border-slate-300"
                        />
                        Custom Range
                      </label>
                    </div>

                    {rangeOption === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">From Index</label>
                          <input
                            type="number"
                            min={1}
                            max={wizardRecipients.filter(r => r.status === 'Valid').length}
                            value={rangeFrom}
                            onChange={(e) => setRangeFrom(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-white border border-slate-200 text-slate-808 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-650"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">To Index</label>
                          <input
                            type="number"
                            min={1}
                            max={wizardRecipients.filter(r => r.status === 'Valid').length}
                            value={rangeTo}
                            onChange={(e) => setRangeTo(Math.min(wizardRecipients.filter(r => r.status === 'Valid').length, parseInt(e.target.value) || wizardRecipients.filter(r => r.status === 'Valid').length))}
                            className="w-full bg-white border border-slate-200 text-slate-808 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-650"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Summary & Launch */}
          <div>
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Dispatch Summary
                </h3>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500">Campaign Name</span>
                    <span className="font-semibold text-slate-808 truncate max-w-[120px]">{campaignDetails.name}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500">Valid Destination Receivers</span>
                    <span className="font-mono font-bold text-slate-800">{wizardRecipients.filter(r => r.status === 'Valid').length}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500">Send Setting</span>
                    <span className="font-semibold text-slate-808 capitalize">{campaignDetails.scheduleOption}</span>
                  </div>
                  {campaignDetails.scheduleOption === 'schedule' && (
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">Schedule Date</span>
                      <span className="font-mono text-slate-800 font-semibold">{new Date(campaignDetails.scheduleDate).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleLaunch}
                disabled={isLaunching || wizardRecipients.filter(r => r.status === 'Valid').length === 0}
                className="btn-primary w-full py-3 text-xs disabled:opacity-50 mt-4"
              >
                {isLaunching
                  ? 'Launching dispatch queue...'
                  : campaignDetails.scheduleOption === 'schedule'
                    ? 'Schedule Campaign Dispatch'
                    : 'Start Bulk Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND TEST EMAIL MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-xl relative text-left">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Send Test Email</h3>
              <button
                type="button"
                onClick={() => {
                  setShowTestModal(false);
                  setTestSentStatus(null);
                }}
                className="text-slate-400 hover:text-slate-655 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-normal">Send a single test message using current template content to a test mailbox.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Test Recipient Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter test email address..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-808 focus:outline-none focus:border-indigo-650"
                  required
                />
              </div>

              {sendingTest && (
                <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg justify-center">
                  <RefreshCw size={12} className="animate-spin" /> Dispatching test message...
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
                  <X size={14} className="text-rose-500" /> Test send failed. Check details/SMTP host connection.
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="btn-secondary flex-1 py-2 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  disabled={sendingTest || !testEmail}
                  onClick={triggerTestSend}
                  className="btn-primary flex-1 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Send Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCampaign;
