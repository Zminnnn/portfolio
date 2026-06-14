// Detail page logic
let currentWork = null;
let currentCategory = null;

async function initDetail() {
  const data = await loadWorks();
  if (!data) return;
  renderNavbar(data);
  const params = new URLSearchParams(location.search);
  const workId = params.get('work');
  const mode = params.get('mode') || 'play';
  if (!workId) {
    document.getElementById('detailTitle').textContent = '未找到作品';
    return;
  }
  const result = getWork(data, workId);
  if (!result) {
    document.getElementById('detailTitle').textContent = '作品不存在';
    return;
  }
  currentWork = result.work;
  currentCategory = result.category;
  document.title = currentWork.title + ' - 作品集';
  document.getElementById('detailTitle').textContent = (currentWork.icon || '') + ' ' + currentWork.title;
  document.getElementById('detailDesc').textContent = currentWork.description || '';
  const tagsContainer = document.getElementById('detailTags');
  if (currentWork.tags) {
    tagsContainer.innerHTML = currentWork.tags.map(t => '<span>' + t + '</span>').join('');
  }
  renderTabs(currentWork, mode);
  showTab(mode);
}

function renderTabs(work, activeMode) {
  const container = document.getElementById('detailTabs');
  container.innerHTML = '';
  if (work.type === 'game') {
    if (work.webBuildPath) {
      const tab = document.createElement('button');
      tab.className = 'detail-tab' + (activeMode === 'play' ? ' active' : '');
      tab.textContent = '\uD83C\uDFAE \u73A9\u6E38\u620F';
      tab.onclick = () => switchTab('play');
      container.appendChild(tab);
    }
    if (work.videoPath) {
      const tab = document.createElement('button');
      tab.className = 'detail-tab' + (activeMode === 'video' ? ' active' : '');
      tab.textContent = '\uD83C\uDFAC \u770B\u89C6\u9891';
      tab.onclick = () => switchTab('video');
      container.appendChild(tab);
    }
  } else if (work.type === 'modeling') {
    const tab = document.createElement('button');
    tab.className = 'detail-tab' + (activeMode === 'modeling' ? ' active' : '');
    tab.textContent = '\uD83C\uDFD7\uFE0F \u4F5C\u54C1\u5C55\u793A';
    tab.onclick = () => switchTab('modeling');
    container.appendChild(tab);
    if (work.fbxPath) {
      const ftab = document.createElement('button');
      ftab.className = 'detail-tab' + (activeMode === '3d' ? ' active' : '');
      ftab.textContent = '\uD83E\uDDCA 3D \u9884\u89C8';
      ftab.onclick = () => switchTab('3d');
      container.appendChild(ftab);
    }
    if (work.videoPath) {
      const vtab = document.createElement('button');
      vtab.className = 'detail-tab' + (activeMode === 'video' ? ' active' : '');
      vtab.textContent = '\uD83C\uDFAC \u770B\u89C6\u9891';
      vtab.onclick = () => switchTab('video');
      container.appendChild(vtab);
    }
  } else {
    const tab = document.createElement('button');
    tab.className = 'detail-tab' + (activeMode === 'info' ? ' active' : '');
    tab.textContent = '\uD83D\uDCC4 \u8BE6\u60C5';
    tab.onclick = () => switchTab('info');
    container.appendChild(tab);
    if (work.videoPath) {
      const vtab = document.createElement('button');
      vtab.className = 'detail-tab' + (activeMode === 'video' ? ' active' : '');
      vtab.textContent = '\uD83C\uDFAC \u770B\u89C6\u9891';
      vtab.onclick = () => switchTab('video');
      container.appendChild(vtab);
    }
  }
}

function switchTab(mode) {
  document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.detail-tab').forEach(t => {
    if ((mode === 'play' && t.textContent.includes('\u73A9')) ||
        (mode === 'video' && t.textContent.includes('\u89C6\u9891')) ||
        (mode === '3d' && t.textContent.includes('3D')) ||
        (mode === 'modeling' && t.textContent.includes('\u5C55\u793A')) ||
        (mode === 'info' && t.textContent.includes('\u8BE6\u60C5'))) {
      t.classList.add('active');
    }
  });
  showTab(mode);
}

function showTab(mode) {
  if (mode === 'play') {
    document.getElementById('tabGame').classList.add('active');
    const container = document.getElementById('gameContainer');
    const orientation = currentWork.orientation || 'landscape';
    container.className = 'game-container ' + orientation;
    const hint = document.getElementById('startHint');
    hint.style.display = 'flex';
    const iframe = document.getElementById('gameIframe');
    iframe.src = '';
    hint.onclick = () => { hint.style.display = 'none'; iframe.src = currentWork.webBuildPath; };
  } else if (mode === 'video') {
    document.getElementById('tabVideo').classList.add('active');
    const video = document.getElementById('videoPlayer');
    video.src = currentWork.videoPath;
    video.load();
  } else if (mode === 'modeling') {
    document.getElementById('tabModeling').classList.add('active');
    renderModelingGallery();
  } else if (mode === '3d') {
    document.getElementById('tab3D').classList.add('active');
    init3DViewer(currentWork.fbxPath);
  } else if (mode === 'info') {
    document.getElementById('tabInfo').classList.add('active');
    const infoEl = document.getElementById('infoContent');
    infoEl.innerHTML = (currentWork.content || currentWork.description || '\u6682\u65E0\u8BE6\u7EC6\u4FE1\u606F\u3002').replace(/\n/g, '<br>');
  }
}

function renderModelingGallery() {
  const gallery = document.getElementById('modelingGallery');
  gallery.innerHTML = '';
  const images = currentWork.images || (currentWork.thumbnail ? [currentWork.thumbnail] : []);
  if (images.length === 0) {
    gallery.innerHTML = '<p style="color: var(--text-muted);">\u6682\u65E0\u5C55\u793A\u56FE\u7247\u3002</p>';
    return;
  }
  images.forEach((src, index) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = currentWork.title + ' - ' + (index + 1);
    img.loading = 'lazy';
    img.onclick = () => openLightbox(images, index);
    img.style.cursor = 'pointer';
    gallery.appendChild(img);
  });
}

let lightboxActive = false;
function openLightbox(images, index) {
  if (lightboxActive) return;
  lightboxActive = true;
  const overlay = document.createElement('div');
  overlay.className = 'lightbox active';
  let currentIdx = index;
  function render() {
    overlay.innerHTML = '<button class="lightbox-close">&times;</button><button class="lightbox-prev" style="display:' + (currentIdx <= 0 ? 'none' : '') + '">&lsaquo;</button><img src="' + images[currentIdx] + '" alt="preview"><button class="lightbox-next" style="display:' + (currentIdx >= images.length - 1 ? 'none' : '') + '">&rsaquo;</button>';
    overlay.querySelector('.lightbox-close').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    overlay.querySelector('.lightbox-prev')?.addEventListener('click', (e) => { e.stopPropagation(); if (currentIdx > 0) { currentIdx--; render(); } });
    overlay.querySelector('.lightbox-next')?.addEventListener('click', (e) => { e.stopPropagation(); if (currentIdx < images.length - 1) { currentIdx++; render(); } });
  }
  function close() { lightboxActive = false; document.removeEventListener('keydown', keyHandler); overlay.remove(); }
  function keyHandler(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && currentIdx > 0) { currentIdx--; render(); }
    else if (e.key === 'ArrowRight' && currentIdx < images.length - 1) { currentIdx++; render(); }
  }
  render();
  document.addEventListener('keydown', keyHandler);
  document.body.appendChild(overlay);
}

async function init3DViewer(fbxPath) {
  const container = document.getElementById('viewerContainer');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">\u6B63\u5728\u52A0\u8F7D 3D \u6A21\u578B...</p>';
  try {
    const THREE = await import('three');
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a24);
    scene.add(new THREE.AmbientLight(0x606060));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2);
    dl.position.set(2, 4, 3);
    scene.add(dl);
    const bl = new THREE.DirectionalLight(0x8888ff, 0.4);
    bl.position.set(-2, -1, -3);
    scene.add(bl);
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.1;
    controls.maxDistance = 50000;
    camera.position.set(3, 2, 5);
    controls.target.set(0, 0, 0);
    controls.update();
    const loader = new FBXLoader();
    loader.load(fbxPath, (obj) => {
      scene.add(obj);
      const box = new THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.01);
        const dist = Math.max(Math.min(maxDim * 2.5, 1000), 1);
        controls.target.copy(center);
        camera.position.set(center.x + dist * 0.5, center.y + dist * 0.4, center.z + dist);
        camera.lookAt(center);
        controls.update();
      }
      renderer.render(scene, camera);
    }, undefined, () => {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">3D \u6A21\u578B\u52A0\u8F7D\u5931\u8D25</p>';
    });
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    const observer = new ResizeObserver(() => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw > 0 && ch > 0) { camera.aspect = cw / ch; camera.updateProjectionMatrix(); renderer.setSize(cw, ch); }
    });
    observer.observe(container);
  } catch (e) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">3D \u6A21\u578B\u52A0\u8F7D\u5931\u8D25: ' + e.message + '</p>';
    console.error('3D viewer error:', e);
  }
}

initDetail();