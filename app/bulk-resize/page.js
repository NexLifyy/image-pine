"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import { getMimeForSaveFormat, getExtensionForMime, compressCanvasToBlob } from '@/lib/imageUtils';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/></svg>), title: 'Batch Processing', desc: 'Resize up to 50 images simultaneously.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>), title: 'Exact Dimensions', desc: 'Set precise width and height with aspect-ratio lock.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'All images processed locally.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Fast', desc: 'Canvas-based parallel processing in seconds.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'Multiple Formats', desc: 'Resize JPEG, PNG, WebP.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No registration, no watermark.' }
];

const _STEPS = [
  { n: '1', title: 'Upload Images', desc: 'Drag & drop or select multiple images at once.' },
  { n: '2', title: 'Set Dimensions', desc: 'Enter the target width and height.' },
  { n: '3', title: 'Download All', desc: 'Download each resized image.' }
];

const _FAQS = [
  { q: 'How many images at once?', a: 'Up to 50 images per batch.' },
  { q: 'Same size for all?', a: 'Yes - one target dimension applied to all.' },
  { q: 'Are images uploaded?', a: 'No. Everything runs in your browser.' }
];

export default function BulkResizePage() {
  const [files, setFiles] = useState([]);

  // Manage object URLs lifetime safely to prevent memory leaks and premature revocation
  const prevPreviewsRef = useRef([]);
  useEffect(() => {
    const currentPreviews = files.map(f => f.preview).filter(Boolean);
    const removedPreviews = prevPreviewsRef.current.filter(p => !currentPreviews.includes(p));
    removedPreviews.forEach(url => URL.revokeObjectURL(url));
    prevPreviewsRef.current = currentPreviews;
  }, [files]);

  useEffect(() => {
    return () => {
      prevPreviewsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);
  const [widthInput, setWidthInput] = useState('800');
  const [heightInput, setHeightInput] = useState('600');
  
  // Settings States
  const [resizeAsPercentage, setResizeAsPercentage] = useState(false);
  const [percentageValue, setPercentageValue] = useState('50');
  const [lockRatio, setLockRatio] = useState(true);
  const [targetSizeInput, setTargetSizeInput] = useState('');
  const [targetSizeUnit, setTargetSizeUnit] = useState('KB');
  const [saveFormat, setSaveFormat] = useState('Original');
  
  // Resizing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [resizedFiles, setResizedFiles] = useState([]); // Array of { name: string, blob: Blob }
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "How many images can I bulk resize at once?",
      a: "There is no strict limit. You can upload multiple images (e.g. 10 to 50+) and scale them simultaneously in a single batch."
    },
    {
      q: "Can I set a target file size in bulk?",
      a: "Yes, you can set a target file size (e.g. 200 KB) and the engine will apply it to all processed images in the queue."
    },
    {
      q: "How do I download the bulk resized files?",
      a: "After resizing is complete, click the 'Download Resized Images (ZIP)' button to save all processed files consolidated in a single zip archive."
    },
    {
      q: "Is my privacy protected during bulk resizing?",
      a: "Absolutely. All batch processing occurs client-side. No images are uploaded to any database."
    }
  ];

  // Handle files selected from UploadBox
  const handleFileSelect = (selectedList) => {
    setFiles(selectedList);
    // Reset process states on new upload
    setIsProcessing(false);
    setProcessedCount(0);
    setResizedFiles([]);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const resizeImage = (file, targetWidth, targetHeight) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          let w, h;
          if (resizeAsPercentage) {
            const pct = parseFloat(percentageValue) || 100;
            w = Math.round((img.naturalWidth || img.width) * pct / 100);
            h = Math.round((img.naturalHeight || img.height) * pct / 100);
          } else if (lockRatio) {
            const imgW = img.naturalWidth || img.width;
            const imgH = img.naturalHeight || img.height;
            const scale = Math.min(targetWidth / imgW, targetHeight / imgH);
            w = Math.round(imgW * scale);
            h = Math.round(imgH * scale);
          } else {
            w = targetWidth;
            h = targetHeight;
          }

          if (w <= 0) w = 1;
          if (h <= 0) h = 1;

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context not available'));
            return;
          }
          
          // Draw image to canvas to scale it
          ctx.drawImage(img, 0, 0, w, h);
          
          const targetMime = getMimeForSaveFormat(saveFormat, file.type);
          const targetBytes = targetSizeInput && parseFloat(targetSizeInput) > 0
            ? parseFloat(targetSizeInput) * (targetSizeUnit === 'MB' ? 1024 * 1024 : 1024)
            : null;

          compressCanvasToBlob(canvas, targetMime, targetBytes)
            .then(({ blob, mime }) => {
              if (!blob) {
                reject(new Error('Canvas to Blob conversion failed'));
                return;
              }
              resolve({ blob, mime, w, h });
            })
            .catch(reject);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image source'));
      };
      
      img.src = file.preview || URL.createObjectURL(file);
    });
  };

  const processBulkResize = async () => {
    if (files.length === 0) return;

    const targetWidth = parseInt(widthInput, 10);
    const targetHeight = parseInt(heightInput, 10);

    if (!resizeAsPercentage) {
      if (isNaN(targetWidth) || targetWidth <= 0 || isNaN(targetHeight) || targetHeight <= 0) {
        setErrorMsg('Please enter valid width and height values greater than 0.');
        return;
      }
    } else {
      const pct = parseFloat(percentageValue);
      if (isNaN(pct) || pct <= 0) {
        setErrorMsg('Please enter a valid percentage greater than 0.');
        return;
      }
    }

    setIsProcessing(true);
    setProcessedCount(0);
    setResizedFiles([]);
    setErrorMsg('');
    setSuccessMsg('');

    const results = [];
    let count = 0;

    for (const item of files) {
      try {
        const { blob, mime, w, h } = await resizeImage(item, targetWidth, targetHeight);
        
        // Formulate new name
        const extension = getExtensionForMime(mime, item.name);
        const baseName = item.name.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}_${w}x${h}.${extension}`;
        
        results.push({
          name: newName,
          blob: blob,
        });
        
        count++;
        setProcessedCount(count);
      } catch (err) {
        console.error(`Failed to resize ${item.name}:`, err);
        setErrorMsg(`Failed to resize some images. Proceeding with others...`);
      }
    }

    setResizedFiles(results);
    setIsProcessing(false);

    if (results.length > 0) {
      setSuccessMsg(`Successfully resized ${results.length} of ${files.length} images! Click download below.`);
    }
  };

  const downloadAllAsZip = async () => {
    if (resizedFiles.length === 0) return;

    try {
      // Dynamic import of jszip for browser safety
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();

      // Add all resized blobs to ZIP
      resizedFiles.forEach((file) => {
        zip.file(file.name, file.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const outputName = `${zipNameInput() || 'resized-images'}.zip`;
      saveAs(zipBlob, outputName);

      // Log tool history
      saveHistory('Bulk Resize', `${outputName} (${resizedFiles.length} images)`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to build ZIP archive. Please try again.');
    }
  };

  const zipNameInput = () => {
    if (resizeAsPercentage) {
      return `resized_images_${percentageValue}pct`;
    }
    return `resized_images_${widthInput}x${heightInput}`;
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
      title="Bulk Image Resizer"
      subtitle="Resize multiple images to the same dimensions in one go. Upload up to 50 images and download them all instantly."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Bulk resize multiple images at once for free. Upload up to 50 JPEG, PNG, or WebP files and resize them all to the same width and height instantly. Browser-based, no upload required, completely private"
    >
      <div className="flex flex-col gap-6">
        {/* Header Title */}
        <div className="text-center mb-6 max-w-2xl mx-auto">
          <h2 className="font-black text-3xl text-textmain">Bulk Image Resizer</h2>
          <p className="text-sm text-gray-400 mt-2 font-medium">Bulk resize photos to quickly change dimensions or file size.</p>
        </div>

        {/* Conditional Workspace */}
        {files.length === 0 ? (
          /* Initial Upload Box View */
          <div style={{ maxWidth: 680, margin: "0 auto", background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "48px 40px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", minHeight: 260 }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
              multiple={true} 
            />
          </div>
        ) : (
          /* Active Resizing Studio Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Image Files Selection List */}
            <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "22px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Selected Images ({files.length})
                </h3>
                <button
                  onClick={() => handleFileSelect([])}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Clear All
                </button>
              </div>

              {/* Scrollable list of thumbnails */}
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 bg-lightbg/45 border border-bordercolor/60 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.preview}
                          alt="Thumb"
                          className="w-10 h-10 object-cover rounded-lg border border-bordercolor"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white border border-bordercolor text-primary flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-textmain truncate max-w-[130px]" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[9.5px] text-gray-400 font-medium mt-0.5">
                          {formatSize(file.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Bulk Resizer Controller Console */}
            <div style={{ gridColumn: "span 2 / span 2", background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 22 }}>
              
              <div>
                <h3 className="font-extrabold text-sm text-textmain">Bulk Resizer Configuration</h3>
                <p className="text-xs text-gray-400 mt-0.5">Set the dimensions that will be applied to all uploaded images</p>
              </div>

              {/* Side-by-Side Tabs */}
              <div className="flex bg-lightbg p-1 rounded-lg border border-bordercolor">
                <button
                  type="button"
                  onClick={() => setResizeAsPercentage(false)}
                  disabled={isProcessing}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    !resizeAsPercentage
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-400 hover:text-textmain'
                  } disabled:opacity-60`}
                >
                  By Size
                </button>
                <button
                  type="button"
                  onClick={() => setResizeAsPercentage(true)}
                  disabled={isProcessing}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    resizeAsPercentage
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-400 hover:text-textmain'
                  } disabled:opacity-60`}
                >
                  As Percentage
                </button>
              </div>

              {/* Range Slider for Percentage */}
              {resizeAsPercentage && (
                <div className="bg-lightbg/40 border border-bordercolor rounded-xl p-3.5 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                    <span>Percentage Scale</span>
                    <span className="font-mono font-bold text-primary">
                      {percentageValue}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="1"
                    value={percentageValue}
                    onChange={(e) => setPercentageValue(e.target.value)}
                    disabled={isProcessing}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-60"
                  />
                </div>
              )}

              {/* Dimensions Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Target Width (px)
                  </label>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    value={widthInput}
                    onChange={(e) => setWidthInput(e.target.value)}
                    disabled={isProcessing || resizeAsPercentage}
                    className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary disabled:opacity-60"
                    placeholder="Enter Width"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Target Height (px)
                  </label>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    disabled={isProcessing || resizeAsPercentage}
                    className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary disabled:opacity-60"
                    placeholder="Enter Height"
                  />
                </div>
              </div>

              {/* Aspect Ratio Checkbox */}
              {!resizeAsPercentage && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="ratioLock"
                    checked={lockRatio}
                    onChange={(e) => setLockRatio(e.target.checked)}
                    disabled={isProcessing}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary accent-primary disabled:opacity-60"
                  />
                  <label htmlFor="ratioLock" className="text-xs font-bold text-textmain select-none cursor-pointer">
                    Lock aspect ratio (resizes to fit bounds)
                  </label>
                </div>
              )}

              {/* Export Settings Section */}
              <div className="flex flex-col gap-4 pt-4 border-t border-bordercolor/60">
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Export Settings
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  {/* Target File Size */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Target file size (optional)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text" inputMode="numeric" pattern="[0-9]*"
                        value={targetSizeInput}
                        onChange={(e) => setTargetSizeInput(e.target.value)}
                        disabled={isProcessing}
                        className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-2.5 py-2 focus:outline-none focus:border-primary disabled:opacity-60"
                        placeholder="Size"
                        min="1"
                      />
                      <select
                        value={targetSizeUnit}
                        onChange={(e) => setTargetSizeUnit(e.target.value)}
                        disabled={isProcessing}
                        className="text-[10px] font-bold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-1.5 py-2 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-60"
                      >
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                      </select>
                    </div>
                  </div>

                  {/* Save Image As */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Save Image As
                    </label>
                    <select
                      value={saveFormat}
                      onChange={(e) => setSaveFormat(e.target.value)}
                      disabled={isProcessing}
                      className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-2.5 py-2 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-60"
                    >
                      <option value="Original">Original</option>
                      <option value="JPG">JPG</option>
                      <option value="PNG">PNG</option>
                      <option value="WebP">WebP</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="pt-4 border-t border-bordercolor/60 flex flex-col gap-4">
                
                {/* Resize All Action Trigger */}
                <button
                  type="button"
                  onClick={processBulkResize}
                  disabled={isProcessing || files.length === 0}
                  className="py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Resizing Images...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      Resize All ({files.length} Images)
                    </>
                  )}
                </button>

                {/* Progress Indicators */}
                {(isProcessing || processedCount > 0) && (
                  <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                      <span>Resizing Progress</span>
                      <span className="font-mono font-bold text-primary">
                        {processedCount} of {files.length} Completed
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 rounded-full"
                        style={{ width: `${(processedCount / files.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error/Success Feedbacks */}
                {errorMsg && (
                  <p className="text-xs text-red-500 font-semibold leading-relaxed">
                    {errorMsg}
                  </p>
                )}

                {successMsg && (
                  <p className="text-xs text-green-600 font-bold leading-relaxed">
                    {successMsg}
                  </p>
                )}

                {/* ZIP Download Action Trigger */}
                {resizedFiles.length > 0 && !isProcessing && (
                  <button
                    type="button"
                    onClick={downloadAllAsZip}
                    className="py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 animate-bounce w-full"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Resized Images (ZIP)
                  </button>
                )}
                
              </div>

            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
