/**
 * Dynamic favicon — served at /icon.png (32×32).
 * Next.js App Router automatically injects <link rel="icon" href="/icon.png"> into <head>.
 *
 * Design: bold "A" on deep-navy gradient (same brand language as the manifest icons).
 * Star is omitted at this size — it would be illegible at 32px.
 */
import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

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
          // Navy-to-dark gradient matching brand colours
          background: 'linear-gradient(160deg, #1e40af 0%, #0f172a 100%)',
        }}
      >
        {/* Bold geometric "A" — kept thick so it reads at 32px */}
        <span
          style={{
            color: 'white',
            fontSize: 22,
            fontWeight: 900,
            fontFamily: 'Arial Black, Arial, sans-serif',
            lineHeight: 1,
            letterSpacing: '-1px',
            marginBottom: 2,
          }}
        >
          A
        </span>
      </div>
    ),
    { ...size },
  );
}
