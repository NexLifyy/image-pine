"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import { getMimeForSaveFormat, getExtensionForMime, compressCanvasToBlob } from '@/lib/imageUtils';
import { useLanguage } from '@/lib/LanguageContext';


/* ─── InputField — defined OUTSIDE Home to prevent remount on every render ── */
function InputField({ value, onChange, type = 'text', placeholder, inputMode = 'numeric', pattern = '[0-9]*' }) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      pattern={pattern}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '9px 12px',
        background: '#F7F7FB', border: '1px solid #E4E4EF',
        borderRadius: 9, fontSize: 13, fontWeight: 700,
        color: '#111128', outline: 'none',
        transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
        fontFamily: 'inherit', boxSizing: 'border-box',
      }}
      onFocus={e => { e.target.style.borderColor = '#5B5BD6'; e.target.style.boxShadow = '0 0 0 3px rgba(91,91,214,0.1)'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = '#E4E4EF'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F7F7FB'; }}
    />
  );
}

/* ─── SegControl ─────────────────────────────────────────────────────────── */
function SegControl({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      background: '#F1F1F7', border: '1px solid #E4E4EF',
      borderRadius: 9, padding: 3,
    }}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, padding: '5px 10px',
            fontSize: 11, fontWeight: 700,
            borderRadius: 6, border: 'none', cursor: 'pointer',
            transition: 'all 0.18s ease',
            background: value === opt.value ? '#fff' : 'transparent',
            color: value === opt.value ? '#5B5BD6' : '#9898B5',
            boxShadow: value === opt.value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Inline Before/After Slider ────────────────────────────────────────── */
function InlineSlider({ beforeSrc, afterSrc, beforeLabel, afterLabel, saving }) {
  const [pos, setPos] = useState(50);
  const [containerW, setContainerW] = useState(0);
  const boxRef = useRef(null);
  const dragging = useRef(false);

  // Track the true pixel width of the container so the AFTER image always
  // fills the full container (not just the clipped portion).
  useEffect(() => {
    if (!boxRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
    });
    ro.observe(boxRef.current);
    setContainerW(boxRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const move = useCallback((clientX) => {
    if (!boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  }, []);

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
  }, [move]);

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
      {/* BEFORE — fills the entire area (behind the after layer) */}
      <img src={beforeSrc} alt="Before" draggable={false}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain', pointerEvents: 'none',
        }}
      />

      {/* AFTER — the processed image, clipped on the left side.
          The clip-div shrinks with pos%, but the image inside it must
          always be the full container width so it perfectly overlays
          the BEFORE image. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: `${pos}%`, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <img src={afterSrc} alt="After" draggable={false}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: imgW,         /* always the full container width */
            height: '100%',
            objectFit: 'contain',
            maxWidth: 'none',    /* prevent the browser capping it at clip-div width */
          }}
        />
      </div>

      {/* Divider line */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${pos}%`,
        width: 2, background: '#fff',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
        transform: 'translateX(-50%)', pointerEvents: 'none',
      }} />

      {/* Drag handle */}
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

      {/* AFTER label (top-left) */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)',
        border: '1px solid rgba(91,91,214,0.2)', borderRadius: 7, padding: '3px 10px',
        fontSize: 10, fontWeight: 700, color: '#5B5BD6', pointerEvents: 'none',
      }}>
        {afterLabel}
      </div>

      {/* BEFORE label (top-right) */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)',
        border: '1px solid #E4E4EF', borderRadius: 7, padding: '3px 10px',
        fontSize: 10, fontWeight: 700, color: '#9898B5', pointerEvents: 'none',
      }}>
        {beforeLabel}
      </div>

      {/* Savings badge */}
      {saving > 0 && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          background: '#DCFCE7', border: '1px solid #BBF7D0',
          borderRadius: 99, padding: '4px 12px',
          fontSize: 11, fontWeight: 700, color: '#16A34A',
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          ↓ {saving}% smaller
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const prevPreviewsRef = useRef([]);


  useEffect(() => {
    const cur = files.map(f => f.preview).filter(Boolean);
    const removed = prevPreviewsRef.current.filter(p => !cur.includes(p));
    removed.forEach(url => URL.revokeObjectURL(url));
    prevPreviewsRef.current = cur;
  }, [files]);
  useEffect(() => () => prevPreviewsRef.current.forEach(url => URL.revokeObjectURL(url)), []);

  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [widthInput, setWidthInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [lockRatio, setLockRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [resizeAsPercentage, setResizeAsPercentage] = useState(false);
  const [percentageValue, setPercentageValue] = useState('100');
  const [rotateAngle, setRotateAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [compressMode, setCompressMode] = useState('quality');
  const [compressQuality, setCompressQuality] = useState(80);
  const [targetSizeInput, setTargetSizeInput] = useState('');
  const [saveFormat, setSaveFormat] = useState('Original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [processedSize, setProcessedSize] = useState(null);
  const [processedWidth, setProcessedWidth] = useState(null);
  const [processedHeight, setProcessedHeight] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('resize');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  // 'canvas' | 'compare'
  const [viewMode, setViewMode] = useState('canvas');

  const previewCanvasRef = useRef(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles.length) return;
    const mapped = acceptedFiles.map(f =>
      Object.assign(f, { preview: URL.createObjectURL(f), id: Math.random().toString(36).slice(2, 9) })
    );
    setFiles(prev => [...prev, ...mapped]);
    if (!selectedFile) setSelectedFile(mapped[0]);
  }, [selectedFile]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop, noClick: files.length > 0, noKeyboard: files.length > 0,
    maxSize: 15 * 1024 * 1024,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.svg'] },
  });

  const resetAll = () => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]); setSelectedFile(null);
    setOriginalWidth(0); setOriginalHeight(0); setWidthInput(''); setHeightInput('');
    setRotateAngle(0); setFlipH(false); setFlipV(false);
    if (processedUrl) { URL.revokeObjectURL(processedUrl); setProcessedUrl(null); }
    setProcessedSize(null); setErrorMsg(''); setViewMode('canvas');
  };

  const removeFile = (id, e) => {
    e.stopPropagation();
    const f = files.find(x => x.id === id);
    if (f?.preview) URL.revokeObjectURL(f.preview);
    const filtered = files.filter(x => x.id !== id);
    setFiles(filtered);
    if (selectedFile?.id === id) {
      if (filtered.length) setSelectedFile(filtered[0]);
      else resetAll();
    }
  };

  useEffect(() => {
    if (!selectedFile) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setOriginalWidth(w); setOriginalHeight(h);
      setWidthInput(w.toString()); setHeightInput(h.toString());
      setAspectRatio(w / h);
      setRotateAngle(0); setFlipH(false); setFlipV(false);
      setResizeAsPercentage(false); setPercentageValue('100');
      if (processedUrl) { URL.revokeObjectURL(processedUrl); setProcessedUrl(null); }
      setProcessedSize(null); setErrorMsg(''); setViewMode('canvas');
    };
    img.onerror = () => setErrorMsg('Failed to load image.');
    img.src = selectedFile.preview;
  }, [selectedFile]);

  useEffect(() => {
    if (!originalWidth || !originalHeight) return;
    const angle = parseFloat(rotateAngle) || 0;
    const rad = (angle * Math.PI) / 180;
    const ac = Math.abs(Math.cos(rad)), as = Math.abs(Math.sin(rad));
    const wR = Math.round(originalWidth * ac + originalHeight * as);
    const hR = Math.round(originalWidth * as + originalHeight * ac);
    setAspectRatio(wR / hR);
    if (resizeAsPercentage) {
      const p = parseFloat(percentageValue) || 100;
      setWidthInput(Math.round(wR * p / 100).toString());
      setHeightInput(Math.round(hR * p / 100).toString());
    } else { setWidthInput(wR.toString()); setHeightInput(hR.toString()); }
  }, [rotateAngle, originalWidth, originalHeight]);

  useEffect(() => {
    if (!originalWidth || !originalHeight || !resizeAsPercentage) return;
    const angle = parseFloat(rotateAngle) || 0;
    const rad = (angle * Math.PI) / 180;
    const ac = Math.abs(Math.cos(rad)), as = Math.abs(Math.sin(rad));
    const wR = Math.round(originalWidth * ac + originalHeight * as);
    const hR = Math.round(originalWidth * as + originalHeight * ac);
    const p = parseFloat(percentageValue) || 100;
    setWidthInput(Math.round(wR * p / 100).toString());
    setHeightInput(Math.round(hR * p / 100).toString());
  }, [resizeAsPercentage, percentageValue]);

  // Draw canvas preview — also re-fires when switching back to 'canvas' viewMode
  // so the canvas is never blank after a compare→edit transition.
  useEffect(() => {
    // Only draw when the canvas tab is visible (the element must be in the DOM)
    if (viewMode !== 'canvas') return;
    if (!selectedFile || !previewCanvasRef.current || !originalWidth || !originalHeight) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const angle = parseFloat(rotateAngle) || 0;
      const rad = (angle * Math.PI) / 180;
      const ac = Math.abs(Math.cos(rad)), as = Math.abs(Math.sin(rad));
      const wR = Math.round(originalWidth * ac + originalHeight * as);
      const hR = Math.round(originalWidth * as + originalHeight * ac);
      let wF = parseInt(widthInput, 10) || wR;
      let hF = parseInt(heightInput, 10) || hR;
      if (resizeAsPercentage) { const p = parseFloat(percentageValue)||100; wF=Math.round(wR*p/100); hF=Math.round(hR*p/100); }
      if (wF<=0) wF=1; if (hF<=0) hF=1;
      const maxD=1000; let pW=wF,pH=hF;
      if (wF>maxD||hF>maxD) { if(wF>=hF){pW=maxD;pH=Math.round(maxD*hF/wF);}else{pH=maxD;pW=Math.round(maxD*wF/hF);} }
      canvas.width=pW; canvas.height=pH;
      const mime=getMimeForSaveFormat(saveFormat,selectedFile.type);
      // Always fill white first so PNG/WebP canvas is never blank
      ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,pW,pH);
      if(mime==='image/png'||mime==='image/webp') ctx.clearRect(0,0,pW,pH);
      ctx.save();
      ctx.scale(pW/wF,pH/hF); ctx.translate(wF/2,hF/2);
      ctx.scale(flipH?-1:1,flipV?-1:1); ctx.rotate(rad);
      ctx.scale(wF/wR,hF/hR); ctx.drawImage(img,-originalWidth/2,-originalHeight/2,originalWidth,originalHeight);
      ctx.restore();
    };
    img.onerror = () => { /* silently ignore */ };
    img.src = selectedFile.preview;
    return () => { cancelled = true; };
  }, [selectedFile,originalWidth,originalHeight,rotateAngle,flipH,flipV,widthInput,heightInput,resizeAsPercentage,percentageValue,saveFormat,viewMode]);

  const handleWidthChange = (val) => {
    setWidthInput(val);
    const pw = parseInt(val,10);
    if (!isNaN(pw)&&pw>0&&lockRatio&&aspectRatio) setHeightInput(Math.round(pw/aspectRatio).toString());
  };
  const handleHeightChange = (val) => {
    setHeightInput(val);
    const ph = parseInt(val,10);
    if (!isNaN(ph)&&ph>0&&lockRatio&&aspectRatio) setWidthInput(Math.round(ph*aspectRatio).toString());
  };

  const handleProcessAndDownload = () => {
    if (!selectedFile) return;
    setIsProcessing(true); setErrorMsg('');
    const img = new Image();
    img.onload = () => {
      try {
        const angle=parseFloat(rotateAngle)||0;
        const rad=(angle*Math.PI)/180;
        const ac=Math.abs(Math.cos(rad)),as=Math.abs(Math.sin(rad));
        const wR=Math.round(originalWidth*ac+originalHeight*as);
        const hR=Math.round(originalWidth*as+originalHeight*ac);
        let wF=parseInt(widthInput,10)||wR;
        let hF=parseInt(heightInput,10)||hR;
        if(resizeAsPercentage){const p=parseFloat(percentageValue)||100;wF=Math.round(wR*p/100);hF=Math.round(hR*p/100);}
        if(wF<=0||hF<=0) throw new Error('Enter valid width and height > 0.');
        const canvas=document.createElement('canvas');
        canvas.width=wF; canvas.height=hF;
        const ctx=canvas.getContext('2d');
        if(!ctx) throw new Error('Canvas context failed.');
        const mime=getMimeForSaveFormat(saveFormat,selectedFile.type);
        if(mime==='image/png'||mime==='image/webp') ctx.clearRect(0,0,wF,hF);
        else { ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,wF,hF); }
        ctx.translate(wF/2,hF/2); ctx.scale(flipH?-1:1,flipV?-1:1);
        ctx.rotate(rad); ctx.scale(wF/wR,hF/hR);
        ctx.drawImage(img,-originalWidth/2,-originalHeight/2,originalWidth,originalHeight);
        const targetBytes=compressMode==='size'&&targetSizeInput&&parseFloat(targetSizeInput)>0?parseFloat(targetSizeInput)*1024:null;
        const useMime=compressMode==='quality'?mime:(mime==='image/png'?'image/webp':mime);
        const useQ=compressMode==='quality'?(compressQuality/100):0.8;
        if(targetBytes){
          compressCanvasToBlob(canvas,mime,targetBytes)
            .then(({blob,mime:m})=>finalizeExport(blob,m,wF,hF))
            .catch(err=>{setErrorMsg(err.message||'Compression error.');setIsProcessing(false);});
        } else {
          canvas.toBlob((blob)=>{
            if(!blob){setErrorMsg('Failed to render output.');setIsProcessing(false);return;}
            finalizeExport(blob,useMime,wF,hF);
          },useMime,useQ);
        }
      } catch(err) { setErrorMsg(err.message||'Error during processing.'); setIsProcessing(false); }
    };
    img.onerror=()=>{setErrorMsg('Failed to process image.');setIsProcessing(false);};
    img.src=selectedFile.preview;
  };

  const finalizeExport = (blob,mime,wF,hF) => {
    if(processedUrl) URL.revokeObjectURL(processedUrl);
    const url=URL.createObjectURL(blob);
    setProcessedUrl(url); setProcessedSize(blob.size);
    setProcessedWidth(wF); setProcessedHeight(hF);
    setIsProcessing(false);
    setViewMode('compare'); // auto switch to comparison
    const ext=getExtensionForMime(mime,selectedFile.name);
    const base=selectedFile.name.replace(/\.[^/.]+$/,'');
    saveAs(blob,`${base}_edited.${ext}`);
    saveHistory('ImagePine Studio',`${base}_edited.${ext} (${wF}x${hF})`);
  };

  const formatSize = (b) => {
    if(!b) return ' - ';
    if(b>=1024*1024) return (b/(1024*1024)).toFixed(1)+' MB';
    return (b/1024).toFixed(1)+' KB';
  };

  const saving = selectedFile&&processedSize ? Math.max(0,Math.round((1-processedSize/selectedFile.size)*100)) : 0;
  const hasFiles = files.length > 0;

  // InputField is defined at module level above to avoid remount-on-render focus loss.

  const faqs = [
    {q:'What image formats are supported?',a:'JPEG, JPG, PNG, WebP, and SVG. You can also convert between formats on export.'},
    {q:'Does resizing or rotating reduce quality?',a:'No. All transforms use HTML5 Canvas at full resolution with high-quality bicubic interpolation.'},
    {q:'How does target file size compression work?',a:'Our binary search algorithm finds the best quality setting to hit your target. If needed, it slightly scales dimensions.'},
    {q:'Are my images uploaded to a server?',a:'Never. Everything runs 100% locally in your browser using HTML5 Canvas.'},
    {q:'Can I process multiple images?',a:'Yes - upload multiple files, switch between them in the sidebar, and download each result separately.'},
  ];

  return (
    <div style={{background:'#F7F7FB',minHeight:'100%'}}>

      {/* ═══ HERO (no files uploaded yet) ═══ */}
      {!hasFiles && (
        <section style={{maxWidth:720,margin:'0 auto',padding:'80px 24px 60px',textAlign:'center'}} className="animate-fade-up">
          <div style={{display:'flex',justifyContent:'center',marginBottom:22}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:6,background:'#EDEDFB',color:'#5B5BD6',fontSize:12,fontWeight:700,padding:'5px 14px',borderRadius:99,border:'1px solid #D8D8F5'}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Free · No Account · No Upload
            </span>
          </div>
          <h1 style={{fontSize:'clamp(34px,6vw,56px)',fontWeight:900,color:'#111128',lineHeight:1.08,letterSpacing:'-0.04em',margin:'0 0 16px'}}>
            Edit Images{' '}
            <span style={{background:'linear-gradient(135deg,#5B5BD6 0%,#7C3AED 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Instantly</span>
          </h1>
          <p style={{fontSize:'clamp(14px,2.5vw,18px)',color:'#6B6B8A',lineHeight:1.65,fontWeight:400,maxWidth:460,margin:'0 auto 44px'}}>
            Resize, compress, rotate and flip - live before/after comparison built in. 100% private, runs in your browser.
          </p>

          <div {...getRootProps()} style={{
            border:`2px dashed ${isDragActive?'#5B5BD6':'#D1D1E4'}`,
            borderRadius:20,
            background:isDragActive?'#EDEDFB':'#fff',
            boxShadow:isDragActive?'0 0 0 5px rgba(91,91,214,0.08)':'0 2px 20px rgba(0,0,0,0.06)',
            padding:'52px 28px',cursor:'pointer',transition:'all 0.25s ease',
            display:'flex',flexDirection:'column',alignItems:'center',gap:18,
          }}>
            <input {...getInputProps()} />
            <div style={{width:64,height:64,borderRadius:16,background:isDragActive?'#5B5BD6':'#EDEDFB',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.25s ease'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isDragActive?'#fff':'#5B5BD6'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            {isDragActive ? (
              <p style={{fontSize:16,fontWeight:700,color:'#5B5BD6',margin:0}}>{t('Drag & drop files here')}</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                <button type="button" onClick={e=>{e.stopPropagation();open();}} style={{
                  background:'linear-gradient(135deg,#5B5BD6 0%,#7C3AED 100%)',color:'#fff',
                  fontWeight:700,fontSize:14,padding:'12px 36px',borderRadius:12,border:'none',
                  cursor:'pointer',boxShadow:'0 4px 16px rgba(91,91,214,0.35)',transition:'all 0.2s ease',
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 24px rgba(91,91,214,0.45)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 16px rgba(91,91,214,0.35)';}}>
                  {t('Select Files')}
                </button>
                <p style={{fontSize:13,color:'#9898B5',fontWeight:500,margin:0}}>{t('or click to select')}</p>
              </div>
            )}
            <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
              {['JPEG','PNG','WebP','SVG'].map(f=>(
                <span key={f} style={{background:'#F7F7FB',border:'1px solid #E4E4EF',color:'#9898B5',fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:6}}>{f}</span>
              ))}
              <span style={{color:'#C4C4D9',fontSize:11,fontWeight:500,padding:'3px 2px'}}>· Max 15 MB</span>
            </div>
          </div>

          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginTop:28}}>
            {['Resize','Compress','Rotate Image','Flip Image'].map(f=>(
              <div key={f} style={{background:'#fff',border:'1px solid #E4E4EF',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:600,color:'#6B6B8A'}}>{t(f)}</div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ WORKSPACE ═══ */}
      {hasFiles && (
        <div style={{maxWidth:1380,margin:'0 auto',padding:'24px 20px 48px'}} className="animate-fade-in">

          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div>
              <h2 style={{fontSize:20,fontWeight:800,color:'#111128',letterSpacing:'-0.03em',margin:0}}>Image Studio</h2>
              <p style={{fontSize:12,color:'#9898B5',fontWeight:500,margin:'2px 0 0'}}>{files.length} file{files.length!==1?'s':''} loaded</p>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button type="button" onClick={open} style={{display:'flex',alignItems:'center',gap:6,background:'#fff',border:'1px solid #E4E4EF',borderRadius:9,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#6B6B8A',cursor:'pointer',transition:'all 0.18s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#D1D1E4';e.currentTarget.style.color='#111128';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#E4E4EF';e.currentTarget.style.color='#6B6B8A';}}>
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Add More
              </button>
              <button type="button" onClick={resetAll} style={{display:'flex',alignItems:'center',gap:6,background:'#FFF5F5',border:'1px solid #FECACA',borderRadius:9,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#EF4444',cursor:'pointer',transition:'background 0.18s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#FEE2E2';}}
                onMouseLeave={e=>{e.currentTarget.style.background='#FFF5F5';}}>
                Clear All
              </button>
            </div>
          </div>

          {/* 3-Col Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_290px] gap-4" style={{ alignItems: 'start' }}>

            {/* COL 1: Sidebar */}
            <div className="lg:sticky lg:top-[76px]" style={{background:'#fff',border:'1px solid #E4E4EF',borderRadius:16,padding:14,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
              <p style={{fontSize:10,fontWeight:800,color:'#9898B5',letterSpacing:'0.08em',textTransform:'uppercase',margin:'0 0 10px'}}>Files ({files.length})</p>
              <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:480,overflowY:'auto'}}>
                {files.map(file=>(
                  <div key={file.id} onClick={()=>{setSelectedFile(file);setViewMode('canvas');setProcessedUrl(null);setProcessedSize(null);}}
                    style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:10,border:`1px solid ${selectedFile?.id===file.id?'#5B5BD6':'#E4E4EF'}`,background:selectedFile?.id===file.id?'#EDEDFB':'#fff',cursor:'pointer',transition:'all 0.18s ease'}}>
                    {file.preview&&<img src={file.preview} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:7,border:'1px solid #E4E4EF',flexShrink:0}}/>}
                    <div style={{minWidth:0,flex:1}}>
                      <p style={{fontSize:11,fontWeight:700,color:'#111128',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0}} title={file.name}>{file.name}</p>
                      <p style={{fontSize:10,color:'#9898B5',fontWeight:500,margin:'2px 0 0'}}>{formatSize(file.size)}</p>
                    </div>
                    <button type="button" onClick={e=>removeFile(file.id,e)} style={{background:'none',border:'none',cursor:'pointer',padding:4,borderRadius:6,color:'#C4C4D9',transition:'color 0.15s',flexShrink:0}}
                      onMouseEnter={e=>{e.currentTarget.style.color='#EF4444';}} onMouseLeave={e=>{e.currentTarget.style.color='#C4C4D9';}}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
              <div {...getRootProps()} onClick={e=>{e.stopPropagation();open();}}
                style={{marginTop:10,border:'1.5px dashed #E4E4EF',borderRadius:10,padding:'10px',textAlign:'center',cursor:'pointer',transition:'all 0.2s',background:isDragActive?'#EDEDFB':'transparent',borderColor:isDragActive?'#5B5BD6':'#E4E4EF'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#F7F7FB';}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
                <input {...getInputProps()}/>
                <p style={{fontSize:10,color:'#9898B5',fontWeight:600,margin:0}}>+ Drop more images</p>
              </div>
            </div>

            {/* COL 2: Main Preview - canvas OR before/after on same area */}
            <div style={{background:'#fff',border:'1px solid #E4E4EF',borderRadius:16,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>

              {/* Preview header */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <p style={{fontSize:10,fontWeight:800,color:'#9898B5',letterSpacing:'0.08em',textTransform:'uppercase',margin:0}}>
                    {viewMode==='compare'?'Before / After':'Live Preview'}
                  </p>
                  {viewMode==='compare'&&saving>0&&(
                    <span style={{background:'#DCFCE7',color:'#16A34A',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{saving}% smaller</span>
                  )}
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {selectedFile&&(
                    <span style={{background:'#F7F7FB',border:'1px solid #E4E4EF',fontSize:10,fontWeight:600,color:'#9898B5',padding:'3px 9px',borderRadius:6}}>
                      {originalWidth} × {originalHeight} · {formatSize(selectedFile.size)}
                    </span>
                  )}
                  {/* Toggle only shows when processedUrl exists */}
                  {processedUrl&&(
                    <div style={{display:'flex',gap:2,background:'#F1F1F7',border:'1px solid #E4E4EF',borderRadius:8,padding:2}}>
                      {[{id:'canvas',label:'Edit'},{id:'compare',label:'⇔ Compare'}].map(v=>(
                        <button key={v.id} type="button" onClick={()=>setViewMode(v.id)} style={{
                          padding:'4px 10px',fontSize:11,fontWeight:700,borderRadius:6,border:'none',cursor:'pointer',
                          transition:'all 0.15s',
                          background:viewMode===v.id?'#fff':'transparent',
                          color:viewMode===v.id?'#5B5BD6':'#9898B5',
                          boxShadow:viewMode===v.id?'0 1px 4px rgba(0,0,0,0.1)':'none',
                        }}>{v.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── CANVAS VIEW (default) ── */}
              {viewMode==='canvas'&&(
                <div style={{background:'repeating-conic-gradient(#F1F1F7 0% 25%,#fff 0% 50%) 0 0/20px 20px',borderRadius:12,minHeight:380,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',border:'1px solid #E4E4EF',padding:16}}>
                  <canvas ref={previewCanvasRef} style={{maxWidth:'100%',maxHeight:500,objectFit:'contain',borderRadius:8,boxShadow:'0 4px 24px rgba(0,0,0,0.1)',display:'block'}}/>
                </div>
              )}

              {/* ── COMPARE VIEW - InlineSlider replaces the canvas area ── */}
              {viewMode==='compare'&&processedUrl&&selectedFile&&(
                <div className="animate-fade-in">
                  <InlineSlider
                    afterSrc={processedUrl}
                    beforeSrc={selectedFile.preview}
                    afterLabel={`Processed · ${formatSize(processedSize)}`}
                    beforeLabel={`Original · ${formatSize(selectedFile.size)}`}
                    saving={saving}
                  />
                </div>
              )}

              {/* Output stats */}
              {processedSize&&(
                <div style={{marginTop:14,display:'flex',gap:10,alignItems:'center',padding:'12px 16px',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10}} className="animate-fade-in">
                  <div style={{width:24,height:24,background:'#22C55E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:11,fontWeight:700,color:'#16A34A',margin:0}}>Output: {processedWidth} × {processedHeight} px · {formatSize(processedSize)}</p>
                    {saving>0&&<p style={{fontSize:10,color:'#4ADE80',fontWeight:500,margin:'1px 0 0'}}>Saved {formatSize(selectedFile.size-processedSize)} · {saving}% reduction</p>}
                  </div>
                  <button type="button" onClick={()=>{const a=document.createElement('a');a.href=processedUrl;a.download=selectedFile?.name.replace(/\.[^/.]+$/,''||'image')+'_edited';a.click();}}
                    style={{background:'#22C55E',color:'#fff',fontSize:11,fontWeight:700,padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',flexShrink:0}}>
                    ↓ Save again
                  </button>
                </div>
              )}
            </div>

            {/* COL 3: Controls */}
            <div className="lg:sticky lg:top-[76px]" style={{background:'#fff',border:'1px solid #E4E4EF',borderRadius:16,boxShadow:'0 1px 4px rgba(0,0,0,0.05)',overflow:'hidden'}}>
              {/* Tabs */}
              <div style={{display:'flex',borderBottom:'1px solid #E4E4EF',padding:'0 4px'}}>
                {[{id:'resize',label:'Resize'},{id:'rotate',label:'Rotate'},{id:'flip',label:'Flip'}].map(tab=>(
                  <button key={tab.id} type="button" onClick={()=>setActiveTab(tab.id)} style={{
                    flex:1,padding:'12px 4px',fontSize:11,fontWeight:700,border:'none',background:'none',cursor:'pointer',
                    color:activeTab===tab.id?'#5B5BD6':'#9898B5',
                    borderBottom:`2px solid ${activeTab===tab.id?'#5B5BD6':'transparent'}`,
                    transition:'all 0.18s ease',marginBottom:'-1px',
                  }}>{tab.label}</button>
                ))}
              </div>

              <div style={{padding:18}}>

                {/* RESIZE */}
                {activeTab==='resize'&&(
                  <div style={{display:'flex',flexDirection:'column',gap:16}} className="animate-fade-in">
                    <SegControl options={[{value:false,label:'By Pixels'},{value:true,label:'By %'}]} value={resizeAsPercentage} onChange={setResizeAsPercentage}/>
                    {!resizeAsPercentage?(
                      <div style={{display:'flex',flexDirection:'column',gap:12}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                          <div><label style={{fontSize:10,fontWeight:700,color:'#9898B5',display:'block',marginBottom:5,letterSpacing:'0.05em',textTransform:'uppercase'}}>Width (px)</label><InputField value={widthInput} onChange={handleWidthChange}/></div>
                          <div><label style={{fontSize:10,fontWeight:700,color:'#9898B5',display:'block',marginBottom:5,letterSpacing:'0.05em',textTransform:'uppercase'}}>Height (px)</label><InputField value={heightInput} onChange={handleHeightChange}/></div>
                        </div>
                        <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer'}}>
                          <input type="checkbox" checked={lockRatio} onChange={e=>setLockRatio(e.target.checked)}/>
                          <span style={{fontSize:12,fontWeight:600,color:'#6B6B8A'}}>Lock aspect ratio</span>
                        </label>
                      </div>
                    ):(
                      <div>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                          <label style={{fontSize:10,fontWeight:700,color:'#9898B5',letterSpacing:'0.05em',textTransform:'uppercase'}}>Scale</label>
                          <span style={{fontSize:14,fontWeight:800,color:'#5B5BD6'}}>{percentageValue}%</span>
                        </div>
                        <input type="range" min="1" max="200" value={percentageValue} onChange={e=>setPercentageValue(e.target.value)} style={{width:'100%'}}/>
                        {widthInput&&heightInput&&<p style={{fontSize:11,color:'#9898B5',fontWeight:600,marginTop:10,textAlign:'center'}}>Output: {widthInput} × {heightInput} px</p>}
                      </div>
                    )}

                    {/* ── Output Format (moved from Export tab) ── */}
                    <div>
                      <label style={{fontSize:10,fontWeight:700,color:'#9898B5',display:'block',marginBottom:6,letterSpacing:'0.05em',textTransform:'uppercase'}}>Output Format</label>
                      <div style={{position:'relative'}}>
                        <select value={saveFormat} onChange={e=>setSaveFormat(e.target.value)} style={{width:'100%',padding:'9px 32px 9px 12px',background:'#F7F7FB',border:'1px solid #E4E4EF',borderRadius:9,fontSize:13,fontWeight:700,color:'#111128',outline:'none',cursor:'pointer',fontFamily:'inherit',boxSizing:'border-box'}}
                          onFocus={e=>{e.target.style.borderColor='#5B5BD6';e.target.style.background='#fff';}} onBlur={e=>{e.target.style.borderColor='#E4E4EF';e.target.style.background='#F7F7FB';}}>
                          <option value="Original">Same as Original</option>
                          <option value="JPG">JPEG (JPG)</option>
                          <option value="PNG">PNG</option>
                          <option value="WebP">WebP</option>
                        </select>
                        <svg style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',color:'#9898B5'}} width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" d="M19 9l-7 7-7-7"/></svg>
                      </div>
                    </div>

                    {/* ── Compression Mode (moved from Export tab) ── */}
                    <div>
                      <label style={{fontSize:10,fontWeight:700,color:'#9898B5',display:'block',marginBottom:6,letterSpacing:'0.05em',textTransform:'uppercase'}}>Compression Mode</label>
                      <SegControl options={[{value:'quality',label:'By Quality'},{value:'size',label:'By Size (KB)'}]} value={compressMode} onChange={setCompressMode}/>
                    </div>
                    {compressMode==='quality'?(
                      <div>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                          <label style={{fontSize:10,fontWeight:700,color:'#9898B5',letterSpacing:'0.05em',textTransform:'uppercase'}}>Quality</label>
                          <span style={{fontSize:18,fontWeight:900,color:compressQuality>70?'#5B5BD6':compressQuality>40?'#F59E0B':'#EF4444'}}>{compressQuality}%</span>
                        </div>
                        <input type="range" min="5" max="100" value={compressQuality} onChange={e=>setCompressQuality(parseInt(e.target.value,10))} style={{width:'100%'}}/>
                        <div style={{display:'flex',justifyContent:'space-between',marginTop:8,gap:4}}>
                          {[{label:'Smallest',q:15,color:'#EF4444'},{label:'Balanced',q:70,color:'#F59E0B'},{label:'Best',q:95,color:'#10B981'}].map(({label,q,color})=>(
                            <button key={label} type="button" onClick={()=>setCompressQuality(q)} style={{flex:1,fontSize:10,fontWeight:700,border:`1px solid ${color}20`,background:`${color}10`,color,cursor:'pointer',padding:'5px 4px',borderRadius:7}}>{label}</button>
                          ))}
                        </div>
                      </div>
                    ):(
                      <div>
                        <label style={{fontSize:10,fontWeight:700,color:'#9898B5',display:'block',marginBottom:6,letterSpacing:'0.05em',textTransform:'uppercase'}}>Target Size (KB)</label>
                        <InputField value={targetSizeInput} onChange={setTargetSizeInput} placeholder="e.g. 150"/>
                      </div>
                    )}
                  </div>
                )}

                {/* ROTATE */}
                {activeTab==='rotate'&&(
                  <div style={{display:'flex',flexDirection:'column',gap:16}} className="animate-fade-in">
                    <div>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                        <label style={{fontSize:10,fontWeight:700,color:'#9898B5',letterSpacing:'0.05em',textTransform:'uppercase'}}>Angle</label>
                        <span style={{fontSize:18,fontWeight:900,color:'#5B5BD6'}}>{rotateAngle}°</span>
                      </div>
                      <input type="range" min="-360" max="360" value={rotateAngle} onChange={e=>setRotateAngle(parseInt(e.target.value,10))} style={{width:'100%'}}/>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                      {[{label:'−90°',fn:()=>setRotateAngle(p=>{const v=((p-90)%360+360)%360;return v>180?v-360:v;})},{label:'+90°',fn:()=>setRotateAngle(p=>{const v=(p+90)%360;return v>180?v-360:v;})},{label:'180°',fn:()=>setRotateAngle(p=>{const v=(p+180)%360;return v>180?v-360:v;})},{label:'Reset',fn:()=>setRotateAngle(0),danger:true}].map(({label,fn,danger})=>(
                        <button key={label} type="button" onClick={fn} style={{padding:'9px 4px',fontSize:11,fontWeight:700,border:`1px solid ${danger?'#FECACA':'#E4E4EF'}`,background:danger?'#FFF5F5':'#F7F7FB',color:danger?'#EF4444':'#6B6B8A',borderRadius:8,cursor:'pointer'}}>{label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* FLIP */}
                {activeTab==='flip'&&(
                  <div style={{display:'flex',flexDirection:'column',gap:14}} className="animate-fade-in">
                    <p style={{fontSize:12,color:'#9898B5',fontWeight:400,lineHeight:1.6,margin:0}}>Mirror your image along horizontal or vertical axis.</p>
                    <div style={{display:'flex',gap:10}}>
                      {[{label:'Horizontal',active:flipH,fn:()=>setFlipH(p=>!p),icon:<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3M12 3v18"/></svg>},{label:'Vertical',active:flipV,fn:()=>setFlipV(p=>!p),icon:<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M21 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v3M21 16v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3M3 12h18"/></svg>}].map(({label,active,fn,icon})=>(
                        <button key={label} type="button" onClick={fn} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'20px 10px',border:`1px solid ${active?'#5B5BD6':'#E4E4EF'}`,background:active?'#EDEDFB':'#F7F7FB',color:active?'#5B5BD6':'#9898B5',borderRadius:12,cursor:'pointer',transition:'all 0.18s ease',fontWeight:700,fontSize:12}}>
                          {icon}{label}
                          {active&&<span style={{fontSize:9,fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',color:'#fff',background:'#5B5BD6',borderRadius:99,padding:'2px 7px'}}>ON</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export tab removed — its content now lives in Resize tab above */}
              </div>

              {errorMsg&&(
                <div style={{margin:'0 18px 14px',padding:'10px 14px',background:'#FFF5F5',border:'1px solid #FECACA',borderRadius:10,fontSize:12,fontWeight:600,color:'#EF4444',display:'flex',gap:8,alignItems:'flex-start'}}>
                  <svg width="14" height="14" style={{flexShrink:0,marginTop:1}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {errorMsg}
                </div>
              )}

              <div style={{padding:'0 18px 18px'}}>
                <button type="button" disabled={isProcessing||!selectedFile} onClick={handleProcessAndDownload} style={{
                  width:'100%',
                  background:isProcessing?'#E4E4EF':'linear-gradient(135deg,#5B5BD6 0%,#7C3AED 100%)',
                  color:isProcessing?'#9898B5':'#fff',
                  fontWeight:800,fontSize:14,letterSpacing:'-0.01em',
                  padding:'14px 20px',borderRadius:12,border:'none',
                  cursor:isProcessing?'not-allowed':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  transition:'all 0.2s ease',
                  boxShadow:isProcessing?'none':'0 4px 16px rgba(91,91,214,0.3)',
                }}
                onMouseEnter={e=>{if(!isProcessing){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 24px rgba(91,91,214,0.4)';}}} 
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=isProcessing?'none':'0 4px 16px rgba(91,91,214,0.3)';}}>
                  {isProcessing?(
                    <><svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Processing…</>
                  ):(
                    <><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Apply &amp; Download</>
                  )}
                </button>
                <p style={{fontSize:10,color:'#C4C4D9',textAlign:'center',fontWeight:500,marginTop:8}}>All settings applied simultaneously</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ═══ FEATURES ═══ */}
      <section style={{borderTop:'1px solid #E4E4EF',background:'#fff',padding:'72px 24px'}}>
        <div style={{maxWidth:1060,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <span style={{display:'inline-block',background:'#EDEDFB',color:'#5B5BD6',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:99,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:14,border:'1px solid #D8D8F5'}}>{t('100% Free')}</span>
            <h2 style={{fontSize:'clamp(22px,4vw,34px)',fontWeight:900,color:'#111128',letterSpacing:'-0.03em',margin:'0 0 10px'}}>{t('Why Choose This Tool?')}</h2>
            <p style={{fontSize:15,color:'#6B6B8A',fontWeight:400,maxWidth:460,margin:'0 auto'}}>{t('Built for speed, quality and complete privacy.')}</p>
          </div>
          <div className="features-grid" style={{gap:18}}>
            {[
              {icon:<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,title:'All-in-One Studio',desc:'Resize, compress, rotate, and flip all at once with a live canvas that updates in real time.'},
              {icon:<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,title:'100% Private',desc:'No uploads, no servers. Every operation runs inside your browser. Your photos never leave your device.'},
              {icon:<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 18l-5-5 5-5M16 6l5 5-5 5"/></svg>,title:'Before/After Compare',desc:'After processing, switch to Compare mode - drag the slider inside the same preview area to see results.'},
              {icon:<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,title:'Instant Preview',desc:'Every change - resize, rotate, flip - reflects instantly on the canvas with zero server lag.'},
              {icon:<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,title:'Free Forever',desc:'Enjoy all features for free, with no watermarks, no account registration, and no limits.'},
              {icon:<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,title:'No Watermarks',desc:'Clean professional outputs every time. We never overlay watermarks or branding on your images.'},
            ].map(({icon,title,desc})=>(
              <div key={title} style={{background:'#F7F7FB',border:'1px solid #E4E4EF',borderRadius:14,padding:'22px 20px'}}>
                <div style={{width:40,height:40,background:'#EDEDFB',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#5B5BD6',marginBottom:14}}>{icon}</div>
                <h3 style={{fontSize:14,fontWeight:800,color:'#111128',margin:'0 0 6px',letterSpacing:'-0.02em'}}>{title}</h3>
                <p style={{fontSize:13,color:'#6B6B8A',lineHeight:1.6,margin:0,fontWeight:400}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{padding:'72px 24px',background:'#F7F7FB'}}>
        <div style={{maxWidth:860,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <span style={{display:'inline-block',background:'#EDEDFB',color:'#5B5BD6',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:99,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:14,border:'1px solid #D8D8F5'}}>{t('How It Works')}</span>
            <h2 style={{fontSize:'clamp(22px,4vw,34px)',fontWeight:900,color:'#111128',letterSpacing:'-0.03em',margin:'0 0 10px'}}>{t('How It Works')}</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
            {[
              {step:'01',title:'Upload',desc:'Drag & drop or click to select JPEG, PNG, WebP, or SVG files up to 15 MB each.'},
              {step:'02',title:'Edit',desc:'Resize by pixels or percentage, rotate any angle, flip, and choose your compression settings.'},
              {step:'03',title:'Download',desc:'Hit Apply & Download. The file saves instantly. Switch to Compare mode to see the difference.'},
            ].map(({step,title,desc})=>(
              <div key={step} style={{background:'#fff',border:'1px solid #E4E4EF',borderRadius:14,padding:'24px 20px',position:'relative',overflow:'hidden'}}>
                <div style={{fontSize:48,fontWeight:900,color:'#EDEDFB',lineHeight:1,marginBottom:12,letterSpacing:'-0.04em'}}>{step}</div>
                <h3 style={{fontSize:15,fontWeight:800,color:'#111128',margin:'0 0 8px',letterSpacing:'-0.02em'}}>{title}</h3>
                <p style={{fontSize:13,color:'#6B6B8A',lineHeight:1.6,margin:0}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section style={{borderTop:'1px solid #E4E4EF',background:'#fff',padding:'72px 24px'}}>
        <div style={{maxWidth:680,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <span style={{display:'inline-block',background:'#EDEDFB',color:'#5B5BD6',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:99,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:14,border:'1px solid #D8D8F5'}}>{t('Frequently Asked Questions')}</span>
            <h2 style={{fontSize:'clamp(22px,4vw,34px)',fontWeight:900,color:'#111128',letterSpacing:'-0.03em',margin:'0 0 10px'}}>{t('Frequently Asked Questions')}</h2>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {faqs.map((faq,i)=>(
              <div key={i} style={{border:'1px solid #E4E4EF',borderRadius:12,overflow:'hidden',background:openFaqIndex===i?'#FAFAFE':'#fff',transition:'background 0.2s'}}>
                <button type="button" onClick={()=>setOpenFaqIndex(openFaqIndex===i?null:i)}
                  style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 18px',background:'none',border:'none',cursor:'pointer',textAlign:'left',gap:12}}>
                  <span style={{fontSize:14,fontWeight:700,color:'#111128'}}>{t(faq.q)}</span>
                  <svg width="16" height="16" fill="none" stroke="#9898B5" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"
                    style={{flexShrink:0,transform:openFaqIndex===i?'rotate(180deg)':'none',transition:'transform 0.2s'}}>
                    <path d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {openFaqIndex===i&&(
                  <div style={{padding:'0 18px 16px',fontSize:13,color:'#6B6B8A',lineHeight:1.7,fontWeight:400}} className="animate-fade-in">
                    {t(faq.a)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{borderTop:'1px solid #E4E4EF',background:'#F7F7FB',padding:'32px 24px',textAlign:'center'}}>
        <p style={{fontSize:13,color:'#9898B5',fontWeight:500,margin:0}}>
          <span style={{fontWeight:800,color:'#5B5BD6'}}>ImagePine</span> · Free browser-based image editor · No account needed · 100% private
        </p>
      </footer>

    </div>
  );
}
