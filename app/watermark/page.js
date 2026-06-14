"use client";

import React, { useState, useEffect, useRef } from 'react';
import ToolPageShell from '@/components/ToolPageShell';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';

// Helper to get coordinates on canvas
const getCoords = (canvasW, canvasH, itemW, itemH, isImage, s) => {
  let x = 0, y = 0, align = 'center';
  const padding = 20 * (canvasW / 1000); // Scale padding relative to image width

  switch (s.position) {
    case 'top-left':
      x = padding;
      y = padding + (isImage ? 0 : itemH / 2);
      align = 'left';
      break;
    case 'top-right':
      x = canvasW - padding - (isImage ? itemW : 0);
      y = padding + (isImage ? 0 : itemH / 2);
      align = isImage ? 'left' : 'right';
      break;
    case 'bottom-left':
      x = padding;
      y = canvasH - padding - (isImage ? itemH : itemH / 2);
      align = 'left';
      break;
    case 'bottom-right':
      x = canvasW - padding - (isImage ? itemW : 0);
      y = canvasH - padding - (isImage ? itemH : itemH / 2);
      align = isImage ? 'left' : 'right';
      break;
    case 'custom':
      x = (canvasW * s.customX) / 100 - (isImage ? itemW / 2 : 0);
      y = (canvasH * s.customY) / 100 - (isImage ? itemH / 2 : 0);
      align = 'center';
      break;
    case 'center':
    default:
      x = canvasW / 2 - (isImage ? itemW / 2 : 0);
      y = canvasH / 2 - (isImage ? itemH / 2 : 0);
      align = 'center';
      break;
  }

  return { x, y, align };
};

// Helper to draw watermark on canvas
const drawWatermark = (canvas, ctx, img, logoImg, s) => {
  const w = canvas.width;
  const h = canvas.height;

  // Draw main image
  ctx.drawImage(img, 0, 0, w, h);

  // Save context state
  ctx.save();

  if (s.type === 'text') {
    // Configure Font
    let fontStr = '';
    if (s.italic) fontStr += 'italic ';
    if (s.bold) fontStr += 'bold ';
    const scaledFontSize = s.fontSize * (w / 1000); // Scale font size relative to image width
    fontStr += `${scaledFontSize}px ${s.fontFamily}`;
    ctx.font = fontStr;
    ctx.fillStyle = s.color;
    ctx.globalAlpha = s.opacity;
    ctx.textBaseline = 'middle';

    if (s.tile) {
      // Tiled Grid Watermark
      ctx.textAlign = 'center';
      const rad = (s.rotation * Math.PI) / 180;
      const textWidth = ctx.measureText(s.text).width || 150;
      const xGap = textWidth + 100 * (w / 1000); // Scale gaps relative to image width
      const yGap = scaledFontSize + 120 * (w / 1000);

      for (let x = -w; x < w * 2; x += xGap) {
        for (let y = -h; y < h * 2; y += yGap) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rad);
          ctx.fillText(s.text, 0, 0);
          ctx.restore();
        }
      }
    } else {
      // Single Watermark
      const textWidth = ctx.measureText(s.text).width;
      let { x, y, align } = getCoords(w, h, textWidth, scaledFontSize, false, s);
      ctx.textAlign = align;

      ctx.translate(x, y);
      if (s.rotation !== 0) {
        ctx.rotate((s.rotation * Math.PI) / 180);
      }
      ctx.fillText(s.text, 0, 0);
    }
  } else if (s.type === 'image' && logoImg) {
    // Image Watermark
    const logoW = w * (s.logoScale / 100);
    const logoH = logoImg.height * (logoW / logoImg.width);
    ctx.globalAlpha = s.logoOpacity;

    let { x, y } = getCoords(w, h, logoW, logoH, true, s);

    // Rotate logo around its center
    ctx.translate(x + logoW / 2, y + logoH / 2);
    if (s.logoRotation !== 0) {
      ctx.rotate((s.logoRotation * Math.PI) / 180);
    }
    ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
  }

  ctx.restore();
};

// Reusable component to render the watermark overlay on canvas
function WatermarkedCanvas({
  fileObj,
  logoImg,
  type,
  text,
  fontFamily,
  fontSize,
  color,
  opacity,
  rotation,
  bold,
  italic,
  tile,
  logoScale,
  logoOpacity,
  logoRotation,
  position,
  customX,
  customY,
  style
}) {
  const canvasRef = useRef(null);
  const [mainImg, setMainImg] = useState(null);

  useEffect(() => {
    if (!fileObj?.preview) {
      setMainImg(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setMainImg(img);
    };
    img.onerror = () => {
      setMainImg(null);
    };
    img.src = fileObj.preview;
  }, [fileObj]);

  useEffect(() => {
    if (!canvasRef.current || !mainImg) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = mainImg.naturalWidth || mainImg.width;
    canvas.height = mainImg.naturalHeight || mainImg.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const settings = {
      type, text, fontFamily, fontSize, color, opacity, rotation, bold, italic, tile,
      logoScale, logoOpacity, logoRotation, position, customX, customY
    };

    drawWatermark(canvas, ctx, mainImg, logoImg, settings);
  }, [mainImg, logoImg, type, text, fontFamily, fontSize, color, opacity, rotation, bold, italic, tile, logoScale, logoOpacity, logoRotation, position, customX, customY]);

  return <canvas ref={canvasRef} style={style} />;
}

export default function WatermarkPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewMode, setPreviewMode] = useState('single'); // 'single' | 'bulk'
  
  // Watermark Settings
  const [type, setType] = useState('text'); // 'text' | 'image'
  
  // Text Watermark settings
  const [text, setText] = useState('ImagePine');
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [fontSize, setFontSize] = useState(36);
  const [color, setColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [tile, setTile] = useState(false);
  
  // Image Watermark settings
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoScale, setLogoScale] = useState(15); // % of main image width
  const [logoOpacity, setLogoOpacity] = useState(0.5);
  const [logoRotation, setLogoRotation] = useState(0);
  const [logoImg, setLogoImg] = useState(null);

  useEffect(() => {
    if (logoPreview) {
      const img = new Image();
      img.onload = () => setLogoImg(img);
      img.onerror = () => setLogoImg(null);
      img.src = logoPreview;
    } else {
      setLogoImg(null);
    }
  }, [logoPreview]);
  
  // Position settings
  const [position, setPosition] = useState('center'); // 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right' | 'custom'
  const [customX, setCustomX] = useState(50); // % from left
  const [customY, setCustomY] = useState(50); // % from top

  const [saveFormat, setSaveFormat] = useState('Original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const _FEATURES = [
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: '100% Local & Private',
      desc: 'All watermarking and graphics calculations run entirely in your web browser. No files are uploaded to any server.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      title: 'Bulk Processing & ZIP Archives',
      desc: 'Overlay watermarks onto dozens of images simultaneously and download them in a single ZIP container.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M20.4 14.5L16 10l-6 6-4-4-3 3" />
        </svg>
      ),
      title: 'Multi-Image Live Grid',
      desc: 'Switch to bulk grid mode to preview how watermarks fit on all uploaded files under different sizes.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M7 8h10M7 12h10M7 16h10" />
        </svg>
      ),
      title: 'Custom Brand Overlays',
      desc: 'Design beautiful text templates with distinct fonts, colors, and grid angles, or load brand logo PNGs.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 4v16m8-8H4" />
        </svg>
      ),
      title: 'Anti-Theft Tiling Mode',
      desc: 'Tile text structures across the image in repeating grids. Makes it extremely difficult for third parties to crop out watermark overlays.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8V4m0 0h4M4 4l5 5m11-5V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4M4 20l5-5m11 5v-4m0 0h-4m4 4l-5-5" />
        </svg>
      ),
      title: 'Lossless Visual Scaling',
      desc: 'Saves files locally using canvas rendering relative to native image bounds, keeping export output details pristine.'
    }
  ];

  const _STEPS = [
    { n: '1', title: 'Upload Files', desc: 'Select one or more photos you want to protect.' },
    { n: '2', title: 'Design Template', desc: 'Configure a text structure or import a brand logo PNG and adjust scale and positioning.' },
    { n: '3', title: 'Download Protections', desc: 'Export individually or package all results as a ZIP container.' }
  ];

  const _FAQS = [
    { q: 'How does bulk watermarking work?', a: 'Upload multiple files together. The template settings you define are projected onto all files simultaneously, keeping formatting and dimensions proportional.' },
    { q: 'What is a Tiled Watermark?', a: 'Tiling repeats your text pattern in a grid over the entire photo canvas. This is highly effective at stopping others from cropping or using automated tools to extract the visual contents.' },
    { q: 'Can I select a custom download format?', a: 'Yes. You can preserve the original format or convert your results to JPG, PNG, or WebP upon bulk export.' }
  ];

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [logoFile]);

  const handleFileSelect = (newFiles) => {
    if (newFiles && newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      if (!selectedFile) setSelectedFile(newFiles[0]);
    }
  };

  const removeFile = (id, e) => {
    if (e) e.stopPropagation();
    const filtered = files.filter(f => f.id !== id);
    setFiles(filtered);
    if (selectedFile?.id === id) {
      setSelectedFile(filtered.length > 0 ? filtered[0] : null);
    }
  };

  const formatSize = (b) => {
    if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
    return (b / 1024).toFixed(1) + ' KB';
  };

  // Process a single file to a blob
  const processImage = (fileObj, logoImg) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context failed');

          const settings = {
            type, text, fontFamily, fontSize, color, opacity, rotation, bold, italic, tile,
            logoScale, logoOpacity, logoRotation, position, customX, customY
          };

          const mimeMap = {
            'Original': fileObj.type,
            'JPG': 'image/jpeg',
            'PNG': 'image/png',
            'WebP': 'image/webp'
          };
          const mime = mimeMap[saveFormat] || fileObj.type;

          if (mime === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          drawWatermark(canvas, ctx, img, logoImg, settings);
          canvas.toBlob(blob => {
            if (blob) {
              const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
              const ext = extMap[mime] || 'jpg';
              const nameWithoutExt = fileObj.name.replace(/\.[^/.]+$/, '');
              resolve({ blob, name: `${nameWithoutExt}_watermarked.${ext}` });
            } else {
              reject(new Error('Export failed'));
            }
          }, mime, 0.92);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = fileObj.preview;
    });
  };

  const loadLogoImage = () => {
    return new Promise((resolve) => {
      if (type === 'image' && logoPreview) {
        const logoImg = new Image();
        logoImg.onload = () => resolve(logoImg);
        logoImg.onerror = () => resolve(null);
        logoImg.src = logoPreview;
      } else {
        resolve(null);
      }
    });
  };

  // Download all files as a consolidated ZIP
  const downloadAllAsZip = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProcessedCount(0);

    try {
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      
      const logoImg = await loadLogoImage();

      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        const { blob, name } = await processImage(fileObj, logoImg);
        zip.file(name, blob);
        setProcessedCount(i + 1);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'watermarked_images.zip');
      saveHistory('Image Watermarker', `watermarked_images.zip (${files.length} images)`);
    } catch (e) {
      console.error(e);
      alert('Failed to package ZIP archive. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download individual watermarked images
  const downloadAllIndividually = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProcessedCount(0);

    try {
      const logoImg = await loadLogoImage();
      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        const { blob, name } = await processImage(fileObj, logoImg);
        saveAs(blob, name);
        setProcessedCount(i + 1);
      }
      saveHistory('Image Watermarker', `${files.length} files downloaded individually`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
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
  
  return (
    <ToolPageShell
      title="Image Watermarker"
      subtitle="Protect your visual assets. Add customizable text watermarks or brand logo overlays in bulk, locally in your browser."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Watermark images online in bulk. Add text watermarks or transparent PNG logos to multiple photos at once. Completely local, free, private."
    >
      {files.length === 0 ? (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={handleFileSelect}
            acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
            multiple={true}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">
          
          {/* Left: Files List Sidebar */}
          <div className="col-span-1 lg:col-span-3" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #F1F1F7', paddingBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase' }}>Files ({files.length})</span>
              <button onClick={() => { setFiles([]); setSelectedFile(null); }} style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', border: 'none', background: 'none', cursor: 'pointer' }}>Clear All</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
              {files.map(fileObj => (
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
                  <img src={fileObj.preview} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6, border: '1px solid #E4E4EF', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flexGrow: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#111128', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }} title={fileObj.name}>{fileObj.name}</p>
                    <p style={{ fontSize: 9, color: '#9898B5', margin: '2px 0 0' }}>{formatSize(fileObj.size)}</p>
                  </div>
                  <button type="button" onClick={(e) => removeFile(fileObj.id, e)} style={{ border: 'none', background: 'none', color: '#9898B5', cursor: 'pointer', fontSize: 12 }}>×</button>
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
              Add Images
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

          {/* Middle: Canvas Preview (Single/Bulk Grid switcher) */}
          <div className="col-span-1 lg:col-span-5" style={{ ...cardStyle, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E4E4EF' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111128', margin: 0 }}>Watermark Preview</h3>
              <div style={{ display: 'flex', gap: 2, background: '#F1F1F7', borderRadius: 8, padding: 2 }}>
                <button
                  type="button"
                  onClick={() => setPreviewMode('single')}
                  style={{
                    padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: previewMode === 'single' ? '#fff' : 'transparent', color: previewMode === 'single' ? '#5B5BD6' : '#9898B5',
                    boxShadow: previewMode === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s'
                  }}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('bulk')}
                  style={{
                    padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: previewMode === 'bulk' ? '#fff' : 'transparent', color: previewMode === 'bulk' ? '#5B5BD6' : '#9898B5',
                    boxShadow: previewMode === 'bulk' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s'
                  }}
                >
                  Bulk Grid ({files.length})
                </button>
              </div>
            </div>

            {previewMode === 'single' ? (
              <div style={{
                minHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
                position: 'relative'
              }}>
                {selectedFile && (
                  <div style={{ position: 'relative', maxWidth: '100%', maxHeight: 440, display: 'inline-block', overflow: 'hidden', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <WatermarkedCanvas
                      fileObj={selectedFile}
                      logoImg={logoImg}
                      type={type}
                      text={text}
                      fontFamily={fontFamily}
                      fontSize={fontSize}
                      color={color}
                      opacity={opacity}
                      rotation={rotation}
                      bold={bold}
                      italic={italic}
                      tile={tile}
                      logoScale={logoScale}
                      logoOpacity={logoOpacity}
                      logoRotation={logoRotation}
                      position={position}
                      customX={customX}
                      customY={customY}
                      style={{ maxWidth: '100%', maxHeight: 440, display: 'block', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                minHeight: 380, padding: 20,
                background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
                position: 'relative', overflowY: 'auto', maxHeight: 480
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
                  {files.map(fileObj => (
                    <div
                      key={fileObj.id}
                      onClick={() => setSelectedFile(fileObj)}
                      style={{
                        background: '#fff', border: `2px solid ${selectedFile?.id === fileObj.id ? '#5B5BD6' : '#E4E4EF'}`,
                        borderRadius: 12, padding: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: 100, overflow: 'hidden', borderRadius: 8, background: '#F7F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <WatermarkedCanvas
                          fileObj={fileObj}
                          logoImg={logoImg}
                          type={type}
                          text={text}
                          fontFamily={fontFamily}
                          fontSize={fontSize}
                          color={color}
                          opacity={opacity}
                          rotation={rotation}
                          bold={bold}
                          italic={italic}
                          tile={tile}
                          logoScale={logoScale}
                          logoOpacity={logoOpacity}
                          logoRotation={logoRotation}
                          position={position}
                          customX={customX}
                          customY={customY}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                      <div style={{ minWidth: 0, flexGrow: 1 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#111128', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }} title={fileObj.name}>
                          {fileObj.name}
                        </p>
                        <p style={{ fontSize: 9, color: '#9898B5', margin: '2px 0 0' }}>
                          {formatSize(fileObj.size)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setIsProcessing(true);
                            try {
                              const logoImg = await loadLogoImage();
                              const { blob, name } = await processImage(fileObj, logoImg);
                              saveAs(blob, name);
                              saveHistory('Image Watermarker', `${fileObj.name} (Watermarked)`);
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          style={{ flex: 1, border: 'none', background: '#F0FDF4', color: '#16A34A', fontSize: 10, fontWeight: 700, padding: '4px 0', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(fileObj.id); }}
                          style={{ border: 'none', background: '#FFF5F5', color: '#EF4444', fontSize: 10, fontWeight: 700, padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls Panel */}
          <div className="col-span-1 lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Watermark Type Selector */}
            <div style={cardStyle}>
              <span style={sidebarLabel}>Watermark Type</span>
              <div style={{ display: 'flex', background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 10, padding: 3 }}>
                <button
                  onClick={() => setType('text')}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: type === 'text' ? '#fff' : 'transparent', color: type === 'text' ? '#5B5BD6' : '#9898B5',
                    boxShadow: type === 'text' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s'
                  }}
                >
                  Text Watermark
                </button>
                <button
                  onClick={() => setType('image')}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: type === 'image' ? '#fff' : 'transparent', color: type === 'image' ? '#5B5BD6' : '#9898B5',
                    boxShadow: type === 'image' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s'
                  }}
                >
                  Logo Overlay
                </button>
              </div>
            </div>

            {/* Template editor */}
            {type === 'text' ? (
              <div style={cardStyle}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 14px' }}>Text Settings</h3>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={sidebarLabel}>Watermark Text</label>
                  <input type="text" value={text} onChange={e => setText(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 9, fontSize: 13, fontWeight: 700, color: '#111128', outline: 'none' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={sidebarLabel}>Font Family</label>
                    <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 9, fontSize: 12, fontWeight: 700, color: '#111128', outline: 'none' }}>
                      <option value="sans-serif">Sans-Serif</option>
                      <option value="serif">Serif</option>
                      <option value="monospace">Monospace</option>
                      <option value="cursive">Cursive</option>
                    </select>
                  </div>
                  <div>
                    <label style={sidebarLabel}>Text Color</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ border: 'none', background: 'none', width: 34, height: 34, cursor: 'pointer', padding: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{color.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button onClick={() => setBold(!bold)} style={{ flex: 1, padding: 8, fontSize: 11, fontWeight: 700, borderRadius: 8, border: `1px solid ${bold ? '#5B5BD6' : '#E4E4EF'}`, background: bold ? '#EEF0FF' : '#FAFAFF', color: bold ? '#5B5BD6' : '#6B6B8A', cursor: 'pointer' }}>Bold</button>
                  <button onClick={() => setItalic(!italic)} style={{ flex: 1, padding: 8, fontSize: 11, fontWeight: 700, borderRadius: 8, border: `1px solid ${italic ? '#5B5BD6' : '#E4E4EF'}`, background: italic ? '#EEF0FF' : '#FAFAFF', color: italic ? '#5B5BD6' : '#6B6B8A', cursor: 'pointer' }}>Italic</button>
                  <button onClick={() => setTile(!tile)} style={{ flex: 1.5, padding: 8, fontSize: 11, fontWeight: 700, borderRadius: 8, border: `1px solid ${tile ? '#5B5BD6' : '#E4E4EF'}`, background: tile ? '#EEF0FF' : '#FAFAFF', color: tile ? '#5B5BD6' : '#6B6B8A', cursor: 'pointer' }}>Grid Tile</button>
                </div>

                {/* Opacity, Rotation, Size sliders */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={sidebarLabel}>Font Size</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{fontSize}px</span>
                  </div>
                  <input type="range" min="12" max="120" step="1" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={sidebarLabel}>Opacity</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{Math.round(opacity * 100)}%</span>
                  </div>
                  <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={sidebarLabel}>Rotation</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{rotation}°</span>
                  </div>
                  <input type="range" min="-180" max="180" step="5" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                </div>

              </div>
            ) : (
              <div style={cardStyle}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 14px' }}>Logo settings</h3>
                
                {!logoFile ? (
                  <UploadBox
                    onFileSelect={(f) => setLogoFile(f[0])}
                    acceptedFormats={['.png', '.svg', '.jpg', '.jpeg', '.webp']}
                    multiple={false}
                    buttonLabel="Upload PNG Logo"
                    maxSizeMB={5}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 10, padding: 8, background: '#F7F7FB', borderRadius: 8, border: '1px solid #E4E4EF' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#111128', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>{logoFile.name}</span>
                      <button onClick={() => { setLogoFile(null); setLogoPreview(''); }} style={{ border: 'none', background: 'none', color: '#EF4444', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Delete</button>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={sidebarLabel}>Logo Size Scale</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{logoScale}%</span>
                      </div>
                      <input type="range" min="5" max="60" step="1" value={logoScale} onChange={e => setLogoScale(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={sidebarLabel}>Opacity</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{Math.round(logoOpacity * 100)}%</span>
                      </div>
                      <input type="range" min="0.1" max="1" step="0.05" value={logoOpacity} onChange={e => setLogoOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={sidebarLabel}>Rotation</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{logoRotation}°</span>
                      </div>
                      <input type="range" min="-180" max="180" step="5" value={logoRotation} onChange={e => setLogoRotation(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Position Controls */}
            {(!tile || type === 'image') && (
              <div style={cardStyle}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>Positioning</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                  {[
                    { id: 'top-left', label: 'Top Left' },
                    { id: 'center', label: 'Center' },
                    { id: 'top-right', label: 'Top Right' },
                    { id: 'bottom-left', label: 'Btm Left' },
                    { id: 'custom', label: 'Custom' },
                    { id: 'bottom-right', label: 'Btm Right' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPosition(p.id)}
                      style={{
                        padding: '8px 2px', fontSize: 10, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${position === p.id ? '#5B5BD6' : '#E4E4EF'}`,
                        background: position === p.id ? '#EEF0FF' : '#FAFAFF',
                        color: position === p.id ? '#5B5BD6' : '#6B6B8A',
                        transition: 'all 0.15s'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {position === 'custom' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="animate-fade-in">
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#9898B5' }}>Horizontal Offset (X)</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{customX}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={customX} onChange={e => setCustomX(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#9898B5' }}>Vertical Offset (Y)</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{customY}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={customY} onChange={e => setCustomY(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save & Download Options */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>Save Settings</h3>
              
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 9, padding: 3 }}>
                  {['Original', 'JPG', 'PNG', 'WebP'].map(f => (
                    <button
                      key={f}
                      type="button"
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

              {isProcessing && files.length > 1 && (
                <div style={{ fontSize: 11, color: '#5B5BD6', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                  Processing: {processedCount} of {files.length} images...
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {files.length > 1 ? (
                  <>
                    <button
                      type="button"
                      disabled={isProcessing || (type === 'image' && !logoFile)}
                      onClick={downloadAllAsZip}
                      style={{
                        width: '100%', background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)', color: '#fff',
                        fontWeight: 800, fontSize: 13, borderRadius: 12, padding: '12px', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: '0 4px 14px rgba(91,91,214,0.3)', transition: 'all 0.18s'
                      }}
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      Download All as ZIP
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing || (type === 'image' && !logoFile)}
                      onClick={downloadAllIndividually}
                      style={{
                        width: '100%', background: '#fff', border: '1px solid #E4E4EF', color: '#6B6B8A',
                        fontWeight: 700, fontSize: 11, borderRadius: 10, padding: '8px', cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      Download Individually
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isProcessing || (type === 'image' && !logoFile)}
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        const logoImg = await loadLogoImage();
                        const { blob, name } = await processImage(files[0], logoImg);
                        saveAs(blob, name);
                        saveHistory('Image Watermarker', `${files[0].name} (Watermarked)`);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Watermarked
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </ToolPageShell>
  );
}
