"use client";
import React, { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ToolPageShell - shared premium layout for all tool pages.
 *
 * Props:
 *   title       string - h1 page title
 *   subtitle    string - short subtitle below title
 *   features    Array<{icon:ReactNode, title:string, desc:string}>
 *   steps       Array<{n:string, title:string, desc:string}>
 *   faqs        Array<{q:string, a:string}>
 *   seoText     string - descriptive SEO paragraph
 *   children    ReactNode - the tool workspace (upload box + controls)
 *   accent      string - optional accent color (default '#5B5BD6')
 */
export default function ToolPageShell({
  title,
  subtitle,
  features = [],
  steps = [],
  faqs = [],
  seoText = '',
  children,
  accent = '#5B5BD6',
}) {
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);

  const accentLight = accent + '18';
  const accentBorder = accent + '30';

  return (
    <div style={{ background: '#F7F7FB', minHeight: '100%', fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>

      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '52px 24px 32px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: 'clamp(26px,5vw,44px)',
          fontWeight: 900, color: '#111128',
          letterSpacing: '-0.04em', lineHeight: 1.1,
          margin: '0 0 12px',
        }}>
          {t(title)}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 'clamp(14px,2vw,17px)', color: '#6B6B8A',
            fontWeight: 400, lineHeight: 1.6,
            maxWidth: 540, margin: '0 auto 0',
          }}>
            {t(subtitle)}
          </p>
        )}
      </section>

      {/* ─── TOOL WORKSPACE ───────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 56px' }}>
        {children}
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────────── */}
      {features.length > 0 && (
        <section style={{ background: '#fff', borderTop: '1px solid #E4E4EF', padding: '64px 24px' }}>
          <div style={{ maxWidth: 1060, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{
                fontSize: 'clamp(20px,3.5vw,30px)', fontWeight: 900,
                color: '#111128', letterSpacing: '-0.03em', margin: '0 0 8px',
              }}>
                {t('Why Choose This Tool?')}
              </h2>
              <p style={{ fontSize: 14, color: '#9898B5', fontWeight: 400, margin: 0 }}>
                {t('Built for speed, quality and complete privacy.')}
              </p>
            </div>
            <div className="features-grid" style={{ gap: 16 }}>
              {features.map(({ icon, title: ftitle, desc }) => (
                <div
                  key={ftitle}
                  style={{
                    background: '#fff', border: '1px solid #E4E4EF',
                    borderRadius: 16, padding: '22px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = accentBorder;
                    e.currentTarget.style.boxShadow = `0 4px 24px ${accentLight}`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#E4E4EF';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = '';
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 11,
                    background: accentLight, color: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icon}
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111128', margin: 0 }}>{t(ftitle)}</h3>
                  <p style={{ fontSize: 12, color: '#9898B5', lineHeight: 1.65, margin: 0 }}>{t(desc)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────── */}
      {steps.length > 0 && (
        <section style={{ background: '#F7F7FB', borderTop: '1px solid #E4E4EF', padding: '64px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{
                fontSize: 'clamp(20px,3.5vw,30px)', fontWeight: 900,
                color: '#111128', letterSpacing: '-0.03em', margin: '0 0 8px',
              }}>
                {t('How It Works')}
              </h2>
              <p style={{ fontSize: 14, color: '#9898B5', fontWeight: 400, margin: 0 }}>
                {t('Simple steps to get your result.')}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 28 }}>
              {steps.map(({ n, title: stitle, desc }) => (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${accent} 0%, #7C3AED 100%)`,
                    color: '#fff', fontWeight: 900, fontSize: 17,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${accentLight}`,
                    letterSpacing: '-0.03em',
                  }}>{n}</div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111128', margin: 0 }}>{t(stitle)}</h4>
                  <p style={{ fontSize: 12, color: '#9898B5', fontWeight: 400, lineHeight: 1.6, margin: 0 }}>{t(desc)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FAQ ──────────────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section style={{ background: '#fff', borderTop: '1px solid #E4E4EF', padding: '64px 24px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <h2 style={{
                fontSize: 'clamp(20px,3.5vw,30px)', fontWeight: 900,
                color: '#111128', letterSpacing: '-0.03em', margin: '0 0 8px',
              }}>
                {t('Frequently Asked Questions')}
              </h2>
              <p style={{ fontSize: 14, color: '#9898B5', fontWeight: 400, margin: 0 }}>
                {t('Quick answers to common questions.')}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {faqs.map((faq, idx) => (
                <div key={idx} style={{
                  background: '#fff',
                  border: `1px solid ${openFaq === idx ? accentBorder : '#E4E4EF'}`,
                  borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s',
                }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '16px 18px',
                      background: 'none', border: 'none', cursor: 'pointer', gap: 14, textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111128' }}>{t(faq.q)}</span>
                    <div style={{
                      width: 22, height: 22,
                      background: openFaq === idx ? accentLight : '#F7F7FB',
                      border: `1px solid ${openFaq === idx ? accentBorder : '#E4E4EF'}`,
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transform: openFaq === idx ? 'rotate(180deg)' : 'none', transition: 'all 0.2s',
                    }}>
                      <svg width="10" height="10" fill="none" stroke={openFaq === idx ? accent : '#9898B5'} viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {openFaq === idx && (
                    <div style={{ padding: '0 18px 16px', borderTop: '1px solid #F1F1F7' }}>
                      <p style={{ fontSize: 12, color: '#6B6B8A', lineHeight: 1.7, margin: '10px 0 0' }}>{t(faq.a)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── SEO TEXT ─────────────────────────────────────────────────── */}
      {seoText && (
        <section style={{ background: '#F7F7FB', borderTop: '1px solid #E4E4EF', padding: '48px 24px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <p style={{ fontSize: 13, color: '#9898B5', lineHeight: 1.8, fontWeight: 400, margin: 0 }}>{t(seoText)}</p>
          </div>
        </section>
      )}
    </div>
  );
}
