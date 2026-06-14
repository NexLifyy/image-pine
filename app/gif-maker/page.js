"use client";

import React, { useState, useEffect } from 'react';
import ToolPageShell from '@/components/ToolPageShell';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';

export default function GifMakerPage() {
  const [files, setFiles] = useState([]);
  const [delay, setDelay] = useState(300); // in ms
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);
  const [loop, setLoop] = useState(true);
  const [quality, setQuality] = useState('medium'); // 'high' | 'medium' | 'low'
  const [isCompiling, setIsCompiling] = useState(false);
  const [gifPreviewUrl, setGifPreviewUrl] = useState('');

  const _FEATURES = [
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: '100% Private',
      desc: 'All frames are processed locally inside your browser cache. Your images are never sent to any server.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      title: 'Adjustable Delay & Size',
      desc: 'Fine-tune frame intervals in milliseconds and set custom width and height bounds for the final GIF.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M20.4 14.5L16 10l-6 6-4-4-3 3" />
        </svg>
      ),
      title: 'Drag & Arrange Frames',
      desc: 'Arrange your static images in any order before compiling. Reorder easily with controls.'
    }
  ];

  const _STEPS = [
    { n: '1', title: 'Upload Frames', desc: 'Select multiple static PNG, JPEG, or WebP images.' },
    { n: '2', title: 'Arrange & Configure', desc: 'Set the order of frames, adjust delay timings, loops, and dimensions.' },
    { n: '3', title: 'Compile & Save', desc: 'Compile the frames locally and download your new animated GIF.' }
  ];

  const _FAQS = [
    {
      q: "Is there a limit to the number of frames?",
      a: "No strict limit. However, uploading dozens of extremely high-resolution images can consume significant memory and CPU power. For best results, resize your frames first."
    },
    {
      q: "How does loop work?",
      a: "If looping is checked, the animated GIF will repeat indefinitely. If unchecked, it will play once and stop on the last frame."
    },
    {
      q: "How does quality affect compilation time?",
      a: "High quality uses a sample interval of 2 (processes more pixels), creating sharp GIFs but taking longer. Low quality parses every 20th pixel, making it much faster but slightly noisier."
    },
    {
      q: "Are my source frames uploaded to a server to compile the GIF?",
      a: "No, never. The animated GIF compilation runs 100% locally in your web browser using local memory and JavaScript workers."
    },
    {
      q: "Can I customize the frame delay speed for my animation?",
      a: "Yes. You can specify a custom delay time in milliseconds (e.g. 100ms per frame) to control the speed of the animation."
    },
    {
      q: "Can I reorder the frames after uploading them?",
      a: "Yes. You can drag and drop the image frame thumbnails in the workspace queue to reorder them before rendering the GIF."
    }
  ];

  const handleFileSelect = (newFiles) => {
    if (newFiles && newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);

      // Default dimensions from the first image
      if (files.length === 0) {
        const img = new Image();
        img.onload = () => {
          setWidth(img.naturalWidth || img.width || 500);
          setHeight(img.naturalHeight || img.height || 500);
        };
        img.src = newFiles[0].preview;
      }
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFrame = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === files.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...files];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFiles(updated);
  };

  // Convert base64 data to blob for saving
  const base64ToBlob = (base64Data, contentType = 'image/gif') => {
    const sliceSize = 1024;
    const byteCharacters = atob(base64Data.split(',')[1]);
    const bytesLength = byteCharacters.length;
    const slicesCount = Math.ceil(bytesLength / sliceSize);
    const byteArrays = new Array(slicesCount);

    for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
      const begin = sliceIndex * sliceSize;
      const end = Math.min(begin + sliceSize, bytesLength);

      const bytes = new Array(end - begin);
      for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
        bytes[i] = byteCharacters.charCodeAt(offset);
      }
      byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  const handleCompile = async () => {
    if (files.length < 2) return;
    setIsCompiling(true);

    try {
      // Dynamic import of gifshot to support next build server side compilation safety
      const gifshotModule = await import('gifshot');
      const gifshot = gifshotModule.default;

      // Extract raw image previews for gifshot
      const imageUrls = files.map(f => f.preview);

      const sampleMap = {
        'high': 2,
        'medium': 10,
        'low': 20
      };

      gifshot.createGIF({
        images: imageUrls,
        gifWidth: width,
        gifHeight: height,
        interval: delay / 1000, // interval is in seconds
        numFrames: files.length,
        loop: loop ? 0 : 1, // 0 = loop forever, 1 = play once
        sampleInterval: sampleMap[quality] || 10
      }, (obj) => {
        if (!obj.error) {
          const base64 = obj.image;
          const blob = base64ToBlob(base64);
          
          if (gifPreviewUrl) URL.revokeObjectURL(gifPreviewUrl);
          const localUrl = URL.createObjectURL(blob);
          setGifPreviewUrl(localUrl);

          saveAs(blob, 'animated_logo.gif');
          saveHistory('GIF Maker', `animated_logo.gif (${files.length} frames)`);
        } else {
          alert('Compilation failed. Please try fewer frames or smaller dimensions.');
        }
        setIsCompiling(false);
      });
    } catch (e) {
      console.error(e);
      alert('Could not initialize client compilation engine.');
      setIsCompiling(false);
    }
  };

  const cardStyle = {
    background: '#fff',
    border: '1px solid #E4E4EF',
    borderRadius: 20,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    height: 'fit-content'
  };

  const sidebarLabel = { fontSize: 11, fontWeight: 700, color: '#6B6B8A', textTransform: 'uppercase', display: 'block', marginBottom: 6 };

  const inputStyle = {
    width: '100%', padding: '9px 12px', background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 9,
    fontSize: 13, fontWeight: 700, color: '#111128', outline: 'none'
  };

  return (
    <ToolPageShell
      title="GIF Maker"
      subtitle="Assemble static PNG, JPEG, or WebP images into high-quality animated GIFs directly in your browser sandbox."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Create animated GIFs online for free. Combine multiple photos into a moving GIF. Client-side browser execution ensures total privacy with customizable speed and resolution."
    >
      {files.length === 0 ? (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={handleFileSelect}
            acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
            multiple={true}
            buttonLabel="Select GIF Frames"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">
          
          {/* Left: Frame arrangement sidebar */}
          <div className="lg:col-span-4" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #F1F1F7', paddingBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase' }}>Frames ({files.length})</span>
              <button onClick={() => { setFiles([]); setGifPreviewUrl(''); }} style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', border: 'none', background: 'none', cursor: 'pointer' }}>Clear All</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto', marginBottom: 14 }}>
              {files.map((fileObj, index) => (
                <div
                  key={fileObj.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 12,
                    border: '1px solid #E4E4EF', background: '#FAFAFF'
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#9898B5', width: 14, textAlign: 'center' }}>{index + 1}</span>
                  <img src={fileObj.preview} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6, border: '1px solid #E4E4EF', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#111128', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }} title={fileObj.name}>{fileObj.name}</span>
                  
                  {/* Reordering actions */}
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button type="button" disabled={index === 0} onClick={() => moveFrame(index, 'up')} style={{ border: 'none', background: '#F1F1F7', borderRadius: 6, width: 22, height: 22, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                    <button type="button" disabled={index === files.length - 1} onClick={() => moveFrame(index, 'down')} style={{ border: 'none', background: '#F1F1F7', borderRadius: 6, width: 22, height: 22, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
                    <button type="button" onClick={() => removeFile(fileObj.id)} style={{ border: 'none', background: '#FEE2E2', color: '#EF4444', borderRadius: 6, width: 22, height: 22, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>×</button>
                  </div>
                </div>
              ))}
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
              Upload More Frames
            </button>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple style={{ display: 'none' }}
              onChange={e => {
                const newFiles = Array.from(e.target.files || []).map(f =>
                  Object.assign(f, { preview: URL.createObjectURL(f), id: Math.random().toString(36).slice(2, 9) })
                );
                handleFileSelect(newFiles);
                e.target.value = '';
              }}
            />
          </div>

          {/* Middle: Canvas Preview */}
          <div className="lg:col-span-5" style={{ ...cardStyle, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E4E4EF' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111128', margin: 0 }}>Compiled GIF Preview</h3>
              <span style={{ fontSize: 10, color: '#9898B5', fontWeight: 600 }}>Output Viewer</span>
            </div>

            <div style={{
              minHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
            }}>
              {gifPreviewUrl ? (
                <div style={{ maxWidth: '100%', maxHeight: 440, borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gifPreviewUrl} alt="Compiled GIF Preview" style={{ maxWidth: '100%', maxHeight: 440, display: 'block' }} />
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#9898B5', padding: 40 }}>
                  <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Arrange your frames, then click Compile to preview.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls Panel */}
          <div className="lg:col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Speed & Quality Settings */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 14px' }}>GIF Settings</h3>
              
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={sidebarLabel}>Frame Delay</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{delay} ms</span>
                </div>
                <input type="range" min="50" max="2000" step="50" value={delay} onChange={e => setDelay(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                <div>
                  <span style={sidebarLabel}>GIF Width (px)</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={width} onChange={e => setWidth(parseInt(e.target.value) || 500)} style={inputStyle} />
                </div>
                <div>
                  <span style={sidebarLabel}>GIF Height (px)</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={height} onChange={e => setHeight(parseInt(e.target.value) || 500)} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <span style={sidebarLabel}>Render Quality</span>
                <div style={{ display: 'flex', background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 10, padding: 3 }}>
                  {['low', 'medium', 'high'].map(q => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      style={{
                        flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer',
                        background: quality === q ? '#fff' : 'transparent', color: quality === q ? '#5B5BD6' : '#9898B5',
                        boxShadow: quality === q ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s'
                      }}
                    >
                      {q.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} style={{ accentColor: '#5B5BD6', width: 14, height: 14 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B6B8A' }}>Infinite Loop Playback</span>
              </label>
            </div>

            {/* Compile Action button */}
            <div style={cardStyle}>
              <button
                type="button"
                disabled={isCompiling || files.length < 2}
                onClick={handleCompile}
                style={{
                  width: '100%',
                  background: files.length < 2 ? '#E4E4EF' : 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                  color: files.length < 2 ? '#9898B5' : '#fff',
                  fontWeight: 800,
                  fontSize: 13,
                  borderRadius: 12,
                  padding: '13px',
                  border: 'none',
                  cursor: files.length < 2 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: files.length < 2 ? 'none' : '0 4px 14px rgba(22,163,74,0.28)',
                  transition: 'all 0.18s'
                }}
                onMouseEnter={e => { if (files.length >= 2) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(22,163,74,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={e => { if (files.length >= 2) { e.currentTarget.style.boxShadow = '0 4px 14px rgba(22,163,74,0.28)'; e.currentTarget.style.transform = 'none'; } }}
              >
                {isCompiling ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Compiling GIF...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Compile & Save GIF
                  </>
                )}
              </button>
              {files.length < 2 && (
                <p style={{ fontSize: 10, color: '#EF4444', margin: '8px 0 0', textAlign: 'center', fontWeight: 600 }}>Please upload at least 2 frames.</p>
              )}
            </div>

          </div>

        </div>
      )}
    </ToolPageShell>
  );
}
