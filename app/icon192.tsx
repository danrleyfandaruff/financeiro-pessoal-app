import { ImageResponse } from 'next/og'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon192() {
  return new ImageResponse(
    (
      <div style={{ width: 192, height: 192, background: '#0F1629', display: 'flex', alignItems: 'flex-end', padding: '38px 30px 30px', gap: 9 }}>
        <div style={{ width: 27, height: 55,  background: '#3D5270', borderRadius: 7, flexShrink: 0 }} />
        <div style={{ width: 27, height: 79,  background: '#E8A80C', borderRadius: 7, flexShrink: 0 }} />
        <div style={{ width: 27, height: 101, background: '#E8A80C', borderRadius: 7, flexShrink: 0 }} />
        <div style={{ width: 27, height: 124, background: '#FFFFFF',  borderRadius: 7, flexShrink: 0 }} />
      </div>
    ),
    { ...size },
  )
}
