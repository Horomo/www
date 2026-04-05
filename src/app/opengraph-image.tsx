import { ImageResponse } from 'next/og';

export const alt = 'Horomo BaZi Calculator';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, rgb(15, 23, 42), rgb(49, 46, 129) 55%, rgb(224, 231, 255))',
          color: 'white',
          padding: '56px',
          fontFamily: 'Arial',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '860px' }}>
          <div style={{ fontSize: 26, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8 }}>
            Horomo
          </div>
          <div style={{ fontSize: 74, lineHeight: 1.05, fontWeight: 700 }}>
            BaZi Calculator and Four Pillars Chart
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.4, opacity: 0.9 }}>
            Calculate your Day Master, Ten Gods, hidden stems, element distribution, and Da Yun luck pillars.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '18px', fontSize: 24, opacity: 0.92 }}>
          <div>True Solar Time</div>
          <div>Ten Gods</div>
          <div>Luck Pillars</div>
        </div>
      </div>
    ),
    size,
  );
}
