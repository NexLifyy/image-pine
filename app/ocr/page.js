"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';
import Tesseract from 'tesseract.js';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2H4a2 2 0 0 0-2 2v3M20 7V4a2 2 0 0 0-2-2h-3M4 22H7m-3 0a2 2 0 0 1-2-2v-3M20 17v3a2 2 0 0 1-2 2h-3M9 8h6M9 12h6M9 16h6" /></svg>), title: 'Text Recognition', desc: 'Scan screenshots, documents, and photos to extract plain text instantly.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>), title: 'Multi-Language Support', desc: 'Default to English, with quick options for Spanish, French, German, or Chinese.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Secure & Local', desc: 'OCR worker runs completely inside your browser. No server uploads.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>), title: 'Text Export', desc: 'Save your extracted text as a .txt document or copy with a single click.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant Web Worker', desc: 'Uses multithreading in-browser parsing to scan text without freezing the tab UI.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9" width="20" height="6" rx="3" /><path d="M5 12h10" strokeWidth="3" /></svg>), title: 'Visual Progress Bar', desc: 'Watch the recognition progress step-by-step from loading to completion.' }
];

const _STEPS = [
  { n: '1', title: 'Upload Screenshot/Photo', desc: 'Select any image containing legible text.' },
  { n: '2', title: 'Choose Language', desc: 'Select the primary language of the text in the image.' },
  { n: '3', title: 'Run & Copy Text', desc: 'Wait a few seconds, then copy or download the text.' }
];

const _FAQS = [
  {
    q: "Is my document text safe?",
    a: "Yes. The OCR parsing is done purely using Tesseract.js Web Workers inside your browser. Your images and text never traverse any network."
  },
  {
    q: "Why does the first run take a bit longer?",
    a: "Tesseract.js downloads the language model file (e.g. eng.traineddata) on the first run, which is cached in your browser indexDB for subsequent instantaneous loads."
  },
  {
    q: "Can it scan handwritten text?",
    a: "It performs best with printed fonts, clean documents, and UI screenshots. Handwritten text may have lower accuracy."
  },
  {
    q: "What languages does the OCR tool support?",
    a: "We support several popular language models, including English, Spanish, French, German, and Simplified Chinese."
  },
  {
    q: "How can I export the extracted text?",
    a: "You can copy the extracted text directly to your clipboard with a single click, or download it as a standard .txt file."
  },
  {
    q: "Does the tool support scanning text from multi-page documents?",
    a: "This OCR tool extracts text from a single uploaded image. For multi-page PDFs, we recommend converting pages to images first before scanning."
  }
];

const LANGUAGES = [
  { val: 'eng', label: 'English' },
  { val: 'spa', label: 'Spanish (Español)' },
  { val: 'fra', label: 'French (Français)' },
  { val: 'deu', label: 'German (Deutsch)' },
  { val: 'chi_sim', label: 'Chinese (简体中文)' }
];

const STATUS_MAP = {
  'loading tesseract api': 'Getting ready...',
  'initialized tesseract api': 'Getting ready...',
  'loading tesseract core': 'Getting ready...',
  'initialized tesseract core': 'Getting ready...',
  'loading language traineddata': 'Loading files... (Please hold)',
  'loaded language traineddata': 'Files loaded!',
  'initializing api': 'Starting scanner...',
  'initialized api': 'Scanner ready!',
  'recognizing text': 'Reading text...'
};

const testIndexedDB = () => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 1000);
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        clearTimeout(timer);
        resolve(false);
        return;
      }
      const request = window.indexedDB.open("test-idb-avail", 1);
      request.onsuccess = () => {
        clearTimeout(timer);
        try {
          window.indexedDB.deleteDatabase("test-idb-avail");
        } catch {}
        resolve(true);
      };
      request.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
};

export default function OcrPage() {
  const [file, setFile] = useState(null);
  const [lang, setLang] = useState('eng');
  const workerRef = useRef(null);
  const [extractedText, setExtractedText] = useState('');
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
      setExtractedText('');
      setProgressStatus('');
      setProgressPercent(0);
      setErrorMsg('');
    } else {
      setFile(null);
      setExtractedText('');
    }
  };

  const runOcr = useCallback(async (active = true) => {
    if (!file) return;

    // Terminate any running worker first
    if (workerRef.current) {
      try {
        await workerRef.current.terminate();
      } catch {}
      workerRef.current = null;
    }

    if (!active) return;
    setIsProcessing(true);
    setErrorMsg('');
    setProgressStatus('Getting ready...');
    setProgressPercent(0);

    const imgSrc = file.preview || URL.createObjectURL(file);

    // Helper to run OCR with specific options
    const attemptOcr = async (useCache) => {
      const worker = await Tesseract.createWorker(lang, 1, {
        cacheMethod: useCache ? 'write' : 'none',
        logger: (m) => {
          if (!active) return;
          
          let displayStatus = 'Getting ready...';
          if (m.status) {
            const lowerStatus = m.status.toLowerCase();
            if (STATUS_MAP[m.status]) {
              displayStatus = STATUS_MAP[m.status];
            } else if (lowerStatus.includes('recognizing') || lowerStatus.includes('recognize')) {
              displayStatus = 'Reading text...';
            } else if (lowerStatus.includes('language') || lowerStatus.includes('traineddata') || lowerStatus.includes('tessdata')) {
              displayStatus = lowerStatus.includes('loaded') ? 'Files loaded!' : 'Loading files... (Please hold)';
            } else if (lowerStatus.includes('tesseract') || lowerStatus.includes('core') || lowerStatus.includes('api')) {
              displayStatus = 'Getting ready...';
            } else {
              displayStatus = m.status.charAt(0).toUpperCase() + m.status.slice(1);
            }
          }
          setProgressStatus(displayStatus);

          if (m.status === 'recognizing text') {
            setProgressPercent(Math.round(m.progress * 100));
          } else {
            setProgressPercent(0);
          }
        }
      });

      workerRef.current = worker;

      const { data: { text } } = await worker.recognize(imgSrc);
      return text;
    };

    // Test IndexedDB support first
    const isIdbSupported = await testIndexedDB();
    
    // Set a timeout of 18 seconds for the cache-enabled attempt
    const TIMEOUT_MS = 18000; 

    try {
      let text;
      if (isIdbSupported) {
        text = await Promise.race([
          attemptOcr(true),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
          )
        ]);
      } else {
        console.warn('IndexedDB not supported or blocked. Bypassing cache.');
        text = await attemptOcr(false);
      }

      if (!active) return;
      setExtractedText(text || 'No text recognized in the image.');
      setProgressStatus('Completed successfully!');
      setProgressPercent(100);
      setIsProcessing(false);
      saveHistory('Image OCR Extractor', `${file.name.slice(0, 16)}_extracted.txt`);

    } catch (err) {
      console.error(err);
      
      if (workerRef.current) {
        try {
          await workerRef.current.terminate();
        } catch {}
        workerRef.current = null;
      }

      if (!active) return;

      if (err.message === 'TIMEOUT') {
        setProgressStatus('Cache initialization timed out. Retrying without cache...');
        try {
          const text = await attemptOcr(false);
          if (!active) return;
          setExtractedText(text || 'No text recognized in the image.');
          setProgressStatus('Completed successfully!');
          setProgressPercent(100);
          setIsProcessing(false);
          saveHistory('Image OCR Extractor', `${file.name.slice(0, 16)}_extracted.txt`);
          return;
        } catch (retryErr) {
          console.error(retryErr);
          if (workerRef.current) {
            try { await workerRef.current.terminate(); } catch {}
            workerRef.current = null;
          }
        }
      }

      if (!active) return;
      setErrorMsg('Error extracting text. Make sure the image is readable and connection is stable.');
      setIsProcessing(false);
    } finally {
      if (workerRef.current) {
        try {
          await workerRef.current.terminate();
        } catch {}
        if (active) {
          workerRef.current = null;
        }
      }
    }
  }, [file, lang]);

  // Run OCR automatically when a file is selected
  useEffect(() => {
    let active = true;
    if (file) {
      runOcr(active);
    }
    return () => {
      active = false;
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {});
      }
    };
  }, [file, lang, runOcr]);

  const copyToClipboard = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const downloadTextFile = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    saveAs(blob, `${baseName}_extracted.txt`);
  };



  return (
    <ToolPageShell
      title="Image OCR Extractor"
      subtitle="Extract text from screenshots, scanned documents, and photos. Runs locally in your browser with complete privacy."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free browser-based Image OCR text extractor. Extract text from screenshots and photos locally using Tesseract.js. Secure, private, and supports multiple languages."
    >
      <div className="flex flex-col gap-6">
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
              multiple={false} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Preview & Lang select */}
            <div className="lg:col-span-5" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Input Document
                </h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">
                  Remove
                </button>
              </div>

              {file.preview && (
                <img
                  src={file.preview}
                  alt="OCR source document"
                  className="w-full object-contain rounded-xl border border-bordercolor shadow-sm"
                  style={{ maxHeight: 380 }}
                />
              )}

              <div className="flex flex-col gap-1.5 pt-2 border-t border-bordercolor/40">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Document Language
                </label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                  disabled={isProcessing}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.val} value={l.val}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column: OCR Results & Progress */}
            <div className="lg:col-span-7" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Extracted Text
                </h4>
                {extractedText && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={copyToClipboard}
                      className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadTextFile}
                      className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download .txt
                    </button>
                  </div>
                )}
              </div>

              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                    <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {progressStatus}
                  </div>
                  
                  {progressPercent > 0 && (
                    <div className="w-64 bg-gray-100 rounded-full h-2 overflow-hidden border border-bordercolor/40">
                      <div 
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                  {progressPercent > 0 && (
                    <span className="text-[10px] text-gray-400 font-bold">{progressPercent}%</span>
                  )}
                </div>
              ) : errorMsg ? (
                <p className="text-xs text-red-500 font-semibold py-12 text-center">{errorMsg}</p>
              ) : (
                <textarea
                  readOnly
                  value={extractedText}
                  placeholder="Extracted text will appear here..."
                  className="w-full h-80 font-mono text-xs text-textmain border border-bordercolor/80 rounded-xl bg-lightbg/10 p-4 focus:outline-none resize-none leading-relaxed"
                />
              )}

              {!isProcessing && !extractedText && !errorMsg && (
                <div className="pt-2">
                  <button
                    onClick={() => runOcr(true)}
                    className="py-3 px-6 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-dark transition-all duration-150"
                  >
                    Run OCR Text Extraction
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
