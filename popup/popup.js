/* ======================================================
   Prompt Enhancer — Popup Logic
   Settings management, API key storage, UI interactions
   (Gemini API only)
   ====================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ── Elements ──────────────────────────────────────
    const enabledToggle = document.getElementById('enabledToggle');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const eyeBtn = document.getElementById('eyeBtn');
    const eyeIcon = document.getElementById('eyeIcon');
    const styleBtns = document.querySelectorAll('.style-btn');
    const saveBtn = document.getElementById('saveBtn');
    const statusDot = document.getElementById('statusDot');

    let currentStyle = 'professional';

    // ── Load Saved Settings ───────────────────────────
    chrome.storage.sync.get(
        ['enabled', 'apiKey', 'style'],
        (result) => {
            // Enabled toggle
            enabledToggle.checked = result.enabled !== false;

            // API Key
            if (result.apiKey) {
                apiKeyInput.value = result.apiKey;
                statusDot.classList.add('connected');
                statusDot.title = 'Connected';
            }

            // Style
            if (result.style) {
                currentStyle = result.style;
                styleBtns.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.style === currentStyle);
                });
            }
        }
    );

    // ── Eye Toggle (Show/Hide Key) ────────────────────
    eyeBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            eyeIcon.textContent = '🙈';
        } else {
            apiKeyInput.type = 'password';
            eyeIcon.textContent = '👁️';
        }
    });

    // ── Style Selection ───────────────────────────────
    styleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            styleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStyle = btn.dataset.style;
        });
    });

    // ── Save Settings ─────────────────────────────────
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();

        chrome.storage.sync.set({
            enabled: enabledToggle.checked,
            provider: 'gemini',
            apiKey: apiKey,
            style: currentStyle
        }, () => {
            // Update status dot
            if (apiKey) {
                statusDot.classList.add('connected');
                statusDot.title = 'Connected';
            } else {
                statusDot.classList.remove('connected');
                statusDot.title = 'No API key';
            }

            // Show saved confirmation
            saveBtn.classList.add('saved');
            setTimeout(() => {
                saveBtn.classList.remove('saved');
            }, 1500);
        });
    });
});
