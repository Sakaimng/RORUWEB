# Public assets

## Deployed with the site (Git / Vercel)

| Path | Purpose |
|------|---------|
| `home-covers/` | Home hero + overlay panel backgrounds (~6MB total) |
| `homePageImages/`, `aboutPageImages/` | WebP photography |
| `menus/` | Menu page SVGs |
| `event-poster/` | Event card thumbnails |

## Local only (grey in the editor = gitignored)

| Path | Purpose |
|------|---------|
| `20260314 Invite only opening/`, etc. | Full event galleries for `/events` (~3GB). Not in Git. For production, host on Vercel Blob, a CDN, or Git LFS, then keep paths in `lib/event-galleries.ts`. |
| `*.jpg` at `public/` root | Full-res sources for `home-covers/`. Regenerate with `npm run assets:home-covers`. |
| `Menus SVG/` | Design exports; site uses `menus/`. |
