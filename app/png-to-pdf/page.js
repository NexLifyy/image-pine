"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>), title: 'Lossless PDF', desc: 'PNG images are embedded losslessly in the PDF.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Browser-based, nothing uploaded.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Fast PDF generation.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Quality Preserved', desc: 'Retains original resolution and details.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'No Watermarks', desc: 'Clean outputs with no added branding.' }
];

const _STEPS = [
  { n: '1', title: 'Upload PNGs', desc: 'Select one or more PNG files.' },
  { n: '2', title: 'Arrange', desc: 'Order pages as needed.' },
  { n: '3', title: 'Download PDF', desc: 'Download your PDF.' }
];

const _FAQS = [
  {
    q: "Will the transparent background of my PNG be preserved in the PDF?",
    a: "Yes. The converter fully supports PNG alpha transparency channels, embedding transparent PNG graphics correctly without turning transparent backgrounds black or white."
  },
  {
    q: "Can I combine multiple PNG files into one PDF document?",
    a: "Yes. Every PNG file you upload will become a separate page in the generated PDF, arranged in the exact order you select."
  },
  {
    q: "Does converting PNG to PDF affect the image resolution?",
    a: "No. The tool embeds the original PNG pixel data directly into the PDF layout wrapper, ensuring the output remains lossless and pixel-perfect."
  },
  {
    q: "Can I rearrange the order of the PNG pages before exporting?",
    a: "Yes. You can drag and drop thumbnails in the workspace grid to reorder pages, and use the rotate buttons to fix any orientation issues."
  },
  {
    q: "Are my PNG images uploaded to any server for processing?",
    a: "No, never. The file reading, layout compilation, and PDF generation are done 100% locally in your web browser."
  },
  {
    q: "Can I customize the page layout margins and page sizes?",
    a: "Yes. You can choose to match the original image size, or fit to standard formats like A4 and US Letter with customizable page margin spacing."
  }
];

export default function PngToPdfPage() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

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

  const handleFileSelect = (selectedList) => {
    setFiles(selectedList);
    setErrorMsg('');
  };

  const imageToPngBytes = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context not available.'));
            return;
          }
          
          // Draw image
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Blob conversion failed.'));
              return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve(new Uint8Array(e.target.result));
            };
            reader.readAsArrayBuffer(blob);
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image source.'));
      img.src = file.preview || URL.createObjectURL(file);
    });
  };

  const generatePdf = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();

      for (const fileItem of files) {
        const pngBytes = await imageToPngBytes(fileItem);
        const embeddedImage = await pdfDoc.embedPng(pngBytes);
        
        const { width, height } = embeddedImage.scale(1.0);

        const page = pdfDoc.addPage([width, height]);
        
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      const pdfName = files[0].name.replace(/\.[^/.]+$/, '') + '_compiled.pdf';
      saveAs(blob, pdfName);

      saveHistory('PNG to PDF', `${pdfName} (${files.length} images)`);
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred during PDF generation.');
      setIsProcessing(false);
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
      title="PNG to PDF Converter"
      subtitle="Convert PNG images to PDF documents. Combine multiple PNGs into one PDF. Free, browser-based."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Convert PNG to PDF online for free. Combine PNG images into a PDF document in your browser. No uploads, instant results."
    >
      <div className="flex flex-col gap-6">
        <div className="text-center mb-6 max-w-2xl mx-auto">
          <h2 className="font-black text-3xl text-textmain">PNG to PDF</h2>
          <p className="text-sm text-gray-400 mt-2 font-medium">Convert PNG images into a compiled PDF document online for free.</p>
        </div>

        {files.length === 0 ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.png']}
              multiple={true} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "22px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Selected PNGs ({files.length})</h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">Clear All</button>
              </div>

              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                {files.map((file) => (
                  <div key={file.id} className="p-3 bg-lightbg/45 border border-bordercolor/60 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.preview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.preview} alt="Thumb" className="w-10 h-10 object-cover rounded-lg border border-bordercolor" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-textmain truncate max-w-[130px]" title={file.name}>{file.name}</p>
                        <p className="text-[9.5px] text-gray-400 font-medium mt-0.5">{formatSize(file.size)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: "span 2 / span 2", background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 22 }}>
              <h3 className="font-extrabold text-sm text-textmain">PNG to PDF Converter</h3>
              <p className="text-xs text-gray-400">Compile PNG files directly into PDF. Transparency is preserved perfectly on each page.</p>

              {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

              <button
                type="button"
                onClick={generatePdf}
                disabled={isProcessing || files.length === 0}
                className="py-3 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating PDF document...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Convert PNGs to PDF ({files.length} Pages)
                  </>
                )}
              </button>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
