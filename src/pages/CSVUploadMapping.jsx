import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { parseCSV, generateValidationReport } from '../utils/csvParser';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Users,
  CheckCircle,
  Copy,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

export const CSVUploadMapping = () => {
  const { csvData, setCsvData, logEvent } = useContext(AppContext);
  const navigate = useNavigate();

  const [rawText, setRawText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedHeaders, setSelectedHeaders] = useState({
    email: csvData.mappedFields.email || '',
    name: csvData.mappedFields.name || '',
    company: csvData.mappedFields.company || ''
  });

  const [validationReport, setValidationReport] = useState(csvData.validationReport || null);



  const handleTextParse = (text, name = 'Sample Sandbox Dataset') => {
    setRawText(text);
    const parsed = parseCSV(text);

    if (parsed.error) {
      alert(parsed.error);
      return;
    }

    // Auto-map headers if standard names exist
    const emailMap = parsed.headers.find(h => /email/i.test(h)) || parsed.headers[0] || '';
    const nameMap = parsed.headers.find(h => /name|first/i.test(h)) || parsed.headers[1] || '';
    const companyMap = parsed.headers.find(h => /company|org|firm/i.test(h)) || parsed.headers[2] || '';

    setSelectedHeaders({
      email: emailMap,
      name: nameMap,
      company: companyMap
    });

    setCsvData(prev => ({
      ...prev,
      fileName: name,
      headers: parsed.headers,
      rawRows: parsed.rows
    }));

    logEvent(`Uploaded and parsed CSV file "${name}" containing ${parsed.rows.length} rows`);
  };


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
          
          // Convert sheet to JSON
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

          setCsvData(prev => ({
            ...prev,
            fileName: file.name,
            headers: headers,
            rawRows: rows
          }));

          // Automatically select headers if matchers exist
          const emailMap = headers.find(h => /email/i.test(h)) || headers[0] || '';
          const nameMap = headers.find(h => /name|first/i.test(h)) || headers[1] || '';
          const companyMap = headers.find(h => /company|org|firm/i.test(h)) || headers[2] || '';

          setSelectedHeaders({
            email: emailMap,
            name: nameMap,
            company: companyMap
          });

          logEvent(`Uploaded and parsed Excel file "${file.name}" containing ${rows.length} rows`);
        } catch (err) {
          alert('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExtension === 'csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleTextParse(event.target.result, file.name);
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
    setSelectedHeaders(prev => ({ ...prev, [field]: val }));
  };

  // Run validation report when rows or mapping changes (local state only to prevent context render loops)
  useEffect(() => {
    if (csvData.rawRows.length > 0 && selectedHeaders.email) {
      const report = generateValidationReport(csvData.rawRows, selectedHeaders.email);
      setValidationReport(report);
    }
  }, [selectedHeaders, csvData.rawRows]);

  const handleProceed = () => {
    if (!selectedHeaders.email) {
      alert('You must map the Email address field to proceed.');
      return;
    }
    if (!validationReport || validationReport.summary.valid === 0) {
      alert('Your dataset has no valid email recipients to send to.');
      return;
    }

    // Save final mapping and validation results to global context
    setCsvData(prev => ({
      ...prev,
      mappedFields: selectedHeaders,
      validationReport: validationReport
    }));

    // In current routing flow, we can go to /preview page
    navigate('/preview');
  };

  return (
    <div className="space-y-6">
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">CSV Upload & Field Mapping</h1>
          <p className="text-sm text-slate-505">Import your contact lists and map headers to dynamic template tags.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CSV Dropzone & Column preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Picker */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-white text-center transition-all duration-300 relative ${dragActive ? 'border-indigo-650 bg-indigo-50/20' : 'border-slate-250 hover:border-slate-350 shadow-sm'
              }`}
          >
            <UploadCloud size={36} className="text-slate-400 mb-3" />
            <h3 className="text-sm font-semibold text-slate-850">Drag and drop your CSV or Excel file here</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Accepts CSV and Excel files up to 5MB with standard email headers</p>

            <label className="btn-secondary py-2 px-4 text-xs cursor-pointer">
              Browse Files
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileInput} className="hidden" />
            </label>

            {csvData.fileName && (
              <div className="mt-4 flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg text-xs text-indigo-700">
                <FileCheck size={14} className="text-indigo-500" /> Active File: <span className="font-semibold text-slate-800">{csvData.fileName}</span>
              </div>
            )}
          </div>

          {/* Parsed Rows Grid Preview */}
          {csvData.rawRows.length > 0 && (
            <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Raw Dataset Sample (First 3 Rows)</h3>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      {csvData.headers.map((h, i) => (
                        <th key={i} className="pb-2 px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {csvData.rawRows.slice(0, 3).map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        {csvData.headers.map((h, i) => (
                          <td key={i} className="py-2 px-3">{row[h] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Rows Detail */}
          {validationReport && (
            <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-555 uppercase tracking-wider mb-3">
                Recipient Validation Analysis
              </h3>

              <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-205 text-slate-500 uppercase font-semibold">
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Email Address</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {validationReport.rows.map((row) => (
                      <tr key={row.index} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">#{row.index}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-750">{row.email || '<blank>'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.status === 'Valid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : row.status === 'Duplicate'
                                ? 'bg-amber-50 text-amber-750 border border-amber-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-slate-500">{row.reason || 'Syntactically verified'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Header Mapping Setup */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Info size={12} className="text-indigo-500" /> Dynamic Header Mapping
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">Map variables from your CSV columns to the personalization tag variables used in your campaign draft.</p>

            {csvData.headers.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Upload a CSV file or load sample data to select columns.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Email mapping */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <select
                    value={selectedHeaders.email}
                    onChange={(e) => handleHeaderMappingChange('email', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                  >
                    <option value="">-- Choose email column --</option>
                    {csvData.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Name mapping */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Name placeholder ({"{{name}}"})
                  </label>
                  <select
                    value={selectedHeaders.name}
                    onChange={(e) => handleHeaderMappingChange('name', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                  >
                    <option value="">-- Leave unmapped --</option>
                    {csvData.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Company mapping */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Company placeholder ({"{{company}}"})
                  </label>
                  <select
                    value={selectedHeaders.company}
                    onChange={(e) => handleHeaderMappingChange('company', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-650"
                  >
                    <option value="">-- Leave unmapped --</option>
                    {csvData.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {csvData.headers.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Detected Custom Column Tags</span>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Any column from your file can be used directly in your email body as a dynamic variable. Simply insert the header name in double curly braces:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {csvData.headers.map((h, i) => (
                        <span key={i} className="px-2 py-0.5 text-[9px] font-mono font-semibold bg-slate-50 border border-slate-200 text-slate-600 rounded shadow-sm select-all cursor-pointer" title="Copy text">
                          {"{{"}{h}{"}}"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Validation Metrics Widget */}
          {validationReport && (
            <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck size={12} className="text-indigo-500" /> Validation Report
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Total */}
                <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-lg flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" />
                  <div>
                    <div className="font-semibold text-slate-800">{validationReport.summary.total}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Total</div>
                  </div>
                </div>

                {/* Valid */}
                <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-lg flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <div>
                    <div className="font-semibold text-slate-800">{validationReport.summary.valid}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Valid</div>
                  </div>
                </div>

                {/* Duplicates */}
                <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-lg flex items-center gap-2">
                  <Copy size={16} className="text-amber-500" />
                  <div>
                    <div className="font-semibold text-slate-800">{validationReport.summary.duplicates}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Duplicates</div>
                  </div>
                </div>

                {/* Invalid */}
                <div className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-500" />
                  <div>
                    <div className="font-semibold text-slate-800">{validationReport.summary.invalid}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Invalid</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleProceed}
            disabled={!csvData.rawRows.length}
            className="btn-primary w-full py-3 text-xs disabled:opacity-50"
          >
            Preview Campaign
          </button>
        </div>
      </div>
    </div>
  );
};
export default CSVUploadMapping;
