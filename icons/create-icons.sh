#!/bin/bash
# Create placeholder icon files for PWA

# Create SVG icon template
cat > icon-template.svg << 'EOF'
<svg width="SIZESIZE" height="SIZESIZE" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3c72;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2a5298;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" rx="80"/>
  <text x="256" y="320" text-anchor="middle" fill="white" font-size="200" font-family="Arial">🏎️</text>
  <text x="256" y="400" text-anchor="middle" fill="#ffd700" font-size="48" font-family="Arial, sans-serif" font-weight="bold">SPEED</text>
  <text x="256" y="440" text-anchor="middle" fill="#ffd700" font-size="32" font-family="Arial, sans-serif">RIVALS</text>
</svg>
EOF

# Create icons of different sizes
sizes=(72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"; do
    # Replace SIZE placeholder in template
    sed "s/SIZESIZE/$size/g" icon-template.svg > "icon-${size}x${size}.svg"
    echo "Created icon-${size}x${size}.svg"
done

# Create apple touch icon
cp icon-template.svg apple-touch-icon.svg
sed -i 's/SIZESIZE/180/g' apple-touch-icon.svg

# Create badge icon (smaller, simpler design)
cat > badge-72x72.svg << 'EOF'
<svg width="72" height="72" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  <circle cx="36" cy="36" r="36" fill="#ff6b6b"/>
  <text x="36" y="48" text-anchor="middle" fill="white" font-size="32">🏁</text>
</svg>
EOF

echo "Created all placeholder icons!"
echo "Note: These are SVG placeholders. For production, convert to PNG format."