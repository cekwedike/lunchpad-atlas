/**
 * Apple touch icon — served at /apple-icon.png (180×180).
 * Next.js App Router automatically injects <link rel="apple-touch-icon"> into <head>.
 *
 * Full brand design: gradient + bold "A" + gold star + amber accent line.
 */
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #1e3a8a 0%, #0f172a 100%)',
          position: 'relative',
        }}
      >
        {/* Gold star — upper right */}
        <div
          style={{
            position: 'absolute',
            top: 18,
            right: 22,
            fontSize: 30,
            lineHeight: 1,
          }}
        >
          ★
        </div>

        {/* Bold "A" */}
        <span
          style={{
            color: 'white',
            fontSize: 112,
            fontWeight: 900,
            fontFamily: 'Arial Black, Arial, sans-serif',
            lineHeight: 1,
            letterSpacing: '-4px',
          }}
        >
          A
        </span>

        {/* Amber accent underline */}
        <div
          style={{
            width: 76,
            height: 6,
            borderRadius: 3,
            background: '#f59e0b',
            marginTop: 4,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
