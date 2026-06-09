"use client";

import React, { useState } from 'react';

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: 'd152ecf8-147d-4b5e-88fa-26856110c736',
          name: name,
          email: email,
          subject: subject || 'Contact from ImagePine',
          message: message,
          from_name: 'ImagePine Contact Support'
        })
      });

      const result = await response.json();
      if (response.status === 200 || result.success) {
        setFormSubmitted(true);
      } else {
        setErrorMsg(result.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Web3Forms submit error:', error);
      setErrorMsg('Failed to send message. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: '#6B6B8A',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 6,
    display: 'block'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: '#F7F7FB',
    border: '1px solid #E4E4EF',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    color: '#111128',
    outline: 'none',
    transition: 'all 0.18s ease',
    fontFamily: 'inherit',
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
            Support & Feedback
          </span>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 900,
            color: '#111128',
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            margin: '0 0 16px'
          }}>
            Contact <span style={{
              background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Us</span>
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 2vw, 17px)',
            color: '#6B6B8A',
            lineHeight: 1.6,
            maxWidth: 580,
            margin: '0 auto'
          }}>
            Have questions, feedback, or custom feature requests? Send us a message and we'll get back to you as soon as possible.
          </p>
        </section>

        {/* Main Grid: Form + Info Panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Form Area */}
          <div className="md:col-span-7" style={cardStyle}>
            {formSubmitted ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: '#DCFCE7', color: '#16A34A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(22,163,74,0.15)'
                }}>
                  <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111128', margin: 0 }}>Message Sent!</h3>
                <p style={{ fontSize: 13, color: '#6B6B8A', lineHeight: 1.6, margin: 0, maxWidth: 300 }}>
                  Thank you for reaching out, <strong>{name}</strong>. We have received your message and will respond shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFormSubmitted(false);
                    setName(''); setEmail(''); setSubject(''); setMessage('');
                  }}
                  style={{
                    background: '#EDEDFB', color: '#5B5BD6', border: 'none',
                    borderRadius: 10, padding: '10px 20px', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', marginTop: 10, transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#E0E0FB'}
                  onMouseLeave={e => e.currentTarget.style.background = '#EDEDFB'}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111128', margin: 0 }}>Send a Message</h2>
                
                <div>
                  <label style={labelStyle}>Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={inputStyle}
                    placeholder="Enter your name"
                    onFocus={e => { e.target.style.borderColor = '#5B5BD6'; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#E4E4EF'; e.target.style.background = '#F7F7FB'; }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="you@example.com"
                    onFocus={e => { e.target.style.borderColor = '#5B5BD6'; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#E4E4EF'; e.target.style.background = '#F7F7FB'; }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={inputStyle}
                    placeholder="What is this regarding?"
                    onFocus={e => { e.target.style.borderColor = '#5B5BD6'; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#E4E4EF'; e.target.style.background = '#F7F7FB'; }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    placeholder="Write your message here..."
                    onFocus={e => { e.target.style.borderColor = '#5B5BD6'; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#E4E4EF'; e.target.style.background = '#F7F7FB'; }}
                  />
                </div>

                {errorMsg && (
                  <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700, margin: '2px 0 6px' }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                    color: '#fff', fontWeight: 800, fontSize: 13,
                    borderRadius: 12, padding: '12px 20px', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, transition: 'all 0.2s ease', marginTop: 8,
                    boxShadow: '0 4px 16px rgba(91,91,214,0.3)',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                  onMouseEnter={e => {
                    if (!isSubmitting) {
                      e.currentTarget.style.boxShadow = '0 6px 24px rgba(91,91,214,0.4)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSubmitting) {
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,91,214,0.3)';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar info area */}
          <div className="md:col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Quick contact */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111128', margin: 0 }}>Direct Support</h3>
              <p style={{ fontSize: 13, color: '#6B6B8A', lineHeight: 1.6, margin: 0 }}>
                Prefer sending an email directly? Reach us at:
              </p>
              <a href="mailto:helloimagepine@gmail.com" style={{
                fontSize: 15, fontWeight: 700, color: '#5B5BD6', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                helloimagepine@gmail.com
              </a>
            </div>

            {/* Privacy Promise */}
            <div style={{ ...cardStyle, background: '#EDEDFB', borderColor: '#D8D8F5' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: '#fff',
                  color: '#5B5BD6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#111128', margin: '0 0 4px' }}>Privacy Guarantee</h4>
                  <p style={{ fontSize: 11, color: '#6B6B8A', lineHeight: 1.6, margin: 0 }}>
                    We never share your email address or form data. Everything is encrypted in transit and deleted immediately after review.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
