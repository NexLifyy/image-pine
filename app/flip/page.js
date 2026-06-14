"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3M12 3v18"/></svg>), title: 'Horizontal & Vertical', desc: 'Mirror along either axis or both simultaneously.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>), title: 'Live Preview', desc: 'See the flipped result instantly.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'All flipping happens locally.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'All Formats', desc: 'Supports JPEG, PNG, WebP, SVG.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Canvas flip finishes in milliseconds.' }
];

const _STEPS = [
  { n: '1', title: 'Upload', desc: 'Upload your image.' },
  { n: '2', title: 'Flip', desc: 'Click Horizontal or Vertical flip.' },
  { n: '3', title: 'Download', desc: 'Download your flipped image.' }
];

const _FAQS = [
  { q: 'Can I flip both axes?', a: 'Yes - apply both flips simultaneously.' },
  { q: 'Does flipping reduce quality?', a: 'No. The Canvas flip transform is lossless.' },
  { q: 'Are images uploaded?', a: 'Never. Everything runs in your browser.' }
];

export default function FlipPage() {
  const [file, setFile] = useState(null);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  
  // Output states
  const [flippedBlob, setFlippedBlob] = useState(null);
  const [flippedUrl, setFlippedUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "What is the difference between horizontal and vertical flipping?",
      a: "Horizontal flipping mirrors the image left-to-right (perfect for fixing selfie perspective), while vertical flipping turns the image upside-down."
    },
    {
      q: "Can I apply both horizontal and vertical flips together?",
      a: "Yes. Toggling both options simultaneously will effectively rotate the image 180 degrees via reflection."
    },
    {
      q: "Does flipping reduce image quality?",
      a: "Not at all. The pixel values are mirrored locally on a canvas element, maintaining exact original pixel dimensions and colors."
    },
    {
      q: "Is my privacy protected?",
      a: "Yes, all processing is done client-side using JavaScript. Your files are never sent to external servers."
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

  // Handle file select from UploadBox
  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
    } else {
      setFile(null);
    }
    setFlipH(false);
    setFlipV(false);
    setFlippedBlob(null);
    if (flippedUrl) {
      URL.revokeObjectURL(flippedUrl);
      setFlippedUrl(null);
    }
    setErrorMsg('');
  };

  // Run live flip canvas transformation whenever file, flipH or flipV changes
  useEffect(() => {
    if (!file) return;

    let active = true;
    setIsProcessing(true);
    setErrorMsg('');

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available.');
        }

        // Fill white background for JPEG
        const mime = file.type || 'image/jpeg';
        if (mime === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        // Apply flip transformations:
        // Translate context origin to flip axis before scaling by -1
        ctx.translate(flipH ? width : 0, flipV ? height : 0);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

        // Draw image onto transformed context
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!active) return;
            if (!blob) {
              throw new Error('Failed to generate flipped blob.');
            }

            if (flippedUrl) {
              URL.revokeObjectURL(flippedUrl);
            }

            const url = URL.createObjectURL(blob);
            setFlippedBlob(blob);
            setFlippedUrl(url);
            setIsProcessing(false);
          },
          file.type || 'image/jpeg',
          0.95
        );
      } catch (err) {
        if (active) {
          console.error(err);
          setErrorMsg(err.message || 'Error occurred during image flipping.');
          setIsProcessing(false);
        }
      }
    };

    img.onerror = () => {
      if (active) {
        setErrorMsg('Failed to process image source.');
        setIsProcessing(false);
      }
    };

    img.src = file.preview || URL.createObjectURL(file);

    return () => {
      active = false;
    };
  }, [file, flipH, flipV]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (flippedUrl) {
        URL.revokeObjectURL(flippedUrl);
      }
    };
  }, [flippedUrl]);

  const downloadFlippedImage = () => {
    if (!flippedBlob || !file) return;
    
    const extension = file.name.split('.').pop();
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    
    // Build suffix based on flipping
    let suffix = '';
    if (flipH) suffix += '_hflip';
    if (flipV) suffix += '_vflip';
    if (!flipH && !flipV) suffix += '_flipped';

    const newName = `${baseName}${suffix}.${extension}`;
    
    saveAs(flippedBlob, newName);
    
    // Log tool history
    saveHistory('Flip Image', newName);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <ToolPageShell
      title="Flip Image"
      subtitle="Flip any image horizontally or vertically in one click. Live preview, no upload required. Free and 100% private."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Flip images online for free. Mirror JPEG, PNG or WebP horizontally or vertically. Browser-based, no uploads."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {/* Conditional Workspace */}
        {!file ? (
          /* Initial Upload Box View */
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
              multiple={false} 
            />
          </div>
        ) : (
          /* Active Studio Grid */
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
                    Live Preview
                  </h4>
                  <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
                    {flippedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={flippedUrl}
                        alt="Flipped Preview"
                        style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                        <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Flipping...
                      </div>
                    )}
                  </div>
            </div>

            {/* Right Column: Controls & Settings */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Flip Settings
                  </h4>

                  {/* Flipping buttons */}
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setFlipH(!flipH)}
                      className={`w-full py-2.5 px-4 rounded-lg border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                        flipH
                          ? 'border-primary bg-blue-50 text-primary shadow-sm'
                          : 'border-bordercolor bg-white hover:border-gray-400 text-textmain'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Flip Horizontal {flipH ? '(On)' : '(Off)'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFlipV(!flipV)}
                      className={`w-full py-2.5 px-4 rounded-lg border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                        flipV
                          ? 'border-primary bg-blue-50 text-primary shadow-sm'
                          : 'border-bordercolor bg-white hover:border-gray-400 text-textmain'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      Flip Vertical {flipV ? '(On)' : '(Off)'}
                    </button>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-500 font-semibold leading-relaxed">
                      {errorMsg}
                    </p>
                  )}

                  {/* Action Button */}
                  <div className="pt-3 border-t border-bordercolor/60">
                    <button
                      type="button"
                      onClick={downloadFlippedImage}
                      disabled={isProcessing || !flippedBlob}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Flipped Image
                    </button>
                  </div>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
