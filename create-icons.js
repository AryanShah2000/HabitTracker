// Simple script to create placeholder icons until proper ones are generated
// This creates 1x1 pixel transparent PNGs for now

const fs = require('fs');
const path = require('path');

// 1x1 transparent PNG as base64
const transparentPNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const iconSizes = [
  '57x57', '60x60', '72x72', '76x76', '96x96', '114x114', '120x120', 
  '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'
];

const iconDir = './icons';

iconSizes.forEach(size => {
  const filename = `icon-${size}.png`;
  const filepath = path.join(iconDir, filename);
  
  // Create a simple colored square SVG instead
  const svgContent = `<svg width="${size.split('x')[0]}" height="${size.split('x')[1]}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#4CAF50"/>
    <text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" dy=".3em" fill="white">📊</text>
  </svg>`;
  
  console.log(`Creating placeholder icon: ${filename}`);
  fs.writeFileSync(filepath, svgContent.replace('📊', '🏃')); // Simple replacement for now
});

// Create favicon files
fs.writeFileSync('./icons/favicon-16x16.png', Buffer.from(transparentPNG, 'base64'));
fs.writeFileSync('./icons/favicon-32x32.png', Buffer.from(transparentPNG, 'base64'));
fs.writeFileSync('./icons/apple-touch-icon.png', Buffer.from(transparentPNG, 'base64'));

console.log('Placeholder icons created successfully!');