const input = document.getElementById('query');
const results = document.getElementById('results');
const clearBtn = document.getElementById('clearBtn');

const tracks = window.TRACKS || [];

function render(list) {
  results.innerHTML = '';
  list.forEach((t, i) => {
    const li = document.createElement('li');
    const idx = document.createElement('div');
    idx.className = 'index';
    // find index in original list for playback reference
    const originalIndex = tracks.findIndex(x => x.src === t.src);
    idx.textContent = originalIndex + 1;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = t.title;
    const by = document.createElement('div');
    by.className = 'by';
    by.textContent = t.artist;
    meta.appendChild(name);
    meta.appendChild(by);
    li.appendChild(idx);
    li.appendChild(meta);
    li.addEventListener('click', () => {
      localStorage.setItem('selectedTrackSrc', t.src);
      window.location.href = 'index.html';
    });
    results.appendChild(li);
  });
}

function filter(q) {
  const term = q.trim().toLowerCase();
  if (!term) return tracks;
  return tracks.filter(t =>
    t.title.toLowerCase().includes(term) || t.artist.toLowerCase().includes(term)
  );
}

function update() {
  render(filter(input.value));
}

input.addEventListener('input', update);
clearBtn.addEventListener('click', () => { input.value = ''; update(); input.focus(); });

// initial
render(tracks);

