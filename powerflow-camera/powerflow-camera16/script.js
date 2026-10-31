const $ = id => document.getElementById(id);
const state = {
  stream: null, facing: 'environment', mode: 'photo', recording: false,
  mediaRecorder: null, recordedChunks: [], logos: { left: null, right: null, bottom: null },
  settings: {}, captures: [], animationId: null, scrollOffset: 0, zoom: 1,
  recordTimerId: null
};
const defaults = {
  resolution: '1920x1080', facing: 'environment', grid: false, mirror: true, timer: 0,
  logoSize: 18, showLogos: true, defaultZoom: 1, stabilizeHint: false, photoFormat: 'png',
  announcement: 'WELCOME TO POWER FLOW • JESUS IS LORD • GOD BLESS YOU',
  minister: 'MINISTERING: PASTOR EMMANUEL ANYANWU',
  textSize: 15, textColor: '#ffffff', bannerColor: '#071b52',
  showAnnouncement: true, showMinister: true, theme: 'gold'
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('pf-camera-settings');
    state.settings = saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
  } catch (error) {
    console.error('Unable to load camera settings:', error);
    state.settings = { ...defaults };
    alert('Saved settings could not be read. The default settings will be used.');
  }
  applySettingsToUI();
  applyTheme();
}
function saveSettings() {
  try {
    localStorage.setItem('pf-camera-settings', JSON.stringify(state.settings));
  } catch (error) {
    console.error('Unable to save camera settings:', error);
    alert('Settings could not be saved on this device. Check its storage permissions.');
  }
}
function applySettingsToUI() {
  const s = state.settings;
  $('resolutionSelect').value = s.resolution;
  $('cameraFacing').value = s.facing;
  $('gridToggle').checked = s.grid;
  $('mirrorToggle').checked = s.mirror;
  $('timerSelect').value = s.timer;
  $('defaultZoom').value = s.defaultZoom || 1;
  $('defaultZoomOut').textContent = (s.defaultZoom || 1).toFixed(1) + 'x';
  $('stabilizeHint').checked = !!s.stabilizeHint;
  $('photoFormat').value = s.photoFormat || 'png';
  $('logoSize').value = s.logoSize;
  $('logoSizeOutput').textContent = s.logoSize + '%';
  $('showLogos').checked = s.showLogos;
  $('announcementInput').value = s.announcement;
  $('ministerInput').value = s.minister;
  $('textSize').value = s.textSize;
  $('textSizeOutput').textContent = s.textSize + 'px';
  $('textColor').value = s.textColor;
  $('bannerColor').value = s.bannerColor;
  $('showAnnouncement').checked = s.showAnnouncement;
  $('showMinister').checked = s.showMinister;
  $('themeSelect').value = s.theme;
  $('gridOverlay').classList.toggle('hidden', !s.grid);
}
function applyTheme() {
  const themes = { gold: '#ffcc00', blue: '#0a84ff', purple: '#bf5af2', green: '#30d158' };
  document.documentElement.style.setProperty('--accent', themes[state.settings.theme] || '#ffcc00');
}

async function startCamera() {
  if (state.recording) stopRecording();
  stopCamera();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Camera is not supported in this browser. Please use Chrome or Safari.');
    return;
  }
  if (location.protocol === 'file:') {
    alert('Camera does not work when the file is opened directly (file://).\n\nPlease use Live Server in VS Code or open the page from an HTTPS site.');
    return;
  }
  const [w, h] = state.settings.resolution.split('x').map(Number);
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.settings.facing, width: { ideal: w }, height: { ideal: h } },
      audio: false
    });
    const video = $('cameraVideo');
    video.srcObject = state.stream;
    await video.play();
    $('emptyState').classList.add('hidden');
    state.zoom = Number(state.settings.defaultZoom) || 1;
    $('zoomLabel').textContent = state.zoom.toFixed(1) + 'x';
    startPreviewLoop();
  } catch (e) {
    console.error(e);
    $('emptyState').classList.remove('hidden');
    const reason = e.name === 'NotAllowedError' ? 'Allow camera permission in your browser settings.' :
      e.name === 'NotFoundError' ? 'No camera was found on this device.' :
      'Check camera permission and make sure you are using HTTPS or localhost.';
    alert(`Camera could not be started. ${reason}`);
  }
}
function stopCamera() {
  if (state.animationId) cancelAnimationFrame(state.animationId);
  if (state.stream) state.stream.getTracks().forEach(t => t.stop());
  state.stream = null;
}
function drawCameraFrame(ctx, width, height) {
  const video = $('cameraVideo');
  const zoom = state.zoom;
  const sourceWidth = video.videoWidth / zoom;
  const sourceHeight = video.videoHeight / zoom;
  const sourceX = (video.videoWidth - sourceWidth) / 2;
  const sourceY = (video.videoHeight - sourceHeight) / 2;
  const mirror = state.settings.facing === 'user' && state.settings.mirror;
  ctx.save();
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  ctx.restore();
}
function startPreviewLoop() {
  const canvas = $('previewCanvas');
  const ctx = canvas.getContext('2d');
  const video = $('cameraVideo');
  function draw() {
    if (!video.videoWidth) { state.animationId = requestAnimationFrame(draw); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    drawCameraFrame(ctx, canvas.width, canvas.height);
    drawOverlays(ctx, canvas.width, canvas.height);
    state.animationId = requestAnimationFrame(draw);
  }
  draw();
}
function drawOverlays(ctx, w, h) {
  const s = state.settings;
  const logoSize = (s.logoSize / 100) * Math.min(w, h) * 0.55;
  if (s.showLogos) {
    if (state.logos.left) drawLogo(ctx, state.logos.left, 20, 20, logoSize);
    if (state.logos.right) drawLogo(ctx, state.logos.right, w - logoSize - 20, 20, logoSize);
    if (state.logos.bottom) drawLogo(ctx, state.logos.bottom, (w - logoSize) / 2, h - logoSize - 80, logoSize);
  }
  if (s.showAnnouncement && s.announcement) {
    ctx.fillStyle = s.bannerColor;
    ctx.fillRect(0, h - 64, w, 42);
    ctx.fillStyle = s.textColor;
    ctx.font = `700 ${s.textSize}px -apple-system, system-ui`;
    ctx.textBaseline = 'middle';
    const text = s.announcement + '   •   ';
    const tw = ctx.measureText(text).width;
    state.scrollOffset = (state.scrollOffset + 1.1) % tw;
    ctx.fillText(text + text, 16 - state.scrollOffset, h - 43);
  }
  if (s.showMinister && s.minister) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, h - 120, w, 36);
    ctx.fillStyle = s.textColor;
    ctx.font = `600 ${s.textSize - 1}px -apple-system, system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(s.minister, w / 2, h - 102);
    ctx.textAlign = 'left';
  }
}
function drawLogo(ctx, img, x, y, size) {
  const r = img.width / img.height;
  ctx.drawImage(img, x, y, size, size / r);
}

async function capturePhoto() {
  if (!state.stream || $('cameraVideo').readyState < 2) {
    alert('Start the camera before taking a photo.');
    return;
  }
  const t = parseInt(state.settings.timer, 10);
  if (t > 0) await runCountdown(t);
  const source = document.createElement('canvas');
  const video = $('cameraVideo');
  source.width = video.videoWidth;
  source.height = video.videoHeight;
  drawCameraFrame(source.getContext('2d'), source.width, source.height);
  source.toBlob(blob => {
    if (!blob) {
      alert('The photo could not be captured. Please try again.');
      return;
    }
    openEditor(URL.createObjectURL(blob));
  }, 'image/png');
}
function runCountdown(sec) {
  return new Promise(res => {
    const el = $('countdown');
    let n = sec;
    el.classList.remove('hidden');
    el.textContent = n;
    const iv = setInterval(() => {
      n--;
      if (n <= 0) { clearInterval(iv); el.classList.add('hidden'); res(); }
      else el.textContent = n;
    }, 1000);
  });
}
function toggleVideo() { state.recording ? stopRecording() : startRecording(); }
function startRecording() {
  if (!state.stream) {
    alert('Start the camera before recording a video.');
    return;
  }
  const canvas = $('previewCanvas');
  if (!canvas.captureStream || !window.MediaRecorder) {
    alert('Video recording is not supported in this browser.');
    return;
  }
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = MediaRecorder.isTypeSupported
    ? candidates.find(type => MediaRecorder.isTypeSupported(type))
    : undefined;
  try {
    const stream = canvas.captureStream(30);
    state.recordedChunks = [];
    state.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    state.mediaRecorder.ondataavailable = event => {
      if (event.data.size) state.recordedChunks.push(event.data);
    };
    state.mediaRecorder.onerror = event => {
      console.error('Video recording failed:', event.error);
      alert('Video recording stopped because of a browser error.');
      stopRecording();
    };
    state.mediaRecorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      if (!state.recordedChunks.length) {
        alert('No video data was recorded. Please try again.');
        return;
      }
      const type = state.recordedChunks[0].type || mimeType || 'video/webm';
      const extension = type.includes('mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(new Blob(state.recordedChunks, { type }));
      addCapture(url, 'video');
      downloadFile(url, `powerflow-${Date.now()}.${extension}`);
    };
    state.mediaRecorder.start();
    state.recording = true;
    $('shutterBtn').classList.add('recording');
    $('recordTimer').classList.remove('hidden');
    startRecordTimer();
  } catch (error) {
    console.error('Unable to start video recording:', error);
    alert('Video recording could not be started. Try another browser or camera mode.');
  }
}
function stopRecording() {
  if (state.mediaRecorder && state.recording) {
    if (state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop();
    state.recording = false;
    $('shutterBtn').classList.remove('recording');
    $('recordTimer').classList.add('hidden');
    if (state.recordTimerId) clearInterval(state.recordTimerId);
    state.recordTimerId = null;
  }
}
function startRecordTimer() {
  let s = 0;
  const el = $('recordTimer');
  if (state.recordTimerId) clearInterval(state.recordTimerId);
  state.recordTimerId = setInterval(() => {
    if (!state.recording) {
      clearInterval(state.recordTimerId);
      state.recordTimerId = null;
      return;
    }
    s++;
    el.textContent = `● ${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }, 1000);
}

let editorImage = null, currentFilter = 'none', editState = {
  brightness: 100, contrast: 100, saturation: 100, warmth: 0, vignette: 0,
  rotation: 0, cropRatio: 'original', flipHorizontal: false, quality: 90,
  showAnn: true, showMin: true, annSize: 15, minSize: 14
};

function openEditor(dataUrl) {
  const img = new Image();
  img.onload = () => {
    editorImage = img;
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    editState = {
      brightness: 100, contrast: 100, saturation: 100, warmth: 0, vignette: 0,
      rotation: 0, cropRatio: 'original', flipHorizontal: false, quality: 90,
      showAnn: state.settings.showAnnouncement, showMin: state.settings.showMinister,
      annSize: state.settings.textSize, minSize: Math.max(10, state.settings.textSize - 1)
    };
    resetEditorSliders();
    const c = $('editorCanvas');
    c.width = img.width;
    c.height = img.height;
    applyEditorFilters();
    $('editorView').classList.remove('hidden');
  };
  img.onerror = () => {
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    alert('The captured photo could not be opened for editing.');
  };
  img.src = dataUrl;
}

function resetEditorSliders() {
  $('brightSlider').value = 100; $('brightOut').textContent = '100%';
  $('contrastSlider').value = 100; $('contrastOut').textContent = '100%';
  $('satSlider').value = 100; $('satOut').textContent = '100%';
  $('warmSlider').value = 0; $('warmOut').textContent = '0';
  $('vignetteSlider').value = 0; $('vignetteOut').textContent = '0%';
  $('annSizeSlider').value = editState.annSize; $('annSizeOut').textContent = String(editState.annSize);
  $('minSizeSlider').value = editState.minSize; $('minSizeOut').textContent = String(editState.minSize);
  $('editShowAnn').checked = editState.showAnn;
  $('editShowMin').checked = editState.showMin;
  $('flipHorizontal').checked = false;
  $('qualitySlider').value = editState.quality;
  $('qualityOut').textContent = `${editState.quality}%`;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  document.querySelector('.filter-chip[data-filter="none"]').classList.add('active');
  document.querySelectorAll('.tool-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'adjust'));
  document.querySelectorAll('.tool-panel').forEach(panel => panel.classList.toggle('hidden', panel.id !== 'tab-adjust'));
  document.querySelectorAll('.crop-btn').forEach(b => b.classList.toggle('active', b.dataset.ratio === 'original'));
  currentFilter = 'none';
}

function applyEditorFilters() {
  if (!editorImage) return;
  const c = $('editorCanvas');
  const ctx = c.getContext('2d');

  // Apply rotation and crop sizing
  let srcW = editorImage.width, srcH = editorImage.height;
  let destW = srcW, destH = srcH;
  if (editState.cropRatio === '1:1') {
    const side = Math.min(srcW, srcH);
    destW = destH = side;
  } else if (editState.cropRatio === '4:5') {
    destW = srcW; destH = Math.round(srcW * 5 / 4);
    if (destH > srcH) { destH = srcH; destW = Math.round(srcH * 4 / 5); }
  } else if (editState.cropRatio === '16:9') {
    destW = srcW; destH = Math.round(srcW * 9 / 16);
    if (destH > srcH) { destH = srcH; destW = Math.round(srcH * 16 / 9); }
  }

  const rot = editState.rotation;
  const rad = rot * Math.PI / 180;
  const isSide = rot % 180 !== 0;
  c.width = isSide ? destH : destW;
  c.height = isSide ? destW : destH;

  ctx.clearRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(rad);
  if (editState.flipHorizontal) ctx.scale(-1, 1);

  const b = editState.brightness / 100;
  const ct = editState.contrast / 100;
  const sat = editState.saturation / 100;
  let filter = `brightness(${b}) contrast(${ct}) saturate(${sat})`;
  if (editState.warmth > 0) filter += ` sepia(${editState.warmth / 100})`;
  if (editState.warmth < 0) filter += ` hue-rotate(${editState.warmth * 1.2}deg)`;
  if (currentFilter === 'vivid') filter += ' saturate(1.35) contrast(1.08)';
  if (currentFilter === 'warm') filter += ' sepia(0.3)';
  if (currentFilter === 'cool') filter += ' hue-rotate(190deg) saturate(1.1)';
  if (currentFilter === 'bw') filter += ' grayscale(1)';
  if (currentFilter === 'noir') filter += ' grayscale(1) contrast(1.25) brightness(0.92)';
  if (currentFilter === 'vintage') filter += ' sepia(0.4) contrast(1.05)';
  if (currentFilter === 'fade') filter += ' contrast(0.88) brightness(1.08) saturate(0.75)';
  if (currentFilter === 'dramatic') filter += ' contrast(1.3) saturate(0.85)';
  if (currentFilter === 'golden') filter += ' sepia(0.35) saturate(1.2) brightness(1.05)';
  if (currentFilter === 'cinematic') filter += ' contrast(1.15) saturate(0.9) brightness(0.95)';

  ctx.filter = filter;
  ctx.drawImage(editorImage, (srcW - destW) / 2, (srcH - destH) / 2, destW, destH, -destW / 2, -destH / 2, destW, destH);
  ctx.restore();
  ctx.filter = 'none';

  // Vignette
  if (editState.vignette > 0) {
    const grad = ctx.createRadialGradient(c.width/2, c.height/2, c.width*0.3, c.width/2, c.height/2, c.width*0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${editState.vignette / 100})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);
  }

  // Apply watermarks once here so they remain editable and do not duplicate.
  const s = state.settings;
  if (s.showLogos) {
    const logoSize = (s.logoSize / 100) * Math.min(c.width, c.height) * 0.55;
    if (state.logos.left) drawLogo(ctx, state.logos.left, 20, 20, logoSize);
    if (state.logos.right) drawLogo(ctx, state.logos.right, c.width - logoSize - 20, 20, logoSize);
    if (state.logos.bottom) drawLogo(ctx, state.logos.bottom, (c.width - logoSize) / 2, c.height - logoSize - 80, logoSize);
  }
  if (editState.showAnn && s.announcement) {
    ctx.fillStyle = s.bannerColor;
    ctx.fillRect(0, c.height - 58, c.width, 40);
    ctx.fillStyle = s.textColor;
    ctx.font = `700 ${editState.annSize}px system-ui`;
    ctx.textBaseline = 'middle';
    const announcement = s.announcement;
    const maxWidth = Math.max(0, c.width - 32);
    ctx.fillText(announcement, 16, c.height - 38, maxWidth);
  }
  if (editState.showMin && s.minister) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, c.height - 110, c.width, 34);
    ctx.fillStyle = s.textColor;
    ctx.font = `600 ${editState.minSize}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(s.minister, c.width / 2, c.height - 93, Math.max(0, c.width - 32));
    ctx.textAlign = 'left';
  }
}
function saveEdited() {
  const format = state.settings.photoFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
  const extension = format === 'image/jpeg' ? 'jpg' : 'png';
  $('editorCanvas').toBlob(blob => {
    if (!blob) {
      alert('The edited photo could not be exported. Try a smaller crop or another format.');
      return;
    }
    const url = URL.createObjectURL(blob);
    addCapture(url, 'photo');
    downloadFile(url, `powerflow-${Date.now()}.${extension}`);
    $('editorView').classList.add('hidden');
  }, format, editState.quality / 100);
}
function addCapture(url, type) {
  state.captures.unshift({ url, type });
  renderGallery();
  document.querySelector('.gallery-thumb').innerHTML = type === 'photo' ? `<img src="${url}">` : `<video src="${url}" muted></video>`;
}
function renderGallery() {
  const list = $('galleryList');
  if (!state.captures.length) { list.innerHTML = '<p class="muted">No captures yet this session.</p>'; return; }
  list.innerHTML = state.captures.map(c => c.type === 'photo'
    ? `<a href="${c.url}" download><img src="${c.url}"></a>`
    : `<a href="${c.url}" download><video src="${c.url}" muted></video></a>`).join('');
}
function downloadFile(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
}

function bindEvents() {
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    $('installBtn').classList.remove('hidden');
  });
  $('installBtn').onclick = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      $('installBtn').classList.add('hidden');
    } catch (error) {
      console.error('Unable to install the camera app:', error);
      alert('The app could not be installed from this browser. Use its menu to install or add it to your home screen.');
    }
  };
  $('startCameraBtn').onclick = startCamera;
  $('settingsBtn').onclick = () => $('settingsSheet').classList.add('open');
  $('closeSettingsBtn').onclick = () => $('settingsSheet').classList.remove('open');
  $('galleryBtn').onclick = () => $('gallerySheet').classList.add('open');
  $('closeGalleryBtn').onclick = () => $('gallerySheet').classList.remove('open');
  $('shutterBtn').onclick = () => state.mode === 'photo' ? capturePhoto() : toggleVideo();
  $('flipBtn').onclick = () => {
    state.settings.facing = state.settings.facing === 'environment' ? 'user' : 'environment';
    $('cameraFacing').value = state.settings.facing;
    if (state.stream) startCamera();
  };
  function setZoom(v) {
    state.zoom = Math.max(1, Math.min(4, v));
    $('zoomLabel').textContent = state.zoom.toFixed(1) + 'x';
  }
  $('zoomInBtn').onclick = () => setZoom(state.zoom + 0.2);
  $('zoomOutBtn').onclick = () => setZoom(state.zoom - 0.2);
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.onclick = () => {
    if (state.recording && btn.dataset.mode !== 'video') stopRecording();
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
      $('modeBadge').textContent = state.mode.toUpperCase();
      $('shutterBtn').classList.toggle('video', state.mode === 'video');
    };
  });
  const ids = ['resolutionSelect','cameraFacing','gridToggle','mirrorToggle','timerSelect','logoSize','showLogos','announcementInput','ministerInput','textSize','textColor','bannerColor','showAnnouncement','showMinister','themeSelect','defaultZoom','stabilizeHint','photoFormat'];
  ids.forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (id === 'defaultZoom') $('defaultZoomOut').textContent = Number(el.value).toFixed(1) + 'x';
      if (id === 'textSize') $('textSizeOutput').textContent = el.value + 'px';
      updateSettingFromUI(id);
      if (id === 'themeSelect') applyTheme();
      if (id === 'gridToggle') $('gridOverlay').classList.toggle('hidden', !el.checked);
      if (id === 'cameraFacing' && state.stream) startCamera();
    });
  });
  $('saveSettingsBtn').onclick = () => { saveSettings(); $('settingsSheet').classList.remove('open'); };
  $('resetSettingsBtn').onclick = () => {
    state.settings = { ...defaults };
    applySettingsToUI();
    applyTheme();
    saveSettings();
    if (state.stream) startCamera();
  };
  ['logoLeft','logoRight','logoBottom'].forEach(id => {
    $(id).onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => { state.logos[id.replace('logo','').toLowerCase()] = img; URL.revokeObjectURL(img.src); };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        alert('That logo image could not be opened. Please choose another image.');
      };
      img.src = URL.createObjectURL(f);
    };
  });
  $('cancelEditBtn').onclick = () => $('editorView').classList.add('hidden');
  $('saveEditBtn').onclick = saveEdited;

  // Adjust sliders
  const sliderMap = {
    brightSlider: ['brightness', 'brightOut', '%'],
    contrastSlider: ['contrast', 'contrastOut', '%'],
    satSlider: ['saturation', 'satOut', '%'],
    warmSlider: ['warmth', 'warmOut', ''],
    vignetteSlider: ['vignette', 'vignetteOut', '%'],
    annSizeSlider: ['annSize', 'annSizeOut', ''],
    minSizeSlider: ['minSize', 'minSizeOut', '']
  };
  Object.entries(sliderMap).forEach(([id, [key, outId, suffix]]) => {
    $(id).oninput = () => {
      editState[key] = Number($(id).value);
      $(outId).textContent = $(id).value + suffix;
      applyEditorFilters();
    };
  });
  $('editShowAnn').onchange = () => { editState.showAnn = $('editShowAnn').checked; applyEditorFilters(); };
  $('editShowMin').onchange = () => { editState.showMin = $('editShowMin').checked; applyEditorFilters(); };
  $('flipHorizontal').onchange = () => {
    editState.flipHorizontal = $('flipHorizontal').checked;
    applyEditorFilters();
  };
  $('qualitySlider').oninput = () => {
    editState.quality = Number($('qualitySlider').value);
    $('qualityOut').textContent = `${editState.quality}%`;
  };
  $('resetEditBtn').onclick = () => {
    if (!editorImage) return;
    editState = {
      brightness: 100, contrast: 100, saturation: 100, warmth: 0, vignette: 0,
      rotation: 0, cropRatio: 'original', flipHorizontal: false, quality: 90,
      showAnn: state.settings.showAnnouncement, showMin: state.settings.showMinister,
      annSize: state.settings.textSize, minSize: Math.max(10, state.settings.textSize - 1)
    };
    resetEditorSliders();
    applyEditorFilters();
  };

  // Tabs
  document.querySelectorAll('.tool-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tool-panel').forEach(p => p.classList.add('hidden'));
      $('tab-' + tab.dataset.tab).classList.remove('hidden');
    };
  });

  // Crop & rotate
  document.querySelectorAll('.crop-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.crop-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editState.cropRatio = btn.dataset.ratio;
      applyEditorFilters();
    };
  });
  $('rotateLeftBtn').onclick = () => { editState.rotation = (editState.rotation - 90) % 360; applyEditorFilters(); };
  $('rotateRightBtn').onclick = () => { editState.rotation = (editState.rotation + 90) % 360; applyEditorFilters(); };

  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyEditorFilters();
    };
  });
}
function updateSettingFromUI(id) {
  const map = { resolutionSelect:'resolution', cameraFacing:'facing', gridToggle:'grid', mirrorToggle:'mirror', timerSelect:'timer', logoSize:'logoSize', showLogos:'showLogos', announcementInput:'announcement', ministerInput:'minister', textSize:'textSize', textColor:'textColor', bannerColor:'bannerColor', showAnnouncement:'showAnnouncement', showMinister:'showMinister', themeSelect:'theme', defaultZoom:'defaultZoom', stabilizeHint:'stabilizeHint', photoFormat:'photoFormat' };
  const key = map[id];
  if (key) state.settings[key] = $(id).type === 'checkbox' ? $(id).checked : $(id).value;
}

loadSettings();
bindEvents();
$('gridOverlay').classList.toggle('hidden', !state.settings.grid);