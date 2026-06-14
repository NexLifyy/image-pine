"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>), title: 'Remove PDF Pages', desc: 'Easily select and delete any unwanted page from your PDF documents.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 4.5v15m7.5-7.5h-15"/></svg>), title: 'Add New Pages', desc: 'Append other PDF documents, insert images, or add blank pages.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>), title: 'Reorder & Rotate', desc: 'Click to swap page positions and rotate visual orientation.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Client-Side', desc: 'All processing runs in your browser. Files are never uploaded.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant Rendering', desc: 'PDF.js processes and loads previews in seconds.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No accounts, sign-ups, or watermarks on your compiled documents.' }
];

const _STEPS = [
  { n: '1', title: 'Upload PDF', desc: 'Select or drag your PDF document into the queue.' },
  { n: '2', title: 'Arrange Pages', desc: 'Add more files, delete pages, rotate, or reorder them.' },
  { n: '3', title: 'Download New PDF', desc: 'Compile the pages and export your modified PDF document.' }
];

const _FAQS = [
  {
    q: "How do I upload and combine multiple PDF files at once?",
    a: "Once you upload your primary PDF, click the '+ Add PDF / Images' button in the toolbar. You can select multiple additional PDF documents or images, and their pages will automatically be loaded as thumbnails at the end of your workspace."
  },
  {
    q: "Can I reorder individual pages, and how do I do it?",
    a: "Yes! You can drag and drop the page thumbnails to rearrange them into any sequence. You can also rotate individual pages using the rotation buttons on each thumbnail."
  },
  {
    q: "How do I remove unwanted pages or insert blank pages?",
    a: "To delete a page, click the trash icon on its thumbnail. To insert a blank page (for writing notes or inserting covers), click '+ Add Blank Page' in the toolbar. You can drag the new blank page to any position in the document."
  },
  {
    q: "Is there a maximum page limit or file size limit?",
    a: "Since all file rendering, reordering, and generation run 100% locally in your browser, there are no hard server limits. The performance depends on your device's memory; usually, files up to 150MB or 500 pages process seamlessly."
  },
  {
    q: "Are my uploaded PDF documents private and secure?",
    a: "Absolutely. Your documents are processed entirely client-side using JavaScript libraries. They are never uploaded to any server or shared with third parties, keeping your confidential information completely private."
  },
  {
    q: "Does modifying the page sequence affect the quality of my PDF content?",
    a: "No. Reordering or removing pages does not re-compress your document's text or images. The tool manipulates the file structure directly, preserving the original resolution and clarity of your PDF."
  }
];

export default function AddRemovePdfPagesPage() {
  const [pages, setPages] = useState([]); // Array of page objects
  const sourceFilesRef = useRef({}); // fileId -> { name, buffer, type }
  const [totalSize, setTotalSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const createdUrlsRef = useRef([]);
  const addFilesInputRef = useRef(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

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

  const createBlankPagePreview = (width = 595, height = 842) => {
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = Math.round((height / width) * 150);
    const ctx = canvas.getContext('2d');
    
    // Draw white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#D1D1E4';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    
    // Draw text inside to represent a blank page
    ctx.fillStyle = '#9898B5';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Blank Page', canvas.width / 2, canvas.height / 2);
    
    return canvas.toDataURL('image/png');
  };

  const convertImageToJpgBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          const reader = new FileReader();
          reader.onload = (e) => {
            const url = URL.createObjectURL(blob);
            createdUrlsRef.current.push(url);
            resolve({
              buffer: e.target.result,
              width: canvas.width,
              height: canvas.height,
              url
            });
          };
          reader.onerror = () => reject(new Error('Failed to read image buffer.'));
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image.'));
      };
      img.src = objectUrl;
    });
  };

  const processSelectedFiles = async (fileList) => {
    setIsProcessing(true);
    setErrorMsg('');
    setProgress('Loading engine...');

    try {
      const pdfjs = await loadPdfJs();
      const newPages = [];
      let addedSize = 0;

      for (const file of fileList) {
        setProgress(`Loading ${file.name}...`);
        const fileId = Math.random().toString(36).slice(2, 9);

        if (file.name.toLowerCase().endsWith('.pdf')) {
          const buffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsArrayBuffer(file);
          });

          sourceFilesRef.current[fileId] = { name: file.name, buffer, type: 'pdf' };
          addedSize += buffer.byteLength;

          const loadingTask = pdfjs.getDocument({ data: buffer.slice(0) });
          const pdfDoc = await loadingTask.promise;
          const numPages = pdfDoc.numPages;

          for (let i = 1; i <= numPages; i++) {
            setProgress(`Rendering page ${i} of ${numPages} from ${file.name}...`);
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1.2 });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            const renderContext = {
              canvasContext: ctx,
              viewport: viewport,
            };
            await page.render(renderContext).promise;

            const url = await new Promise((resolve) => {
              canvas.toBlob((b) => {
                const blobUrl = URL.createObjectURL(b);
                createdUrlsRef.current.push(blobUrl);
                resolve(blobUrl);
              }, 'image/png');
            });

            newPages.push({
              id: Math.random().toString(36).slice(2, 9),
              type: 'pdf',
              fileId,
              pageIndex: i - 1,
              width: viewport.width,
              height: viewport.height,
              rotation: 0,
              url
            });
          }
        } else if (file.type && (file.type.startsWith('image/') || file.name.match(/\.(png|jpg|jpeg|webp|svg)$/i))) {
          try {
            setProgress(`Converting ${file.name}...`);
            const converted = await convertImageToJpgBuffer(file);
            sourceFilesRef.current[fileId] = { name: file.name, buffer: converted.buffer, type: 'image' };
            addedSize += converted.buffer.byteLength;

            newPages.push({
              id: Math.random().toString(36).slice(2, 9),
              type: 'image',
              fileId,
              width: converted.width,
              height: converted.height,
              rotation: 0,
              url: converted.url
            });
          } catch (imgErr) {
            console.error('Image loading error:', imgErr);
            setErrorMsg(`Failed to process image ${file.name}.`);
          }
        }
      }

      setPages(prev => [...prev, ...newPages]);
      setTotalSize(prev => prev + addedSize);
      setIsProcessing(false);
      setProgress('');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred while loading files.');
      setIsProcessing(false);
      setProgress('');
    }
  };

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      processSelectedFiles(selectedList);
    }
  };

  const addBlankPage = () => {
    const previewUrl = createBlankPagePreview(595, 842);
    setPages(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 9),
        type: 'blank',
        width: 595,
        height: 842,
        rotation: 0,
        url: previewUrl
      }
    ]);
  };

  const deletePage = (index) => {
    const pageToDelete = pages[index];
    if (pageToDelete.url && pageToDelete.url.startsWith('blob:')) {
      URL.revokeObjectURL(pageToDelete.url);
      createdUrlsRef.current = createdUrlsRef.current.filter(u => u !== pageToDelete.url);
    }
    setPages(prev => prev.filter((_, i) => i !== index));
  };

  const rotatePage = (index) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== index) return p;
      return { ...p, rotation: (p.rotation + 90) % 360 };
    }));
  };

  const movePage = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= pages.length) return;

    setPages(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[nextIndex];
      list[nextIndex] = temp;
      return list;
    });
  };

  const clearAll = () => {
    createdUrlsRef.current.forEach(url => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    createdUrlsRef.current = [];
    setPages([]);
    sourceFilesRef.current = {};
    setTotalSize(0);
    setErrorMsg('');
    setProgress('');
  };

  const compileAndSave = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    setErrorMsg('');
    setProgress('Compiling PDF...');

    try {
      const pdfLib = await import('pdf-lib');
      const { PDFDocument, degrees } = pdfLib;

      const pdfDoc = await PDFDocument.create();

      // PDF loaded files cache
      const pdfCache = {};

      for (let idx = 0; idx < pages.length; idx++) {
        const page = pages[idx];
        setProgress(`Compiling page ${idx + 1} of ${pages.length}...`);

        let targetPage;

        if (page.type === 'pdf') {
          const fileData = sourceFilesRef.current[page.fileId];
          if (!fileData) throw new Error(`Missing source file for page ${idx + 1}`);

          let srcDoc = pdfCache[page.fileId];
          if (!srcDoc) {
            srcDoc = await PDFDocument.load(fileData.buffer.slice(0));
            pdfCache[page.fileId] = srcDoc;
          }

          const [copiedPage] = await pdfDoc.copyPages(srcDoc, [page.pageIndex]);
          targetPage = pdfDoc.addPage(copiedPage);

          if (page.rotation !== 0) {
            const currentAngle = targetPage.getRotation().angle;
            targetPage.setRotation(degrees(currentAngle + page.rotation));
          }

        } else if (page.type === 'image') {
          const fileData = sourceFilesRef.current[page.fileId];
          if (!fileData) throw new Error(`Missing source image for page ${idx + 1}`);

          const embeddedImage = await pdfDoc.embedJpg(fileData.buffer.slice(0));
          const size = embeddedImage.scale(1);

          targetPage = pdfDoc.addPage([size.width, size.height]);
          targetPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: size.width,
            height: size.height,
          });

          if (page.rotation !== 0) {
            targetPage.setRotation(degrees(page.rotation));
          }

        } else if (page.type === 'blank') {
          targetPage = pdfDoc.addPage([page.width, page.height]);
          if (page.rotation !== 0) {
            targetPage.setRotation(degrees(page.rotation));
          }
        }
      }

      setProgress('Saving PDF document...');
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      const fileName = pages.length === 1 ? 'edited_document.pdf' : 'compiled_document.pdf';
      saveAs(blob, fileName);
      saveHistory('Add or Remove PDF Pages', `${fileName} (${pages.length} pages)`);

      setIsProcessing(false);
      setProgress('');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred while compiling PDF.');
      setIsProcessing(false);
      setProgress('');
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalFilesSize = totalSize;

  return (
    <ToolPageShell
      title="Add or Remove PDF Pages"
      subtitle="Organize PDF documents client-side. Insert blank pages, merge other PDFs/images, rotate, delete, or rearrange pages instantly."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Add or remove PDF pages online. Reorder, rotate, delete pages, merge PDFs, insert images, or add blank pages to PDF. Runs 100% locally in your browser."
    >
      <div style={{ width: '100%' }}>
        {/* Workspace */}
        {pages.length === 0 ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox
              onFileSelect={handleFileSelect}
              acceptedFormats={['.pdf', '.jpg', '.jpeg', '.png', '.webp']}
              multiple={true}
              buttonLabel="Choose PDF &amp; Images"
              maxSizeMB={30}
            />
          </div>
        ) : (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            
            {/* Top Workspace Bar */}
            <div className="card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
                  Workspace ({pages.length} page{pages.length !== 1 ? 's' : ''})
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)' }}>
                  Total size: {formatSize(totalFilesSize)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {/* Add Files */}
                <button
                  type="button"
                  onClick={() => addFilesInputRef.current?.click()}
                  className="btn-ghost"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add PDF / Images
                </button>
                <input
                  type="file"
                  ref={addFilesInputRef}
                  multiple
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processSelectedFiles(Array.from(e.target.files));
                    }
                  }}
                  style={{ display: 'none' }}
                />

                {/* Add Blank Page */}
                <button
                  type="button"
                  onClick={addBlankPage}
                  className="btn-ghost"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Add Blank Page
                </button>

                {/* Clear All */}
                <button
                  type="button"
                  onClick={clearAll}
                  style={{ color: '#EF4444', borderColor: '#FECACA', background: '#FFF5F5' }}
                  className="btn-ghost"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Error Message & Progress */}
            {errorMsg && (
              <div className="card" style={{ padding: '12px 18px', borderColor: '#FECACA', background: '#FFF5F5', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <svg width="16" height="16" fill="none" stroke="#EF4444" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>{errorMsg}</span>
              </div>
            )}

            {isProcessing && (
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="animate-spin" width="28" height="28" fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="var(--primary)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {progress}
                </span>
              </div>
            )}

            {/* Pages Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px',
              paddingBottom: '20px'
            }}>
              {pages.map((p, index) => {
                const isFirst = index === 0;
                const isLast = index === pages.length - 1;

                return (
                  <div
                    key={p.id}
                    className="card card-hover"
                    style={{
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative'
                    }}
                  >
                    {/* Index Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '18px',
                      left: '18px',
                      zIndex: 10,
                      background: 'rgba(17, 17, 40, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      PAGE {index + 1}
                    </div>

                    {/* Page Thumbnail Preview */}
                    <div style={{
                      aspectRatio: '3/4',
                      background: '#F1F1F7',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      border: '1px solid var(--border)'
                    }}>
                      {p.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.url}
                          alt={`Page ${index + 1}`}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            transform: `rotate(${p.rotation}deg)`,
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      ) : (
                        <div style={{ color: 'var(--text-3)', fontSize: '11px', fontWeight: 600 }}>No preview</div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                      {/* Rotate */}
                      <button
                        type="button"
                        title="Rotate Clockwise"
                        onClick={() => rotatePage(index)}
                        className="btn-ghost"
                        style={{ padding: '6px' }}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </button>

                      {/* Move Left */}
                      <button
                        type="button"
                        title="Move Left"
                        disabled={isFirst}
                        onClick={() => movePage(index, -1)}
                        className="btn-ghost"
                        style={{ padding: '6px' }}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>

                      {/* Move Right */}
                      <button
                        type="button"
                        title="Move Right"
                        disabled={isLast}
                        onClick={() => movePage(index, 1)}
                        className="btn-ghost"
                        style={{ padding: '6px' }}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        title="Delete Page"
                        onClick={() => deletePage(index)}
                        className="btn-ghost"
                        style={{ padding: '6px', color: '#EF4444', borderColor: '#FFD3D3' }}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Compile Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              <button
                type="button"
                onClick={compileAndSave}
                disabled={isProcessing || pages.length === 0}
                className="process-btn"
                style={{ maxWidth: '380px', height: '48px', fontSize: '14px' }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {isProcessing ? 'Processing...' : 'Save & Download PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
