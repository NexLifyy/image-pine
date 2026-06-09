"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

// Features for the Tool Shell
const _FEATURES = [
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: 'Grok-Powered Vision',
    desc: 'Uses xAI\'s state-of-the-art vision models to extract highly descriptive and relevant metadata tags from images.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    ),
    title: 'Up to 500 Images',
    desc: 'Efficiently batch process lists of up to 500 images sequentially with a visual progress bar and real-time dashboard.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 14.72 3.09 17.2 4.86 19C5.34 19.48 6.13 19.34 6.44 18.73C6.79 18.05 7.5 17.5 8.5 17.5H9.5C10.6 17.5 11.5 18.4 11.5 19.5V21.5C11.5 21.78 11.72 22 12 22Z" />
      </svg>
    ),
    title: 'Format Presets',
    desc: 'Choose between Single keywords, Double keyword phrases, or Auto keyword formats to match your catalog requirements.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L22 22M15.5 7.5H21v5.5" />
      </svg>
    ),
    title: 'Fallback Key Rotation',
    desc: 'Configure up to 3 API keys. If one is rate-limited (429), the tool automatically switches to the next key to ensure zero interruption.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: 'Editable CSV Export',
    desc: 'Generate and review outputs in real-time, modify titles/keywords inside the workspace, and download them as a structured CSV.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: '100% Secure Cookies',
    desc: 'Your API keys are stored securely as browser cookies locally on your device and are never sent to external servers.'
  }
];

const _STEPS = [
  { n: '1', title: 'Save API Keys & Upload', desc: 'Add your Grok API key, save it to cookies, and upload up to 500 images.' },
  { n: '2', title: 'Set Rules & Generate', desc: 'Choose your desired title length, keyword formats, and trigger the batch generator.' },
  { n: '3', title: 'Edit & Download CSV', desc: 'Verify and refine results directly in the app, then download the structured CSV file.' }
];

const _FAQS = [
  { q: 'Where do I find my xAI Grok API key?', a: 'You can create and manage API keys by signing up on the xAI Console (console.x.ai). You will need to add credits to your xAI account to utilize their vision models.' },
  { q: 'How does the fallback key rotation work?', a: 'Grok API keys have rate limits. By providing up to 3 keys, if the generator hits an HTTP 429 (Too Many Requests) error, it will immediately rotate to the next key and retry, keeping your large batch runs running smoothly.' },
  { q: 'Are my images stored on xAI?', a: 'No, xAI does not store your images permanently; they are processed temporarily for metadata inference. Image Pine downscales the images to a maximum of 1024px before uploading to conserve your bandwidth and API limits.' },
  { q: 'Can I edit the generated titles and keywords before exporting?', a: 'Yes. Simply click any image in the sidebar to load it in the middle panel, where you can modify the title and keywords. The changes save instantly and will be reflected in the final CSV.' }
];

// Helper to construct Grok API Prompt
const buildPrompt = (settings) => {
  const { titleLength, keywordFormat, keywordLength, includeKeywords, excludeKeywords } = settings;

  let formatDesc = "Auto-mixture (could be single words or short phrases)";
  if (keywordFormat === 'Single') {
    formatDesc = "Single words ONLY (no spaces allowed in any keyword)";
  } else if (keywordFormat === 'Double') {
    formatDesc = "Two-word phrases ONLY (each keyword must contain exactly two words separated by a space)";
  }

  let prompt = `Analyze this image and generate SEO-optimized metadata.
Return a JSON object containing exactly two keys: "title" and "keywords".

Constraints:
1. "title": A descriptive, search-friendly title. It MUST NOT exceed ${titleLength} characters in total length.
2. "keywords": An array of descriptive keywords/tags. It MUST contain exactly ${keywordLength} keywords.
3. Keyword format: Each keyword in the array must be in the format: ${formatDesc}.
`;

  if (includeKeywords.trim()) {
    prompt += `4. Inclusion: You MUST include the following words/tags (or highly similar variants) in the keywords array: ${includeKeywords}.\n`;
  }
  if (excludeKeywords.trim()) {
    prompt += `5. Exclusion: You MUST NOT include any of the following words/tags (or variants) in the title or keywords array: ${excludeKeywords}.\n`;
  }

  prompt += `\nResponse format MUST be a valid JSON object matching this schema exactly, with no additional markdown formatting outside the JSON block:
{
  "title": "your title string here",
  "keywords": ["keyword1", "keyword2", ...]
}`;

  return prompt;
};

// Parser to extract JSON block from text response
const parseGrokResponse = (text) => {
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    // Attempt parsing from markdown blocks
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err) {
        throw new Error("Found JSON-like block but it is not valid: " + err.message);
      }
    }
    throw new Error("Could not parse JSON response from API.");
  }
};

// Helper to downscale and resize image locally to <= 1024px before base64
const getResizedImageB64 = (fileObj) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1024;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const b64 = dataUrl.split(',')[1];
          resolve({ b64, mimeType: 'image/jpeg' });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image to canvas context."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(fileObj);
  });
};

// API Call with 3-Key Fallback and Rotational Logic
const callGrokApiWithFallback = async (imageB64, mimeType, prompt, apiKeys, model, currentKeyIdx, onKeySwitch) => {
  const activeKeys = apiKeys.filter(k => k.trim() !== '');
  if (activeKeys.length === 0) {
    throw new Error("No API keys configured. Please configure at least one Grok API key.");
  }

  let index = currentKeyIdx % activeKeys.length;
  let attempts = 0;

  while (attempts < activeKeys.length) {
    const key = activeKeys[index];
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: model || 'grok-2-vision-1212',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageB64}`
                  }
                }
              ]
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (response.status === 429) {
        attempts++;
        const nextIndex = (index + 1) % activeKeys.length;
        if (attempts < activeKeys.length) {
          onKeySwitch?.(`API Key ${index + 1} rate limited (429). Switching to API Key ${nextIndex + 1}...`);
          index = nextIndex;
          continue;
        } else {
          throw new Error("All configured API keys returned rate limits (429).");
        }
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error (Status ${response.status}): ${errText}`);
      }

      const data = await response.json();
      return { data, keyUsedIndex: index };
    } catch (err) {
      attempts++;
      const nextIndex = (index + 1) % activeKeys.length;
      if (attempts < activeKeys.length) {
        onKeySwitch?.(`API Key ${index + 1} failed: ${err.message}. Trying API Key ${nextIndex + 1}...`);
        index = nextIndex;
      } else {
        throw err;
      }
    }
  }
  throw new Error("Failed to process API requests.");
};

// Cookie Helpers
const setCookie = (name, value, days = 365) => {
  if (typeof window !== "undefined") {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value || "") + expires + "; path=/; SameSite=Strict; Secure";
  }
};

const getCookie = (name) => {
  if (typeof window !== "undefined") {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

export default function GenerateMetadataPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  // Dynamic API Keys configuration
  const [apiKeys, setApiKeys] = useState(['']); // Starts with one key input
  const [showConfig, setShowConfig] = useState(true);
  const [showKeys, setShowKeys] = useState([false, false, false]);
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState(''); // 'testing' | 'success' | 'failed' | ''
  const [testMessage, setTestMessage] = useState('');

  // Sliders and options
  const [titleLength, setTitleLength] = useState(150);
  const [keywordFormat, setKeywordFormat] = useState('Auto');
  const [keywordLength, setKeywordLength] = useState(20);
  const [includeKeywords, setIncludeKeywords] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');

  // Queue Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metadataMap, setMetadataMap] = useState({});

  const isGeneratingRef = useRef(false);
  const currentKeyIndexRef = useRef(0);
  const modelName = 'grok-2-vision-1212'; // Hardcoded model

  // Load API keys from browser cookies on mount
  useEffect(() => {
    const k1 = getCookie('grok_key_1') || '';
    const k2 = getCookie('grok_key_2') || '';
    const k3 = getCookie('grok_key_3') || '';
    
    const loaded = [];
    if (k1) loaded.push(k1);
    if (k2) loaded.push(k2);
    if (k3) loaded.push(k3);
    
    if (loaded.length > 0) {
      setApiKeys(loaded);
      setIsSaved(true);
      setShowConfig(false); // Collapse box since keys exist
    } else {
      setApiKeys(['']);
      setIsSaved(false);
    }
  }, []);

  const addLog = (text, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] [${type.toUpperCase()}] ${text}`;
    if (type === 'error') console.error(formatted);
    else if (type === 'warning') console.warn(formatted);
    else console.log(formatted);
  };

  const handleKeyChange = (index, val) => {
    const updated = [...apiKeys];
    updated[index] = val;
    setApiKeys(updated);
    setIsSaved(false); // Need to save again
    setTestStatus('');
    setTestMessage('');
  };

  const addKeyField = () => {
    if (apiKeys.length < 3) {
      setApiKeys([...apiKeys, '']);
      setIsSaved(false);
      setTestStatus('');
      setTestMessage('');
    }
  };

  const removeKeyField = (index) => {
    if (apiKeys.length > 1) {
      const updated = apiKeys.filter((_, idx) => idx !== index);
      setApiKeys(updated);
      setIsSaved(false);
      setTestStatus('');
      setTestMessage('');
    }
  };

  const handleSaveApi = () => {
    // Save to cookies
    setCookie('grok_key_1', apiKeys[0] || '', 365);
    setCookie('grok_key_2', apiKeys[1] || '', 365);
    setCookie('grok_key_3', apiKeys[2] || '', 365);
    setIsSaved(true);
    setTestStatus('');
    setTestMessage('API Keys saved securely in browser cookies.');
    addLog("API keys updated in cookies.", "success");
    setTimeout(() => setTestMessage(''), 3000);
  };

  const handleTestApi = async () => {
    const firstKey = apiKeys[0];
    if (!firstKey) {
      setTestStatus('failed');
      setTestMessage('No API key configured to test.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing API Key 1 connection...');
    addLog("Testing key 1 with simple ping...", "info");

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firstKey}`
        },
        body: JSON.stringify({
          model: 'grok-2',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 2
        })
      });

      if (response.ok) {
        setTestStatus('success');
        setTestMessage('Test Successful! API Connection is valid.');
        addLog("API check passed.", "success");
      } else {
        const text = await response.text();
        setTestStatus('failed');
        setTestMessage(`Test failed (Status ${response.status})`);
        addLog(`API check failed: ${text}`, "error");
      }
    } catch (err) {
      setTestStatus('failed');
      setTestMessage(`Connection error: ${err.message}`);
      addLog(`API connection error: ${err.message}`, "error");
    }
  };

  const handleFileSelect = (newFiles) => {
    if (files.length + newFiles.length > 500) {
      const allowedCount = 500 - files.length;
      if (allowedCount <= 0) {
        alert("Upload limit is 500 images. You cannot upload any more files.");
        return;
      }
      alert(`Upload limit is 500 images. Only the first ${allowedCount} images have been added.`);
      newFiles = newFiles.slice(0, allowedCount);
    }

    const sanitized = newFiles.map(f => {
      if (!f.preview && f.type?.startsWith('image/')) {
        f.preview = URL.createObjectURL(f);
      }
      return f;
    });

    setFiles(prev => [...prev, ...sanitized]);
    if (!selectedFile) setSelectedFile(sanitized[0]);
  };

  const removeFile = (id, e) => {
    if (e) e.stopPropagation();
    const filtered = files.filter(f => f.id !== id);
    setFiles(filtered);
    
    const nextMap = { ...metadataMap };
    delete nextMap[id];
    setMetadataMap(nextMap);

    if (selectedFile?.id === id) {
      setSelectedFile(filtered.length > 0 ? filtered[0] : null);
    }
  };

  const clearAllFiles = () => {
    if (isGenerating) stopGeneration();
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setSelectedFile(null);
    setMetadataMap({});
    setProgress(0);
    setTestMessage('');
    setTestStatus('');
  };

  const startGeneration = async () => {
    if (files.length === 0) {
      alert("No files uploaded. Please upload at least one image.");
      return;
    }

    const activeKeys = apiKeys.filter(k => k.trim() !== '');
    if (activeKeys.length === 0) {
      setShowConfig(true);
      alert("Please configure and save at least one Grok API Key under 'API Configuration' first.");
      return;
    }

    setIsGenerating(true);
    isGeneratingRef.current = true;
    addLog(`Starting metadata generation batch run for ${files.length} images...`, "info");

    const pendingFiles = files.filter(f => {
      const meta = metadataMap[f.id];
      return !meta || meta.status !== 'completed';
    });

    if (pendingFiles.length === 0) {
      alert("All uploaded images already have completed metadata.");
      setIsGenerating(false);
      isGeneratingRef.current = false;
      return;
    }

    const settings = {
      titleLength,
      keywordFormat,
      keywordLength,
      includeKeywords,
      excludeKeywords
    };

    const prompt = buildPrompt(settings);
    let processed = files.length - pendingFiles.length;
    setProgress(processed);

    for (const file of pendingFiles) {
      if (!isGeneratingRef.current) {
        addLog("Metadata generation paused by user.", "warning");
        break;
      }

      setMetadataMap(prev => ({
        ...prev,
        [file.id]: {
          title: prev[file.id]?.title || '',
          keywords: prev[file.id]?.keywords || [],
          status: 'processing',
          error: ''
        }
      }));
      setSelectedFile(file); // Show the currently generating file in preview
      addLog(`Resizing and loading: ${file.name}`, "info");

      try {
        // Step A: Downscale locally
        const { b64, mimeType } = await getResizedImageB64(file);

        // Step B: Send API Request
        const { data, keyUsedIndex } = await callGrokApiWithFallback(
          b64,
          mimeType,
          prompt,
          apiKeys,
          modelName,
          currentKeyIndexRef.current,
          (msg) => addLog(msg, "warning")
        );

        // Update key pointer to the active working key
        currentKeyIndexRef.current = keyUsedIndex;

        const content = data.choices?.[0]?.message?.content || '{}';
        const parsed = parseGrokResponse(content);

        const resTitle = parsed.title || '';
        const resKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];

        setMetadataMap(prev => ({
          ...prev,
          [file.id]: {
            title: resTitle,
            keywords: resKeywords,
            status: 'completed',
            error: ''
          }
        }));

        addLog(`Successfully processed ${file.name} (Key ${keyUsedIndex + 1})`, "success");
      } catch (err) {
        console.error(err);
        setMetadataMap(prev => ({
          ...prev,
          [file.id]: {
            title: prev[file.id]?.title || '',
            keywords: prev[file.id]?.keywords || [],
            status: 'failed',
            error: err.message || 'Processing failed'
          }
        }));
        addLog(`Error processing ${file.name}: ${err.message}`, "error");
      }

      processed++;
      setProgress(processed);
    }

    setIsGenerating(false);
    isGeneratingRef.current = false;
    addLog("Batch run complete.", "info");
  };

  const stopGeneration = () => {
    isGeneratingRef.current = false;
    setIsGenerating(false);
    addLog("Stopping batch metadata generation...", "warning");
  };

  const handleTitleChange = (fileId, val) => {
    setMetadataMap(prev => ({
      ...prev,
      [fileId]: {
        ...(prev[fileId] || { keywords: [], status: 'pending', error: '' }),
        title: val
      }
    }));
  };

  const handleKeywordsChange = (fileId, val) => {
    const arr = val.split(',').map(x => x.trim()).filter(Boolean);
    setMetadataMap(prev => ({
      ...prev,
      [fileId]: {
        ...(prev[fileId] || { title: '', status: 'pending', error: '' }),
        keywords: arr
      }
    }));
  };

  const removeKeywordTag = (fileId, kwIndex) => {
    const currentMeta = metadataMap[fileId];
    if (!currentMeta || !currentMeta.keywords) return;
    
    const filtered = currentMeta.keywords.filter((_, idx) => idx !== kwIndex);
    setMetadataMap(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        keywords: filtered
      }
    }));
  };

  const addKeywordTag = (fileId, keyword) => {
    if (!keyword.trim()) return;
    const currentMeta = metadataMap[fileId] || { title: '', keywords: [], status: 'pending', error: '' };
    
    if (currentMeta.keywords.includes(keyword.trim())) return;
    
    setMetadataMap(prev => ({
      ...prev,
      [fileId]: {
        ...currentMeta,
        keywords: [...currentMeta.keywords, keyword.trim()]
      }
    }));
  };

  const downloadCsv = () => {
    if (files.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ['File name', 'Title', 'Keywods'];
    const rows = files.map(f => {
      const meta = metadataMap[f.id] || {};
      const title = meta.title || '';
      const kws = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : '';

      const escapeCsv = (str) => {
        return `"${str.replace(/"/g, '""')}"`;
      };

      return [
        escapeCsv(f.name),
        escapeCsv(title),
        escapeCsv(kws)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'generated_image_metadata.csv');
    
    saveHistory('Generate Metadata', `Exported CSV metadata for ${files.length} images`);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  // State elements derived
  const selectedMeta = selectedFile ? metadataMap[selectedFile.id] || { title: '', keywords: [], status: 'pending', error: '' } : null;
  const progressPercent = files.length > 0 ? Math.round((progress / files.length) * 100) : 0;
  const numConfiguredKeys = apiKeys.filter(k => k.trim() !== '').length;

  return (
    <ToolPageShell
      title="Generate Metadata"
      subtitle="Instantly generate SEO tags, titles, and descriptions for your images using xAI's Grok API. Ideal for stock photography cataloging."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free online client-side AI Metadata Generator. Batch generate search engine metadata tags, file descriptions, and titles for your portfolio using Grok. Custom lengths, keyword rules, and local CSV downloads with total privacy."
    >
      <div className="flex flex-col gap-6">

        {/* ─── API KEYS / CONFIGURATION CARD ─── */}
        <div style={{ background: '#fff', border: '1px solid #E4E4EF', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div 
            onClick={() => setShowConfig(!showConfig)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#7342E615', color: '#7342E6', display: 'flex', alignItems: 'center', justifyContext: 'center', flexShrink: 0, paddingLeft: 7 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111128', margin: 0 }}>API Configuration</h3>
                <p style={{ fontSize: 11, color: '#9898B5', margin: '2px 0 0' }}>
                  {numConfiguredKeys > 0 ? `${numConfiguredKeys} key${numConfiguredKeys > 1 ? 's' : ''} configured` : 'Enter Grok keys to start'}
                </p>
              </div>
            </div>
            <button 
              type="button"
              style={{ background: 'none', border: 'none', color: '#6B6B8A', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <svg 
                style={{ width: 18, height: 18, transition: 'transform 0.2s', transform: showConfig ? 'rotate(180deg)' : 'none' }} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {showConfig && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F1F7', display: 'flex', flexDirection: 'column', gap: 14 }} className="animate-fade-in">
              <p style={{ fontSize: 12, color: '#6B6B8A', margin: 0, lineHeight: 1.5 }}>
                Provide up to three **xAI Grok API Keys**. Keys are stored securely in browser cookies and sent directly to xAI. If key 1 hits a rate limit (HTTP 429), rotation fallbacks will proceed to key 2, then key 3.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {apiKeys.map((key, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showKeys[idx] ? 'text' : 'password'}
                        value={key}
                        onChange={(e) => handleKeyChange(idx, e.target.value)}
                        placeholder={`Grok API Key ${idx + 1}`}
                        style={{
                          width: '100%', padding: '9px 40px 9px 12px',
                          background: '#F7F7FB', border: '1px solid #E4E4EF',
                          borderRadius: 9, fontSize: 13, fontWeight: 600,
                          color: '#111128', outline: 'none', fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...showKeys];
                          updated[idx] = !updated[idx];
                          setShowKeys(updated);
                        }}
                        style={{
                          position: 'absolute', right: 8, background: 'none', border: 'none',
                          color: '#9898B5', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4
                        }}
                      >
                        {showKeys[idx] ? (
                          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {apiKeys.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeKeyField(idx)}
                        style={{
                          background: '#FFF5F5', border: '1px solid #FECACA', color: '#EF4444',
                          borderRadius: 9, padding: '9px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}

                {apiKeys.length < 3 && (
                  <button
                    type="button"
                    onClick={addKeyField}
                    style={{
                      alignSelf: 'flex-start', background: '#F1F1F7', border: '1px solid #E4E4EF',
                      borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 750,
                      color: '#7342E6', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    + Add More API Key
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={handleSaveApi}
                  style={{
                    background: 'linear-gradient(135deg, #7342E6 0%, #5B5BD6 100%)',
                    color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 18px',
                    borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(115,66,230,0.15)'
                  }}
                >
                  Save API
                </button>

                {isSaved && (
                  <button
                    type="button"
                    onClick={handleTestApi}
                    disabled={testStatus === 'testing'}
                    style={{
                      background: testStatus === 'success' ? '#10B981' : testStatus === 'failed' ? '#EF4444' : '#fff',
                      color: testStatus === 'success' || testStatus === 'failed' ? '#fff' : '#4E4E6D',
                      fontWeight: 700, fontSize: 12, padding: '8px 18px',
                      borderRadius: 10, border: `1px solid ${testStatus === 'success' ? '#10B981' : testStatus === 'failed' ? '#EF4444' : '#D1D1E4'}`,
                      cursor: testStatus === 'testing' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? 'Active' : testStatus === 'failed' ? 'Failed - Retry' : 'Test API'}
                  </button>
                )}

                <a
                  href="https://console.x.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: 'none', background: '#F1F1F7', color: '#4E4E6D',
                    fontWeight: 700, fontSize: 12, padding: '8px 18px', borderRadius: 10,
                    border: '1px solid #E4E4EF', display: 'inline-flex', alignItems: 'center'
                  }}
                >
                  Get API key
                </a>
              </div>

              {testMessage && (
                <p 
                  style={{
                    fontSize: 11, fontWeight: 600, margin: '8px 0 0',
                    color: testStatus === 'success' ? '#10B981' : testStatus === 'failed' ? '#EF4444' : '#7342E6'
                  }}
                >
                  {testMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ─── FILE UPLOAD BLOCK (Empty State) ─── */}
        {files.length === 0 ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox
              onFileSelect={handleFileSelect}
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
              multiple={true}
              buttonLabel="Choose Batch Images"
              maxSizeMB={20}
            />
            <p style={{ textAlign: 'center', fontSize: 11, color: '#9898B5', marginTop: 12 }}>
              Upload up to 500 catalog photos. PNG, JPEG, WebP supported.
            </p>
          </div>
        ) : (
          /* ─── ACTIVE GENERATOR DASHBOARD WORKSPACE ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
            
            {/* Visual Progress Bar and Batch Actions Row */}
            <div style={{ background: '#fff', border: '1px solid #E4E4EF', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111128', margin: 0 }}>Batch Operations</h3>
                  <p style={{ fontSize: 12, color: '#9898B5', margin: '2px 0 0' }}>
                    Processed {progress} of {files.length} images ({progressPercent}%)
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={stopGeneration}
                      style={{
                        background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12,
                        padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)'
                      }}
                    >
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                      </svg>
                      Pause
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startGeneration}
                      style={{
                        background: 'linear-gradient(135deg, #7342E6 0%, #5B5BD6 100%)', color: '#fff',
                        fontWeight: 700, fontSize: 12, padding: '8px 18px', borderRadius: 10, border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(115, 66, 230, 0.25)'
                      }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                      </svg>
                      {progress > 0 ? 'Resume Batch' : 'Generate Metadata'}
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={downloadCsv}
                    disabled={isGenerating}
                    style={{
                      background: '#fff', color: '#4E4E6D', fontWeight: 700, fontSize: 12,
                      padding: '8px 18px', borderRadius: 10, border: '1px solid #D1D1E4', cursor: isGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, opacity: isGenerating ? 0.5 : 1
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Download CSV
                  </button>

                  <button
                    type="button"
                    onClick={clearAllFiles}
                    style={{
                      background: '#FFF5F5', color: '#EF4444', fontWeight: 700, fontSize: 12,
                      padding: '8px 14px', borderRadius: 10, border: '1px solid #FECACA', cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Real-time Visual Progress Bar */}
              <div style={{ width: '100%', height: 10, background: '#F1F1F7', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                <div 
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #7342E6 0%, #5B5BD6 100%)',
                    borderRadius: 99,
                    transition: 'width 0.4s ease-out'
                  }}
                />
              </div>
            </div>

            {/* Split Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ alignItems: 'start' }}>
              
              {/* Left Column: List of 500 Images (Sidebar) */}
              <div className="lg:col-span-3" style={{ background: '#fff', border: '1px solid #E4E4EF', borderRadius: 20, padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 600, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContext: 'space-between', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F1F7', paddingBottom: 8 }}>
                  <h4 style={{ fontSize: 10, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                    Uploads ({files.length})
                  </h4>
                  
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
                      input.onchange = (e) => {
                        const loaded = Array.from(e.target.files);
                        handleFileSelect(loaded);
                      };
                      input.click();
                    }}
                    style={{ background: 'none', border: 'none', color: '#7342E6', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    + Add More
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {files.map((f) => {
                    const meta = metadataMap[f.id] || { status: 'pending' };
                    const isSelected = selectedFile?.id === f.id;
                    
                    let statusColor = '#9898B5'; // Pending
                    let statusLabel = 'Pending';
                    if (meta.status === 'processing') {
                      statusColor = '#3B82F6';
                      statusLabel = 'Analyzing...';
                    } else if (meta.status === 'completed') {
                      statusColor = '#10B981';
                      statusLabel = 'Ready';
                    } else if (meta.status === 'failed') {
                      statusColor = '#EF4444';
                      statusLabel = 'Failed';
                    }

                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFile(f)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10,
                          border: `1px solid ${isSelected ? '#7342E6' : '#E4E4EF'}`,
                          background: isSelected ? '#7342E608' : '#fff',
                          cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                      >
                        {f.preview ? (
                          <img 
                            src={f.preview} 
                            alt="" 
                            style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #E4E4EF', flexShrink: 0 }} 
                          />
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: 6, background: '#F7F7FB', border: '1px solid #E4E4EF', flexShrink: 0 }} />
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#111128', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>
                            {f.name}
                          </p>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                            <span style={{ fontSize: 9, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => removeFile(f.id, e)}
                          style={{
                            background: 'none', border: 'none', padding: 4, color: '#C4C4D9', cursor: 'pointer', borderRadius: 6
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#C4C4D9'}
                        >
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Middle Column: Selected Image Preview and Tag Editor */}
              <div className="lg:col-span-5" style={{ background: '#fff', border: '1px solid #E4E4EF', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ borderBottom: '1px solid #F1F1F7', paddingBottom: 8 }}>
                  <h4 style={{ fontSize: 10, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                    Workspace Editor
                  </h4>
                </div>

                {selectedFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Visual Preview Container */}
                    <div style={{ background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 12, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                      {selectedFile.preview ? (
                        <img 
                          src={selectedFile.preview} 
                          alt="Workspace" 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: '#9898B5' }}>No preview available</span>
                      )}
                      
                      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(17,17,40,0.7)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 500 }}>
                        {selectedFile.name} · {formatSize(selectedFile.size)}
                      </div>
                    </div>

                    {/* Metadata Editable Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      
                      {/* Title Box */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: 11, fontWeight: 800, color: '#4E4E6D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Title</label>
                          <span style={{ fontSize: 10, color: (selectedMeta.title?.length > titleLength) ? '#EF4444' : '#9898B5', fontWeight: 600 }}>
                            {selectedMeta.title?.length || 0} / {titleLength} ch
                          </span>
                        </div>
                        <input
                          type="text"
                          value={selectedMeta.title || ''}
                          onChange={(e) => handleTitleChange(selectedFile.id, e.target.value)}
                          placeholder={selectedMeta.status === 'processing' ? 'Generating title...' : 'Metadata Title'}
                          disabled={selectedMeta.status === 'processing'}
                          style={{
                            width: '100%', padding: '9px 12px',
                            background: '#F7F7FB', border: '1px solid #E4E4EF',
                            borderRadius: 9, fontSize: 13, fontWeight: 600,
                            color: '#111128', outline: 'none'
                          }}
                        />
                      </div>

                      {/* Keywords Chip List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: 11, fontWeight: 800, color: '#4E4E6D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Keywords</label>
                          <span style={{ fontSize: 10, color: '#9898B5', fontWeight: 600 }}>
                            {selectedMeta.keywords?.length || 0} keywords
                          </span>
                        </div>

                        {/* Keyword Chips View */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: 8, background: '#F7F7FB', border: '1px solid #E4E4EF', borderRadius: 9, minHeight: 60, maxHeight: 130, overflowY: 'auto' }}>
                          {selectedMeta.keywords && selectedMeta.keywords.length > 0 ? (
                            selectedMeta.keywords.map((kw, kwIdx) => (
                              <span 
                                key={kwIdx}
                                style={{
                                  background: '#fff', border: '1px solid #D1D1E4', color: '#4E4E6D',
                                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                                  display: 'inline-flex', alignItems: 'center', gap: 4
                                }}
                              >
                                {kw}
                                <button 
                                  type="button" 
                                  onClick={() => removeKeywordTag(selectedFile.id, kwIdx)}
                                  style={{ background: 'none', border: 'none', color: '#9898B5', padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                >
                                  <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: 11, color: '#9898B5', fontStyle: 'italic', padding: 4 }}>
                              {selectedMeta.status === 'processing' ? 'Generating keywords...' : 'No keywords generated yet.'}
                            </span>
                          )}
                        </div>

                        {/* Add Custom Tag */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <input
                            type="text"
                            id="new_tag_input"
                            placeholder="Add tag..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addKeywordTag(selectedFile.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            style={{
                              flex: 1, padding: '6px 12px',
                              background: '#fff', border: '1px solid #E4E4EF',
                              borderRadius: 8, fontSize: 12, outline: 'none'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById('new_tag_input');
                              if (el) {
                                addKeywordTag(selectedFile.id, el.value);
                                el.value = '';
                              }
                            }}
                            style={{
                              background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 8,
                              fontSize: 11, fontWeight: 700, color: '#4E4E6D', padding: '6px 12px', cursor: 'pointer'
                            }}
                          >
                            Add Tag
                          </button>
                        </div>

                        {/* Raw Comma-Separated Input for Quick Clipboard Copy/Paste */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                          <label style={{ fontSize: 9, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase' }}>Edit as Raw CSV string</label>
                          <textarea
                            value={selectedMeta.keywords ? selectedMeta.keywords.join(', ') : ''}
                            onChange={(e) => handleKeywordsChange(selectedFile.id, e.target.value)}
                            disabled={selectedMeta.status === 'processing'}
                            rows="2"
                            style={{
                              width: '100%', padding: '8px 12px',
                              background: '#F7F7FB', border: '1px solid #E4E4EF',
                              borderRadius: 9, fontSize: 11, fontWeight: 600,
                              color: '#111128', outline: 'none', resize: 'none', fontFamily: 'monospace'
                            }}
                          />
                        </div>
                      </div>

                      {/* Display Failed Error If Present */}
                      {selectedMeta.status === 'failed' && (
                        <div style={{ border: '1px solid #FCA5A5', background: '#FEF2F2', padding: '10px 12px', borderRadius: 8, display: 'flex', gap: 8 }}>
                          <svg style={{ color: '#EF4444', flexShrink: 0, width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12" y2="16" />
                          </svg>
                          <p style={{ fontSize: 11, color: '#B91C1C', margin: 0, fontWeight: 600 }}>
                            {selectedMeta.error || 'Metadata generation failed.'}
                          </p>
                        </div>
                      )}

                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#9898B5', gap: 10 }}>
                    <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <p style={{ fontSize: 12, fontWeight: 600 }}>Select an image from the sidebar to inspect or edit</p>
                  </div>
                )}
              </div>

              {/* Right Column: Settings */}
              <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* METADATA RULES SETTINGS CARD */}
                <div style={{ background: '#fff', border: '1px solid #E4E4EF', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ borderBottom: '1px solid #F1F1F7', paddingBottom: 8 }}>
                    <h4 style={{ fontSize: 10, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                      Metadata Rules
                    </h4>
                  </div>

                  {/* Title Constraint Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>Max Title Length</label>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#7342E6' }}>{titleLength} ch</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="200" 
                      value={titleLength} 
                      onChange={(e) => setTitleLength(parseInt(e.target.value, 10))} 
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Keyword Format SegControl */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A', display: 'block', marginBottom: 6 }}>Keyword Format</label>
                    <div style={{ display: 'flex', background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 8, padding: 2 }}>
                      {['Single', 'Double', 'Auto'].map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setKeywordFormat(fmt)}
                          style={{
                            flex: 1, padding: '5px 8px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: keywordFormat === fmt ? '#fff' : 'transparent',
                            color: keywordFormat === fmt ? '#7342E6' : '#9898B5',
                            boxShadow: keywordFormat === fmt ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keyword Count Constraint Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>Keywords count</label>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#7342E6' }}>{keywordLength} tags</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="50" 
                      value={keywordLength} 
                      onChange={(e) => setKeywordLength(parseInt(e.target.value, 10))} 
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Include Keywords Textarea */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>Include Keywords (force tag insertion)</label>
                    <textarea
                      value={includeKeywords}
                      onChange={(e) => setIncludeKeywords(e.target.value)}
                      placeholder="e.g. sunset, beautiful, orange sky"
                      rows="2"
                      style={{
                        width: '100%', padding: '8px 12px',
                        background: '#F7F7FB', border: '1px solid #E4E4EF',
                        borderRadius: 9, fontSize: 12, fontWeight: 600,
                        color: '#111128', outline: 'none', resize: 'none'
                      }}
                    />
                  </div>

                  {/* Exclude Keywords Textarea */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>Exclude Keywords (forbidden terms)</label>
                    <textarea
                      value={excludeKeywords}
                      onChange={(e) => setExcludeKeywords(e.target.value)}
                      placeholder="e.g. brand names, watermark, blur"
                      rows="2"
                      style={{
                        width: '100%', padding: '8px 12px',
                        background: '#F7F7FB', border: '1px solid #E4E4EF',
                        borderRadius: 9, fontSize: 12, fontWeight: 600,
                        color: '#111128', outline: 'none', resize: 'none'
                      }}
                    />
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </ToolPageShell>
  );
}
