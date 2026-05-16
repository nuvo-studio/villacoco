# Villa Coco Media Guide (Owner Handoff)

This guide explains what image/video links the website accepts and how to prepare media so the site looks premium and loads fast.

## What links are accepted in admin

The admin currently accepts **public direct URLs** over `https://` (or `http://`).

Use links that point directly to the file, not preview pages.

- Good: `https://cdn.example.com/images/hero-sunrise.jpg`
- Risky: Dropbox/Google Drive preview/share pages
- Not allowed: private/auth-required URLs

If a link does not show in preview, it is usually not a direct file URL.

## Recommended media hosting

Best option: **Cloudflare Images** (or Cloudflare R2 + public CDN URL).

Why:
-
 Fast global delivery
- Stable links
- Fits current Cloudflare setup
- Easy long-term control

Alternative: Cloudinary (also very good).

## Image format and quality standards

- Preferred format: `JPG` for photos, `WEBP` if available
- Avoid PNG for large photos (usually heavier)
- Color space: `sRGB`
- Keep sharp but compressed (target quality ~75-85)
- No watermarks or text baked into images

## Recommended dimensions by section

These are practical targets for quality + performance.

- **Hero background**
  - Target: `1920 x 1080`
  - Minimum: `1600 x 900`
  - Ratio: `16:9`

- **Story image**
  - Target: `1200 x 1500`
  - Ratio: `4:5` (portrait)

- **Rooms images**
  - Target: `1400 x 1000`
  - Ratio: `7:5` (landscape)
  - Keep all room photos same ratio for a clean grid

- **Wellness images (2 images)**
  - Target: `1200 x 900`
  - Ratio: `4:3`

- **Experiences images**
  - Target: `1600 x 1000`
  - Ratio: `8:5`
  - Works well for desktop panel and mobile accordion

- **Food section image**
  - Target: `1600 x 1200`
  - Ratio: `4:3`

- **Gallery strip images**
  - Target: `1200 x 900`
  - Ratio: `4:3`
  - Keep all 5 gallery images same ratio

- **Pool image (if reused independently)**
  - Target: `1600 x 900`
  - Ratio: `16:9`

- **SEO / Social share image (OG image)**
  - Target: `1200 x 630`
  - Exact ratio recommended for WhatsApp/Facebook

## File size targets

- Hero/large section images: aim for **250-500 KB**
- Standard section images: aim for **150-350 KB**
- Gallery images: aim for **120-250 KB**
- OG image: ideally **<300 KB**

If a page feels slow, media size is usually the first thing to reduce.

## Naming convention (recommended)

Use clean, stable file names so links are easy to manage:

- `villacoco-hero-2026-01.jpg`
- `villacoco-room-deluxe-villa-01.jpg`
- `villacoco-experience-coiba-01.jpg`
- `villacoco-og-1200x630.jpg`

Avoid spaces and random upload names like `IMG_9384.JPG`.

## Quick owner workflow

1. Upload optimized images to Cloudflare Images/R2.
2. Copy the public direct URL.
3. Paste URL in admin field.
4. Confirm preview appears.
5. Click **Save Changes** in that section (or **Save All Changes**).
6. Refresh homepage and mobile view to verify.

## QA checklist before publishing new media

- Image looks sharp on desktop and mobile
- Subject is not awkwardly cropped
- Text overlays remain readable
- File loads quickly
- URL is public and permanent
- No duplicate old images remaining in section

