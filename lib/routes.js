// Centralized route map for all browser tools and layout sections

export const routeMap = {
  // Resizers
  'Image Resizer': '/resize',
  'Bulk Resize': '/bulk-resize',
  'Bulk Image Resizer': '/bulk-resize',
  'Resize PNG': '/resize-png',
  'Resize JPG': '/resize-jpg',
  'Resize WebP': '/resize-webp',

  // Crop
  'Crop Image': '/crop',
  'Crop PNG': '/crop-png',
  'Crop JPG': '/crop-jpg',
  'Crop WebP': '/crop-webp',

  // Compress
  'Image Compressor': '/compress',
  'Compress JPG': '/compress-jpg',
  'Compress PNG': '/compress-png',
  'Compress GIF': '/compress-gif',

  // Collage
  'Collage Maker': '/collage',

  // Manipulators
  'Flip Image': '/flip',
  'Rotate Image': '/rotate',

  // Converters
  'Image Converter': '/image-converter',
  'PNG to JPG': '/png-to-jpg',
  'PNG to SVG': '/png-to-svg',
  'WebP to JPG': '/webp-to-jpg',
  'WebP to PNG': '/webp-to-png',
  'SVG Converter': '/svg-converter',
  'PNG Converter': '/jpg-to-png',
  'JPG Converter': '/png-to-jpg',
  'HEIC to JPG': '/heic-to-jpg',
  'GIF Converter': '/gif-converter',

  // PDF Tools
  'Compress PDF': '/compress-pdf',
  'PDF Converter': '/pdf-converter',
  'Image to PDF': '/image-to-pdf',
  'JPG to PDF': '/jpg-to-pdf',
  'PNG to PDF': '/png-to-pdf',
  'PDF to JPG': '/pdf-to-images',
  'PDF to PNG': '/pdf-to-images',
  'PDF to Images': '/pdf-to-images',
  'PDF to GIF': '/gif-converter',

  // Static pages
  'About': '/about',
  'About Us': '/about',
  'Contact Us': '/contact',
  'Privacy': '/privacy',
  'Privacy Policy': '/privacy',
  'Terms': '/terms',
  'Terms of Service': '/terms',

  // New tools
  'EXIF Metadata Stripper': '/metadata',
  'Photo Filters': '/filters',
  'Image Watermarker': '/watermark',
  'SVG Rasterizer': '/svg-rasterizer',
  'GIF Maker': '/gif-maker',

  // Phase 2 tools
  'Meme Generator': '/meme-generator',
  'Palette Extractor': '/palette-extractor',
  'Image OCR Extractor': '/ocr',
  'Drawing Markup': '/annotate',
  'Bulk Renamer': '/bulk-rename',

  // Phase 3 tools
  'QR Code Generator': '/qr-generator',
  'SVG Optimizer': '/svg-optimizer',
  'Pixel Art Generator': '/pixelator',
  'CSS Gradient Generator': '/gradient-generator',
  'Background Eraser': '/chroma-key',
  'Sprite Sheet Generator': '/sprite-sheet',
};

// Navbar Dropdown Sections
export const navbarSections = {
  resize: {
    title: 'Resize',
    items: ['Image Resizer', 'Bulk Resize', 'Resize PNG', 'Resize JPG', 'Resize WebP']
  },
  crop: {
    title: 'Crop',
    items: ['Crop Image', 'Crop PNG', 'Crop WebP', 'Crop JPG']
  },
  compress: {
    title: 'Compress',
    items: ['Image Compressor', 'Compress JPG', 'Compress PNG', 'Compress GIF']
  },
  convert: {
    title: 'Convert',
    items: [
      'Image Converter', 'SVG Converter', 'PNG Converter', 'JPG Converter', 
      'GIF Converter', 'HEIC to JPG', 'WebP to PNG', 'WebP to JPG', 
      'PNG to JPG', 'PNG to SVG'
    ]
  },
  pdf: {
    title: 'PDF Tools',
    items: ['PDF to Images', 'Image to PDF', 'JPG to PDF', 'PNG to PDF', 'Compress PDF']
  },
  creative: {
    title: 'Creative',
    items: [
      'Collage Maker', 'Photo Filters', 'Image Watermarker', 'Meme Generator', 
      'Drawing Markup', 'Pixel Art Generator', 'CSS Gradient Generator', 'QR Code Generator'
    ]
  },
  more: {
    title: 'Utilities',
    items: [
      'Rotate Image', 'Flip Image', 'EXIF Metadata Stripper', 
      'SVG Rasterizer', 'GIF Maker', 'Palette Extractor', 
      'Image OCR Extractor', 'Bulk Renamer', 'SVG Optimizer',
      'Sprite Sheet Generator', 'Background Eraser'
    ]
  }
};

// Footer columns
export const footerColumns = {
  imageTools: {
    title: 'Resize & Crop',
    items: [
      'Image Resizer', 'Bulk Image Resizer', 'Image Compressor', 
      'Compress JPG', 'Compress PNG', 'Compress GIF',
      'Crop Image', 'Crop PNG', 'Crop JPG', 'Crop WebP',
      'Flip Image', 'Rotate Image'
    ]
  },
  studioTools: {
    title: 'Studio & Utilities',
    items: [
      'Collage Maker', 'Photo Filters', 'Image Watermarker',
      'Meme Generator', 'Drawing Markup', 'Palette Extractor',
      'Image OCR Extractor', 'Bulk Renamer', 'EXIF Metadata Stripper', 
      'SVG Rasterizer', 'GIF Maker', 'QR Code Generator', 'SVG Optimizer',
      'Sprite Sheet Generator', 'Pixel Art Generator', 'CSS Gradient Generator',
      'Background Eraser'
    ]
  },
  convert: {
    title: 'Convert',
    items: [
      'Image Converter', 'PDF to JPG', 'HEIC to JPG', 'SVG Converter', 
      'PDF to PNG', 'PNG to SVG', 'WebP to JPG', 'PNG to JPG', 'JPG to PNG'
    ]
  },
  pdfTools: {
    title: 'PDF Tools',
    items: [
      'Compress PDF', 'Image to PDF', 'JPG to PDF', 
      'PNG to PDF', 'PDF to GIF'
    ]
  },
  about: {
    title: 'Company',
    items: ['Contact Us', 'Privacy', 'Terms']
  }
};
