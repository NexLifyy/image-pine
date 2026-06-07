"use client";

import React from 'react';
import { routeMap, footerColumns as columns } from '@/lib/routes';

export default function Footer() {
  const getHref = (item) => routeMap[item] || '#';

  return (
    <footer style={{
      background: '#fff',
      borderTop: '1px solid #E4E4EF',
      padding: '52px 24px 32px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Top row: Brand + Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10" style={{ marginBottom: 48 }}>

          {/* Brand Column */}
          <div>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginBottom: 14 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(91,91,214,0.3)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L8 8H5l7 7-2 2H9l3 5 3-5h-1l-2-2 7-7h-3L12 2z" />
                </svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#111128', letterSpacing: '-0.03em' }}>
                Image<span style={{ color: '#5B5BD6' }}>Pine</span>
              </span>
            </a>
            <p style={{ fontSize: 12, color: '#9898B5', lineHeight: 1.65, marginBottom: 16, fontWeight: 500, maxWidth: 200 }}>
              Free, fast, and private image tools. Everything runs in your browser.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#EDEDFB', color: '#5B5BD6',
              fontSize: 10, fontWeight: 700,
              padding: '4px 10px', borderRadius: 99,
              letterSpacing: '0.04em',
            }}>
              <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="6" r="3" /></svg>
              100% Free
            </div>
          </div>

          {/* Link Columns */}
          {[columns.imageTools, columns.convert, columns.pdfTools, columns.about].map((col, i) => (
            <div key={i}>
              <h4 style={{
                fontSize: 10, fontWeight: 800, color: '#9898B5',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.items.map((item) => {
                  const href = getHref(item);
                  return (
                    <li key={item}>
                      <a
                        href={href}
                        onClick={href === '#' ? (e) => e.preventDefault() : undefined}
                        style={{
                          fontSize: 12, fontWeight: 500, color: '#6B6B8A',
                          textDecoration: 'none', transition: 'color 0.15s ease',
                          display: 'inline-block',
                        }}
                        className="hover:text-[#111128]"
                      >
                        {item}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid #F1F1F7',
          paddingTop: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <p style={{ fontSize: 11, color: '#9898B5', fontWeight: 500 }}>
            © {new Date().getFullYear()} ImagePine. All rights reserved.
          </p>
          <p style={{ fontSize: 11, color: '#9898B5', fontWeight: 500 }}>
            All processing is local - your images never leave your device.
          </p>
        </div>
      </div>
    </footer>
  );
}
