// YouTube Speed Controller - Content Script

const SPEED_MIN = 0.1;
const SPEED_MAX = 10.0;
const SPEED_STEP = 0.1;

let currentSpeed = 1.0;
let isMinimized = false;
let videoElement = null;
let shadowRoot = null;
let panel = null;
let speedEnforcementInterval = null;
let activityTimer = null;

// --- Persistence ---
function loadSettings() {
  chrome.storage.local.get(['ytSpeed', 'isMinimized'], (result) => {
    if (result.ytSpeed) {
      currentSpeed = parseFloat(result.ytSpeed);
    }
    if (result.isMinimized !== undefined) {
      isMinimized = result.isMinimized;
    }

    updateUI(currentSpeed);
    applySpeed(currentSpeed);
    applyMinimizeState();
  });
}

function saveSettings(speed, minimizedState) {
  const data = {};
  if (speed !== undefined) data.ytSpeed = speed;
  if (minimizedState !== undefined) data.isMinimized = minimizedState;

  chrome.storage.local.set(data);
}

// --- Auto-Hide Logic ---
function resetActivityTimer() {
  if (!panel) return;

  // Show panel
  panel.classList.remove('faded');

  // Clear existing timer
  if (activityTimer) clearTimeout(activityTimer);

  // Set new timer (5 seconds)
  activityTimer = setTimeout(() => {
    // Only fade if video is playing (optional, but good UX? User said "after interaction")
    // Keep it simple: 5s after interaction, vanish.
    panel.classList.add('faded');
  }, 5000);
}

// --- Video Control ---
function findVideo() {
  return document.querySelector('video');
}

function applySpeed(speed) {
  if (!videoElement) {
    videoElement = findVideo();
  }

  if (videoElement) {
    let targetSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, speed));
    currentSpeed = targetSpeed;
    videoElement.playbackRate = currentSpeed;
    updateUI(currentSpeed);
    saveSettings(currentSpeed, undefined);

    // User interaction happened (indirectly or directly), so reset timer
    resetActivityTimer();
  }
}

function updateUI(speed) {
  if (!shadowRoot) return;

  const displayCtx = shadowRoot.querySelector('.current-speed');
  const slider = shadowRoot.querySelector('#speed-slider');
  const minDisplay = shadowRoot.querySelector('.minimized-speed');

  const speedText = `${speed.toFixed(2)}x`;

  if (displayCtx) displayCtx.textContent = speedText;
  if (minDisplay) minDisplay.textContent = speedText;
  if (slider) slider.value = speed;
}

// --- Minimize Logic ---
function applyMinimizeState() {
  if (!panel) return;

  const minBtn = shadowRoot.querySelector('#minimize-btn');

  if (isMinimized) {
    panel.classList.add('minimized');
    minBtn.innerHTML = '&#x26F6;';
    minBtn.title = "Expand";
  } else {
    panel.classList.remove('minimized');
    minBtn.innerHTML = '&#x2212;';
    minBtn.title = "Minimize";
  }
  resetActivityTimer();
}

function toggleMinimize() {
  isMinimized = !isMinimized;
  applyMinimizeState();
  saveSettings(undefined, isMinimized);
}

// --- Loop to ensure speed is maintained ---
function startEnforcement() {
  if (speedEnforcementInterval) clearInterval(speedEnforcementInterval);

  speedEnforcementInterval = setInterval(() => {
    if (!videoElement) {
      videoElement = findVideo();
    }

    if (videoElement && !videoElement.paused && Math.abs(videoElement.playbackRate - currentSpeed) > 0.05) {
      videoElement.playbackRate = currentSpeed;
    }
  }, 1000);
}

// --- Message Listener (From Popup) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_SPEED') {
    applySpeed(request.speed);
  } else if (request.type === 'WAKE_UP') {
    resetActivityTimer();
  }
});

// --- UI Construction ---
function createUI() {
  if (document.getElementById('yt-speed-controller-host')) return;

  const host = document.createElement('div');
  host.id = 'yt-speed-controller-host';
  host.style.position = 'absolute';
  host.style.top = '0';
  host.style.left = '0';
  host.style.zIndex = '2147483647';
  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: 'open' });

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  shadowRoot.appendChild(styleLink);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="panel" id="main-panel">
      <div class="drag-handle" id="drag-handle">
        <span class="minimized-speed">1.00x</span>
        <span class="title">Speed Controller</span>
        <button class="minimize-btn" id="minimize-btn" title="Minimize">&#x2212;</button>
      </div>
      
      <div class="speed-display-large">
        <span class="current-speed">1.00x</span>
      </div>
      
      <div class="slider-container">
        <span>0.1</span>
        <input type="range" id="speed-slider" min="${SPEED_MIN}" max="${SPEED_MAX}" step="${SPEED_STEP}" value="1.0">
        <span>10</span>
      </div>
      
      <div class="buttons-grid">
        <button class="speed-btn" data-change="-0.1">-0.1x</button>
        <button class="speed-btn reset" data-set="1.0">1.0x</button>
        <button class="speed-btn" data-change="+0.15">+0.15x</button>
        <button class="speed-btn" data-set="1.25">1.25x</button>
        <button class="speed-btn" data-set="1.5">1.5x</button>
        <button class="speed-btn" data-set="2.0">2.0x</button>
        <button class="speed-btn" data-set="2.5">2.5x</button>
        <button class="speed-btn" data-set="3.0">3.0x</button>
        <button class="speed-btn" data-set="4.0">4.0x</button>
      </div>
    </div>
  `;
  shadowRoot.appendChild(wrapper);
  panel = shadowRoot.querySelector('.panel');

  bindEvents();
  makeDraggable(panel);

  // Initial reset to start timer
  resetActivityTimer();
}

function bindEvents() {
  const slider = shadowRoot.querySelector('#speed-slider');
  slider.addEventListener('input', (e) => {
    applySpeed(parseFloat(e.target.value));
  });

  const buttons = shadowRoot.querySelectorAll('.speed-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const setVal = btn.getAttribute('data-set');
      const changeVal = btn.getAttribute('data-change');

      if (setVal) {
        applySpeed(parseFloat(setVal));
      } else if (changeVal) {
        applySpeed(currentSpeed + parseFloat(changeVal));
      }
    });
  });

  const minBtn = shadowRoot.querySelector('#minimize-btn');
  minBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMinimize();
  });

  // Activity Monitoring
  panel.addEventListener('mouseenter', resetActivityTimer);
  panel.addEventListener('mousemove', resetActivityTimer);
  panel.addEventListener('click', resetActivityTimer);
}

function makeDraggable(element) {
  const handle = shadowRoot.querySelector('#drag-handle');
  let isDragging = false;
  let startX, startY;

  handle.addEventListener('mousedown', dragStart);

  function dragStart(e) {
    if (e.target.closest('button') || e.target.closest('input')) return;
    startX = e.clientX;
    startY = e.clientY;
    isDragging = true;
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', dragEnd);
    resetActivityTimer();
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const rect = element.getBoundingClientRect();
    element.style.right = 'auto';
    element.style.left = `${rect.left + dx}px`;
    element.style.top = `${rect.top + dy}px`;
    startX = e.clientX;
    startY = e.clientY;
    resetActivityTimer();
  }

  function dragEnd() {
    isDragging = false;
    window.removeEventListener('mousemove', drag);
    window.removeEventListener('mouseup', dragEnd);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.shiftKey) {
    if (e.key === 'ArrowUp') {
      applySpeed(currentSpeed + 0.1);
      e.preventDefault();
      resetActivityTimer();
    } else if (e.key === 'ArrowDown') {
      applySpeed(currentSpeed - 0.1);
      e.preventDefault();
      resetActivityTimer();
    }
  }
});

function init() {
  createUI();
  loadSettings();
  startEnforcement();

  const bodyObserver = new MutationObserver(() => {
    const newVideo = findVideo();
    if (newVideo && newVideo !== videoElement) {
      videoElement = newVideo;
      applySpeed(currentSpeed);
    }

    if (!document.getElementById('yt-speed-controller-host')) {
      createUI();
      updateUI(currentSpeed);
      applyMinimizeState();
    }
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

init();
