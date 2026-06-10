"use client";

import React from 'react';
import { routeMap, footerColumns as columns } from '@/lib/routes';

export default function Footer() {
  const getHref = (item) => routeMap[item] || '#';

  const [selectedLanguage, setSelectedLanguage] = React.useState('en');

  React.useEffect(() => {
    // Helper to get cookie value
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    const setTranslationCookie = (lang) => {
      const cookieValue = `/en/${lang}`;
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const domainParts = hostname.split('.');
        if (domainParts.length > 2) {
          // If it's a subdomain (e.g. www.imagepine.com), set it on the root domain .imagepine.com
          const rootDomain = `.${domainParts.slice(-2).join('.')}`;
          document.cookie = `googtrans=${cookieValue}; path=/; domain=${rootDomain};`;
        }
      }
    };

    const supported = ['en', 'es', 'fr', 'de', 'it', 'pt', 'bn', 'si', 'nl', 'ja', 'zh-CN', 'ko', 'sv', 'tr', 'id', 'pl'];
    
    // Check if the user has a manually saved language preference
    const manualLang = localStorage.getItem('imagepine_lang_manual');
    // Check if we already detected the language for this session
    const sessionDetectedLang = sessionStorage.getItem('imagepine_lang_detected');

    let targetLang = 'en';

    if (manualLang && supported.includes(manualLang)) {
      targetLang = manualLang;
      setSelectedLanguage(targetLang);
      
      // Sync cookie if necessary
      const currentCookie = getCookie('googtrans');
      const expectedCookieValue = `/en/${targetLang}`;
      if (!currentCookie || decodeURIComponent(currentCookie) !== expectedCookieValue) {
        setTranslationCookie(targetLang);
        window.location.reload();
      }
    } else if (sessionDetectedLang && supported.includes(sessionDetectedLang)) {
      targetLang = sessionDetectedLang;
      setSelectedLanguage(targetLang);

      // Sync cookie if necessary
      const currentCookie = getCookie('googtrans');
      const expectedCookieValue = `/en/${targetLang}`;
      if (!currentCookie || decodeURIComponent(currentCookie) !== expectedCookieValue) {
        setTranslationCookie(targetLang);
        window.location.reload();
      }
    } else {
      // Auto-detect language
      const autoDetect = async () => {
        let detected = 'en';
        try {
          // 1. Try IP-based detection first
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          // ipapi returns languages like "en-US,es-US,ca,es-MX" or "en"
          if (data.languages) {
            const ipLangs = data.languages.split(',');
            for (let lang of ipLangs) {
              const code = lang.split('-')[0].toLowerCase();
              let checkCode = code;
              if (code === 'zh') {
                checkCode = 'zh-CN';
              }
              if (supported.includes(checkCode)) {
                detected = checkCode;
                break;
              }
            }
          }
          
          // 2. If IP fails, check browser navigator language
          if (detected === 'en' && navigator.language) {
            const browserCode = navigator.language.split('-')[0].toLowerCase();
            let checkCode = browserCode;
            if (browserCode === 'zh') {
              checkCode = 'zh-CN';
            }
            if (supported.includes(checkCode)) {
              detected = checkCode;
            }
          }
        } catch (err) {
          // 3. Fallback to browser language
          if (navigator.language) {
            const browserCode = navigator.language.split('-')[0].toLowerCase();
            let checkCode = browserCode;
            if (browserCode === 'zh') {
              checkCode = 'zh-CN';
            }
            if (supported.includes(checkCode)) {
              detected = checkCode;
            }
          }
        }

        // Cache the auto-detected result for this session
        sessionStorage.setItem('imagepine_lang_detected', detected);
        setSelectedLanguage(detected);

        // Apply cookie and refresh if language is not English
        if (detected !== 'en') {
          setTranslationCookie(detected);
          window.location.reload();
        } else {
          // If default English, clear cookie if one was set
          const currentCookie = getCookie('googtrans');
          if (currentCookie && decodeURIComponent(currentCookie) !== '/en/en') {
            setTranslationCookie('en');
            window.location.reload();
          }
        }
      };

      autoDetect();
    }

    // Load Google Translate Element script if not already present
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,es,fr,de,it,pt,bn,si,nl,ja,zh-CN,ko,sv,tr,id,pl',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');
      };

      const addScript = () => {
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(s);
      };

      if (!document.getElementById('google_translate_element')) {
        const div = document.createElement('div');
        div.id = 'google_translate_element';
        div.style.display = 'none';
        document.body.appendChild(div);
      }

      addScript();
    }
  }, []);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    
    // Save to localStorage as a manual override
    localStorage.setItem('imagepine_lang_manual', lang);
    
    // Set cookie
    const cookieValue = `/en/${lang}`;
    document.cookie = `googtrans=${cookieValue}; path=/;`;
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const domainParts = hostname.split('.');
      if (domainParts.length > 2) {
        const rootDomain = `.${domainParts.slice(-2).join('.')}`;
        document.cookie = `googtrans=${cookieValue}; path=/; domain=${rootDomain};`;
      }
      // Force reload to apply immediately
      window.location.reload();
    }
  };

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
              <svg viewBox="0 0 1000 1000" width="30" height="30" style={{ flexShrink: 0 }}>
                <g>
                  <path fill="#7342E6" d="M378.36,98.21c16.23,13.64,32.4,29.41,48.42,42.61c-10.54-28.43-20.77-56.38-30.65-84.19H328.3C344.96,70.51,361.61,84.4,378.36,98.21z"/>
                  <path fill="#7342E6" d="M724.03,56.63h-10c-24.29,36.59-48.84,73.05-73.7,109.36l-29.1,41.51c-4.31,6.01-11.98,15.66-15.41,21.67c57.97-24.53,117.3-47.35,175.58-71.38c-66,56.16-130.35,114.81-196.27,170.99c71.76,18.82,124.19,47.98,160.92,106.89c10.74,17.26,19.25,35.49,25.37,54.35c22.28,69.54,21.59,170.56-1.84,239.88c-19.61,58.01-64.72,110.67-127.53,138.98c-63.5,28.63-156.62,30.91-224.89,13.12c-63.4-16.52-112.09-52.07-143.14-103.02c-51.11-83.88-51.31-206.09-21.75-295.37c18.81-56.81,65.85-110.16,126.55-136.96c19.43-8.58,35.21-13.09,56.32-17.58c-13.91-12.08-28.52-23.56-42.57-35.57c-52.5-44.65-104.4-89.83-155.69-135.52c59.18,22.32,120.21,50.04,179.22,72.9c-42.68-57.09-83.43-115.23-122.45-174.24h-7.7c-121.14,0-219.34,98.2-219.34,219.34v448.06c0,121.14,98.2,219.34,219.34,219.34h448.06c121.14,0,219.34-98.2,219.34-219.34V275.97C943.37,154.83,845.17,56.63,724.03,56.63z"/>
                  <path fill="#7342E6" d="M603.36,56.63c-9.62,27.75-19.57,54.57-31.98,83.18c31.9-28.2,64.83-55.77,97.93-83.18H603.36z"/>
                </g>
              </svg>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#111128', letterSpacing: '-0.03em' }}>
                Image<span style={{ color: '#7342E6' }}>Pine</span>
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
          {[columns.imageTools, columns.studioTools, columns.convert, columns.pdfTools].map((col, i) => (
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
          <p style={{ fontSize: 11, color: '#9898B5', fontWeight: 500, margin: 0 }}>
            © {new Date().getFullYear()} ImagePine. All rights reserved.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" fill="none" stroke="#9898B5" viewBox="0 0 24 24" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <select
                value={selectedLanguage}
                onChange={handleLanguageChange}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9898B5',
                  fontSize: 11,
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                  padding: '2px 0',
                  fontFamily: 'inherit',
                  transition: 'color 0.15s'
                }}
                className="hover:text-[#111128]"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="bn">বাংলা</option>
                <option value="si">සිංහල</option>
                <option value="nl">Dutch</option>
                <option value="ja">日本語</option>
                <option value="zh-CN">简体中文</option>
                <option value="ko">한국어</option>
                <option value="sv">Svenska</option>
                <option value="tr">Türkçe</option>
                <option value="id">Bahasa Indonesia</option>
                <option value="pl">Polish</option>
              </select>
            </div>

            <span style={{ color: '#E4E4EF', fontSize: 11, display: 'inline-block' }}>|</span>

            <a href="/contact" style={{ fontSize: 11, color: '#9898B5', fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }} className="hover:text-[#111128]">Contact Us</a>
            <a href="/privacy" style={{ fontSize: 11, color: '#9898B5', fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }} className="hover:text-[#111128]">Privacy Policy</a>
            <a href="/terms" style={{ fontSize: 11, color: '#9898B5', fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }} className="hover:text-[#111128]">Terms of Service</a>
          </div>

          {/* Clean Google Translate styles overrides */}
          <style dangerouslySetInnerHTML={{__html: `
            /* Hide Google Translate Top Banner and Widget elements */
            #goog-gt-tt, 
            .goog-gt-tt, 
            .goog-te-banner-frame, 
            .goog-te-banner-frame.skiptranslate,
            .goog-te-banner, 
            .goog-te-balloon-frame,
            .goog-tooltip, 
            .goog-tooltip:hover,
            .goog-text-highlight,
            #google_translate_element,
            .goog-te-gadget,
            .goog-te-gadget-icon,
            .goog-te-gadget-simple,
            .goog-logo-link,
            .goog-te-menu-value,
            .goog-te-menu-frame,
            iframe.skiptranslate,
            iframe.translation-iframe {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
              height: 0 !important;
              width: 0 !important;
            }
            body {
              top: 0px !important;
              position: static !important;
            }
            font {
              background-color: transparent !important;
              box-shadow: none !important;
            }
          `}} />
        </div>
      </div>
    </footer>
  );
}
