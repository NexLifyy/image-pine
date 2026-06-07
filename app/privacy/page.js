"use client";

import React from 'react';

export default function PrivacyPage() {
  const cardStyle = {
    background: '#fff',
    border: '1px solid #E4E4EF',
    borderRadius: 20,
    padding: '40px 32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  };

  const h2Style = {
    fontSize: '18px',
    fontWeight: 800,
    color: '#111128',
    letterSpacing: '-0.02em',
    margin: 0,
    borderBottom: '1px solid #F1F1F7',
    paddingBottom: '10px'
  };

  const pStyle = {
    fontSize: '14px',
    color: '#6B6B8A',
    lineHeight: 1.7,
    margin: 0
  };

  return (
    <div style={{ background: '#F7F7FB', minHeight: '100%', padding: '64px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }} className="animate-fade-in">
        
        {/* Header Hero */}
        <section style={{ textAlign: 'center', marginBottom: 40 }}>
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
            Updated June 2026
          </span>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 44px)',
            fontWeight: 900,
            color: '#111128',
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            margin: '0 0 12px'
          }}>
            Privacy Policy
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 2vw, 16px)',
            color: '#6B6B8A',
            lineHeight: 1.6,
            maxWidth: 580,
            margin: '0 auto'
          }}>
            At Image Pine, privacy is not a feature—it is the foundation of our software. Learn how your files remain entirely yours.
          </p>
        </section>

        {/* Content Card */}
        <div style={cardStyle}>
          
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#EDEDFB', border: '1px solid #D8D8F5', borderRadius: 14, padding: 18 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#fff',
              color: '#5B5BD6', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#111128', margin: '0 0 4px' }}>The Image Pine Promise</h4>
              <p style={{ fontSize: 11, color: '#5B5BD6', lineHeight: 1.6, margin: 0, fontWeight: 600 }}>
                We do not collect, store, transmit, or inspect your images, PDFs, or private directories. Everything happens inside your web browser.
              </p>
            </div>
          </div>

          <div>
            <h2 style={h2Style}>1. Local-First Processing</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              Unlike traditional image hosting or online conversion platforms, Image Pine uses <strong>client-side execution</strong>. When you drag and drop a file, your browser reads the image format directly from your device storage into memory.
            </p>
            <p style={{ ...pStyle, marginTop: 10 }}>
              All filters, canvas transforms, quality compression, resizing scripts, and conversion modules run locally on your device's web sandbox. The processing is completed entirely offline inside your browser tab.
            </p>
          </div>

          <div>
            <h2 style={h2Style}>2. Zero Server Transmission</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              We do not maintain servers to store or process your documents. No upload progress bar means no data is actually sent to any external server. We do not transfer your files to backend APIs, third-party databases, or cloud endpoints. Your raw assets, output results, and private PDFs never traverse the internet.
            </p>
          </div>

          <div>
            <h2 style={h2Style}>3. Browser Storage and History logs</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              Our tools may offer a local "History Log" feature showing a summary of your recent exports. This history is stored strictly using your browser's local sandbox storage (such as `localStorage` or `IndexedDB`).
            </p>
            <p style={{ ...pStyle, marginTop: 10 }}>
              This data is strictly private to your machine and is never synced, sold, or shared with us. You can clear this history anytime by using the "Clear All" buttons or by deleting your browser cache.
            </p>
          </div>

          <div>
            <h2 style={h2Style}>4. Web Analytics and Logging</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              To ensure platform stability, improve user experience, and check for build issues, we gather standard, anonymous analytical statistics (such as page views, referrer domains, and load speeds).
            </p>
            <p style={{ ...pStyle, marginTop: 10 }}>
              This logging processes strictly anonymous metadata and does not capture names, email addresses, geographical locations, or IP address tags associated with PII.
            </p>
          </div>

          <div>
            <h2 style={h2Style}>5. Policy Changes</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              We may update this policy occasionally as we introduce new tools. Rest assured, our core privacy principle will remain unchanged: <strong>your images and documents will never be uploaded.</strong>
            </p>
          </div>

          <div>
            <h2 style={h2Style}>6. Contact Information</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              If you have any questions about this Privacy Policy or browser-local processing, please contact us at: <a href="mailto:privacy@imagepine.com" style={{ color: '#5B5BD6', fontWeight: 600, textDecoration: 'none' }}>privacy@imagepine.com</a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
