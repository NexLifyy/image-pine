"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const ADOBE_STOCK_CATEGORIES = [
  { id: 1, name: 'Animals' },
  { id: 2, name: 'Buildings and Architecture' },
  { id: 3, name: 'Business' },
  { id: 4, name: 'Drinks' },
  { id: 5, name: 'The Environment' },
  { id: 6, name: 'States of Mind' },
  { id: 7, name: 'Food' },
  { id: 8, name: 'Graphic Resources' },
  { id: 9, name: 'Hobbies and Leisure' },
  { id: 10, name: 'Industry' },
  { id: 11, name: 'Landscapes' },
  { id: 12, name: 'Lifestyle' },
  { id: 13, name: 'People' },
  { id: 14, name: 'Plants and Flowers' },
  { id: 15, name: 'Culture and Religion' },
  { id: 16, name: 'Science' },
  { id: 17, name: 'Social Issues' },
  { id: 18, name: 'Sports' },
  { id: 19, name: 'Technology' },
  { id: 20, name: 'Transport' },
  { id: 21, name: 'Travel' }
];

const enforceTitleLength = (title, targetLength, keywords) => {
  let refinedTitle = title.trim();
  if (refinedTitle.length === targetLength) {
    return refinedTitle;
  }
  
  if (refinedTitle.length > targetLength) {
    // Truncate cleanly at a space
    let truncated = refinedTitle.substring(0, targetLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > targetLength / 2) {
      truncated = truncated.substring(0, lastSpace);
    }
    return truncated.trim();
  }
  
  // If shorter, append keywords
  let separator = ' - ';
  let kwList = [...(keywords || [])];
  
  if (kwList.length > 0) {
    while (refinedTitle.length + separator.length + kwList[0].length <= targetLength) {
      const kw = kwList.shift();
      refinedTitle += separator + kw;
      separator = ', ';
      kwList.push(kw);
    }
  }
  
  return refinedTitle;
};

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
    title: 'OpenRouter-Powered Vision',
    desc: 'Uses OpenRouter\'s free multimodal vision models to extract highly descriptive and relevant metadata tags from your assets instantly.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    ),
    title: 'Up to 500 Files',
    desc: 'Efficiently batch process lists of up to 500 images, video frames, and SVGs sequentially with a visual progress bar.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
    title: 'Format Presets',
    desc: 'Choose between Single keywords, Double keyword phrases, or Auto keyword formats to match your catalog requirements.'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 14l-4 4v2h2v-2h2v-2h2l-2-2z" />
        <circle cx="14" cy="10" r="3" />
        <path d="M21 12a9 9 0 0 0-9-9" />
        <path d="M3 12a9 9 0 0 0 9 9" />
        <polyline points="18 3 21 3 21 6" />
        <polyline points="6 21 3 21 3 18" />
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
  { n: '1', title: 'Save API Keys & Upload', desc: 'Add your free OpenRouter API key, save it to cookies, and upload up to 500 files.' },
  { n: '2', title: 'Set Rules & Generate', desc: 'Choose your desired title length, keyword formats, and trigger the batch generator.' },
  { n: '3', title: 'Edit & Download CSV', desc: 'Verify and refine results directly in the app, then download the structured CSV file.' }
];

const _FAQS = [
  {
    q: "Where do I find my OpenRouter API key?",
    a: "You can create a free API key at openrouter.ai/keys. No credit card required — just sign up and generate a key instantly."
  },
  {
    q: "How does the fallback key rotation work?",
    a: "OpenRouter free models allow up to 20 requests/min. By providing up to 3 keys, if key 1 hits an HTTP 429 error, the tool automatically rotates to key 2, then key 3, keeping your batch runs uninterrupted."
  },
  {
    q: "Are my files stored on OpenRouter?",
    a: "No, OpenRouter does not store your files permanently; they are processed temporarily for metadata inference. Image Pine downscales image frames locally before uploading to conserve your bandwidth and API limits."
  },
  {
    q: "Can I edit the generated titles and keywords before exporting?",
    a: "Yes. Simply click any file in the sidebar to load it in the middle panel, where you can modify the title and keywords. The changes save instantly and will be reflected in the final CSV."
  },
  {
    q: "What AI model is used for image analysis?",
    a: "The generator uses Llama 3.2 11B Vision Instruct (free) by default via OpenRouter, with automatic fallback to Llama 3.2 90B Vision and other free models if needed. All models are completely free with no daily quota cap."
  },
  {
    q: "How do I import the output CSV file into stock photo websites?",
    a: "The generated CSV conforms to standard metadata import templates used by major stock platforms like Adobe Stock, Shutterstock, and iStock, allowing you to upload and map files instantly."
  }
];

const enforceDescLength = (desc, targetLength, keywords) => {
  let refinedDesc = desc.trim();
  if (refinedDesc.length === targetLength) {
    return refinedDesc;
  }
  
  if (refinedDesc.length > targetLength) {
    // Truncate cleanly at a space
    let truncated = refinedDesc.substring(0, targetLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > targetLength / 2) {
      truncated = truncated.substring(0, lastSpace);
    }
    return truncated.trim();
  }
  
  // If shorter, append keywords
  let separator = ' - ';
  let kwList = [...(keywords || [])];
  
  if (kwList.length > 0) {
    while (refinedDesc.length + separator.length + kwList[0].length <= targetLength) {
      const kw = kwList.shift();
      refinedDesc += separator + kw;
      separator = ', ';
      kwList.push(kw);
    }
  }
  
  return refinedDesc;
};

// Helper to construct OpenRouter API Prompt
const buildPrompt = (settings) => {
  const { titleLength, descriptionLength, keywordFormat, keywordLength, includeKeywords, excludeKeywords } = settings;

  let formatDesc = "Auto-mixture (could be single words or short phrases)";
  if (keywordFormat === 'Single') {
    formatDesc = "Single words ONLY (no spaces allowed in any keyword)";
  } else if (keywordFormat === 'Double') {
    formatDesc = "Two-word phrases ONLY (each keyword must contain exactly two words separated by a space)";
  }

  let prompt = `Analyze this image and generate SEO-optimized metadata.
Return a JSON object containing exactly four keys: "title", "description", "keywords", and "category".

Constraints:
1. "title": A descriptive, search-friendly title. The title should be around ${titleLength} characters in total length (under ${titleLength} characters).
2. "description": A detailed, SEO-friendly description of the image content. The description should be around ${descriptionLength} characters in total length (under ${descriptionLength} characters).
3. "keywords": An array of descriptive keywords/tags. It should contain around ${keywordLength} keywords (maximum ${keywordLength} items).
4. Keyword format: Each keyword in the array must be in the format: ${formatDesc}.
5. "category": An integer between 1 and 21 representing the best-matching category from the list below:
   1 - Animals
   2 - Buildings and Architecture
   3 - Business
   4 - Drinks
   5 - The Environment
   6 - States of Mind
   7 - Food
   8 - Graphic Resources
   9 - Hobbies and Leisure
   10 - Industry
   11 - Landscapes
   12 - Lifestyle
   13 - People
   14 - Plants and Flowers
   15 - Culture and Religion
   16 - Science
   17 - Social Issues
   18 - Sports
   19 - Technology
   20 - Transport
   21 - Travel
`;

  if (includeKeywords.trim()) {
    prompt += `6. Inclusion: You MUST include the following words/tags (or highly similar variants) in the keywords array: ${includeKeywords}.\n`;
  }
  if (excludeKeywords.trim()) {
    prompt += `7. Exclusion: You MUST NOT include any of the following words/tags (or variants) in the title, description or keywords array: ${excludeKeywords}.\n`;
  }

  prompt += `\nResponse format MUST be a raw, valid JSON object matching this schema exactly. Do NOT wrap the JSON output in markdown code blocks, backticks, or any conversational text. The response must start with { and end with }:\n{
  "title": "your title string here",
  "description": "your description string here",
  "keywords": ["keyword1", "keyword2", ...],
  "category": 12
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

// Helper to extract a representative frame from a Video file locally
const getVideoFrameB64 = (fileObj) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    
    const fileUrl = URL.createObjectURL(fileObj);
    video.src = fileUrl;
    
    video.onloadeddata = () => {
      // Seek to 1 second or 50% of duration to get a representative frame
      const duration = video.duration || 10;
      video.currentTime = Math.min(1.0, duration / 2);
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1024;
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 480;
        
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
        ctx.drawImage(video, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const b64 = dataUrl.split(',')[1];
        
        URL.revokeObjectURL(fileUrl);
        resolve({ b64, mimeType: 'image/jpeg' });
      } catch (err) {
        URL.revokeObjectURL(fileUrl);
        reject(err);
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(fileUrl);
      reject(new Error("Failed to load video file."));
    };
  });
};

// Helper to downscale and resize image/SVG locally to <= 1024px before base64
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

// API Call with 3-Key Fallback, Rotational Logic, and Cooldown Retry (OpenRouter API)
// shouldContinue: optional fn() => bool — if it returns false, cooldown is aborted
const callOpenRouterApiWithFallback = async (imageB64, mimeType, prompt, apiKeys, model, currentKeyIdx, onKeySwitch, shouldContinue) => {
  const activeKeys = apiKeys.filter(k => k.trim() !== '');
  if (activeKeys.length === 0) {
    throw new Error("No API keys configured. Please configure at least one API key.");
  }

  // Candidate OpenRouter free vision models in priority order
  const candidateModels = [
    model,
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'meta-llama/llama-3.2-90b-vision-instruct:free',
    'google/gemini-2.0-flash-exp:free',
    'qwen/qwen2.5-vl-7b-instruct:free'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  const buildPayload = (currentModel) => ({
    model: currentModel,
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant that analyzes images. Respond ONLY with a raw JSON object — no markdown, no code fences, no explanations. Start your response with { and end with }.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageB64}` } }
        ]
      }
    ],
    temperature: 0.2,
    max_tokens: 1500
  });

  const tryFetch = async (key, payload) => fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://imagepine.com',
      'X-Title': 'Image Pine'
    },
    body: JSON.stringify(payload)
  });

  // Attempt all keys. Returns { data, keyUsedIndex, modelUsed } or null if all 429.
  const tryAllKeys = async (startIdx) => {
    let index = startIdx % activeKeys.length;
    for (let attempts = 0; attempts < activeKeys.length; attempts++) {
      const key = activeKeys[index];
      let success = false;
      let resultData = null;
      let modelUsed = candidateModels[0];

      // Try each candidate model for this key
      for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
        const currentModel = candidateModels[mIdx];
        try {
          const payload = buildPayload(currentModel);
          let response = await tryFetch(key, payload);

          // Per-key 429 retry with backoff: 5s, 10s, 20s
          if (response.status === 429) {
            const delays = [5000, 10000, 20000];
            for (let retryCount = 0; retryCount < delays.length && response.status === 429; retryCount++) {
              onKeySwitch?.(`Rate limited (429) on Key ${index + 1} / ${currentModel}. Retrying in ${delays[retryCount] / 1000}s (attempt ${retryCount + 1}/3)...`);
              await new Promise(r => setTimeout(r, delays[retryCount]));
              response = await tryFetch(key, payload);
            }
          }

          // Still 429 after retries — this key is exhausted, break to next key
          if (response.status === 429) {
            onKeySwitch?.(`Key ${index + 1} still rate limited after retries. Trying next key...`);
            break;
          }

          if (!response.ok) {
            const errText = await response.text();
            onKeySwitch?.(`Model ${currentModel} failed (Status ${response.status}). Trying next model...`);
            if (mIdx < candidateModels.length - 1) continue;
            throw new Error(`API Error (Status ${response.status}): ${errText}`);
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (!content || content.trim() === '') {
            onKeySwitch?.(`Model ${currentModel} returned empty output. Trying next model...`);
            if (mIdx < candidateModels.length - 1) continue;
            throw new Error(`Model ${currentModel} returned an empty response.`);
          }

          resultData = data;
          modelUsed = currentModel;
          success = true;
          break;
        } catch (err) {
          if (mIdx < candidateModels.length - 1) {
            onKeySwitch?.(`Error with ${currentModel}: ${err.message}. Trying next model...`);
          }
          // Last model for this key — bubble up to rotate key
          if (mIdx === candidateModels.length - 1) break;
        }
      }

      if (success) return { data: resultData, keyUsedIndex: index, modelUsed };

      // Rotate to next key
      index = (index + 1) % activeKeys.length;
    }
    return null; // All keys 429 or failed
  };

  // First pass: try all keys
  const firstPass = await tryAllKeys(currentKeyIdx % activeKeys.length);
  if (firstPass) return firstPass;

  // All keys are rate-limited — wait 60s then retry once
  const COOLDOWN = 60;
  onKeySwitch?.(`⏳ All ${activeKeys.length} API key(s) are rate limited (429). Waiting ${COOLDOWN}s for OpenRouter limits to reset...`);
  for (let s = COOLDOWN; s > 0; s--) {
    if (shouldContinue && !shouldContinue()) {
      throw new Error('Generation stopped by user during cooldown.');
    }
    await new Promise(r => setTimeout(r, 1000));
    if (s % 15 === 0 || s <= 5) {
      onKeySwitch?.(`⏳ Rate limit cooldown: ${s}s remaining...`);
    }
  }

  if (shouldContinue && !shouldContinue()) {
    throw new Error('Generation stopped by user during cooldown.');
  }

  onKeySwitch?.('🔄 Retrying all keys after cooldown...');
  const secondPass = await tryAllKeys(0);
  if (secondPass) return secondPass;

  throw new Error(`All configured API keys returned rate limits (429). Please add more API keys or wait a few minutes before resuming.`);
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
  const [toast, setToast] = useState(null); // { message, type }

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Dynamic API Keys configuration
  const [apiKeys, setApiKeys] = useState(['']); // Starts with one key input
  const [showConfig, setShowConfig] = useState(true);
  const [showKeys, setShowKeys] = useState([false, false, false]);
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState(''); // 'testing' | 'success' | 'failed' | ''
  const [testMessage, setTestMessage] = useState('');

  // Sliders and options
  const [titleLength, setTitleLength] = useState(150);
  const [descriptionLength, setDescriptionLength] = useState(250);
  const [keywordFormat, setKeywordFormat] = useState('Auto');
  const [keywordLength, setKeywordLength] = useState(20);
  const [includeKeywords, setIncludeKeywords] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');

  const dropdownRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [isEditorial, setIsEditorial] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Queue Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metadataMap, setMetadataMap] = useState({});

  const isGeneratingRef = useRef(false);
  const currentKeyIndexRef = useRef(0);
  const [selectedModel, setSelectedModel] = useState('meta-llama/llama-3.2-11b-vision-instruct:free');

  // Load API keys from browser cookies on mount
  useEffect(() => {
    const k1 = getCookie('openrouter_key_1') || '';
    const k2 = getCookie('openrouter_key_2') || '';
    const k3 = getCookie('openrouter_key_3') || '';
    const savedModel = getCookie('openrouter_model') || 'meta-llama/llama-3.2-11b-vision-instruct:free';
    
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

    setSelectedModel(savedModel);
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
    // Filter out any empty keys to prevent saving blank slots or rendering them on refresh
    const cleanKeys = apiKeys.map(k => k.trim()).filter(Boolean);
    const finalKeys = cleanKeys.length > 0 ? cleanKeys : [''];
    
    setApiKeys(finalKeys);

    // Save to cookies
    setCookie('openrouter_key_1', finalKeys[0] || '', 365);
    setCookie('openrouter_key_2', finalKeys[1] || '', 365);
    setCookie('openrouter_key_3', finalKeys[2] || '', 365);
    
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
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firstKey}`,
          'HTTP-Referer': 'https://imagepine.com',
          'X-Title': 'Image Pine'
        },
        body: JSON.stringify({
          model: selectedModel || 'meta-llama/llama-3.2-11b-vision-instruct:free',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        setTestStatus('success');
        setTestMessage('Test Successful! API Connection is valid.');
        addLog("API check passed.", "success");
      } else {
        const text = await response.text();
        let detail = '';
        try { detail = JSON.parse(text)?.error?.message || text; } catch { detail = text; }
        setTestStatus('failed');
        setTestMessage(`Test failed (Status ${response.status}): ${detail.slice(0, 120)}`);
        addLog(`API check failed: ${text}`, "error");
      }
    } catch (err) {
      setTestStatus('failed');
      setTestMessage(`Connection error: ${err.message}`);
      addLog(`API connection error: ${err.message}`, "error");
    }
  };

  const handleFileSelect = async (newFiles) => {
    if (files.length + newFiles.length > 500) {
      const allowedCount = 500 - files.length;
      if (allowedCount <= 0) {
        showToast("Upload limit is 500 files. You cannot upload any more files.", "error");
        return;
      }
      showToast(`Upload limit is 500 files. Only the first ${allowedCount} files have been added.`, "warning");
      newFiles = newFiles.slice(0, allowedCount);
    }

    const sanitized = await Promise.all(newFiles.map(async (f) => {
      if (!f.preview) {
        const nameLower = f.name.toLowerCase();
        const isVideoFile = f.type?.startsWith('video/') || ['.mp4', '.webm', '.mov', '.ogg'].some(ext => nameLower.endsWith(ext));
        
        if (isVideoFile) {
          try {
            // Generate locally a visual frame to represent the video thumbnail and upload payload
            const { b64, mimeType } = await getVideoFrameB64(f);
            f.preview = `data:${mimeType};base64,${b64}`;
            f.isVideo = true;
          } catch (e) {
            console.error("Failed to capture video thumbnail:", e);
            f.preview = null;
            f.isVideo = true;
          }
        } else if (f.type?.startsWith('image/') || nameLower.endsWith('.svg')) {
          f.preview = URL.createObjectURL(f);
        }
      }
      return f;
    }));

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
      if (f.preview && !f.preview.startsWith('data:')) {
        URL.revokeObjectURL(f.preview);
      }
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
      showToast("No files uploaded. Please upload at least one file.", "error");
      return;
    }

    const activeKeys = apiKeys.filter(k => k.trim() !== '');
    if (activeKeys.length === 0) {
      setShowConfig(true);
      showToast("Please configure and save at least one OpenRouter API Key under 'API Configuration' first.", "warning");
      return;
    }

    setIsGenerating(true);
    isGeneratingRef.current = true;
    addLog(`Starting metadata generation batch run for ${files.length} files...`, "info");

    const pendingFiles = files.filter(f => {
      const meta = metadataMap[f.id];
      return !meta || meta.status !== 'completed';
    });

    if (pendingFiles.length === 0) {
      showToast("All uploaded files already have completed metadata.", "info");
      setIsGenerating(false);
      isGeneratingRef.current = false;
      return;
    }

    const settings = {
      titleLength,
      descriptionLength,
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
          description: prev[file.id]?.description || '',
          keywords: prev[file.id]?.keywords || [],
          status: 'processing',
          error: ''
        }
      }));
      setSelectedFile(file); // Show the currently generating file in preview
      addLog(`Processing: ${file.name}`, "info");

      try {
        let b64 = '';
        let mimeType = 'image/jpeg';

        // Check if we already have the local raster frame captured (e.g. for video preview)
        if (file.preview && file.preview.startsWith('data:image/')) {
          b64 = file.preview.split(',')[1];
        } else {
          // Downscale image/SVG locally
          const res = await getResizedImageB64(file);
          b64 = res.b64;
          mimeType = res.mimeType;
        }

        // Send API Request to OpenRouter
        const { data, keyUsedIndex, modelUsed } = await callOpenRouterApiWithFallback(
          b64,
          mimeType,
          prompt,
          apiKeys,
          selectedModel,
          currentKeyIndexRef.current,
          (msg) => {
            addLog(msg, "warning");
            // Surface cooldown to the user as a toast
            if (msg.startsWith('⏳ All')) {
              showToast(msg, 'warning');
            }
          },
          () => isGeneratingRef.current
        );

        // Update key pointer to the active working key
        currentKeyIndexRef.current = keyUsedIndex;

        const content = data.choices?.[0]?.message?.content || '{}';
        const parsed = parseGrokResponse(content);

        const resTitle = parsed.title || '';
        const resDesc = parsed.description || '';
        const resKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
        const resCategory = parsed.category ? parseInt(parsed.category, 10) : '';

        const exactTitle = enforceTitleLength(resTitle, titleLength, resKeywords);
        const exactDesc = enforceDescLength(resDesc, descriptionLength, resKeywords);

        setMetadataMap(prev => ({
          ...prev,
          [file.id]: {
            title: exactTitle,
            description: exactDesc,
            keywords: resKeywords,
            category: isNaN(resCategory) ? '' : resCategory,
            status: 'completed',
            error: ''
          }
        }));

        addLog(`Successfully processed ${file.name} using ${modelUsed} (Key ${keyUsedIndex + 1})`, "success");

        // 3s inter-image delay to stay within OpenRouter's 20 req/min free tier
        const isLastFile = pendingFiles.indexOf(file) === pendingFiles.length - 1;
        if (!isLastFile && isGeneratingRef.current) {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (err) {
        console.error(err);
        setMetadataMap(prev => ({
          ...prev,
          [file.id]: {
            title: prev[file.id]?.title || '',
            description: prev[file.id]?.description || '',
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
        ...(prev[fileId] || { keywords: [], status: 'pending', error: '', category: '' }),
        title: val
      }
    }));
  };

  const handleDescriptionChange = (fileId, val) => {
    setMetadataMap(prev => ({
      ...prev,
      [fileId]: {
        ...(prev[fileId] || { keywords: [], status: 'pending', error: '', category: '' }),
        description: val
      }
    }));
  };

  const handleCategoryChange = (fileId, val) => {
    setMetadataMap(prev => ({
      ...prev,
      [fileId]: {
        ...(prev[fileId] || { title: '', keywords: [], status: 'pending', error: '' }),
        category: val ? parseInt(val, 10) : ''
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

  const downloadPlatformCsv = (platform) => {
    if (files.length === 0) {
      showToast("No data available to export.", "error");
      return;
    }

    let headers = [];
    let delimiter = ',';
    let filename = `metadata_${platform.toLowerCase().replace(/\s+/g, '_')}.csv`;

    const mapToShutterstockCategory = (catId) => {
      const mapping = {
        1: 'Animals/Wildlife',
        2: 'Buildings/Landmarks',
        3: 'Business/Finance',
        4: 'Food and Drink',
        5: 'Nature',
        6: 'Miscellaneous',
        7: 'Food and Drink',
        8: 'Backgrounds/Textures',
        9: 'Sports/Recreation',
        10: 'Industrial',
        11: 'Nature',
        12: 'People',
        13: 'People',
        14: 'Nature',
        15: 'Religion',
        16: 'Science',
        17: 'Miscellaneous',
        18: 'Sports/Recreation',
        19: 'Technology',
        20: 'Transportation',
        21: 'Transportation'
      };
      return mapping[catId] || '';
    };

    const escapeCsv = (str) => {
      return `"${String(str || '').replace(/"/g, '""')}"`;
    };

    if (platform === 'Adobe Stock') {
      headers = ['Filename', 'Title', 'Keywords', 'Category'];
    } else if (platform === 'Shutterstock') {
      headers = ['Filename', 'Description', 'Keywords', 'Categories'];
    } else if (platform === 'Vecteezy') {
      headers = ['Filename', 'Title', 'Description', 'Keywords'];
    } else if (platform === '123RF') {
      headers = ['Filename', 'Title', 'Description', 'Keywords'];
    } else if (platform === 'Magnific') {
      headers = ['File name', 'Title', 'Keywords', 'if generated with AI - Prompt', 'Model'];
      delimiter = ';';
    } else if (platform === 'DepositPhotos') {
      headers = ['Filename', 'Title', 'Description', 'Keywords', 'editorial'];
    } else if (platform === 'iStock') {
      headers = ['file name', 'title', 'description', 'keywords', 'editorial'];
    } else if (platform === 'Pond5') {
      headers = ['OriginalFilename', 'Title', 'Description', 'Keywords', 'Editorial'];
    }

    const rows = files.map(f => {
      const meta = metadataMap[f.id] || {};
      const title = meta.title || '';
      const description = meta.description || meta.title || '';
      const kws = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : '';
      const category = meta.category || '';

      if (platform === 'Adobe Stock') {
        const cleanTitle = title.substring(0, 70);
        return [
          escapeCsv(f.name),
          escapeCsv(cleanTitle),
          escapeCsv(kws),
          escapeCsv(category)
        ].join(delimiter);
      } else if (platform === 'Shutterstock') {
        const catText = mapToShutterstockCategory(category);
        return [
          escapeCsv(f.name),
          escapeCsv(description),
          escapeCsv(kws),
          escapeCsv(catText)
        ].join(delimiter);
      } else if (platform === 'Vecteezy' || platform === '123RF') {
        return [
          escapeCsv(f.name),
          escapeCsv(title),
          escapeCsv(description),
          escapeCsv(kws)
        ].join(delimiter);
      } else if (platform === 'DepositPhotos') {
        return [
          escapeCsv(f.name),
          escapeCsv(title),
          escapeCsv(description),
          escapeCsv(kws),
          escapeCsv(isEditorial ? 'yes' : 'no')
        ].join(delimiter);
      } else if (platform === 'Magnific') {
        const promptVal = isAiGenerated ? 'Analyze this image and generate SEO-optimized metadata. Return JSON with title, description, keywords, category.' : '';
        const modelVal = isAiGenerated ? selectedModel : '';
        return [
          escapeCsv(f.name),
          escapeCsv(title),
          escapeCsv(kws),
          escapeCsv(promptVal),
          escapeCsv(modelVal)
        ].join(delimiter);
      } else if (platform === 'iStock') {
        return [
          escapeCsv(f.name),
          escapeCsv(title),
          escapeCsv(description),
          escapeCsv(kws),
          escapeCsv(isEditorial ? 'yes' : 'no')
        ].join(delimiter);
      } else if (platform === 'Pond5') {
        return [
          escapeCsv(f.name),
          escapeCsv(title),
          escapeCsv(description),
          escapeCsv(kws),
          escapeCsv(isEditorial ? 'yes' : 'no')
        ].join(delimiter);
      }
    });

    const csvContent = [headers.join(delimiter), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
    
    saveHistory('Generate Metadata', `Exported CSV metadata for ${files.length} files (${platform})`);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  // State elements derived
  const selectedMeta = selectedFile ? metadataMap[selectedFile.id] || { title: '', description: '', keywords: [], category: '', status: 'pending', error: '' } : null;
  const progressPercent = files.length > 0 ? Math.round((progress / files.length) * 100) : 0;
  const numConfiguredKeys = apiKeys.filter(k => k.trim() !== '').length;

  return (
    <ToolPageShell
      title="Generate Metadata"
      subtitle="Instantly generate SEO tags, titles, and descriptions for your files using free OpenRouter vision AI. Ideal for stock photography cataloging."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoTitle="AI Image Metadata Generator — Batch Generate Titles, Tags & Descriptions"
      seoText="Free online client-side AI Metadata Generator. Batch generate search engine metadata tags, file descriptions, and titles for your portfolio using OpenRouter free vision models. Custom lengths, keyword rules, and local CSV downloads with total privacy."
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
                  {numConfiguredKeys > 0 ? `${numConfiguredKeys} key${numConfiguredKeys > 1 ? 's' : ''} configured` : 'Enter OpenRouter API key to start'}
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
                Provide up to three OpenRouter API Keys. Keys are stored securely in browser cookies and sent directly to OpenRouter. If key 1 hits a rate limit (HTTP 429), rotation fallbacks will proceed to key 2, then key 3.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {apiKeys.map((key, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showKeys[idx] ? 'text' : 'password'}
                        value={key}
                        onChange={(e) => handleKeyChange(idx, e.target.value)}
                        placeholder={`OpenRouter API Key ${idx + 1}`}
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
                  href="https://openrouter.ai/keys"
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
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp', '.svg', '.mp4', '.webm', '.mov', '.ogg']}
              multiple={true}
              buttonLabel="Choose Batch Files"
              maxSizeMB={50}
            />
            <p style={{ textAlign: 'center', fontSize: 11, color: '#9898B5', marginTop: 12 }}>
              Upload up to 500 catalog items. PNG, JPEG, WebP, SVG and video files (MP4, WebM, MOV, OGG) supported.
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
                    Processed {progress} of {files.length} files ({progressPercent}%)
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
                  
                  <div 
                    ref={dropdownRef} 
                    style={{ position: 'relative', display: 'inline-block' }}
                    onMouseEnter={() => !isGenerating && setShowDropdown(true)}
                    onMouseLeave={() => setShowDropdown(false)}
                  >
                    <button
                      type="button"
                      onClick={() => !isGenerating && setShowDropdown(!showDropdown)}
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
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" style={{ marginLeft: 2, transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showDropdown && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: 6,
                          background: '#fff',
                          border: '1px solid #E4E4EF',
                          borderRadius: 12,
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          zIndex: 1000,
                          minWidth: 160,
                          padding: '6px 0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          overflow: 'hidden'
                        }}
                      >
                        {[
                          'Adobe Stock',
                          'Shutterstock',
                          'Vecteezy',
                          '123RF',
                          'Magnific',
                          'DepositPhotos',
                          'iStock',
                          'Pond5'
                        ].map((plat) => (
                          <button
                            key={plat}
                            type="button"
                            onClick={() => {
                              downloadPlatformCsv(plat);
                              setShowDropdown(false);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#111128',
                              padding: '8px 16px',
                              textAlign: 'left',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              width: '100%',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#7342E608';
                              e.currentTarget.style.color = '#7342E6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none';
                              e.currentTarget.style.color = '#111128';
                            }}
                          >
                            {plat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

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
              
              {/* Left Column: List of 500 Files (Sidebar) */}
              <div className="lg:col-span-3" style={{ background: '#fff', border: '1px solid #E4E4EF', borderRadius: 20, padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 600, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F1F7', paddingBottom: 8 }}>
                  <h4 style={{ fontSize: 10, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                    Uploads ({files.length})
                  </h4>
                  
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/ogg';
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
                          <div style={{ width: 34, height: 34, borderRadius: 6, background: '#F7F7FB', border: '1px solid #E4E4EF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" fill="none" stroke="#6B6B8A" viewBox="0 0 24 24" strokeWidth="2.2">
                              <path d="M23 7a2 2 0 0 0-2-2h-4v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7zM1 7a2 2 0 0 1 2-2h4v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7z" />
                            </svg>
                          </div>
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#111128', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>
                            {f.name}
                          </p>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                            <span style={{ fontSize: 9, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                            {f.isVideo && <span style={{ background: '#7342E615', color: '#7342E6', fontSize: 8, padding: '1px 4px', borderRadius: 4, fontWeight: 800 }}>Video</span>}
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
                        {selectedFile.isVideo && " · Video Frame"}
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

                      {/* Description Box */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: 11, fontWeight: 800, color: '#4E4E6D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
                          <span style={{ fontSize: 10, color: (selectedMeta.description?.length > descriptionLength) ? '#EF4444' : '#9898B5', fontWeight: 600 }}>
                            {selectedMeta.description?.length || 0} / {descriptionLength} ch
                          </span>
                        </div>
                        <textarea
                          rows="3"
                          value={selectedMeta.description || ''}
                          onChange={(e) => handleDescriptionChange(selectedFile.id, e.target.value)}
                          placeholder={selectedMeta.status === 'processing' ? 'Generating description...' : 'Metadata Description'}
                          disabled={selectedMeta.status === 'processing'}
                          style={{
                            width: '100%', padding: '9px 12px',
                            background: '#F7F7FB', border: '1px solid #E4E4EF',
                            borderRadius: 9, fontSize: 13, fontWeight: 600,
                            color: '#111128', outline: 'none', resize: 'vertical'
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
                    <p style={{ fontSize: 12, fontWeight: 600 }}>Select a file from the sidebar to inspect or edit</p>
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

                  {/* Batch Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        id="isAiGenerated"
                        checked={isAiGenerated}
                        onChange={(e) => setIsAiGenerated(e.target.checked)}
                        style={{ 
                          width: 15, 
                          height: 15, 
                          cursor: 'pointer'
                        }}
                      />
                      <label 
                        htmlFor="isAiGenerated" 
                        style={{ 
                          fontSize: 11, 
                          fontWeight: 700, 
                          color: '#6B6B8A', 
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        Mark batch as AI-generated (Magnific)
                      </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        id="isEditorial"
                        checked={isEditorial}
                        onChange={(e) => setIsEditorial(e.target.checked)}
                        style={{ 
                          width: 15, 
                          height: 15, 
                          cursor: 'pointer'
                        }}
                      />
                      <label 
                        htmlFor="isEditorial" 
                        style={{ 
                          fontSize: 11, 
                          fontWeight: 700, 
                          color: '#6B6B8A', 
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        Mark batch as Editorial (iStock, DepositPhotos, Pond5)
                      </label>
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#F1F1F7', margin: '4px 0' }} />

                  {/* Model Selection Dropdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>Preferred AI Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        setCookie('openrouter_model', e.target.value, 365);
                        addLog(`Preferred model changed to: ${e.target.value}`, "info");
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#F7F7FB',
                        border: '1px solid #E4E4EF',
                        borderRadius: 9,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#3B3B5E',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="meta-llama/llama-3.2-11b-vision-instruct:free">Llama 3.2 11B Vision (Default · Free)</option>
                      <option value="meta-llama/llama-3.2-90b-vision-instruct:free">Llama 3.2 90B Vision (Better · Free)</option>
                      <option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash (via OpenRouter · Free)</option>
                      <option value="qwen/qwen2.5-vl-7b-instruct:free">Qwen 2.5 VL 7B Vision (Free)</option>
                    </select>
                  </div>

                  <div style={{ height: 1, background: '#F1F1F7', margin: '4px 0' }} />

                  {/* Title Constraint Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>Adjust Title Length</label>
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

                  {/* Description Constraint Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>Adjust Description Length</label>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#7342E6' }}>{descriptionLength} ch</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="300" 
                      value={descriptionLength} 
                      onChange={(e) => setDescriptionLength(parseInt(e.target.value, 10))} 
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

        {toast && (
          <div 
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: toast.type === 'error' ? '#FFF5F5' : toast.type === 'success' ? '#ECFDF5' : toast.type === 'warning' ? '#FFFBEB' : '#F4F4F5',
              border: `1px solid ${toast.type === 'error' ? '#FCA5A5' : toast.type === 'success' ? '#A7F3D0' : toast.type === 'warning' ? '#FDE68A' : '#E4E4E7'}`,
              color: toast.type === 'error' ? '#B91C1C' : toast.type === 'success' ? '#065F46' : toast.type === 'warning' ? '#92400E' : '#27272A',
              padding: '12px 20px',
              borderRadius: 12,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              fontWeight: 700,
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}} />
            {toast.type === 'error' && (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12" y2="16" />
              </svg>
            )}
            {toast.type === 'success' && (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12" y2="17" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="8" />
              </svg>
            )}
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'currentColor',
                cursor: 'pointer',
                marginLeft: 8,
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                opacity: 0.7
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </ToolPageShell>
  );
}
