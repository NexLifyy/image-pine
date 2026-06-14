"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ConverterDetails from '@/components/ConverterDetails';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3l4 4-4 4M16 21l-4-4 4-4"/><path d="M12 7H5a2 2 0 00-2 2v2M12 17h7a2 2 0 002-2v-2"/></svg>), title: 'Universal JPEG', desc: 'JPEG works everywhere - email, social, websites.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'Quality Control', desc: 'Adjust output JPEG quality from 5% to 100%.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Runs locally - no uploads ever.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Conversion finishes in milliseconds.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/></svg>), title: 'Batch Convert', desc: 'Convert multiple TIFF files at once.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' }
];

const _STEPS = [
  { n: '1', title: 'Upload TIFF', desc: 'Select your TIFF/TIF image file.' },
  { n: '2', title: 'Convert', desc: 'Converts all pages to JPEGs.' },
  { n: '3', title: 'Download', desc: 'Save single JPEG or download all in a ZIP.' }
];

const _FAQS = [
  {
    q: "Does this tool support multi-page TIFF files?",
    a: "Yes! Unlike basic converters that only process the first page, this tool decodes every page inside a multi-page TIFF file."
  },
  {
    q: "How can I download pages from a multi-page TIFF?",
    a: "You can download all pages packed together in a single, organized .zip file containing individual JPEGs, or hover over page thumbnails in the workspace grid to download specific pages one by one."
  },
  {
    q: "Are my heavy TIFF files uploaded to a server?",
    a: "No, never. TIFF files are often very large, but our tool decodes them entirely in your browser using local canvas and WebAssembly libraries. No files are uploaded."
  },
  {
    q: "What happens to transparency in transparent TIFF images?",
    a: "Since JPEG does not support transparency, any transparent areas in your TIFF pages will automatically be filled with a solid white background."
  },
  {
    q: "Will the image quality be preserved?",
    a: "Yes. The tool decodes the original pixel directories of the TIFF and renders them to canvas. You can set the JPG quality slider to 90% or higher to keep details sharp."
  },
  {
    q: "Can I resize the output JPG pages of the TIFF?",
    a: "Yes. You can specify a custom width or height, or scale by a percentage in the settings panel to resize all pages in the TIFF during conversion."
  }
];

export default function TiffToJpgPage() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(90);

  // Advanced options states
  const [resizeMode, setResizeMode] = useState('keep'); // 'keep' | 'custom'
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [autoOrient, setAutoOrient] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);

  // Output states
  const [pages, setPages] = useState([]); // Array of { number: number, blob: Blob, url: string }
  const [isConverting, setIsConverting] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
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

  // Clean up page URLs on selection change or unmount
  useEffect(() => {
    return () => {
      pages.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
  }, [pages]);

  const convertFile = async (selectedFile) => {
    setIsConverting(true);
    setProcessedCount(0);
    setTotalCount(0);
    setErrorMsg('');

    // Revoke old URLs
    pages.forEach((p) => {
      if (p.url) URL.revokeObjectURL(p.url);
    });
    setPages([]);

    try {
      // 1. Read file as ArrayBuffer
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsArrayBuffer(selectedFile);
      });

      // 2. Load UTIF dynamically
      const utifModule = await import('utif');
      const UTIF = utifModule.default || utifModule;

      // 3. Decode TIFF
      const ifds = UTIF.decode(arrayBuffer);
      if (!ifds || ifds.length === 0) {
        throw new Error('Invalid TIFF structure. Could not find image directories.');
      }

      const numPages = ifds.length;
      setTotalCount(numPages);

      const renderedPages = [];

      for (let i = 0; i < numPages; i++) {
        UTIF.decodeImage(arrayBuffer, ifds[i]);
        const rgba = UTIF.toRGBA8(ifds[i]);

        const canvas = document.createElement('canvas');
        let w = ifds[i].width;
        let h = ifds[i].height;

        // Handle custom resizing if selected
        if (resizeMode === 'custom') {
          const numW = parseInt(customWidth, 10);
          const numH = parseInt(customHeight, 10);
          if (!isNaN(numW) && !isNaN(numH)) {
            w = numW;
            h = numH;
          } else if (!isNaN(numW)) {
            h = Math.round(h * (numW / ifds[i].width));
            w = numW;
          } else if (!isNaN(numH)) {
            w = Math.round(w * (numH / ifds[i].height));
            h = numH;
          }
        }

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available.');
        }

        // Draw decoded TIFF onto a temporary canvas of original size
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = ifds[i].width;
        tempCanvas.height = ifds[i].height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          throw new Error('Temporary Canvas context not available.');
        }
        const imgData = tempCtx.createImageData(tempCanvas.width, tempCanvas.height);
        imgData.data.set(rgba);
        tempCtx.putImageData(imgData, 0, 0);

        // Fill background white because JPEG doesn't support transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);

        // Draw tempCanvas onto target canvas
        ctx.drawImage(tempCanvas, 0, 0, w, h);

        // Generate JPG Blob
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to generate JPEG blob.'));
            },
            'image/jpeg',
            quality / 100
          );
        });

        const url = URL.createObjectURL(blob);
        renderedPages.push({
          number: i + 1,
          blob,
          url,
        });

        setProcessedCount(i + 1);
      }

      setPages(renderedPages);
      setIsConverting(false);

      const displayPagesCount = numPages > 1 ? `${numPages} pages` : '1 page';
      saveHistory('TIFF to JPG Converter', `${selectedFile.name} (${displayPagesCount})`);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'TIFF conversion failed. Please ensure it is a valid TIFF/TIF file.');
      setIsConverting(false);
    }
  };

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
    } else {
      setFile(null);
      pages.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
      setPages([]);
      setProcessedCount(0);
      setTotalCount(0);
      setErrorMsg('');
    }
  };

  useEffect(() => {
    if (file) {
      convertFile(file);
    }
  }, [file, quality, resizeMode, customWidth, customHeight]);

  const downloadSinglePage = (p) => {
    if (!file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}_page_${p.number}.jpg`;
    saveAs(p.blob, newName);
  };

  const downloadAllImages = async () => {
    if (pages.length === 0 || !file) return;

    if (pages.length === 1) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const newName = `${baseName}.jpg`;
      saveAs(pages[0].blob, newName);
      return;
    }

    try {
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();

      const baseName = file.name.replace(/\.[^/.]+$/, '');

      pages.forEach((p) => {
        zip.file(`${baseName}_page_${p.number}.jpg`, p.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${baseName}_jpg_images.zip`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to build ZIP archive. Please try again.');
    }
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
      title="TIFF to JPG Converter"
      subtitle="Convert TIFF files to JPG format. Free, browser-based, no upload required."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Convert TIFF to JPG online for free. Transform TIFF to universally compatible JPEG in your browser. No uploads."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.tiff', '.tif']}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Size: {formatSize(file.size)}</p>
                </div>
              </div>
            </div>

            {/* Middle Column: Large Preview or Previews Grid */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {pages.length > 1 ? 'Decoded Pages' : 'JPG Preview'}
              </h4>
                  <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }} className="w-full">
                    {pages.length > 0 ? (
                      pages.length === 1 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pages[0].url} alt="JPG Preview" style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm" />
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                          {pages.map((p) => (
                            <div key={p.number} className="border border-bordercolor bg-white rounded-xl p-3 flex flex-col gap-2 shadow-sm hover:border-primary/50 transition-colors">
                              <span className="text-[10px] font-black text-gray-400">PAGE {p.number}</span>
                              <div className="aspect-[3/4] w-full flex items-center justify-center bg-white border border-bordercolor/60 rounded-lg overflow-hidden relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.url} alt={`Page ${p.number}`} className="max-h-full max-w-full object-contain" />
                                
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    onClick={() => downloadSinglePage(p)}
                                    className="bg-primary hover:bg-primary/95 text-white rounded-lg p-2 font-bold text-[10px] shadow"
                                  >
                                    Download JPG
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
                        <span>Decoding TIFF (page {processedCount} of {totalCount})...</span>
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

                  {pages.length > 0 && (
                    <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-semibold">Details</span>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Pages Extracted:</span>
                        <span className="font-mono text-primary font-bold">{pages.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Original Size:</span>
                        <span className="font-mono text-gray-500">{formatSize(file.size)}</span>
                      </div>
                    </div>
                  )}

                  {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

                  <div className="pt-3 border-t border-bordercolor/60">
                    <button
                      type="button"
                      onClick={downloadAllImages}
                      disabled={isConverting || pages.length === 0}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {pages.length > 1 ? 'Download JPGs (ZIP)' : 'Download JPG Image'}
                    </button>
                  </div>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
