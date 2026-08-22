import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

// SVG base do ícone (barras do gráfico)
function svg(size) {
  const pad = Math.round(size * 0.15)
  const innerW = size - pad * 2
  const innerH = size - Math.round(size * 0.2) - pad
  const gap = Math.round(innerW * 0.06)
  const barW = Math.round((innerW - gap * 3) / 4)
  const r = Math.round(barW * 0.22)
  const x0 = pad
  const x1 = x0 + barW + gap
  const x2 = x1 + barW + gap
  const x3 = x2 + barW + gap
  const bottom = size - pad
  const h0 = Math.round(innerH * 0.44)
  const h1 = Math.round(innerH * 0.64)
  const h2 = Math.round(innerH * 0.82)
  const h3 = innerH

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0F1629"/>
  <rect x="${x0}" y="${bottom - h0}" width="${barW}" height="${h0}" rx="${r}" fill="#3D5270"/>
  <rect x="${x1}" y="${bottom - h1}" width="${barW}" height="${h1}" rx="${r}" fill="#E8A80C"/>
  <rect x="${x2}" y="${bottom - h2}" width="${barW}" height="${h2}" rx="${r}" fill="#E8A80C"/>
  <rect x="${x3}" y="${bottom - h3}" width="${barW}" height="${h3}" rx="${r}" fill="#FFFFFF"/>
</svg>`
}

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png',         size: 192 },
  { name: 'icon-512.png',         size: 512 },
  { name: 'favicon-32.png',       size: 32  },
]

for (const { name, size } of sizes) {
  await sharp(Buffer.from(svg(size)))
    .png()
    .toFile(`public/icons/${name}`)
  console.log(`✓ public/icons/${name} (${size}×${size})`)
}

// Copia apple-touch-icon para a raiz — iOS auto-descobre neste path
import { copyFileSync } from 'fs'
copyFileSync('public/icons/apple-touch-icon.png', 'public/apple-touch-icon.png')
console.log('✓ public/apple-touch-icon.png (raiz — descoberta automática iOS)')
