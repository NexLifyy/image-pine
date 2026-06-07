"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';
import QRCode from 'qrcode';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 2v4h4v-4zM14 14h2v2h-2z"/></svg>), title: 'Custom Branded Codes', desc: 'Create styled QR codes with your brand colors and high error correction.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4"/></svg>), title: 'Logo Overlays', desc: 'Upload your company logo to center on the QR code, with auto-padding.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>), title: '100% Client-Side', desc: 'Your URLs, text data, and uploaded logos are parsed safely inside your browser.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>), title: 'High-Res Export', desc: 'Download clean PNG outputs ready for printing on brochures or packaging.' }
];

const _STEPS = [
  { n: '1', title: 'Enter URL / Text', desc: 'Type the address or text message you want to encode.' },
  { n: '2', title: 'Customize Style', desc: 'Choose dark & light colors and upload your central logo.' },
  { n: '3', title: 'Export QR Code', desc: 'Preview the code, check scanning readability, and download.' }
];

const _FAQS = [
  { q: 'Why is high error correction used?', a: 'High error correction (Level H) allows the QR code to remain scannable even if up to 30% of its data grid is obscured. This is what enables drawing a logo in the center without breaking the code.' },
  { q: 'What size should my logo be?', a: 'A square logo works best. Use the scale slider to keep the logo under 25% of the total QR code size so it scans reliably on all smartphone cameras.' },
  { q: 'Does it support transparent PNG logos?', a: 'Yes. The generator automatically draws a clean solid card buffer behind transparent logos so the background QR blocks do not bleed through.' }
];

export default function QrGeneratorPage() {
  const [text, setText] = useState('https://imagepine.com');
  const [darkColor, setDarkColor] = useState('#111128');
  const [lightColor, setLightColor] = useState('#FFFFFF');
  const [logoFile, setLogoFile] = useState(null);
  const [logoScale, setLogoScale] = useState(20); // percent (10-30)
  const [logoPadding, setLogoPadding] = useState(6); // px padding around logo
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const canvasRef = useRef(null);

  const handleLogoSelect = (files) => {
    if (files.length > 0) {
      setLogoFile(files[0]);
    } else {
      setLogoFile(null);
    }
  };

  const drawQrCode = () => {
    if (!canvasRef.current) return;
    setErrorMsg('');

    const canvas = canvasRef.current;
    
    // Draw QR code onto canvas
    QRCode.toCanvas(canvas, text || ' ', {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: darkColor,
        light: lightColor
      }
    }, (err) => {
      if (err) {
        console.error(err);
        setErrorMsg('Failed to generate QR Code. Adjust your text length.');
        return;
      }

      // If logo is uploaded, overlay it in the center
      if (logoFile) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
          // Calculate logo dimensions
          const qrSize = canvas.width;
          const maxLogoSize = qrSize * (logoScale / 100);
          
          // Keep aspect ratio
          let logoW = img.naturalWidth || img.width;
          let logoH = img.naturalHeight || img.height;
          if (logoW > logoH) {
            logoH = (logoH / logoW) * maxLogoSize;
            logoW = maxLogoSize;
          } else {
            logoW = (logoW / logoH) * maxLogoSize;
            logoH = maxLogoSize;
          }

          // Center coordinates
          const x = (qrSize - logoW) / 2;
          const y = (qrSize - logoH) / 2;

          // Draw background cards/padding matching light color to mask barcode blocks
          ctx.fillStyle = lightColor;
          ctx.fillRect(
            x - logoPadding, 
            y - logoPadding, 
            logoW + logoPadding * 2, 
            logoH + logoPadding * 2
          );

          // Draw logo
          ctx.drawImage(img, x, y, logoW, logoH);
        };
        img.src = logoFile.preview || URL.createObjectURL(logoFile);
      }
    });
  };

  // Redraw when settings change
  useEffect(() => {
    drawQrCode();
  }, [text, darkColor, lightColor, logoFile, logoScale, logoPadding]);

  const downloadQrCode = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        saveAs(blob, 'qr_code.png');
        saveHistory('QR Code Generator', 'qr_code.png');
      } else {
        setErrorMsg('Error generating PNG download.');
      }
    });
  };

  return (
    <ToolPageShell
      title="QR Code Generator & Branding Studio"
      subtitle="Create styled QR codes with custom colors and center brand logos. Runs 100% locally with high error correction."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free client-side QR Code Generator with logo overlay. Customize foreground/background colors, upload custom branding icons, and download high-resolution QR PNGs locally."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        {/* Left Column: QR Code settings */}
        <div className="lg:col-span-5" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: '1px solid #F1F1F7', paddingBottom: 10 }}>
            QR Code Settings
          </h3>

          {/* Text/URL Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              QR Code Value (URL or Text)
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
              placeholder="https://example.com"
            />
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Foreground Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-bordercolor"
                />
                <span className="text-xs font-mono font-bold text-textmain">{darkColor}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-bordercolor"
                />
                <span className="text-xs font-mono font-bold text-textmain">{lightColor}</span>
              </div>
            </div>
          </div>

          {/* Logo upload block */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-bordercolor/40">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Center Logo Overlay (Optional)
              </label>
              {logoFile && (
                <button
                  type="button"
                  onClick={() => setLogoFile(null)}
                  className="text-[10px] font-bold text-red-500 hover:underline"
                >
                  Remove Logo
                </button>
              )}
            </div>
            
            {!logoFile ? (
              <UploadBox
                onFileSelect={handleLogoSelect}
                acceptedFormats={['.png', '.jpg', '.jpeg', '.svg']}
                multiple={false}
                maxSizeMB={2}
                buttonLabel="Upload Logo"
              />
            ) : (
              <div className="p-3 bg-lightbg/30 border border-bordercolor rounded-xl flex items-center gap-3">
                {logoFile.preview && (
                  <img
                    src={logoFile.preview}
                    alt="Logo preview"
                    className="w-10 h-10 object-contain rounded border border-bordercolor bg-white"
                  />
                )}
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate">{logoFile.name}</p>
                  <p className="text-[9px] text-gray-400 font-medium">Ready to overlay</p>
                </div>
              </div>
            )}
          </div>

          {/* Logo sizing sliders */}
          {logoFile && (
            <div className="flex flex-col gap-3 pt-2 border-t border-bordercolor/40">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Logo Scale</span>
                  <span>{logoScale}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={logoScale}
                  onChange={(e) => setLogoScale(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Logo Card Padding</span>
                  <span>{logoPadding}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={logoPadding}
                  onChange={(e) => setLogoPadding(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-500 font-semibold py-1 leading-relaxed">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Right Column: Interactive Preview */}
        <div className="lg:col-span-7" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
          <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Live QR Code Preview
          </h4>

          <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 20, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
            <canvas
              ref={canvasRef}
              style={{ 
                maxHeight: 320, 
                maxWidth: "100%", 
                objectFit: "contain", 
                borderRadius: 8, 
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)", 
                display: "block" 
              }}
            />
          </div>

          <div className="pt-2 border-t border-bordercolor/60">
            <button
              type="button"
              onClick={downloadQrCode}
              style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download QR Code PNG
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
