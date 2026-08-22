import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon512() {
  return new ImageResponse(
    (
      <div style={{ width: 512, height: 512, background: '#0F1629', display: 'flex', alignItems: 'flex-end', padding: '100px 80px 80px', gap: 24 }}>
        <div style={{ width: 72, height: 146, background: '#3D5270', borderRadius: 18, flexShrink: 0 }} />
        <div style={{ width: 72, height: 212, background: '#E8A80C', borderRadius: 18, flexShrink: 0 }} />
        <div style={{ width: 72, height: 270, background: '#E8A80C', borderRadius: 18, flexShrink: 0 }} />
        <div style={{ width: 72, height: 332, background: '#FFFFFF',  borderRadius: 18, flexShrink: 0 }} />
      </div>
    ),
    { ...size },
  )
}
