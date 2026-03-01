/**
 * Site-specific selector configurations for each supported AI chatbot platform.
 * Each config defines how to find the input element, send button, and how to get/set text.
 */

const SITE_CONFIGS = {
    // ChatGPT (chatgpt.com / chat.openai.com)
    chatgpt: {
        hostPatterns: ['chatgpt.com', 'chat.openai.com'],
        inputSelector: '#prompt-textarea, div[contenteditable="true"][id="prompt-textarea"]',
        sendButtonSelector: 'button[data-testid="send-button"], button[aria-label="Send prompt"]',
        isContentEditable: true,
        getText(inputEl) {
            return inputEl.innerText.trim();
        },
        setText(inputEl, text) {
            inputEl.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, text);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    // Google Gemini (uses Quill rich text editor with Trusted Types)
    gemini: {
        hostPatterns: ['gemini.google.com'],
        inputSelector: '.ql-editor[contenteditable="true"], div.ql-editor.textarea, div[contenteditable="true"][aria-label*="prompt"], rich-textarea .ql-editor',
        sendButtonSelector: 'button.send-button, button[aria-label="Send message"], button[aria-label="Send"]',
        isContentEditable: true,
        getText(inputEl) {
            return inputEl.innerText.trim();
        },
        setText(inputEl, text) {
            inputEl.focus();
            // Select all content via keyboard simulation
            const selectAll = new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true });
            inputEl.dispatchEvent(selectAll);
            // Use native selection API
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(inputEl);
            selection.removeAllRanges();
            selection.addRange(range);
            // Use clipboard to paste (avoids Trusted Types)
            const dt = new DataTransfer();
            dt.setData('text/plain', text);
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dt,
                bubbles: true,
                cancelable: true
            });
            inputEl.dispatchEvent(pasteEvent);
            // Fallback: if paste didn't work, try setting textContent directly
            setTimeout(() => {
                if (inputEl.innerText.trim() !== text.trim()) {
                    // Clear and set via textContent (less likely to trigger TT)
                    while (inputEl.firstChild) {
                        inputEl.removeChild(inputEl.firstChild);
                    }
                    const textNode = document.createTextNode(text);
                    inputEl.appendChild(textNode);
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, 100);
        }
    },

    // Claude (claude.ai)
    claude: {
        hostPatterns: ['claude.ai'],
        inputSelector: 'div[contenteditable="true"].ProseMirror, div[contenteditable="true"][aria-label="Write your prompt to Claude"]',
        sendButtonSelector: 'button[aria-label="Send Message"], button[aria-label="Send message"]',
        isContentEditable: true,
        getText(inputEl) {
            return inputEl.innerText.trim();
        },
        setText(inputEl, text) {
            inputEl.focus();
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(inputEl);
            selection.removeAllRanges();
            selection.addRange(range);
            const dt = new DataTransfer();
            dt.setData('text/plain', text);
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dt,
                bubbles: true,
                cancelable: true
            });
            inputEl.dispatchEvent(pasteEvent);
        }
    },

    // Microsoft Copilot
    copilot: {
        hostPatterns: ['copilot.microsoft.com'],
        inputSelector: 'textarea#userInput, textarea[placeholder], #searchbox',
        sendButtonSelector: 'button[aria-label="Submit"], button[aria-label="Send"]',
        isContentEditable: false,
        getText(inputEl) {
            return inputEl.value.trim();
        },
        setText(inputEl, text) {
            inputEl.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            ).set;
            nativeSetter.call(inputEl, text);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    // DeepSeek
    deepseek: {
        hostPatterns: ['chat.deepseek.com'],
        inputSelector: 'textarea#chat-input, textarea',
        sendButtonSelector: 'div[role="button"][aria-label="Send"], button[aria-label="Send"]',
        isContentEditable: false,
        getText(inputEl) {
            return inputEl.value.trim();
        },
        setText(inputEl, text) {
            inputEl.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            ).set;
            nativeSetter.call(inputEl, text);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    // Poe
    poe: {
        hostPatterns: ['poe.com'],
        inputSelector: 'textarea[class*="TextArea"], textarea',
        sendButtonSelector: 'button[class*="SendButton"], button[aria-label="Send"]',
        isContentEditable: false,
        getText(inputEl) {
            return inputEl.value.trim();
        },
        setText(inputEl, text) {
            inputEl.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            ).set;
            nativeSetter.call(inputEl, text);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
};

/**
 * Detect which site config matches the current page.
 */
function detectSite() {
    const hostname = window.location.hostname;
    for (const [name, config] of Object.entries(SITE_CONFIGS)) {
        if (config.hostPatterns.some(pattern => hostname.includes(pattern))) {
            return { name, ...config };
        }
    }
    return null;
}

/**
 * Find the active input element using the site config.
 */
function findInputElement(siteConfig) {
    return document.querySelector(siteConfig.inputSelector);
}

/**
 * Find the send button using the site config.
 */
function findSendButton(siteConfig) {
    return document.querySelector(siteConfig.sendButtonSelector);
}
