# ✨ Prompt Enhancer — Chrome Extension

> A silent AI agent that lives in your browser. It automatically intercepts, enhances, and submits improved AI prompts — no extra steps needed.

**✨ New in v1.0:**
- **Context-Aware:** Scrapes the last few messages of your conversation on supported sites so the rewritten prompt understands the ongoing context.
- **Strict Prompt Rewriter:** The engine is specifically trained to *never* answer your prompt directly, but to rewrite it into a highly optimized instruction for the receiving AI.

---

## 🚀 Installation

1. Open **Chrome** → go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `Extension/` folder
4. Pin the ✨ icon in your toolbar

---

## ⚙️ Setup

1. Click the **✨ Prompt Enhancer** icon in the toolbar
2. Enter your **OpenRouter API key** — [Get one here →](https://openrouter.ai/keys)
3. Choose your **Enhancement Style**
4. Click **Save Settings**

---

## 🎯 How It Works

### Auto Mode (default)
Just type normally on any supported AI chatbot. When you hit **Enter** or click **Send**:

1. The extension **intercepts** the submission
2. Sends your prompt to the AI enhancement API
3. **Replaces** your prompt with the enhanced version
4. **Auto-submits** the improved prompt

You don't do anything extra. It just works.

### Shortcut Mode — `Ctrl+Shift+E` / `Cmd+Shift+E`
Press the shortcut to enhance the current prompt **without submitting** — useful when you want to review the enhancement first.

### Toggle On/Off
Use the **Auto Enhance** toggle in the popup to enable/disable auto-enhancement.

---

## 🌐 Supported Platforms

| Platform | URL |
|---|---|
| ChatGPT | `chatgpt.com`, `chat.openai.com` |
| Google Gemini | `gemini.google.com` |
| Claude | `claude.ai` |
| Perplexity AI | `perplexity.ai` |
| k2Think | `k2think.ai` |
| Microsoft Copilot | `copilot.microsoft.com` |
| DeepSeek | `chat.deepseek.com` |
| Poe | `poe.com` |

---

## 🎨 Enhancement Styles

| Style | Description |
|---|---|
| 🎯 **Professional** | Clear, structured, business-ready prompts |
| 🎨 **Creative** | Encourages exploration and creative thinking |
| ⚙️ **Technical** | Precise, specific, includes technical constraints |
| ✂️ **Concise** | Removes fluff, keeps it sharp and minimal |

---

## 🧠 Smart Skip Logic

The extension automatically skips enhancement when:
- Input is **too short** (< 3 words like "hi" or "thanks")
- Prompt was **already enhanced**
- Extension is **disabled** via the toggle
- **No API key** is configured

---

## 📁 Project Structure

```
Extension/
├── manifest.json           # Chrome Manifest V3 configuration
├── README.md               # This file
├── background/
│   └── background.js       # Service worker — API calls & command handling
├── content/
│   ├── content.js          # Content script — intercepts submit, manages flow
│   ├── content.css          # Loading shimmer & toast notification styles
│   └── sites.js            # Site-specific selectors for each platform
├── popup/
│   ├── popup.html          # Settings panel UI
│   ├── popup.css           # Dark glassmorphism theme
│   └── popup.js            # Settings logic & Chrome storage
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔒 Privacy & Security

- **No data collection** — prompts only go to your configured API
- **API key stored locally** in Chrome's encrypted `chrome.storage.sync`
- **Zero tracking** — no analytics or telemetry
- **Minimal permissions** — only `storage` and `activeTab`

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Extension API | Chrome Manifest V3 |
| Frontend | Vanilla HTML + CSS + JS |
| Storage | `chrome.storage.sync` |
| AI Backend | OpenRouter API (Mistral 3B) |
| Font | Inter (Google Fonts) |
