"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';
import QRCode from 'qrcode';
import { useLanguage } from '@/lib/LanguageContext';

// EAN-13 specification patterns for standard book barcodes
const L_AND_G_PATTERNS = {
  0: [0, 0, 0, 0, 0, 0],
  1: [0, 0, 1, 0, 1, 1],
  2: [0, 0, 1, 1, 0, 1],
  3: [0, 0, 1, 1, 1, 0],
  4: [0, 1, 0, 0, 1, 1],
  5: [0, 1, 1, 0, 0, 1],
  6: [0, 1, 1, 1, 0, 0],
  7: [0, 1, 0, 1, 0, 1],
  8: [0, 1, 0, 1, 1, 0],
  9: [0, 1, 1, 0, 1, 0]
};

const L_CODE = {
  0: '0001101', 1: '0011001', 2: '0010011', 3: '0111101', 4: '0100011',
  5: '0110001', 6: '0101111', 7: '0111011', 8: '0110111', 9: '0001011'
};

const G_CODE = {
  0: '0100111', 1: '0110011', 2: '0011011', 3: '0100001', 4: '0011101',
  5: '0111001', 6: '0000101', 7: '0010001', 8: '0001001', 9: '0010111'
};

const R_CODE = {
  0: '1110010', 1: '1100110', 2: '1101100', 3: '1000010', 4: '1011100',
  5: '1001110', 6: '1010000', 7: '1000100', 8: '1001000', 9: '1110100'
};

const calculateEan13CheckDigit = (first12) => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += first12[i] * (i % 2 === 0 ? 1 : 3);
  }
  const rem = sum % 10;
  return rem === 0 ? 0 : 10 - rem;
};

const generateEan13Bitstring = (digits) => {
  const firstDigit = digits[0];
  const leftStructure = L_AND_G_PATTERNS[firstDigit];
  
  let bitstring = '101'; // Start guard
  
  for (let i = 0; i < 6; i++) {
    const digit = digits[i + 1];
    const isGCode = leftStructure[i];
    bitstring += isGCode ? G_CODE[digit] : L_CODE[digit];
  }
  
  bitstring += '01010'; // Center guard
  
  for (let i = 0; i < 6; i++) {
    const digit = digits[i + 7];
    bitstring += R_CODE[digit];
  }
  
  bitstring += '101'; // End guard
  
  return bitstring;
};

const drawEan13BarcodeOnCanvas = (canvas, digits, darkColor, lightColor, targetWidth = 400) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const scale = targetWidth / 400;
  const canvasW = targetWidth;
  const canvasH = Math.round(260 * scale);
  canvas.width = canvasW;
  canvas.height = canvasH;
  
  // Fill background
  if (lightColor && lightColor !== 'transparent' && lightColor !== '#00000000') {
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else {
    ctx.clearRect(0, 0, canvasW, canvasH);
  }
  
  const bitstring = generateEan13Bitstring(digits);
  
  const moduleW = 3 * scale;
  const barcodeW = 95 * moduleW;
  const startX = Math.round((canvasW - barcodeW) / 2);
  const startY = 35 * scale;
  const regularH = 130 * scale;
  const guardH = 150 * scale;
  
  ctx.fillStyle = darkColor;
  
  for (let i = 0; i < 95; i++) {
    const bit = bitstring[i];
    if (bit === '1') {
      const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
      const barH = isGuard ? guardH : regularH;
      ctx.fillRect(startX + i * moduleW, startY, moduleW, barH);
    }
  }
  
  // Draw text digits
  ctx.fillStyle = darkColor;
  ctx.font = `bold ${Math.round(16 * scale)}px monospace`;
  ctx.textBaseline = 'top';
  
  // First digit (outside left)
  ctx.textAlign = 'right';
  ctx.fillText(digits[0], startX - 10 * scale, startY + regularH + 5 * scale);
  
  // Left 6 digits
  ctx.textAlign = 'center';
  const leftGroupX = startX + (3 + 21) * moduleW;
  const leftStr = digits.slice(1, 7).join('');
  ctx.fillText(leftStr, leftGroupX, startY + regularH + 5 * scale);
  
  // Right 6 digits
  const rightGroupX = startX + (50 + 21) * moduleW;
  const rightStr = digits.slice(7, 13).join('');
  ctx.fillText(rightStr, rightGroupX, startY + regularH + 5 * scale);
};

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 2v4h4v-4zM14 14h2v2h-2z"/></svg>), title: 'Custom Branded QR', desc: 'Generate QR codes using custom colors and high error correction.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9v6M10 9v6M13 9v6M17 9v6"/></svg>), title: 'ISBN Barcodes', desc: 'Generate high-resolution EAN-13 barcodes for book distribution.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4"/></svg>), title: 'Logo Overlays', desc: 'Upload your brand logo to center on QR codes, with background masking.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>), title: '100% Client-Side', desc: 'All generations run entirely inside your browser sandbox. Privacy guaranteed.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" /><path d="M6 6h10M6 10h10" /><path d="M9 16l2 2 4-4" /></svg>), title: 'ISBN Auto-Check', desc: 'Validates book checksums and auto-fixes the check digit on input.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>), title: 'High-Res Export', desc: 'Download clean PNG structures ready for commercial book covers and flyers.' }
];

const _STEPS = [
  { n: '1', title: 'Choose Mode', desc: 'Select between QR Code mode or Book ISBN Barcode mode.' },
  { n: '2', title: 'Enter Value', desc: 'Input your web URL or your 13-digit ISBN book identifier.' },
  { n: '3', title: 'Export PNG', desc: 'Preview the generated asset, check scanning, and download locally.' }
];

const _FAQS = [
  {
    q: "What is the difference between EAN-13 and ISBN barcode generation?",
    a: "EAN-13 is a retail barcode standard. ISBN-13 is a specialized subset of EAN-13 used globally for book numbering. Our barcode generator handles both formats seamlessly."
  },
  {
    q: "How does the checksum validation for ISBN work?",
    a: "The generator validates the 13th check-digit using the standard ISBN modulus algorithm. If you enter 12 digits, it automatically calculates and appends the correct 13th digit."
  },
  {
    q: "Can I customize the color and style of the QR Codes?",
    a: "Yes. You can change the foreground color, background color, and choose custom dot patterns or square block eye styles for the QR Code."
  },
  {
    q: "Can I upload a custom logo image inside my QR Code?",
    a: "Yes. You can upload a PNG logo (e.g. your logo) to place in the center of the QR Code, with options to adjust the logo scale and background padding."
  },
  {
    q: "Does the barcode generator require internet connectivity?",
    a: "No. All barcode and QR Code generation is done locally in browser memory using JavaScript libraries. No code data or identifiers are sent to external servers."
  },
  {
    q: "What file formats can I download my barcode or QR Code in?",
    a: "You can export and save your generated codes as high-resolution PNG files, ensuring they scan reliably on screens or printed materials."
  }
];

export default function QrGeneratorPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState('qr'); // 'qr' | 'isbn'
  const [text, setText] = useState('https://imagepine.com');
  const [isbn, setIsbn] = useState('978-3-16-148410-0');
  
  const [darkColor, setDarkColor] = useState('#111128');
  const [lightColor, setLightColor] = useState('#FFFFFF');
  const [logoFile, setLogoFile] = useState(null);
  const [logoScale, setLogoScale] = useState(20); // percent (10-30)
  const [logoPadding, setLogoPadding] = useState(6); // px padding around logo
  
  const [exportFormat, setExportFormat] = useState('png'); // 'png' | 'jpg'
  const [exportSize, setExportSize] = useState(1000); // 400 | 800 | 1600 | 3200
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isbnInfo, setIsbnInfo] = useState('');
  
  const canvasRef = useRef(null);

  const handleLogoSelect = (files) => {
    if (files.length > 0) {
      setLogoFile(files[0]);
    } else {
      setLogoFile(null);
    }
  };

  const drawQrCode = (targetCanvas, targetWidth, isTransparent) => {
    return new Promise((resolve, reject) => {
      if (!targetCanvas) return reject('No canvas');
      const qrLightColor = isTransparent ? '#00000000' : lightColor;
      
      QRCode.toCanvas(targetCanvas, text || ' ', {
        width: targetWidth,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: darkColor,
          light: qrLightColor
        }
      }, (err) => {
        if (err) {
          setErrorMsg(t('Failed to generate QR Code. Adjust your text length.'));
          return reject(err);
        }

        if (logoFile) {
          const ctx = targetCanvas.getContext('2d');
          if (!ctx) return resolve();

          const img = new Image();
          img.onload = () => {
            const qrSize = targetCanvas.width;
            const maxLogoSize = qrSize * (logoScale / 100);
            
            let logoW = img.naturalWidth || img.width;
            let logoH = img.naturalHeight || img.height;
            if (logoW > logoH) {
              logoH = (logoH / logoW) * maxLogoSize;
              logoW = maxLogoSize;
            } else {
              logoW = (logoW / logoH) * maxLogoSize;
              logoH = maxLogoSize;
            }

            const x = (qrSize - logoW) / 2;
            const y = (qrSize - logoH) / 2;

            ctx.fillStyle = lightColor === 'transparent' || lightColor === '#00000000' ? '#FFFFFF' : lightColor;
            const scaledPadding = logoPadding * (targetWidth / 400);
            ctx.fillRect(
              x - scaledPadding, 
              y - scaledPadding, 
              logoW + scaledPadding * 2, 
              logoH + scaledPadding * 2
            );

            ctx.drawImage(img, x, y, logoW, logoH);
            resolve();
          };
          img.onerror = () => {
            reject('Failed to load logo image');
          };
          img.src = logoFile.preview || URL.createObjectURL(logoFile);
        } else {
          resolve();
        }
      });
    });
  };

  const drawIsbnBarcode = (targetCanvas, targetWidth, isTransparent) => {
    return new Promise((resolve) => {
      const cleanDigits = isbn.replace(/\D/g, '');
      setIsbnInfo('');
      
      if (cleanDigits.length < 12) {
        setErrorMsg(t('Please enter at least 12 digits for the ISBN.'));
        const ctx = targetCanvas.getContext('2d');
        ctx.clearRect(0, 0, targetCanvas.width || 400, targetCanvas.height || 260);
        if (!isTransparent) {
          ctx.fillStyle = lightColor;
          ctx.fillRect(0, 0, targetCanvas.width || 400, targetCanvas.height || 260);
        }
        return resolve();
      }

      const digitsArr = cleanDigits.slice(0, 12).split('').map(Number);
      const correctCheckDigit = calculateEan13CheckDigit(digitsArr);
      const finalDigits = [...digitsArr, correctCheckDigit];
      
      if (targetCanvas === canvasRef.current) {
        if (cleanDigits.length === 12) {
          setIsbnInfo(`${t('Auto-computed check digit')}: ${correctCheckDigit} (ISBN-13: ${digitsArr.join('')}${correctCheckDigit})`);
        } else if (cleanDigits.length >= 13) {
          const userCheckDigit = parseInt(cleanDigits[12], 10);
          if (userCheckDigit === correctCheckDigit) {
            setIsbnInfo(`✓ ${t('Valid ISBN-13 checksum')}`);
          } else {
            setIsbnInfo(`⚠ ${t('Last digit should be')} ${correctCheckDigit} (${t('auto-fixed on barcode')})`);
          }
        }
      }

      const barLightColor = isTransparent ? '#00000000' : lightColor;
      drawEan13BarcodeOnCanvas(targetCanvas, finalDigits, darkColor, barLightColor, targetWidth);
      resolve();
    });
  };

  const drawOutput = () => {
    setErrorMsg('');
    const isTransparent = exportFormat === 'png';
    if (mode === 'qr') {
      drawQrCode(canvasRef.current, 400, isTransparent).catch((err) => {
        console.error(err);
      });
    } else {
      drawIsbnBarcode(canvasRef.current, 400, isTransparent);
    }
  };

  useEffect(() => {
    drawOutput();
  }, [mode, text, darkColor, lightColor, logoFile, logoScale, logoPadding, isbn, exportFormat]);

  const downloadQrCode = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const tempCanvas = document.createElement('canvas');
      const isTransparent = exportFormat === 'png';
      
      if (mode === 'qr') {
        await drawQrCode(tempCanvas, exportSize, isTransparent);
      } else {
        await drawIsbnBarcode(tempCanvas, exportSize, isTransparent);
      }
      
      const fileExtension = exportFormat;
      const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      const fileName = mode === 'qr' 
        ? `qr_code_${exportSize}px.${fileExtension}` 
        : `isbn_barcode_${exportSize}px.${fileExtension}`;
        
      tempCanvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, fileName);
          saveHistory(mode === 'qr' ? 'QR Code' : 'ISBN Barcode', fileName);
        } else {
          setErrorMsg(t('Error generating download.'));
        }
        setIsProcessing(false);
      }, mimeType, exportFormat === 'jpg' ? 0.95 : undefined);
    } catch (err) {
      console.error(err);
      setErrorMsg(t('Failed to generate export file.'));
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
      title="QR & ISBN Generator"
      subtitle="Generate customized branding QR codes or standard EAN-13 book barcodes locally in your browser."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free client-side QR & ISBN Generator. Customize background colors, validate ISBN-13 check digit calculations, and export high-resolution code PNGs locally."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">
        
        {/* Left Column: Settings Panel */}
        <div className="col-span-1 lg:col-span-5" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: '1px solid #F1F1F7', paddingBottom: 10, margin: 0 }}>
            Generator Settings
          </h3>

          {/* Mode Switcher */}
          <div>
            <span style={sidebarLabel}>Tool Mode</span>
            <div style={{ display: 'flex', background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 10, padding: 3 }}>
              <button
                type="button"
                onClick={() => setMode('qr')}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: mode === 'qr' ? '#fff' : 'transparent', color: mode === 'qr' ? '#5B5BD6' : '#9898B5',
                  boxShadow: mode === 'qr' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s'
                }}
              >
                QR Code
              </button>
              <button
                type="button"
                onClick={() => setMode('isbn')}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: mode === 'isbn' ? '#fff' : 'transparent', color: mode === 'isbn' ? '#5B5BD6' : '#9898B5',
                  boxShadow: mode === 'isbn' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s'
                }}
              >
                ISBN Barcode
              </button>
            </div>
          </div>

          {/* Conditional inputs */}
          {mode === 'qr' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Text/URL Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={sidebarLabel}>QR Code Value (URL or Text)</label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 9, fontSize: 13, fontWeight: 700, color: '#111128', outline: 'none' }}
                  placeholder="https://example.com"
                />
              </div>

              {/* Logo upload block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: '1px solid #F1F1F7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={sidebarLabel}>Logo Overlay (Optional)</label>
                  {logoFile && (
                    <button
                      type="button"
                      onClick={() => setLogoFile(null)}
                      style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}
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
                  <div style={{ padding: 10, background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {logoFile.preview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoFile.preview}
                        alt="Logo preview"
                        style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 6, border: '1px solid #E4E4EF', background: 'white' }}
                      />
                    )}
                    <div style={{ minWidth: 0, flexGrow: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#111128', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{logoFile.name}</p>
                      <p style={{ fontSize: 9, color: '#9898B5', margin: '2px 0 0' }}>Ready to overlay</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Logo sizing sliders */}
              {logoFile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid #F1F1F7' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={sidebarLabel}>Logo Scale</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{logoScale}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="30"
                      value={logoScale}
                      onChange={(e) => setLogoScale(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={sidebarLabel}>Logo Padding</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6' }}>{logoPadding}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={logoPadding}
                      onChange={(e) => setLogoPadding(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ISBN input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={sidebarLabel}>Book ISBN-13 Number</label>
                <input
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 9, fontSize: 13, fontWeight: 700, color: '#111128', outline: 'none' }}
                  placeholder="978-3-16-148410-0"
                />
                {isbnInfo && (
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: isbnInfo.includes('✓') ? '#16A34A' : '#D97706', margin: '4px 0 0' }}>
                    {isbnInfo}
                  </p>
                )}
                <p style={{ fontSize: 10, color: '#9898B5', lineHeight: 1.45, margin: '6px 0 0' }}>
                  Enter a 12 or 13 digit book ISBN (starts with 978 or 979). Alternating weights are validated locally to check checksum parity.
                </p>
              </div>
            </div>
          )}

          {/* Color pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 10, borderTop: '1px solid #F1F1F7' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={sidebarLabel}>Foreground Color</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  style={{ border: 'none', background: 'none', width: 34, height: 34, cursor: 'pointer', padding: 0 }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{darkColor.toUpperCase()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={sidebarLabel}>Background Color</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  style={{ border: 'none', background: 'none', width: 34, height: 34, cursor: 'pointer', padding: 0 }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{lightColor.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <p style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', margin: 0 }}>
              {errorMsg}
            </p>
          )}
        </div>

        {/* Right Column: Live Preview Panel */}
        <div className="col-span-1 lg:col-span-7" style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            Live Code Preview
          </h4>

          <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 20, minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
            <canvas
              ref={canvasRef}
              style={{ 
                maxHeight: 280, 
                maxWidth: "100%", 
                objectFit: "contain", 
                borderRadius: 8, 
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)", 
                display: "block" 
              }}
            />
          </div>

          {/* Export Options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 16, borderBottom: '1px solid #F1F1F7', marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={sidebarLabel}>{t('Export Format')}</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 9, fontSize: 12, fontWeight: 700, color: '#111128', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="png">{t('Transparent PNG')}</option>
                <option value="jpg">{t('JPG (Solid Background)')}</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={sidebarLabel}>{t('Export Size (Width)')}</label>
              <select
                value={exportSize}
                onChange={(e) => setExportSize(parseInt(e.target.value))}
                style={{
                  width: '100%', padding: '9px 12px', background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 9, fontSize: 12, fontWeight: 700, color: '#111128', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="400">400 px ({t('Original')})</option>
                <option value="800">800 px ({t('Medium')})</option>
                <option value="1600">1600 px ({t('Print / High-Res')})</option>
                <option value="3200">3200 px ({t('Ultra-Res')})</option>
              </select>
            </div>
          </div>

          <div style={{ paddingTop: 10 }}>
            <button
              type="button"
              disabled={isProcessing}
              onClick={downloadQrCode}
              style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s", opacity: isProcessing ? 0.7 : 1 }}
            >
              {isProcessing ? (
                <span>{t('Processing...')}</span>
              ) : (
                <>
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{t('Download Code')} {exportFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </ToolPageShell>
  );
}
