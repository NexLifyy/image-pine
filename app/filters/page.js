"use client";

import React, { useState, useEffect, useRef } from 'react';
import ToolPageShell from '@/components/ToolPageShell';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';

export default function FiltersPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Color adjustment states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [exposure, setExposure] = useState(100);
  const [blur, setBlur] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [hueRotate, setHueRotate] = useState(0);
  
  const [activeFilter, setActiveFilter] = useState('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveFormat, setSaveFormat] = useState('Original');

  const _FEATURES = [
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: '100% Private',
      desc: 'All image rendering and filter adjustments run locally on your CPU/GPU. No server uploads.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      title: 'Hardware Accelerated',
      desc: 'Uses CSS Filter and Canvas APIs for real-time slider updates and fast high-resolution rendering.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M20.4 14.5L16 10l-6 6-4-4-3 3" />
        </svg>
      ),
      title: 'Beautiful Filter Presets',
      desc: 'Instantly apply styles like Polaroid, Vintage, Warm Sunset, and Cool Ocean with one click.'
    }
  ];

  const _STEPS = [
    { n: '1', title: 'Load Image', desc: 'Select any PNG, JPEG, or WebP photo to edit.' },
    { n: '2', title: 'Adjust Filters', desc: 'Apply presets or drag sliders to fine-tune brightness, saturation, and contrast.' },
    { n: '3', title: 'Export & Save', desc: 'Choose your save format and download the adjusted image in full resolution.' }
  ];

  const _FAQS = [
    { q: 'Does adjusting filters degrade image resolution?', a: 'No. The filters are rendered directly onto a high-quality HTML5 Canvas matching the exact pixel dimensions of your uploaded image.' },
    { q: 'What filter presets are available?', a: 'We include five professional presets: Polaroid (retro high contrast), Vintage (faded sepia), Warm (golden sunset tones), Cool (ocean blue tones), and High Contrast (intense shadows and highlights).' },
    { q: 'Can I export in a different format?', a: 'Yes. You can upload in any format (like PNG) and export as a JPEG, WebP, or keep the original format.' }
  ];

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      setFile(files[0]);
      resetSliders();
    }
  };

  const resetSliders = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setExposure(100);
    setBlur(0);
    setSepia(0);
    setGrayscale(0);
    setHueRotate(0);
    setActiveFilter('none');
  };

  // Preset Filters configuration
  const applyPreset = (filterName) => {
    setActiveFilter(filterName);
    resetSliders();

    switch (filterName) {
      case 'polaroid':
        setContrast(120);
        setSaturation(120);
        setSepia(20);
        break;
      case 'vintage':
        setSepia(50);
        setContrast(90);
        setBrightness(105);
        break;
      case 'warm':
        setSepia(30);
        setSaturation(115);
        setBrightness(102);
        break;
      case 'cool':
        setHueRotate(15);
        setSaturation(110);
        setContrast(105);
        break;
      case 'contrast':
        setContrast(145);
        setSaturation(110);
        break;
      default:
        break;
    }
  };

  const getFilterString = () => {
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) opacity(${exposure}%) sepia(${sepia}%) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg) blur(${blur}px)`;
  };

  const handleDownload = () => {
    if (!file || !previewUrl) return;
    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D canvas context');

        const mimeMap = {
          'Original': file.type,
          'JPG': 'image/jpeg',
          'PNG': 'image/png',
          'WebP': 'image/webp'
        };
        const mime = mimeMap[saveFormat] || file.type;

        if (mime === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Apply filters directly to canvas context
        ctx.filter = getFilterString();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const quality = 0.92;

        canvas.toBlob((blob) => {
          if (blob) {
            const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
            const ext = extMap[mime] || 'jpg';
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
            saveAs(blob, `${nameWithoutExt}_filtered.${ext}`);
            saveHistory('Photo Filters', `${file.name} (Filtered)`);
          }
          setIsProcessing(false);
        }, mime, quality);
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
      }
    };
    img.src = previewUrl;
  };

  const cardStyle = {
    background: '#fff',
    border: '1px solid #E4E4EF',
    borderRadius: 20,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    height: 'fit-content'
  };

  const sliderGroup = (label, value, unit, min, max, step, setter) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#5B5BD6', fontFamily: 'monospace' }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => setter(parseFloat(e.target.value))}
        style={{ width: '100%', cursor: 'pointer', accentColor: '#5B5BD6' }}
      />
    </div>
  );

  return (
    <ToolPageShell
      title="Photo Filters"
      subtitle="Instantly apply vintage, retro, or modern filters to your photos, and adjust colors with precision. 100% locally processed."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Adjust image brightness, contrast, and color values online for free. Apply Polaroid, Vintage, and warm/cool photo filter presets. High-speed, local browser-based photo editor."
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
          
          {/* Left: Large Image Preview */}
          <div className="lg:col-span-8" style={{ ...cardStyle, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E4E4EF' }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111128', margin: 0 }}>{file.name}</h3>
                <p style={{ fontSize: 10, color: '#9898B5', margin: '2px 0 0', fontWeight: 600 }}>Active Filters: {activeFilter !== 'none' ? activeFilter.toUpperCase() : 'Custom Adjustments'}</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: '#FDF2F2', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
              >
                Change Image
              </button>
            </div>
            
            <div style={{
              minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
            }}>
              {/* Image Preview with hardware filters applied via style */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  maxHeight: 520,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  borderRadius: 10,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                  filter: getFilterString(),
                  display: 'block'
                }}
              />
            </div>
          </div>

          {/* Right: Controls Panel */}
          <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Presets Card */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>Filter Presets</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  { id: 'none', label: 'Original' },
                  { id: 'polaroid', label: 'Polaroid' },
                  { id: 'vintage', label: 'Vintage' },
                  { id: 'warm', label: 'Warm' },
                  { id: 'cool', label: 'Cool' },
                  { id: 'contrast', label: 'Contrast' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    style={{
                      padding: '8px 4px', fontSize: 10, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${activeFilter === p.id ? '#5B5BD6' : '#E4E4EF'}`,
                      background: activeFilter === p.id ? '#EEF0FF' : '#FAFAFF',
                      color: activeFilter === p.id ? '#5B5BD6' : '#6B6B8A',
                      transition: 'all 0.15s'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Adjustments Sliders */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Manual Adjustments</h3>
                <button
                  type="button"
                  onClick={resetSliders}
                  style={{ fontSize: 10, fontWeight: 700, color: '#5B5BD6', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Reset All
                </button>
              </div>

              {sliderGroup('Brightness', brightness, '%', 0, 200, 1, setBrightness)}
              {sliderGroup('Contrast', contrast, '%', 0, 200, 1, setContrast)}
              {sliderGroup('Saturation', saturation, '%', 0, 200, 1, setSaturation)}
              {sliderGroup('Exposure', exposure, '%', 10, 100, 1, setExposure)}
              {sliderGroup('Blur', blur, 'px', 0, 10, 0.5, setBlur)}
              {sliderGroup('Sepia', sepia, '%', 0, 100, 1, setSepia)}
              {sliderGroup('Grayscale', grayscale, '%', 0, 100, 1, setGrayscale)}
              {sliderGroup('Hue Rotate', hueRotate, '°', 0, 360, 5, setHueRotate)}
            </div>

            {/* Export options */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>Export Settings</h3>
              
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
                  boxShadow: '0 4px 14px rgba(22,163,74,0.28)',
                  transition: 'all 0.18s'
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(22,163,74,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(22,163,74,0.28)'; e.currentTarget.style.transform = 'none'; }}
              >
                {isProcessing ? 'Applying filters...' : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Save Edited Photo
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}
    </ToolPageShell>
  );
}
