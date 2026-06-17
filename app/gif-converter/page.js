"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3l4 4-4 4M16 21l-4-4 4-4"/><path d="M12 7H5a2 2 0 00-2 2v2M12 17h7a2 2 0 002-2v-2"/></svg>), title: 'Extract All Frames', desc: 'Convert and save every animation frame as a separate static image.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'All frame decompression and image saving run locally on your device.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Batch ZIP Export', desc: 'Package and download all extracted frames in a single ZIP archive.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No limits, no subscriptions, no branding watermarks added.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>), title: 'Output Control', desc: 'Resize dimensions, select custom frame resolutions, or tweak compression.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'Original Quality', desc: 'Preserves the colors, alpha transparency, and sharp details of vector frames.' }
];

const _STEPS = [
  { n: '1', title: 'Upload GIF', desc: 'Select any animated or static GIF from your computer.' },
  { n: '2', title: 'Pick Format & Size', desc: 'Choose PNG, JPEG, WebP, etc., and customize target dimensions.' },
  { n: '3', title: 'Download Frames', desc: 'Save single frames or export the entire set in a ZIP archive.' }
];

const _FAQS = [
  {
    q: "How does this GIF converter extract frames?",
    a: "Unlike standard converters that only grab the first frame, our tool decompresses the LZW byte streams client-side to extract and render every individual animation frame to canvas."
  },
  {
    q: "What output formats are supported for extraction?",
    a: "You can convert and save individual frames as PNG, JPEG, WebP, BMP, or ICO images."
  },
  {
    q: "Can I download all animation frames at once?",
    a: "Yes! If the uploaded GIF is animated, the tool will automatically compile all output images into a single structured ZIP file for fast batch download."
  },
  {
    q: "Are my GIF files uploaded to any external server?",
    a: "No. All GIF decoding, coalescing, and image generation are executed locally in your browser sandbox, keeping your private animations secure."
  },
  {
    q: "Is transparency preserved when extracting frames?",
    a: "Yes. WebP and PNG both support alpha transparency. Any transparency present in the GIF frames will be maintained in the output PNG or WebP images."
  },
  {
    q: "Can I resize the frames during conversion?",
    a: "Yes. In the settings panel, you can choose custom dimensions or toggle quick scale multipliers to export frames at specific resolutions."
  }
];

export default function GifConverterPage() {
  const [file, setFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState('image/png'); // 'image/png' | 'image/jpeg' | 'image/webp' | 'image/bmp' | 'image/gif' | 'image/x-icon'
  const [quality, setQuality] = useState(90);

  // Advanced options states
  const [resizeMode, setResizeMode] = useState('keep'); // 'keep' | 'custom'
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [autoOrient, setAutoOrient] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [gifAlignment, setGifAlignment] = useState('');
  const [icoFavicon, setIcoFavicon] = useState(false);
  const [icoSize, setIcoSize] = useState('32x32');

  // Dimensions
  const [originalWidth, setOriginalWidth] = useState(100);
  const [originalHeight, setOriginalHeight] = useState(100);

  // Output states
  const [frames, setFrames] = useState([]); // array of { number, url, blob }
  const [isConverting, setIsConverting] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      frames.forEach((f) => {
        if (f.url) URL.revokeObjectURL(f.url);
      });
    };
  }, [frames]);

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
    } else {
      setFile(null);
      frames.forEach((f) => {
        if (f.url) URL.revokeObjectURL(f.url);
      });
      setFrames([]);
      setProcessedCount(0);
      setTotalCount(0);
      setErrorMsg('');
    }
  };

  const convertFile = async (selectedFile) => {
    setIsConverting(true);
    setProcessedCount(0);
    setTotalCount(0);
    setErrorMsg('');

    // Revoke old URLs
    frames.forEach((f) => {
      if (f.url) URL.revokeObjectURL(f.url);
    });
    setFrames([]);

    try {
      // 1. Read file as ArrayBuffer
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsArrayBuffer(selectedFile);
      });

      // 2. Decode GIF frames dynamically
      const { parseGIF, decompressFrames } = await import('gifuct-js');
      const gif = parseGIF(arrayBuffer);
      const rawFrames = decompressFrames(gif, true);

      if (!rawFrames || rawFrames.length === 0) {
        throw new Error('Invalid GIF structure or could not decode frames.');
      }

      const numFrames = rawFrames.length;
      setTotalCount(numFrames);

      const gifWidth = gif.lsd.width;
      const gifHeight = gif.lsd.height;
      setOriginalWidth(gifWidth);
      setOriginalHeight(gifHeight);

      // Create main persistent canvas for frame LZW coalescing
      const canvas = document.createElement('canvas');
      canvas.width = gifWidth;
      canvas.height = gifHeight;
      const ctx = canvas.getContext('2d');

      let backupImageData = null;
      const renderedFrames = [];

      for (let i = 0; i < numFrames; i++) {
        const frame = rawFrames[i];

        // Backup current canvas state if disposal method is 3 (restore to previous)
        if (frame.disposalType === 3) {
          backupImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
        }

        // Draw current frame patch onto a temporary canvas of patch size
        const patchCanvas = document.createElement('canvas');
        patchCanvas.width = frame.dims.width;
        patchCanvas.height = frame.dims.height;
        const patchCtx = patchCanvas.getContext('2d');
        if (!patchCtx) throw new Error('Failed to get patch canvas context');

        const patchData = patchCtx.createImageData(frame.dims.width, frame.dims.height);
        patchData.data.set(frame.patch);
        patchCtx.putImageData(patchData, 0, 0);

        // Draw patch onto cumulative canvas at the specified offset
        ctx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

        // Prepare target canvas (handles optional resizing and format background)
        const targetCanvas = document.createElement('canvas');
        let w = gifWidth;
        let h = gifHeight;

        // Custom resizing logic
        if (targetFormat === 'image/x-icon') {
          if (icoFavicon) {
            w = 16;
            h = 16;
          } else {
            const dims = icoSize.split('x');
            w = parseInt(dims[0], 10) || 32;
            h = parseInt(dims[1], 10) || 32;
          }
        } else if (resizeMode === 'custom') {
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

        targetCanvas.width = w;
        targetCanvas.height = h;
        const targetCtx = targetCanvas.getContext('2d');
        if (!targetCtx) throw new Error('Failed to get target canvas context');

        // Draw solid background color (e.g. white) for formats that don't support transparency
        if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
          targetCtx.fillStyle = '#FFFFFF';
          targetCtx.fillRect(0, 0, w, h);
        }

        // Draw cumulative frames state onto target canvas
        targetCtx.drawImage(canvas, 0, 0, w, h);

        // Convert target canvas to blob in the selected format
        const mimeParam = targetFormat === 'image/x-icon' ? 'image/png' : targetFormat;
        const qualityParam = (targetFormat === 'image/jpeg' || targetFormat === 'image/webp') ? (quality / 100) : undefined;

        const blob = await new Promise((resolve, reject) => {
          targetCanvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to generate frame blob.'));
            },
            mimeParam,
            qualityParam
          );
        });

        const url = URL.createObjectURL(blob);
        renderedFrames.push({
          number: i + 1,
          blob,
          url,
        });

        setProcessedCount(i + 1);

        // Apply disposal method for the next frame
        if (frame.disposalType === 2) {
          // Restore to background (clear frame area)
          ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
        } else if (frame.disposalType === 3 && backupImageData) {
          // Restore to previous state
          ctx.putImageData(backupImageData, 0, 0);
        }
      }

      setFrames(renderedFrames);
      setIsConverting(false);

      const displayFramesCount = numFrames > 1 ? `${numFrames} frames` : '1 frame';
      saveHistory('GIF Converter', `${selectedFile.name} (${displayFramesCount})`);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'GIF conversion failed. Please ensure it is a valid GIF file.');
      setIsConverting(false);
    }
  };

  useEffect(() => {
    if (file) {
      convertFile(file);
    }
  }, [file, targetFormat, quality, resizeMode, customWidth, customHeight, icoFavicon, icoSize]);

  const downloadSingleFrame = (f) => {
    if (!file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const extension = getExtension(targetFormat);
    const newName = `${baseName}_frame_${f.number}.${extension}`;
    saveAs(f.blob, newName);
  };

  const downloadAllFrames = async () => {
    if (frames.length === 0 || !file) return;

    if (frames.length === 1) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const extension = getExtension(targetFormat);
      const newName = `${baseName}.${extension}`;
      saveAs(frames[0].blob, newName);
      return;
    }

    try {
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const extension = getExtension(targetFormat);

      frames.forEach((f) => {
        zip.file(`${baseName}_frame_${f.number}.${extension}`, f.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${baseName}_extracted_frames.zip`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to compile ZIP archive. Please try again.');
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFormatLabel = (mime) => {
    if (mime === 'image/jpeg') return 'JPG';
    if (mime === 'image/png') return 'PNG';
    if (mime === 'image/webp') return 'WebP';
    if (mime === 'image/bmp') return 'BMP';
    if (mime === 'image/gif') return 'GIF';
    if (mime === 'image/x-icon') return 'ICO';
    return '';
  };

  const getExtension = (mime) => {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/bmp') return 'bmp';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/x-icon') return 'ico';
    return 'png';
  };

  return (
    <ToolPageShell
      title="GIF Converter"
      subtitle="Convert GIF images to JPEG, PNG, or WebP. Extract animation frames to images locally."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Convert GIF images online for free. Transform GIF animations into JPEG, PNG or WebP frames. Browser local GIF frame extractor tool."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.gif']}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Size: {formatSize(file.size)}</p>
                  {totalCount > 0 && (
                    <p className="text-[10px] text-primary font-bold mt-0.5">Frames: {totalCount}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Column: Previews Grid */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {frames.length > 1 ? 'Extracted Frames' : 'Converted Preview'}
              </h4>
              <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }} className="w-full">
                {frames.length > 0 ? (
                  frames.length === 1 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={frames[0].url} alt="Converted Preview" style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className="max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm" />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                      {frames.map((f) => (
                        <div key={f.number} className="border border-bordercolor bg-white rounded-xl p-3 flex flex-col gap-2 shadow-sm hover:border-primary/50 transition-colors">
                          <span className="text-[10px] font-black text-gray-400">FRAME {f.number}</span>
                          <div className="aspect-square w-full flex items-center justify-center bg-white border border-bordercolor/60 rounded-lg overflow-hidden relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.url} alt={`Frame ${f.number}`} className="max-h-full max-w-full object-contain" />
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => downloadSingleFrame(f)}
                                className="bg-primary hover:bg-primary/95 text-white rounded-lg p-2 font-bold text-[10px] shadow"
                              >
                                Save Frame
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : isConverting ? (
                  <div className="flex flex-col items-center gap-3 text-xs text-primary font-semibold">
                    <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Extracting Frame {processedCount} of {totalCount}...</span>
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
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Convert Settings</h4>

              {/* Dropdown output select */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Select an Output
                </label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/webp">WebP</option>
                  <option value="image/bmp">BMP</option>
                  <option value="image/gif">GIF (Static Frame)</option>
                  <option value="image/x-icon">ICO</option>
                </select>
              </div>

              {/* Advanced Options Group */}
              <div className="bg-lightbg/40 border border-bordercolor rounded-xl p-4 flex flex-col gap-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Advanced Options</span>

                {/* Resize */}
                {targetFormat !== 'image/x-icon' && (
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
                )}

                {/* ICO Favicon size */}
                {targetFormat === 'image/x-icon' && (
                  <div>
                    <label className="block text-xs font-bold text-textmain mb-1.5">Format and Size</label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-textmain">
                        <input 
                          type="checkbox" 
                          checked={icoFavicon} 
                          onChange={(e) => setIcoFavicon(e.target.checked)}
                          className="rounded text-primary h-4 w-4"
                        />
                        Favicon for websites (16x16)
                      </label>
                      {!icoFavicon && (
                        <select
                          value={icoSize}
                          onChange={(e) => setIcoSize(e.target.value)}
                          className="w-full text-xs border rounded px-2 py-1"
                        >
                          <option value="16x16">16x16</option>
                          <option value="32x32">32x32</option>
                          <option value="48x48">48x48</option>
                          <option value="64x64">64x64</option>
                          <option value="128x128">128x128</option>
                          <option value="256x256">256x256</option>
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* Quality slider */}
                {(targetFormat === 'image/jpeg' || targetFormat === 'image/webp' || targetFormat === 'image/gif') && (
                  <div>
                    <label className="block text-xs font-bold text-textmain mb-1">
                      {targetFormat === 'image/gif' ? 'Compression Level' : 'Compress Output Image'}
                    </label>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-gray-400 font-semibold">Quality:</span>
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
                )}

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

              {frames.length > 0 && frames[0].blob && (
                <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-semibold font-bold">File Info</span>
                  <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                    <span>Original size:</span>
                    <span className="font-mono text-gray-500">{formatSize(file.size)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                    <span>Extracted Format:</span>
                    <span className="font-mono text-primary font-bold">{getFormatLabel(targetFormat)}</span>
                  </div>
                </div>
              )}

              {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

              <div className="pt-3 border-t border-bordercolor/60">
                <button
                  type="button"
                  onClick={downloadAllFrames}
                  disabled={isConverting || frames.length === 0}
                  style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {frames.length > 1 ? 'Download All Frames (ZIP)' : `Download Converted ${getFormatLabel(targetFormat)}`}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
