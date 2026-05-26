import type { MetadataRoute } from 'next'

// Web app manifest — makes the site installable to home screen on
// iOS/Android/desktop Chrome. Once this file is deployed, browsers will
// surface "Install" / "Add to home screen" automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MVCC Internal Tournament 2026',
    short_name: 'MVCC',
    description: 'Mavericks Cricket Club — T30 internal tournament live tracker. Mighty Mavericks vs Hell Boys.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B1020',
    theme_color: '#0B1020',
    categories: ['sports'],
    icons: [
      // Browsers scale the source as needed for each target size.
      { src: '/mavericks-logo.jpeg', sizes: '192x192', type: 'image/jpeg' },
      { src: '/mavericks-logo.jpeg', sizes: '512x512', type: 'image/jpeg' },
      { src: '/mavericks-logo.jpeg', sizes: 'any',     type: 'image/jpeg', purpose: 'any' },
    ],
  }
}
