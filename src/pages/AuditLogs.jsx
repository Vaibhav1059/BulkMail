import React, { useState, useEffect, useContext } from 'react';
import { AppContext, API_BASE } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import './AuditLogs.css';
import {
  FileText,
  Search,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
  User,
  Users,
  Mail,
  Server,
  Archive,
  AlertOctagon,
  Undo,
  Info,
  Check,
  Plus
} from 'lucide-react';

export const AuditLogs = () => {
  const {
    auditLogs,
    deleteAuditLog,
    deleteAuditLogsBulk,
    restoreAuditLogsBulk,
    clearCampaignHistory,
    sendingState,
    launchCampaign
  } = useContext(AppContext);

  const navigate = useNavigate();

  // Search, tabs, filter states
  const [viewTab, setViewTab] = useState('active'); // 'active' | 'trash'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Success' | 'Warning' | 'Failed'
  const [selectedLogs, setSelectedLogs] = useState([]); // List of selected log IDs

  // Detail Modal States
  const [detailLog, setDetailLog] = useState(null);
  const [detailRecipients, setDetailRecipients] = useState([]);
  const [detailCampaign, setDetailCampaign] = useState(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Recipient filtering/sorting/pagination inside modal
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientStatusFilter, setRecipientStatusFilter] = useState('All'); // 'All' | 'Sent' | 'Failed' | 'Skipped'
  const [recipientSort, setRecipientSort] = useState({ col: 'name', dir: 'asc' });
  const [recipientPage, setRecipientPage] = useState(1);
  const recipientsPerPage = 10;

  // Visual overlay confirmation dialog state
  const [confirmAction, setConfirmAction] = useState(null); // { type, title, description, payload }
  const [toast, setToast] = useState(null);

  // Reset page when recipient filters change
  useEffect(() => {
    setRecipientPage(1);
  }, [recipientSearch, recipientStatusFilter, recipientSort]);

  // Fetch recipients list and campaign details when detailLog is selected
  useEffect(() => {
    if (detailLog && detailLog.campaignId) {
      setLoadingRecipients(true);
      setDetailRecipients([]);
      setDetailCampaign(null);

      // Fetch recipients list
      fetch(`${API_BASE}/campaigns/${detailLog.campaignId}/recipients`)
        .then(res => res.json())
        .then(data => {
          setDetailRecipients(data);
          setLoadingRecipients(false);
        })
        .catch(err => {
          console.error('Failed to load recipients:', err);
          setLoadingRecipients(false);
        });

      // Fetch campaign details for message body preview
      fetch(`${API_BASE}/campaigns/${detailLog.campaignId}`)
        .then(res => {
          if (!res.ok) throw new Error('Campaign not found');
          return res.json();
        })
        .then(data => {
          setDetailCampaign(data);
        })
        .catch(err => {
          console.warn('Failed to load campaign template details:', err);
        });
    } else {
      setDetailRecipients([]);
      setDetailCampaign(null);
    }
  }, [detailLog]);

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Confirmation actions execution wrapper
  const handleExecuteConfirm = async () => {
    if (!confirmAction) return;
    const { type, payload } = confirmAction;

    try {
      if (type === 'soft-delete-single') {
        await deleteAuditLog(payload.id, false);
        showToast('Audit log moved to trash.');
      } else if (type === 'permanent-delete-single') {
        await deleteAuditLog(payload.id, true);
        showToast('Audit log entry permanently deleted.');
      } else if (type === 'soft-delete-bulk') {
        await deleteAuditLogsBulk(payload.ids, false);
        setSelectedLogs([]);
        showToast(`${payload.ids.length} entries moved to trash.`);
      } else if (type === 'permanent-delete-bulk') {
        await deleteAuditLogsBulk(payload.ids, true);
        setSelectedLogs([]);
        showToast(`${payload.ids.length} entries permanently deleted.`);
      } else if (type === 'restore-bulk') {
        await restoreAuditLogsBulk(payload.ids);
        setSelectedLogs([]);
        showToast(`${payload.ids.length} entries restored successfully.`);
      } else if (type === 'clear-campaign-history') {
        await clearCampaignHistory(payload.campaignId);
        setDetailLog(null);
        showToast('Campaign dispatches and logs successfully purged.');
      }
    } catch (err) {
      showToast('Operation failed: ' + err.message, 'error');
    } finally {
      setConfirmAction(null);
    }
  };

  // Resend campaign action helper
  const handleResendCampaign = async (log) => {
    if (sendingState && sendingState.status === 'sending') {
      showToast('Cannot launch campaign. Another campaign is currently sending.', 'error');
      return;
    }

    const confirmResend = window.confirm(`Are you sure you want to resend the campaign "${log.campaignName}" to the same recipients?`);
    if (!confirmResend) return;

    try {
      showToast('Fetching campaign template & recipients...', 'info');

      // 1. Fetch recipients
      const resRec = await fetch(`${API_BASE}/campaigns/${log.campaignId}/recipients`);
      if (!resRec.ok) throw new Error('Failed to load recipients list.');
      const recipientsList = await resRec.json();

      // 2. Fetch campaign template details
      let bodyText = log.body || '';
      try {
        const resCamp = await fetch(`${API_BASE}/campaigns/${log.campaignId}`);
        if (resCamp.ok) {
          const campData = await resCamp.json();
          bodyText = campData.body || bodyText;
        }
      } catch (err) {
        console.warn('Could not fetch campaign body template, using log fallback.', err);
      }

      if (!recipientsList || recipientsList.length === 0) {
        showToast('No recipients found to resend to.', 'error');
        return;
      }

      showToast('Resending campaign...', 'info');

      // 3. Map recipients and launch
      const formattedRecipients = recipientsList.map(r => ({
        name: r.name,
        email: r.email,
        company: r.company
      }));

      await launchCampaign(
        log.campaignId,
        log.campaignName,
        log.subject || 'No Subject',
        bodyText,
        formattedRecipients,
        null, // range
        1, // concurrency
        0.5 // delay
      );

      navigate('/sending-monitor');
    } catch (err) {
      console.error(err);
      showToast('Failed to resend campaign: ' + err.message, 'error');
    }
  };

  // Checkbox helpers
  const handleSelectRow = (id) => {
    setSelectedLogs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (visibleIds) => {
    const allSelected = visibleIds.every(id => selectedLogs.includes(id));
    if (allSelected) {
      // Unselect visible items
      setSelectedLogs(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      // Select all visible items
      setSelectedLogs(prev => {
        const union = new Set([...prev, ...visibleIds]);
        return Array.from(union);
      });
    }
  };

  // Export visible/filtered logs as JSON
  const handleExport = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `aerosend_audit_logs_${viewTab}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Export data generated successfully.', 'info');
    } catch (err) {
      showToast('Failed to export: ' + err.message, 'error');
    }
  };

  // Selected single log variable for resending
  const selectedLog = selectedLogs.length === 1 ? auditLogs.find(l => l.id === selectedLogs[0]) : null;

  // Main Audit list processing (Tab filtration -> Text Search -> Status match)
  const filteredLogs = auditLogs.filter(log => {
    // 1. Soft Delete tab matching
    const isSoftDeleted = !!log.deletedAt;
    if (viewTab === 'trash' && !isSoftDeleted) return false;
    if (viewTab === 'active' && isSoftDeleted) return false;

    // 2. Status filtration
    if (statusFilter !== 'All' && log.status !== statusFilter) return false;

    // 3. Search query parsing
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (log.user && log.user.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.campaignName && log.campaignName.toLowerCase().includes(q)) ||
      (log.subject && log.subject.toLowerCase().includes(q)) ||
      (log.senderEmail && log.senderEmail.toLowerCase().includes(q))
    );
  });

  const activeLogsCount = auditLogs.filter(log => !log.deletedAt).length;
  const trashLogsCount = auditLogs.filter(log => !!log.deletedAt).length;

  // Compile visual badge styles
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success':
        return (
          <span className="audit-badge audit-badge-success">
            <CheckCircle size={10} /> Success
          </span>
        );
      case 'Warning':
        return (
          <span className="audit-badge audit-badge-warning">
            <AlertTriangle size={10} /> Warning
          </span>
        );
      case 'Failed':
        return (
          <span className="audit-badge audit-badge-failed">
            <XCircle size={10} /> Failed
          </span>
        );
      default:
        return (
          <span className="audit-badge audit-badge-neutral">
            {status}
          </span>
        );
    }
  };

  // Render variables/personalization tags beautifully in modal body previews
  const renderMockBodyText = (text) => {
    if (!text) return 'No message content drafted for this activity log.';
    
    // Replace double newlines and standard newlines
    let formattedText = text
      .replace(/\n\n/g, '</p><p style="margin-top: 12px; margin-bottom: 12px;">')
      .replace(/\n/g, '<br/>');

    // Highlight personalization placeholders in preview modal
    const highlight = (tag) => 
      `<span style="background: linear-gradient(135deg, #e0e7ff, #e8e8ff); border: 1px solid #c7d2fe; padding: 1px 5px; border-radius: 4px; color: #4f46e5; font-weight: 600; font-family: monospace; font-size: 0.9em; display: inline-flex; align-items: center;" title="Variable Tag">${tag}</span>`;

    formattedText = formattedText
      .replace(/{{name}}/g, highlight('{{name}}'))
      .replace(/{{email}}/g, highlight('{{email}}'))
      .replace(/{{company}}/g, highlight('{{company}}'));

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; line-height: 1.6; color: #334155;">
        <p style="margin: 0 0 10px 0;">${formattedText}</p>
      </div>
    `;
  };

  // RECIPIENT PROCESSING INSIDE DETAILS MODAL
  const filteredRecipients = detailRecipients.filter(rec => {
    // Status filter
    if (recipientStatusFilter !== 'All' && rec.status !== recipientStatusFilter) return false;

    // Search filter
    if (!recipientSearch.trim()) return true;
    const qr = recipientSearch.toLowerCase();
    return (
      (rec.name && rec.name.toLowerCase().includes(qr)) ||
      (rec.email && rec.email.toLowerCase().includes(qr)) ||
      (rec.reason && rec.reason.toLowerCase().includes(qr))
    );
  });

  // Sorting recipients
  const sortedRecipients = [...filteredRecipients].sort((a, b) => {
    let aVal = a[recipientSort.col] || '';
    let bVal = b[recipientSort.col] || '';

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return recipientSort.dir === 'asc' ? -1 : 1;
    if (aVal > bVal) return recipientSort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginated recipients
  const totalRecipientPages = Math.max(1, Math.ceil(sortedRecipients.length / recipientsPerPage));
  const indexOfLastRecipient = recipientPage * recipientsPerPage;
  const indexOfFirstRecipient = indexOfLastRecipient - recipientsPerPage;
  const paginatedRecipients = sortedRecipients.slice(indexOfFirstRecipient, indexOfLastRecipient);

  const toggleRecipientSort = (colName) => {
    setRecipientSort(prev => ({
      col: colName,
      dir: prev.col === colName && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="audit-page-container">
      {/* 1. Header and title */}
      <div className="audit-header">
        <div className="audit-title-group">
          <h1 className="audit-title">Advanced Audit System</h1>
          <p className="audit-subtitle">Verify historical compliance logs, soft-delete entries, or search complete campaign recipient records.</p>
        </div>

        <button
          onClick={handleExport}
          className="audit-btn audit-btn-secondary audit-btn-export"
        >
          <Download size={14} /> Export Logs (JSON)
        </button>
      </div>

      {/* 2. Tabs selection & Status control */}
      <div className="audit-controls-bar">
        
        {/* Tab triggers */}
        <div className="audit-tabs-wrapper">
          <button
            onClick={() => {
              setViewTab('active');
              setSelectedLogs([]);
            }}
            className={`audit-tab-btn ${viewTab === 'active' ? 'active' : ''}`}
          >
            <Clock size={13} /> Active Audit Logs
            <span className="audit-tab-badge">
              {activeLogsCount}
            </span>
          </button>

          <button
            onClick={() => {
              setViewTab('trash');
              setSelectedLogs([]);
            }}
            className={`audit-tab-btn trash ${viewTab === 'trash' ? 'active' : ''}`}
          >
            <Archive size={13} /> Trash Bin (Soft Delete)
            {trashLogsCount > 0 && (
              <span className="audit-tab-badge">
                {trashLogsCount}
              </span>
            )}
          </button>
        </div>

        {/* Global actions searching & filter */}
        <div className="audit-filters-wrapper">
          {/* Search bar */}
          <div className="audit-search-input-wrapper">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, action, campaign name..."
              className="audit-search-input"
            />
            <Search size={14} className="audit-search-icon" />
          </div>

          {/* Status filter pills */}
          <div className="audit-status-filters">
            {[
              { label: 'All' },
              { label: 'Success' },
              { label: 'Warning' },
              { label: 'Failed' },
            ].map(({ label }) => (
              <button
                key={label}
                onClick={() => setStatusFilter(label)}
                className={`audit-status-btn ${label} ${statusFilter === label ? 'active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Main logs table container */}
      <div className="audit-table-card">
        {/* Selected row indicators */}
        {selectedLogs.length > 0 && (
          <div className="audit-selected-bar">
            <span className="audit-selected-text">
              Selected <span>{selectedLogs.length}</span> log records
            </span>

            {/* Bulk Actions Buttons Panel */}
            <div className="audit-selected-actions">
              {selectedLogs.length === 1 && selectedLog && selectedLog.campaignId && viewTab === 'active' && (
                <button
                  onClick={() => handleResendCampaign(selectedLog)}
                  className="audit-btn audit-btn-success audit-btn-bulk"
                  type="button"
                >
                  <RefreshCw size={12} /> Resend Selected Campaign
                </button>
              )}

              {viewTab === 'active' ? (
                <>
                  <button
                    onClick={() => setConfirmAction({
                      type: 'soft-delete-bulk',
                      title: 'Soft Delete Selection',
                      description: `Are you sure you want to move the ${selectedLogs.length} selected logs to the Trash Bin?`,
                      payload: { ids: selectedLogs }
                    })}
                    className="audit-btn audit-btn-danger audit-btn-bulk"
                  >
                    <Archive size={12} /> Move to Trash
                  </button>

                  <button
                    onClick={() => setConfirmAction({
                      type: 'permanent-delete-bulk',
                      title: 'Permanently Delete Selection',
                      description: `This action is final! Are you sure you want to permanently erase the ${selectedLogs.length} selected logs from the database?`,
                      payload: { ids: selectedLogs }
                    })}
                    className="audit-btn audit-btn-danger audit-btn-bulk"
                  >
                    <Trash2 size={12} /> Permanently Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmAction({
                      type: 'restore-bulk',
                      title: 'Restore Logs from Trash',
                      description: `Do you want to restore the ${selectedLogs.length} selected soft-deleted logs back to active status?`,
                      payload: { ids: selectedLogs }
                    })}
                    className="audit-btn audit-btn-primary audit-btn-bulk"
                  >
                    <Undo size={12} /> Restore Selected
                  </button>

                  <button
                    onClick={() => setConfirmAction({
                      type: 'permanent-delete-bulk',
                      title: 'Purge Selection Permanently',
                      description: `Are you sure you want to permanently delete the ${selectedLogs.length} selected logs? This cannot be undone.`,
                      payload: { ids: selectedLogs }
                    })}
                    className="audit-btn audit-btn-danger audit-btn-bulk"
                  >
                    <Trash2 size={12} /> Delete Permanently
                  </button>
                </>
              )}
              
              <button
                onClick={() => setSelectedLogs([])}
                className="audit-selected-close"
                title="Cancel selections"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="audit-table-responsive custom-scrollbar">
          <table className="audit-table">
            <thead>
              <tr className="audit-table-header-row">
                <th className="audit-table-header" style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredLogs.length > 0 && filteredLogs.every(log => selectedLogs.includes(log.id))}
                    onChange={() => handleSelectAll(filteredLogs.map(l => l.id))}
                    className="audit-checkbox"
                  />
                </th>
                <th className="audit-table-header">Date & Time</th>
                <th className="audit-table-header">User</th>
                <th className="audit-table-header">Action details</th>
                <th className="audit-table-header">Campaign metadata</th>
                <th className="audit-table-header cell-status">Status</th>
                <th className="audit-table-header cell-actions">Actions</th>
              </tr>
            </thead>
            <tbody className="audit-table-body">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="audit-empty-state">
                      <FileText size={24} className="audit-empty-state-icon" />
                      <p>No matching audit records found in this view.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isChecked = selectedLogs.includes(log.id);
                  return (
                    <tr
                      key={log.id}
                      className={`audit-table-row ${isChecked ? 'selected' : ''}`}
                    >
                      {/* Checkbox column */}
                      <td className="audit-table-cell">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(log.id)}
                          className="audit-checkbox"
                        />
                      </td>

                      {/* Date & Time column */}
                      <td className="audit-table-cell">
                        <div className="audit-timestamp">
                          <Clock size={12} />
                          {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* User Column */}
                      <td className="audit-table-cell">
                        <div className="audit-user-info">
                          <div className="audit-user-avatar">
                            {log.user ? log.user.charAt(0) : 'U'}
                          </div>
                          <span className="audit-user-name">{log.user}</span>
                        </div>
                      </td>

                      {/* Action details */}
                      <td className="audit-table-cell cell-action-details" title={log.action}>
                        {log.action}
                      </td>

                      {/* Campaign metadata */}
                      <td className="audit-table-cell">
                        {log.campaignId ? (
                          <div className="audit-campaign-meta">
                            <div className="audit-campaign-name" title={log.campaignName}>{log.campaignName}</div>
                            {log.subject && (
                              <div className="audit-campaign-subject" title={log.subject}>{log.subject}</div>
                            )}
                            <div className="audit-campaign-details">
                              <span className="audit-campaign-targets">{log.recipientCount} targets</span>
                              {log.smtpUsed && (
                                <span className="audit-campaign-smtp" title={log.smtpUsed}>
                                  {log.smtpUsed}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="audit-campaign-subject">System administration event</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="audit-table-cell cell-status">
                        {getStatusBadge(log.status)}
                      </td>

                      {/* Actions Buttons */}
                      <td className="audit-table-cell cell-actions">
                        <button
                          onClick={() => setDetailLog(log)}
                          className="audit-icon-btn audit-icon-btn-view"
                          title="View Details & Recipients"
                        >
                          <Eye size={12} />
                        </button>

                        {log.campaignId && viewTab === 'active' && (
                          <button
                            onClick={() => handleResendCampaign(log)}
                            className="audit-icon-btn audit-icon-btn-resend"
                            title="Resend Campaign to Same Recipients"
                          >
                            <RefreshCw size={12} />
                          </button>
                        )}

                        {viewTab === 'active' ? (
                          <button
                            onClick={() => setConfirmAction({
                              type: 'soft-delete-single',
                              title: 'Move to Trash',
                              description: 'Are you sure you want to soft-delete this log entry? It will be moved to the Trash Bin.',
                              payload: { id: log.id }
                            })}
                            className="audit-icon-btn audit-icon-btn-archive"
                            title="Move to Trash"
                          >
                            <Archive size={12} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setConfirmAction({
                                type: 'restore-bulk',
                                title: 'Restore Entry',
                                description: 'Restore this entry to active logs list?',
                                payload: { ids: [log.id] }
                              })}
                              className="audit-icon-btn audit-icon-btn-view"
                              title="Restore Entry"
                            >
                              <Undo size={12} />
                            </button>

                            <button
                              onClick={() => setConfirmAction({
                                type: 'permanent-delete-single',
                                title: 'Erase Entry Permanently',
                                description: 'This action is irreversible. Are you sure you want to permanently delete this audit log?',
                                payload: { id: log.id }
                              })}
                              className="audit-icon-btn audit-icon-btn-delete"
                              title="Delete Permanently"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DETAIL MODAL SCREEN */}
      {detailLog && (
        <div className="audit-modal-backdrop">
          <div className="audit-modal-container">
            {/* Title / Description */}
            <div className="audit-modal-header">
              <div className="audit-modal-title-block">
                <h3 className="audit-modal-title">
                  <FileText size={16} />
                  Audit Logs Detail
                </h3>
                <p className="audit-modal-index">
                  LOG IDENTIFICATION INDEX: {detailLog.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailLog(null);
                  setRecipientSearch('');
                  setRecipientStatusFilter('All');
                  setRecipientPage(1);
                }}
                className="audit-modal-close-btn"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="audit-modal-body custom-scrollbar">
              
              {/* Campaign / Event metadata Grid */}
              <div className="audit-meta-grid">
                
                {/* Campaign Name */}
                <div className="audit-meta-card">
                  <label className="audit-meta-label">Campaign Name</label>
                  <div className="audit-meta-value" title={detailLog.campaignName || 'System Administrative Event'}>
                    {detailLog.campaignName || 'System Administrative Event'}
                  </div>
                </div>

                {/* Campaign ID */}
                <div className="audit-meta-card">
                  <label className="audit-meta-label">Campaign ID</label>
                  <div className="audit-meta-value mono">
                    {detailLog.campaignId || 'NULL'}
                  </div>
                </div>

                {/* Created By */}
                <div className="audit-meta-card">
                  <label className="audit-meta-label">Created By / User</label>
                  <div className="audit-meta-value">
                    <User size={10} />
                    {detailLog.user}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="audit-meta-card">
                  <label className="audit-meta-label">Send Timestamp</label>
                  <div className="audit-meta-value mono">
                    <Clock size={10} />
                    {new Date(detailLog.date).toLocaleString()}
                  </div>
                </div>

                {/* Target Recipients */}
                <div className="audit-meta-card">
                  <label className="audit-meta-label">Total Targets</label>
                  <div className="audit-meta-value">
                    {detailLog.recipientCount || 0} emails
                  </div>
                </div>

                {/* SMTP Used */}
                <div className="audit-meta-card">
                  <label className="audit-meta-label">SMTP Gateway Host</label>
                  <div className="audit-meta-value mono" title={detailLog.smtpUsed || 'N/A'}>
                    <Server size={10} />
                    {detailLog.smtpUsed || 'N/A'}
                  </div>
                </div>

                {/* Delivery status */}
                <div className="audit-meta-card">
                  <label className="audit-meta-label">Delivery Status</label>
                  <div>
                    {getStatusBadge(detailLog.status)}
                  </div>
                </div>

                {/* Sender Email */}
                <div className="audit-meta-card">
                  <label className="audit-meta-label">Sender Account Address</label>
                  <div className="audit-meta-value" title={detailLog.senderEmail || 'N/A'}>
                    {detailLog.senderEmail || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Message visual Pane (Renders Subject & message markdown in macOS styled frame if Campaign exists) */}
              {detailLog.campaignId && (
                <div>
                  <h4 className="audit-section-title">
                    <Mail size={12} /> Campaign Message Template Preview
                  </h4>

                  {/* macOS window simulator */}
                  <div className="email-preview-window">
                    {/* Top window dots */}
                    <div className="email-preview-titlebar">
                      <div className="email-preview-dots">
                        <span className="dot-red" />
                        <span className="dot-yellow" />
                        <span className="dot-green" />
                      </div>
                      <span className="email-preview-title-text">AEROSEND CLIENT PREVIEW</span>
                    </div>

                    {/* Headers details panel */}
                    <div className="email-preview-headers">
                      <div className="email-preview-header-line">
                        <span className="header-label">Subject:</span>
                        <span className="header-value">{detailLog.subject || '(No Subject)'}</span>
                      </div>
                      <div className="email-preview-header-line">
                        <span className="header-label">Sender Account:</span>
                        <span className="header-value">{detailLog.senderEmail || 'system@aerosend.com'}</span>
                      </div>
                    </div>

                    {/* Campaign visual preview body */}
                    <div className="email-preview-body-container custom-scrollbar">
                      {detailLog.body || (detailCampaign && detailCampaign.body) ? (
                        <>
                          <p className="email-preview-info-text">
                            Message content successfully loaded from {detailLog.body ? 'Audit Log snapshot' : 'Campaign database'}
                          </p>
                          <div
                            className="email-preview-content-rendered"
                            dangerouslySetInnerHTML={{ __html: renderMockBodyText(detailLog.body || detailCampaign.body) }}
                          />
                        </>
                      ) : (
                        <>
                          <p className="email-preview-info-text" style={{ color: 'var(--neutral-muted)' }}>
                            Message contents logged for campaign ID: {detailLog.campaignId}
                          </p>
                          <div
                            className="email-preview-content-rendered"
                            style={{ fontStyle: 'italic', color: 'var(--neutral-light)' }}
                          >
                            Campaign body data is no longer available on the server (it may have been deleted). Recipient history and metadata are preserved below.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Recipient dispatches table */}
              {detailLog.campaignId ? (
                <div>
                  
                  {/* Title & Mail History list filter triggers */}
                  <div className="recipient-section-header">
                    <h4 className="audit-section-title">
                      <Users size={12} /> Campaign Dispatch History ({detailRecipients.length})
                    </h4>

                    {/* Search & filters inside modal */}
                    <div className="recipient-filters">
                      {/* Search */}
                      <div className="recipient-search-wrapper">
                        <Search size={11} className="recipient-search-icon" />
                        <input
                          type="text"
                          value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                          placeholder="Search recipients..."
                          className="recipient-search-input"
                        />
                      </div>

                      {/* Status quick toggle tab filters */}
                      <div className="recipient-status-toggle">
                        {['All', 'Sent', 'Failed', 'Skipped'].map(status => (
                          <button
                            key={status}
                            onClick={() => setRecipientStatusFilter(status)}
                            className={`recipient-toggle-btn ${
                              recipientStatusFilter === status ? 'active' : ''
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mail history grid list view */}
                  <div className="recipient-table-card">
                    {loadingRecipients ? (
                      <div className="recipient-loading-state">
                        <RefreshCw size={16} className="animate-spin" /> Loading recipient dispatches records...
                      </div>
                    ) : (
                      <>
                        <div className="audit-table-responsive custom-scrollbar">
                          <table className="recipient-table">
                            <thead>
                              <tr>
                                <th onClick={() => toggleRecipientSort('name')} className="sortable">
                                  Recipient <ArrowUpDown size={10} className="inline ml-1" />
                                </th>
                                <th onClick={() => toggleRecipientSort('email')} className="sortable">
                                  Email Address <ArrowUpDown size={10} className="inline ml-1" />
                                </th>
                                <th onClick={() => toggleRecipientSort('status')} className="sortable text-center">
                                  Status <ArrowUpDown size={10} className="inline ml-1" />
                                </th>
                                <th onClick={() => toggleRecipientSort('sentAt')} className="sortable">
                                  Sent At <ArrowUpDown size={10} className="inline ml-1" />
                                </th>
                                <th>Delivery details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedRecipients.length === 0 ? (
                                <tr>
                                  <td colSpan={5} style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--neutral-light)', padding: '24px' }}>
                                    No recipient dispatch records match the selected parameters.
                                  </td>
                                </tr>
                              ) : (
                                paginatedRecipients.map((rec) => (
                                  <tr key={rec.id} className="recipient-table-row">
                                    <td style={{ fontWeight: '600', color: 'var(--neutral-title)' }}>{rec.name || 'Enterprise Customer'}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{rec.email}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className={`audit-badge ${
                                        rec.status === 'Sent'
                                          ? 'audit-badge-success'
                                          : rec.status === 'Failed'
                                          ? 'audit-badge-failed'
                                          : 'audit-badge-warning'
                                      }`} style={{ padding: '2px 8px', fontSize: '9px' }}>
                                        {rec.status}
                                      </span>
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--neutral-muted)' }}>
                                      {rec.sentAt ? new Date(rec.sentAt).toLocaleString() : 'N/A'}
                                    </td>
                                    <td style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }} title={rec.reason || 'Syntactically verified / Sent successfully'}>
                                      {rec.reason ? (
                                        <span className="recipient-reason-failed">{rec.reason}</span>
                                      ) : (
                                        <span className="recipient-reason-success">SMTP Handshake Completed</span>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination controls */}
                        {sortedRecipients.length > recipientsPerPage && (
                          <div className="recipient-pagination">
                            <div className="recipient-pagination-indicator">
                              Showing <span>{indexOfFirstRecipient + 1}</span> to{' '}
                              <span>
                                {Math.min(indexOfLastRecipient, sortedRecipients.length)}
                              </span>{' '}
                              of <span>{sortedRecipients.length}</span> recipients
                            </div>

                            <div className="recipient-pagination-controls">
                              <button
                                onClick={() => setRecipientPage(p => Math.max(1, p - 1))}
                                disabled={recipientPage === 1}
                                className="recipient-page-btn"
                              >
                                <ChevronLeft size={10} />
                              </button>
                              
                              <span className="recipient-page-current">
                                Page {recipientPage} of {totalRecipientPages}
                              </span>

                              <button
                                onClick={() => setRecipientPage(p => Math.min(totalRecipientPages, p + 1))}
                                disabled={recipientPage === totalRecipientPages}
                                className="recipient-page-btn"
                              >
                                <ChevronRight size={10} />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="audit-empty-state" style={{ border: '1px dashed var(--secondary-border)', borderRadius: 'var(--radius-md)' }}>
                  <Info size={16} className="audit-empty-state-icon" />
                  <p>This audit record documents a system management action. No email dispatches exist for this activity.</p>
                </div>
              )}
            </div>

            {/* Modal Bottom control buttons */}
            <div className="audit-modal-footer">
              
              {/* Purge & Delete controls */}
              <div className="audit-modal-footer-left">
                {detailLog.campaignId && (
                  <button
                    onClick={() => handleResendCampaign(detailLog)}
                    className="audit-btn audit-btn-success"
                  >
                    <RefreshCw size={12} /> Resend Campaign
                  </button>
                )}

                {detailLog.campaignId && (
                  <button
                    onClick={() => setConfirmAction({
                      type: 'clear-campaign-history',
                      title: 'Purge Campaign Dispatch History',
                      description: 'WARNING: This will permanently purge all recipient dispatch records and log indexes associated with this campaign. Campaign counters will be reset to draft status. This cannot be undone.',
                      payload: { campaignId: detailLog.campaignId }
                    })}
                    className="audit-btn audit-btn-danger"
                  >
                    <Trash2 size={12} /> Purge Campaign History
                  </button>
                )}

                <button
                  onClick={() => setConfirmAction({
                    type: viewTab === 'active' ? 'soft-delete-single' : 'permanent-delete-single',
                    title: viewTab === 'active' ? 'Move Entry to Trash' : 'Erase Entry Permanently',
                    description: viewTab === 'active' 
                      ? 'Move this single log event to the Trash Bin?' 
                      : 'Irreversibly delete this audit log entry from database?',
                    payload: { id: detailLog.id }
                  })}
                  className="audit-btn audit-btn-secondary"
                >
                  <Trash2 size={12} /> Delete Log
                </button>
              </div>

              {/* Close triggers */}
              <button
                onClick={() => {
                  setDetailLog(null);
                  setRecipientSearch('');
                  setRecipientStatusFilter('All');
                  setRecipientPage(1);
                }}
                className="audit-btn audit-btn-secondary"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. VISUAL CONFIRMATION OVERLAY */}
      {confirmAction && (
        <div className="confirm-modal-backdrop">
          <div className="confirm-modal-container">
            
            <div className="confirm-modal-header">
              <div className="confirm-modal-icon-wrapper">
                <AlertOctagon size={18} />
              </div>
              <h3 className="confirm-modal-title">{confirmAction.title}</h3>
            </div>

            <p className="confirm-modal-description">
              {confirmAction.description}
            </p>

            <div className="confirm-modal-actions">
              <button
                onClick={() => setConfirmAction(null)}
                className="audit-btn audit-btn-secondary"
              >
                Cancel
              </button>
              
              <button
                onClick={handleExecuteConfirm}
                className="audit-btn audit-btn-danger"
              >
                Confirm
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. TOAST NOTIFICATIONS POPUP */}
      {toast && (
        <div className={`audit-toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle size={15} />
          ) : toast.type === 'error' ? (
            <XCircle size={15} />
          ) : (
            <Info size={15} />
          )}
          <span className="audit-toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
