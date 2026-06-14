"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2v14a2 2 0 002 2h14M18 22V8a2 2 0 00-2-2H2"/></svg>), title: 'Freeform Crop', desc: 'Select any rectangular region of your JPEG.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'Preset Ratios', desc: 'Crop to 1:1, 16:9, 4:3 and more.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Browser-based, nothing uploaded.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Canvas crop finishes immediately.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'No Watermarks', desc: 'Clean outputs with no added branding.' }
];

const _STEPS = [
  { n: '1', title: 'Upload JPG', desc: 'Select your JPEG image.' },
  { n: '2', title: 'Select Region', desc: 'Drag to select the crop area.' },
  { n: '3', title: 'Download', desc: 'Download your cropped JPEG.' }
];

const _FAQS = [
  {
    q: "Does cropping a JPG/JPEG image reduce its quality?",
    a: "No. Cropping extracts a segment of pixels directly. However, since JPEG uses lossy compression, saving the cropped segment at a lower quality setting can affect details. We recommend setting the quality to 95% or higher."
  },
  {
    q: "What happens to transparent areas if I upload a PNG to the JPG cropper?",
    a: "Since the JPEG format does not support transparency, any transparent areas in your source image will automatically be filled with a solid white background."
  },
  {
    q: "Can I crop a JPG to exact pixel dimensions?",
    a: "Yes. You can drag the crop bounding box or type precise pixel values for the crop selection width, height, and coordinates in the options panel."
  },
  {
    q: "Are my private JPG photos uploaded to a server?",
    a: "No. The entire cropping and compression process runs locally on your machine. Your photos are never sent to external servers."
  },
  {
    q: "Can I crop to common photo aspect ratios?",
    a: "Yes. You can select aspect ratio presets such as 4:3, 3:2, 1:1, or 16:9 to lock the proportions of your crop selection box."
  },
  {
    q: "Does this tool strip camera EXIF data from my JPEG?",
    a: "Yes. To protect your privacy and reduce file size, default canvas exports strip camera EXIF metadata (like GPS location, date, and camera model) from the cropped JPEG."
  }
];

export default function CropJpgPage() {
  const [file, setFile] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

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

  const [imageUrl, setImageUrl] = useState('');
  
  // Crop parameters in screen coordinates
  const [cropBox, setCropBox] = useState({ x: 20, y: 20, width: 150, height: 150 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 }); // Screen size
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 }); // Natural size
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1);
  const [cropAspectRatio, setCropAspectRatio] = useState('FreeForm');
  
  // Crop state
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [croppedUrl, setCroppedUrl] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Mouse event states
  const [dragMode, setDragMode] = useState(null); // 'move' | 'resize-*' | null
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 });

  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Handle file selection
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
    resetCropStates();
  };

  const resetCropStates = () => {
    setCroppedBlob(null);
    if (croppedUrl) {
      URL.revokeObjectURL(croppedUrl);
      setCroppedUrl(null);
    }
  };

  // Create Object URL for the loaded file
  useEffect(() => {
    if (!file) {
      setImageUrl('');
      return;
    }
    const url = file.preview || URL.createObjectURL(file);
    setImageUrl(url);

    return () => {
      if (!file.preview) URL.revokeObjectURL(url);
    };
  }, [file]);

  // Clean up cropped url
  useEffect(() => {
    return () => {
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    };
  }, [croppedUrl]);

  // Initialize crop box size on image load
  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const clientW = imgRef.current.clientWidth;
    const clientH = imgRef.current.clientHeight;
    const naturalW = imgRef.current.naturalWidth;
    const naturalH = imgRef.current.naturalHeight;

    setImageSize({ width: clientW, height: clientH });
    setNaturalSize({ width: naturalW, height: naturalH });
    setOriginalAspectRatio(naturalW / naturalH);

    // Set crop box to be 60% of the image size in the center
    const boxW = Math.round(clientW * 0.6);
    const boxH = Math.round(clientH * 0.6);
    const boxX = Math.round((clientW - boxW) / 2);
    const boxY = Math.round((clientH - boxH) / 2);

    setCropBox({ x: boxX, y: boxY, width: boxW, height: boxH });
    setCropAspectRatio('FreeForm');
  };

  // Reset function
  const handleReset = () => {
    if (!imgRef.current) return;
    const clientW = imgRef.current.clientWidth;
    const clientH = imgRef.current.clientHeight;

    const boxW = Math.round(clientW * 0.6);
    const boxH = Math.round(clientH * 0.6);
    const boxX = Math.round((clientW - boxW) / 2);
    const boxY = Math.round((clientH - boxH) / 2);

    setCropBox({ x: boxX, y: boxY, width: boxW, height: boxH });
    setCropAspectRatio('FreeForm');
    resetCropStates();
  };

  // Handle Aspect Ratio Change
  const handleRatioChange = (ratio) => {
    setCropAspectRatio(ratio);
    if (ratio === 'FreeForm' || ratio === 'Custom') return;

    let targetRatio = 1;
    if (ratio === 'Original') {
      targetRatio = originalAspectRatio;
    } else if (ratio === '1:1') {
      targetRatio = 1;
    } else if (ratio === '4:3') {
      targetRatio = 4 / 3;
    } else if (ratio === '14:9') {
      targetRatio = 14 / 9;
    } else if (ratio === '16:9') {
      targetRatio = 16 / 9;
    }

    let nextW = cropBox.width;
    let nextH = Math.round(nextW / targetRatio);

    if (nextH > imageSize.height) {
      nextH = Math.round(imageSize.height * 0.8);
      nextW = Math.round(nextH * targetRatio);
    }
    if (nextW > imageSize.width) {
      nextW = Math.round(imageSize.width * 0.8);
      nextH = Math.round(nextW / targetRatio);
    }

    const nextX = Math.round((imageSize.width - nextW) / 2);
    const nextY = Math.round((imageSize.height - nextH) / 2);

    setCropBox({ x: nextX, y: nextY, width: nextW, height: nextH });
  };

  // Mouse Drag Logic
  const handleMouseDown = (mode, e) => {
    e.preventDefault();
    setDragMode(mode);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxX: cropBox.x,
      boxY: cropBox.y,
      boxW: cropBox.width,
      boxH: cropBox.height,
    });
  };

  const handleMouseMove = (e) => {
    if (!dragMode) return;

    const deltaX = e.clientX - dragStart.mouseX;
    const deltaY = e.clientY - dragStart.mouseY;

    if (dragMode === 'move') {
      let nextX = dragStart.boxX + deltaX;
      let nextY = dragStart.boxY + deltaY;

      // Constrain inside image screen dimensions
      nextX = Math.max(0, Math.min(nextX, imageSize.width - cropBox.width));
      nextY = Math.max(0, Math.min(nextY, imageSize.height - cropBox.height));

      setCropBox((prev) => ({ ...prev, x: nextX, y: nextY }));
    } else if (dragMode.startsWith('resize')) {
      const corner = dragMode.replace('resize-', '');
      let nextX = dragStart.boxX;
      let nextY = dragStart.boxY;
      let nextW = dragStart.boxW;
      let nextH = dragStart.boxH;

      if (corner === 'bottom-right' || dragMode === 'resize') {
        nextW = dragStart.boxW + deltaX;
        nextH = dragStart.boxH + deltaY;
      } else if (corner === 'bottom-left') {
        nextX = dragStart.boxX + deltaX;
        nextW = dragStart.boxW - deltaX;
        nextH = dragStart.boxH + deltaY;
      } else if (corner === 'top-right') {
        nextY = dragStart.boxY + deltaY;
        nextW = dragStart.boxW + deltaX;
        nextH = dragStart.boxH - deltaY;
      } else if (corner === 'top-left') {
        nextX = dragStart.boxX + deltaX;
        nextY = dragStart.boxY + deltaY;
        nextW = dragStart.boxW - deltaX;
        nextH = dragStart.boxH - deltaY;
      }

      // Enforce minimum dimensions
      const minSize = 20;
      if (nextW < minSize) {
        if (corner.includes('left')) {
          nextX = dragStart.boxX + dragStart.boxW - minSize;
        }
        nextW = minSize;
      }
      if (nextH < minSize) {
        if (corner.includes('top')) {
          nextY = dragStart.boxY + dragStart.boxH - minSize;
        }
        nextH = minSize;
      }

      // Constrain inside image screen dimensions
      if (nextX < 0) {
        nextW += nextX;
        nextX = 0;
      }
      if (nextY < 0) {
        nextH += nextY;
        nextY = 0;
      }
      if (nextX + nextW > imageSize.width) {
        nextW = imageSize.width - nextX;
      }
      if (nextY + nextH > imageSize.height) {
        nextH = imageSize.height - nextY;
      }

      // Aspect Ratio Lock
      let targetRatio = null;
      if (cropAspectRatio === 'Original' && originalAspectRatio) {
        targetRatio = originalAspectRatio;
      } else if (cropAspectRatio === '1:1') {
        targetRatio = 1;
      } else if (cropAspectRatio === '4:3') {
        targetRatio = 4 / 3;
      } else if (cropAspectRatio === '14:9') {
        targetRatio = 14 / 9;
      } else if (cropAspectRatio === '16:9') {
        targetRatio = 16 / 9;
      }

      if (targetRatio) {
        if (corner.includes('right') || corner === 'bottom-right' || dragMode === 'resize') {
          nextH = Math.round(nextW / targetRatio);
        } else {
          nextW = Math.round(nextH * targetRatio);
        }

        // Adjust coordinates if we resize from top or left
        if (corner.includes('left')) {
          nextX = dragStart.boxX + dragStart.boxW - nextW;
        }
        if (corner.includes('top')) {
          nextY = dragStart.boxY + dragStart.boxH - nextH;
        }

        // Check overall boundaries after aspect ratio lock
        if (nextX < 0 || nextY < 0 || nextX + nextW > imageSize.width || nextY + nextH > imageSize.height) {
          nextX = cropBox.x;
          nextY = cropBox.y;
          nextW = cropBox.width;
          nextH = cropBox.height;
        }
      }

      setCropBox({ x: nextX, y: nextY, width: nextW, height: nextH });
    }
  };

  const handleMouseUp = () => {
    setDragMode(null);
  };

  // Global mouse listeners during active dragging
  useEffect(() => {
    if (dragMode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragMode, dragStart, imageSize, cropBox, cropAspectRatio, originalAspectRatio]);

  // Sync inputs back to crop box screen dimensions
  const handleNumberInput = (prop, val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 0) return;

    // Convert from natural image dimensions to client screen coordinates
    const scaleX = imageSize.width / naturalSize.width;
    const scaleY = imageSize.height / naturalSize.height;

    setCropBox((prev) => {
      const updated = { ...prev };
      if (prop === 'x') {
        const clientVal = Math.round(parsed * scaleX);
        updated.x = Math.max(0, Math.min(clientVal, imageSize.width - prev.width));
      } else if (prop === 'y') {
        const clientVal = Math.round(parsed * scaleY);
        updated.y = Math.max(0, Math.min(clientVal, imageSize.height - prev.height));
      } else if (prop === 'width') {
        const clientVal = Math.round(parsed * scaleX);
        updated.width = Math.max(20, Math.min(clientVal, imageSize.width - prev.x));
      } else if (prop === 'height') {
        const clientVal = Math.round(parsed * scaleY);
        updated.height = Math.max(20, Math.min(clientVal, imageSize.height - prev.y));
      }
      return updated;
    });
  };

  // Convert client-side crop dimensions to natural dimensions for inputs
  const getNaturalCoord = (clientVal, axis) => {
    if (!imageSize[axis] || !naturalSize[axis]) return 0;
    const scale = naturalSize[axis] / imageSize[axis];
    return Math.round(clientVal * scale);
  };

  // Crop execution using Canvas API
  const handleCrop = () => {
    if (!file || !imgRef.current) return;

    setIsCropping(true);
    setErrorMsg('');

    // Map crop box screen coordinates back to actual image natural coordinates
    const scaleX = naturalSize.width / imageSize.width;
    const scaleY = naturalSize.height / imageSize.height;

    const sourceX = cropBox.x * scaleX;
    const sourceY = cropBox.y * scaleY;
    const sourceWidth = cropBox.width * scaleX;
    const sourceHeight = cropBox.height * scaleY;

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available.');
        }

        // Fill white background for JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, sourceWidth, sourceHeight);

        // Draw cropped section onto canvas
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          sourceWidth,
          sourceHeight
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              throw new Error('Cropped canvas blob generation failed.');
            }

            if (croppedUrl) {
              URL.revokeObjectURL(croppedUrl);
            }

            const url = URL.createObjectURL(blob);
            setCroppedBlob(blob);
            setCroppedUrl(url);
            setIsCropping(false);

            // Log tool history
            const croppedName = file.name.replace(/\.[^/.]+$/, '') + `_cropped.jpg`;
            saveHistory('Crop JPG', `${croppedName} (${Math.round(sourceWidth)}x${Math.round(sourceHeight)})`);
          },
          'image/jpeg',
          0.95
        );
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || 'Error occurred during image cropping.');
        setIsCropping(false);
      }
    };

    img.onerror = () => {
      setErrorMsg('Failed to process image source.');
      setIsCropping(false);
    };

    img.src = imageUrl;
  };

  const downloadCroppedImage = () => {
    if (!croppedBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}_cropped_${getNaturalCoord(cropBox.width, 'width')}x${getNaturalCoord(cropBox.height, 'height')}.jpg`;
    saveAs(croppedBlob, newName);
  };

  return (
    <ToolPageShell
      title="Crop JPG"
      subtitle="Crop JPEG images to any region or preset aspect ratio. Free, browser-based."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Crop JPEG images online for free. Select any region or preset ratio and export. Browser-based, no uploads."
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

              {/* Uploaded file details */}
              <div className="p-3 bg-lightbg/45 border border-bordercolor/60 rounded-xl flex items-center gap-3">
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Original Thumb"
                    className="w-12 h-12 object-cover rounded-lg border border-bordercolor"
                  />
                )}
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    Original Resolution: {naturalSize.width}x{naturalSize.height} px
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Column: Large Preview */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Crop Preview
                  </h4>
                  <p className="text-[10px] text-gray-400 font-medium -mt-1">
                    Drag corners to resize crop area
                  </p>
                  
                  {/* Draggable container box */}
                  <div 
                    ref={containerRef}
                    className="border border-bordercolor rounded-xl p-4 bg-lightbg/60 min-h-[380px] flex items-center justify-center relative select-none"
                  >
                    {imageUrl && (
                      <div className="relative inline-block overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          ref={imgRef}
                          src={imageUrl}
                          onLoad={handleImageLoad}
                          alt="Workspace Cropper"
                          style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg pointer-events-none select-none"
                        />

                        {/* Interactive Drag & Resize Overlay (Only visible when image size is loaded) */}
                        {imageSize.width > 0 && (
                          <div 
                            className="absolute border-2 border-primary bg-primary/10 shadow-lg cursor-move select-none"
                            style={{
                              left: `${cropBox.x}px`,
                              top: `${cropBox.y}px`,
                              width: `${cropBox.width}px`,
                              height: `${cropBox.height}px`,
                            }}
                            onMouseDown={(e) => handleMouseDown('move', e)}
                          >
                            {/* Resize Corner Handles */}
                            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
                              const classes = {
                                'top-left': 'top-0 left-0 transform -translate-x-1.5 -translate-y-1.5 cursor-nwse-resize',
                                'top-right': 'top-0 right-0 transform translate-x-1.5 -translate-y-1.5 cursor-nesw-resize',
                                'bottom-left': 'bottom-0 left-0 transform -translate-x-1.5 translate-y-1.5 cursor-nesw-resize',
                                'bottom-right': 'bottom-0 right-0 transform translate-x-1.5 translate-y-1.5 cursor-nwse-resize',
                              }[corner];
                              return (
                                <div
                                  key={corner}
                                  className={`absolute w-3.5 h-3.5 bg-primary border border-white rounded-full shadow-md ${classes}`}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    handleMouseDown(`resize-${corner}`, e);
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
            </div>

            {/* Right Column: Controls & Settings */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Crop Rectangle Panel */}
                  <div className="bg-lightbg/40 border border-bordercolor rounded-xl p-3.5 flex flex-col gap-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Crop Rectangle Panel
                    </span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1">Width (px)</label>
                        <input
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          value={getNaturalCoord(cropBox.width, 'width')}
                          onChange={(e) => handleNumberInput('width', e.target.value)}
                          className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-3 py-2.5 focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1">Height (px)</label>
                        <input
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          value={getNaturalCoord(cropBox.height, 'height')}
                          onChange={(e) => handleNumberInput('height', e.target.value)}
                          className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-3 py-2.5 focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 mb-1.5">Aspect Ratio</label>
                      <select
                        value={cropAspectRatio}
                        onChange={(e) => handleRatioChange(e.target.value)}
                        className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-3 py-2.5 focus:outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="FreeForm">FreeForm</option>
                        <option value="Original">Original</option>
                        <option value="Custom">Custom</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="4:3">4:3 (Monitor)</option>
                        <option value="14:9">14:9</option>
                        <option value="16:9">16:9 (Widescreen)</option>
                      </select>
                    </div>
                  </div>

                  {/* Crop Position Panel */}
                  <div className="bg-lightbg/40 border border-bordercolor rounded-xl p-3.5 flex flex-col gap-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Crop Position
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1">Position (X)</label>
                        <input
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          value={getNaturalCoord(cropBox.x, 'width')}
                          onChange={(e) => handleNumberInput('x', e.target.value)}
                          className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-3 py-2 focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1">Position (Y)</label>
                        <input
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          value={getNaturalCoord(cropBox.y, 'height')}
                          onChange={(e) => handleNumberInput('y', e.target.value)}
                          className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-3 py-2 focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Button to Reset */}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-textmain border border-bordercolor hover:border-gray-400 text-xs font-bold rounded-lg shadow-sm transition-all"
                  >
                    Reset Crop Settings
                  </button>

                  {errorMsg && (
                    <p className="text-xs text-red-500 font-semibold leading-relaxed">
                      {errorMsg}
                    </p>
                  )}

                  {/* Crop and Download Action buttons */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-bordercolor/60">
                    <button
                      type="button"
                      onClick={handleCrop}
                      disabled={isCropping}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      {isCropping ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Extracting Area...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 2v14a2 2 0 002 2h14M18 22V8a2 2 0 00-2-2H2" />
                          </svg>
                          Crop Selected Area
                        </>
                      )}
                    </button>

                    {croppedUrl && (
                      <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-3 mt-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Cropped Result Preview</span>
                        <div className="flex items-center justify-center border border-bordercolor bg-white p-2 rounded-lg max-h-[120px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={croppedUrl}
                            alt="Cropped Preview"
                            className="max-h-[100px] max-w-full object-contain rounded-md"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={downloadCroppedImage}
                          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 animate-bounce"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Cropped JPG
                        </button>
                      </div>
                    )}
                  </div>
            </div>

          </div>
        )}
      </div>
</ToolPageShell>
  );
}
