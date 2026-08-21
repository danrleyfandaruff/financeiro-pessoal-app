import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32, height: 32,
          background: '#F2F5F8',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 2,
          padding: '5px 4px 4px',
        }}
      >
        <div style={{ flex: 1, height: '44%', background: '#9DAFC4', borderRadius: 2, display: 'flex' }} />
        <div style={{ flex: 1, height: '64%', background: '#E8A80C', borderRadius: 2, display: 'flex' }} />
        <div style={{ flex: 1, height: '82%', background: '#E8A80C', borderRadius: 2, display: 'flex' }} />
        <div style={{ flex: 1, height: '100%', background: '#0F1629', borderRadius: 2, display: 'flex' }} />
      </div>
    ),
    { ...size },
  )
}
