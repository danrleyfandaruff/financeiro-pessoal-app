import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// inner area after padding (36 top, 28 bottom, 28 each side): 124 × 116 px
// 4 bars × 25px wide + 3 gaps × 8px = 124px
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#0F1629',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '36px 28px 28px',
          gap: 8,
        }}
      >
        <div style={{ width: 25, height: 51,  background: '#3D5270', borderRadius: 6, flexShrink: 0 }} />
        <div style={{ width: 25, height: 74,  background: '#E8A80C', borderRadius: 6, flexShrink: 0 }} />
        <div style={{ width: 25, height: 95,  background: '#E8A80C', borderRadius: 6, flexShrink: 0 }} />
        <div style={{ width: 25, height: 116, background: '#FFFFFF', borderRadius: 6, flexShrink: 0 }} />
      </div>
    ),
    { ...size },
  )
}
