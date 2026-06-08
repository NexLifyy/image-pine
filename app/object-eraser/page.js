"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: 'Sub-Region Heat Diffusion',
    desc: 'Interpolates pixel values from the mask boundaries inwards to create smooth, natural color fills.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="18" r="4" />
        <line x1="20" y1="2" x2="4" y2="18" />
      </svg>
    ),
    title: 'Dual Selection Modes',
    desc: 'Toggle between a variable Brush Paint highlighter and a drag-and-drop Rectangular box selector.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
      </svg>
    ),
    title: 'Optimized Solver Speed',
    desc: 'Runs the iterative color solver only within the mask bounding box, completing inpaint operations 100x faster.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    ),
    title: 'Feathered Boundary Blending',
    desc: 'Feathers mask borders to smoothly blend surrounding image textures, removing any residual outline artifacts.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: '100% Secure & Client-Side',
    desc: 'All mathematical inpainting calculations run inside your browser. No files are uploaded to any server.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
    ),
    title: 'Full Resolution Download',
    desc: 'Saves your completed, cleaned photo at original dimensions in high-quality PNG or JPEG format.'
  }
];

const _STEPS = [
  { n: '1', title: 'Upload Photo', desc: 'Select any JPEG or PNG image from your device.' },
  { n: '2', title: 'Highlight Object', desc: 'Use the Brush or Box Select tool to highlight unwanted elements in red.' },
  { n: '3', title: 'Erase & Export', desc: 'Click Erase Object to clean the selection, then download.' }
];

const _FAQS = [
  { q: 'How does Object Eraser work?', a: 'It identifies the boundary pixels of your highlighted mask and runs a Jacobi heat diffusion solver to blend and interpolate surrounding colors inward, cleanly eliminating text, watermarks, or spots.' },
  { q: 'Why did the previous eraser leave pink smudges?', a: 'The red overlay mask was previously read as part of the source image stream during calculation. We resolved this by drawing original clean pixels directly onto a hidden rendering canvas before computing.' },
  { q: 'Is there any limit to image sizes?', a: 'No. By restricting calculations to the mask bounding box, the tool processes large images (even above 15MB) in a fraction of a second.' }
];

export default function ObjectEraserPage() {
  const [file, setFile] = useState(null);
  const [eraserMode, setEraserMode] = useState('brush'); // 'brush' | 'rectangle'
  const [brushSize, setBrushSize] = useState(24);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const workspaceCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const originalImageRef = useRef(null);
  const isDrawingRef = useRef(false);
  const dragStartRef = useRef(null);
  const dragCurrentRef = useRef(null);

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
      setHasMask(false);
    } else {
      setFile(null);
    }
    setErrorMsg('');
  };

  const initCanvases = () => {
    if (!file || !workspaceCanvasRef.current || !originalImageRef.current) return;
    const canvas = workspaceCanvasRef.current;
    const img = originalImageRef.current;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0);

    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }
    const maskCanvas = maskCanvasRef.current;
    maskCanvas.width = img.naturalWidth;
    maskCanvas.height = img.naturalHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
    setHasMask(false);
  };

  useEffect(() => {
    if (file) {
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        initCanvases();
      };
      img.src = file.preview;
    }
  }, [file]);

  const drawMaskOverlay = () => {
    if (!workspaceCanvasRef.current || !maskCanvasRef.current || !originalImageRef.current) return;
    const canvas = workspaceCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const img = originalImageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw base clean image
    ctx.drawImage(img, 0, 0);

    // Overlay drawn red mask at 55% transparency
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.restore();

    // If currently dragging rectangle selection, draw dynamic bounds overlay
    if (isDrawingRef.current && eraserMode === 'rectangle' && dragStartRef.current && dragCurrentRef.current) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = Math.max(2, 2 * canvasScaleFactor());
      const rx = Math.min(dragStartRef.current.x, dragCurrentRef.current.x);
      const ry = Math.min(dragStartRef.current.y, dragCurrentRef.current.y);
      const rw = Math.abs(dragCurrentRef.current.x - dragStartRef.current.x);
      const rh = Math.abs(dragCurrentRef.current.y - dragStartRef.current.y);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }
  };

  const getCanvasCoords = (e) => {
    if (!workspaceCanvasRef.current) return { x: 0, y: 0 };
    const canvas = workspaceCanvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);

    if (eraserMode === 'rectangle') {
      dragStartRef.current = coords;
      dragCurrentRef.current = coords;
    } else {
      const maskCanvas = maskCanvasRef.current;
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.strokeStyle = '#EF4444';
        maskCtx.lineWidth = brushSize * canvasScaleFactor();
        maskCtx.lineCap = 'round';
        maskCtx.lineJoin = 'round';
        maskCtx.beginPath();
        maskCtx.moveTo(coords.x, coords.y);
      }
    }
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);

    if (eraserMode === 'rectangle') {
      dragCurrentRef.current = coords;
      drawMaskOverlay();
    } else {
      const maskCanvas = maskCanvasRef.current;
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.lineTo(coords.x, coords.y);
        maskCtx.stroke();
        setHasMask(true);
        drawMaskOverlay();
      }
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (eraserMode === 'rectangle' && dragStartRef.current && dragCurrentRef.current) {
      const coords = getCanvasCoords(e);
      const maskCanvas = maskCanvasRef.current;
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.fillStyle = '#EF4444';
        const rx = Math.min(dragStartRef.current.x, coords.x);
        const ry = Math.min(dragStartRef.current.y, coords.y);
        const rw = Math.abs(coords.x - dragStartRef.current.x);
        const rh = Math.abs(coords.y - dragStartRef.current.y);
        if (rw > 2 && rh > 2) {
          maskCtx.fillRect(rx, ry, rw, rh);
          setHasMask(true);
        }
      }
      dragStartRef.current = null;
      dragCurrentRef.current = null;
      drawMaskOverlay();
    }
  };

  const canvasScaleFactor = () => {
    if (!workspaceCanvasRef.current) return 1;
    const canvas = workspaceCanvasRef.current;
    return canvas.width / canvas.offsetWidth;
  };

  const resetMask = () => {
    if (!maskCanvasRef.current || !originalImageRef.current) return;
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
    setHasMask(false);
    drawMaskOverlay();
  };

  const runInpainting = () => {
    if (!workspaceCanvasRef.current || !maskCanvasRef.current || !originalImageRef.current) return;
    setIsProcessing(true);
    setErrorMsg('');

    setTimeout(() => {
      try {
        const canvas = workspaceCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const maskCtx = maskCanvas.getContext('2d');
        if (!ctx || !maskCtx) throw new Error('Failed to acquire canvas context');

        const width = canvas.width;
        const height = canvas.height;

        // Draw original clean image onto canvas first to get clean boundary pixels
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(originalImageRef.current, 0, 0);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Extract mask pixels (unblurred mask for patch-based synthesis)
        const maskData = maskCtx.getImageData(0, 0, width, height).data;

        // Find mask bounding box
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let hasMaskPixels = false;
        for (let y = 0; y < height; y++) {
          const rowOffset = y * width;
          for (let x = 0; x < width; x++) {
            const idx = (rowOffset + x) * 4;
            if (maskData[idx + 3] > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              hasMaskPixels = true;
            }
          }
        }

        if (!hasMaskPixels) {
          setIsProcessing(false);
          drawMaskOverlay();
          return;
        }

        // Add padding around mask bounding box
        const pad = 35;
        minX = Math.max(0, minX - pad);
        maxX = Math.min(width - 1, maxX + pad);
        minY = Math.max(0, minY - pad);
        maxY = Math.min(height - 1, maxY + pad);

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        // Copy cropped image and mask data
        const cropImgData = ctx.getImageData(minX, minY, cropW, cropH);
        const cropPixels = cropImgData.data; // Uint8ClampedArray of size cropW * cropH * 4

        const cropMaskData = maskCtx.getImageData(minX, minY, cropW, cropH).data;

        // Set up known array (1 = known/unmasked, 0 = masked)
        const known = new Uint8Array(cropW * cropH);
        let maskedCount = 0;
        for (let i = 0; i < cropW * cropH; i++) {
          if (cropMaskData[i * 4 + 3] > 15) {
            known[i] = 0; // masked
            maskedCount++;
          } else {
            known[i] = 1; // known
          }
        }

        // Patch-based Exemplar Inpainting parameters
        const r = 3; // Patch radius (7x7 patch)
        const searchRadius = 32;

        let maxIterations = Math.min(800, Math.ceil(maskedCount / 2));
        let iter = 0;

        // We will keep track of border pixels
        const borderPixels = new Int32Array(cropW * cropH);

        while (maskedCount > 0 && iter < maxIterations) {
          iter++;
          
          let borderCount = 0;
          // Find border pixels (masked pixels with at least one known 4-neighbor)
          for (let y = r; y < cropH - r; y++) {
            const rowIdx = y * cropW;
            for (let x = r; x < cropW - r; x++) {
              const idx = rowIdx + x;
              if (known[idx] === 0) {
                const isBorder = 
                  known[idx - 1] === 1 || known[idx + 1] === 1 || 
                  known[idx - cropW] === 1 || known[idx + cropW] === 1;
                if (isBorder) {
                  borderPixels[borderCount++] = idx;
                }
              }
            }
          }

          if (borderCount === 0) {
            break;
          }

          // Prioritize border pixels based on confidence (known ratio in the patch)
          let bestIdx = -1;
          let maxKnownRatio = -1;

          for (let b = 0; b < borderCount; b++) {
            const idx = borderPixels[b];
            const px = idx % cropW;
            const py = Math.floor(idx / cropW);

            let knownCount = 0;
            for (let dy = -r; dy <= r; dy++) {
              const pRowIdx = (py + dy) * cropW;
              for (let dx = -r; dx <= r; dx++) {
                if (known[pRowIdx + (px + dx)] === 1) {
                  knownCount++;
                }
              }
            }

            if (knownCount > maxKnownRatio) {
              maxKnownRatio = knownCount;
              bestIdx = idx;
            }
          }

          if (bestIdx === -1) break;

          const tx = bestIdx % cropW;
          const ty = Math.floor(bestIdx / cropW);

          // Find best matching patch in neighborhood
          let bestSsd = Infinity;
          let bestX = -1;
          let bestY = -1;

          const startX = Math.max(r, tx - searchRadius);
          const endX = Math.min(cropW - 1 - r, tx + searchRadius);
          const startY = Math.max(r, ty - searchRadius);
          const endY = Math.min(cropH - 1 - r, ty + searchRadius);

          for (let sy = startY; sy <= endY; sy++) {
            for (let sx = startX; sx <= endX; sx++) {
              // Source patch must be completely known
              let fullyKnown = true;
              for (let dy = -r; dy <= r; dy++) {
                const qRowIdx = (sy + dy) * cropW;
                for (let dx = -r; dx <= r; dx++) {
                  if (known[qRowIdx + (sx + dx)] === 0) {
                    fullyKnown = false;
                    break;
                  }
                }
                if (!fullyKnown) break;
              }

              if (!fullyKnown) continue;

              // Calculate SSD between target and source patch
              let ssd = 0;
              let possible = true;

              for (let dy = -r; dy <= r; dy++) {
                const tRowIdx = (ty + dy) * cropW;
                const sRowIdx = (sy + dy) * cropW;
                for (let dx = -r; dx <= r; dx++) {
                  const tIdx = tRowIdx + (tx + dx);
                  if (known[tIdx] === 1) {
                    const sIdx = sRowIdx + (sx + dx);
                    
                    const tDataIdx = tIdx * 4;
                    const sDataIdx = sIdx * 4;

                    const dr = cropPixels[tDataIdx] - cropPixels[sDataIdx];
                    const dg = cropPixels[tDataIdx + 1] - cropPixels[sDataIdx + 1];
                    const db = cropPixels[tDataIdx + 2] - cropPixels[sDataIdx + 2];

                    ssd += dr * dr + dg * dg + db * db;
                    if (ssd >= bestSsd) {
                      possible = false;
                      break;
                    }
                  }
                }
                if (!possible) break;
              }

              if (possible && ssd < bestSsd) {
                bestSsd = ssd;
                bestX = sx;
                bestY = sy;
              }
            }
          }

          // Fallback: If no fully known patch was found in local window, search the entire crop
          if (bestX === -1) {
            let minDistance = Infinity;
            for (let sy = r; sy < cropH - r; sy++) {
              for (let sx = r; sx < cropW - r; sx++) {
                let fullyKnown = true;
                for (let dy = -r; dy <= r; dy++) {
                  const qRowIdx = (sy + dy) * cropW;
                  for (let dx = -r; dx <= r; dx++) {
                    if (known[qRowIdx + (sx + dx)] === 0) {
                      fullyKnown = false;
                      break;
                    }
                  }
                  if (!fullyKnown) break;
                }

                if (!fullyKnown) continue;

                const dist = (sx - tx) * (sx - tx) + (sy - ty) * (sy - ty);
                if (dist < minDistance) {
                  minDistance = dist;
                  bestX = sx;
                  bestY = sy;
                }
              }
            }
          }

          // Copy texture from source patch to target patch for unknown pixels
          if (bestX !== -1) {
            for (let dy = -r; dy <= r; dy++) {
              const tRowIdx = (ty + dy) * cropW;
              const sRowIdx = (bestY + dy) * cropW;
              for (let dx = -r; dx <= r; dx++) {
                const tIdx = tRowIdx + (tx + dx);
                if (known[tIdx] === 0) {
                  const sIdx = sRowIdx + (bestX + dx);
                  const tDataIdx = tIdx * 4;
                  const sDataIdx = sIdx * 4;

                  cropPixels[tDataIdx]     = cropPixels[sDataIdx];
                  cropPixels[tDataIdx + 1] = cropPixels[sDataIdx + 1];
                  cropPixels[tDataIdx + 2] = cropPixels[sDataIdx + 2];
                  cropPixels[tDataIdx + 3] = cropPixels[sDataIdx + 3];

                  known[tIdx] = 1;
                }
              }
            }
          } else {
            // Absolute fallback: mark target pixel as known to prevent infinite loop
            known[bestIdx] = 1;
          }

          // Recalculate remaining masked pixels count
          maskedCount = 0;
          for (let i = 0; i < cropW * cropH; i++) {
            if (known[i] === 0) maskedCount++;
          }
        }

        // Fill any remaining isolated masked pixels with neighbor interpolation
        for (let i = 0; i < cropW * cropH; i++) {
          if (known[i] === 0) {
            const cx = i % cropW;
            const cy = Math.floor(i / cropW);
            let found = false;
            for (let radius = 1; radius < Math.max(cropW, cropH); radius++) {
              for (let dy = -radius; dy <= radius; dy++) {
                const ny = cy + dy;
                if (ny >= 0 && ny < cropH) {
                  const nRowIdx = ny * cropW;
                  for (let dx = -radius; dx <= radius; dx++) {
                    const nx = cx + dx;
                    if (nx >= 0 && nx < cropW) {
                      const nidx = nRowIdx + nx;
                      if (known[nidx] === 1) {
                        cropPixels[i * 4] = cropPixels[nidx * 4];
                        cropPixels[i * 4 + 1] = cropPixels[nidx * 4 + 1];
                        cropPixels[i * 4 + 2] = cropPixels[nidx * 4 + 2];
                        known[i] = 1;
                        found = true;
                        break;
                      }
                    }
                  }
                  if (found) break;
                }
              }
              if (found) break;
            }
          }
        }

        // Feather and blend the inpainted crop back into the original image
        const tempMaskCanvas = document.createElement('canvas');
        tempMaskCanvas.width = cropW;
        tempMaskCanvas.height = cropH;
        const tempMaskCtx = tempMaskCanvas.getContext('2d');
        if (tempMaskCtx) {
          tempMaskCtx.filter = 'blur(4px)';
          tempMaskCtx.drawImage(maskCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        }

        const cropFeatheredMask = (tempMaskCtx || maskCtx).getImageData(0, 0, cropW, cropH).data;

        // Blend: originalColor * (1 - alpha) + inpaintedColor * alpha
        const originalCropImgData = ctx.getImageData(minX, minY, cropW, cropH);
        const originalCropPixels = originalCropImgData.data;

        for (let i = 0; i < cropW * cropH; i++) {
          const idx = i * 4;
          const alpha = cropFeatheredMask[idx + 3] / 255;
          cropPixels[idx]     = Math.round(originalCropPixels[idx] * (1 - alpha) + cropPixels[idx] * alpha);
          cropPixels[idx + 1] = Math.round(originalCropPixels[idx + 1] * (1 - alpha) + cropPixels[idx + 1] * alpha);
          cropPixels[idx + 2] = Math.round(originalCropPixels[idx + 2] * (1 - alpha) + cropPixels[idx + 2] * alpha);
        }

        // Write the blended crop back onto the main canvas
        ctx.putImageData(cropImgData, minX, minY);

        // Update the original image reference so future operations build on this result
        const updatedImg = new Image();
        updatedImg.onload = () => {
          originalImageRef.current = updatedImg;
          maskCtx.clearRect(0, 0, width, height);
          setHasMask(false);
          setIsProcessing(false);
        };
        updatedImg.src = canvas.toDataURL();

      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to process object removal.');
        setIsProcessing(false);
        drawMaskOverlay();
      }
    }, 150);
  };

  const handleDownload = () => {
    if (!workspaceCanvasRef.current || !file) return;
    workspaceCanvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const ext = file.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
      saveAs(blob, `${nameWithoutExt}_erased.${ext}`);
      saveHistory('Object Eraser', `${file.name} (Object Erased)`);
    }, file.type);
  };

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
      title="Object Eraser"
      subtitle="Erase unwanted objects, text headers, watermarks, or blemishes from photos locally and privately."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Remove objects and texts from pictures locally. Client-side canvas texture inpainter with custom brush and rectangular masks. Free and private."
    >
      {!file ? (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={handleFileSelect}
            acceptedFormats={['.jpg', '.jpeg', '.png']}
            multiple={false}
            buttonLabel="Select Photo to Edit"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">
          {/* Controls Column */}
          <div className="col-span-1 lg:col-span-4" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #F1F1F7', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111128', margin: 0 }}>Eraser Settings</h3>
              <button
                onClick={() => setFile(null)}
                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                Clear Photo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Tool Selector */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Selection Tool</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setEraserMode('brush')}
                    style={{
                      flex: 1, padding: '10px', fontSize: 12, fontWeight: 700,
                      border: '1px solid', borderRadius: 10,
                      borderColor: eraserMode === 'brush' ? '#7342e6' : '#E4E4EF',
                      background: eraserMode === 'brush' ? '#EEF0FF' : '#fff',
                      color: eraserMode === 'brush' ? '#7342e6' : '#6B6B8A',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    Brush Paint
                  </button>
                  <button
                    type="button"
                    onClick={() => setEraserMode('rectangle')}
                    style={{
                      flex: 1, padding: '10px', fontSize: 12, fontWeight: 700,
                      border: '1px solid', borderRadius: 10,
                      borderColor: eraserMode === 'rectangle' ? '#7342e6' : '#E4E4EF',
                      background: eraserMode === 'rectangle' ? '#EEF0FF' : '#fff',
                      color: eraserMode === 'rectangle' ? '#7342e6' : '#6B6B8A',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                    Box Select
                  </button>
                </div>
              </div>

              {/* Brush size */}
              {eraserMode === 'brush' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', marginBottom: 6 }}>
                    <span>Brush Size</span>
                    <span style={{ color: '#111128' }}>{brushSize}px</span>
                  </div>
                  <input type="range" min="8" max="64" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                </div>
              )}

              {/* Reset button */}
              <button
                type="button"
                disabled={!hasMask || isProcessing}
                onClick={resetMask}
                style={{
                  width: '100%', padding: '10px', fontSize: 12, fontWeight: 700,
                  border: '1px solid #E4E4EF', borderRadius: 10, background: '#fff',
                  color: hasMask ? '#6B6B8A' : '#C4C4D9', cursor: hasMask ? 'pointer' : 'default', transition: 'all 0.15s'
                }}
              >
                Reset Mask Highlight
              </button>

              {errorMsg && (
                <div style={{ padding: 10, background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 8, color: '#EF4444', fontSize: 11, fontWeight: 600 }}>
                  {errorMsg}
                </div>
              )}

              {/* Erase button */}
              <button
                type="button"
                disabled={!hasMask || isProcessing}
                onClick={runInpainting}
                style={{
                  width: '100%',
                  background: hasMask ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : '#E4E4EF',
                  color: hasMask ? '#fff' : '#9898B5',
                  fontWeight: 800,
                  fontSize: 13,
                  borderRadius: 12,
                  padding: '13px',
                  border: 'none',
                  cursor: hasMask ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: hasMask ? '0 4px 14px rgba(239, 68, 68, 0.28)' : 'none',
                  transition: 'all 0.18s',
                  marginTop: 10
                }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
                {isProcessing ? 'Erasing Object...' : 'Erase Object'}
              </button>

              {/* Download */}
              <button
                type="button"
                disabled={isProcessing}
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
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
                  transition: 'all 0.18s'
                }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Clean Photo
              </button>
            </div>
          </div>

          {/* Interactive drawing viewport */}
          <div
            className="col-span-1 lg:col-span-8"
            style={{
              ...cardStyle,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#F7F7FB',
              minHeight: 480,
              position: 'relative'
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', alignSelf: 'flex-start', marginBottom: 12 }}>
              {eraserMode === 'brush' ? 'Brush Mask (Draw in red to highlight objects)' : 'Box Mask (Click and drag to select rectangular region)'}
            </span>

            {isProcessing && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(247, 247, 251, 0.75)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}>
                <div style={{ width: 32, height: 32, border: '4px solid #7342e6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} className="animate-spin" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7342e6' }}>Erasing Object locally...</span>
              </div>
            )}

            <div style={{ maxWidth: '100%', maxHeight: '600px', overflow: 'auto', borderRadius: 12, border: '1px solid #E4E4EF', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <canvas
                ref={workspaceCanvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ display: 'block', maxWidth: '100%', height: 'auto', cursor: 'crosshair', userSelect: 'none', touchAction: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}
