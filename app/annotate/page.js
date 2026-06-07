"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>), title: 'Multiple Drawing Tools', desc: 'Annotate with solid Pen brushes, semi-transparent Highlighters, or shape tools.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>), title: 'Shape Overlays', desc: 'Draw clean geometric lines, rectangles, and circles onto your mockups.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>), title: 'Undo & Eraser', desc: 'Quickly correct mistakes with a dedicated eraser tool and multi-level Undo history.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: 'Local Merging', desc: 'Annotations merge directly with background image layers in high resolution.' }
];

const _STEPS = [
  { n: '1', title: 'Upload Screenshot', desc: 'Choose a mockup, screenshot, or graphic.' },
  { n: '2', title: 'Draw & Highlight', desc: 'Use pens, shapes, and custom colors to mark it up.' },
  { n: '3', title: 'Apply & Export', desc: 'Download the annotated image locally.' }
];

const _FAQS = [
  { q: 'Is there an undo limit?', a: 'You can undo up to 12 consecutive drawing strokes/actions.' },
  { q: 'How does the Highlighter tool work?', a: 'It applies semi-transparent colored overlays (40% opacity) that allow the background image text and details to remain visible underneath.' },
  { q: 'Can I erase specific parts of my drawings?', a: 'Yes. The Eraser tool removes only your custom annotations and leaves the original background image untouched.' }
];

const PRESET_COLORS = [
  { val: '#EF4444', name: 'Red' },
  { val: '#3B82F6', name: 'Blue' },
  { val: '#10B981', name: 'Green' },
  { val: '#F59E0B', name: 'Yellow' },
  { val: '#111128', name: 'Dark' },
  { val: '#FFFFFF', name: 'White' }
];

export default function AnnotatePage() {
  const [file, setFile] = useState(null);
  const [activeTool, setActiveTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle'
  const [color, setColor] = useState('#EF4444');
  const [brushSize, setBrushSize] = useState(6);
  const [undoStack, setUndoStack] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const bgCanvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Drawing state
  const isDrawing = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const savedState = useRef(null); // stores ImageData for previewing shapes

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
      setUndoStack([]);
    } else {
      setFile(null);
      setUndoStack([]);
      setImageSize({ width: 0, height: 0 });
    }
    setErrorMsg('');
  };

  // Draw background image once
  useEffect(() => {
    if (!file || !bgCanvasRef.current || !drawingCanvasRef.current) return;

    const bgCanvas = bgCanvasRef.current;
    const bgCtx = bgCanvas.getContext('2d');
    const drawCanvas = drawingCanvasRef.current;
    const drawCtx = drawCanvas.getContext('2d');
    if (!bgCtx || !drawCtx) return;

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setImageSize({ width: w, height: h });

      // Resize both canvases to match image natural dimensions
      bgCanvas.width = w;
      bgCanvas.height = h;
      drawCanvas.width = w;
      drawCanvas.height = h;

      // Draw background
      bgCtx.drawImage(img, 0, 0);

      // Clear drawing canvas
      drawCtx.clearRect(0, 0, w, h);

      // Save initial clean state
      saveCanvasState(drawCtx, w, h);
    };
    img.src = file.preview || URL.createObjectURL(file);
  }, [file]);

  const saveCanvasState = (ctx, w, h) => {
    const state = ctx.getImageData(0, 0, w, h);
    setUndoStack((prev) => {
      const next = [...prev, state];
      if (next.length > 12) next.shift(); // limit to 12 snapshots
      return next;
    });
  };

  const handleUndo = () => {
    if (undoStack.length <= 1 || !drawingCanvasRef.current) return;
    const drawCanvas = drawingCanvasRef.current;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;

    // Pop current state
    const nextStack = [...undoStack];
    nextStack.pop(); // discard current state
    
    // Retrieve previous state
    const prevState = nextStack[nextStack.length - 1];
    ctx.putImageData(prevState, 0, 0);
    setUndoStack(nextStack);
  };

  const clearAnnotations = () => {
    if (!drawingCanvasRef.current) return;
    const drawCanvas = drawingCanvasRef.current;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    // Push cleared state
    saveCanvasState(ctx, drawCanvas.width, drawCanvas.height);
  };

  // Coordinates translation helper
  const getCanvasCoords = (e) => {
    if (!drawingCanvasRef.current) return { x: 0, y: 0 };
    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  // Mouse / Touch Start
  const handleStart = (e) => {
    if (!file || !drawingCanvasRef.current) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    const { x, y } = getCanvasCoords(e);
    startX.current = x;
    startY.current = y;

    // Setup line parameters
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Tool styling setups
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = color;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
    }

    if (['pen', 'highlighter', 'eraser'].includes(activeTool)) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      // For shapes, snapshot current drawing state
      savedState.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  // Mouse / Touch Move
  const handleMove = (e) => {
    if (!isDrawing.current || !drawingCanvasRef.current) return;
    e.preventDefault(); // prevent touch scrolls

    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    if (['pen', 'highlighter', 'eraser'].includes(activeTool)) {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (savedState.current) {
      // Restore previous state to clear preview shape shadow
      ctx.putImageData(savedState.current, 0, 0);

      // Redraw temp shape
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = color;
      ctx.globalAlpha = activeTool === 'highlighter' ? 0.4 : 1.0;
      ctx.globalCompositeOperation = 'source-over';

      ctx.beginPath();
      if (activeTool === 'line') {
        ctx.moveTo(startX.current, startY.current);
        ctx.lineTo(x, y);
      } else if (activeTool === 'rect') {
        const w = x - startX.current;
        const h = y - startY.current;
        ctx.strokeRect(startX.current, startY.current, w, h);
      } else if (activeTool === 'circle') {
        const radius = Math.hypot(x - startX.current, y - startY.current);
        ctx.arc(startX.current, startY.current, radius, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
  };

  // Mouse / Touch End
  const handleEnd = () => {
    if (!isDrawing.current || !drawingCanvasRef.current) return;
    isDrawing.current = false;
    savedState.current = null;

    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      saveCanvasState(ctx, canvas.width, canvas.height);
    }
  };

  const downloadAnnotatedImage = () => {
    if (!file || !bgCanvasRef.current || !drawingCanvasRef.current) return;
    setIsProcessing(true);

    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawingCanvasRef.current;

    // Create an offscreen merge canvas
    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = bgCanvas.width;
    mergeCanvas.height = bgCanvas.height;
    const ctx = mergeCanvas.getContext('2d');
    if (!ctx) return;

    // Draw background image first
    ctx.drawImage(bgCanvas, 0, 0);
    // Draw annotations on top
    ctx.drawImage(drawCanvas, 0, 0);

    mergeCanvas.toBlob((blob) => {
      if (blob) {
        const ext = file.name.split('.').pop();
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}_annotated.${ext}`;
        saveAs(blob, newName);
        saveHistory('Drawing Markup', newName);
      } else {
        setErrorMsg('Error rendering output annotations.');
      }
      setIsProcessing(false);
    }, file.type || 'image/jpeg', 0.95);
  };

  return (
    <ToolPageShell
      title="Canvas Drawing & Annotation Markup"
      subtitle="Doodle, draw arrows, rectangles, highlight sections, or erase custom annotations. Client-side mockup markup studio."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free browser-based screen annotation and mockup markup tool. Draw lines, custom circles, highlighters, erase custom doodles locally in high definition."
    >
      <div className="flex flex-col gap-6">
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
              multiple={false} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Canvas Workspace */}
            <div className="lg:col-span-8 animate-fade-in" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center">
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Markup Workspace
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={undoStack.length <= 1}
                    className="p-1 px-3 rounded-lg border border-bordercolor text-[11px] font-bold bg-white text-textmain hover:bg-lightbg/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Undo
                  </button>
                  <button
                    onClick={clearAnnotations}
                    className="p-1 px-3 rounded-lg border border-bordercolor text-[11px] font-bold bg-white text-red-500 hover:bg-red-50 transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Stacked interactive canvas wrapper */}
              <div 
                style={{ 
                  border: "1.5px solid #E4E4EF", 
                  borderRadius: 14, 
                  padding: 8, 
                  minHeight: 380, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  position: "relative", 
                  overflow: "hidden", 
                  background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px"
                }}
              >
                <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {/* Background image canvas */}
                  <canvas
                    ref={bgCanvasRef}
                    style={{ 
                      maxHeight: 520, 
                      maxWidth: "100%", 
                      objectFit: "contain", 
                      borderRadius: 8,
                      display: 'block'
                    }}
                  />
                  {/* Interactive transparent overlay canvas */}
                  <canvas
                    ref={drawingCanvasRef}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    style={{ 
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      maxHeight: 520, 
                      maxWidth: "100%", 
                      objectFit: "contain", 
                      borderRadius: 8,
                      display: 'block',
                      cursor: activeTool === 'eraser' ? 'cell' : 'crosshair'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Toolkit controls */}
            <div className="lg:col-span-4" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Tool Settings
                </h4>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">
                  Remove File
                </button>
              </div>

              {/* Tool selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Markup Tool
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pen', label: 'Pen' },
                    { id: 'highlighter', label: 'Highlight' },
                    { id: 'eraser', label: 'Eraser' },
                    { id: 'line', label: 'Line' },
                    { id: 'rect', label: 'Rectangle' },
                    { id: 'circle', label: 'Circle' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTool(t.id)}
                      style={{
                        padding: '8px 4px',
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor: activeTool === t.id ? '#5B5BD6' : '#E4E4EF',
                        background: activeTool === t.id ? '#EDEDFB' : '#fff',
                        color: activeTool === t.id ? '#5B5BD6' : '#6B6B8A',
                        transition: 'all 0.15s'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector (hide for Eraser) */}
              {activeTool !== 'eraser' && (
                <div className="pt-2 border-t border-bordercolor/40">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Brush Color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.val}
                        type="button"
                        onClick={() => setColor(c.val)}
                        style={{
                          background: c.val,
                          height: 24,
                          borderRadius: 6,
                          border: '2px solid',
                          borderColor: color === c.val ? '#5B5BD6' : '#E4E4EF',
                          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)'
                        }}
                        title={c.name}
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Custom Color:</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-6 rounded cursor-pointer border border-bordercolor"
                    />
                  </div>
                </div>
              )}

              {/* Brush size slider */}
              <div className="pt-2 border-t border-bordercolor/40 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Brush Width
                  </label>
                  <span className="text-[10px] font-bold text-gray-500">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 font-semibold py-1 leading-relaxed">
                  {errorMsg}
                </p>
              )}

              {/* Download Action Button */}
              <div className="pt-3 border-t border-bordercolor/60">
                <button
                  type="button"
                  onClick={downloadAnnotatedImage}
                  disabled={isProcessing}
                  style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Annotated Image
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
