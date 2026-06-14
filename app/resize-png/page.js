"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import { getMimeForSaveFormat, getExtensionForMime, compressCanvasToBlob } from '@/lib/imageUtils';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>), title: 'Pixel-Perfect PNG', desc: 'Resize to exact dimensions with transparency preserved.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'Transparency Intact', desc: 'Alpha channel preserved through all resize operations.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Browser-based, nothing uploaded.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Canvas resize finishes immediately.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'No Watermarks', desc: 'Clean outputs with no added branding.' }
];

const _STEPS = [
  { n: '1', title: 'Upload PNG', desc: 'Select your PNG image.' },
  { n: '2', title: 'Set Size', desc: 'Enter target width and height.' },
  { n: '3', title: 'Download', desc: 'Download your resized PNG.' }
];

const _FAQS = [
  {
    q: "Will the transparent background of my PNG be preserved when resized?",
    a: "Yes. PNG transparency (alpha channel) is fully preserved. The resizer uses clear canvas states to prevent transparent backgrounds from turning black or white."
  },
  {
    q: "How do I compress my PNG to a smaller size during resizing?",
    a: "Since PNG is a lossless format, standard quality adjustments aren't possible without losing transparency. If you set a target size limit, the tool will scale down the dimensions (width/height) to meet the limit, or you can export it as WebP."
  },
  {
    q: "Can I convert my PNG to another format during resize?",
    a: "Yes. While this is a dedicated PNG resizer, you can choose to export the output as JPEG or WebP if you want to optimize for file size."
  },
  {
    q: "What is the difference between this tool and the general resizer?",
    a: "This tool is optimized specifically for PNG workflows, ensuring transparency rendering settings are pre-configured, but supports the same robust client-side scaling engine."
  },
  {
    q: "Is there a limit on the PNG file size I can upload?",
    a: "Since all processing is done locally in your browser sandbox, there is no server-imposed limit. However, extremely large files (e.g., over 50 MB) depend on your device's memory."
  },
  {
    q: "Are my PNG files secure on this website?",
    a: "Yes. The tool runs 100% locally in your browser. No files are uploaded to any server, making it safe for processing confidential screenshots, signatures, or graphics."
  }
];

export default function ResizePngPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Resizing Controls State
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [widthInput, setWidthInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [lockRatio, setLockRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);
  
  // Settings States
  const [resizeAsPercentage, setResizeAsPercentage] = useState(false);
  const [percentageValue, setPercentageValue] = useState('50');
  const [targetSizeInput, setTargetSizeInput] = useState('');
  const [targetSizeUnit, setTargetSizeUnit] = useState('KB');
  const [saveFormat, setSaveFormat] = useState('PNG');
  
  // Resizing Result State
  const [isResizing, setIsResizing] = useState(false);
  const [resizedBlob, setResizedBlob] = useState(null);
  const [resizedUrl, setResizedUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "Does this PNG resizer keep transparency?",
      a: "Yes, our scaling engine retains transparent alpha channels, making sure transparent PNG backgrounds remain clear."
    },
    {
      q: "Can I resize PNGs by percentage?",
      a: "Yes, toggle to 'As Percentage' and adjust the slider to scale down your PNGs relative to their original width and height."
    },
    {
      q: "How does target file size resizing affect PNGs?",
      a: "If you set a target file size, the export engine will optimize color maps and compression parameters to compile a smaller file size."
    },
    {
      q: "Is this tool completely free?",
      a: "Yes, it is 100% free with no watermarks, registrations, or usage limits."
    }
  ];

  // Image load ref to get dimensions
  const imageRef = useRef(null);

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

  // Handle files selected from UploadBox
  const handleFileSelect = (selectedList) => {
    setFiles(selectedList);
    if (selectedList.length > 0) {
      setSelectedFile(selectedList[0]);
      resetResizeStates();
    } else {
      setSelectedFile(null);
      resetResizeStates();
    }
  };

  const resetResizeStates = () => {
    setOriginalWidth(0);
    setOriginalHeight(0);
    setWidthInput('');
    setHeightInput('');
    setResizedBlob(null);
    if (resizedUrl) {
      URL.revokeObjectURL(resizedUrl);
      setResizedUrl(null);
    }
    setErrorMsg('');
  };

  // Sync dimensions when percentage mode is active
  useEffect(() => {
    if (resizeAsPercentage && originalWidth && originalHeight) {
      const pct = parseFloat(percentageValue) || 0;
      if (pct > 0) {
        setWidthInput(Math.round(originalWidth * pct / 100).toString());
        setHeightInput(Math.round(originalHeight * pct / 100).toString());
      } else {
        setWidthInput('');
        setHeightInput('');
      }
    }
  }, [resizeAsPercentage, percentageValue, originalWidth, originalHeight]);

  // Load image dimensions when selected file changes
  useEffect(() => {
    if (!selectedFile) return;

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setOriginalWidth(w);
      setOriginalHeight(h);
      if (resizeAsPercentage) {
        const pct = parseFloat(percentageValue) || 0;
        setWidthInput(Math.round(w * pct / 100).toString());
        setHeightInput(Math.round(h * pct / 100).toString());
      } else {
        setWidthInput(w.toString());
        setHeightInput(h.toString());
      }
      setAspectRatio(w / h);
      setErrorMsg('');
    };
    img.onerror = () => {
      setErrorMsg('Failed to load PNG preview. File may be unsupported or corrupted.');
    };
    
    img.src = selectedFile.preview || URL.createObjectURL(selectedFile);

    return () => {
      if (!selectedFile.preview) {
        URL.revokeObjectURL(img.src);
      }
    };
  }, [selectedFile, resizeAsPercentage, percentageValue]);

  // Cleanup resized image blob URL
  useEffect(() => {
    return () => {
      if (resizedUrl) {
        URL.revokeObjectURL(resizedUrl);
      }
    };
  }, [resizedUrl]);

  // Width input change handler
  const handleWidthChange = (val) => {
    setWidthInput(val);
    const parsedWidth = parseInt(val, 10);
    if (!isNaN(parsedWidth) && parsedWidth > 0 && lockRatio && aspectRatio) {
      const calculatedHeight = Math.round(parsedWidth / aspectRatio);
      setHeightInput(calculatedHeight.toString());
    }
  };

  // Height input change handler
  const handleHeightChange = (val) => {
    setHeightInput(val);
    const parsedHeight = parseInt(val, 10);
    if (!isNaN(parsedHeight) && parsedHeight > 0 && lockRatio && aspectRatio) {
      const calculatedWidth = Math.round(parsedHeight * aspectRatio);
      setWidthInput(calculatedWidth.toString());
    }
  };

  // Execute Canvas Resize
  const executeResize = () => {
    if (!selectedFile) return;

    const targetWidth = parseInt(widthInput, 10);
    const targetHeight = parseInt(heightInput, 10);

    if (isNaN(targetWidth) || targetWidth <= 0 || isNaN(targetHeight) || targetHeight <= 0) {
      setErrorMsg('Please enter valid width and height values greater than 0.');
      return;
    }

    setIsResizing(true);
    setErrorMsg('');

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas 2D context not available.');
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const targetMime = getMimeForSaveFormat(saveFormat, 'image/png');
        const targetBytes = targetSizeInput && parseFloat(targetSizeInput) > 0
          ? parseFloat(targetSizeInput) * (targetSizeUnit === 'MB' ? 1024 * 1024 : 1024)
          : null;

        compressCanvasToBlob(canvas, targetMime, targetBytes)
          .then(({ blob, mime }) => {
            if (!blob) {
              throw new Error('Blob generation failed.');
            }

            if (resizedUrl) {
              URL.revokeObjectURL(resizedUrl);
            }

            const url = URL.createObjectURL(blob);
            setResizedBlob(blob);
            setResizedUrl(url);
            setIsResizing(false);

            // Log tool history
            const extension = getExtensionForMime(mime, selectedFile.name);
            const resizedName = selectedFile.name.replace(/\.[^/.]+$/, '') + `_resized.${extension}`;
            saveHistory('Resize PNG', `${resizedName} (${targetWidth}x${targetHeight})`);
          })
          .catch((err) => {
            console.error(err);
            setErrorMsg(err.message || 'Error occurred during image resizing.');
            setIsResizing(false);
          });
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || 'Error occurred during image resizing.');
        setIsResizing(false);
      }
    };

    img.onerror = () => {
      setErrorMsg('Failed to process PNG source.');
      setIsResizing(false);
    };

    img.src = selectedFile.preview || URL.createObjectURL(selectedFile);
  };

  const downloadResizedImage = () => {
    if (!resizedBlob || !selectedFile) return;
    const mime = resizedBlob.type;
    const extension = getExtensionForMime(mime, selectedFile.name);
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}_${widthInput}x${heightInput}.${extension}`;
    saveAs(resizedBlob, newName);
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
      title="Resize PNG"
      subtitle="Resize PNG images to exact pixel dimensions while preserving transparency. Free, browser-based."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Resize PNG images online for free. Set exact pixel dimensions while preserving transparency. Browser-based, no uploads."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {/* Conditional Workspace */}
        {files.length === 0 ? (
          /* Initial Upload Box View */
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.png']}
              multiple={true} 
            />
          </div>
        ) : (
          /* Active Resizing Studio Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: File Details */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Uploaded PNGs</h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">Clear All</button>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedFile(file);
                      resetResizeStates();
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      selectedFile?.id === file.id
                        ? 'border-primary bg-blue-50/20'
                        : 'border-bordercolor hover:border-gray-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.preview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.preview} alt="Thumb" className="w-9 h-9 object-cover rounded-lg border border-bordercolor" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-textmain truncate max-w-[120px]" title={file.name}>{file.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{formatSize(file.size)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle Column: Large Preview */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live Preview</h4>
                  <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imageRef}
                      src={resizedUrl || selectedFile?.preview || ''}
                      alt="Workspace Preview"
                      style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Original: {originalWidth} x {originalHeight} px</span>
                    {resizedBlob && <span className="text-green-600">Resized: {widthInput} x {heightInput} px</span>}
                  </div>
            </div>

            {/* Right Column: Controls & Settings */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Dimensions Config</h4>

                  {/* Side-by-Side Tabs */}
                  <div className="flex bg-lightbg p-1 rounded-lg border border-bordercolor">
                    <button
                      type="button"
                      onClick={() => setResizeAsPercentage(false)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                        !resizeAsPercentage
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-gray-400 hover:text-textmain'
                      }`}
                    >
                      By Size
                    </button>
                    <button
                      type="button"
                      onClick={() => setResizeAsPercentage(true)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                        resizeAsPercentage
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-gray-400 hover:text-textmain'
                      }`}
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
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  )}

                  {/* Input Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Width (px)
                      </label>
                      <input
                        type="text" inputMode="numeric" pattern="[0-9]*"
                        value={widthInput}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        disabled={resizeAsPercentage}
                        className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary disabled:opacity-60"
                        placeholder="Enter Width"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Height (px)
                      </label>
                      <input
                        type="text" inputMode="numeric" pattern="[0-9]*"
                        value={heightInput}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        disabled={resizeAsPercentage}
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
                        onChange={(e) => {
                          setLockRatio(e.target.checked);
                          if (e.target.checked && originalWidth && originalHeight) {
                            // Recalculate height instantly
                            const calculatedHeight = Math.round(parseInt(widthInput, 10) / aspectRatio);
                            setHeightInput(calculatedHeight.toString());
                          }
                        }}
                        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary accent-primary"
                      />
                      <label htmlFor="ratioLock" className="text-xs font-bold text-textmain select-none cursor-pointer">
                        Lock aspect ratio
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
                            className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-2.5 py-2 focus:outline-none focus:border-primary"
                            placeholder="Size"
                            min="1"
                          />
                          <select
                            value={targetSizeUnit}
                            onChange={(e) => setTargetSizeUnit(e.target.value)}
                            className="text-[10px] font-bold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-1.5 py-2 focus:outline-none focus:border-primary cursor-pointer"
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
                          className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-2.5 py-2 focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="Original">Original</option>
                          <option value="JPG">JPG</option>
                          <option value="PNG">PNG</option>
                          <option value="WebP">WebP</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {errorMsg && <p className="text-xs text-red-500 font-semibold leading-relaxed">{errorMsg}</p>}

                  {/* Resizing / Download Buttons */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-bordercolor/60">
                    <button
                      type="button"
                      onClick={executeResize}
                      disabled={isResizing}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      {isResizing ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Resizing PNG...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          Resize PNG
                        </>
                      )}
                    </button>

                    {resizedBlob && (
                      <button
                        type="button"
                        onClick={downloadResizedImage}
                        style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(22,163,74,0.28)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Resized PNG
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
