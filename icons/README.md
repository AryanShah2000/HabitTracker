# Icon Generation Instructions

This folder contains placeholder files for PWA icons. To create professional icons for your habit tracker app, you'll need to:

## Required Icon Sizes:

### Standard PWA Icons:
- 72x72px (icon-72x72.png)
- 96x96px (icon-96x96.png)  
- 128x128px (icon-128x128.png)
- 144x144px (icon-144x144.png)
- 152x152px (icon-152x152.png)
- 192x192px (icon-192x192.png)
- 384x384px (icon-384x384.png)
- 512x512px (icon-512x512.png)

### iOS Specific:
- 57x57px (icon-57x57.png)
- 60x60px (icon-60x60.png)
- 72x72px (icon-72x72.png)
- 76x76px (icon-76x76.png)
- 114x114px (icon-114x114.png)
- 120x120px (icon-120x120.png)
- 144x144px (icon-144x144.png)
- 152x152px (icon-152x152.png)
- 180x180px (apple-touch-icon.png)

### Favicon:
- 16x16px (favicon-16x16.png)
- 32x32px (favicon-32x32.png)
- favicon.ico

### iOS Splash Screens:
- 640x1136px (iPhone 5/SE)
- 750x1334px (iPhone 6/7/8)
- 1242x2208px (iPhone 6/7/8 Plus)
- 1125x2436px (iPhone X/XS)
- 1536x2048px (iPad)
- 1668x2224px (iPad Pro 10.5")
- 2048x2732px (iPad Pro 12.9")

## How to Generate:

1. **Use the base SVG**: Start with `icon.svg` as your base design
2. **Online Tools**: 
   - Use https://realfavicongenerator.net/ for comprehensive icon generation
   - Use https://app-manifest.firebaseapp.com/ for PWA manifest testing
3. **Design Tools**: 
   - Figma, Sketch, or Adobe Illustrator for custom designs
   - Export at 2x the required size for sharp results
4. **Batch Conversion**:
   - Use ImageMagick or similar tools for batch resizing
   - Ensure all icons use the same design but are properly sized

## Design Tips:

- Use simple, recognizable symbols (💧 for water, 💪 for protein, 🏃 for exercise)
- Ensure good contrast on both light and dark backgrounds
- Test icons at small sizes (16px) to ensure readability
- Use the brand colors: #4CAF50 (green) for primary, #2E7D32 for dark green
- Consider maskable icons for Android adaptive icons

## Current Status:
- ❌ Icons not yet generated - using placeholders
- ✅ SVG base design created
- ✅ Manifest.json configured with proper sizes
- ✅ HTML includes all necessary icon links

Replace the placeholder references in manifest.json and index.html once you generate the actual PNG files.