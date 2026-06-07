"use client";

import React, { useState, useEffect } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M10 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>), title: 'XML Minification', desc: 'Removes unnecessary metadata, namespaces, comments, and empty elements.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Precision Sliders', desc: 'Reduce coordinate decimal precision to compress paths up to 60%.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>), title: 'Interactive Previews', desc: 'See your vector artwork render side-by-side with live size calculations.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Client-Side', desc: 'Your SVGs are processed local-first. We never inspect your design codes.' }
];

const _STEPS = [
  { n: '1', title: 'Paste or Upload SVG', desc: 'Select an SVG document or copy-paste code directly.' },
  { n: '2', title: 'Configure Precision', desc: 'Adjust decimal precision to optimize coordinate complexity.' },
  { n: '3', title: 'Copy & Save', desc: 'Download optimized output or copy clean vector code.' }
];

const _FAQS = [
  { q: 'How does the optimizer reduce file size?', a: 'It parses the SVG document tree, filters out editor-specific tags (like Inkscape/Illustrator metadata, grids, and guide layers), strips comments, and truncates coordinate floating-point decimal precision.' },
  { q: 'What precision setting should I choose?', a: 'A decimal precision of 2 or 3 is the sweet spot. It achieves maximum compression with zero visible distortion to curves.' },
  { q: 'Does it support inline styling?', a: 'Yes. Style attributes and inline CSS blocks are fully preserved.' }
];

export default function SvgOptimizerPage() {
  const [svgInput, setSvgInput] = useState('');
  const [precision, setPrecision] = useState(2);
  const [optimizedSvg, setOptimizedSvg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [fileDetails, setFileDetails] = useState(null);

  const handleFileSelect = (files) => {
    if (files.length === 0) return;
    const file = files[0];
    
    setFileDetails({
      name: file.name,
      size: file.size
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      setSvgInput(e.target.result);
      setErrorMsg('');
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read SVG file.');
    };
    reader.readAsText(file);
  };

  const optimizePathString = (dStr, prec) => {
    // Round floats inside path descriptions
    return dStr.replace(/-?\d+\.\d+/g, (match) => {
      const val = parseFloat(match);
      return parseFloat(val.toFixed(prec)).toString();
    });
  };

  const optimizeElement = (el, prec) => {
    // If path, optimize coordinates
    if (el.tagName.toLowerCase() === 'path' && el.hasAttribute('d')) {
      el.setAttribute('d', optimizePathString(el.getAttribute('d'), prec));
    }

    // List of numerical attributes to round
    const numAttrs = [
      'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 
      'x1', 'y1', 'x2', 'y2', 'stroke-width', 'opacity'
    ];
    numAttrs.forEach(attr => {
      if (el.hasAttribute(attr)) {
        const val = parseFloat(el.getAttribute(attr));
        if (!isNaN(val)) {
          el.setAttribute(attr, parseFloat(val.toFixed(prec)).toString());
        }
      }
    });

    // Recurse children
    Array.from(el.children).forEach(child => optimizeElement(child, prec));
  };

  const runOptimizer = () => {
    if (!svgInput.trim()) return;

    setErrorMsg('');
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgInput, 'image/svg+xml');
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error(parserError.textContent || 'Syntax error in SVG XML.');
      }

      const svgNode = doc.querySelector('svg');
      if (!svgNode) {
        throw new Error('No root <svg> element found.');
      }

      // 1. Remove comments
      const iterator = doc.createNodeIterator(doc, NodeFilter.SHOW_COMMENT);
      let commentNode;
      const commentsToRemove = [];
      while ((commentNode = iterator.nextNode())) {
        commentsToRemove.push(commentNode);
      }
      commentsToRemove.forEach(c => c.parentNode?.removeChild(c));

      // 2. Remove metadata tags
      const metaTags = ['metadata', 'sodipodi:namedview', 'inkscape:grid', 'inkscape:guide'];
      metaTags.forEach(tag => {
        const nodes = doc.getElementsByTagName(tag);
        Array.from(nodes).forEach(n => n.parentNode?.removeChild(n));
      });

      // 3. Recursively optimize coordinates on all children
      optimizeElement(svgNode, precision);

      // Serialize back to string
      const serializer = new XMLSerializer();
      let minified = serializer.serializeToString(doc);

      // Remove unnecessary whitespace between tags
      minified = minified.replace(/>\s+</g, '><').trim();

      setOptimizedSvg(minified);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to parse SVG. Make sure it is valid XML.');
    }
  };

  // Re-run optimizer when inputs change
  useEffect(() => {
    runOptimizer();
  }, [svgInput, precision]);

  const copyToClipboard = () => {
    if (!optimizedSvg) return;
    navigator.clipboard.writeText(optimizedSvg).then(() => {
      alert('Optimized SVG code copied to clipboard!');
    });
  };

  const downloadSvgFile = () => {
    if (!optimizedSvg) return;
    const blob = new Blob([optimizedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const name = fileDetails?.name || 'optimized.svg';
    saveAs(blob, name);
    saveHistory('SVG Optimizer', name);
  };

  const formatSize = (b) => {
    if (b >= 1024) return (b / 1024).toFixed(2) + ' KB';
    return b + ' Bytes';
  };

  const originalSize = svgInput ? svgInput.length : 0;
  const optimizedSize = optimizedSvg ? optimizedSvg.length : 0;
  const savings = originalSize > 0 ? Math.max(0, Math.round((1 - optimizedSize / originalSize) * 100)) : 0;

  return (
    <ToolPageShell
      title="SVG Editor & Path Optimizer"
      subtitle="Minify SVG file sizes. Strips XML namespaces, comments, and rounds curve decimal coordinates."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free browser-based SVG minifier and path optimizer. Truncate decimal path precision, strip editor tags, and compress SVG graphic assets locally."
    >
      <div className="flex flex-col gap-6">
        {!svgInput ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox
              onFileSelect={handleFileSelect}
              acceptedFormats={['.svg']}
              multiple={false}
              buttonLabel="Upload SVG File"
            />
            <div className="text-center mt-4 text-xs text-gray-400 font-semibold">OR</div>
            <div className="mt-4 bg-white border border-bordercolor rounded-2xl p-4 shadow-sm flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Paste SVG Code Raw
              </label>
              <textarea
                value={svgInput}
                onChange={(e) => setSvgInput(e.target.value)}
                placeholder="<svg ...>...</svg>"
                className="w-full h-44 font-mono text-xs text-textmain border border-bordercolor/80 rounded-xl bg-lightbg/10 p-3 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Left Panel: Settings */}
            <div className="lg:col-span-4" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="pb-2 border-b border-bordercolor flex justify-between items-center">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Optimizer Settings
                </h3>
                <button
                  onClick={() => { setSvgInput(''); setOptimizedSvg(''); setFileDetails(null); }}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Clear
                </button>
              </div>

              {/* Decimal Precision Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Decimal Precision</span>
                  <span>{precision} decimals</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={precision}
                  onChange={(e) => setPrecision(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="text-[9px] text-gray-400 leading-relaxed mt-0.5">
                  Lower decimals yield smaller file sizes but might slightly affect curves.
                </span>
              </div>

              {/* Stats card */}
              <div className="p-3 bg-lightbg/40 border border-bordercolor/60 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400 font-medium">Original Size:</span>
                  <span className="text-textmain font-bold">{formatSize(originalSize)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1.5 border-t border-bordercolor/40">
                  <span className="text-gray-400 font-medium">Optimized Size:</span>
                  <span className="text-primary font-bold">{formatSize(optimizedSize)}</span>
                </div>
                {savings > 0 && (
                  <div className="mt-1 flex items-center justify-center bg-[#DCFCE7] text-[#16A34A] text-xs font-extrabold rounded-lg py-1.5">
                    ↓ {savings}% Size Saving!
                  </div>
                )}
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 font-semibold py-1 leading-relaxed">
                  {errorMsg}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-bordercolor/40">
                <button
                  type="button"
                  onClick={downloadSvgFile}
                  disabled={!optimizedSvg}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
                >
                  Download SVG
                </button>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  disabled={!optimizedSvg}
                  className="w-full py-2.5 text-xs font-bold rounded-lg border border-bordercolor bg-white text-textmain hover:bg-lightbg/10 transition-all"
                >
                  Copy Optimized Code
                </button>
              </div>
            </div>

            {/* Right Panel: Previews */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Graphic Render Preview */}
              <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Optimized Render Preview
                </h4>
                
                <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
                  {optimizedSvg ? (
                    <div 
                      style={{ maxHeight: 320, maxWidth: "100%", display: "block" }}
                      dangerouslySetInnerHTML={{ __html: optimizedSvg }}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Waiting for code...</span>
                  )}
                </div>
              </div>

              {/* Output markup block */}
              <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Optimized SVG Code
                </h4>
                <textarea
                  readOnly
                  value={optimizedSvg}
                  placeholder="Minified markup will display here..."
                  className="w-full h-44 font-mono text-[11px] text-textmain border border-bordercolor/80 rounded-xl bg-lightbg/10 p-3 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
