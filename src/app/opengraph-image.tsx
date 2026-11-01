import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { DEFAULT_SHARE_IMAGE, SITE_TAGLINE } from '@/features/seo/site-seo';

// The default picture shown when a page is shared on social media or in messages (X falls back to
// it too). The academy's photo with the seal, name and tagline over its dark left-hand side.
// Generated once at build time; course pages with a thumbnail use that instead.
export const alt = DEFAULT_SHARE_IMAGE.alt;
export const size = { width: DEFAULT_SHARE_IMAGE.width, height: DEFAULT_SHARE_IMAGE.height };
export const contentType = 'image/png';

async function readPublicFileAsDataUrl(fileName: string, mimeType: string): Promise<string> {
  const file = await readFile(path.join(process.cwd(), 'public', fileName));
  return `data:${mimeType};base64,${file.toString('base64')}`;
}

export default async function OpenGraphImage() {
  const [backgroundSrc, logoSrc] = await Promise.all([
    readPublicFileAsDataUrl('og-background.jpg', 'image/jpeg'),
    readPublicFileAsDataUrl('ussalogo.png', 'image/png'),
  ]);

  /* eslint-disable @next/next/no-img-element -- ImageResponse renders plain <img> only */
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#0b1e3d', color: 'white' }}>
        <img src={backgroundSrc} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background: 'linear-gradient(90deg, #0b1e3d 0%, rgba(11,30,61,0.92) 38%, rgba(11,30,61,0.35) 52%, rgba(11,30,61,0) 62%)',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 64px', width: 640 }}>
          <img src={logoSrc} width={150} height={150} alt="" />
          <div style={{ marginTop: 28, fontSize: 52, fontWeight: 800, lineHeight: 1.05 }}>United States</div>
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.05 }}>Security Academy</div>
          <div style={{ marginTop: 24, width: 88, height: 6, background: '#c6a15b' }} />
          <div style={{ marginTop: 24, fontSize: 28, fontWeight: 600, color: '#d9bd7f' }}>{SITE_TAGLINE}</div>
          <div style={{ marginTop: 12, fontSize: 21, color: '#cbd5e1' }}>Security · Law Enforcement · Corrections · Military · Safety</div>
        </div>
      </div>
    ),
    size,
  );
  /* eslint-enable @next/next/no-img-element */
}
