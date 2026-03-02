/* ======================================================
   Prompt Enhancer — Background Service Worker
   Handles API calls to OpenRouter (Mistral) for prompt enhancement
   ====================================================== */

// ── System Prompts for Enhancement Styles ─────────────
const STYLE_PROMPTS = {

    professional: `You are a prompt rewriter. Rewrite the user's rough input into a clear, structured, professional prompt. Do not answer or solve it — only rewrite the request itself.

Rules:
- Keep the same kind of request (question stays a question, task stays a task)
- Add specificity, context, and expected output format
- Output ONLY the rewritten prompt, no explanation

Example:
Input: "summarize this article"
Rewritten: "Summarize the following article in 3-5 bullet points. Focus on key arguments, data points, and conclusions. Target audience: a busy professional with no prior context. Output: bullet list."

Rewrite the following input:`,

    creative: `You are a prompt rewriter. Rewrite the user's rough input into a rich, vivid creative prompt. Do not write the actual content — only rewrite the request so a creative AI can act on it.

Rules:
- Keep the same kind of request
- Add tone, mood, audience, style, and creative constraints
- Output ONLY the rewritten prompt, no explanation

Example:
Input: "write a poem about rain"
Rewritten: "Write a melancholic free-verse poem about rain falling on an empty city at 3am. Use concrete sensory details (smell, sound, touch). Avoid cliches. Tone: quiet grief with a hint of peace. 12-16 lines."

Rewrite the following input:`,

    technical: `You are a prompt rewriter. Rewrite the user's rough input into a clearer, more specific technical prompt. Do NOT answer, solve, or write code — only rewrite the request.

Rules:
- Keep the same kind of request. If it is a question, rewrite it as a better question. If it is a coding request, rewrite it as a coding spec.
- NEVER turn a factual question into a coding task.
- Output ONLY the rewritten prompt, no explanation.

Example A — factual question:
Input: "binary of 99"
Rewritten: "Explain how to convert the decimal number 99 to binary. Show the step-by-step repeated division-by-2 process, listing each quotient and remainder. State the final binary result without leading zeros or 0b prefix. Also show the 8-bit zero-padded form."

Example B — coding request:
Input: "function to check if prime"
Rewritten: "Write is_prime(n: int) -> bool in Python 3.10+. Return True if n is prime. Handle n < 2 returning False. Use trial division up to sqrt(n). Include type hints and a docstring. Time complexity: O(sqrt n)."

Rewrite the following input:`,

    concise: `You are a prompt rewriter. Compress the user's input into a short, precise, action-first prompt (50 words or fewer). Do not answer it — only rewrite the request.

Rules:
- Start with a verb
- Remove all filler words
- State the key constraint inline
- Output ONLY the rewritten prompt, no explanation

Example:
Input: "can you help me write something to explain what an API is to someone non-technical"
Rewritten: "Explain what an API is to a non-technical audience using one real-world analogy. Max 3 sentences. Plain English."

Rewrite the following input:`

};

// ── Listen for Messages from Content Script ───────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'enhance') {
        console.log('[Prompt Enhancer BG] Received enhance request:', message.prompt.substring(0, 50) + '...');
        handleEnhance(message.prompt, message.context)
            .then(enhanced => {
                console.log('[Prompt Enhancer BG] Enhancement successful');
                sendResponse({ success: true, enhanced });
            })
            .catch(err => {
                console.error('[Prompt Enhancer BG] Enhancement failed:', err.message);
                sendResponse({ success: false, error: err.message });
            });
        return true; // Keep message channel open for async response
    }
});

// ── Listen for Keyboard Command ───────────────────────
chrome.commands.onCommand.addListener((command) => {
    if (command === 'enhance-prompt') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'enhance-shortcut' }, () => {
                    // Suppress "Receiving end does not exist" when content script
                    // isn't loaded on this page (e.g. non-supported sites).
                    void chrome.runtime.lastError;
                });
            }
        });
    }
});

// ── Enhancement Handler ───────────────────────────────
async function handleEnhance(promptText, conversationContext) {
    const settings = await chrome.storage.sync.get(['apiKey', 'style']);

    const apiKey = settings.apiKey;
    const style = settings.style || 'professional';

    if (!apiKey) {
        throw new Error('No API key configured. Open extension settings to add one.');
    }

    const systemPrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.technical;
    return await callOpenRouter(apiKey, systemPrompt, promptText, conversationContext);
}

// ── OpenRouter API Call (Mistral ministral-3b) ────────
async function callOpenRouter(apiKey, systemPrompt, userPrompt, conversationContext, retryCount = 0) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    // Build messages array — inject conversation context if available
    const messages = [{ role: 'system', content: systemPrompt }];

    if (conversationContext && conversationContext.trim()) {
        messages.push({
            role: 'user',
            content: `Here is the recent conversation context from the page:\n\n${conversationContext}\n\nNow rewrite this new prompt with that context in mind:`
        });
        messages.push({
            role: 'assistant',
            content: 'Understood. I will use the conversation context to inform the rewrite.'
        });
    }

    messages.push({ role: 'user', content: userPrompt });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'chrome-extension://prompt-enhancer',
            'X-Title': 'Prompt Enhancer'
        },
        body: JSON.stringify({
            model: 'mistralai/ministral-3b-2512',
            messages,
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    // Retry once on rate limit (429)
    if (response.status === 429 && retryCount < 1) {
        console.log('[Prompt Enhancer BG] Rate limited, retrying in 2s...');
        await new Promise(r => setTimeout(r, 2000));
        return callOpenRouter(apiKey, systemPrompt, userPrompt, conversationContext, retryCount + 1);
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content;

    if (!enhanced) {
        throw new Error('No response from OpenRouter API');
    }

    return enhanced.trim();
}
