"use client";

import React, { useState, useEffect, useRef } from "react";

const COOKIE_SUBSCRIBED = "ip_subscribed";
const COOKIE_DISMISSED  = "ip_popup_dismissed";
const DISMISS_DAYS = 7;
const DELAY_MS = 15000;

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

function loadTurnstileScript(onReady) {
  if (typeof window === "undefined") return;
  if (window.turnstile) { onReady(); return; }
  if (document.getElementById("cf-turnstile-script")) {
    // Script already injected, wait for it
    const poll = setInterval(() => {
      if (window.turnstile) { clearInterval(poll); onReady(); }
    }, 100);
    return;
  }
  const s = document.createElement("script");
  s.id = "cf-turnstile-script";
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  s.async = true;
  s.defer = true;
  s.onload = onReady;
  document.head.appendChild(s);
}

export default function EmailPopup() {
  const [visible, setVisible]   = useState(false);
  const [email, setEmail]       = useState("");
  const [status, setStatus]     = useState("idle");
  const [message, setMessage]   = useState("");
  const widgetIdRef             = useRef(null);

  // Load Turnstile script immediately (before popup shows) so it is ready
  useEffect(() => {
    loadTurnstileScript(() => {}); // preload silently
  }, []);

  // Show popup after delay if no blocking cookie
  useEffect(() => {
    if (getCookie(COOKIE_SUBSCRIBED) || getCookie(COOKIE_DISMISSED)) return;
    const t = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Render Turnstile widget once popup is visible
  useEffect(() => {
    if (!visible) return;
    loadTurnstileScript(() => {
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render("#ts-container", {
        sitekey: "0x4AAAAAADrNW5KrdQ4s-r47",
        size: "invisible",
        callback: () => {},
      });
    });
  }, [visible]);

  const handleDismiss = () => {
    setCookie(COOKIE_DISMISSED, "1", DISMISS_DAYS);
    setVisible(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "loading") return;
    if (!email.trim()) { setMessage("Please enter your email."); return; }
    setStatus("loading");
    setMessage("");
    try {
      let token = "";
      if (window.turnstile && widgetIdRef.current !== null) {
        token = await new Promise((resolve, reject) => {
          window.turnstile.execute(widgetIdRef.current, {
            callback: resolve,
            "error-callback": () => reject(new Error("turnstile-error")),
          });
        });
      }
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
        setMessage(data.message || "You're on the list!");
        setCookie(COOKIE_SUBSCRIBED, "1", 3650);
        setTimeout(() => setVisible(false), 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      }
    } catch (err) {
      setStatus("error");
      setMessage(err.message === "turnstile-error"
        ? "Verification failed. Please try again."
        : "Something went wrong. Please try again.");
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position:"fixed",inset:0,zIndex:9998,
          background:"rgba(10,10,30,0.45)",
          backdropFilter:"blur(3px)",
          WebkitBackdropFilter:"blur(3px)",
          animation:"ts-fade-in 0.25s ease forwards",
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Subscribe to ImagePine updates"
        style={{
          position:"fixed",inset:0,zIndex:9999,
          display:"flex",alignItems:"center",justifyContent:"center",
          padding:"16px",pointerEvents:"none",
        }}
      >
        <div style={{
          pointerEvents:"auto",position:"relative",
          background:"#fff",borderRadius:24,
          padding:"40px 36px 32px",width:"100%",maxWidth:440,
          boxShadow:"0 24px 80px -8px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
          animation:"ts-slide-up 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
          overflow:"hidden",
        }}>

          {/* Decorative blob */}
          <div style={{
            position:"absolute",top:-60,right:-60,
            width:200,height:200,borderRadius:"50%",
            background:"radial-gradient(circle, rgba(115,66,230,0.12) 0%, transparent 70%)",
            pointerEvents:"none",
          }}/>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            aria-label="Close popup"
            style={{
              position:"absolute",top:16,right:16,
              background:"#F4F4F8",border:"none",borderRadius:8,
              width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"pointer",color:"#888",transition:"background 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.background="#EBEBF5"}
            onMouseLeave={e=>e.currentTarget.style.background="#F4F4F8"}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Icon */}
          <div style={{
            width:52,height:52,borderRadius:14,marginBottom:20,
            background:"linear-gradient(135deg,#7342E6 0%,#5B5BD6 100%)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 8px 24px -4px rgba(115,66,230,0.4)",
          }}>
            <svg width="24" height="24" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
              <path d="M2 9l10 7 10-7"/>
            </svg>
          </div>

          {/* Heading */}
          <h2 style={{
            margin:"0 0 8px",fontSize:22,fontWeight:800,color:"#111128",
            lineHeight:1.25,letterSpacing:"-0.02em",
          }}>
            Something new is always<br/>brewing at ImagePine
          </h2>
          <p style={{margin:"0 0 24px",fontSize:14,color:"#6B6B8A",lineHeight:1.55}}>
            Be the first to try our new free tools and features.
          </p>

          {status === "success" ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"24px 0"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"#ECFDF5",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="26" height="26" fill="none" stroke="#10B981" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p style={{fontSize:16,fontWeight:700,color:"#065F46",margin:0}}>{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input
                  id="popup-email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e=>{setEmail(e.target.value);setMessage("");setStatus("idle");}}
                  disabled={status==="loading"}
                  required
                  style={{
                    width:"100%",boxSizing:"border-box",
                    padding:"12px 16px",borderRadius:12,
                    border:`1.5px solid ${status==="error"?"#FCA5A5":"#E4E4EF"}`,
                    background:"#F7F7FB",fontSize:14,fontWeight:500,color:"#111128",
                    outline:"none",transition:"border-color 0.15s",
                    fontFamily:"inherit",
                  }}
                  onFocus={e=>{e.target.style.borderColor="#7342E6";e.target.style.background="#fff";}}
                  onBlur={e=>{e.target.style.borderColor=status==="error"?"#FCA5A5":"#E4E4EF";e.target.style.background="#F7F7FB";}}
                />

                {message && status==="error" && (
                  <p style={{margin:0,fontSize:12,color:"#B91C1C",fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status==="loading"}
                  style={{
                    width:"100%",padding:"13px 16px",borderRadius:12,border:"none",
                    background:status==="loading"?"#A78BFA":"linear-gradient(135deg,#7342E6 0%,#5B5BD6 100%)",
                    color:"#fff",fontSize:15,fontWeight:700,
                    cursor:status==="loading"?"not-allowed":"pointer",
                    transition:"opacity 0.15s,transform 0.15s",
                    boxShadow:"0 4px 16px -4px rgba(115,66,230,0.45)",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                    fontFamily:"inherit",
                  }}
                  onMouseEnter={e=>{if(status!=="loading")e.currentTarget.style.opacity="0.9";}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}
                >
                  {status==="loading"?(
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{animation:"ts-spin 0.8s linear infinite"}}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Verifying&#x2026;
                    </>
                  ):"Keep Me Posted"}
                </button>
              </div>

              {/* Invisible Turnstile widget */}
              <div id="ts-container"/>

              <p style={{margin:"14px 0 0",textAlign:"center",fontSize:11,color:"#9898B5",fontWeight:500}}>
                No spam. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ts-fade-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes ts-slide-up { from { opacity:0; transform:translateY(28px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes ts-spin     { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}