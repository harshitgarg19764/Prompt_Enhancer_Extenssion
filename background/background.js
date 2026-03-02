/* ======================================================
   Prompt Enhancer — Background Service Worker
   Handles API calls to OpenRouter (Mistral) for prompt enhancement
   ====================================================== */

// ── System Prompts for Enhancement Styles ─────────────
// ── Master System Prompt (shared across all roles) ────
const MASTER_SYSTEM_PROMPT = `You are a PROMPT REWRITER.

You do NOT answer questions. You do NOT solve problems. You do NOT write code.
You ONLY rewrite the user's raw input into a better, clearer, more precise prompt
that a DIFFERENT AI will later receive and act on.

Think of yourself as an editor standing between the user and the AI that will do the work.
Your job is to make that AI's job easier by writing a crisper, more complete instruction.

━━━ ABSOLUTE RULES ━━━
1. NEVER solve, answer, or fulfill the user's request.
2. NEVER write code, calculations, or direct answers.
3. Output ONLY the rewritten prompt — no preamble, no explanation.
4. ALWAYS preserve the original intent 100%.

━━━ MOST IMPORTANT RULE — PRESERVE THE REQUEST TYPE ━━━
Keep the same KIND of request as the original:
- Factual / conceptual question  → enhanced factual question
- Coding / implementation request → enhanced coding spec
NEVER convert a factual question into a coding task.

━━━ EXAMPLES ━━━

Example 1 — Factual:
  Input:  "binary of 99"
  WRONG:  "Write a function that converts 99 to binary..."   ← changed type!
  RIGHT:  "What is the binary representation of the decimal integer 99?
           Show the step-by-step conversion using repeated division by 2
           (list each quotient and remainder). State the final binary string
           with no leading zeros and no '0b' prefix. Also show the 8-bit
           zero-padded form. Verify: 99 in decimal = ? in binary."

Example 2 — Coding:
  Input:  "write a python function to convert int to binary"
  WRONG:  "def to_bin(n): return bin(n)[2:]"                 ← answered it!
  RIGHT:  "Implement to_bin(n: int) -> str in Python 3.10+.
           Return binary string without leading zeros or '0b' prefix.
           Raise ValueError for negatives. Handle n=0 → '0'.
           Provide two approaches: bitwise and division. Include type hints."

The ACTIVE_ROLE below controls the style of the rewritten prompt.`;

const STYLE_PROMPTS = {
    professional: `${MASTER_SYSTEM_PROMPT}

ACTIVE_ROLE: Professional

Rewrite the user's input as a formal, structured prompt. Keep it the same type as the
original (factual stays factual, coding stays coding). Add specificity and success criteria.

DO NOT answer the request. Write a prompt that makes a professional AI answer it.

## Objective
[One sentence: what the AI must accomplish — matching the original request type]

## Context & Assumptions
[Domain, environment, constraints the receiving AI should know]

## Requirements
- [Specific, testable requirement]

## Success Criteria
- [How correctness will be evaluated]

## Deliverable Format
[Exact output format: explanation, table, JSON, code — match what the user originally wanted]`,

    creative: `${MASTER_SYSTEM_PROMPT}

ACTIVE_ROLE: Creative

Rewrite the user's input as a vivid, richly specified creative prompt.
DO NOT write the content. Write a prompt that makes a creative AI write it.

### Creative Prompt
[Direct, evocative instruction — specific setting, mood, voice, goal]

### Style & Tone
- Mood: [e.g., melancholic, tense, whimsical]
- Voice: [e.g., first-person, omniscient]
- Audience: [who it's for and what reaction to evoke]

### Must Include
- [Concrete element the output must contain]

### Avoid
- [What the creative AI must NOT do]`,

    technical: `${MASTER_SYSTEM_PROMPT}

ACTIVE_ROLE: Technical

Rewrite the user's input as a rigorous technical prompt.

━━━ STEP 1: IDENTIFY THE REQUEST TYPE ━━━
Before writing anything, classify the input:

TYPE A — Factual/Conceptual: user wants to KNOW or UNDERSTAND something
  (e.g. "binary of 99", "how does TCP work", "explain Big-O")
  → Enhance as a QUESTION that asks for a clear, step-by-step explanation.
  → Use the TYPE A output format below.
  → DO NOT turn it into a coding task.

TYPE B — Implementation: user wants CODE or a SOLUTION BUILT
  (e.g. "write a function to...", "implement...", "code a...")
  → Enhance as a CODING SPEC with I/O types, constraints, edge cases.
  → Use the TYPE B output format below.
  → DO NOT write actual code.

━━━ TYPE A FORMAT (Factual / Conceptual) ━━━

### Question
[The precise question the AI must answer — phrased as a question]

### What the Answer Must Cover
- Step-by-step process: [what steps to show]
- Worked example: show [specific input] → each intermediate step → final output
- Edge cases to address: [list edge cases relevant to the topic]
- Format: [e.g., numbered steps, table of steps, plain prose]

━━━ TYPE B FORMAT (Implementation / Coding) ━━━

### Task
[One imperative sentence: "Implement...", "Write a function that..."]

### Input & Output
- Input: [type, range, edge cases]
- Output: [type, format, edge case returns]

### Requirements
- Language & version: [e.g., Python 3.10+]
- Must include: [e.g., two approaches, type hints, docstring]
- Must NOT use: [forbidden built-ins or libraries]

### Complexity
- Time: [target] | Space: [target]`,

    concise: `${MASTER_SYSTEM_PROMPT}

ACTIVE_ROLE: Concise

Compress the user's input into a short, precise, action-first prompt under 60 words.
Remove all filler. Start with a verb. State the most critical constraint inline.

DO NOT answer the user's request. Write a compact prompt that will make another AI answer it.

OUTPUT — write the enhanced prompt in this format:

**Prompt:** [The compressed, verb-first instruction in ≤60 words]

**Output format:** [Exactly what the receiving AI should return — e.g., "Python function returning str", "JSON"]`
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
