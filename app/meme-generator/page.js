"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>), title: 'Classic Meme Style', desc: 'Render captions in the iconic Impact font with bold outlines.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M19 8l-7 7-3-3"/></svg>), title: 'Draggable Text', desc: 'Click and drag text directly on the canvas to place it perfectly.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>), title: '100% Private', desc: 'All meme rendering happens client-side. Your photos are safe.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4"/></svg>), title: 'High-Res Export', desc: 'Export memes at full resolution with no compression loss.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3v18M3 12h18"/></svg>), title: 'Customized Outlines', desc: 'Adjust text size, outline color, and shadow styling to make captions pop.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>), title: 'Multi-Image Templates', desc: 'Upload any custom photo or layout template as the canvas backdrop.' }
];

const _STEPS = [
  { n: '1', title: 'Choose base image', desc: 'Select a popular template from our grid or upload your own.' },
  { n: '2', title: 'Edit captions', desc: 'Type directly in the text boxes on-screen and drag them.' },
  { n: '3', title: 'Download', desc: 'Generate and download your meme instantly.' }
];

const _FAQS = [
  {
    q: "Can I upload my own custom image templates?",
    a: "Yes! Click the 'Upload Custom Image' card in the template library to import any local JPEG, PNG, or WebP file to generate a custom meme."
  },
  {
    q: "How do I edit, position, and resize the caption text?",
    a: "Type your captions into the text inputs. You can drag the text boxes directly on the canvas using circular handles, select different fonts, change colors, and resize the text using sliders."
  },
  {
    q: "Is there a watermark added to the generated memes?",
    a: "No. Our meme generator is 100% free with no watermarks, meaning your memes remain clean and fully customized."
  },
  {
    q: "Does this tool work with transparent PNG images?",
    a: "Yes. If you upload a custom PNG with transparent areas, the transparency channel is preserved in the final compiled meme."
  },
  {
    q: "Are my custom memes or pictures uploaded to a server?",
    a: "No. The text overlays, font packages, and canvas exports are processed locally in your browser sandbox, keeping your photos secure and private."
  },
  {
    q: "Can I add multiple text boxes to a single meme?",
    a: "Yes. You can add extra custom text boxes by clicking the '+ Add Text' button, and style each of them independently on your workspace."
  }
];

const CUSTOM_BOX_COORDINATES = {
  // Drake Hotline Bling
  'imgflip_181913649': [
    { x: 0.72, y: 0.25, text: 'TOP CAPTION' },
    { x: 0.72, y: 0.75, text: 'BOTTOM CAPTION' }
  ],
  'memegen_drake': [
    { x: 0.72, y: 0.25, text: 'TOP CAPTION' },
    { x: 0.72, y: 0.75, text: 'BOTTOM CAPTION' }
  ],
  
  // Distracted Boyfriend
  'imgflip_112126428': [
    { x: 0.21, y: 0.70, text: 'OTHER GIRL' },
    { x: 0.52, y: 0.60, text: 'BOYFRIEND' },
    { x: 0.78, y: 0.65, text: 'GIRLFRIEND' }
  ],
  'memegen_disaster': [
    { x: 0.21, y: 0.70, text: 'OTHER GIRL' },
    { x: 0.52, y: 0.60, text: 'BOYFRIEND' },
    { x: 0.78, y: 0.65, text: 'GIRLFRIEND' }
  ],
  
  // Three-Headed Dragon
  'imgflip_222401278': [
    { x: 0.22, y: 0.35, text: 'SERIOUS HEAD 1' },
    { x: 0.53, y: 0.32, text: 'SERIOUS HEAD 2' },
    { x: 0.83, y: 0.40, text: 'GOOFY HEAD' }
  ],
  'memegen_3hd': [
    { x: 0.22, y: 0.35, text: 'SERIOUS HEAD 1' },
    { x: 0.53, y: 0.32, text: 'SERIOUS HEAD 2' },
    { x: 0.83, y: 0.40, text: 'GOOFY HEAD' }
  ],

  // Two Buttons / Daily Struggle
  'imgflip_87743020': [
    { x: 0.28, y: 0.25, text: 'BUTTON 1' },
    { x: 0.57, y: 0.20, text: 'BUTTON 2' },
    { x: 0.50, y: 0.85, text: 'GUY DECIDING' }
  ],
  
  // Left Exit 12 Off Ramp
  'imgflip_124855084': [
    { x: 0.35, y: 0.35, text: 'STRAIGHT SIGN' },
    { x: 0.72, y: 0.35, text: 'EXIT SIGN' },
    { x: 0.45, y: 0.82, text: 'CAR VEERING' }
  ],
  
  // Batman Slapping Robin
  'imgflip_438680': [
    { x: 0.35, y: 0.60, text: 'ROBIN' },
    { x: 0.75, y: 0.55, text: 'BATMAN' }
  ],
  'memegen_batman-slap': [
    { x: 0.35, y: 0.60, text: 'ROBIN' },
    { x: 0.75, y: 0.55, text: 'BATMAN' }
  ],
  
  // Expanding Brain
  'imgflip_93895088': [
    { x: 0.25, y: 0.12, text: 'BRAIN STAGE 1' },
    { x: 0.25, y: 0.37, text: 'BRAIN STAGE 2' },
    { x: 0.25, y: 0.62, text: 'BRAIN STAGE 3' },
    { x: 0.25, y: 0.87, text: 'BRAIN STAGE 4' }
  ],
  'memegen_expanding-brain': [
    { x: 0.25, y: 0.12, text: 'BRAIN STAGE 1' },
    { x: 0.25, y: 0.37, text: 'BRAIN STAGE 2' },
    { x: 0.25, y: 0.62, text: 'BRAIN STAGE 3' },
    { x: 0.25, y: 0.87, text: 'BRAIN STAGE 4' }
  ],
  
  // Tuxedo Winnie the Pooh
  'imgflip_178591752': [
    { x: 0.35, y: 0.25, text: 'NORMAL POOH' },
    { x: 0.35, y: 0.75, text: 'FANCY POOH' }
  ],
  'memegen_tuxedo-pooh': [
    { x: 0.35, y: 0.25, text: 'NORMAL POOH' },
    { x: 0.35, y: 0.75, text: 'FANCY POOH' }
  ],
  
  // Always Has Been
  'imgflip_252605381': [
    { x: 0.22, y: 0.35, text: 'ASTRONAUT 1' },
    { x: 0.78, y: 0.25, text: 'ASTRONAUT 2' },
    { x: 0.50, y: 0.88, text: 'ALWAYS HAS BEEN' }
  ],
  'memegen_always-has-been': [
    { x: 0.22, y: 0.35, text: 'ASTRONAUT 1' },
    { x: 0.78, y: 0.25, text: 'ASTRONAUT 2' },
    { x: 0.50, y: 0.88, text: 'ALWAYS HAS BEEN' }
  ]
};

const getInitialCoordinatesForTemplate = (template) => {
  const customCoords = CUSTOM_BOX_COORDINATES[template.id];
  if (customCoords) return customCoords;

  const nameLower = template.name.toLowerCase();
  
  if (nameLower.includes('drake')) {
    return CUSTOM_BOX_COORDINATES['memegen_drake'];
  }
  if (nameLower.includes('distracted') && nameLower.includes('boyfriend')) {
    return CUSTOM_BOX_COORDINATES['memegen_disaster'];
  }
  if (nameLower.includes('dragon') && nameLower.includes('three')) {
    return CUSTOM_BOX_COORDINATES['memegen_3hd'];
  }
  if (nameLower.includes('daily struggle') || nameLower.includes('two buttons')) {
    return CUSTOM_BOX_COORDINATES['imgflip_87743020'];
  }
  if (nameLower.includes('off ramp') || nameLower.includes('exit sign')) {
    return CUSTOM_BOX_COORDINATES['imgflip_124855084'];
  }
  if (nameLower.includes('batman slap')) {
    return CUSTOM_BOX_COORDINATES['memegen_batman-slap'];
  }
  if (nameLower.includes('expanding brain')) {
    return CUSTOM_BOX_COORDINATES['memegen_expanding-brain'];
  }
  if (nameLower.includes('winnie') || nameLower.includes('pooh')) {
    return CUSTOM_BOX_COORDINATES['memegen_tuxedo-pooh'];
  }
  if (nameLower.includes('always has been')) {
    return CUSTOM_BOX_COORDINATES['memegen_always-has-been'];
  }
  
  return null;
};

export default function MemeGeneratorPage() {
  const [file, setFile] = useState(null);
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [allCaps, setAllCaps] = useState(true);
  
  // Dynamic list of captions
  const [texts, setTexts] = useState([
    { id: '1', text: 'TOP CAPTION', fontSize: 44, x: 0.5, y: 0.12 },
    { id: '2', text: 'BOTTOM CAPTION', fontSize: 44, x: 0.5, y: 0.85 }
  ]);

  // Dragging states
  const [draggingItem, setDraggingItem] = useState(null); // index of dragging item or null
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  // Templates states
  const [templates, setTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const sentinelRef = useRef(null);

  // Carousel search & pagination states
  const [carouselSearch, setCarouselSearch] = useState('');
  const [visibleCarouselCount, setVisibleCarouselCount] = useState(15);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch templates from both Imgflip and Memegen APIs on mount
  useEffect(() => {
    setLoadingTemplates(true);
    
    const fetchImgflip = fetch('https://api.imgflip.com/get_memes')
      .then(res => res.json())
      .then(data => data.success ? data.data.memes : [])
      .catch(err => {
        console.error('Error fetching Imgflip templates:', err);
        return [];
      });

    const fetchMemegen = fetch('https://api.memegen.link/templates')
      .then(res => res.json())
      .then(data => Array.isArray(data) ? data : [])
      .catch(err => {
        console.error('Error fetching Memegen templates:', err);
        return [];
      });

    Promise.all([fetchImgflip, fetchMemegen])
      .then(([imgflipList, memegenList]) => {
        const mappedImgflip = imgflipList.map(m => ({
          id: `imgflip_${m.id}`,
          name: m.name,
          url: m.url,
          box_count: m.box_count || 2,
          source: 'imgflip'
        }));

        const mappedMemegen = memegenList.map(m => ({
          id: `memegen_${m.id}`,
          name: m.name,
          url: m.blank,
          box_count: m.lines || 2,
          source: 'memegen'
        }));

        // Combine and deduplicate by name (case-insensitive)
        const combined = [...mappedImgflip];
        const seenNames = new Set(mappedImgflip.map(m => m.name.toLowerCase()));

        mappedMemegen.forEach(m => {
          if (!seenNames.has(m.name.toLowerCase())) {
            combined.push(m);
            seenNames.add(m.name.toLowerCase());
          }
        });

        setTemplates(combined);
      })
      .catch(err => console.error('Error fetching templates:', err))
      .finally(() => setLoadingTemplates(false));
  }, []);

  // Reset visible counts when search queries change
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery]);

  useEffect(() => {
    setVisibleCarouselCount(15);
  }, [carouselSearch]);

  // Intersection Observer for infinite scrolling templates grid
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 24);
      }
    }, { threshold: 0.1 });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [templates, searchQuery]);

  // Global mouse up event listener to prevent stuck drag states
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingItem !== null) {
        if (isDraggingRef.current) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }
        setDraggingItem(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [draggingItem]);

  // Handle file select
  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
      setTexts([
        { id: '1', text: 'TOP CAPTION', fontSize: 44, x: 0.5, y: 0.12 },
        { id: '2', text: 'BOTTOM CAPTION', fontSize: 44, x: 0.5, y: 0.85 }
      ]);
    } else {
      setFile(null);
      setTexts([
        { id: '1', text: 'TOP CAPTION', fontSize: 44, x: 0.5, y: 0.12 },
        { id: '2', text: 'BOTTOM CAPTION', fontSize: 44, x: 0.5, y: 0.85 }
      ]);
    }
    setErrorMsg('');
  };

  const selectTemplate = (template) => {
    setFile({
      preview: template.url,
      name: template.name,
      type: 'image/jpeg',
      size: 0,
      isTemplate: true
    });

    const customCoords = getInitialCoordinatesForTemplate(template);
    if (customCoords) {
      const initialTexts = customCoords.map((coord, i) => ({
        id: String(i + 1),
        text: coord.text,
        fontSize: 44,
        x: coord.x,
        y: coord.y
      }));
      setTexts(initialTexts);
    } else {
      // Auto-generate the correct number of boxes based on box_count (fallback vertical distribution)
      const boxCount = template.box_count || 2;
      const initialTexts = Array.from({ length: boxCount }).map((_, i) => {
        const y = boxCount === 1 ? 0.5 : 0.12 + (i * (0.85 - 0.12) / (boxCount - 1));
        return {
          id: String(i + 1),
          text: `TEXT BLOCK ${i + 1}`,
          fontSize: 44,
          x: 0.5,
          y: y
        };
      });
      setTexts(initialTexts);
    }
    setErrorMsg('');

    // Smooth scroll to the editing area so the user doesn't have to scroll up manually
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Re-draw canvas whenever base image changes
  useEffect(() => {
    if (!file || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Support external template images without tainting canvas
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setImageSize({ width: w, height: h });
      canvas.width = w;
      canvas.height = h;

      // Draw background image
      ctx.drawImage(img, 0, 0);
    };
    img.src = file.preview || URL.createObjectURL(file);
  }, [file]);

  // Handle Drag & Drop relative math
  const getCanvasMousePos = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Support touches
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width);
    const y = ((clientY - rect.top) / rect.height);
    return { x, y };
  };

  const startDrag = (e, index) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    isDraggingRef.current = false;
    setDraggingItem(index);
  };

  const handleMouseMove = (e) => {
    if (draggingItem === null || !file) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - dragStartPos.current.x;
    const dy = clientY - dragStartPos.current.y;

    // Set dragging mode if mouse moves more than 4px
    if (!isDraggingRef.current && Math.hypot(dx, dy) > 4) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      if (e.cancelable) e.preventDefault();
      const { x, y } = getCanvasMousePos(e);
      
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      setTexts(prev => prev.map((t, idx) => 
        idx === draggingItem ? { ...t, x: clampedX, y: clampedY } : t
      ));
    }
  };

  const handleMouseUp = () => {
    if (draggingItem !== null) {
      if (isDraggingRef.current) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
      setDraggingItem(null);
    }
  };

  // Add more dynamic text box
  const addTextBox = () => {
    const nextId = String(texts.length + 1);
    setTexts(prev => [
      ...prev,
      {
        id: nextId,
        text: `TEXT BLOCK ${nextId}`,
        fontSize: 40,
        x: 0.5,
        y: 0.5
      }
    ]);
  };

  // Delete text box
  const deleteTextBox = (index) => {
    setTexts(prev => prev.filter((_, idx) => idx !== index));
  };

  // Draw text on the canvas right before saving
  const downloadMeme = () => {
    if (!canvasRef.current || !file) return;
    setIsProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      canvas.width = w;
      canvas.height = h;

      // Draw background image
      ctx.drawImage(img, 0, 0);

      // Set font styles
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineJoin = 'round';
      ctx.textBaseline = 'middle';

      // Draw dynamic texts
      texts.forEach(item => {
        if (item.text) {
          const tText = allCaps ? item.text.toUpperCase() : item.text;
          const size = Math.round(w * (item.fontSize / 500));
          ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
          ctx.lineWidth = Math.max(2, Math.round(size * (strokeWidth / 40)));
          
          const tx = item.x * w;
          const ty = item.y * h;
          
          ctx.strokeText(tText, tx, ty);
          ctx.fillText(tText, tx, ty);
        }
      });

      // Convert to blob and trigger download
      canvas.toBlob((blob) => {
        if (blob) {
          const ext = file.isTemplate ? 'jpg' : (file.name.split('.').pop() || 'jpg');
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const newName = `${baseName}_meme.${ext}`;
          saveAs(blob, newName);
          saveHistory('Meme Generator', newName);
        } else {
          setErrorMsg('Could not export canvas.');
        }
        
        // Restore canvas to no-text state for preview editor
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        setIsProcessing(false);
      }, 'image/jpeg', 0.95);
    };
    img.src = file.preview || URL.createObjectURL(file);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const textShadowStyle = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -1px -2px 0 #000, 1px -2px 0 #000, -1px 2px 0 #000, 1px 2px 0 #000, -2px -1px 0 #000, 2px -1px 0 #000, -2px 1px 0 #000, 2px 1px 0 #000';

  return (
    <ToolPageShell
      title="Meme Generator"
      subtitle="Create custom memes instantly in your browser. Add draggable text, type directly on the screen, and download in high quality."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free browser-based Meme Generator. Add bold text to images, drag captions, edit inline on screen, and export with zero watermarks. Private and fast."
    >
      <div className="flex flex-col gap-6">
        {!file ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Search and upload bar */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #E4E4EF', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
                <input
                  type="text"
                  placeholder="Search popular meme templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px 10px 38px',
                    background: '#F7F7FB', border: '1px solid #E4E4EF',
                    borderRadius: 10, fontSize: 13, fontWeight: 600,
                    outline: 'none', color: '#111128'
                  }}
                />
                <svg style={{ position: 'absolute', left: 12, top: 12, color: '#9898B5' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={() => document.querySelector('input[type="file"]')?.click()}
                style={{
                  background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                  color: '#fff', fontWeight: 800, fontSize: 13, padding: '11px 22px',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(91,91,214,0.25)', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                Upload Custom Image
              </button>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) handleFileSelect(files);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Grid of templates */}
            {loadingTemplates ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                <svg style={{ animation: 'spin 1s linear infinite', width: 28, height: 28, color: '#5B5BD6' }} fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (() => {
              const filteredTemplates = templates.filter(meme => meme.name.toLowerCase().includes(searchQuery.toLowerCase()));
              const displayedTemplates = filteredTemplates.slice(0, visibleCount);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                    {/* Upload box card trigger */}
                    <div
                      onClick={() => document.querySelector('input[type="file"]')?.click()}
                      style={{
                        border: '2.5px dashed #D1D1E4', borderRadius: 16, padding: 20,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 12, cursor: 'pointer', background: '#fff', minHeight: 200, transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#5B5BD6'; e.currentTarget.style.background = '#EDEDFB'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D1E4'; e.currentTarget.style.background = '#fff'; }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EDEDFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B5BD6' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#5B5BD6', textAlign: 'center' }}>Upload Custom Image</span>
                    </div>

                    {/* Combined and deduplicated templates */}
                    {displayedTemplates.map(meme => (
                      <div
                        key={meme.id}
                        onClick={() => selectTemplate(meme)}
                        style={{
                          background: '#fff', border: '1px solid #E4E4EF', borderRadius: 16,
                          padding: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.03)', transition: 'all 0.18s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#5B5BD6'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E4EF'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{ width: '100%', height: 140, overflow: 'hidden', borderRadius: 12, background: '#F7F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={meme.url} alt={meme.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#111128', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' }} title={meme.name}>
                          {meme.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Sentinel element for infinite scroll */}
                  <div ref={sentinelRef} style={{ height: 10 }} />

                  {/* Manual Load More Button */}
                  {visibleCount < filteredTemplates.length && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setVisibleCount(prev => prev + 24)}
                        style={{
                          background: '#EEF0FF', color: '#5B5BD6', border: 'none', borderRadius: 10,
                          padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(91,91,214,0.1)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#DCDFFF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#EEF0FF'; }}
                      >
                        Load More Templates
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Info */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Meme Template
                </h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">
                  Remove
                </button>
              </div>

              <div className="p-3 bg-lightbg/45 border border-bordercolor/60 rounded-xl flex items-center gap-3">
                {file.preview && (
                  <img
                    src={file.preview}
                    alt="Template"
                    className="w-12 h-12 object-cover rounded-lg border border-bordercolor"
                  />
                )}
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {file.isTemplate ? 'Meme Template' : formatSize(file.size)} · {imageSize.width} × {imageSize.height}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-bordercolor/40">
                <p className="text-[11px] text-gray-400 font-semibold leading-relaxed">
                  💡 <strong>Tip:</strong> Click directly on any text block on screen and type to edit inline. You can also drag the text boxes directly to reposition them!
                </p>
              </div>
            </div>

            {/* Middle Column: Meme Canvas */}
            <div className="lg:col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="flex justify-between items-center">
                  <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Live Editor
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      id="allCaps"
                      checked={allCaps}
                      onChange={(e) => setAllCaps(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#5B5BD6' }}
                    />
                    <label htmlFor="allCaps" className="text-xs font-bold text-textmain select-none cursor-pointer">
                      ALL CAPS
                    </label>
                  </div>
                </div>

                <div 
                  ref={containerRef}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                  style={{ 
                    border: "1.5px solid #E4E4EF", 
                    borderRadius: 14, 
                    padding: 12, 
                    minHeight: 380, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    position: "relative", 
                    overflow: "hidden", 
                    background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px",
                    cursor: draggingItem !== null ? 'grabbing' : 'auto'
                  }}
                >
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <canvas
                      ref={canvasRef}
                      style={{ 
                        maxHeight: 480, 
                        maxWidth: "100%", 
                        objectFit: "contain", 
                        borderRadius: 8, 
                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)", 
                        display: "block" 
                      }}
                    />
                    
                    {/* Interactive Text Overlay (HTML only, no double render) */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                      {texts.map((item, idx) => (
                        <div
                          key={item.id}
                          style={{
                            position: 'absolute',
                            left: `${(item.x ?? 0.5) * 100}%`,
                            top: `${(item.y ?? 0.5) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            zIndex: 10 + idx,
                            width: '80%',
                            maxWidth: '400px'
                          }}
                        >
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTexts(prev => prev.map((t, i) => i === idx ? { ...t, text: val } : t));
                            }}
                            onMouseDown={(e) => startDrag(e, idx)}
                            onTouchStart={(e) => startDrag(e, idx)}
                            style={{
                              background: 'transparent',
                              border: '1.5px dashed rgba(255,255,255,0.4)',
                              outline: 'none',
                              color: '#ffffff',
                              fontFamily: 'Impact, Arial Black, sans-serif',
                              fontSize: `calc(${item.fontSize}px * 0.35)`,
                              textAlign: 'center',
                              textTransform: allCaps ? 'uppercase' : 'none',
                              textShadow: textShadowStyle,
                              width: '100%',
                              minWidth: '150px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              boxSizing: 'border-box',
                              cursor: draggingItem === idx ? 'grabbing' : 'move',
                              transition: 'border-color 0.15s'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#5B5BD6'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.4)'; }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Row directly under canvas editor */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #E4E4EF', borderRadius: 16, padding: '12px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={addTextBox}
                    style={{
                      background: '#EEF0FF', color: '#5B5BD6', border: 'none', borderRadius: 8,
                      padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.18s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#DCDFFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#EEF0FF'; }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Text
                  </button>
                  <button
                    type="button"
                    onClick={downloadMeme}
                    disabled={isProcessing}
                    style={{
                      background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)', color: '#fff', border: 'none', borderRadius: 8,
                      padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.18s',
                      boxShadow: '0 2px 8px rgba(91,91,214,0.2)'
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Meme
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    id="allCapsCanvas"
                    checked={allCaps}
                    onChange={(e) => setAllCaps(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: '#5B5BD6' }}
                  />
                  <label htmlFor="allCapsCanvas" className="text-xs font-bold text-textmain select-none cursor-pointer">
                    ALL CAPS
                  </label>
                </div>
              </div>

              {/* Meme Templates Horizontal Carousel */}
              <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                    Switch Templates
                  </h4>
                  <div style={{ position: 'relative', minWidth: 160 }}>
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={carouselSearch}
                      onChange={(e) => setCarouselSearch(e.target.value)}
                      style={{
                        padding: '4px 8px 4px 24px',
                        background: '#F7F7FB', border: '1px solid #E4E4EF',
                        borderRadius: 6, fontSize: 10, fontWeight: 600,
                        outline: 'none', color: '#111128', width: '100%'
                      }}
                    />
                    <svg style={{ position: 'absolute', left: 8, top: 7, color: '#9898B5' }} width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                  {/* Upload custom box trigger */}
                  <div
                    onClick={() => document.querySelector('input[type="file"]')?.click()}
                    style={{
                      border: '1.5px dashed #D1D1E4', borderRadius: 10, padding: 8,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 6, cursor: 'pointer', background: '#F7F7FB', minWidth: 90, height: 90, flexShrink: 0
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="#5B5BD6" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    <span style={{ fontSize: 8, fontWeight: 800, color: '#5B5BD6', textAlign: 'center' }}>Upload Custom</span>
                  </div>

                  {/* API templates */}
                  {(() => {
                    const filteredCarousel = templates.filter(meme => meme.name.toLowerCase().includes(carouselSearch.toLowerCase()));
                    const displayedCarousel = filteredCarousel.slice(0, visibleCarouselCount);
                    return (
                      <>
                        {displayedCarousel.map(meme => (
                          <div
                            key={meme.id}
                            onClick={() => selectTemplate(meme)}
                            style={{
                              width: 90, height: 90, borderRadius: 10, overflow: 'hidden',
                              border: `2px solid ${file.preview === meme.url ? '#5B5BD6' : '#E4E4EF'}`,
                              cursor: 'pointer', position: 'relative', flexShrink: 0, background: '#F7F7FB',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { if (file.preview !== meme.url) e.currentTarget.style.borderColor = '#9898B5'; }}
                            onMouseLeave={e => { if (file.preview !== meme.url) e.currentTarget.style.borderColor = '#E4E4EF'; }}
                          >
                            <img src={meme.url} alt={meme.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 8, color: '#fff', textAlign: 'center' }} title={meme.name}>
                              {meme.name}
                            </div>
                          </div>
                        ))}
                        {visibleCarouselCount < filteredCarousel.length && (
                          <div
                            onClick={() => setVisibleCarouselCount(prev => prev + 20)}
                            style={{
                              width: 90, height: 90, borderRadius: 10,
                              border: '1.5px dashed #5B5BD6', background: '#EEF0FF',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', flexShrink: 0, gap: 4
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#DCDFFF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#EEF0FF'; }}
                          >
                            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#5B5BD6' }}>+</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#5B5BD6' }}>Load More</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right Column: Controls */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: '1px solid #E4E4EF' }}>
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                  Meme Captions
                </h4>
                <button
                  onClick={addTextBox}
                  style={{
                    background: '#EEF0FF', color: '#5B5BD6', border: 'none', borderRadius: 6,
                    padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  + Add Text
                </button>
              </div>

              {/* Dynamic text blocks controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 320, overflowY: 'auto', pr: 2 }}>
                {texts.map((item, idx) => (
                  <div key={item.id} className="flex flex-col gap-1.5 p-2.5 bg-lightbg/35 border border-bordercolor/65 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Caption #{idx + 1}
                      </span>
                      {texts.length > 1 && (
                        <button
                          onClick={() => deleteTextBox(idx)}
                          style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTexts(prev => prev.map((t, i) => i === idx ? { ...t, text: val } : t));
                      }}
                      className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-white px-2.5 py-1.5 focus:outline-none focus:border-primary"
                      placeholder={`Caption #${idx + 1} text`}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] font-bold text-gray-400">Font: {item.fontSize}px</span>
                      <input
                        type="range"
                        min="12"
                        max="100"
                        value={item.fontSize}
                        onChange={(e) => {
                          const size = parseInt(e.target.value);
                          setTexts(prev => prev.map((t, i) => i === idx ? { ...t, fontSize: size } : t));
                        }}
                        className="w-2/3 accent-primary"
                        style={{ height: 4 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Formatting details */}
              <div className="flex flex-col gap-2 pt-2 border-t border-bordercolor/40">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Stroke Width: {strokeWidth}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-2/3 accent-primary"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 font-semibold leading-relaxed">
                  {errorMsg}
                </p>
              )}

              {/* Action Button */}
              <div className="pt-3 border-t border-bordercolor/60">
                <button
                  type="button"
                  onClick={downloadMeme}
                  disabled={isProcessing}
                  style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Generate &amp; Download Meme
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
