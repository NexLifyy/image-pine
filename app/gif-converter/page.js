"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ConverterDetails from '@/components/ConverterDetails';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3l4 4-4 4M16 21l-4-4 4-4"/><path d="M12 7H5a2 2 0 00-2 2v2M12 17h7a2 2 0 002-2v-2"/></svg>), title: 'GIF to Any Format', desc: 'Export GIF frames as JPEG, PNG, or WebP.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'All conversion runs in your browser.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Fast canvas-based conversion.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>), title: 'Quality Control', desc: 'Fine-tune output file settings before saving.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'No Watermarks', desc: 'Clean outputs with no added branding.' }
];

const _STEPS = [
  { n: '1', title: 'Upload GIF', desc: 'Select your GIF file.' },
  { n: '2', title: 'Choose Format', desc: 'Pick JPEG, PNG, or WebP.' },
  { n: '3', title: 'Download', desc: 'Download your converted image.' }
];

const _FAQS = [
  { q: 'Is animation preserved?', a: 'When converting to still formats, the first frame is exported.' },
  { q: 'Are files uploaded?', a: 'No. Everything runs in your browser.' }
];

export default function GifConverterPage() {
  const [file, setFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState('image/png'); // 'image/png' | 'image/jpeg' | 'image/webp' | 'image/bmp' | 'image/gif' | 'image/x-icon'
  const [quality, setQuality] = useState(90);

  // Advanced options states
  const [resizeMode, setResizeMode] = useState('keep'); // 'keep' | 'custom'
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [transparentColor, setTransparentColor] = useState('');
  const [autoOrient, setAutoOrient] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [gifAlignment, setGifAlignment] = useState('');
  const [icoFavicon, setIcoFavicon] = useState(false);
  const [icoSize, setIcoSize] = useState('32x32');

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

        // Custom resizing
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

        canvas.width = w;
        canvas.height = h;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available.');
        }

        // Fill background white if JPEG or BMP is selected
        if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
        }

        // Drawing GIF onto canvas extracts the first frame naturally
        ctx.drawImage(img, 0, 0, w, h);

        // Transparency color keyer
        if (transparentColor && (targetFormat === 'image/png' || targetFormat === 'image/webp' || targetFormat === 'image/gif' || targetFormat === 'image/bmp')) {
          const hex = transparentColor.replace('#', '');
          const rMatch = parseInt(hex.substring(0, 2), 16);
          const gMatch = parseInt(hex.substring(2, 4), 16);
          const bMatch = parseInt(hex.substring(4, 6), 16);
          
          if (!isNaN(rMatch) && !isNaN(gMatch) && !isNaN(bMatch)) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const tolerance = 20;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i+1];
              const b = data[i+2];
              if (
                Math.abs(r - rMatch) < tolerance &&
                Math.abs(g - gMatch) < tolerance &&
                Math.abs(b - bMatch) < tolerance
              ) {
                data[i+3] = 0;
              }
            }
            ctx.putImageData(imgData, 0, 0);
          }
        }

        const mimeParam = targetFormat === 'image/x-icon' ? 'image/png' : targetFormat;
        const qualityParam = (targetFormat === 'image/jpeg' || targetFormat === 'image/webp') ? (quality / 100) : undefined;
        canvas.toBlob(
          (blob) => {
            if (!active) return;
            if (!blob) {
              throw new Error('Failed to convert GIF to blob.');
            }

            if (convertedUrl) {
              URL.revokeObjectURL(convertedUrl);
            }

            const url = URL.createObjectURL(blob);
            setConvertedBlob(blob);
            setConvertedUrl(url);
            setIsConverting(false);
          },
          mimeParam,
          qualityParam
        );
      } catch (err) {
        if (active) {
          console.error(err);
          setErrorMsg(err.message || 'Error occurred during GIF conversion.');
          setIsConverting(false);
        }
      }
    };

    img.onerror = () => {
      if (active) {
        setErrorMsg('Failed to process GIF image source.');
        setIsConverting(false);
      }
    };

    img.src = file.preview || URL.createObjectURL(file);

    return () => {
      active = false;
    };
  }, [file, targetFormat, quality, resizeMode, customWidth, customHeight, transparentColor, icoFavicon, icoSize]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (convertedUrl) {
        URL.revokeObjectURL(convertedUrl);
      }
    };
  }, [convertedUrl]);

  const downloadFrame = () => {
    if (!convertedBlob || !file) return;
    
    let extension = 'png';
    if (targetFormat === 'image/jpeg') extension = 'jpg';
    if (targetFormat === 'image/webp') extension = 'webp';
    if (targetFormat === 'image/bmp') extension = 'bmp';
    if (targetFormat === 'image/gif') extension = 'gif';
    if (targetFormat === 'image/x-icon') extension = 'ico';

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}.${extension}`;
    saveAs(convertedBlob, newName);
    saveHistory('GIF Converter', newName);
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

  // State for collapsible FAQs
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "Does this GIF converter extract frames?",
      a: "Yes. In the browser canvas environment, drawing an animated GIF naturally grabs and converts the very first frame to a static image format."
    },
    {
      q: "What output formats are supported?",
      a: "You can convert GIF frames to PNG, JPG, WebP, BMP, GIF, or ICO formats."
    },
    {
      q: "How does the transparent color selector work?",
      a: "Under Advanced Options, select a color (e.g. solid white #FFFFFF) to key it out and replace it with transparency."
    },
    {
      q: "Are my animated GIFs safe?",
      a: "Yes. All processing is done locally on your computer. Your files are never uploaded to any server."
    }
  ];

  return (
    <ToolPageShell
      title="GIF Converter"
      subtitle="Convert GIF images to JPEG, PNG or WebP. Or convert images to GIF. Free, browser-based."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Convert GIF images online for free. Transform GIF to JPEG, PNG or WebP in your browser. No uploads."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {!file ? (
          <div style={{ maxWidth: 680, margin: "0 auto", background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "48px 40px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", minHeight: 260 }}>
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
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Preview</h4>
                  <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
                    {convertedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={convertedUrl} alt="Converted Preview" style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm" />
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                        <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Extracting frame...
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
                      <option value="image/gif">GIF</option>
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

                    {/* Transparent Color */}
                    {(targetFormat === 'image/png' || targetFormat === 'image/webp' || targetFormat === 'image/gif' || targetFormat === 'image/bmp') && (
                      <div>
                        <label className="block text-xs font-bold text-textmain mb-1">Choose a color to make transparent?</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={transparentColor || '#ffffff'} 
                            onChange={(e) => setTransparentColor(e.target.value)}
                            className="h-8 w-8 border rounded cursor-pointer bg-transparent"
                          />
                          <input 
                            type="text" 
                            placeholder="#FFFFFF" 
                            value={transparentColor} 
                            onChange={(e) => setTransparentColor(e.target.value)}
                            className="w-full text-xs border rounded px-2 py-1"
                          />
                        </div>
                      </div>
                    )}

                    {/* GIF Alignment dropdown */}
                    {targetFormat === 'image/gif' && (
                      <div>
                        <label className="block text-xs font-bold text-textmain mb-1">Alignment</label>
                        <select
                          value={gifAlignment}
                          onChange={(e) => setGifAlignment(e.target.value)}
                          className="w-full text-xs border rounded px-2 py-1"
                        >
                          <option value="">- Select -</option>
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
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

                  {convertedBlob && (
                    <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-semibold font-bold">File Sizes</span>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Original (GIF):</span>
                        <span className="font-mono text-gray-500">{formatSize(file.size)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Converted ({getFormatLabel(targetFormat)}):</span>
                        <span className="font-mono text-primary font-bold">{formatSize(convertedBlob.size)}</span>
                      </div>
                    </div>
                  )}

                  {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

                  <div className="pt-3 border-t border-bordercolor/60">
                    <button
                      type="button"
                      onClick={downloadFrame}
                      disabled={isConverting || !convertedBlob}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download static {getFormatLabel(targetFormat)} frame
                    </button>
                  </div>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
