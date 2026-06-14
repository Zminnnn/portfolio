// Shared data loading and rendering utilities
let worksData = null;

async function loadWorks() {
  try {
    const res = await fetch('/data/works.json?_t=' + Date.now());
    worksData = await res.json();
    return worksData;
  } catch (e) {
    console.error('Failed to load works:', e);
    return null;
  }
}

function renderNavbar(data) {
  const container = document.getElementById('navLinks');
  if (!container) return;
  container.innerHTML = '';
  const allItem = document.createElement('li');
  const allLink = document.createElement('a');
  allLink.href = '/';
  allLink.textContent = '🏠 首页';
  if (location.pathname === '/' || location.pathname.endsWith('index.html')) {
    allLink.className = 'active';
  }
  allItem.appendChild(allLink);
  container.appendChild(allItem);

  data.categories.forEach(cat => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '/?category=' + cat.id;
    a.innerHTML = cat.icon + ' ' + cat.name + ' <span class="nav-count">' + cat.works.length + '</span>';
    li.appendChild(a);
    container.appendChild(li);
  });

  // Admin link
  const adminLi = document.createElement('li');
  const adminA = document.createElement('a');
  adminA.href = '/admin';
  adminA.textContent = '⚙️ 管理';
  adminLi.appendChild(adminA);
  container.appendChild(adminLi);
}

function getCategory(data, categoryId) {
  return data.categories.find(c => c.id === categoryId);
}

function getWork(data, workId) {
  for (const cat of data.categories) {
    const work = cat.works.find(w => w.id === workId);
    if (work) return { work, category: cat };
  }
  return null;
}

function createToast(message, type) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show ' + (type || '');
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}
