import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180, height: 180,
          background: '#0F1629',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 8,
          padding: '36px 28px 28px',
        }}
      >
        <div style={{ flex: 1, height: '44%', background: '#3D5270', borderRadius: 7, display: 'flex' }} />
        <div style={{ flex: 1, height: '64%', background: '#E8A80C', borderRadius: 7, display: 'flex' }} />
        <div style={{ flex: 1, height: '82%', background: '#E8A80C', borderRadius: 7, display: 'flex' }} />
        <div style={{ flex: 1, height: '100%', background: '#FFFFFF', borderRadius: 7, display: 'flex' }} />
      </div>
    ),
    { ...size },
  )
}
