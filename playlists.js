const nameInput = document.getElementById('playlistName');
const createBtn = document.getElementById('createBtn');
const container = document.getElementById('playlistsContainer');

const tracks = window.TRACKS || [];

function loadState() {
  try {
    const raw = localStorage.getItem('musicCustomPlaylists');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem('musicCustomPlaylists', JSON.stringify(state));
}

function render() {
  const state = loadState();
  container.innerHTML = '';
  const keys = Object.keys(state);
  if (keys.length === 0) {
    const p = document.createElement('p');
    p.style.opacity = '.8';
    p.textContent = 'No playlists yet. Create one above!';
    container.appendChild(p);
    return;
  }
  keys.forEach(key => {
    const pl = state[key]; // array of track ids
    const section = document.createElement('div');
    section.style.borderTop = '1px solid rgba(148, 163, 184, 0.15)';
    section.style.padding = '12px 0';
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    const title = document.createElement('div');
    title.textContent = key;
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    const openBtn = document.createElement('button');
    openBtn.className = 'icon-btn';
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', () => {
      localStorage.setItem('openPlaylistName', key);
      window.location.href = 'index.html';
    });
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      const st = loadState();
      delete st[key];
      saveState(st);
      render();
    });
    actions.appendChild(openBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(title);
    header.appendChild(actions);
    section.appendChild(header);

    // list tracks and add/remove controls
    const list = document.createElement('ul');
    list.className = 'playlist';
    const trackMap = Object.fromEntries(tracks.map(t => [t.id, t]));
    (pl || []).forEach((id, i) => {
      const t = trackMap[id];
      if (!t) return;
      const li = document.createElement('li');
      const idx = document.createElement('div');
      idx.className = 'index';
      idx.textContent = i + 1;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = t.title;
      const by = document.createElement('div');
      by.className = 'by';
      by.textContent = t.artist;
      const remove = document.createElement('button');
      remove.className = 'icon-btn';
      remove.style.marginLeft = 'auto';
      remove.textContent = '✖';
      remove.addEventListener('click', () => {
        const st = loadState();
        st[key] = (st[key] || []).filter(x => x !== id);
        saveState(st);
        render();
      });
      li.appendChild(idx);
      li.appendChild(meta);
      meta.appendChild(name);
      meta.appendChild(by);
      li.appendChild(remove);
      list.appendChild(li);
    });
    // add track selector
    const addWrap = document.createElement('div');
    addWrap.style.display = 'flex';
    addWrap.style.gap = '8px';
    addWrap.style.marginTop = '8px';
    const select = document.createElement('select');
    select.style.flex = '1';
    select.style.padding = '8px 10px';
    select.style.borderRadius = '10px';
    select.style.background = 'rgba(15,23,42,0.6)';
    select.style.color = '#e2e8f0';
    select.style.border = '1px solid rgba(148, 163, 184, 0.25)';
    tracks.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.title} — ${t.artist}`;
      select.appendChild(opt);
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'icon-btn';
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => {
      const id = select.value;
      if (!id) return;
      const st = loadState();
      st[key] = Array.from(new Set([...(st[key] || []), id]));
      saveState(st);
      render();
    });
    addWrap.appendChild(select);
    addWrap.appendChild(addBtn);

    section.appendChild(list);
    section.appendChild(addWrap);
    container.appendChild(section);
  });
}

createBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) return;
  const state = loadState();
  if (!state[name]) state[name] = [];
  saveState(state);
  nameInput.value = '';
  render();
});

render();

