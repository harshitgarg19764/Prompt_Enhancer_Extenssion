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
        },
        getContext() {
            const turns = document.querySelectorAll('[data-message-author-role]');
            return Array.from(turns).slice(-6).map(el => {
                const role = el.getAttribute('data-message-author-role') === 'user' ? 'User' : 'Assistant';
                return `${role}: ${el.innerText.trim()}`;
            }).join('\n');
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
            const selectAll = new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true });
            inputEl.dispatchEvent(selectAll);
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
            setTimeout(() => {
                if (inputEl.innerText.trim() !== text.trim()) {
                    while (inputEl.firstChild) {
                        inputEl.removeChild(inputEl.firstChild);
                    }
                    const textNode = document.createTextNode(text);
                    inputEl.appendChild(textNode);
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, 100);
        },
        getContext() {
            const turns = document.querySelectorAll('.conversation-container .query-text, .conversation-container .response-container');
            return Array.from(turns).slice(-6).map((el, i) => {
                const role = i % 2 === 0 ? 'User' : 'Assistant';
                return `${role}: ${el.innerText.trim()}`;
            }).join('\n');
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
        },
        getContext() {
            const turns = document.querySelectorAll('[data-testid="human-turn"], [data-testid="ai-turn"]');
            return Array.from(turns).slice(-6).map(el => {
                const role = el.getAttribute('data-testid') === 'human-turn' ? 'User' : 'Assistant';
                return `${role}: ${el.innerText.trim()}`;
            }).join('\n');
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
    },

    // Perplexity AI
    perplexity: {
        hostPatterns: ['perplexity.ai'],
        inputSelector: 'textarea[placeholder], [contenteditable="true"][role="textbox"]',
        sendButtonSelector: 'button[aria-label="Submit"], button[type="submit"]',
        isContentEditable: false,
        getText(inputEl) {
            return inputEl.tagName === 'TEXTAREA' ? inputEl.value.trim() : inputEl.innerText.trim();
        },
        setText(inputEl, text) {
            inputEl.focus();
            if (inputEl.tagName === 'TEXTAREA') {
                const nativeSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype, 'value'
                ).set;
                nativeSetter.call(inputEl, text);
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                // contenteditable fallback
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(inputEl);
                selection.removeAllRanges();
                selection.addRange(range);
                const dt = new DataTransfer();
                dt.setData('text/plain', text);
                inputEl.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
            }
        },
        getContext() {
            // Perplexity uses message bubbles with specific classes
            const turns = document.querySelectorAll('.group\/conversation-turn, [class*="AnswerBody"]');
            return Array.from(turns).slice(-6).map((el, i) => {
                const role = i % 2 === 0 ? 'User' : 'Assistant';
                return `${role}: ${el.innerText.trim().slice(0, 300)}`;
            }).join('\n');
        }
    },

    // k2Think (k2think.ai)
    k2think: {
        hostPatterns: ['k2think.ai'],
        inputSelector: 'textarea, [contenteditable="true"]',
        sendButtonSelector: 'button[type="submit"], button[aria-label="Send"]',
        isContentEditable: false,
        getText(inputEl) {
            return inputEl.tagName === 'TEXTAREA' ? inputEl.value.trim() : inputEl.innerText.trim();
        },
        setText(inputEl, text) {
            inputEl.focus();
            if (inputEl.tagName === 'TEXTAREA') {
                const nativeSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype, 'value'
                ).set;
                nativeSetter.call(inputEl, text);
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(inputEl);
                selection.removeAllRanges();
                selection.addRange(range);
                const dt = new DataTransfer();
                dt.setData('text/plain', text);
                inputEl.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
            }
        },
        getContext() {
            // k2Think conversation turns
            const turns = document.querySelectorAll('[class*="message"], [class*="chat-message"], [class*="turn"]');
            return Array.from(turns).slice(-6).map((el, i) => {
                const role = i % 2 === 0 ? 'User' : 'Assistant';
                return `${role}: ${el.innerText.trim().slice(0, 300)}`;
            }).join('\n');
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

/**
 * Scrape the last few conversation turns from the page for context.
 * Returns a plain text summary or empty string if not available.
 */
function getConversationContext(siteConfig) {
    try {
        if (typeof siteConfig.getContext === 'function') {
            const ctx = siteConfig.getContext();
            return ctx ? ctx.slice(-2000) : ''; // limit size
        }
    } catch (e) {
        console.warn('[Prompt Enhancer] Could not scrape context:', e);
    }
    return '';
}
