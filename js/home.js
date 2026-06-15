// Home page logic
let currentCategory = null;

async function initHome() {
  const data = await loadWorks();
  if (!data) return;

  renderNavbar(data);

  // Parse URL param
  const params = new URLSearchParams(location.search);
  currentCategory = params.get('category');

  renderCategoryTabs(data);
  renderWorks(data);
}

function renderCategoryTabs(data) {
  const container = document.getElementById('categoryTabs');
  container.innerHTML = '';

  const allTab = document.createElement('button');
  allTab.className = 'category-tab' + (!currentCategory ? ' active' : '');
  allTab.textContent = '🏠 全部';
  allTab.onclick = () => {
    currentCategory = null;
    renderWorks(data);
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    allTab.classList.add('active');
  };
  container.appendChild(allTab);

  data.categories.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = 'category-tab' + (currentCategory === cat.id ? ' active' : '');
    tab.innerHTML = cat.icon + ' ' + cat.name + ' (' + cat.works.length + ')';
    tab.onclick = () => {
      currentCategory = cat.id;
      renderWorks(data);
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    };
    container.appendChild(tab);
  });
}

function renderWorks(data) {
  const grid = document.getElementById('worksGrid');
  grid.innerHTML = '';

  let works = [];
  if (currentCategory) {
    const cat = getCategory(data, currentCategory);
    if (cat) works = cat.works;
  } else {
    data.categories.forEach(cat => works = works.concat(cat.works));
  }

  if (works.length === 0) {
    grid.innerHTML = '<div class="empty-state"><span>📭</span><p>这里还没有作品，去后台添加吧！</p></div>';
    return;
  }

  works.forEach(work => {
    const card = document.createElement('div');
    card.className = 'work-card';

    const thumb = document.createElement('img');
    thumb.className = 'work-card-thumb';
    thumb.src = work.thumbnail || '';
    thumb.alt = work.title;
    thumb.onerror = function() {
      this.style.display = 'none';
      this.parentElement.querySelector('.work-card-thumb-fallback')?.style.removeProperty('display');
    };
    card.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'work-card-body';

    const title = document.createElement('h3');
    title.textContent = work.title;
    body.appendChild(title);

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'work-card-tags';
    if (work.tags) {
      work.tags.forEach(tag => {
        const span = document.createElement('span');
        span.textContent = tag;
        tagsDiv.appendChild(span);
      });
    }
    body.appendChild(tagsDiv);

    const actions = document.createElement('div');
    actions.className = 'work-card-actions';

    if (work.type === 'game' && work.webBuildPath) {
      const playBtn = document.createElement('a');
      playBtn.className = 'btn btn-primary';
      playBtn.href = 'detail.html?work=' + work.id + '&mode=play';
      playBtn.textContent = '▶ 玩';
      actions.appendChild(playBtn);
    }

    if (work.videoPath) {
      const videoBtn = document.createElement('a');
      videoBtn.className = 'btn';
      videoBtn.href = 'detail.html?work=' + work.id + '&mode=video';
      videoBtn.textContent = '▶ 视频';
      actions.appendChild(videoBtn);
    }

    if (work.type === 'modeling') {
      const viewBtn = document.createElement('a');
      viewBtn.className = 'btn btn-primary';
      viewBtn.href = 'detail.html?work=' + work.id + '&mode=modeling';
      viewBtn.textContent = '👁 查看';
      actions.appendChild(viewBtn);
    }

    // For "more" category or any work without specific actions
    if (actions.children.length === 0) {
      const infoBtn = document.createElement('a');
      infoBtn.className = 'btn btn-primary';
      infoBtn.href = 'detail.html?work=' + work.id + '&mode=info';
      infoBtn.textContent = '详情';
      actions.appendChild(infoBtn);
    }

    body.appendChild(actions);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

initHome();

