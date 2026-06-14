"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>), title: 'PDF Compression', desc: 'Compress embedded images within PDF pages.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'Quality Control', desc: 'Set image compression quality inside the PDF.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Browser-based using PDF.js - nothing uploaded.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Fast', desc: 'Efficient compression for quick results.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'No Watermarks', desc: 'Clean outputs with no added branding.' }
];

const _STEPS = [
  { n: '1', title: 'Upload PDF', desc: 'Select your PDF file.' },
  { n: '2', title: 'Set Quality', desc: 'Adjust image compression level.' },
  { n: '3', title: 'Download', desc: 'Download your compressed PDF.' }
];

const _FAQS = [
  {
    q: "What is the difference between Lossless and Raster (Strong) PDF compression?",
    a: "Lossless compression removes duplicate structural metadata, unused streams, and optimizes structural objects while leaving text and image pixels untouched. Raster compression renders PDF pages into high-efficiency JPEG images to drastically reduce file sizes, though it will flatten text elements."
  },
  {
    q: "Will my PDF's text remain selectable after compression?",
    a: "Yes, if you choose 'Lossless' mode. In 'Raster' mode, pages are converted into images, meaning text is flattened and no longer selectable, which is ideal for reducing heavy photo-rich documents."
  },
  {
    q: "How does the quality slider affect my compressed PDF?",
    a: "The quality slider is only active in Raster mode. Setting it between 60% and 80% offers the best balance, significantly shrinking the file size while keeping text and images clear and legible."
  },
  {
    q: "Are my files uploaded to a remote server for compression?",
    a: "No. The compression algorithm is executed entirely in your browser using local client-side memory. Your private documents never leave your computer."
  },
  {
    q: "Why didn't my PDF file shrink much in Lossless mode?",
    a: "If your PDF is already optimized or consists mostly of vector shapes and plain text with no redundant metadata, there is little room for lossless compression. In such cases, switching to Raster mode will force a significant size reduction."
  },
  {
    q: "Is there a limit on the file size I can upload for compression?",
    a: "Since the compressor runs locally in browser memory, files under 100 MB are recommended to ensure smooth performance without causing browser tabs to reload."
  }
];

export default function CompressPdfPage() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Compression configuration states
  const [compressMode, setCompressMode] = useState('lossless'); // 'lossless' | 'lossy'
  const [resScale, setResScale] = useState(1.0); // 0.5 to 2.0
  const [jpgQuality, setJpgQuality] = useState(0.7); // 0.1 to 1.0
  
  // Progress states for raster conversion
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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
    setCompressedBlob(null);
    setErrorMsg('');
    setProcessedCount(0);
    setTotalCount(0);
  };

  // Dynamically load PDF.js from cdnjs in browser
  const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = () => {
        reject(new Error('Failed to load PDF engine. Please check your network connection.'));
      };
      document.head.appendChild(script);
    });
  };

  const compressPdf = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');
    setCompressedBlob(null);
    setProcessedCount(0);
    setTotalCount(0);

    try {
      const { PDFDocument } = await import('pdf-lib');
      
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;

          if (compressMode === 'lossless') {
            // Lossless Mode: Copy pages to a new document to garbage collect unreferenced objects and strip incremental updates
            const srcDoc = await PDFDocument.load(arrayBuffer);
            const targetDoc = await PDFDocument.create();
            
            // Safely copy metadata
            const title = srcDoc.getTitle();
            if (title) targetDoc.setTitle(title);
            const author = srcDoc.getAuthor();
            if (author) targetDoc.setAuthor(author);
            const subject = srcDoc.getSubject();
            if (subject) targetDoc.setSubject(subject);
            const creator = srcDoc.getCreator();
            if (creator) targetDoc.setCreator(creator);
            const producer = srcDoc.getProducer();
            if (producer) targetDoc.setProducer(producer);

            const copiedPages = await targetDoc.copyPages(srcDoc, srcDoc.getPageIndices());
            copiedPages.forEach((page) => targetDoc.addPage(page));

            const compressedBytes = await targetDoc.save({
              useObjectStreams: true,
            });

            const blob = new Blob([compressedBytes], { type: 'application/pdf' });
            setCompressedBlob(blob);
            setIsProcessing(false);

            const newName = file.name.replace(/\.[^/.]+$/, '') + '_compressed.pdf';
            saveHistory('Compress PDF', `${newName} (${formatSize(blob.size)})`);
            return;
          }

          // Lossy Mode: Rasterize PDF pages using PDF.js and compress them as JPEG
          const pdfjs = await loadPdfJs();
          const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
          const sourcePdf = await loadingTask.promise;
          const numPages = sourcePdf.numPages;
          setTotalCount(numPages);

          const outputPdfDoc = await PDFDocument.create();

          for (let i = 1; i <= numPages; i++) {
            setProcessedCount(i);
            const page = await sourcePdf.getPage(i);
            
            // Render viewport with user defined resolution scale
            const viewport = page.getViewport({ scale: resScale });
            
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Canvas 2D context not available.');
            }

            // Render PDF page to canvas
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            // Re-compress page as JPEG at specified quality
            const jpegDataUrl = canvas.toDataURL('image/jpeg', jpgQuality);
            const jpegBytes = await fetch(jpegDataUrl).then((res) => res.arrayBuffer());

            const embeddedImage = await outputPdfDoc.embedJpg(jpegBytes);
            
            // Draw image on a new PDF page matching original dimensions (at scale 1.0 points)
            const origViewport = page.getViewport({ scale: 1.0 });
            const newPage = outputPdfDoc.addPage([origViewport.width, origViewport.height]);
            newPage.drawImage(embeddedImage, {
              x: 0,
              y: 0,
              width: origViewport.width,
              height: origViewport.height,
            });
          }

          const compressedBytes = await outputPdfDoc.save({
            useObjectStreams: true,
          });

          const blob = new Blob([compressedBytes], { type: 'application/pdf' });
          setCompressedBlob(blob);
          setIsProcessing(false);

          const newName = file.name.replace(/\.[^/.]+$/, '') + '_compressed.pdf';
          saveHistory('Compress PDF', `${newName} (${formatSize(blob.size)})`);
        } catch (err) {
          console.error(err);
          setErrorMsg(err.message || 'Error occurred during PDF compression.');
          setIsProcessing(false);
        }
      };

      fileReader.onerror = () => {
        setErrorMsg('Failed to read PDF file.');
        setIsProcessing(false);
      };

      fileReader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to initialize PDF library.');
      setIsProcessing(false);
    }
  };

  const downloadCompressedPdf = () => {
    if (!compressedBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}_compressed.pdf`;
    saveAs(compressedBlob, newName);
  };

  const getSavingsPercentage = () => {
    if (!file || !compressedBlob) return 0;
    const diff = file.size - compressedBlob.size;
    if (diff <= 0) return 0;
    return Math.round((diff / file.size) * 100);
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
      title="Compress PDF"
      subtitle="Reduce PDF file sizes by compressing embedded images. Free, browser-based."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Compress PDF files online for free. Reduce PDF sizes by compressing embedded images in your browser. No uploads."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.pdf']}
              multiple={false} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Actions & Modes */}
            <div className="bg-white rounded-2xl border border-bordercolor p-5 shadow-sm h-fit flex flex-col gap-5">
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Uploaded PDF</h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">Remove</button>
              </div>

              {/* File Info */}
              <div className="p-3 bg-lightbg/45 border border-bordercolor/60 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-white border border-bordercolor rounded-lg text-primary flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Original Size: {formatSize(file.size)}</p>
                </div>
              </div>

              {/* Compression Mode */}
              <div className="flex flex-col gap-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Compression Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCompressMode('lossless');
                      setCompressedBlob(null);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      compressMode === 'lossless'
                        ? 'border-primary bg-blue-50/20 text-primary'
                        : 'border-bordercolor hover:border-gray-400 bg-white text-textmain'
                    }`}
                  >
                    Lossless Packing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompressMode('lossy');
                      setCompressedBlob(null);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      compressMode === 'lossy'
                        ? 'border-primary bg-blue-50/20 text-primary'
                        : 'border-bordercolor hover:border-gray-400 bg-white text-textmain'
                    }`}
                  >
                    Raster (Strong)
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-medium leading-normal">
                  {compressMode === 'lossless' 
                    ? "✓ Rebuilds the PDF by copying only active pages and referenced objects. Discards incremental save histories, unused fonts, and duplicate metadata losslessly."
                    : "✓ Renders page graphics and downsamples images to JPEG. Achieves significant file size reduction but text becomes unselectable."
                  }
                </p>
              </div>

              {/* Sliders for Lossy Mode */}
              {compressMode === 'lossy' && (
                <div className="flex flex-col gap-4 border-t border-bordercolor/60 pt-4">
                  {/* Quality Slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-textmain">JPEG Quality</span>
                      <span className="text-primary font-mono">{Math.round(jpgQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={jpgQuality}
                      onChange={(e) => {
                        setJpgQuality(parseFloat(e.target.value));
                        setCompressedBlob(null);
                      }}
                      className="w-full accent-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Resolution Scale Slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-textmain">Resolution Scale</span>
                      <span className="text-primary font-mono">{Math.round(resScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={resScale}
                      onChange={(e) => {
                        setResScale(parseFloat(e.target.value));
                        setCompressedBlob(null);
                      }}
                      className="w-full accent-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={compressPdf}
                disabled={isProcessing}
                style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
              >
                {isProcessing ? 'Compressing PDF...' : 'Compress PDF'}
              </button>
            </div>

            {/* Right Column: Console Dashboard */}
            <div style={{ gridColumn: "span 2 / span 2", background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 22 }}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-bold">Compression Dashboard</h4>
              
              {isProcessing && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 bg-lightbg/40 border border-bordercolor/80 rounded-2xl">
                  <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {compressMode === 'lossy' && totalCount > 0 ? (
                    <span className="text-xs font-bold text-textmain">Compressing page {processedCount} of {totalCount}...</span>
                  ) : (
                    <span className="text-xs font-bold text-textmain">Optimizing PDF files...</span>
                  )}
                </div>
              )}

              {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

              {compressedBlob && (
                <div className="flex flex-col gap-5">
                  <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-3">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Optimization Summary</span>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Original Size:</span>
                        <span className="font-mono text-gray-500">{formatSize(file.size)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain mt-2">
                        <span>Compressed Size:</span>
                        <span className="font-mono text-primary font-bold">{formatSize(compressedBlob.size)}</span>
                      </div>
                    </div>

                    {getSavingsPercentage() > 0 ? (
                      <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-lg p-2.5 flex items-center justify-between mt-1">
                        <span>Size Reduction:</span>
                        <span className="font-mono font-black text-sm">-{getSavingsPercentage()}%</span>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold rounded-lg p-2.5 mt-1 leading-relaxed">
                        Notice: The compressed size is equal to or larger than the original. Try the "Raster (Strong)" option for a higher compression ratio.
                      </div>
                    )}
                  </div>

                  <button
                    onClick={downloadCompressedPdf}
                    style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(22,163,74,0.28)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Compressed PDF
                  </button>
                </div>
              )}

              {!isProcessing && !compressedBlob && (
                <div className="text-xs text-gray-400 text-center py-16 font-medium border border-dashed border-bordercolor rounded-2xl bg-lightbg/10">
                  Configure options and select "Compress PDF" to start optimization.
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
