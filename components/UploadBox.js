"use client";

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

/**
 * UploadBox — matches the homepage reference design exactly.
 *
 * Props:
 *   onFileSelect(files[])  – callback with the full list of accepted File objects (each has .preview & .id)
 *   acceptedFormats        – e.g. ['.jpg', '.jpeg', '.png', '.webp', '.svg']
 *   multiple               – boolean (default true)
 *   buttonLabel            – override button text (default "Choose Images" / "Choose File")
 *   maxSizeMB              – override max size label (default 15)
 */
export default function UploadBox({
  onFileSelect,
  acceptedFormats,
  multiple = true,
  buttonLabel,
  maxSizeMB = 15,
}) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      const mapped = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
          id: Math.random().toString(36).slice(2, 9),
        })
      );
      onFileSelect?.(mapped);
    },
    [onFileSelect]
  );

  const getAcceptObject = () => {
    if (!acceptedFormats?.length) return undefined;
    const map = {};
    acceptedFormats.forEach((fmt) => {
      const f = fmt.toLowerCase().trim();
      if (['.jpg', '.jpeg'].includes(f)) map['image/jpeg'] = ['.jpg', '.jpeg'];
      else if (f === '.png')  map['image/png']  = ['.png'];
      else if (f === '.webp') map['image/webp'] = ['.webp'];
      else if (f === '.gif')  map['image/gif']  = ['.gif'];
      else if (f === '.svg')  map['image/svg+xml'] = ['.svg'];
      else if (['.heic', '.heif'].includes(f)) {
        map['image/heic'] = ['.heic'];
        map['image/heif'] = ['.heif'];
      } else if (f === '.pdf') map['application/pdf'] = ['.pdf'];
      else {
        map['application/octet-stream'] = [...(map['application/octet-stream'] || []), f];
      }
    });
    return map;
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple,
    maxSize: maxSizeMB * 1024 * 1024,
    accept: getAcceptObject(),
  });

  // Derive the format tags to show
  const formatTags = acceptedFormats?.length
    ? acceptedFormats.map((f) => f.replace('.', '').toUpperCase())
    : ['JPEG', 'PNG', 'WebP', 'SVG'];

  const label = buttonLabel ?? (multiple ? 'Choose Images' : 'Choose File');

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? '#5B5BD6' : '#D1D1E4'}`,
        borderRadius: 20,
        background: isDragActive ? '#EDEDFB' : '#fff',
        boxShadow: isDragActive
          ? '0 0 0 5px rgba(91,91,214,0.08)'
          : '0 2px 20px rgba(0,0,0,0.06)',
        padding: '52px 28px',
        minHeight: 305,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        width: '100%',
        boxSizing: 'border-box',
      }}
      onClick={open}
    >
      <input {...getInputProps()} />

      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: isDragActive ? '#5B5BD6' : '#EDEDFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s ease',
          flexShrink: 0,
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDragActive ? '#fff' : '#5B5BD6'}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>

      {/* Button + helper text */}
      {isDragActive ? (
        <p style={{ fontSize: 16, fontWeight: 700, color: '#5B5BD6', margin: 0 }}>
          Drop your {multiple ? 'images' : 'image'} here
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); open(); }}
            style={{
              background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              padding: '12px 36px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(91,91,214,0.35)',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(91,91,214,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,91,214,0.35)';
            }}
          >
            {label}
          </button>
          <p style={{ fontSize: 13, color: '#9898B5', fontWeight: 500, margin: 0 }}>
            or drag &amp; drop here
          </p>
        </div>
      )}

      {/* Format tags + max size */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {formatTags.map((f) => (
          <span
            key={f}
            style={{
              background: '#F7F7FB',
              border: '1px solid #E4E4EF',
              color: '#9898B5',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 6,
            }}
          >
            {f}
          </span>
        ))}
        <span style={{ color: '#C4C4D9', fontSize: 11, fontWeight: 500, padding: '3px 2px' }}>
          · Max {maxSizeMB} MB
        </span>
      </div>
    </div>
  );
}
