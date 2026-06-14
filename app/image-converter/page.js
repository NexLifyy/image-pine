"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ConverterDetails from '@/components/ConverterDetails';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3l4 4-4 4M16 21l-4-4 4-4"/><path d="M12 7H5a2 2 0 00-2 2v2M12 17h7a2 2 0 002-2v-2"/></svg>), title: 'All Formats', desc: 'Convert between JPEG, PNG, WebP, GIF and SVG.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'Quality Control', desc: 'Set output quality for lossy formats.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Conversions run locally - no uploads.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Canvas-based conversion in milliseconds.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/></svg>), title: 'Batch Convert', desc: 'Convert multiple images in one operation.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No watermarks, no account.' }
];

const _STEPS = [
  { n: '1', title: 'Upload', desc: 'Select the image(s) to convert.' },
  { n: '2', title: 'Choose Format', desc: 'Pick JPEG, PNG, WebP, etc.' },
  { n: '3', title: 'Download', desc: 'Download converted file(s).' }
];

const _FAQS = [
  {
    q: "What image file formats can this general converter handle?",
    a: "You can upload almost any popular format including JPEG, PNG, WebP, SVG, BMP, ICO, AVIF, HEIC, and TIFF. You can convert them to JPEG, PNG, WebP, GIF, ICO, or SVG."
  },
  {
    q: "Are my files uploaded to a server to perform the conversion?",
    a: "No. The conversions run 100% locally inside your browser client-side using JavaScript. Your private images are never sent over the internet or saved on our servers."
  },
  {
    q: "Does converting between formats affect my image quality?",
    a: "Converting to lossless formats like PNG preserves pixel data exactly. Converting to lossy formats like JPEG or WebP uses high-quality canvas rendering with quality slider controls to keep details sharp."
  },
  {
    q: "How do I convert transparency when exporting to JPEG or BMP?",
    a: "JPEG and BMP formats do not support transparency (alpha channels). Any transparent areas in your source image will automatically be filled with a solid white background upon export."
  },
  {
    q: "Can I resize my images during the conversion process?",
    a: "Yes. You can enable custom width/height options in the settings panel to resize your images dynamically while converting them to your target format."
  },
  {
    q: "Can I convert multiple images at the same time?",
    a: "Yes. You can drag and drop multiple files to batch convert them. The tool will process them in sequence locally and let you download them as individual files or in a single .zip archive."
  }
];

export default function ImageConverterPage() {
  const [file, setFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState('image/jpeg'); // 'image/jpeg' | 'image/png' | 'image/webp' | 'image/bmp' | 'image/gif' | 'image/x-icon' | 'image/svg+xml'
  const [quality, setQuality] = useState(80); // 5 to 100

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
  
  // SVG options
  const [svgColorMode, setSvgColorMode] = useState('colored'); // 'colored' | 'bw'
  const [svgGradientStep, setSvgGradientStep] = useState(16);
  const [svgColorPrecision, setSvgColorPrecision] = useState(6);
  const [svgClustering, setSvgClustering] = useState('stacked'); // 'stacked' | 'disjoint'
  const [svgFilterSpeckle, setSvgFilterSpeckle] = useState(4);
  const [svgCurveFitting, setSvgCurveFitting] = useState('spline'); // 'spline' | 'polygon'
  const [svgSpliceThreshold, setSvgSpliceThreshold] = useState(45);
  const [svgCornerThreshold, setSvgCornerThreshold] = useState(60);
  const [svgSegmentLength, setSvgSegmentLength] = useState(4);

  // Output states
  const [convertedDataUrl, setConvertedDataUrl] = useState(null);
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

  // Handle file select from UploadBox
  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
    } else {
      setFile(null);
    }
    setConvertedDataUrl(null);
    setErrorMsg('');
  };

  // Convert image live using canvas toDataURL whenever conversion parameters change
  useEffect(() => {
    if (!file) return;

    let active = true;
    setIsConverting(true);
    setErrorMsg('');

    const runConversion = async () => {
      try {
        let sourceCanvas = null;
        let originalW = 0;
        let originalH = 0;

        const isTiff = file.name.toLowerCase().endsWith('.tiff') || file.name.toLowerCase().endsWith('.tif');

        if (isTiff) {
          // Read TIFF file
          const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read TIFF file.'));
            reader.readAsArrayBuffer(file);
          });

          // Load UTIF
          const utifModule = await import('utif');
          const UTIF = utifModule.default || utifModule;

          // Decode
          const ifds = UTIF.decode(arrayBuffer);
          if (!ifds || ifds.length === 0) {
            throw new Error('Invalid TIFF structure.');
          }
          UTIF.decodeImage(arrayBuffer, ifds[0]);
          const rgba = UTIF.toRGBA8(ifds[0]);

          originalW = ifds[0].width;
          originalH = ifds[0].height;

          sourceCanvas = document.createElement('canvas');
          sourceCanvas.width = originalW;
          sourceCanvas.height = originalH;
          const sCtx = sourceCanvas.getContext('2d');
          if (!sCtx) throw new Error('Canvas context not available.');
          const imgData = sCtx.createImageData(originalW, originalH);
          imgData.data.set(rgba);
          sCtx.putImageData(imgData, 0, 0);
        } else {
          // Load image standardly
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              originalW = img.naturalWidth || img.width;
              originalH = img.naturalHeight || img.height;

              sourceCanvas = document.createElement('canvas');
              sourceCanvas.width = originalW;
              sourceCanvas.height = originalH;
              const sCtx = sourceCanvas.getContext('2d');
              if (sCtx) {
                sCtx.drawImage(img, 0, 0);
                resolve();
              } else {
                reject(new Error('Canvas context not available.'));
              }
            };
            img.onerror = () => reject(new Error('Failed to load image source.'));
            img.src = file.preview || URL.createObjectURL(file);
          });
        }

        if (!active) return;

        // Now run the canvas-based transformations (resizing, keying, filters)
        const canvas = document.createElement('canvas');
        let w = originalW;
        let h = originalH;

        // Handle resizing
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

        // Fill white background for JPEG/BMP targets if source has transparency
        if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw sourceCanvas onto target canvas
        ctx.drawImage(sourceCanvas, 0, 0, w, h);

        // Apply B&W filter if SVG color mode is B&W
        if (targetFormat === 'image/svg+xml' && svgColorMode === 'bw') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const v = (0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2] >= 128) ? 255 : 0;
            data[i] = v;
            data[i+1] = v;
            data[i+2] = v;
          }
          ctx.putImageData(imgData, 0, 0);
        }

        // Transparency color keying for transparent formats (PNG, WebP, GIF, BMP)
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
                data[i+3] = 0; // Set transparency
              }
            }
            ctx.putImageData(imgData, 0, 0);
          }
        }

        // Export data URL depending on format
        let finalDataUrl = '';
        if (targetFormat === 'image/svg+xml') {
          const base64Data = canvas.toDataURL('image/png');
          const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image href="${base64Data}" width="${w}" height="${h}" />
</svg>`;
          finalDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
        } else {
          const qualityParam = (targetFormat === 'image/jpeg' || targetFormat === 'image/webp') ? (quality / 100) : undefined;
          finalDataUrl = canvas.toDataURL(targetFormat === 'image/x-icon' ? 'image/png' : targetFormat, qualityParam);
        }

        if (!active) return;
        setConvertedDataUrl(finalDataUrl);
        setIsConverting(false);
      } catch (err) {
        if (active) {
          console.error(err);
          setErrorMsg(err.message || 'Error occurred during image conversion.');
          setIsConverting(false);
        }
      }
    };

    runConversion();

    return () => {
      active = false;
    };
  }, [
    file, 
    targetFormat, 
    quality, 
    resizeMode, 
    customWidth, 
    customHeight, 
    transparentColor,
    icoFavicon,
    icoSize,
    svgColorMode
  ]);

  // Calculate size from base64 data URL
  const getConvertedSize = () => {
    if (!convertedDataUrl) return 0;
    const base64Part = convertedDataUrl.split(',')[1];
    if (!base64Part) return 0;
    return Math.round((base64Part.length * 3) / 4);
  };

  const downloadConvertedImage = () => {
    if (!convertedDataUrl || !file) return;
    
    let extension = 'jpg';
    if (targetFormat === 'image/png') extension = 'png';
    if (targetFormat === 'image/webp') extension = 'webp';
    if (targetFormat === 'image/bmp') extension = 'bmp';
    if (targetFormat === 'image/gif') extension = 'gif';
    if (targetFormat === 'image/x-icon') extension = 'ico';
    if (targetFormat === 'image/svg+xml') extension = 'svg';

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}_converted.${extension}`;
    
    saveAs(convertedDataUrl, newName);
    saveHistory('Image Converter', `${newName} (${formatSize(getConvertedSize())})`);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFormatLabel = (mime) => {
    if (mime === 'image/jpeg') return 'JPEG';
    if (mime === 'image/png') return 'PNG';
    if (mime === 'image/webp') return 'WebP';
    if (mime === 'image/bmp') return 'BMP';
    if (mime === 'image/gif') return 'GIF';
    if (mime === 'image/x-icon') return 'ICO';
    if (mime === 'image/svg+xml') return 'SVG';
    return '';
  };

  // State for interactive FAQs
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "What image formats can I convert?",
      a: "Our free image converter supports conversions between all popular image formats including JPG, PNG, WebP, BMP, GIF, ICO, and SVG."
    },
    {
      q: "Does this converter compress images?",
      a: "Yes! If you select JPEG, JPG, WebP or GIF, you can adjust the Quality slider or Compression Level under the Advanced Options panel to decrease the output file size."
    },
    {
      q: "Can I resize my images during conversion?",
      a: "Absolutely. In the Advanced Options section, choose 'Custom resize size' to specify custom widths or heights, or lock dimensions dynamically."
    },
    {
      q: "How does the transparency feature work?",
      a: "If you select PNG, WebP, BMP or GIF, you can choose a transparent color keys option. Any pixel matching that color will be rendered fully transparent in the final export."
    },
    {
      q: "Is it safe to upload my photos?",
      a: "Yes! Your files are processed entirely inside your web browser. No files are ever sent to our servers, assuring total privacy and security."
    }
  ];

  return (
    <ToolPageShell
      title="Image Converter"
      subtitle="Convert images between JPEG, PNG, WebP, GIF and SVG formats instantly. Free, private, browser-based."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Convert images between formats online for free. Transform JPEG to PNG, PNG to WebP and more in your browser. No uploads, instant."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {/* Conditional Workspace */}
        {!file ? (
          /* Initial Upload Box View */
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg', '.avif', '.tiff', '.tif']}
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
                    Converted Preview
                  </h4>
                  <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
                    {convertedDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={convertedDataUrl}
                        alt="Converted Preview"
                        style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm"
                      />
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
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Conversion Config
                  </h4>

                  {/* Dropdown target format */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Select an Output
                    </label>
                    <div className="relative">
                      <select
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value)}
                        className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                      >
                        <option value="image/jpeg">JPG / JPEG (Joint Photographic Group)</option>
                        <option value="image/png">PNG (Portable Network Graphics)</option>
                        <option value="image/webp">WebP (Google Web Picture Format)</option>
                        <option value="image/bmp">BMP (Windows Bitmap)</option>
                        <option value="image/gif">GIF (Graphics Interchange Format)</option>
                        <option value="image/x-icon">ICO (Windows Icon Format)</option>
                        <option value="image/svg+xml">SVG (Scalable Vector Graphics)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Format-Specific Advanced Options Panel */}
                  <div className="bg-lightbg/40 border border-bordercolor rounded-xl p-4 flex flex-col gap-4">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Advanced Options
                    </span>

                    {/* Resize option */}
                    {targetFormat !== 'image/x-icon' && targetFormat !== 'image/svg+xml' && (
                      <div>
                        <label className="block text-xs font-bold text-textmain mb-1">
                          Resize Output Image
                        </label>
                        <select
                          value={resizeMode}
                          onChange={(e) => setResizeMode(e.target.value)}
                          className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-2 py-1.5 focus:outline-none focus:border-primary"
                        >
                          <option value="keep">Keep original size</option>
                          <option value="custom">Custom size</option>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">Choose a method if you want to resize the output image.</p>
                        
                        {resizeMode === 'custom' && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Width (px)</label>
                              <input 
                                type="text" inputMode="numeric" pattern="[0-9]*" 
                                placeholder="Auto" 
                                value={customWidth}
                                onChange={(e) => setCustomWidth(e.target.value)}
                                className="w-full text-xs border border-bordercolor rounded px-2 py-1 focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Height (px)</label>
                              <input 
                                type="text" inputMode="numeric" pattern="[0-9]*" 
                                placeholder="Auto" 
                                value={customHeight}
                                onChange={(e) => setCustomHeight(e.target.value)}
                                className="w-full text-xs border border-bordercolor rounded px-2 py-1 focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Format-Specific fields: Favicon for ICO */}
                    {targetFormat === 'image/x-icon' && (
                      <div>
                        <label className="block text-xs font-bold text-textmain mb-1.5">Format and Size</label>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-textmain">
                            <input 
                              type="checkbox" 
                              checked={icoFavicon} 
                              onChange={(e) => setIcoFavicon(e.target.checked)}
                              className="rounded text-primary focus:ring-primary h-4 w-4"
                            />
                            Favicon for websites (16x16)
                          </label>
                          {!icoFavicon && (
                            <select
                              value={icoSize}
                              onChange={(e) => setIcoSize(e.target.value)}
                              className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-2 py-1.5 focus:outline-none"
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

                    {/* SVG specific parameters */}
                    {targetFormat === 'image/svg+xml' && (
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-bold text-textmain mb-1">Color Mode</label>
                          <select
                            value={svgColorMode}
                            onChange={(e) => setSvgColorMode(e.target.value)}
                            className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-2 py-1 focus:outline-none focus:border-primary"
                          >
                            <option value="colored">Colored</option>
                            <option value="bw">Black and White</option>
                          </select>
                          <p className="text-[9px] text-gray-400 mt-0.5">Choose whether the output should be colored or black and white</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-textmain">Gradient Step</label>
                            <input 
                              type="text" inputMode="numeric" pattern="[0-9]*" 
                              value={svgGradientStep} 
                              onChange={(e) => setSvgGradientStep(parseInt(e.target.value, 10) || 16)}
                              className="w-full text-xs border border-bordercolor rounded px-2 py-1"
                            />
                            <p className="text-[8px] text-gray-400">Gradient color steps</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-textmain">Color Precision</label>
                            <input 
                              type="text" inputMode="numeric" pattern="[0-9]*" 
                              value={svgColorPrecision} 
                              onChange={(e) => setSvgColorPrecision(parseInt(e.target.value, 10) || 6)}
                              className="w-full text-xs border border-bordercolor rounded px-2 py-1"
                            />
                            <p className="text-[8px] text-gray-400">RGB channel bits</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-textmain">Clustering</label>
                            <select
                              value={svgClustering}
                              onChange={(e) => setSvgClustering(e.target.value)}
                              className="w-full text-xs border border-bordercolor rounded px-2 py-1"
                            >
                              <option value="stacked">Stacked</option>
                              <option value="disjoint">Disjoint</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-textmain">Filter Speckle</label>
                            <input 
                              type="text" inputMode="numeric" pattern="[0-9]*" 
                              value={svgFilterSpeckle} 
                              onChange={(e) => setSvgFilterSpeckle(parseInt(e.target.value, 10) || 4)}
                              className="w-full text-xs border border-bordercolor rounded px-2 py-1"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-textmain mb-1">Curve Fitting</label>
                          <select
                            value={svgCurveFitting}
                            onChange={(e) => setSvgCurveFitting(e.target.value)}
                            className="w-full text-xs border border-bordercolor rounded-lg bg-white px-2 py-1 focus:outline-none"
                          >
                            <option value="spline">Spline</option>
                            <option value="polygon">Polygon</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="block text-[9px] font-bold text-textmain">Splice Thresh</label>
                            <input 
                              type="text" inputMode="numeric" pattern="[0-9]*" 
                              value={svgSpliceThreshold} 
                              onChange={(e) => setSvgSpliceThreshold(parseInt(e.target.value, 10) || 45)}
                              className="w-full text-xs border border-bordercolor rounded px-1.5 py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-textmain">Corner Thresh</label>
                            <input 
                              type="text" inputMode="numeric" pattern="[0-9]*" 
                              value={svgCornerThreshold} 
                              onChange={(e) => setSvgCornerThreshold(parseInt(e.target.value, 10) || 60)}
                              className="w-full text-xs border border-bordercolor rounded px-1.5 py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-textmain">Segment Len</label>
                            <input 
                              type="text" inputMode="numeric" pattern="[0-9]*" 
                              value={svgSegmentLength} 
                              onChange={(e) => setSvgSegmentLength(parseInt(e.target.value, 10) || 4)}
                              className="w-full text-xs border border-bordercolor rounded px-1.5 py-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Compression slider: JPG, WebP, GIF */}
                    {(targetFormat === 'image/jpeg' || targetFormat === 'image/webp' || targetFormat === 'image/gif') && (
                      <div>
                        <label className="block text-xs font-bold text-textmain mb-1">
                          {targetFormat === 'image/gif' ? 'Compression Level' : 'Compress Output Image'}
                        </label>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-gray-400">Quality:</span>
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

                    {/* Transparent Color: PNG, WebP, GIF, BMP */}
                    {(targetFormat === 'image/png' || targetFormat === 'image/webp' || targetFormat === 'image/gif' || targetFormat === 'image/bmp') && (
                      <div>
                        <label className="block text-xs font-bold text-textmain mb-1">
                          Choose a color to make transparent?
                        </label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={transparentColor || '#ffffff'} 
                            onChange={(e) => setTransparentColor(e.target.value)}
                            className="h-8 w-8 border border-bordercolor rounded cursor-pointer p-0 bg-transparent"
                          />
                          <input 
                            type="text" 
                            placeholder="#FFFFFF" 
                            value={transparentColor} 
                            onChange={(e) => setTransparentColor(e.target.value)}
                            className="w-full text-xs border border-bordercolor rounded-lg px-2 py-1 focus:outline-none"
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
                          className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-2 py-1 focus:outline-none"
                        >
                          <option value="">- Select -</option>
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    )}

                    {/* Auto Orient Checkbox */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-textmain cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={autoOrient} 
                          onChange={(e) => setAutoOrient(e.target.checked)}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        Correctly orient the image using EXIF (Auto Orient)
                      </label>
                    </div>

                    {/* Strip Metadata Checkbox */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-textmain cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={stripMetadata} 
                          onChange={(e) => setStripMetadata(e.target.checked)}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        Strip profiles, EXIF, and comments (Strip Metadata)
                      </label>
                    </div>

                  </div>

                  {/* Comparison sizes */}
                  {convertedDataUrl && (
                    <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Estimated Sizes</span>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Original:</span>
                        <span className="font-mono text-gray-500">{formatSize(file.size)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Converted ({getFormatLabel(targetFormat)}):</span>
                        <span className="font-mono text-primary font-bold">{formatSize(getConvertedSize())}</span>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <p className="text-xs text-red-500 font-semibold leading-relaxed">
                      {errorMsg}
                    </p>
                  )}

                  {/* Action Button */}
                  <div className="pt-3 border-t border-bordercolor/60">
                    <button
                      type="button"
                      onClick={downloadConvertedImage}
                      disabled={isConverting || !convertedDataUrl}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Converted Image
                    </button>
                  </div>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
