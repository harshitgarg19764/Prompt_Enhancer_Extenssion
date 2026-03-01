/* ======================================================
   Prompt Enhancer — Content Script
   Intercepts submit on AI chatbot sites & enhances prompts
   ====================================================== */

(function () {
    'use strict';

    const MIN_WORDS_TO_ENHANCE = 3;
    let isEnhancing = false;
    let skipNextSubmit = false;  // Prevents re-interception after enhancement
    let currentSite = null;
    let isEnabled = true;

    // ── Initialization ──────────────────────────────────
    function init() {
        currentSite = detectSite();
        if (!currentSite) return;

        console.log(`[Prompt Enhancer] Active on: ${currentSite.name}`);

        // Load enabled state
        chrome.storage.sync.get(['enabled'], (result) => {
            isEnabled = result.enabled !== false; // default true
        });

        // Listen for storage changes (toggle on/off)
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.enabled) {
                isEnabled = changes.enabled.newValue;
                console.log(`[Prompt Enhancer] ${isEnabled ? 'Enabled' : 'Disabled'}`);
            }
        });

        // Listen for keyboard shortcut from background
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.action === 'enhance-shortcut') {
                handleShortcutEnhance();
            }
        });

        // Attach submit interceptors with retry (sites load dynamically)
        attachInterceptors();
        const observer = new MutationObserver(() => {
            attachInterceptors();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ── Attach Interceptors ─────────────────────────────
    let interceptorsAttached = false;

    function attachInterceptors() {
        const inputEl = findInputElement(currentSite);
        if (!inputEl || interceptorsAttached) return;

        interceptorsAttached = true;
        console.log(`[Prompt Enhancer] Input found, interceptors attached`);

        // Intercept Enter key (without Shift for multi-line)
        inputEl.addEventListener('keydown', handleKeyDown, true);

        // Intercept send button click
        watchSendButton();
    }

    function handleKeyDown(e) {
        // Skip if this is our own programmatic submit
        if (skipNextSubmit) {
            console.log('[Prompt Enhancer] Skipping interception (programmatic submit)');
            skipNextSubmit = false;
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
            if (!isEnabled || isEnhancing) return;

            const inputEl = findInputElement(currentSite);
            if (!inputEl) return;

            const text = currentSite.getText(inputEl);
            if (shouldSkip(text)) return;

            // Intercept!
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            enhanceAndSubmit(inputEl, text);
        }
    }

    function watchSendButton() {
        // Use event delegation on body since send buttons can be re-rendered
        document.body.addEventListener('click', (e) => {
            // Skip if this is our own programmatic submit
            if (skipNextSubmit) {
                console.log('[Prompt Enhancer] Skipping button interception (programmatic submit)');
                skipNextSubmit = false;
                return;
            }

            if (!isEnabled || isEnhancing) return;

            const sendBtn = findSendButton(currentSite);
            if (!sendBtn) return;

            // Check if the click target is the send button or inside it
            if (sendBtn.contains(e.target) || e.target === sendBtn) {
                const inputEl = findInputElement(currentSite);
                if (!inputEl) return;

                const text = currentSite.getText(inputEl);
                if (shouldSkip(text)) return;

                // Intercept!
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                enhanceAndSubmit(inputEl, text);
            }
        }, true);
    }

    // ── Skip Logic ──────────────────────────────────────
    function shouldSkip(text) {
        if (!text) return true;
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        return wordCount < MIN_WORDS_TO_ENHANCE;
    }

    // ── Enhance & Submit (Auto Mode) ────────────────────
    async function enhanceAndSubmit(inputEl, originalText) {
        if (isEnhancing) return;
        isEnhancing = true;

        showLoading(inputEl);

        try {
            const enhanced = await requestEnhancement(originalText);

            console.log('[Prompt Enhancer] Original:', originalText.substring(0, 80));
            console.log('[Prompt Enhancer] Enhanced:', enhanced ? enhanced.substring(0, 80) : 'NULL');

            if (enhanced && enhanced !== originalText) {
                currentSite.setText(inputEl, enhanced);
                console.log('[Prompt Enhancer] setText called successfully');
                showToast('✨ Prompt enhanced!', 'success');
            } else {
                console.log('[Prompt Enhancer] No change needed or null response');
            }

            // Delay to let setText fallback complete, then submit
            await sleep(800);
            hideLoading(inputEl);

            skipNextSubmit = true;
            triggerSubmit(inputEl);
        } catch (err) {
            console.error('[Prompt Enhancer] Error:', err);
            hideLoading(inputEl);
            showToast('Enhancement failed — sending original', 'error');

            // Submit original on error — set flag to skip re-interception
            await sleep(300);
            skipNextSubmit = true;
            triggerSubmit(inputEl);
        } finally {
            // Reset isEnhancing after a delay to ensure submit goes through
            setTimeout(() => {
                isEnhancing = false;
            }, 1000);
        }
    }

    // ── Enhance Only (Shortcut Mode) ────────────────────
    async function handleShortcutEnhance() {
        if (!currentSite || isEnhancing) return;

        const inputEl = findInputElement(currentSite);
        if (!inputEl) return;

        const text = currentSite.getText(inputEl);
        if (shouldSkip(text)) {
            showToast('Prompt too short to enhance', 'error');
            return;
        }

        isEnhancing = true;
        showLoading(inputEl);

        try {
            const enhanced = await requestEnhancement(text);

            if (enhanced && enhanced !== text) {
                currentSite.setText(inputEl, enhanced);
                showToast('✨ Prompt enhanced! Review & send.', 'success');
            } else {
                showToast('Prompt looks good already!', 'success');
            }
        } catch (err) {
            console.error('[Prompt Enhancer] Shortcut error:', err);
            showToast('Enhancement failed', 'error');
        } finally {
            hideLoading(inputEl);
            isEnhancing = false;
        }
    }

    // ── API Communication ───────────────────────────────
    function requestEnhancement(text) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: 'enhance', prompt: text },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    if (response && response.success) {
                        resolve(response.enhanced);
                    } else {
                        reject(new Error(response?.error || 'Unknown error'));
                    }
                }
            );
        });
    }

    // ── Submit Trigger ──────────────────────────────────
    function triggerSubmit(inputEl) {
        // Try clicking the send button first
        const sendBtn = findSendButton(currentSite);
        if (sendBtn) {
            console.log('[Prompt Enhancer] Clicking send button');
            sendBtn.click();
            return;
        }

        // Fallback: simulate Enter key
        console.log('[Prompt Enhancer] Simulating Enter key');
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        inputEl.dispatchEvent(enterEvent);
    }

    // ── Loading Shimmer ─────────────────────────────────
    function showLoading(inputEl) {
        inputEl.classList.add('pe-loading');

        // Add shimmer overlay
        let overlay = document.querySelector('.pe-shimmer-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'pe-shimmer-overlay';
            overlay.innerHTML = `
        <div class="pe-shimmer-content">
          <div class="pe-spinner"></div>
          <span>Enhancing prompt…</span>
        </div>
      `;
            document.body.appendChild(overlay);
        }
        overlay.classList.add('pe-visible');
    }

    function hideLoading(inputEl) {
        inputEl.classList.remove('pe-loading');
        const overlay = document.querySelector('.pe-shimmer-overlay');
        if (overlay) {
            overlay.classList.remove('pe-visible');
        }
    }

    // ── Toast Notifications ─────────────────────────────
    function showToast(message, type = 'success') {
        // Remove existing toast
        const existing = document.querySelector('.pe-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `pe-toast pe-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('pe-toast-visible');
        });

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.remove('pe-toast-visible');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ── Utility ─────────────────────────────────────────
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ── Start ───────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
