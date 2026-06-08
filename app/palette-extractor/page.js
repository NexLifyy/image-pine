"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" fill="currentColor"/><circle cx="12" cy="6" r="3" fill="currentColor"/><circle cx="18" cy="6" r="3" fill="currentColor"/><circle cx="6" cy="14" r="3" fill="currentColor"/><circle cx="12" cy="14" r="3" fill="currentColor"/><circle cx="18" cy="14" r="3" fill="currentColor"/></svg>), title: '6-Color Quantization', desc: 'Identify the 6 most prominent and visually distinct colors from any image.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>), title: 'Hex, RGB & HSL', desc: 'Get color values in standard formats ready for CSS, Sass, Figma, or Photoshop.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Color extraction is processed local-first. Your photos never leave your device.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>), title: 'Export Palette Card', desc: 'Download a beautifully formatted PNG color card of your extracted palette.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 14l2 2 4-4" /></svg>), title: 'One-Click Clipboard', desc: 'Instantly copy any color value directly to your clipboard in your preferred code format.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>), title: 'Visual Samples', desc: 'See extracted colors highlighted directly alongside matching color cards.' }
];

const _STEPS = [
  { n: '1', title: 'Upload Image', desc: 'Select any photo, design mockup, or illustration.' },
  { n: '2', title: 'Extract Colors', desc: 'Our algorithm clusters pixels to extract dominant colors instantly.' },
  { n: '3', title: 'Copy & Save', desc: 'Copy colors with one click, or export the palette card.' }
];

const _FAQS = [
  { q: 'How does the extraction algorithm work?', a: 'It draws the image onto a small canvas context, extracts pixel color samples, groups them using a color spacing threshold to filter out duplicates, and ranks them by visual frequency.' },
  { q: 'Can I copy individual color values?', a: 'Yes. Simply click the HEX, RGB, or HSL code below any color swatch to copy it to your clipboard.' },
  { q: 'What is the exported Palette Card?', a: 'It is a high-resolution PNG image containing a side-by-side view of your 6 colors, their hex codes, and clean labels for sharing.' }
];

export default function PaletteExtractorPage() {
  const [file, setFile] = useState(null);
  const [colors, setColors] = useState([]); // Array of { hex, rgb, hsl, r, g, b }
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedFormat, setCopiedFormat] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };

  const toHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
    } else {
      setFile(null);
      setColors([]);
    }
    setErrorMsg('');
  };

  useEffect(() => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 64; // downsample to speed up and smooth out local noise
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context not available.');

        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size).data;

        // Group colors by sorting them into quantized buckets
        const colorCounts = {};
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          // Skip highly transparent pixels
          if (a < 128) continue;

          // Round values to reduce detail variance
          const qr = Math.round(r / 12) * 12;
          const qg = Math.round(g / 12) * 12;
          const qb = Math.round(b / 12) * 12;

          const key = `${qr},${qg},${qb}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        // Sort colors by frequency
        const sortedColors = Object.entries(colorCounts)
          .map(([key, count]) => {
            const [r, g, b] = key.split(',').map(Number);
            return { r, g, b, count };
          })
          .sort((a, b) => b.count - a.count);

        // Pick 6 colors that are visually distinct (Euclidean distance threshold)
        const palette = [];
        const threshold = 48; // minimum distance in color space

        for (const candidate of sortedColors) {
          if (palette.length >= 6) break;

          let isDistinct = true;
          for (const selected of palette) {
            const distance = Math.hypot(
              candidate.r - selected.r,
              candidate.g - selected.g,
              candidate.b - selected.b
            );
            if (distance < threshold) {
              isDistinct = false;
              break;
            }
          }

          if (isDistinct) {
            palette.push(candidate);
          }
        }

        // If we found fewer than 6, fill up with top remaining colors
        if (palette.length < 6) {
          for (const candidate of sortedColors) {
            if (palette.length >= 6) break;
            if (!palette.some(p => p.r === candidate.r && p.g === candidate.g && p.b === candidate.b)) {
              palette.push(candidate);
            }
          }
        }

        // Map colors to standard presentation formats
        const formatted = palette.map(c => {
          const hex = toHex(c.r, c.g, c.b);
          return {
            hex,
            rgb: `rgb(${c.r}, ${c.g}, ${c.b})`,
            hsl: rgbToHsl(c.r, c.g, c.b),
            r: c.r,
            g: c.g,
            b: c.b
          };
        });

        setColors(formatted);
        setIsProcessing(false);
      } catch (err) {
        console.error(err);
        setErrorMsg('Error extracting colors from image.');
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      setErrorMsg('Failed to load image.');
      setIsProcessing(false);
    };

    img.src = file.preview || URL.createObjectURL(file);
  }, [file]);

  const copyToClipboard = (text, idx, format) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedIndex(idx);
        setCopiedFormat(format);
        setTimeout(() => {
          setCopiedIndex(null);
          setCopiedFormat('');
        }, 1500);
      }).catch(err => {
        console.error(err);
        fallbackCopyToClipboard(text, idx, format);
      });
    } else {
      fallbackCopyToClipboard(text, idx, format);
    }
  };

  const fallbackCopyToClipboard = (text, idx, format) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedIndex(idx);
      setCopiedFormat(format);
      setTimeout(() => {
        setCopiedIndex(null);
        setCopiedFormat('');
      }, 1500);
    } catch (err) {
      console.error('Fallback copy failed: ', err);
    }
  };

  const downloadPaletteCard = () => {
    if (colors.length === 0 || !file) return;

    // Create a color card image (600x400)
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background color
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 420);

    // Title text
    ctx.fillStyle = '#111128';
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillText('Color Palette Card', 30, 45);

    // Subtitle
    ctx.fillStyle = '#9898B5';
    ctx.font = '500 12px Inter, system-ui, sans-serif';
    ctx.fillText(`Source File: ${file.name.slice(0, 32)}`, 30, 68);

    // Draw the 6 color blocks
    const blockWidth = 540 / 6;
    const startX = 30;
    const startY = 95;
    const blockHeight = 200;

    colors.forEach((c, i) => {
      const bx = startX + i * blockWidth;
      ctx.fillStyle = c.hex;
      
      // Rounded rectangles or clean blocks
      ctx.fillRect(bx, startY, blockWidth, blockHeight);

      // Draw values below block
      ctx.fillStyle = '#111128';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.hex, bx + blockWidth / 2, startY + blockHeight + 25);

      // Light gray division lines
      ctx.strokeStyle = '#E4E4EF';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, startY, blockWidth, blockHeight);
    });

    // Branding at bottom
    ctx.fillStyle = '#C4C4D9';
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('GENERATED BY IMAGEPINE', 570, 385);

    canvas.toBlob((blob) => {
      if (blob) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}_color_palette.png`;
        saveAs(blob, newName);
        saveHistory('Palette Extractor', newName);
      }
    });
  };

  return (
    <ToolPageShell
      title="Color Palette Extractor"
      subtitle="Extract colors from your images instantly. Copy Hex, RGB, or HSL codes, and download palette swatch cards."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free client-side Color Palette Extractor. Extract colors from screenshots or photos, copy hex codes with one click, and export beautiful color card PNGs locally."
    >
      <div className="flex flex-col gap-6">
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp', '.svg']}
              multiple={false} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Preview */}
            <div className="lg:col-span-4" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Source Image
                </h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">
                  Remove
                </button>
              </div>

              {file.preview && (
                <img
                  src={file.preview}
                  alt="Palette Source"
                  className="w-full object-contain rounded-xl border border-bordercolor shadow-sm"
                  style={{ maxHeight: 340 }}
                />
              )}

              <div className="min-w-0 flex flex-col gap-1">
                <p className="text-xs font-bold text-textmain truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] text-gray-400 font-medium">
                  File Size: {formatSize(file.size)}
                </p>
              </div>
            </div>

            {/* Right Column: Colors & Swatches */}
            <div className="lg:col-span-8" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Extracted Palette
                </h4>
                {colors.length > 0 && (
                  <button
                    onClick={downloadPaletteCard}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Palette Card
                  </button>
                )}
              </div>

              {isProcessing ? (
                <div className="flex items-center justify-center py-20 gap-2 text-xs text-primary font-semibold">
                  <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Extracting colors...
                </div>
              ) : errorMsg ? (
                <p className="text-xs text-red-500 font-semibold py-8 text-center">{errorMsg}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {colors.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col border border-bordercolor/60 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {/* Swatch color block */}
                      <div
                        style={{ background: c.hex, height: 90 }}
                        className="w-full flex items-end justify-end p-2 cursor-pointer"
                        onClick={() => copyToClipboard(c.hex, idx, 'hex')}
                        title="Click to copy HEX"
                      >
                        <span 
                          style={{ 
                            background: 'rgba(255,255,255,0.85)', 
                            borderRadius: 6, 
                            fontSize: 9, 
                            fontWeight: 800, 
                            padding: '2px 6px',
                            color: '#111128'
                          }}
                        >
                          {copiedIndex === idx && copiedFormat === 'hex' ? 'Copied!' : 'Copy'}
                        </span>
                      </div>

                      {/* Swatch details */}
                      <div className="p-3 flex flex-col gap-1.5 bg-lightbg/20">
                        <button
                          onClick={() => copyToClipboard(c.hex, idx, 'hex')}
                          className="text-left font-mono text-[10px] font-bold text-textmain truncate hover:text-primary transition-colors duration-150"
                        >
                          HEX: {c.hex}
                        </button>
                        <button
                          onClick={() => copyToClipboard(c.rgb, idx, 'rgb')}
                          className="text-left font-mono text-[9px] text-gray-500 truncate hover:text-primary transition-colors duration-150"
                        >
                          RGB: {c.r},{c.g},{c.b}
                        </button>
                        <button
                          onClick={() => copyToClipboard(c.hsl, idx, 'hsl')}
                          className="text-left font-mono text-[9px] text-gray-500 truncate hover:text-primary transition-colors duration-150"
                        >
                          HSL: {c.hsl.replace('hsl(', '').replace(')', '')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
