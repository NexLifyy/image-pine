"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>), title: 'Smart Compression', desc: 'Binary search finds optimal quality for your target.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'Quality Slider', desc: 'Drag from 5% to 100% for full control.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'All compression runs locally.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant Preview', desc: 'Live preview as you adjust settings.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'No Watermarks', desc: 'Clean outputs with no added branding.' }
];

const _STEPS = [
  { n: '1', title: 'Upload JPG', desc: 'Select your JPEG image.' },
  { n: '2', title: 'Set Quality', desc: 'Adjust quality or set target KB.' },
  { n: '3', title: 'Download', desc: 'Download your compressed JPEG.' }
];

const _FAQS = [
  {
    q: "How much file size can I save by compressing a JPG?",
    a: "You can typically reduce JPEG file sizes by 50% to 90% with almost no visible quality loss, depending on the detail level and original compression of your image."
  },
  {
    q: "Will compressing a JPG make it look blurry or pixelated?",
    a: "The tool uses optimized canvas bicubic rendering to maintain sharp details. If you keep the quality slider at 80% or higher, the differences are virtually imperceptible to the human eye."
  },
  {
    q: "Can I compress a JPG to a specific file size (like 100 KB)?",
    a: "Yes. You can input your target file size in the settings panel. The tool will run a fast binary search on the quality scale to find the maximum quality that fits your target size limit."
  },
  {
    q: "Are my photos uploaded to a server for JPEG compression?",
    a: "No. The entire compression routine runs client-side in your web browser. No photos are uploaded or saved on our servers."
  },
  {
    q: "Does this tool preserve EXIF metadata (camera model, GPS coordinates)?",
    a: "To protect your privacy and maximize file size savings, the compressor strips camera EXIF metadata (like GPS location, date taken, and device info) during export."
  },
  {
    q: "What happens if my JPG contains transparent areas?",
    a: "JPG files do not support transparency. If you upload a PNG/WebP with transparent areas, they will automatically be filled with a clean white background."
  }
];

export default function CompressJpgPage() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(80); // 5 to 100
  const [targetSize, setTargetSize] = useState(150); // in KB
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [compressedUrl, setCompressedUrl] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "Does JPG compression reduce visual quality?",
      a: "We use lossy JPG compression which reduces file size dramatically by removing imperceptible detail. Setting it to 80% retains excellent quality."
    },
    {
      q: "Can I compress to a target file size?",
      a: "Yes, select 'Target Size' mode and set the value to compress the JPG exactly to your desired size (e.g. 50 KB)."
    },
    {
      q: "How does the quality slider work?",
      a: "The slider represents compression percentage: 100% is highest quality, and lower percentages decrease quality to yield smaller file sizes."
    },
    {
      q: "Is my privacy secure?",
      a: "Yes, all operations run inside your browser. No files are uploaded to any external server."
    }
  ];

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

  // Set default target size based on uploaded file size
  useEffect(() => {
    if (file) {
      const originalKb = Math.ceil(file.size / 1024);
      setTargetSize(Math.max(10, Math.round(originalKb * 0.7)));
    }
  }, [file]);

  const handleFileSelect = (selectedList) => {
    setErrorMsg('');
    if (selectedList.length > 0) {
      const selected = selectedList[0];
      const nameLower = selected.name.toLowerCase();
      const isValidJpg = nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || selected.type === 'image/jpeg';
      if (!isValidJpg) {
        setErrorMsg('Please upload a valid JPG/JPEG file.');
        setFile(null);
        return;
      }
      setFile(selected);
    } else {
      setFile(null);
    }
    setCompressedBlob(null);
    if (compressedUrl) {
      URL.revokeObjectURL(compressedUrl);
      setCompressedUrl(null);
    }
  };

  // Live compression effect
  useEffect(() => {
    if (!file) return;

    let active = true;
    setIsCompressing(true);
    setErrorMsg('');

    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available.');
        }
        ctx.drawImage(img, 0, 0);

        const targetBytes = targetSize * 1024;
        const targetMime = 'image/jpeg';
        let qualityFactor = quality / 100;

        let currentCanvas = canvas;
        let scale = 1.0;
        let bestBlob = null;
        let attempts = 0;
        const maxAttempts = 6;

        while (attempts < maxAttempts && active) {
          let minQ = 0.05;
          let maxQ = qualityFactor;
          let q = (minQ + maxQ) / 2;
          let iterationBlob = null;
          let iterations = 0;
          const maxIterations = 5;

          while (iterations < maxIterations && active) {
            const blob = await new Promise(resolve => currentCanvas.toBlob(resolve, targetMime, q));
            if (!blob) break;

            if (blob.size <= targetBytes) {
              iterationBlob = blob;
              minQ = q;
              q = (q + maxQ) / 2;
            } else {
              maxQ = q;
              q = (q + minQ) / 2;
            }
            iterations++;
          }

          if (iterationBlob) {
            bestBlob = iterationBlob;
            break;
          }

          const lowestBlob = await new Promise(resolve => currentCanvas.toBlob(resolve, targetMime, 0.05));
          if (lowestBlob && lowestBlob.size <= targetBytes) {
            bestBlob = lowestBlob;
            break;
          }

          // Scale down
          scale *= 0.8;
          const newCanvas = document.createElement('canvas');
          newCanvas.width = Math.max(1, Math.round(canvas.width * scale));
          newCanvas.height = Math.max(1, Math.round(canvas.height * scale));
          const nCtx = newCanvas.getContext('2d');
          if (nCtx) {
            nCtx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
            currentCanvas = newCanvas;
          } else {
            break;
          }
          attempts++;
        }

        if (!bestBlob && active) {
          bestBlob = await new Promise(resolve => currentCanvas.toBlob(resolve, targetMime, qualityFactor));
        }

        if (active && bestBlob) {
          if (compressedUrl) {
            URL.revokeObjectURL(compressedUrl);
          }
          const url = URL.createObjectURL(bestBlob);
          setCompressedBlob(bestBlob);
          setCompressedUrl(url);
          setIsCompressing(false);
        }
      } catch (err) {
        if (active) {
          console.error(err);
          setErrorMsg(err.message || 'Error occurred during image compression.');
          setIsCompressing(false);
        }
      }
    };

    img.onerror = () => {
      if (active) {
        setErrorMsg('Failed to process image source.');
        setIsCompressing(false);
      }
    };

    img.src = file.preview || URL.createObjectURL(file);

    return () => {
      active = false;
    };
  }, [file, targetSize, quality]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (compressedUrl) {
        URL.revokeObjectURL(compressedUrl);
      }
    };
  }, [compressedUrl]);

  const downloadCompressedImage = () => {
    if (!compressedBlob || !file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}_compressed.jpg`;
    
    saveAs(compressedBlob, newName);
    saveHistory('Compress JPG', `${newName} (${formatSize(compressedBlob.size)})`);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getSavingsPercentage = () => {
    if (!file || !compressedBlob) return 0;
    const diff = file.size - compressedBlob.size;
    if (diff <= 0) return 0;
    return Math.round((diff / file.size) * 100);
  };

  const originalKb = file ? Math.ceil(file.size / 1024) : 1000;

  return (
    <ToolPageShell
      title="Compress JPG"
      subtitle="Reduce JPEG file sizes without visible quality loss. Set target KB or adjust quality manually."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Compress JPEG images online for free. Reduce JPG sizes by up to 80% with quality control. Browser-based, no uploads."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {/* Conditional Workspace */}
        {!file ? (
          /* Initial Upload Box View */
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg']}
              multiple={false} 
            />
            {errorMsg && (
              <p className="text-xs text-red-500 font-semibold text-center mt-3">
                {errorMsg}
              </p>
            )}
          </div>
        ) : (
          /* Active Resizing Studio Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: File Details */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Uploaded File
                </h3>
                <button
                  onClick={() => handleFileSelect([])}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>

              {/* Uploaded file preview info */}
              <div className="p-3 bg-lightbg/45 border border-bordercolor/60 rounded-xl flex items-center gap-3">
                {file.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.preview}
                    alt="Original Thumb"
                    className="w-12 h-12 object-cover rounded-lg border border-bordercolor"
                  />
                )}
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    Original Size: {formatSize(file.size)}
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Column: Large Preview */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Compressed Preview
                  </h4>
                  <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
                    {compressedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={compressedUrl}
                        alt="Compressed Preview"
                        style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                        <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Optimizing...
                      </div>
                    )}
                  </div>
            </div>

            {/* Right Column: Controls & Settings */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Compress By panel (sliders) */}
                  <div className="bg-lightbg/40 border border-bordercolor rounded-xl p-4 flex flex-col gap-4">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Compress By
                    </span>

                    {/* Max File Size (KB) Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-textmain">
                          Max File Size (KB)
                        </label>
                        <span className="text-xs font-mono font-black text-primary">
                          {targetSize} KB
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max={originalKb}
                        value={targetSize}
                        onChange={(e) => setTargetSize(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Quality Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-textmain">
                          Quality
                        </label>
                        <span className="text-xs font-mono font-black text-primary">
                          {quality}%
                        </span>
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
                  </div>

                  {/* Live Comparison Gauge */}
                  {compressedBlob && (
                    <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-3">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Before & After Sizes</span>
                        <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                          <span>Original:</span>
                          <span className="font-mono text-gray-500">{formatSize(file.size)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold text-textmain mt-1">
                          <span>Compressed:</span>
                          <span className="font-mono text-primary font-bold">{formatSize(compressedBlob.size)}</span>
                        </div>
                      </div>

                      {/* Savings Percentage Metric Tag */}
                      {getSavingsPercentage() > 0 ? (
                        <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-lg p-2.5 flex items-center justify-between">
                          <span>Size Reduction:</span>
                          <span className="font-mono font-black">-{getSavingsPercentage()}%</span>
                        </div>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold rounded-lg p-2.5">
                          Compressed size matches original size. Slide target size or quality to decrease size.
                        </div>
                      )}
                    </div>
                  )}

                  {errorMsg && (
                    <p className="text-xs text-red-500 font-semibold leading-relaxed">
                      {errorMsg}
                    </p>
                  )}

                  {/* Download Button */}
                  <div className="pt-3 border-t border-bordercolor/60">
                    <button
                      type="button"
                      onClick={downloadCompressedImage}
                      disabled={isCompressing || !compressedBlob}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Compressed JPG
                    </button>
                  </div>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
