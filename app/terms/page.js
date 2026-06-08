"use client";

import React from 'react';

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 2vw, 16px)',
            color: '#6B6B8A',
            lineHeight: 1.6,
            maxWidth: 580,
            margin: '0 auto'
          }}>
            Simple, fair, and transparent terms for using our online tools. No surprises, no hidden traps.
          </p>
        </section>

        {/* Content Card */}
        <div style={cardStyle}>
          
          <div>
            <h2 style={h2Style}>1. Terms Acceptance</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              By accessing and using ImagePine ("we", "our", "us"), you agree to comply with and be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our services.
            </p>
          </div>

          <div>
            <h2 style={h2Style}>2. License and Permitted Use</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              We grant you a free, non-exclusive, non-transferable, revocable license to access and use our web application for processing files.
            </p>
            <p style={{ ...pStyle, marginTop: 10 }}>
              You are permitted to use our resizing, compression, cropping, rotation, and document compilation tools for both <strong>personal and commercial purposes</strong>. There are no subscriptions, processing charges, or licenses needed to sell or use output files processed by ImagePine.
            </p>
          </div>

          <div>
            <h2 style={h2Style}>3. Image Ownership and Rights</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              You retain 100% ownership, intellectual property rights, and copyright titles of all files, images, vector graphics, and documents you process through our tools.
            </p>
            <p style={{ ...pStyle, marginTop: 10 }}>
              Since all processing runs strictly inside your local browser instance, we do not obtain licenses, databases, copies, or access rights to any content you interact with.
            </p>
          </div>

          <div>
            <h2 style={h2Style}>4. Prohibited Uses</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              You agree not to use ImagePine to:
            </p>
            <ul style={{ paddingLeft: 20, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#6B6B8A', lineHeight: 1.6 }}>
              <li>Attempt to scrape, reverse engineer, copy or clone our application code.</li>
              <li>Inject malware, scripts, or harmful packages that could damage user performance.</li>
              <li>Use automatic scripts or headless browsers in a way that disrupts web application availability or resources.</li>
            </ul>
          </div>

          <div>
            <h2 style={h2Style}>5. Disclaimer of Warranties</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              ImagePine is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            <p style={{ ...pStyle, marginTop: 10 }}>
              We do not warrant that our tool outputs will be completely free of visual artifacts, that the compression ratio will meet specific standards, or that the application will operate continuously without interruption.
            </p>
          </div>

          <div>
            <h2 style={h2Style}>6. Limitation of Liability</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              In no event shall ImagePine or its developers be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to damages for loss of profits, goodwill, data, or other intangible losses arising from the use of or inability to use this service.
            </p>
          </div>

          <div>
            <h2 style={h2Style}>7. Contact Us</h2>
            <p style={{ ...pStyle, marginTop: 12 }}>
              If you have any questions or feedback regarding these Terms, please email us at: <a href="mailto:helloimagepine@gmail.com" style={{ color: '#5B5BD6', fontWeight: 600, textDecoration: 'none' }}>helloimagepine@gmail.com</a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
