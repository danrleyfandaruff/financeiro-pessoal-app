import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// inner area after padding (5 top, 4 bottom, 4 each side): 24 × 23 px
// 4 bars × 4px wide + 3 gaps × 2px = 22px (close enough)
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#F2F5F8',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '5px 5px 4px',
          gap: 2,
        }}
      >
        <div style={{ width: 5, height: 10, background: '#9DAFC4', borderRadius: 2, flexShrink: 0 }} />
        <div style={{ width: 5, height: 15, background: '#E8A80C', borderRadius: 2, flexShrink: 0 }} />
        <div style={{ width: 5, height: 19, background: '#E8A80C', borderRadius: 2, flexShrink: 0 }} />
        <div style={{ width: 5, height: 23, background: '#0F1629', borderRadius: 2, flexShrink: 0 }} />
      </div>
    ),
    { ...size },
  )
}
