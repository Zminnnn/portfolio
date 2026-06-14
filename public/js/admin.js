// Admin page logic
// worksData is declared in data.js
let uploadedFiles = {};

async function initAdmin() {
  const data = await loadWorks();
  if (!data) return;
  worksData = data;
  renderNavbar(data);
  renderWorkList(data);

  // Category toggle
  document.getElementById('category').addEventListener('change', function() {
    const isGame = this.value === 'games';
    const isModeling = this.value === 'modeling';
    const isMore = this.value === 'more';
    document.getElementById('orientationGroup').style.display = isGame ? '' : 'none';
    document.getElementById('webBuildGroup').style.display = isGame ? '' : 'none';
    document.getElementById('videoGroup').style.display = (isGame || isModeling || isMore) ? '' : 'none';
    document.getElementById('modelingImagesGroup').style.display = (isModeling || isMore) ? '' : 'none';
    document.getElementById('fbxGroup').style.display = isModeling ? '' : 'none';
    document.getElementById('contentGroup').style.display = isMore ? '' : 'none';
  });

  setupFileUpload('thumbFile', 'thumbLabel');
  setupFileUpload('zipFile', 'zipLabel');
  setupFileUpload('videoFile', 'videoLabel');
  setupFileUpload('modelingFiles', 'modelingLabel');
  setupFileUpload('fbxFile', 'fbxLabel');
}

function setupFileUpload(inputId, labelId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  const area = input.closest('.file-upload-area');

  input.addEventListener('change', function() {
    if (this.files.length > 0) {
      const names = Array.from(this.files).map(f => f.name).join(', ');
      label.textContent = names;
      area.classList.add('has-file');
    } else {
      label.textContent = label.dataset.original || label.textContent;
      area.classList.remove('has-file');
    }
  });

  if (!label.dataset.original) {
    label.dataset.original = label.textContent;
  }
}

function resetForm() {
  document.getElementById('editId').value = '';
  document.getElementById('editCategoryId').value = '';
  document.getElementById('formTitle').textContent = '添加新作品';
  document.getElementById('category').value = 'games';
  document.getElementById('title').value = '';
  document.getElementById('description').value = '';
  document.getElementById('tags').value = '';
  document.getElementById('orientation').value = 'landscape';
  document.getElementById('thumbFile').value = '';
  document.getElementById('zipFile').value = '';
  document.getElementById('videoFile').value = '';
  document.getElementById('modelingFiles').value = '';
  document.getElementById('fbxFile').value = '';
  document.getElementById('content').value = '';

  document.getElementById('thumbLabel').textContent = '点击上传缩略图（jpg/png）';
  document.getElementById('zipLabel').textContent = '点击上传 Web 包 ZIP';
  document.getElementById('videoLabel').textContent = '点击上传演示视频 MP4';
  document.getElementById('modelingLabel').textContent = '点击上传展示图片（可选多张）';
  document.getElementById('fbxLabel').textContent = '点击上传 FBX 文件（含贴图可直接嵌入）';
  document.querySelectorAll('.file-upload-area').forEach(a => a.classList.remove('has-file'));

  document.getElementById('orientationGroup').style.display = '';
  document.getElementById('webBuildGroup').style.display = '';
  document.getElementById('videoGroup').style.display = '';
  document.getElementById('modelingImagesGroup').style.display = 'none';
  document.getElementById('fbxGroup').style.display = 'none';
  document.getElementById('contentGroup').style.display = 'none';

  uploadedFiles = {};
}

async function saveWork() {
  const isGame = document.getElementById('category').value === 'games';
  const isModeling = document.getElementById('category').value === 'modeling';
  const isMore = document.getElementById('category').value === 'more';

  const workData = {
    id: document.getElementById('editId').value || generateId(document.getElementById('title').value),
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    tags: document.getElementById('tags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
    type: isGame ? 'game' : (isModeling ? 'modeling' : 'other'),
    date: new Date().toISOString().slice(0, 7)
  };

  if (!workData.title) {
    createToast('请输入作品名称', 'error');
    return;
  }

  if (isGame) {
    workData.orientation = document.getElementById('orientation').value;
  }

  const contentVal = document.getElementById('content').value.trim();
  if (contentVal) {
    workData.content = contentVal;
  }

  const formData = new FormData();
  formData.append('work', JSON.stringify(workData));
  formData.append('categoryId', document.getElementById('editCategoryId').value || document.getElementById('category').value);

  const thumbFile = document.getElementById('thumbFile').files[0];
  if (thumbFile) formData.append('thumbnail', thumbFile);

  const zipFile = document.getElementById('zipFile').files[0];
  if (zipFile) formData.append('webBuild', zipFile);

  const videoFile = document.getElementById('videoFile').files[0];
  if (videoFile) formData.append('video', videoFile);

  const fbxFile = document.getElementById('fbxFile').files[0];
  if (fbxFile) formData.append('fbx', fbxFile);

  if (isModeling || isMore) {
    const imageFiles = document.getElementById('modelingFiles').files;
    for (let i = 0; i < imageFiles.length; i++) {
      formData.append('modelingImages', imageFiles[i]);
    }
  }

  try {
    const res = await fetch('/api/works', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error(await res.text());

    createToast('作品保存成功！', 'success');
    resetForm();
    worksData = await loadWorks();
    renderWorkList(worksData);
    renderNavbar(worksData);
  } catch (e) {
    createToast('保存失败：' + e.message, 'error');
  }
}

async function editWork(categoryId, workId) {
  const cat = getCategory(worksData, categoryId);
  if (!cat) return;
  const work = cat.works.find(w => w.id === workId);
  if (!work) return;

  document.getElementById('editId').value = work.id;
  document.getElementById('editCategoryId').value = categoryId;
  document.getElementById('formTitle').textContent = '编辑作品 - ' + work.title;
  document.getElementById('category').value = categoryId;
  document.getElementById('title').value = work.title;
  document.getElementById('description').value = work.description || '';
  document.getElementById('tags').value = (work.tags || []).join(', ');

  if (work.type === 'game') {
    document.getElementById('orientation').value = work.orientation || 'landscape';
    document.getElementById('orientationGroup').style.display = '';
    document.getElementById('webBuildGroup').style.display = '';
    document.getElementById('videoGroup').style.display = '';
    document.getElementById('modelingImagesGroup').style.display = 'none';
    document.getElementById('fbxGroup').style.display = 'none';
    document.getElementById('contentGroup').style.display = 'none';
  } else if (work.type === 'modeling') {
    document.getElementById('orientationGroup').style.display = 'none';
    document.getElementById('webBuildGroup').style.display = 'none';
    document.getElementById('videoGroup').style.display = work.videoPath ? '' : 'none';
    document.getElementById('modelingImagesGroup').style.display = '';
    document.getElementById('fbxGroup').style.display = '';
    document.getElementById('contentGroup').style.display = 'none';
    document.getElementById('content').value = '';
  } else {
    document.getElementById('orientationGroup').style.display = 'none';
    document.getElementById('webBuildGroup').style.display = 'none';
    document.getElementById('videoGroup').style.display = work.videoPath ? '' : 'none';
    document.getElementById('modelingImagesGroup').style.display = work.images ? '' : 'none';
    document.getElementById('fbxGroup').style.display = 'none';
    document.getElementById('contentGroup').style.display = '';
    document.getElementById('content').value = work.content || '';
  }

  window.scrollTo(0, 0);
}

async function deleteWork(categoryId, workId) {
  if (!confirm('确定删除这个作品吗？此操作不可恢复。')) return;

  try {
    const res = await fetch('/api/works/' + encodeURIComponent(categoryId) + '/' + encodeURIComponent(workId), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(await res.text());

    createToast('作品已删除', 'success');
    worksData = await loadWorks();
    renderWorkList(worksData);
    renderNavbar(worksData);
  } catch (e) {
    createToast('删除失败：' + e.message, 'error');
  }
}

async function moveUp(categoryId, workId) {
  try {
    const cat = getCategory(worksData, categoryId);
    if (!cat) return;
    const idx = cat.works.findIndex(w => w.id === workId);
    if (idx <= 0) return;
    const ids = cat.works.map(w => w.id);
    [ids[idx-1], ids[idx]] = [ids[idx], ids[idx-1]];
    const res = await fetch('/api/works/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, workIds: ids })
    });
    if (!res.ok) throw new Error(await res.text());
    worksData = await loadWorks();
    renderWorkList(worksData);
    renderNavbar(worksData);
  } catch (e) {
    createToast('排序失败: ' + e.message, 'error');
  }
}

async function moveDown(categoryId, workId) {
  try {
    const cat = getCategory(worksData, categoryId);
    if (!cat) return;
    const idx = cat.works.findIndex(w => w.id === workId);
    if (idx < 0 || idx >= cat.works.length - 1) return;
    const ids = cat.works.map(w => w.id);
    [ids[idx], ids[idx+1]] = [ids[idx+1], ids[idx]];
    const res = await fetch('/api/works/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, workIds: ids })
    });
    if (!res.ok) throw new Error(await res.text());
    worksData = await loadWorks();
    renderWorkList(worksData);
    renderNavbar(worksData);
  } catch (e) {
    createToast('排序失败: ' + e.message, 'error');
  }
}

function renderWorkList(data) {
  const container = document.getElementById('workList');
  container.innerHTML = '';

  let hasWorks = false;
  data.categories.forEach(cat => {
    if (cat.works.length === 0) return;
    hasWorks = true;

    cat.works.forEach(work => {
      const item = document.createElement('div');
      item.className = 'work-list-item';

      const info = document.createElement('div');
      info.className = 'work-list-info';
      info.innerHTML = '<h4>' + cat.icon + ' ' + work.title + '</h4>' +
        '<p>' + cat.name + (work.date ? ' · ' + work.date : '') +
        (work.type === 'game' ? ' · ' + (work.orientation === 'portrait' ? '竖屏' : '横屏') : '') +
        (work.fbxPath ? ' · FBX' : '') + '</p>';
      item.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'work-list-actions';

      const upBtn = document.createElement('button');
      upBtn.textContent = '↑';
      upBtn.title = '上移';
      upBtn.onclick = () => moveUp(cat.id, work.id);
      actions.appendChild(upBtn);

      const downBtn = document.createElement('button');
      downBtn.textContent = '↓';
      downBtn.title = '下移';
      downBtn.onclick = () => moveDown(cat.id, work.id);
      actions.appendChild(downBtn);

      const editBtn = document.createElement('button');
      editBtn.textContent = '编辑';
      editBtn.onclick = () => editWork(cat.id, work.id);
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.textContent = '删除';
      delBtn.onclick = () => deleteWork(cat.id, work.id);
      actions.appendChild(delBtn);

      item.appendChild(actions);
      container.appendChild(item);
    });
  });

  if (!hasWorks) {
    container.innerHTML = '<p style="color: var(--text-muted); padding: 16px 0;">还没有作品，使用上方表单添加吧。</p>';
  }
}

function generateId(title) {
  const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '');
  return slug + '-' + Date.now().toString(36);
}

initAdmin();
