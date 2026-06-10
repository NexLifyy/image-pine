"use client";

import React, { useState, useRef, useEffect } from 'react';
import { routeMap, navbarSections as sections } from '@/lib/routes';
import { useLanguage } from '@/lib/LanguageContext';

export default function Navbar() {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const mobileRef = useRef(null);

  // Close mobile menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        mobileRef.current && 
        !mobileRef.current.contains(e.target) &&
        !e.target.closest('button[aria-label="Toggle menu"]')
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getHref = (item) => routeMap[item] || '#';

  return (
    <header
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E4E4EF',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* ── Logo ── */}
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
        >
          <svg viewBox="0 0 1000 1000" width="34" height="34" style={{ flexShrink: 0 }}>
            <g>
              <path fill="#7342E6" d="M378.36,98.21c16.23,13.64,32.4,29.41,48.42,42.61c-10.54-28.43-20.77-56.38-30.65-84.19H328.3C344.96,70.51,361.61,84.4,378.36,98.21z"/>
              <path fill="#7342E6" d="M724.03,56.63h-10c-24.29,36.59-48.84,73.05-73.7,109.36l-29.1,41.51c-4.31,6.01-11.98,15.66-15.41,21.67c57.97-24.53,117.3-47.35,175.58-71.38c-66,56.16-130.35,114.81-196.27,170.99c71.76,18.82,124.19,47.98,160.92,106.89c10.74,17.26,19.25,35.49,25.37,54.35c22.28,69.54,21.59,170.56-1.84,239.88c-19.61,58.01-64.72,110.67-127.53,138.98c-63.5,28.63-156.62,30.91-224.89,13.12c-63.4-16.52-112.09-52.07-143.14-103.02c-51.11-83.88-51.31-206.09-21.75-295.37c18.81-56.81,65.85-110.16,126.55-136.96c19.43-8.58,35.21-13.09,56.32-17.58c-13.91-12.08-28.52-23.56-42.57-35.57c-52.5-44.65-104.4-89.83-155.69-135.52c59.18,22.32,120.21,50.04,179.22,72.9c-42.68-57.09-83.43-115.23-122.45-174.24h-7.7c-121.14,0-219.34,98.2-219.34,219.34v448.06c0,121.14,98.2,219.34,219.34,219.34h448.06c121.14,0,219.34-98.2,219.34-219.34V275.97C943.37,154.83,845.17,56.63,724.03,56.63z"/>
              <path fill="#7342E6" d="M603.36,56.63c-9.62,27.75-19.57,54.57-31.98,83.18c31.9-28.2,64.83-55.77,97.93-83.18H603.36z"/>
            </g>
          </svg>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#111128', letterSpacing: '-0.03em' }}>
            Image<span style={{ color: '#7342E6' }}>Pine</span>
          </span>
        </a>

        {/* ── Desktop Nav ── */}
        <nav className="hidden lg:flex" style={{ alignItems: 'center', gap: 4 }}>
          {Object.entries(sections).map(([key, section]) => (
            <div key={key} className="group" style={{ position: 'relative', padding: '8px 4px' }}>
              <button
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 13, fontWeight: 600, color: '#6B6B8A',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '5px 10px', borderRadius: 8,
                  transition: 'all 0.15s ease',
                }}
                className="group-hover:text-[#111128] group-hover:bg-[#F7F7FB]"
              >
                {t(section.title)}
                <svg style={{ width: 12, height: 12, transition: 'transform 0.2s ease' }} className="group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                  minWidth: 200,
                  background: '#fff',
                  border: '1px solid #E4E4EF',
                  borderRadius: 12,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.05)',
                  padding: 6,
                  zIndex: 200,
                }}
                className="opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto transition-all duration-200"
              >
                {section.items.map((item) => {
                  const href = getHref(item);
                  return (
                    <a
                      key={item}
                      href={href}
                      onClick={href === '#' ? (e) => e.preventDefault() : undefined}
                      style={{
                        display: 'block',
                        padding: '7px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#6B6B8A',
                        borderRadius: 8,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                      }}
                      className="hover:bg-[#F7F7FB] hover:text-[#111128]"
                    >
                      {t(item)}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Right CTA ── */}
        <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 8 }}>
          <a
            href="/contact"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid #D1D1E4',
              color: '#4E4E6D',
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 99,
              textDecoration: 'none',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#F7F7FB';
              e.currentTarget.style.borderColor = '#9898B5';
              e.currentTarget.style.color = '#111128';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#D1D1E4';
              e.currentTarget.style.color = '#4E4E6D';
            }}
          >
            {t('Contact Us')}
          </a>
          <a
            href="https://buymeacoffee.com/imagepine"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#7342e6',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 99,
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(115, 66, 230, 0.3)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(115, 66, 230, 0.45)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(115, 66, 230, 0.3)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
            {t('Buy Us a Coffee')}
          </a>
        </div>

        {/* ── Mobile Hamburger ── */}
        <button
          className="lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          type="button"
          style={{
            padding: 8, background: 'none', border: 'none', cursor: 'pointer',
            color: '#6B6B8A',
          }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div
          ref={mobileRef}
          style={{
            borderTop: '1px solid #E4E4EF',
            background: '#fff',
            maxHeight: 'calc(100vh - 60px)',
            overflowY: 'auto',
            padding: '12px 16px 20px',
          }}
          className="lg:hidden animate-fade-in"
        >
          {Object.entries(sections).map(([key, section]) => (
            <div key={key} style={{ borderBottom: '1px solid #F1F1F7', marginBottom: 2 }}>
              <button
                onClick={() => setOpenSection(openSection === key ? null : key)}
                type="button"
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '10px 4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, color: '#111128',
                  letterSpacing: '0.02em', textTransform: 'uppercase',
                }}
              >
                {t(section.title)}
                <svg
                  style={{ width: 13, height: 13, color: '#9898B5', transition: 'transform 0.2s', transform: openSection === key ? 'rotate(180deg)' : 'none' }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openSection === key && (
                <div style={{ padding: '4px 0 10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }} className="animate-fade-in">
                  {section.items.map((item) => {
                    const href = getHref(item);
                    return (
                      <a
                        key={item}
                        href={href}
                        onClick={href === '#' ? (e) => e.preventDefault() : undefined}
                        style={{
                          display: 'block',
                          padding: '7px 10px',
                          fontSize: 12, fontWeight: 600, color: '#6B6B8A',
                          borderRadius: 8, textDecoration: 'none',
                        }}
                        className="hover:bg-[#F7F7FB] hover:text-[#111128]"
                      >
                        {t(item)}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F1F7', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href="/contact"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                border: '1px solid #D1D1E4',
                color: '#4E4E6D',
                fontSize: 12,
                fontWeight: 700,
                padding: '10px',
                borderRadius: 10,
                textDecoration: 'none',
              }}
            >
              {t('Contact Us')}
            </a>
            <a
              href="https://buymeacoffee.com/imagepine"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: '#7342e6',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                padding: '10px',
                borderRadius: 10,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(115, 66, 230, 0.3)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                <line x1="6" y1="2" x2="6" y2="4" />
                <line x1="10" y1="2" x2="10" y2="4" />
                <line x1="14" y1="2" x2="14" y2="4" />
              </svg>
              {t('Buy Us a Coffee')}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
