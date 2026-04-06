import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#4f46e5', // indigo-600
          borderRadius: '40px',
        }}
      >
        <span
          style={{
            fontSize: '110px',
            color: 'white',
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
          }}
        >
          T
        </span>
      </div>
    ),
    {
      ...size,
    }
  )
}
