// Use shared track list from tracks.js
const tracks = window.TRACKS || [];

// DOM elements
const audio = document.getElementById("audio");
const cover = document.getElementById("cover");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const prevBtn = document.getElementById("prevBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const seek = document.getElementById("seek");
const volume = document.getElementById("volume");
const muteBtn = document.getElementById("muteBtn");
const playlistEl = document.getElementById("playlist");
const autoplayToggle = document.getElementById("autoplay");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const playbackRateSelect = document.getElementById("playbackRate");
const remainingEl = document.getElementById("remaining");
const categoryChips = Array.from(document.querySelectorAll('.chip[data-cat]'));

let currentIndex = 0;
let isSeeking = false;
let isShuffle = false; // false: sequential, true: random order
// repeatMode: 'off' | 'one' | 'all'
let repeatMode = 'off';
let likes = new Set();
let playCounts = {}; // id -> number
let currentFilter = 'all';

function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function loadTrack(index) {
  currentIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentIndex];
  audio.src = track.src;
  titleEl.textContent = track.title;
  artistEl.textContent = track.artist;
  cover.src = track.cover;
  highlightActive();
  audio.playbackRate = Number(playbackRateSelect.value || 1);
}

function highlightActive() {
  const items = playlistEl.querySelectorAll("li");
  items.forEach((li, i) => {
    li.classList.toggle("active", i === currentIndex);
  });
}

function populatePlaylist() {
  playlistEl.innerHTML = "";
  const filtered = getFilteredTracks();
  filtered.forEach((t, i) => {
    const li = document.createElement("li");
    const idx = document.createElement("div");
    idx.className = "index";
    idx.textContent = i + 1;
    const meta = document.createElement("div");
    meta.className = "meta";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = t.title;
    const by = document.createElement("div");
    by.className = "by";
    const heart = document.createElement('button');
    heart.className = 'icon-btn';
    heart.style.padding = '2px 8px';
    heart.style.marginLeft = 'auto';
    const liked = likes.has(t.id);
    heart.textContent = liked ? '❤️' : '🤍';
    heart.title = liked ? 'Unlike' : 'Like';
    by.textContent = t.artist;
    meta.appendChild(name);
    meta.appendChild(by);
    li.appendChild(idx);
    li.appendChild(meta);
    li.appendChild(heart);
    li.addEventListener("click", () => {
      const globalIndex = tracks.findIndex(x => x.id === t.id);
      loadTrack(globalIndex);
      play();
      incrementPlayCount(t.id);
    });
    heart.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(t.id);
      populatePlaylist();
    });
    playlistEl.appendChild(li);
  });
}

function play() {
  audio.play();
  playPauseBtn.textContent = "⏸";
}

function pause() {
  audio.pause();
  playPauseBtn.textContent = "▶";
}

function togglePlayPause() {
  if (audio.paused) {
    play();
  } else {
    pause();
  }
}

function next() {
  if (isShuffle) {
    let nextIndex = Math.floor(Math.random() * tracks.length);
    if (tracks.length > 1) {
      while (nextIndex === currentIndex) {
        nextIndex = Math.floor(Math.random() * tracks.length);
      }
    }
    loadTrack(nextIndex);
  } else {
    loadTrack(currentIndex + 1);
  }
  play();
}

function prev() {
  loadTrack(currentIndex - 1);
  play();
}

function getFilteredTracks() {
  if (currentFilter === 'all') return tracks;
  if (currentFilter === 'liked') return tracks.filter(t => likes.has(t.id));
  if (currentFilter === 'hits') {
    // top 3 by playCounts
    return [...tracks]
      .sort((a,b) => (playCounts[b.id]||0) - (playCounts[a.id]||0))
      .slice(0, 3);
  }
  // genre filter
  return tracks.filter(t => (t.genres||[]).includes(currentFilter));
}

function toggleLike(id) {
  if (likes.has(id)) likes.delete(id); else likes.add(id);
  persistUserData();
}

function incrementPlayCount(id) {
  playCounts[id] = (playCounts[id] || 0) + 1;
  persistUserData();
}

// Events
playPauseBtn.addEventListener("click", togglePlayPause);
prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
  seek.max = audio.duration || 0;
});

audio.addEventListener("timeupdate", () => {
  if (!isSeeking) {
    seek.value = audio.currentTime;
  }
  currentTimeEl.textContent = formatTime(audio.currentTime);
  const remaining = Math.max(0, (audio.duration || 0) - audio.currentTime);
  remainingEl.textContent = `(-${formatTime(remaining)})`;
});

seek.addEventListener("input", () => {
  isSeeking = true;
});

seek.addEventListener("change", () => {
  audio.currentTime = Number(seek.value);
  isSeeking = false;
});

// Volume
volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
  muteBtn.textContent = audio.volume === 0 ? "🔇" : "🔊";
});

muteBtn.addEventListener("click", () => {
  if (audio.muted || audio.volume === 0) {
    audio.muted = false;
    if (audio.volume === 0) {
      audio.volume = 0.5;
      volume.value = 0.5;
    }
  } else {
    audio.muted = true;
  }
  muteBtn.textContent = (audio.muted || audio.volume === 0) ? "🔇" : "🔊";
});

// Autoplay next
audio.addEventListener("ended", () => {
  if (repeatMode === 'one') {
    audio.currentTime = 0;
    play();
    return;
  }
  if (autoplayToggle.checked || repeatMode === 'all') {
    // If repeat all but autoplay unchecked, still advance because repeat all implies continuous
    if (!isShuffle) {
      // normal step, wrapping handled by loadTrack modulo
      const nextIdx = currentIndex + 1;
      if (nextIdx >= tracks.length && repeatMode !== 'all') {
        pause();
        return;
      }
    }
    next();
  } else {
    pause();
    audio.currentTime = 0;
  }
});

// Keyboard controls
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    togglePlayPause();
  } else if (e.key.toLowerCase() === "n") {
    next();
  } else if (e.key.toLowerCase() === "p") {
    prev();
  } else if (e.key.toLowerCase() === "s") {
    isShuffle = !isShuffle;
    reflectControls();
    persistSettings();
  } else if (e.key.toLowerCase() === "r") {
    cycleRepeatMode();
  }
});

// Initialize
loadUserData();
populatePlaylist();
// Load selected track from search page if present
const selectedSrc = localStorage.getItem('selectedTrackSrc');
const openPlaylistName = localStorage.getItem('openPlaylistName');
if (selectedSrc) {
  const idx = tracks.findIndex(t => t.src === selectedSrc);
  localStorage.removeItem('selectedTrackSrc');
  if (idx >= 0) {
    loadTrack(idx);
    play();
  } else {
    loadTrack(0);
  }
} else if (openPlaylistName) {
  // Filter view to just this playlist and play first track
  try {
    const state = JSON.parse(localStorage.getItem('musicCustomPlaylists') || '{}');
    const ids = state[openPlaylistName] || [];
    localStorage.removeItem('openPlaylistName');
    if (ids.length > 0) {
      // set filter temporarily to custom list
      const firstId = ids[0];
      const idx = tracks.findIndex(t => t.id === firstId);
      currentFilter = 'all';
      populatePlaylist = function() {
        playlistEl.innerHTML = "";
        ids.map(id => tracks.find(t => t.id === id)).filter(Boolean).forEach((t, i) => {
          const li = document.createElement("li");
          const idxDiv = document.createElement("div");
          idxDiv.className = "index";
          idxDiv.textContent = i + 1;
          const meta = document.createElement("div");
          meta.className = "meta";
          const name = document.createElement("div");
          name.className = "name";
          name.textContent = t.title;
          const by = document.createElement("div");
          by.className = "by";
          by.textContent = t.artist;
          const heart = document.createElement('button');
          heart.className = 'icon-btn';
          heart.style.padding = '2px 8px';
          heart.style.marginLeft = 'auto';
          const liked = likes.has(t.id);
          heart.textContent = liked ? '❤️' : '🤍';
          heart.title = liked ? 'Unlike' : 'Like';
          meta.appendChild(name);
          meta.appendChild(by);
          li.appendChild(idxDiv);
          li.appendChild(meta);
          li.appendChild(heart);
          li.addEventListener("click", () => {
            const gidx = tracks.findIndex(x => x.id === t.id);
            loadTrack(gidx);
            play();
            incrementPlayCount(t.id);
          });
          heart.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLike(t.id);
            populatePlaylist();
          });
          playlistEl.appendChild(li);
        });
      };
      populatePlaylist();
      if (idx >= 0) {
        loadTrack(idx);
        play();
      } else {
        loadTrack(0);
      }
    } else {
      loadTrack(0);
    }
  } catch {
    loadTrack(0);
  }
} else {
  loadTrack(0);
}

// Shuffle
shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  reflectControls();
  persistSettings();
});

// Repeat cycle off -> all -> one -> off
function cycleRepeatMode() {
  if (repeatMode === 'off') repeatMode = 'all';
  else if (repeatMode === 'all') repeatMode = 'one';
  else repeatMode = 'off';
  reflectControls();
  persistSettings();
}

repeatBtn.addEventListener('click', cycleRepeatMode);

// Playback rate
playbackRateSelect.addEventListener('change', () => {
  audio.playbackRate = Number(playbackRateSelect.value);
  persistSettings();
});

// Persist and restore settings
function persistSettings() {
  const data = {
    volume: audio.volume,
    muted: audio.muted,
    autoplay: autoplayToggle.checked,
    shuffle: isShuffle,
    repeat: repeatMode,
    rate: Number(playbackRateSelect.value)
  };
  localStorage.setItem('musicPlayerSettings', JSON.stringify(data));
}

function restoreSettings() {
  try {
    const raw = localStorage.getItem('musicPlayerSettings');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.volume === 'number') {
      audio.volume = data.volume;
      volume.value = String(data.volume);
    }
    if (typeof data.muted === 'boolean') {
      audio.muted = data.muted;
    }
    if (typeof data.autoplay === 'boolean') {
      autoplayToggle.checked = data.autoplay;
    }
    if (typeof data.shuffle === 'boolean') {
      isShuffle = data.shuffle;
    }
    if (data.repeat === 'off' || data.repeat === 'all' || data.repeat === 'one') {
      repeatMode = data.repeat;
    }
    if (typeof data.rate === 'number') {
      playbackRateSelect.value = String(data.rate);
      audio.playbackRate = data.rate;
    }
    reflectControls();
  } catch {}
}

function reflectControls() {
  shuffleBtn.style.borderColor = isShuffle ? 'rgba(96,165,250,0.9)' : 'rgba(148, 163, 184, 0.25)';
  repeatBtn.textContent = repeatMode === 'one' ? '🔂' : '🔁';
  repeatBtn.style.borderColor = repeatMode !== 'off' ? 'rgba(96,165,250,0.9)' : 'rgba(148, 163, 184, 0.25)';
  muteBtn.textContent = (audio.muted || audio.volume === 0) ? "🔇" : "🔊";
}

// persist on toggles
autoplayToggle.addEventListener('change', persistSettings);
volume.addEventListener('change', persistSettings);
muteBtn.addEventListener('click', persistSettings);

restoreSettings();
reflectControls();

// Category filters
categoryChips.forEach(chip => {
  chip.addEventListener('click', () => {
    categoryChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.getAttribute('data-cat');
    populatePlaylist();
    highlightActive();
  });
});
// set default active
const defaultChip = categoryChips.find(c => c.getAttribute('data-cat') === 'all');
if (defaultChip) defaultChip.classList.add('active');

// Persist user data (likes, playCounts)
function persistUserData() {
  const data = { likes: Array.from(likes), playCounts };
  localStorage.setItem('musicPlayerUserData', JSON.stringify(data));
}

function loadUserData() {
  try {
    const raw = localStorage.getItem('musicPlayerUserData');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.likes)) likes = new Set(data.likes);
    if (data.playCounts && typeof data.playCounts === 'object') playCounts = data.playCounts;
  } catch {}
}

