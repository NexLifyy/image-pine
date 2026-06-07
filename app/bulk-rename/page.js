"use client";

import React, { useState, useEffect } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';
import JSZip from 'jszip';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>), title: 'Custom Templates', desc: 'Rename files in sequence using flexible patterns like [index] or # tags.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>), title: 'Zero Padding', desc: 'Add configurable digit padding (e.g. 01, 001, 0001) for clean indexing.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>), title: 'Bulk ZIP Packaging', desc: 'Compresses renamed assets into a single clean ZIP archive instantly.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: 'Local Sandbox', desc: 'No files are sent to any server. Everything is zipped right in your browser.' }
];

const _STEPS = [
  { n: '1', title: 'Upload Files', desc: 'Drag & drop multiple images or files into the box.' },
  { n: '2', title: 'Set Naming Pattern', desc: 'Input your prefix and configure start index & zero padding.' },
  { n: '3', title: 'Download ZIP', desc: 'Preview the new names, then click Rename & Download.' }
];

const _FAQS = [
  { q: 'How does the pattern template syntax work?', a: 'Type any name. You can use `#` or `[index]` as a placeholder for numbers. If omitted, the number is appended automatically (e.g. `photo_001.jpg`).' },
  { q: 'Are file extensions preserved?', a: 'Yes. The extension of each file (.png, .jpg, .svg, etc.) is preserved automatically.' },
  { q: 'Is there a limit to the number of files I can rename?', a: 'No, but zipping large batches of images (e.g. hundreds of megabytes) might take a few seconds depending on your device RAM.' }
];

export default function BulkRenamePage() {
  const [files, setFiles] = useState([]);
  const [pattern, setPattern] = useState('photo_#');
  const [startIndex, setStartIndex] = useState(1);
  const [padding, setPadding] = useState(3); // 3 digits: 001
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileSelect = (selectedList) => {
    setFiles((prev) => [...prev, ...selectedList]);
    setErrorMsg('');
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setErrorMsg('');
  };

  // Helper to compute renamed filename for preview
  const getRenamedName = (origName, idx) => {
    const ext = origName.split('.').pop();
    const num = startIndex + idx;
    let numStr = num.toString();
    if (padding > 0) {
      numStr = numStr.padStart(padding, '0');
    }

    let finalBase = pattern;
    if (pattern.includes('[index]')) {
      finalBase = pattern.replace('[index]', numStr);
    } else if (pattern.includes('#')) {
      finalBase = pattern.replace('#', numStr);
    } else {
      finalBase = `${pattern}_${numStr}`;
    }

    return `${finalBase}.${ext}`;
  };

  const handleDownloadZip = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const zip = new JSZip();
      
      files.forEach((file, index) => {
        const newName = getRenamedName(file.name, index);
        zip.file(newName, file);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'renamed_images.zip');
      saveHistory('Bulk Renamer', `renamed_images.zip (${files.length} files)`);
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to compile ZIP file.');
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell
      title="Bulk Rename & File Organizer"
      subtitle="Organize your image library in seconds. Rename dozens of files using custom patterns and download them in a single ZIP."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free client-side bulk image renamer. Rename multiple image files using sequential indexes, custom zero padding, and download them compiled in a ZIP archive locally."
    >
      <div className="flex flex-col gap-6">
        {files.length === 0 ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp', '.svg']}
              multiple={true} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Left Column: Renaming parameters */}
            <div className="lg:col-span-4" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="pb-2 border-b border-bordercolor flex justify-between items-center">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Renamer Settings
                </h3>
                <button onClick={clearAll} className="text-xs font-bold text-red-500 hover:underline">
                  Clear All
                </button>
              </div>

              {/* Naming Pattern Template */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Rename Pattern Template
                </label>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                  placeholder="e.g. holiday_#"
                />
                <span className="text-[9px] text-gray-400 font-medium">
                  Use <code>#</code> or <code>[index]</code> for numbers (e.g. <code>photo_#</code> yields <code>photo_001.png</code>).
                </span>
              </div>

              {/* Start Index */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Start Number
                </label>
                <input
                  type="number"
                  min="0"
                  value={startIndex}
                  onChange={(e) => setStartIndex(parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Zero Padding */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Zero Padding Digits
                </label>
                <select
                  value={padding}
                  onChange={(e) => setPadding(parseInt(e.target.value))}
                  className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                >
                  <option value={0}>No padding (1, 2...)</option>
                  <option value={2}>2 digits (01, 02...)</option>
                  <option value={3}>3 digits (001, 002...)</option>
                  <option value={4}>4 digits (0001, 0002...)</option>
                </select>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 font-semibold py-1 leading-relaxed">
                  {errorMsg}
                </p>
              )}

              {/* Action Button */}
              <div className="pt-2 border-t border-bordercolor/60">
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isProcessing || files.length === 0}
                  style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating ZIP Archive...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Rename &amp; Download ZIP
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Files table preview */}
            <div className="lg:col-span-8" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Loaded Files ({files.length})
                </h4>
                
                {/* Inline upload box trigger */}
                <button
                  onClick={() => {
                    const el = document.getElementById('add-more-rename');
                    if (el) el.click();
                  }}
                  className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Files
                </button>
                <input
                  id="add-more-rename"
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      const list = Array.from(e.target.files).map((f) =>
                        Object.assign(f, {
                          preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
                          id: Math.random().toString(36).slice(2, 9)
                        })
                      );
                      handleFileSelect(list);
                    }
                  }}
                />
              </div>

              {/* Table list */}
              <div style={{ maxHeight: 440, overflowY: 'auto', border: '1px solid #E4E4EF', borderRadius: 12 }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-lightbg/30 border-b border-bordercolor/60">
                      <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preview</th>
                      <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Original Filename</th>
                      <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider"></th>
                      <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Renamed Filename</th>
                      <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file, idx) => (
                      <tr key={file.id} className="border-b border-bordercolor/40 hover:bg-lightbg/10 transition-all duration-150">
                        <td className="p-3">
                          {file.preview ? (
                            <img
                              src={file.preview}
                              alt=""
                              className="w-10 h-10 object-cover rounded-lg border border-bordercolor shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-lightbg/40 border border-bordercolor flex items-center justify-center rounded-lg text-[9px] font-bold text-gray-400">
                              FILE
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-xs text-textmain truncate max-w-[180px]" title={file.name}>
                          {file.name}
                        </td>
                        <td className="p-3 text-gray-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </td>
                        <td className="p-3 font-mono font-bold text-xs text-primary truncate max-w-[200px]" title={getRenamedName(file.name, idx)}>
                          {getRenamedName(file.name, idx)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => removeFile(file.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                            title="Remove file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
