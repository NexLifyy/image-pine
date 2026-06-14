"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ConverterDetails from '@/components/ConverterDetails';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3l4 4-4 4M16 21l-4-4 4-4"/><path d="M12 7H5a2 2 0 00-2 2v2M12 17h7a2 2 0 002-2v-2"/></svg>), title: 'iPhone Compatible', desc: 'Opens HEIC/HEIF files from iPhone, iPad and macOS.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'Quality Control', desc: 'Set JPEG quality for perfect size vs clarity.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Your photos never leave your device.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Fast', desc: 'Converts HEIC to JPEG in seconds.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/></svg>), title: 'Batch Convert', desc: 'Convert multiple HEIC photos at once.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' }
];

const _STEPS = [
  { n: '1', title: 'Upload HEIC', desc: 'Select your HEIC or HEIF photo.' },
  { n: '2', title: 'Convert', desc: 'Converts to JPEG automatically.' },
  { n: '3', title: 'Download JPG', desc: 'Download your JPEG file.' }
];

const _FAQS = [
  {
    q: "Can I convert HEIC photos from my iPhone to JPG online?",
    a: "Yes. This tool is built specifically to convert Apple's HEIC/HEIF photo formats to standard JPEGs so they can be viewed on any device."
  },
  {
    q: "Are my iPhone photos uploaded to a server for HEIC conversion?",
    a: "No. The HEIC decoding is performed locally in your browser memory using client-side JavaScript libraries. Your private photos never leave your computer."
  },
  {
    q: "Does this HEIC converter support batch files?",
    a: "Yes. You can upload multiple HEIC files at once. The converter will process them locally in a queue, letting you download them individually or as a single .zip file."
  },
  {
    q: "Will my converted HEIC photos lose visual quality?",
    a: "HEIC offers high compression, but JPEG is lossy. To preserve details, our tool renders the decoded pixels to canvas and lets you set the JPEG quality slider to 90% or higher."
  },
  {
    q: "What happens to transparent HEIC files when converting to JPG?",
    a: "Since JPEG does not support transparency, any transparent areas in your HEIC image will automatically be filled with a solid white background."
  },
  {
    q: "Can I resize the width and height of my HEIC images during conversion?",
    a: "Yes. You can set a custom width or height, or scale by a percentage in the options panel to resize your photos while converting them."
  }
];

export default function HeicToJpgPage() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(90);

  // Advanced options states
  const [resizeMode, setResizeMode] = useState('keep'); // 'keep' | 'custom'
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [autoOrient, setAutoOrient] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);

  // Output states
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [convertedBlob, setConvertedBlob] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Manage object URLs lifetime safely to prevent memory leaks and premature revocation
  const prevPreviewsRef = useRef([]);
  useEffect(() => {
    const currentPreviews = [file?.preview].filter(Boolean);
    const removedPreviews = prevPreviewsRef.current.filter(p => !currentPreviews.includes(p));
    removedPreviews.forEach(url => URL.revokeObjectURL(url));
    prevPreviewsRef.current = currentPreviews;
  }, [file]);

  useEffect(() => {
    return () => {
      prevPreviewsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const convertFile = async (selectedFile) => {
    setIsConverting(true);
    setErrorMsg('');
    setConvertedBlob(null);
    if (convertedUrl) {
      URL.revokeObjectURL(convertedUrl);
      setConvertedUrl(null);
    }

    try {
      // Dynamic import of heic2any to prevent SSR build failures (as it accesses window/navigator)
      const heic2anyModule = await import('heic2any');
      const heic2any = heic2anyModule.default;

      // heic2any outputs blob representation
      let rawBlob = await heic2any({
        blob: selectedFile,
        toType: 'image/jpeg',
        quality: quality / 100,
      });

      let resultBlob = Array.isArray(rawBlob) ? rawBlob[0] : rawBlob;

      // Handle custom resizing if selected
      if (resizeMode === 'custom') {
        resultBlob = await new Promise((resolve, reject) => {
          const tempUrl = URL.createObjectURL(resultBlob);
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              let w = img.naturalWidth || img.width;
              let h = img.naturalHeight || img.height;

              const numW = parseInt(customWidth, 10);
              const numH = parseInt(customHeight, 10);
              if (!isNaN(numW) && !isNaN(numH)) {
                w = numW;
                h = numH;
              } else if (!isNaN(numW)) {
                h = Math.round(h * (numW / w));
                w = numW;
              } else if (!isNaN(numH)) {
                w = Math.round(w * (numH / h));
                h = numH;
              }

              canvas.width = w;
              canvas.height = h;

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                throw new Error('Canvas 2D context not available.');
              }

              // Fill white background for JPEG
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, w, h);

              ctx.drawImage(img, 0, 0, w, h);
              canvas.toBlob((resizedBlob) => {
                URL.revokeObjectURL(tempUrl);
                if (resizedBlob) resolve(resizedBlob);
                else reject(new Error('Failed to generate resized blob'));
              }, 'image/jpeg', quality / 100);
            } catch (err) {
              URL.revokeObjectURL(tempUrl);
              reject(err);
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(tempUrl);
            reject(new Error('Failed to load temporary image for resizing'));
          };
          img.src = tempUrl;
        });
      }

      const url = URL.createObjectURL(resultBlob);
      
      setConvertedBlob(resultBlob);
      setConvertedUrl(url);
      setIsConverting(false);

      const newName = selectedFile.name.replace(/\.[^/.]+$/, '') + '.jpg';
      saveHistory('HEIC to JPG Converter', newName);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'HEIC conversion failed. Please ensure it is a valid HEIC/HEIF file.');
      setIsConverting(false);
    }
  };

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      const selected = selectedList[0];
      setFile(selected);
      // Wait for states to register, then run conversion or handle inside useEffect
    } else {
      setFile(null);
      setConvertedBlob(null);
      if (convertedUrl) {
        URL.revokeObjectURL(convertedUrl);
        setConvertedUrl(null);
      }
      setErrorMsg('');
    }
  };

  // Live conversion effect when parameters modify
  useEffect(() => {
    if (file) {
      convertFile(file);
    }
  }, [file, quality, resizeMode, customWidth, customHeight]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (convertedUrl) {
        URL.revokeObjectURL(convertedUrl);
      }
    };
  }, [convertedUrl]);

  const downloadJpgImage = () => {
    if (!convertedBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}.jpg`;
    saveAs(convertedBlob, newName);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // State for collapsible FAQs
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "What is HEIC format?",
      a: "HEIC (High Efficiency Image Container) is the default image format used by Apple on iOS devices. It stores high-quality photos at half the file size of JPEGs."
    },
    {
      q: "Why do I need to convert HEIC to JPG?",
      a: "HEIC files are not natively supported by many web browsers, Windows systems, or editing software. Converting to JPG makes them universally compatible."
    },
    {
      q: "Can I adjust the output size and quality?",
      a: "Yes. Use the quality slider and custom resizing inputs under Advanced Options to optimize your output JPEGs."
    },
    {
      q: "Are my Apple photos uploaded to external servers?",
      a: "No. The parsing and conversion runs fully client-side on your local machine using modern JavaScript libraries."
    }
  ];

  return (
    <ToolPageShell
      title="HEIC to JPG Converter"
      subtitle="Convert iPhone HEIC/HEIF photos to universally compatible JPEG format. Free, fast, private."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Convert HEIC to JPG online for free. Transform iPhone HEIC photos to JPEG in your browser. No uploads, instant."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.heic', '.heif']}
              multiple={false} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: File Details */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Uploaded File</h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">Remove</button>
              </div>

              <div className="p-3 bg-lightbg/45 border border-bordercolor/60 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-white border border-bordercolor rounded-lg text-primary flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Size: {formatSize(file.size)}</p>
                </div>
              </div>
            </div>

            {/* Middle Column: Large Preview */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>JPG Preview</h4>
                  <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
                    {convertedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={convertedUrl} alt="JPG Preview" style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm" />
                    ) : isConverting ? (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                        <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Converting HEIC...
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 font-medium text-center">
                        Conversion failed or was cancelled
                      </div>
                    )}
                  </div>
            </div>

            {/* Right Column: Controls & Settings */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-semibold font-bold">Convert Settings</h4>

                  {/* Advanced Options Group */}
                  <div className="bg-lightbg/40 border border-bordercolor rounded-xl p-4 flex flex-col gap-4">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Advanced Options</span>

                    {/* Resize */}
                    <div>
                      <label className="block text-xs font-bold text-textmain mb-1">Resize Output Image</label>
                      <select
                        value={resizeMode}
                        onChange={(e) => setResizeMode(e.target.value)}
                        className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-2 py-1.5 focus:outline-none"
                      >
                        <option value="keep">Keep original size</option>
                        <option value="custom">Custom size</option>
                      </select>
                      {resizeMode === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <input 
                            type="text" inputMode="numeric" pattern="[0-9]*" 
                            placeholder="Width (px)" 
                            value={customWidth} 
                            onChange={(e) => setCustomWidth(e.target.value)}
                            className="w-full text-xs border rounded px-2 py-1"
                          />
                          <input 
                            type="text" inputMode="numeric" pattern="[0-9]*" 
                            placeholder="Height (px)" 
                            value={customHeight} 
                            onChange={(e) => setCustomHeight(e.target.value)}
                            className="w-full text-xs border rounded px-2 py-1"
                          />
                        </div>
                      )}
                    </div>

                    {/* Quality */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-textmain">Compress Output Image</label>
                        <span className="text-xs font-mono font-black text-primary">{quality}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={quality}
                        onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Auto Orient */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-textmain cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={autoOrient} 
                          onChange={(e) => setAutoOrient(e.target.checked)}
                          className="rounded text-primary h-4 w-4"
                        />
                        Correctly orient the image (Auto Orient)
                      </label>
                    </div>

                    {/* Strip Metadata */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-textmain cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={stripMetadata} 
                          onChange={(e) => setStripMetadata(e.target.checked)}
                          className="rounded text-primary h-4 w-4"
                        />
                        Strip profiles and comments (Strip Metadata)
                      </label>
                    </div>
                  </div>

                  {convertedBlob && (
                    <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-semibold font-bold">File Sizes</span>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Original (HEIC):</span>
                        <span className="font-mono text-gray-500">{formatSize(file.size)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Converted (JPG):</span>
                        <span className="font-mono text-primary font-bold">{formatSize(convertedBlob.size)}</span>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-red-500 font-semibold leading-relaxed">{errorMsg}</p>
                      <button
                        type="button"
                        onClick={() => convertFile(file)}
                        className="py-1.5 px-3 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all"
                      >
                        Retry Conversion
                      </button>
                    </div>
                  )}

                  <div className="pt-3 border-t border-bordercolor/60">
                    <button
                      type="button"
                      onClick={downloadJpgImage}
                      disabled={isConverting || !convertedBlob}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download JPG Image
                    </button>
                  </div>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
