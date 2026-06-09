"use client";

import React, { useState, useEffect, useRef } from 'react';
import ToolPageShell from '@/components/ToolPageShell';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';

// Inline Before/After Slider component (similar to background remover)
function InlineSlider({ beforeSrc, afterSrc, beforeLabel, afterLabel }) {
  const [pos, setPos] = useState(50);
  const [containerW, setContainerW] = useState(0);
  const boxRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!boxRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
    });
    ro.observe(boxRef.current);
    setContainerW(boxRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const move = (clientX) => {
    if (!boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  };

  useEffect(() => {
    const onMove = (e) => { if (dragging.current) move(e.clientX); };
    const onTouch = (e) => { if (dragging.current) move(e.touches[0].clientX); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const imgW = containerW > 0 ? `${containerW}px` : '100%';

  return (
    <div
      ref={boxRef}
      onMouseDown={(e) => { dragging.current = true; move(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; move(e.touches[0].clientX); }}
      style={{
        position: 'relative', width: '100%', minHeight: 380,
        background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
        borderRadius: 12, overflow: 'hidden',
        cursor: 'col-resize', userSelect: 'none',
        border: '1px solid #E4E4EF',
      }}
    >
      <img src={beforeSrc} alt="Original" draggable={false}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain', pointerEvents: 'none',
        }}
      />
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: `${pos}%`, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <img src={afterSrc} alt="Processed" draggable={false}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: imgW,
            height: '100%',
            objectFit: 'contain',
            maxWidth: 'none',
          }}
        />
      </div>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${pos}%`,
        width: 2, background: '#fff',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
        transform: 'translateX(-50%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: `${pos}%`,
        transform: 'translate(-50%, -50%)',
        width: 40, height: 40, borderRadius: '50%',
        background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid rgba(91,91,214,0.25)', pointerEvents: 'none', zIndex: 10,
      }}>
        <svg width="16" height="16" fill="none" stroke="#5B5BD6" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24">
          <path d="M8 18l-5-5 5-5M16 6l5 5-5 5" />
        </svg>
      </div>
      <div style={{
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)',
        border: '1px solid rgba(91,91,214,0.2)', borderRadius: 7, padding: '3px 10px',
        fontSize: 10, fontWeight: 700, color: '#5B5BD6', pointerEvents: 'none',
      }}>
        {afterLabel}
      </div>
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)',
        border: '1px solid #E4E4EF', borderRadius: 7, padding: '3px 10px',
        fontSize: 10, fontWeight: 700, color: '#9898B5', pointerEvents: 'none',
      }}>
        {beforeLabel}
      </div>
    </div>
  );
}

// Custom model loader helper using cache API
const loadModelWithCache = async (onProgress) => {
  const modelUrl = 'https://huggingface.co/opencv/inpainting_lama/resolve/main/inpainting_lama_2025jan.onnx';
  const cacheName = 'imagepine-lama-cache';
  
  if (typeof window === 'undefined') return null;
  
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(modelUrl);
    
    if (cachedResponse) {
      onProgress('Reading cached model...', 100);
      const buffer = await cachedResponse.arrayBuffer();
      return buffer;
    }
    
    onProgress('Downloading AI model assets...', 0);
    const response = await fetch(modelUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length') || 95000000; // fallback approx 95MB
    let receivedLength = 0;
    let chunks = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;
      const pct = Math.round((receivedLength / contentLength) * 100);
      onProgress('Downloading AI model assets...', Math.min(99, pct));
    }
    
    onProgress('Saving model to local cache...', 99);
    
    let chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (let chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }
    
    try {
      const responseToCache = new Response(chunksAll, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': receivedLength.toString()
        }
      });
      await cache.put(modelUrl, responseToCache);
    } catch (cacheErr) {
      console.warn("Failed to write to cache:", cacheErr);
    }
    
    onProgress('Model loading completed.', 100);
    return chunksAll.buffer;
  } catch (err) {
    console.error("Error loading model:", err);
    throw err;
  }
};

export default function ObjectRemoverPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [processedUrl, setProcessedUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [outputFormat, setOutputFormat] = useState('png'); // 'png' | 'webp'
  const [toast, setToast] = useState(null);

  // Brush state
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: -1000, y: -1000 });
  const [showCursor, setShowCursor] = useState(false);

  // Canvas history for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Refs for drawing canvases
  const imageCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);

  // Dynamic import of onnxruntime-web
  const ortRef = useRef(null);

  useEffect(() => {
    import('onnxruntime-web').then((mod) => {
      ortRef.current = mod;
    }).catch(err => {
      console.error("Failed to load onnxruntime-web:", err);
    });
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Clean up and load file image
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setProcessedUrl('');
      
      const img = new Image();
      img.onload = () => {
        const imageCanvas = imageCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!imageCanvas || !maskCanvas) return;

        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        imageCanvas.width = w;
        imageCanvas.height = h;
        maskCanvas.width = w;
        maskCanvas.height = h;

        const ctx = imageCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.clearRect(0, 0, w, h);

        setHistory([]);
        setHistoryIndex(-1);
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  // Convert client viewport mouse coordinates back to canvas dimensions
  const getCanvasMousePos = (e) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support touch devices
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (isProcessing) return;
    const pos = getCanvasMousePos(e);
    setIsDrawing(true);
    setLastPos(pos);

    // Draw single dot at click position
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(239, 68, 68, 0.55)'; // semi-transparent red
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleMouseMove = (e) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    if (!isDrawing || isProcessing) return;
    
    const pos = getCanvasMousePos(e);
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastPos(pos);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveMaskState();
    }
  };

  const saveMaskState = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imgData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (isProcessing) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      ctx.putImageData(history[newIndex], 0, 0);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleRedo = () => {
    if (isProcessing) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      ctx.putImageData(history[newIndex], 0, 0);
    }
  };

  const handleClearMask = () => {
    if (isProcessing) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveMaskState();
  };

  const convertBlobToWebp = (blob) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((webpBlob) => {
          resolve(webpBlob || blob);
        }, 'image/webp', 0.92);
      };
      img.onerror = () => resolve(blob);
      img.src = URL.createObjectURL(blob);
    });
  };

  const handleRemoveObject = async () => {
    if (!file) return;
    if (!ortRef.current) {
      showToast("Model runtime library is loading. Please wait a moment.", "warning");
      return;
    }

    // Check if mask has drawing
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const maskDataCheck = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasMask = false;
    for (let i = 3; i < maskDataCheck.length; i += 4) {
      if (maskDataCheck[i] > 0) {
        hasMask = true;
        break;
      }
    }

    if (!hasMask) {
      showToast("Please paint over the object you want to remove first.", "warning");
      return;
    }

    setIsProcessing(true);
    setProgressMsg('Initializing local neural network...');
    setProgressPercent(5);

    try {
      // Configure onnxruntime WASM CDN path fallback
      ortRef.current.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';
      
      const modelBuffer = await loadModelWithCache((msg, pct) => {
        setProgressMsg(msg);
        setProgressPercent(pct);
      });

      setProgressMsg('Starting neural network session...');
      setProgressPercent(95);

      const session = await ortRef.current.InferenceSession.create(modelBuffer);

      setProgressMsg('Erasing object from image...');
      setProgressPercent(98);

      const w = imageCanvasRef.current.width;
      const h = imageCanvasRef.current.height;
      const imgSize = 512;

      // 1. Prepare image at 512x512
      const tempImgCanvas = document.createElement('canvas');
      tempImgCanvas.width = imgSize;
      tempImgCanvas.height = imgSize;
      const tempImgCtx = tempImgCanvas.getContext('2d');
      tempImgCtx.drawImage(imageCanvasRef.current, 0, 0, imgSize, imgSize);

      // 2. Prepare mask at 512x512
      const tempMaskCanvas = document.createElement('canvas');
      tempMaskCanvas.width = imgSize;
      tempMaskCanvas.height = imgSize;
      const tempMaskCtx = tempMaskCanvas.getContext('2d');
      tempMaskCtx.drawImage(maskCanvasRef.current, 0, 0, imgSize, imgSize);

      const imgData = tempImgCtx.getImageData(0, 0, imgSize, imgSize);
      const maskData = tempMaskCtx.getImageData(0, 0, imgSize, imgSize);

      const imageTensorData = new Float32Array(1 * 3 * imgSize * imgSize);
      const maskTensorData = new Float32Array(1 * 1 * imgSize * imgSize);

      for (let i = 0; i < imgSize * imgSize; i++) {
        imageTensorData[i] = imgData.data[i * 4] / 255.0; // R
        imageTensorData[i + imgSize * imgSize] = imgData.data[i * 4 + 1] / 255.0; // G
        imageTensorData[i + 2 * imgSize * imgSize] = imgData.data[i * 4 + 2] / 255.0; // B

        // Threshold mask
        const isDrawn = maskData.data[i * 4] > 0 && maskData.data[i * 4 + 3] > 0;
        maskTensorData[i] = isDrawn ? 1.0 : 0.0;
      }

      const imageTensor = new ortRef.current.Tensor('float32', imageTensorData, [1, 3, imgSize, imgSize]);
      const maskTensor = new ortRef.current.Tensor('float32', maskTensorData, [1, 1, imgSize, imgSize]);

      const feeds = {
        image: imageTensor,
        mask: maskTensor
      };

      const results = await session.run(feeds);
      const outputTensor = results[Object.keys(results)[0]];
      const outputData = outputTensor.data;

      // 3. Put result on 512x512 canvas
      const outCanvas = document.createElement('canvas');
      outCanvas.width = imgSize;
      outCanvas.height = imgSize;
      const outCtx = outCanvas.getContext('2d');
      const outImgData = outCtx.createImageData(imgSize, imgSize);

      for (let i = 0; i < imgSize * imgSize; i++) {
        const r = Math.max(0, Math.min(255, Math.round(outputData[i])));
        const g = Math.max(0, Math.min(255, Math.round(outputData[i + imgSize * imgSize])));
        const b = Math.max(0, Math.min(255, Math.round(outputData[i + 2 * imgSize * imgSize])));

        outImgData.data[i * 4] = r;
        outImgData.data[i * 4 + 1] = g;
        outImgData.data[i * 4 + 2] = b;
        outImgData.data[i * 4 + 3] = 255;
      }
      outCtx.putImageData(outImgData, 0, 0);

      // 4. Blend back into original resolution canvas (retaining unmasked parts fully)
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = w;
      finalCanvas.height = h;
      const finalCtx = finalCanvas.getContext('2d');

      // Draw original image
      finalCtx.drawImage(imageCanvasRef.current, 0, 0);

      // Create scaled inpainted canvas
      const inpaintedScaledCanvas = document.createElement('canvas');
      inpaintedScaledCanvas.width = w;
      inpaintedScaledCanvas.height = h;
      const inpaintedScaledCtx = inpaintedScaledCanvas.getContext('2d');
      inpaintedScaledCtx.drawImage(outCanvas, 0, 0, w, h);

      // Create masked inpainted canvas
      const maskedInpaintedCanvas = document.createElement('canvas');
      maskedInpaintedCanvas.width = w;
      maskedInpaintedCanvas.height = h;
      const maskedInpaintedCtx = maskedInpaintedCanvas.getContext('2d');

      // Draw scaled inpainting onto masked canvas
      maskedInpaintedCtx.drawImage(inpaintedScaledCanvas, 0, 0);
      // Set destination-in to crop to original mask
      maskedInpaintedCtx.globalCompositeOperation = 'destination-in';
      maskedInpaintedCtx.drawImage(maskCanvasRef.current, 0, 0);

      // Draw masked inpainting on top of original image
      finalCtx.drawImage(maskedInpaintedCanvas, 0, 0);

      finalCanvas.toBlob(async (blob) => {
        let finalBlob = blob;
        if (outputFormat === 'webp') {
          finalBlob = await convertBlobToWebp(blob);
        }
        const url = URL.createObjectURL(finalBlob);
        setProcessedUrl(url);
        showToast("Object removed successfully!", "success");
        setIsProcessing(false);
      }, 'image/png');

    } catch (err) {
      console.error(err);
      showToast(`Error: ${err.message || 'Object removal failed.'}`, "error");
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedUrl || !file) return;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const ext = outputFormat === 'webp' ? 'webp' : 'png';
    saveAs(processedUrl, `${nameWithoutExt}_erased.${ext}`);
    saveHistory('Object Remover', `${file.name} (Object Erased)`);
  };

  const _FEATURES = [
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: '100% Secure & Private',
      desc: 'Runs entirely in your web browser. Your images never leave your computer, keeping your photos completely private.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      title: 'ONNX WebAssembly',
      desc: 'Powered by highly optimized LaMa inpainting neural networks executed client-side for rapid on-device inference.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      title: 'Lossless Blending',
      desc: 'Blends only the erased area back into the original photo, preserving 100% of the image resolution elsewhere.'
    }
  ];

  const _STEPS = [
    { n: '1', title: 'Load Image', desc: 'Select or drop a JPEG, PNG, or WebP photo to modify.' },
    { n: '2', title: 'Paint Mask', desc: 'Paint over the objects, text, or blemishes you want to remove using the brush.' },
    { n: '3', title: 'Erase & Export', desc: 'Click Erase Object and download your cleaned image in PNG or WebP format.' }
  ];

  const _FAQS = [
    { q: 'Is my data secure?', a: 'Yes. All inpainting computations run entirely locally inside your browser cache. No image files are ever uploaded or processed on external servers.' },
    { q: 'Why does the first run take longer?', a: 'On the very first run, the browser downloads the quantized LaMa model weights (approx. 95MB). Once downloaded, they are cached in your browser for near-instant subsequent runs.' },
    { q: 'What can this tool remove?', a: 'This tool is ideal for erasing unwanted people, watermarks, text, stamps, spots, power lines, or blemishes from photos.' }
  ];

  const cardStyle = {
    background: '#fff',
    border: '1px solid #E4E4EF',
    borderRadius: 20,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    height: 'fit-content'
  };

  return (
    <ToolPageShell
      title="Object Remover"
      subtitle="Erase unwanted objects, people, text, or watermarks from photos instantly. Powered by client-side AI, runs 100% privately on your device."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free online client-side AI Object Remover. Erase unwanted objects, text, people, watermarks, or blemishes from your photos instantly. 100% private locally on your computer."
    >
      {!file ? (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={handleFileSelect}
            acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
            multiple={false}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">
          {/* Left: Large Image/Drawing Canvas */}
          <div className="lg:col-span-8" style={{ ...cardStyle, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E4E4EF' }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111128', margin: 0 }}>{file.name}</h3>
                <p style={{ fontSize: 10, color: '#9898B5', margin: '2px 0 0', fontWeight: 600 }}>
                  {processedUrl ? 'Objects erased!' : 'Paint over objects to erase them'}
                </p>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => { setFile(null); setProcessedUrl(''); }}
                style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: '#FDF2F2', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
              >
                Change Image
              </button>
            </div>

            <div style={{
              minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
              position: 'relative'
            }}>
              {processedUrl ? (
                <InlineSlider
                  beforeSrc={previewUrl}
                  afterSrc={processedUrl}
                  beforeLabel="Original"
                  afterLabel="Object Erased"
                />
              ) : (
                <div 
                  style={{ position: 'relative', width: 'fit-content', maxHeight: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={() => setShowCursor(true)}
                  onMouseLeave={() => setShowCursor(false)}
                >
                  <canvas 
                    ref={imageCanvasRef} 
                    style={{ 
                      maxHeight: 520, 
                      maxWidth: '100%', 
                      objectFit: 'contain', 
                      borderRadius: 10, 
                      boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                      display: 'block' 
                    }} 
                  />
                  <canvas
                    ref={maskCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'none',
                      borderRadius: 10,
                      touchAction: 'none'
                    }}
                  />
                  {showCursor && (
                    <div style={{
                      position: 'absolute',
                      left: cursorPos.x,
                      top: cursorPos.y,
                      width: brushSize * (maskCanvasRef.current ? maskCanvasRef.current.offsetWidth / maskCanvasRef.current.width : 1),
                      height: brushSize * (maskCanvasRef.current ? maskCanvasRef.current.offsetHeight / maskCanvasRef.current.height : 1),
                      border: '1px dashed rgba(239, 68, 68, 0.9)',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.7)',
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 100,
                      background: 'rgba(239, 68, 68, 0.25)'
                    }} />
                  )}
                </div>
              )}
            </div>

            {isProcessing && (
              <div style={{ padding: '20px', borderTop: '1px solid #E4E4EF', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>
                  <span>{progressMsg}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#F1F1F7', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #7342E6 0%, #5B5BD6 100%)', borderRadius: 99, transition: 'width 0.2s ease-out' }} />
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls Panel */}
          <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Editor Brush Controls Card (Only show if not processed) */}
            {!processedUrl && (
              <div style={cardStyle}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 16px' }}>Brush Controls</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>Brush Size: {brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      cursor: 'pointer',
                      accentColor: '#5B5BD6'
                    }}
                  />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                    <button
                      type="button"
                      disabled={isProcessing || historyIndex < 0}
                      onClick={handleUndo}
                      style={{
                        padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: '1px solid #E4E4EF', cursor: 'pointer',
                        background: '#fff', color: historyIndex < 0 ? '#C4C4D4' : '#5B5BD6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s'
                      }}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                        <path d="M9 14L4 9l5-5M4 9h10a4 4 0 014 4v5" />
                      </svg>
                      Undo
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing || historyIndex >= history.length - 1}
                      onClick={handleRedo}
                      style={{
                        padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: '1px solid #E4E4EF', cursor: 'pointer',
                        background: '#fff', color: historyIndex >= history.length - 1 ? '#C4C4D4' : '#5B5BD6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s'
                      }}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                        <path d="M15 14l5-5-5-5M20 9H10a4 4 0 00-4 4v5" />
                      </svg>
                      Redo
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleClearMask}
                    style={{
                      width: '100%', padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: '1px solid #FCA5A5', cursor: 'pointer',
                      background: '#FFF5F5', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4, transition: 'all 0.15s'
                    }}
                  >
                    Clear Mask
                  </button>
                </div>
              </div>
            )}

            {/* Format Selection Card */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>Output Format</h3>
              <div style={{ display: 'flex', background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 9, padding: 3 }}>
                {[
                  { value: 'png', label: 'PNG (Lossless)' },
                  { value: 'webp', label: 'WebP (Lossy)' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutputFormat(opt.value)}
                    style={{
                      flex: 1, padding: '6px 2px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: outputFormat === opt.value ? '#fff' : 'transparent',
                      color: outputFormat === opt.value ? '#5B5BD6' : '#9898B5',
                      boxShadow: outputFormat === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Card */}
            <div style={cardStyle}>
              {!processedUrl ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleRemoveObject}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #7342E6 0%, #5B5BD6 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13,
                    borderRadius: 12,
                    padding: '13px',
                    border: 'none',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(115,66,230,0.28)',
                    transition: 'all 0.18s'
                  }}
                  onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(115,66,230,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={e => { if (!isProcessing) { e.currentTarget.style.boxShadow = '0 4px 14px rgba(115,66,230,0.28)'; e.currentTarget.style.transform = 'none'; } }}
                >
                  {isProcessing ? 'Processing...' : (
                    <>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Erase Object
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownload}
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
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Image
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div 
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: toast.type === 'error' ? '#FFF5F5' : toast.type === 'success' ? '#ECFDF5' : toast.type === 'warning' ? '#FFFBEB' : '#F4F4F5',
            border: `1px solid ${toast.type === 'error' ? '#FCA5A5' : toast.type === 'success' ? '#A7F3D0' : toast.type === 'warning' ? '#FDE68A' : '#E4E4E7'}`,
            color: toast.type === 'error' ? '#B91C1C' : toast.type === 'success' ? '#065F46' : toast.type === 'warning' ? '#92400E' : '#27272A',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 700,
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />
          {toast.type === 'error' && (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12" y2="16" />
            </svg>
          )}
          {toast.type === 'success' && (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {toast.type === 'warning' && (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12" y2="17" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </ToolPageShell>
  );
}
