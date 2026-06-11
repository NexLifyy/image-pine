"use client";

import React, { useState } from 'react';
import ToolPageShell from '@/components/ToolPageShell';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import { extractMetadataClientSide } from '@/lib/clientMetadata';

// ── Client-side lossless JPEG stripper ────────────────────────────────────────
const clientStripJpeg = (arrayBuffer) => {
  const view = new DataView(arrayBuffer);
  if (view.getUint16(0, false) !== 0xFFD8) throw new Error('Not a valid JPEG');
  let offset = 2;
  const len = view.byteLength;
  const segs = [new Uint8Array(arrayBuffer, 0, 2)];
  while (offset < len) {
    if (offset + 4 > len) { segs.push(new Uint8Array(arrayBuffer, offset, len - offset)); break; }
    const marker = view.getUint16(offset, false);
    if (marker === 0xFFDA) { segs.push(new Uint8Array(arrayBuffer, offset, len - offset)); break; }
    if (marker === 0xFFD9) { segs.push(new Uint8Array(arrayBuffer, offset, 2)); break; }
    if ((marker & 0xFF00) !== 0xFF00) { offset++; continue; }
    const segLen = view.getUint16(offset + 2, false) + 2;
    if (offset + segLen > len) { segs.push(new Uint8Array(arrayBuffer, offset, len - offset)); break; }
    const keep =
      marker === 0xFFE0 || marker === 0xFFE2 || marker === 0xFFEE ||
      marker === 0xFFDB || marker === 0xFFC4 || marker === 0xFFDD ||
      (marker >= 0xFFC0 && marker <= 0xFFCF && marker !== 0xFFC4 && marker !== 0xFFC8);
    if (keep) segs.push(new Uint8Array(arrayBuffer, offset, segLen));
    offset += segLen;
  }
  let total = 0; segs.forEach(s => total += s.byteLength);
  const out = new Uint8Array(total); let cur = 0;
  segs.forEach(s => { out.set(s, cur); cur += s.byteLength; });
  return out.buffer;
};

// ── Client-side lossless PNG stripper ─────────────────────────────────────────
const clientStripPng = (arrayBuffer) => {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 8 || view.getUint32(0, false) !== 0x89504E47) throw new Error('Not a valid PNG');
  let offset = 8;
  const len = view.byteLength;
  const segs = [new Uint8Array(arrayBuffer, 0, 8)];
  const keep = ['IHDR','PLTE','IDAT','IEND','iCCP','gAMA','cHRM','sRGB','pHYs','sBIT','tRNS'];
  while (offset < len) {
    if (offset + 8 > len) break;
    const chunkLen = view.getUint32(offset, false);
    const type = String.fromCharCode(view.getUint8(offset+4),view.getUint8(offset+5),view.getUint8(offset+6),view.getUint8(offset+7));
    const total = 12 + chunkLen;
    if (offset + total > len) break;
    if (keep.includes(type)) segs.push(new Uint8Array(arrayBuffer, offset, total));
    offset += total;
    if (type === 'IEND') break;
  }
  let totalSize = 0; segs.forEach(s => totalSize += s.byteLength);
  const out = new Uint8Array(totalSize); let cur = 0;
  segs.forEach(s => { out.set(s, cur); cur += s.byteLength; });
  return out.buffer;
};

// Strip metadata from a File object entirely in the browser (no network)
const clientStripFile = async (fileObj) => {
  const arrayBuffer = await fileObj.arrayBuffer();
  const isPng = fileObj.type === 'image/png' || fileObj.name.toLowerCase().endsWith('.png');
  try {
    return isPng ? clientStripPng(arrayBuffer) : clientStripJpeg(arrayBuffer);
  } catch {
    return arrayBuffer; // unsupported format — return original unchanged
  }
};

export default function MetadataPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [metadataMap, setMetadataMap] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [isStripping, setIsStripping] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [activeTab, setActiveTab] = useState('grouped'); // 'grouped' or 'raw'
  const [failedPreviews, setFailedPreviews] = useState({});

  const _FEATURES = [
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: '100% Private & Secure',
      desc: 'All processing happens entirely in your browser. Your images never leave your device.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
      title: 'Lossless Metadata Cleaning',
      desc: 'Strips descriptors directly from the file header stream. Zero re-compression, preserving 100% pixel quality.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      title: 'Comprehensive Tag Viewer',
      desc: 'Decodes standard TIFF, camera EXIF, GPS, XMP, IPTC, ICC, and C2PA Content Credentials.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      title: 'Protects Sensitive Locations',
      desc: 'Completely erases high-accuracy GPS coordinates, preventing others from discovering where your photo was taken.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2.2"/>
          <path d="M7 8h10M7 12h10M7 16h10" />
        </svg>
      ),
      title: 'Erases All Custom Headers',
      desc: 'Removes EXIF camera logs, XMP software editing records, IPTC copyright fields, and COM user comments at once.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 3v18M3 12h18M12 3l9 9-9 9-9-9 9-9z"/>
        </svg>
      ),
      title: 'ICC Profile Safeguard',
      desc: 'Retains color management profiles (ICC Profiles) so that stripped photos display color tones and shades perfectly.'
    }
  ];

  const _STEPS = [
    { n: '1', title: 'Upload Photos', desc: 'Select one or more photos (JPG, PNG, WebP, TIFF, AVIF) up to 50 MB.' },
    { n: '2', title: 'View All Metadata', desc: 'Click any photo in the sidebar to review its EXIF tags, GPS coordinates, and AI details.' },
    { n: '3', title: 'Download Cleaned Files', desc: 'Strip metadata from the active photo or download all cleaned images as a ZIP archive.' }
  ];

  const _FAQS = [
    { q: 'What metadata streams are stored inside photos?', a: 'Exchangeable Image File Format (EXIF) lists camera settings and GPS. Extensible Metadata Platform (XMP) holds editor histories and cataloging. IPTC stores copyrights and captions. COM is plain-text comments.' },
    { q: 'Does stripping metadata reduce image quality?', a: 'No. Our utility operates directly on the image file segments, removing headers like APP1 and APP13 without touching or re-compressing the actual image bytes. Quality remains 100% identical.' },
    { q: 'Why should I strip metadata before sharing?', a: 'Photos shot on smartphones default to storing highly precise GPS coordinates, serial numbers, camera specifications, and software versions. Sharing these online exposes your private details.' },
    { q: 'Is my data secure on ImagePine?', a: 'Absolutely. ImagePine processes everything directly in your browser. Your images never leave your device. There is no server involved at any point. We have zero access to your files. Your data is 100% private, guaranteed.' }
  ];

  const handleFileSelect = (newFiles) => {
    if (newFiles && newFiles.length > 0) {
      const sanitized = newFiles.map(f => {
        if (!f.preview) {
          try {
            f.preview = URL.createObjectURL(f);
          } catch (e) {
            console.error('Failed to create object URL:', e);
          }
        }
        return f;
      });
      setFiles(prev => [...prev, ...sanitized]);
      if (!selectedFile) setSelectedFile(sanitized[0]);
      sanitized.forEach(f => {
        parseFileMetadata(f);
      });
    }
  };

  const parseFileMetadata = async (fileObj) => {
    try {
      setMetadataMap(prev => ({
        ...prev,
        [fileObj.id]: { _loading: true }
      }));

      // Extract entirely in the browser — no server upload, no file size limit
      const data = await extractMetadataClientSide(fileObj);

      setMetadataMap(prev => ({
        ...prev,
        [fileObj.id]: data
      }));
    } catch (err) {
      console.error('Error reading file metadata:', err);
      setMetadataMap(prev => ({
        ...prev,
        [fileObj.id]: { _error: err.message || 'Error parsing metadata' }
      }));
    }
  };

  const removeFile = (id, e) => {
    if (e) e.stopPropagation();
    const filtered = files.filter(f => f.id !== id);
    setFiles(filtered);
    
    // Cleanup metadata map
    const nextMap = { ...metadataMap };
    delete nextMap[id];
    setMetadataMap(nextMap);

    // Cleanup failed previews map
    const nextFailed = { ...failedPreviews };
    delete nextFailed[id];
    setFailedPreviews(nextFailed);

    if (selectedFile?.id === id) {
      setSelectedFile(filtered.length > 0 ? filtered[0] : null);
    }
  };

  const handleStripAndDownloadSingle = async (fileObj) => {
    if (!fileObj) return;
    setIsStripping(true);
    setErrorMsg('');

    try {
      const strippedBuffer = await clientStripFile(fileObj);
      const nameWithoutExt = fileObj.name.replace(/\.[^/.]+$/, '');
      const ext = fileObj.name.split('.').pop() || 'jpg';
      const blob = new Blob([strippedBuffer], { type: fileObj.type || 'application/octet-stream' });
      saveAs(blob, `${nameWithoutExt}_cleaned.${ext}`);
      saveHistory('EXIF Stripper', `${fileObj.name} (Metadata Erased)`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to strip metadata. Make sure the file is valid.');
    } finally {
      setIsStripping(false);
    }
  };

  const downloadCleanedZip = async () => {
    if (files.length === 0) return;
    setIsStripping(true);
    setProcessedCount(0);
    setErrorMsg('');

    try {
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();

      // Strip all files in parallel using client-side processing
      const results = await Promise.all(
        files.map(fileObj => clientStripFile(fileObj).then(buf => ({ fileObj, buf })))
      );

      results.forEach(({ fileObj, buf }, i) => {
        const nameWithoutExt = fileObj.name.replace(/\.[^/.]+$/, '');
        const ext = fileObj.name.split('.').pop() || 'jpg';
        const blob = new Blob([buf], { type: fileObj.type || 'application/octet-stream' });
        zip.file(`${nameWithoutExt}_cleaned.${ext}`, blob);
        setProcessedCount(i + 1);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'cleaned_images.zip');
      saveHistory('EXIF Stripper', `cleaned_images.zip (${files.length} images)`);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to package ZIP archive.');
    } finally {
      setIsStripping(false);
    }
  };

  const downloadAllIndividually = async () => {
    if (files.length === 0) return;
    setIsStripping(true);
    setProcessedCount(0);
    setErrorMsg('');

    try {
      // Strip all files in parallel using client-side processing
      const results = await Promise.all(
        files.map(fileObj => clientStripFile(fileObj).then(buf => ({ fileObj, buf })))
      );

      results.forEach(({ fileObj, buf }, i) => {
        const nameWithoutExt = fileObj.name.replace(/\.[^/.]+$/, '');
        const ext = fileObj.name.split('.').pop() || 'jpg';
        const blob = new Blob([buf], { type: fileObj.type || 'application/octet-stream' });
        saveAs(blob, `${nameWithoutExt}_cleaned.${ext}`);
        setProcessedCount(i + 1);
      });

      saveHistory('EXIF Stripper', `${files.length} images cleaned and downloaded`);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to process one or more images.');
    } finally {
      setIsStripping(false);
    }
  };

  const formatSize = (b) => {
    if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
    return (b / 1024).toFixed(1) + ' KB';
  };

  const cardStyle = {
    background: '#fff',
    border: '1px solid #E4E4EF',
    borderRadius: 20,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    height: 'fit-content'
  };

  const currentMetadata = selectedFile ? metadataMap[selectedFile.id] : null;

  return (
    <ToolPageShell
      title="EXIF Metadata Stripper"
      subtitle="View hidden camera details and GPS locations embedded in your photos, then losslessly strip them to protect your privacy online."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Strip EXIF metadata, XMP properties, IPTC records and COM comment data from JPG, PNG, WebP, TIFF, and AVIF photos online for free. Read comprehensive device settings, date, software, GPS location, and AI details inside your browser. Safe and secure."
    >
      {files.length === 0 ? (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={handleFileSelect}
            acceptedFormats={['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.avif']}
            maxSizeMB={50}
            multiple={true}
            buttonLabel="Select Images"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">
          
          {/* Left: Files List Sidebar */}
          <div className="col-span-1 lg:col-span-3" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #F1F1F7', paddingBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase' }}>Files ({files.length})</span>
              <button onClick={() => { setFiles([]); setSelectedFile(null); setMetadataMap({}); setFailedPreviews({}); }} style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', border: 'none', background: 'none', cursor: 'pointer' }}>Clear All</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', marginBottom: 12 }}>
              {files.map(fileObj => {
                const mapData = metadataMap[fileObj.id];
                const hasGps = mapData?.gps;
                const isFailed = failedPreviews[fileObj.id];
                return (
                  <div
                    key={fileObj.id}
                    onClick={() => setSelectedFile(fileObj)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 10,
                      border: `1.5px solid ${selectedFile?.id === fileObj.id ? '#5B5BD6' : '#E4E4EF'}`,
                      background: selectedFile?.id === fileObj.id ? '#EEF0FF' : '#FAFAFF',
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
                      {isFailed ? (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: '#F1F1F7', borderRadius: 6, border: '1px solid #E4E4EF', color: '#9898B5'
                        }}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/>
                            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                          </svg>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={fileObj.preview}
                          alt=""
                          onError={() => {
                            setFailedPreviews(prev => ({ ...prev, [fileObj.id]: true }));
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, border: '1px solid #E4E4EF' }}
                        />
                      )}
                      {hasGps && (
                        <span style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: '#D97706', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Contains GPS Data">
                          <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><circle cx="12" cy="12" r="10"/></svg>
                        </span>
                      )}
                    </div>
                    <div style={{ minWidth: 0, flexGrow: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#111128', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }} title={fileObj.name}>{fileObj.name}</p>
                      <p style={{ fontSize: 9, color: '#9898B5', margin: '2px 0 0' }}>{formatSize(fileObj.size)}</p>
                    </div>
                    <button type="button" onClick={(e) => removeFile(fileObj.id, e)} style={{ border: 'none', background: 'none', color: '#9898B5', cursor: 'pointer', fontSize: 12 }}>×</button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => document.querySelector('input[type="file"]')?.click()}
              style={{
                width: '100%', padding: '10px', fontSize: 11, fontWeight: 700,
                border: '2px dashed #D1D1E4', borderRadius: 12, background: '#F7F7FB',
                color: '#5B5BD6', cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#5B5BD6'; e.currentTarget.style.background = '#EDEDFB'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D1E4'; e.currentTarget.style.background = '#F7F7FB'; }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Add Photos
            </button>
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.tiff,.tif,.avif" multiple style={{ display: 'none' }}
              onChange={e => {
                const newFiles = Array.from(e.target.files || []).map(f =>
                  Object.assign(f, { preview: URL.createObjectURL(f), id: Math.random().toString(36).slice(2, 9) })
                );
                handleFileSelect(newFiles);
                e.target.value = '';
              }}
            />
          </div>
          
          {/* Middle: Selected File Details */}
          <div className="col-span-1 lg:col-span-5" style={cardStyle}>
            {selectedFile ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #F1F1F7', paddingBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111128', margin: 0 }}>Metadata Details</h3>
                    <p style={{ fontSize: 11, color: '#9898B5', margin: '2px 0 0', fontWeight: 650 }}>{selectedFile.name}</p>
                  </div>
                </div>

                {currentMetadata ? (
                  currentMetadata._loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#9898B5', fontSize: 12 }}>
                      <div style={{
                        width: 28, height: 28, border: '3px solid #EEF0FF', borderTopColor: '#5B5BD6',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
                      }} />
                      <span>Analyzing image data...</span>
                      <style jsx>{`
                        @keyframes spin { to { transform: rotate(360deg); } }
                      `}</style>
                    </div>
                  ) : currentMetadata._error ? (
                    <div style={{ padding: '24px 16px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 12, color: '#EF4444', textAlign: 'center' }}>
                      <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" style={{ margin: '0 auto 10px', display: 'block' }}>
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span style={{ fontSize: 13, fontWeight: 800, display: 'block', marginBottom: 4 }}>Error Reading Metadata</span>
                      <p style={{ fontSize: 11, color: '#6B6B8A', margin: 0, lineHeight: 1.5 }}>
                        {currentMetadata._error}. Make sure the file is valid and under 50 MB.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      
                      {/* AI Provenance Banner */}
                      {currentMetadata.provenance && currentMetadata.provenance.type !== 'none' && (
                        <div style={{
                          borderRadius: 16,
                          padding: '14px',
                          border: '1.5px solid',
                          background: currentMetadata.provenance.type === 'verified' 
                            ? 'rgba(220, 252, 231, 0.7)' 
                            : currentMetadata.provenance.type === 'ai-metadata' 
                              ? 'rgba(219, 234, 254, 0.7)' 
                              : '#F3F4F6',
                          borderColor: currentMetadata.provenance.type === 'verified' 
                            ? '#86EFAC' 
                            : currentMetadata.provenance.type === 'ai-metadata' 
                              ? '#93C5FD' 
                              : '#E5E7EB',
                          backdropFilter: 'blur(8px)',
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s ease-in-out'
                        }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: currentMetadata.provenance.type === 'verified' 
                              ? '#16A34A' 
                              : currentMetadata.provenance.type === 'ai-metadata' 
                                ? '#2563EB' 
                                : '#9CA3AF',
                            color: '#fff',
                            flexShrink: 0
                          }}>
                            {currentMetadata.provenance.type === 'verified' ? (
                              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            ) : currentMetadata.provenance.type === 'ai-metadata' ? (
                              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                                <circle cx="12" cy="12" r="4"/>
                              </svg>
                            ) : (
                              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                              </svg>
                            )}
                          </div>
                          <div style={{ flexGrow: 1, minWidth: 0 }}>
                            <h4 style={{
                              margin: 0,
                              fontSize: 12,
                              fontWeight: 800,
                              color: currentMetadata.provenance.type === 'verified' 
                                ? '#14532D' 
                                : currentMetadata.provenance.type === 'ai-metadata' 
                                  ? '#1E3A8A' 
                                  : '#374151'
                            }}>
                              {currentMetadata.provenance.title}
                            </h4>
                            <p style={{
                              margin: '2px 0 0',
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: currentMetadata.provenance.type === 'verified' 
                                ? '#166534' 
                                : currentMetadata.provenance.type === 'ai-metadata' 
                                  ? '#1E40AF' 
                                  : '#6B7280',
                              lineHeight: 1.4
                            }}>
                              {currentMetadata.provenance.subtitle}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Detected streams checklist */}
                      <div style={{ background: '#F7F7FB', borderRadius: 12, padding: 12, border: '1px solid #E4E4EF' }}>
                        <span style={{ fontSize: 10, fontWeight: 850, color: '#9898B5', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                          Metadata Streams Detected
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, borderRadius: 6, padding: '3px 8px', border: '1px solid',
                            background: currentMetadata.detectedSegments?.exif ? '#FEE2E2' : '#F0FDF4',
                            borderColor: currentMetadata.detectedSegments?.exif ? '#FCA5A5' : '#BBF7D0',
                            color: currentMetadata.detectedSegments?.exif ? '#DC2626' : '#16A34A'
                          }}>
                            {currentMetadata.detectedSegments?.exif ? '● EXIF Camera' : '○ No EXIF'}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, borderRadius: 6, padding: '3px 8px', border: '1px solid',
                            background: currentMetadata.gps ? '#FEF3C7' : '#F0FDF4',
                            borderColor: currentMetadata.gps ? '#FCD34D' : '#BBF7D0',
                            color: currentMetadata.gps ? '#D97706' : '#16A34A'
                          }}>
                            {currentMetadata.gps ? '● GPS Location' : '○ No GPS'}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, borderRadius: 6, padding: '3px 8px', border: '1px solid',
                            background: currentMetadata.detectedSegments?.xmp ? '#FEE2E2' : '#F0FDF4',
                            borderColor: currentMetadata.detectedSegments?.xmp ? '#FCA5A5' : '#BBF7D0',
                            color: currentMetadata.detectedSegments?.xmp ? '#DC2626' : '#16A34A'
                          }}>
                            {currentMetadata.detectedSegments?.xmp ? '● XMP Platform' : '○ No XMP'}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, borderRadius: 6, padding: '3px 8px', border: '1px solid',
                            background: currentMetadata.detectedSegments?.iptc ? '#FEE2E2' : '#F0FDF4',
                            borderColor: currentMetadata.detectedSegments?.iptc ? '#FCA5A5' : '#BBF7D0',
                            color: currentMetadata.detectedSegments?.iptc ? '#DC2626' : '#16A34A'
                          }}>
                            {currentMetadata.detectedSegments?.iptc ? '● IPTC Copyright' : '○ No IPTC'}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, borderRadius: 6, padding: '3px 8px', border: '1px solid',
                            background: currentMetadata.detectedSegments?.comments ? '#FEE2E2' : '#F0FDF4',
                            borderColor: currentMetadata.detectedSegments?.comments ? '#FCA5A5' : '#BBF7D0',
                            color: currentMetadata.detectedSegments?.comments ? '#DC2626' : '#16A34A'
                          }}>
                            {currentMetadata.detectedSegments?.comments ? '● COM Comments' : '○ No Comments'}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, borderRadius: 6, padding: '3px 8px', border: '1px solid',
                            background: currentMetadata.detectedSegments?.icc ? '#FEE2E2' : '#F0FDF4',
                            borderColor: currentMetadata.detectedSegments?.icc ? '#FCA5A5' : '#BBF7D0',
                            color: currentMetadata.detectedSegments?.icc ? '#DC2626' : '#16A34A'
                          }}>
                            {currentMetadata.detectedSegments?.icc ? '● ICC Profile' : '○ No ICC Profile'}
                          </span>
                          {currentMetadata.detectedSegments?.otherApp && currentMetadata.detectedSegments.otherApp.map((app, appIdx) => (
                            <span key={appIdx} style={{
                              fontSize: 9, fontWeight: 700, borderRadius: 6, padding: '3px 8px', border: '1px solid',
                              background: '#EEF0FF', borderColor: '#D1D1F7', color: '#5B5BD6'
                            }}>
                              ● {app}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* GPS Coordinates sensitive banner */}
                      {currentMetadata.gps && (
                        <div style={{ padding: 12, background: '#FFFDF5', borderRadius: 12, border: '1px solid #FBE090' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', marginTop: 2 }}>
                              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                            </span>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 850, color: '#B45309', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sensitive GPS Location</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#78350F' }}>{String(currentMetadata.gpsDms || currentMetadata.gps)}</span>
                              <p style={{ fontSize: 10, color: '#92400E', margin: '4px 0 0', lineHeight: 1.4 }}>
                                Coordinates: <code>{String(currentMetadata.gps)}</code>. This location data will be fully stripped upon cleaning.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tabs selector */}
                      <div style={{ display: 'flex', borderBottom: '2.5px solid #F1F1F7', gap: 16, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => setActiveTab('grouped')}
                          style={{
                            padding: '6px 4px 10px',
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: activeTab === 'grouped' ? '#5B5BD6' : '#9898B5',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === 'grouped' ? '2.5px solid #5B5BD6' : '2.5px solid transparent',
                            marginBottom: -2.5,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Grouped Info
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('raw')}
                          style={{
                            padding: '6px 4px 10px',
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: activeTab === 'raw' ? '#5B5BD6' : '#9898B5',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === 'raw' ? '2.5px solid #5B5BD6' : '2.5px solid transparent',
                            marginBottom: -2.5,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Raw Metadata
                        </button>
                      </div>

                      {/* Tab contents */}
                      {activeTab === 'grouped' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                          {Object.entries(currentMetadata.categories).map(([key, cat]) => {
                            if (!cat.fields || cat.fields.length === 0) return null;
                            return (
                              <div key={key} style={{
                                background: '#F8F9FA',
                                borderRadius: 14,
                                padding: 12,
                                border: '1.5px solid #E9ECEF'
                              }}>
                                <h4 style={{
                                  fontSize: 10.5,
                                  fontWeight: 850,
                                  color: '#495057',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  margin: '0 0 8px',
                                  borderBottom: '1px solid #E9ECEF',
                                  paddingBottom: 6
                                }}>
                                  {cat.title}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {cat.fields.map((field, idx) => (
                                    <div key={idx} style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'flex-start',
                                      fontSize: 11,
                                      gap: 12
                                    }}>
                                      <span style={{ fontWeight: 700, color: '#6C757D', flexShrink: 0, width: '38%' }}>{field.name}</span>
                                      <span style={{ fontWeight: 650, color: '#212529', textAlign: 'right', wordBreak: 'break-all' }}>{field.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                          {currentMetadata.raw && currentMetadata.raw.length > 0 ? (
                            <div style={{ overflowX: 'auto', border: '1px solid #E4E4EF', borderRadius: 12, background: '#F7F7FB' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 10.5 }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#EDEDFB', borderBottom: '1px solid #E4E4EF' }}>
                                  <tr>
                                    <th style={{ padding: '8px 12px', fontWeight: 800, color: '#5B5BD6' }}>Tag Name</th>
                                    <th style={{ padding: '8px 12px', fontWeight: 800, color: '#5B5BD6' }}>Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentMetadata.raw.map((t, idx) => (
                                    <tr key={idx} style={{ borderBottom: idx === currentMetadata.raw.length - 1 ? 'none' : '1px solid #E4E4EF', background: idx % 2 === 0 ? '#fff' : '#F7F7FB' }}>
                                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#111128' }}>{t.name}</td>
                                      <td style={{ padding: '8px 12px', color: '#111128', wordBreak: 'break-all' }}>{String(t.value)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div style={{ padding: '32px 10px', textAlign: 'center', color: '#9898B5', fontSize: 11.5 }}>
                              No raw metadata fields available.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9898B5', fontSize: 12 }}>
                    Parsing image stream headers...
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#9898B5', fontSize: 12 }}>
                <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                Select a photo from the sidebar to inspect its embedded tags.
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="col-span-1 lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Action Card */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111128', margin: '0 0 10px' }}>Erase Metadata</h3>
              <p style={{ fontSize: 12, color: '#6B6B8A', lineHeight: 1.6, margin: '0 0 20px' }}>
                Losslessly strip camera profiles, device identifiers, GPS coordinates, XMP edits, and user comments.
              </p>

              {isStripping && files.length > 1 && (
                <div style={{ fontSize: 11, color: '#5B5BD6', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                  Processing: {processedCount} of {files.length} images...
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {files.length > 1 ? (
                  <>
                    <button
                      type="button"
                      disabled={isStripping}
                      onClick={downloadCleanedZip}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 13,
                        borderRadius: 12,
                        padding: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 4px 16px rgba(91,91,214,0.3)',
                        transition: 'all 0.18s'
                      }}
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Strip All &amp; Download ZIP
                    </button>
                    <button
                      type="button"
                      disabled={isStripping}
                      onClick={downloadAllIndividually}
                      style={{
                        width: '100%', background: '#fff', border: '1px solid #E4E4EF', color: '#6B6B8A',
                        fontWeight: 700, fontSize: 11, borderRadius: 10, padding: '8px', cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      Strip &amp; Download Individually
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isStripping || !selectedFile}
                    onClick={() => handleStripAndDownloadSingle(selectedFile)}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 13,
                      borderRadius: 12,
                      padding: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(22,163,74,0.28)',
                      transition: 'all 0.18s'
                    }}
                    onMouseEnter={e => { if (!isStripping && selectedFile) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(22,163,74,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseLeave={e => { if (!isStripping && selectedFile) { e.currentTarget.style.boxShadow = '0 4px 14px rgba(22,163,74,0.28)'; e.currentTarget.style.transform = 'none'; } }}
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path d="M19 7l-.8 12.6c-.1 1.3-1.2 2.4-2.5 2.4H8.3c-1.3 0-2.4-1.1-2.5-2.4L5 7m5-3V1h4v3M4 7h16" />
                    </svg>
                    {isStripping ? 'Erasing EXIF data...' : 'Download Clean Photo'}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Preview Thumbnail */}
            {selectedFile && (
              <div style={{ ...cardStyle, padding: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Original Thumbnail</span>
                <div style={{ width: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid #E4E4EF', minHeight: 180, background: '#F7F7FB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}>
                  {failedPreviews[selectedFile.id] ? (
                    <>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B5BD6' }}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/>
                          <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>Preview not available for this format</span>
                    </>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedFile.preview || ''}
                      alt=""
                      onError={() => setFailedPreviews(prev => ({ ...prev, [selectedFile.id]: true }))}
                      style={{ width: '100%', height: 'auto', maxHeight: 220, objectFit: 'contain', display: 'block', background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px' }}
                    />
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      )}
    </ToolPageShell>
  );
}
