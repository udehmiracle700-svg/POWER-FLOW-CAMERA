# Power Flow Camera Studio

## Files
- `index.html` — main page
- `style.css` — styling
- `script.js` — camera, overlays, recording, and editing logic
- `manifest.webmanifest`, `sw.js`, and `camera-icon-*.png` — install and offline support

## Deploying to Vercel
The app is inside `powerflow-camera/powerflow-camera16`, while the repository root is one level above it. Keep Vercel's **Root Directory** set to the repository root; the root `vercel.json` routes the site and its assets to this folder.

## Install and offline use
Deploy the site to HTTPS, then use the browser's **Install app** action (or **Add to Home Screen** on iOS). The service worker caches the app shell and static assets after the first visit so the interface can reopen offline.

Camera access still requires **HTTPS** or **localhost**, and the browser must grant camera permission. Offline use does not make camera access available in browsers that block the camera.

For local development, open the project in Visual Studio Code and use Live Server rather than opening `index.html` directly.

## Camera and editing
Start the camera and grant permission. The mode selector switches between photos and video; the gear and gallery controls open their own sheets. Photos open in the editor, where Adjust, Crop, Text, and More tools stay grouped under their selected tab. Export format and quality are configurable, and videos are saved in the browser-supported recording format (normally WebM).

## Notes
- Announcement, minister, and uploaded logos are applied to captured media.
- Settings are saved in browser storage. Captures and uploaded logos remain in memory for the current page session.
