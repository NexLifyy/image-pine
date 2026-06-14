"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ConverterDetails from '@/components/ConverterDetails';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3l4 4-4 4M16 21l-4-4 4-4"/><path d="M12 7H5a2 2 0 00-2 2v2M12 17h7a2 2 0 002-2v-2"/></svg>), title: 'Smaller File Size', desc: 'JPEG gives dramatically smaller files than PNG for photos.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'Quality Control', desc: 'Set JPEG quality from 5% to 100%.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Runs entirely in your browser.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Canvas conversion in milliseconds.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/></svg>), title: 'Batch Convert', desc: 'Convert multiple PNGs in one session.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No registration, no watermark.' }
];

const _STEPS = [
  { n: '1', title: 'Upload PNG', desc: 'Select or drag your PNG.' },
  { n: '2', title: 'Set Quality', desc: 'Adjust JPEG quality.' },
  { n: '3', title: 'Download JPG', desc: 'Save your JPEG file.' }
];

const _FAQS = [
  {
    q: "What happens to transparent backgrounds when converting PNG to JPG?",
    a: "Since JPEG does not support transparency, all transparent areas in your PNG will be filled with a solid white background."
  },
  {
    q: "Does converting PNG to JPG reduce the image quality?",
    a: "PNG is lossless while JPG is lossy. You can adjust the quality slider to 95% or higher to minimize compression artifacts and keep details sharp."
  },
  {
    q: "Can I set a target file size (e.g. under 100 KB) for the JPG output?",
    a: "Yes. You can specify a target size limit in KB or MB, and the tool will automatically adjust quality to fit the target size."
  },
  {
    q: "Are my PNG files uploaded to a server for JPG conversion?",
    a: "No. The file parsing, transparency filling, and JPEG encoding are done entirely in your browser sandbox."
  },
  {
    q: "Can I convert multiple PNGs to JPGs in one batch?",
    a: "Yes. You can batch upload multiple PNGs and download them individually or inside a single .zip file."
  },
  {
    q: "Can I resize the dimensions of my PNG during the conversion?",
    a: "Yes. You can enter custom width/height values or use percentage scaling in the settings before converting."
  }
];

export default function PngToJpgPage() {
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

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
    } else {
      setFile(null);
    }
    setConvertedBlob(null);
    if (convertedUrl) {
      URL.revokeObjectURL(convertedUrl);
      setConvertedUrl(null);
    }
    setErrorMsg('');
  };

  useEffect(() => {
    if (!file) return;

    let active = true;
    setIsConverting(true);
    setErrorMsg('');

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        if (resizeMode === 'custom') {
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
        }

        canvas.width = w;
        canvas.height = h;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available.');
        }

        // Fill background white because JPEG doesn't support alpha transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (!active) return;
            if (!blob) {
              throw new Error('Failed to generate JPEG blob.');
            }

            if (convertedUrl) {
              URL.revokeObjectURL(convertedUrl);
            }

            const url = URL.createObjectURL(blob);
            setConvertedBlob(blob);
            setConvertedUrl(url);
            setIsConverting(false);
          },
          'image/jpeg',
          quality / 100
        );
      } catch (err) {
        if (active) {
          console.error(err);
          setErrorMsg(err.message || 'Error occurred during conversion.');
          setIsConverting(false);
        }
      }
    };

    img.onerror = () => {
      if (active) {
        setErrorMsg('Failed to process image source.');
        setIsConverting(false);
      }
    };

    img.src = file.preview || URL.createObjectURL(file);

    return () => {
      active = false;
    };
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
    saveHistory('PNG to JPG Converter', newName);
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
      q: "Will my transparent PNG background remain transparent in JPG?",
      a: "No. The JPG format does not support transparency. Any transparent background in your original PNG image will automatically be converted to a solid white background."
    },
    {
      q: "Can I adjust the file size of the output JPG?",
      a: "Yes! Use the quality slider under Advanced Options to adjust quality settings. Lowering quality values will result in smaller file sizes."
    },
    {
      q: "Is it possible to resize the image during conversion?",
      a: "Yes, you can select 'Custom size' in the Resize dropdown to enter custom Width or Height dimensions in pixels."
    },
    {
      q: "Are my files stored on your servers?",
      a: "No. Your conversion takes place entirely client-side inside your browser, ensuring absolute security and privacy."
    }
  ];

  return (
    <ToolPageShell
      title="PNG to JPG Converter"
      subtitle="Convert PNG images to JPEG format to reduce file size. Free, browser-based, no upload required."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Convert PNG to JPG online for free. Transform PNG to smaller JPEG with adjustable quality. Browser-based, no uploads."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.png']}
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
                {file.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.preview} alt="Original Thumb" className="w-12 h-12 object-cover rounded-lg border border-bordercolor" />
                )}
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
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                        <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Converting...
                      </div>
                    )}
                  </div>
            </div>

            {/* Right Column: Controls & Settings */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Convert Settings</h4>

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
                            className="w-full text-xs border rounded px-2 py-1 focus:outline-none"
                          />
                          <input 
                            type="text" inputMode="numeric" pattern="[0-9]*" 
                            placeholder="Height (px)" 
                            value={customHeight} 
                            onChange={(e) => setCustomHeight(e.target.value)}
                            className="w-full text-xs border rounded px-2 py-1 focus:outline-none"
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
                        <span>Original (PNG):</span>
                        <span className="font-mono text-gray-500">{formatSize(file.size)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Converted (JPG):</span>
                        <span className="font-mono text-primary font-bold">{formatSize(convertedBlob.size)}</span>
                      </div>
                    </div>
                  )}

                  {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

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
