/* ======================================================
   Prompt Enhancer — Background Service Worker
   Handles API calls to OpenRouter (Mistral) for prompt enhancement
   ====================================================== */

// ── System Prompts for Enhancement Styles ─────────────
const STYLE_PROMPTS = {
    professional: `You are a prompt enhancement expert. Rewrite the user's prompt to be clearer, more specific, and well-structured for an AI assistant. Rules:
- Preserve the original intent completely
- Add clarity and specificity where the original is vague
- Structure with context, task, and format if helpful
- Keep the tone professional and direct
- Do NOT over-inflate simple questions — if it's already clear, make minimal changes
- Do NOT add unnecessary verbosity
- Return ONLY the enhanced prompt, no explanations or metadata`,

    creative: `You are a creative prompt enhancer. Rewrite the user's prompt to inspire more creative, expansive responses from an AI assistant. Rules:
- Preserve the original intent
- Encourage exploration and creative thinking
- Add evocative language and open-ended elements where appropriate
- Keep it natural, not forced
- Return ONLY the enhanced prompt, no explanations`,

    technical: `You are a technical prompt optimizer. Rewrite the user's prompt to be precise, specific, and technically rigorous for an AI assistant. Rules:
- Preserve the original intent
- Add technical constraints and specifications
- Request structured outputs (code blocks, steps, etc.) where appropriate
- Be explicit about edge cases or requirements
- Return ONLY the enhanced prompt, no explanations`,

    concise: `You are a prompt sharpener. Rewrite the user's prompt to be as concise and effective as possible. Rules:
- Preserve the original intent
- Remove all fluff, filler words, and redundancy
- Make every word count
- Keep it direct and to the point
- Return ONLY the enhanced prompt, no explanations`
};

// ── Listen for Messages from Content Script ───────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'enhance') {
        console.log('[Prompt Enhancer BG] Received enhance request:', message.prompt.substring(0, 50) + '...');
        handleEnhance(message.prompt)
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
                chrome.tabs.sendMessage(tabs[0].id, { action: 'enhance-shortcut' });
            }
        });
    }
});

// ── Enhancement Handler ───────────────────────────────
async function handleEnhance(promptText) {
    const settings = await chrome.storage.sync.get(['apiKey', 'style']);

    const apiKey = settings.apiKey;
    const style = settings.style || 'professional';

    if (!apiKey) {
        throw new Error('No API key configured. Open extension settings to add one.');
    }

    const systemPrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.professional;
    return await callOpenRouter(apiKey, systemPrompt, promptText);
}

// ── OpenRouter API Call (Mistral ministral-3b) ────────
async function callOpenRouter(apiKey, systemPrompt, userPrompt, retryCount = 0) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

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
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    // Retry once on rate limit (429)
    if (response.status === 429 && retryCount < 1) {
        console.log('[Prompt Enhancer BG] Rate limited, retrying in 2s...');
        await new Promise(r => setTimeout(r, 2000));
        return callOpenRouter(apiKey, systemPrompt, userPrompt, retryCount + 1);
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
