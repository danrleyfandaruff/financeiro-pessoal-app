import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Restarta Finance',
    short_name: 'Restarta',
    description: 'Controle financeiro pessoal e empresarial',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0F1629',
    theme_color: '#E8A80C',
    icons: [
      {
        src: '/icons/favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
