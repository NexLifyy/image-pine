"use client";

import React from 'react';

export default function AboutPage() {
  const cardStyle = {
    background: '#fff',
    border: '1px solid #E4E4EF',
    borderRadius: 20,
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const featureCardStyle = {
    background: '#fff',
    border: '1px solid #E4E4EF',
    borderRadius: 16,
    padding: '24px',
    flex: 1,
    minWidth: 250,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'all 0.2s ease',
  };

  return (
    <div style={{ background: '#F7F7FB', minHeight: '100%', padding: '64px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }} className="animate-fade-in">
        
        {/* Header Hero */}
        <section style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#EDEDFB',
            color: '#5B5BD6',
            fontSize: 12,
            fontWeight: 700,
            padding: '5px 14px',
            borderRadius: 99,
            border: '1px solid #D8D8F5',
            marginBottom: 16
          }}>
            Local-First Technology
          </span>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 900,
            color: '#111128',
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            margin: '0 0 16px'
          }}>
            About <span style={{
              background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>ImagePine</span>
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 2vw, 17px)',
            color: '#6B6B8A',
            lineHeight: 1.6,
            maxWidth: 580,
            margin: '0 auto'
          }}>
            We believe image editing should be fast, accessible, and completely private. ImagePine runs entirely in your browser—your files never leave your device.
          </p>
        </section>

        {/* Main Content Card */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111128', margin: 0, letterSpacing: '-0.02em' }}>
            Our Philosophy
          </h2>
          <p style={{ fontSize: 14, color: '#6B6B8A', lineHeight: 1.7, margin: 0 }}>
            Most online image editors require you to upload your files to their servers. This is slow, wastes bandwidth, and presents significant privacy risks for sensitive documents, personal photos, or corporate designs.
          </p>
          <p style={{ fontSize: 14, color: '#6B6B8A', lineHeight: 1.7, margin: 0 }}>
            <strong>ImagePine is different.</strong> By utilizing modern browser capabilities such as HTML5 Canvas, WebAssembly, and local JavaScript processing, we process all images locally on your CPU and GPU. There are no backend upload APIs, no image databases, and no security risks.
          </p>

          <div style={{ height: 1, background: '#E4E4EF', margin: '16px 0' }} />

          {/* Three Core Pillars */}
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111128', margin: '0 0 8px' }}>
            Why We Are Different
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div style={featureCardStyle}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: '#EDEDFB', color: '#5B5BD6',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111128', margin: 0 }}>Absolute Privacy</h4>
              <p style={{ fontSize: 12, color: '#9898B5', lineHeight: 1.6, margin: 0 }}>
                Your photos, assets, and PDFs are processed strictly within your sandbox. No servers, no tracking, no leaks.
              </p>
            </div>

            <div style={featureCardStyle}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: '#F5F3FF', color: '#7C3AED',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111128', margin: 0 }}>Instant Speed</h4>
              <p style={{ fontSize: 12, color: '#9898B5', lineHeight: 1.6, margin: 0 }}>
                Skip the upload queues and download delays. Files process instantly, even in bulk, using your system hardware.
              </p>
            </div>

            <div style={featureCardStyle}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: '#E6F4EA', color: '#137333',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111128', margin: 0 }}>100% Free</h4>
              <p style={{ fontSize: 12, color: '#9898B5', lineHeight: 1.6, margin: 0 }}>
                No subscription plans, no file size caps, and no premium features locked behind paywalls. Just simple, free tools.
              </p>
            </div>
          </div>

          <div style={{ height: 1, background: '#E4E4EF', margin: '16px 0' }} />

          {/* Under the Hood */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111128', margin: 0, letterSpacing: '-0.01em' }}>
            Under The Hood
          </h2>
          <p style={{ fontSize: 14, color: '#6B6B8A', lineHeight: 1.7, margin: 0 }}>
            ImagePine leverages high-efficiency algorithms that run inside your browser. Here is a look at the technologies we use to provide offline-capable, studio-grade processing:
          </p>
          <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#6B6B8A', lineHeight: 1.6 }}>
            <li><strong>HTML5 Canvas 2D API:</strong> Powers high-quality pixel resampling, flipping, and rotational transforms.</li>
            <li><strong>Native Web Compression:</strong> Employs client-side file compression algorithms for optimal file size reduction without sacrificing visual fidelity.</li>
            <li><strong>Wasm/HEIF Parsers:</strong> Decodes advanced formats like HEIC directly inside your sandbox memory structure.</li>
            <li><strong>Client-Side PDF Generation:</strong> Assembles complex multi-page document PDFs dynamically without ever pinging a web service.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
