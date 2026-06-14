"use client";

import React, { useState, useEffect } from 'react';
import ToolPageShell from '@/components/ToolPageShell';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';

export default function SvgRasterizerPage() {
  const [file, setFile] = useState(null);
  const [svgText, setSvgText] = useState('');
  
  // Dimensions
  const [originalWidth, setOriginalWidth] = useState(100);
  const [originalHeight, setOriginalHeight] = useState(100);
  const [widthInput, setWidthInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [aspectRatio, setAspectRatio] = useState(1);
  const [scaleMultiplier, setScaleMultiplier] = useState(1);
  const [lockRatio, setLockRatio] = useState(true);
  
  // Background & Format
  const [bgType, setBgType] = useState('transparent'); // 'transparent' | 'solid'
  const [bgColor, setBgColor] = useState('#ffffff');
  const [saveFormat, setSaveFormat] = useState('PNG');
  
  const [previewUrl, setPreviewUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const _FEATURES = [
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: '100% Private',
      desc: 'All XML parsing and vector rasterization happen locally on your system. Zero network traffic.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M4 8h16M4 16h16" />
        </svg>
      ),
      title: 'High Resolution (Up to 8x)',
      desc: 'Enforce vector-perfect quality during rasterization. Export large 4K or 8K print-ready PNG/JPEGs.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
        </svg>
      ),
      title: 'Background Control',
      desc: 'Choose to keep a transparent background (PNG/WebP) or fill with custom solid colors.'
    }
  ];

  const _STEPS = [
    { n: '1', title: 'Upload SVG', desc: 'Select any vector SVG file from your device.' },
    { n: '2', title: 'Set Output Size', desc: 'Scale the dimensions up (e.g. 2x, 4x, 8x) or type custom pixel values.' },
    { n: '3', title: 'Choose Background & Save', desc: 'Fill with a color or keep it transparent, then export to PNG, JPEG, or WebP.' }
  ];

  const _FAQS = [
    {
      q: "Why do my exported PNGs look pixelated?",
      a: "By default, rendering a small SVG directly to canvas preserves its small size. To get a high-quality raster, scale up the dimensions (e.g. choose 4x or type 2000px width). The vector details will remain perfectly crisp!"
    },
    {
      q: "How does transparent background work?",
      a: "If you choose 'Transparent Background' and export to PNG or WebP, the background will remain clear. JPEG does not support transparency, so it will fall back to a white background."
    },
    {
      q: "Can I render SVGs with embedded stylesheets or inline scripts?",
      a: "Yes. Since the browser engine renders the SVG payload, local styles are supported. However, externally linked web fonts or external network images inside the SVG may fail to load due to browser canvas security (CORS) rules."
    },
    {
      q: "Are my vector SVG assets uploaded to a server?",
      a: "No. All SVG rendering and rasterization are processed client-side in your web browser, ensuring your vector artwork remains secure and private."
    },
    {
      q: "What formats can I export my rasterized SVGs to?",
      a: "You can rasterize and save your SVG vector files as PNG, JPEG, or WebP images."
    },
    {
      q: "Can I specify a custom height while preserving the aspect ratio?",
      a: "Yes. If you enter a custom width or height in the options panel, the tool automatically calculates and preserves the original aspect ratio of the SVG graphic."
    }
  ];

  useEffect(() => {
    if (svgText) {
      // Create local object URL for previewing
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [svgText]);

  const handleFileSelect = (files) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setSvgText('');
    setPreviewUrl('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setSvgText(text);
      parseSvgDimensions(text);
    };
    reader.readAsText(selected);
  };

  const parseSvgDimensions = (xmlText) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return;

      let w = parseFloat(svg.getAttribute('width'));
      let h = parseFloat(svg.getAttribute('height'));

      // If width/height attributes are missing, check viewBox
      const viewBox = svg.getAttribute('viewBox');
      if ((isNaN(w) || isNaN(h)) && viewBox) {
        const parts = viewBox.split(/[ ,]+/).map(parseFloat);
        if (parts.length === 4) {
          w = parts[2];
          h = parts[3];
        }
      }

      // Default fallback
      if (isNaN(w) || w <= 0) w = 500;
      if (isNaN(h) || h <= 0) h = 500;

      setOriginalWidth(w);
      setOriginalHeight(h);
      setWidthInput(Math.round(w).toString());
      setHeightInput(Math.round(h).toString());
      setAspectRatio(w / h);
      setScaleMultiplier(1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWidthChange = (val) => {
    setWidthInput(val);
    const w = parseInt(val, 10);
    if (!isNaN(w) && w > 0 && lockRatio) {
      setHeightInput(Math.round(w / aspectRatio).toString());
    }
    setScaleMultiplier(0); // reset quick scale buttons
  };

  const handleHeightChange = (val) => {
    setHeightInput(val);
    const h = parseInt(val, 10);
    if (!isNaN(h) && h > 0 && lockRatio) {
      setWidthInput(Math.round(h * aspectRatio).toString());
    }
    setScaleMultiplier(0);
  };

  const applyScaleMultiplier = (multiplier) => {
    setScaleMultiplier(multiplier);
    const targetW = Math.round(originalWidth * multiplier);
    const targetH = Math.round(originalHeight * multiplier);
    setWidthInput(targetW.toString());
    setHeightInput(targetH.toString());
  };

  const handleRasterizeAndDownload = () => {
    if (!svgText) return;
    setIsProcessing(true);

    const w = parseInt(widthInput, 10) || originalWidth;
    const h = parseInt(heightInput, 10) || originalHeight;

    // To prevent fuzzy rendering, we modify the SVG source temporarily, setting the width and height attributes explicitly
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', w.toString());
      svg.setAttribute('height', h.toString());
    }

    const serializer = new XMLSerializer();
    const modifiedSvgText = serializer.serializeToString(doc);

    const svgBlob = new Blob([modifiedSvgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D failed');

        // Draw background
        if (bgType === 'solid' || saveFormat === 'JPG') {
          ctx.fillStyle = bgType === 'solid' ? bgColor : '#ffffff';
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.clearRect(0, 0, w, h);
        }

        // Draw SVG image at high res
        ctx.drawImage(img, 0, 0, w, h);

        const mimeMap = {
          'PNG': 'image/png',
          'JPG': 'image/jpeg',
          'WebP': 'image/webp'
        };
        const mime = mimeMap[saveFormat] || 'image/png';
        const ext = saveFormat.toLowerCase();

        canvas.toBlob((blob) => {
          if (blob) {
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
            saveAs(blob, `${nameWithoutExt}_raster.${ext}`);
            saveHistory('SVG Rasterizer', `${file.name} converted to ${saveFormat.toUpperCase()} (${w}x${h})`);
          }
          setIsProcessing(false);
          URL.revokeObjectURL(url);
        }, mime, 0.95);
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      setIsProcessing(false);
      URL.revokeObjectURL(url);
      alert('Failed to parse vector elements for high-resolution rendering.');
    };
    img.src = url;
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

  const inputStyle = {
    width: '100%', padding: '9px 12px', background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 9,
    fontSize: 13, fontWeight: 700, color: '#111128', outline: 'none'
  };

  const sidebarLabel = { fontSize: 11, fontWeight: 700, color: '#6B6B8A', textTransform: 'uppercase', display: 'block', marginBottom: 6 };

  return (
    <ToolPageShell
      title="SVG Rasterizer"
      subtitle="Rasterize vector SVG files to crisp PNG, JPEG, or WebP images at any custom dimension or scale (up to 8x) locally."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Convert SVG to PNG high resolution. Rasterize SVG files to JPEG or WebP online. Free browser-local SVG rasterizer tool with customizable sizes and background transparency."
    >
      {!file ? (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={handleFileSelect}
            acceptedFormats={['.svg']}
            multiple={false}
            buttonLabel="Select SVG File"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">
          
          {/* Left: Vector Preview */}
          <div className="lg:col-span-8" style={{ ...cardStyle, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E4E4EF' }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111128', margin: 0 }}>{file.name}</h3>
                <p style={{ fontSize: 10, color: '#9898B5', margin: '2px 0 0', fontWeight: 600 }}>Original Viewport: {Math.round(originalWidth)} × {Math.round(originalHeight)} px ({formatSize(file.size)})</p>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setSvgText(''); setPreviewUrl(''); }}
                style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: '#FDF2F2', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
              >
                Clear SVG
              </button>
            </div>
            
            <div style={{
              minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
            }}>
              {previewUrl && (
                <div style={{
                  maxWidth: '100%', maxHeight: 480, display: 'inline-block',
                  background: bgType === 'solid' ? bgColor : 'transparent',
                  padding: 10, borderRadius: 8, border: bgType === 'solid' ? '1px solid #E4E4EF' : 'none',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Vector View"
                    style={{ maxWidth: '100%', maxHeight: 440, objectFit: 'contain', display: 'block' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: Adjustments & Settings */}
          <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Dimensions Control */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>Output Dimensions</h3>
              
              {/* Presets scale buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
                {[1, 2, 4, 8].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => applyScaleMultiplier(m)}
                    style={{
                      padding: '8px 2px', fontSize: 10, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${scaleMultiplier === m ? '#5B5BD6' : '#E4E4EF'}`,
                      background: scaleMultiplier === m ? '#EEF0FF' : '#FAFAFF',
                      color: scaleMultiplier === m ? '#5B5BD6' : '#6B6B8A',
                      transition: 'all 0.15s'
                    }}
                  >
                    {m}x
                  </button>
                ))}
              </div>

              {/* Custom inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span style={sidebarLabel}>Width (px)</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={widthInput} onChange={e => handleWidthChange(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <span style={sidebarLabel}>Height (px)</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={heightInput} onChange={e => handleHeightChange(e.target.value)} style={inputStyle} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginTop: 4 }}>
                  <input type="checkbox" checked={lockRatio} onChange={e => {
                    setLockRatio(e.target.checked);
                    if (e.target.checked) setHeightInput(Math.round(parseInt(widthInput, 10) / aspectRatio).toString());
                  }} style={{ accentColor: '#5B5BD6', width: 14, height: 14 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6B6B8A' }}>Lock aspect ratio</span>
                </label>
              </div>
            </div>

            {/* Background color settings */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>Background Fill</h3>
              
              <div style={{ display: 'flex', background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 10, padding: 3, marginBottom: 12 }}>
                <button
                  onClick={() => setBgType('transparent')}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: bgType === 'transparent' ? '#fff' : 'transparent', color: bgType === 'transparent' ? '#5B5BD6' : '#9898B5',
                    boxShadow: bgType === 'transparent' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s'
                  }}
                >
                  Transparent
                </button>
                <button
                  onClick={() => setBgType('solid')}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: bgType === 'solid' ? '#fff' : 'transparent', color: bgType === 'solid' ? '#5B5BD6' : '#9898B5',
                    boxShadow: bgType === 'solid' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s'
                  }}
                >
                  Solid Color
                </button>
              </div>

              {bgType === 'solid' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="animate-fade-in">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ border: 'none', background: 'none', width: 34, height: 34, cursor: 'pointer', padding: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#111128' }}>{bgColor.toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Rasterize & Save buttons */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>Export Format</h3>
              
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 9, padding: 3 }}>
                  {['PNG', 'JPG', 'WebP'].map(f => (
                    <button
                      key={f}
                      type="button"
                      disabled={f === 'PNG' && saveFormat === 'JPG'} // JPG doesn't support transparency, transparency defaults to white
                      onClick={() => setSaveFormat(f)}
                      style={{
                        padding: '6px 2px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: saveFormat === f ? '#fff' : 'transparent',
                        color: saveFormat === f ? '#5B5BD6' : '#9898B5',
                        boxShadow: saveFormat === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRasterizeAndDownload}
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
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(22,163,74,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(22,163,74,0.28)'; e.currentTarget.style.transform = 'none'; }}
              >
                {isProcessing ? 'Rasterizing vector...' : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Raster Image
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}
    </ToolPageShell>
  );
}
