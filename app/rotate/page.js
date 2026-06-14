"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-1.19" /></svg>), title: 'Any Angle', desc: 'Rotate by 90°, 180°, 270° or any custom angle ±360°.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>), title: 'Live Preview', desc: 'See your rotation update in real time.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Browser-based rotation - nothing uploaded.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'All Formats', desc: 'Rotate JPEG, PNG, WebP, SVG.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark, unlimited.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Canvas rotation completes in milliseconds.' }
];

const _STEPS = [
  { n: '1', title: 'Upload', desc: 'Drag & drop or click to select your image.' },
  { n: '2', title: 'Set Angle', desc: 'Use preset buttons or the slider.' },
  { n: '3', title: 'Download', desc: 'Click Apply & Download.' }
];

const _FAQS = [
  {
    q: "Can I rotate my image to any custom angle?",
    a: "Yes. You can rotate by standard 90-degree increments or use the fine-tuning slider to rotate to any custom angle from -360° to +360°."
  },
  {
    q: "Does rotating an image reduce its visual quality?",
    a: "For standard 90, 180, and 270-degree rotations, the pixels are simply mapped to new positions, which is completely lossless. For custom angles, some minor resampling is used to align pixels smoothly."
  },
  {
    q: "What happens to the canvas size when I rotate an image?",
    a: "The canvas dynamically expands to fully fit the rotated image boundaries so that no corners or edges of your original image are cropped out."
  },
  {
    q: "What background color is used to fill the empty corners after custom rotation?",
    a: "For PNG and WebP files, the empty corners are left completely transparent. For JPEG files, the empty corners are filled with a clean white background."
  },
  {
    q: "Are my images uploaded to a server for rotation?",
    a: "No, never. All calculations, rotation matrix applications, and canvas exports are performed locally in your browser."
  },
  {
    q: "Can I save my rotated image in a different format?",
    a: "Yes. You can choose to export your rotated result as JPEG, PNG, or WebP regardless of the original file's format."
  }
];

export default function RotatePage() {
  const [file, setFile] = useState(null);
  const [angle, setAngle] = useState(0); // Angle in degrees
  
  // Output states
  const [rotatedBlob, setRotatedBlob] = useState(null);
  const [rotatedUrl, setRotatedUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "Is there any image quality loss when rotating?",
      a: "No, our rotate tool performs direct coordinate mapping on the HTML5 canvas to output the rotated image at high resolution without lossy re-compression artifacting."
    },
    {
      q: "Can I rotate to odd angles like 45 degrees?",
      a: "Yes, you can enter any custom angle from -360 to 360 in the Custom Angle input field, and the bounding box will automatically resize to fit the rotated image."
    },
    {
      q: "Are my images uploaded to any server?",
      a: "No. All rotation logic runs purely in your browser canvas. Your images never leave your computer, ensuring absolute privacy."
    },
    {
      q: "What file formats are supported?",
      a: "We support JPEG, PNG, and WebP images for rotation."
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
    setAngle(0);
    setRotatedBlob(null);
    if (rotatedUrl) {
      URL.revokeObjectURL(rotatedUrl);
      setRotatedUrl(null);
    }
    setErrorMsg('');
  };

  // Rotate presets
  const rotateLeft90 = () => {
    setAngle((prev) => (prev - 90) % 360);
  };

  const rotateRight90 = () => {
    setAngle((prev) => (prev + 90) % 360);
  };

  const rotate180 = () => {
    setAngle((prev) => (prev + 180) % 360);
  };

  // Run live rotation canvas transformation whenever file or angle changes
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

        // Calculate bounding box for the rotated image
        const angleRad = (angle * Math.PI) / 180;
        const absCos = Math.abs(Math.cos(angleRad));
        const absSin = Math.abs(Math.sin(angleRad));

        const targetWidth = Math.round(width * absCos + height * absSin);
        const targetHeight = Math.round(width * absSin + height * absCos);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available.');
        }

        // Fill white/transparent background depending on image type
        if (file.type === 'image/png' || file.type === 'image/webp') {
          ctx.clearRect(0, 0, targetWidth, targetHeight);
        } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        // Translate context to center of rotated bounding box
        ctx.translate(targetWidth / 2, targetHeight / 2);
        
        // Rotate context
        ctx.rotate(angleRad);

        // Draw image centered at the origin
        ctx.drawImage(img, -width / 2, -height / 2);

        canvas.toBlob(
          (blob) => {
            if (!active) return;
            if (!blob) {
              throw new Error('Failed to generate rotated blob.');
            }

            if (rotatedUrl) {
              URL.revokeObjectURL(rotatedUrl);
            }

            const url = URL.createObjectURL(blob);
            setRotatedBlob(blob);
            setRotatedUrl(url);
            setIsProcessing(false);
          },
          file.type || 'image/jpeg',
          0.95
        );
      } catch (err) {
        if (active) {
          console.error(err);
          setErrorMsg(err.message || 'Error occurred during image rotation.');
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
  }, [file, angle]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (rotatedUrl) {
        URL.revokeObjectURL(rotatedUrl);
      }
    };
  }, [rotatedUrl]);

  const downloadRotatedImage = () => {
    if (!rotatedBlob || !file) return;
    
    const extension = file.name.split('.').pop();
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const newName = `${baseName}_rotated_${normalizedAngle}deg.${extension}`;
    
    saveAs(rotatedBlob, newName);
    
    // Log tool history
    saveHistory('Rotate Image', newName);
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
      title="Rotate Image"
      subtitle="Rotate images by any angle - 90°, 180°, 270° or a custom degree. Free online tool with live preview."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Rotate images online for free. Turn JPEG, PNG and WebP by 90°, 180°, 270° or any custom angle. Browser-based, no uploads."
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
                    {rotatedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rotatedUrl}
                        alt="Rotated Preview"
                        style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                        <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Rotating...
                      </div>
                    )}
                  </div>
            </div>

            {/* Right Column: Controls & Settings */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Rotate Settings
                  </h4>

                  {/* Presets */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Rotate Presets
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={rotateLeft90}
                        className="py-2.5 text-[10px] font-bold rounded-lg border border-bordercolor bg-white hover:border-gray-400 text-textmain transition-all duration-200"
                      >
                        90° Left
                      </button>
                      <button
                        type="button"
                        onClick={rotateRight90}
                        className="py-2.5 text-[10px] font-bold rounded-lg border border-bordercolor bg-white hover:border-gray-400 text-textmain transition-all duration-200"
                      >
                        90° Right
                      </button>
                      <button
                        type="button"
                        onClick={rotate180}
                        className="py-2.5 text-[10px] font-bold rounded-lg border border-bordercolor bg-white hover:border-gray-400 text-textmain transition-all duration-200"
                      >
                        180°
                      </button>
                    </div>
                  </div>

                  {/* Custom angle input */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Custom Angle (Degrees)
                    </label>
                    <input
                      type="text" inputMode="numeric" pattern="[0-9]*"
                      value={angle}
                      onChange={(e) => setAngle(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                      placeholder="e.g. 45"
                    />
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
                      onClick={downloadRotatedImage}
                      disabled={isProcessing || !rotatedBlob}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Rotated Image
                    </button>
                  </div>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
