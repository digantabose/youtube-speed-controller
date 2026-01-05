// Popup Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. Send Wake Up Call immediately
    sendMessage({ type: 'WAKE_UP' });

    // 2. Load current speed
    chrome.storage.local.get(['ytSpeed'], (result) => {
        if (result.ytSpeed) {
            updateUI(parseFloat(result.ytSpeed));
        }
    });

    // 3. Bind Events
    bindEvents();
});

function updateUI(speed) {
    const slider = document.getElementById('speed-slider');
    const display = document.getElementById('display-speed');

    if (slider) slider.value = speed;
    if (display) display.textContent = `${speed.toFixed(2)}x`;
}

function bindEvents() {
    // Slider
    const slider = document.getElementById('speed-slider');
    slider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        updateUI(speed);
        changeSpeed(speed);
    });

    // Buttons
    const buttons = document.querySelectorAll('.speed-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const setVal = btn.getAttribute('data-set');
            const changeVal = btn.getAttribute('data-change');
            const current = parseFloat(document.getElementById('speed-slider').value);

            let newSpeed = current;
            if (setVal) {
                newSpeed = parseFloat(setVal);
            } else if (changeVal) {
                newSpeed = current + parseFloat(changeVal);
            }

            newSpeed = Math.max(0.1, Math.min(10.0, newSpeed));

            updateUI(newSpeed);
            changeSpeed(newSpeed);
        });
    });
}

function changeSpeed(speed) {
    // 1. Save locally
    chrome.storage.local.set({ ytSpeed: speed });

    // 2. Send message to content script
    sendMessage({ type: 'UPDATE_SPEED', speed: speed });
}

function sendMessage(msg) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, msg).catch(() => {
                // Content script might not be loaded (e.g. not on YouTube)
                // We can ignore
            });
        }
    });
}
