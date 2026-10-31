# Power Flow Camera Studio

## Files
- `index.html` — main page
- `style.css` — styling
- `script.js` — camera, overlays, recording, and editing logic

## Deploying to Vercel
The app is inside `powerflow-camera/powerflow-camera16`, while the repository root is one level above it. Keep Vercel's **Root Directory** set to the repository root; the root `vercel.json` routes the site and its assets to this folder.

## Important: Camera will not work if you open the file directly
Camera access requires **HTTPS** or **localhost**.

Do **not** double-click the HTML file. Instead:
1. Open the folder in Visual Studio Code
2. Install the **Live Server** extension
3. Right-click `index.html` → **Open with Live Server**
4. Allow camera permission

## How to use editing
1. Start the camera (must be on localhost or HTTPS)
2. Stay in **PHOTO** mode
3. Press the white shutter button
4. The Edit screen appears automatically with filters and sliders
5. Tap **Save** to download the edited photo

Settings and gallery are hidden until you tap the gear icon or the gallery thumbnail.

## Notes
- Videos are saved as WebM.
- Overlays (logos, announcement, minister name) are burned into both photos and videos.
- Settings are saved on the device.
