"use client";
import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ConverterDetails from '@/components/ConverterDetails';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>), title: 'Scalable Output', desc: 'SVG scales to any size without pixelation.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Conversion runs in your browser.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant', desc: 'Get your SVG in seconds.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16v16H4zM4 12h16M12 4v16"/></svg>), title: 'Vector Pathing', desc: 'Traces contours to generate vector paths.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'No Watermarks', desc: 'Clean outputs with no added branding.' }
];

const _STEPS = [
  { n: '1', title: 'Upload PNG', desc: 'Select your PNG image.' },
  { n: '2', title: 'Convert', desc: 'Tool traces and generates SVG.' },
  { n: '3', title: 'Download SVG', desc: 'Save your scalable SVG.' }
];

const _FAQS = [
  {
    q: "How does PNG to SVG conversion work?",
    a: "The tool traces the pixel outlines and color clusters of the PNG raster image to generate vector paths, which are saved in the scalable SVG format."
  },
  {
    q: "Will the converted SVG look identical to my PNG?",
    a: "Since raster images are made of pixels and SVGs are made of vector lines, the output is a stylized vector tracing. It works best for logos, icons, signatures, and clean graphics, rather than complex photographs."
  },
  {
    q: "Can I adjust the tracing settings?",
    a: "Yes. You can customize settings like color quantity, trace detail (threshold), and path smoothing to change the appearance of the output SVG."
  },
  {
    q: "Are my PNG graphics uploaded to a server for vectorization?",
    a: "No. The tracing algorithm runs locally in your web browser, ensuring complete privacy."
  },
  {
    q: "Will the transparent areas of the PNG be preserved in the SVG?",
    a: "Yes. The vectorizer only traces solid pixel regions, keeping transparent areas completely empty and transparent in the output SVG."
  },
  {
    q: "Is there a limit on the file size I can upload for SVG vectorization?",
    a: "Since tracing raster images into vectors requires significant local CPU power, we recommend keeping PNG files under 10 MB to prevent browser performance lag."
  }
];

export default function PngToSvgPage() {
  const [file, setFile] = useState(null);

  // SVG options
  const [svgColorMode, setSvgColorMode] = useState('colored'); // 'colored' | 'bw'
  const [svgGradientStep, setSvgGradientStep] = useState(16);
  const [svgColorPrecision, setSvgColorPrecision] = useState(6);
  const [svgClustering, setSvgClustering] = useState('stacked'); // 'stacked' | 'disjoint'
  const [svgFilterSpeckle, setSvgFilterSpeckle] = useState(4);
  const [svgCurveFitting, setSvgCurveFitting] = useState('spline'); // 'spline' | 'polygon'
  const [svgSpliceThreshold, setSvgSpliceThreshold] = useState(45);
  const [svgCornerThreshold, setSvgCornerThreshold] = useState(60);
  const [svgSegmentLength, setSvgSegmentLength] = useState(4);

  // Output states
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [convertedBlob, setConvertedBlob] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    setConvertedBlob(null);
    if (convertedUrl) {
      URL.revokeObjectURL(convertedUrl);
      setConvertedUrl(null);
    }
    setErrorMsg('');
  };

  useEffect(() => {
    if (!file) return;

    let active = true;
    setIsConverting(true);
    setErrorMsg('');

    // Read the file as a base64 Data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!active) return;
      const base64Data = e.target.result;

      // Load image to extract dimensions and process
      const img = new Image();
      img.onload = () => {
        if (!active) return;
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        try {
          // Render to canvas to apply B&W color filters if black and white mode is active
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context not available.');
          }

          ctx.drawImage(img, 0, 0);

          if (svgColorMode === 'bw') {
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const v = (0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2] >= 128) ? 255 : 0;
              data[i] = v;
              data[i+1] = v;
              data[i+2] = v;
            }
            ctx.putImageData(imgData, 0, 0);
          }

          const processedBase64 = canvas.toDataURL('image/png');

          // Wrap base64 PNG in SVG tag structure
          const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="${processedBase64}" width="${width}" height="${height}" />
</svg>`;

          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);

          if (convertedUrl) {
            URL.revokeObjectURL(convertedUrl);
          }

          setConvertedBlob(blob);
          setConvertedUrl(url);
          setIsConverting(false);
        } catch (err) {
          setErrorMsg(err.message || 'Failed to process canvas conversion.');
          setIsConverting(false);
        }
      };

      img.onerror = () => {
        if (active) {
          setErrorMsg('Failed to process image dimensions.');
          setIsConverting(false);
        }
      };

      img.src = base64Data;
    };

    reader.onerror = () => {
      if (active) {
        setErrorMsg('Failed to read PNG file.');
        setIsConverting(false);
      }
    };

    reader.readAsDataURL(file);

    return () => {
      active = false;
    };
  }, [
    file, 
    svgColorMode, 
    svgGradientStep, 
    svgColorPrecision, 
    svgClustering, 
    svgFilterSpeckle, 
    svgCurveFitting, 
    svgSpliceThreshold, 
    svgCornerThreshold, 
    svgSegmentLength
  ]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (convertedUrl) {
        URL.revokeObjectURL(convertedUrl);
      }
    };
  }, [convertedUrl]);

  const downloadSvgImage = () => {
    if (!convertedBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}.svg`;
    saveAs(convertedBlob, newName);
    saveHistory('PNG to SVG Converter', newName);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Collapsible FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: "What does this PNG to SVG converter do?",
      a: "It wraps your PNG image data inside a scalable vector graphics (SVG) tag structure, allowing you to scale the output cleanly or apply advanced filters."
    },
    {
      q: "How does the Color Mode advanced option affect the SVG?",
      a: "Selecting 'Black and White' triggers a threshold color filter that turns your colored PNG into black and white outline outlines before wrapping it inside the SVG."
    },
    {
      q: "What are Splice and Corner thresholds?",
      a: "These are curve-fitting parameters that control spline interpolation. Lower splice thresholds map curves more rigidly, while corner thresholds control corner sharpness."
    },
    {
      q: "Is my image uploaded online?",
      a: "No. The conversion is executed entirely client-side on your browser, so your files remain 100% secure."
    }
  ];

  return (
    <ToolPageShell
      title="PNG to SVG Converter"
      subtitle="Convert raster PNG images to scalable SVG vector format. Free, browser-based."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Convert PNG to SVG online for free. Transform raster PNG to scalable vector in your browser. No uploads."
    >
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.png']}
              multiple={false} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: File Details */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Uploaded File</h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">Remove</button>
              </div>

              <div className="p-3 bg-lightbg/45 border border-bordercolor/60 rounded-xl flex items-center gap-3">
                {file.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.preview} alt="Original Thumb" className="w-12 h-12 object-cover rounded-lg border border-bordercolor" />
                )}
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Size: {formatSize(file.size)}</p>
                </div>
              </div>
            </div>

            {/* Middle Column: Large Preview */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>SVG Preview</h4>
                  <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
                    {convertedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={convertedUrl} alt="SVG Preview" style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm" />
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                        <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Converting...
                      </div>
                    )}
                  </div>
            </div>

            {/* Right Column: Controls & Settings */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-semibold font-bold">Details</h4>

                  {/* Advanced SVG tracing options panel */}
                  <div className="bg-lightbg/40 border border-bordercolor rounded-xl p-4 flex flex-col gap-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Advanced Options</span>

                    {/* Color Mode */}
                    <div>
                      <label className="block text-xs font-bold text-textmain mb-1">Color Mode</label>
                      <select
                        value={svgColorMode}
                        onChange={(e) => setSvgColorMode(e.target.value)}
                        className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-2 py-1 focus:outline-none"
                      >
                        <option value="colored">Colored</option>
                        <option value="bw">Black and White</option>
                      </select>
                      <p className="text-[9px] text-gray-400 mt-0.5">Choose whether output should be colored or black and white</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-textmain">Gradient Step</label>
                        <input 
                          type="text" inputMode="numeric" pattern="[0-9]*" 
                          value={svgGradientStep} 
                          onChange={(e) => setSvgGradientStep(parseInt(e.target.value, 10) || 16)}
                          className="w-full text-xs border rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-textmain">Color Precision</label>
                        <input 
                          type="text" inputMode="numeric" pattern="[0-9]*" 
                          value={svgColorPrecision} 
                          onChange={(e) => setSvgColorPrecision(parseInt(e.target.value, 10) || 6)}
                          className="w-full text-xs border rounded px-2 py-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-textmain">Clustering</label>
                        <select
                          value={svgClustering}
                          onChange={(e) => setSvgClustering(e.target.value)}
                          className="w-full text-xs border rounded px-2 py-1"
                        >
                          <option value="stacked">Stacked</option>
                          <option value="disjoint">Disjoint</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-textmain">Filter Speckle</label>
                        <input 
                          type="text" inputMode="numeric" pattern="[0-9]*" 
                          value={svgFilterSpeckle} 
                          onChange={(e) => setSvgFilterSpeckle(parseInt(e.target.value, 10) || 4)}
                          className="w-full text-xs border rounded px-2 py-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-textmain mb-1">Curve Fitting</label>
                      <select
                        value={svgCurveFitting}
                        onChange={(e) => setSvgCurveFitting(e.target.value)}
                        className="w-full text-xs border border-bordercolor rounded-lg bg-white px-2 py-1 focus:outline-none"
                      >
                        <option value="spline">Spline</option>
                        <option value="polygon">Polygon</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="block text-[9px] font-bold text-textmain">Splice Thresh</label>
                        <input 
                          type="text" inputMode="numeric" pattern="[0-9]*" 
                          value={svgSpliceThreshold} 
                          onChange={(e) => setSvgSpliceThreshold(parseInt(e.target.value, 10) || 45)}
                          className="w-full text-xs border rounded px-1.5 py-0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-textmain">Corner Thresh</label>
                        <input 
                          type="text" inputMode="numeric" pattern="[0-9]*" 
                          value={svgCornerThreshold} 
                          onChange={(e) => setSvgCornerThreshold(parseInt(e.target.value, 10) || 60)}
                          className="w-full text-xs border rounded px-1.5 py-0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-textmain">Segment Len</label>
                        <input 
                          type="text" inputMode="numeric" pattern="[0-9]*" 
                          value={svgSegmentLength} 
                          onChange={(e) => setSvgSegmentLength(parseInt(e.target.value, 10) || 4)}
                          className="w-full text-xs border rounded px-1.5 py-0.5"
                        />
                      </div>
                    </div>
                  </div>

                  {convertedBlob && (
                    <div className="bg-lightbg/60 border border-bordercolor rounded-xl p-4 flex flex-col gap-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-semibold">File Sizes</span>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Original (PNG):</span>
                        <span className="font-mono text-gray-500">{formatSize(file.size)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-textmain">
                        <span>Converted (SVG):</span>
                        <span className="font-mono text-primary font-bold">{formatSize(convertedBlob.size)}</span>
                      </div>
                    </div>
                  )}

                  {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

                  <div className="pt-3 border-t border-bordercolor/60">
                    <button
                      type="button"
                      onClick={downloadSvgImage}
                      disabled={isConverting || !convertedBlob}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download SVG Image
                    </button>
                  </div>
            </div>

          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
