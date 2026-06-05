# Public assets

## Deployed with the site (Git / Vercel)

| Path | Purpose |
|------|---------|
| `home-covers/` | Home hero + overlay panel WebPs (`npm run assets:home-covers`) |
| `homePageImages/`, `aboutPageImages/` | WebP photography |
| `menus/` | Menu page SVGs |
| `event-poster/` | Event card thumbnails |
| `event-galleries/` | High-quality WebP for `/events` (~220MB). Regenerate with `npm run assets:event-galleries`. |

## Local only (grey in the editor = gitignored)

| Path | Purpose |
|------|---------|
| `20260314 Invite only opening/`, etc. | Full-res sources for `event-galleries/` (~3GB). Run `npm run assets:event-galleries` after adding photos. |
| `*.jpg` at `public/` root | Full-res sources for `home-covers/`. Regenerate with `npm run assets:home-covers`. |
| `Menus SVG/` | Design exports; site uses `menus/`. |
