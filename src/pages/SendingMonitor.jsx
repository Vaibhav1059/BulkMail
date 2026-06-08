import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Protected } from '../components/Protected';
import {
  Play,
  Pause,
  Octagon,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  Terminal,
  Activity,
  Download,
  MailCheck,
  X
} from 'lucide-react';

export const SendingMonitor = () => {
  const {
    sendingState,
    pauseSending,
    resumeSending,
    stopSending,
    retryFailedEmails,
    dismissAdminSummary,
    settings
  } = useContext(AppContext);

  const {
    campaignName,
    total,
    sent,
    failed,
    remaining,
    status,
    logs,
    failedList,
    concurrency,
    delayOverride,
    showAdminSummary,
    rangeIndex
  } = sendingState;

  const progress = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Transmitting emails...';
      case 'paused':
        return 'Transmission paused.';
      case 'stopped':
        return 'Transmission stopped by user.';
      case 'completed':
        return 'All emails processed.';
      default:
        return 'System Idle. No active campaign running.';
    }
  };

  const getStatusBadgeClass = () => {
    switch (status) {
      case 'sending':
        return 'bg-indigo-50 text-indigo-705 border border-indigo-200 animate-pulse';
      case 'paused':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'stopped':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-655 border border-slate-205';
    }
  };

  // Build and download detailed report TXT file
  const handleDownloadReport = () => {
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
    
    let reportContent = `==================================================
AEROSEND SYSTEM - DELIVERY CAMPAIGN REPORT
==================================================
Campaign Name: ${campaignName}
Generated On : ${new Date().toLocaleString()}
SMTP Host    : ${settings.smtp.host || 'Local Mock'}
Sender Email : ${settings.smtp.senderEmail || 'sandbox@aerosend.local'}
--------------------------------------------------
TRANSMISSION METRICS:
--------------------------------------------------
Total Recipients  : ${total}
Sent Successfully : ${sent}
Failed / Bounced  : ${failed}
Delivery Rate     : ${successRate}%
Concurrency Level : ${concurrency} parallel thread(s)
Dispatch Speed    : 1 email every ${delayOverride}s
Index Range Filter: ${rangeIndex ? `Rows ${rangeIndex.from} to ${rangeIndex.to}` : 'All Mapped Recipients'}
--------------------------------------------------
FAILED / BOUNCED RECIPIENTS LOGS:
--------------------------------------------------\n`;

    if (failedList.length === 0) {
      reportContent += `No failed or bounced email addresses detected in this range.\n`;
    } else {
      failedList.forEach((item, index) => {
        reportContent += `#${index + 1} Row ${item.index}: ${item.email} - Status: ${item.status} (${item.reason || 'SMTP delivery timeout'})\n`;
      });
    }

    reportContent += `\n--------------------------------------------------
CHRONOLOGICAL SYSTEM AUDIT STATEMENTS:
--------------------------------------------------\n`;
    logs.forEach(log => {
      reportContent += `${log}\n`;
    });

    try {
      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportContent);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `aerosend_delivery_report_${campaignName.replace(/\s+/g, '_').toLowerCase()}.txt`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to generate text report: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-sans">Campaign Sending Monitor</h1>
          <p className="text-sm text-slate-500">Track real-time dispatch progress and connection logs.</p>
        </div>

        <div className="flex items-center gap-3">
          {(status === 'completed' || status === 'stopped') && (
            <button
              onClick={handleDownloadReport}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              <Download size={12} /> Download Report
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-450 uppercase tracking-widest font-bold">Status:</span>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full capitalize ${getStatusBadgeClass()}`}>
              {status}
            </span>
          </div>
        </div>
      </div>

      {status === 'idle' ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <Activity size={48} className="text-slate-400 mb-4 animate-pulse" />
          <h3 className="text-md font-semibold text-slate-700">No Active Transmissions</h3>
          <p className="text-xs text-slate-550 max-w-sm mt-1 mb-6">Create a campaign and map your CSV recipient list to start the monitor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress meters and controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Main stats card */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {campaignName || 'Active Campaign'}
              </h3>

              {/* Progress gauge */}
              <div className="text-center py-2">
                <div className="relative inline-flex items-center justify-center">
                  {/* Huge Percentage */}
                  <span className="text-5xl font-extrabold tracking-tighter text-indigo-600 font-mono">
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 border border-slate-200 h-2 rounded-full overflow-hidden mt-4">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      status === 'completed'
                        ? 'bg-emerald-500'
                        : status === 'stopped'
                        ? 'bg-rose-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-semibold uppercase tracking-wider">{getStatusText()}</p>
              </div>

              {/* Parameters info badge */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 space-y-1">
                <div><span className="font-semibold text-slate-400">Concurrency:</span> {concurrency} active thread(s)</div>
                <div><span className="font-semibold text-slate-400">Delay Interval:</span> {delayOverride}s wait per send</div>
                <div>
                  <span className="font-semibold text-slate-400">Recipients Range:</span>{' '}
                  {rangeIndex ? `Rows ${rangeIndex.from} to ${rangeIndex.to}` : 'All Mapped Rows'}
                </div>
              </div>

              {/* Counts listing */}
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-550">Total Recipients</span>
                  <span className="font-mono font-semibold text-slate-800">{total}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-550 flex items-center gap-1">
                    <CheckCircle size={12} className="text-emerald-600" /> Sent Successfully
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{sent}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-550 flex items-center gap-1">
                    <AlertTriangle size={12} className="text-rose-600" /> Failed / Bounces / Skips
                  </span>
                  <span className="font-mono font-bold text-rose-700">{failed}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-550">Remaining</span>
                  <span className="font-mono font-semibold text-slate-500">{remaining}</span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                {status === 'sending' && (
                  <button
                    onClick={pauseSending}
                    className="btn-warning col-span-1 py-2 text-xs"
                  >
                    <Pause size={12} /> Pause
                  </button>
                )}

                {status === 'paused' && (
                  <button
                    onClick={resumeSending}
                    className="btn-primary col-span-1 py-2 text-xs"
                  >
                    <Play size={12} /> Resume
                  </button>
                )}

                {(status === 'sending' || status === 'paused') && (
                  <button
                    onClick={stopSending}
                    className="btn-danger col-span-1 py-2 text-xs"
                  >
                    <Octagon size={12} /> Stop
                  </button>
                )}

                {/* Reset failed/Retry trigger */}
                {(status === 'completed' || status === 'stopped') && failed > 0 && (
                  <button
                    onClick={retryFailedEmails}
                    className="btn-primary col-span-2 py-2 text-xs"
                  >
                    <RefreshCcw size={12} /> Retry {failed} Failed Emails
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Console / Log Terminal */}
          <div className="lg:col-span-2 flex flex-col h-[480px]">
            <div className="bg-white border border-slate-205 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
              {/* Terminal header */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-indigo-650" />
                  <span className="font-mono text-slate-700 font-semibold uppercase tracking-wider">Live System Logs</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Capturing logs
                </div>
              </div>

              {/* Console log viewport - formatted clean light log window */}
              <div className="flex-1 bg-slate-50/50 p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar space-y-1.5 select-text">
                {logs.length === 0 ? (
                  <div className="text-slate-400 italic">Logs will appear here once sending commences...</div>
                ) : (
                  logs.map((log, index) => {
                    const isSuccess = log.includes('successfully') || log.includes('Starting') || log.includes('resumed') || log.includes('finished');
                    const isWarning = log.includes('paused') || log.includes('Skipped');
                    const isError = log.includes('Failed') || log.includes('terminated');

                    let textColor = 'text-slate-600';
                    if (isSuccess) textColor = 'text-emerald-700 font-medium';
                    if (isWarning) textColor = 'text-amber-700 font-medium';
                    if (isError) textColor = 'text-rose-700 font-medium';

                    return (
                      <div key={index} className={`${textColor} leading-normal`}>
                        {log}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN SUMMARY EMAIL NOTIFICATION POPUP */}
      {showAdminSummary && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl relative">
            <button
              onClick={dismissAdminSummary}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <MailCheck size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-805 uppercase tracking-wider">Admin Summary Report Dispatched</h3>
            </div>

            <p className="text-xs text-slate-550 mb-4 leading-relaxed">
              A copy of the campaign delivery analysis report was compiled and emailed to the system administrator inbox (**{settings.smtp.senderEmail || 'sandbox@aerosend.local'}**).
            </p>

            {/* Recap Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-mono space-y-2 text-slate-700">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Email Report Preview</div>
              <div><span className="text-slate-400">Subject:</span> [AeroSend Report] Dispatch: {campaignName}</div>
              <div><span className="text-slate-400">Targeted:</span> {total} recipients</div>
              <div><span className="text-slate-400">Delivered:</span> <span className="text-emerald-700 font-bold">{sent} ({total > 0 ? Math.round((sent/total)*100) : 0}%)</span></div>
              <div><span className="text-slate-400">Bounces / Skips:</span> <span className="text-rose-700 font-bold">{failed}</span></div>
              <div className="pt-2 border-t border-slate-200 text-slate-450 text-[10px]">
                Status: Completed successfully. SMTP server connection closed.
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={handleDownloadReport}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                <Download size={12} /> Download Report
              </button>
              
              <button
                onClick={dismissAdminSummary}
                className="btn-primary flex-1 py-2 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SendingMonitor;
