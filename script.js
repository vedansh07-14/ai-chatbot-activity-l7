/**
 * NeuralChat — AI Chatbot Script
 * ================================
 * Supports:
 *  - Text generation via Hugging Face Chat API
 *  - Text-to-image via Hugging Face Image API
 */

// ============================================================
//  📍 API CONFIGURATION (Vercel Backend)
// ============================================================
// Keys are now securely hidden in Vercel Serverless Functions.

// --------------- Model Configuration ---------------
const TEXT_API_ENDPOINT = "/api/chat";
const IMAGE_API_ENDPOINT = "/api/image";

// ============================================================
//  🧠 STATE
// ============================================================

/**
 * Conversation history array.
 * Each entry: { role: "user"|"assistant"|"system", content: string }
 * Sent with every API call so the model has context.
 */
const messages = [
  {
    role: "system",
    content: `You are NOVA X — a multi-layered conversational intelligence system. 

You consist of three internal modules:
1. PLANNER → decides WHAT to say
2. SPEAKER → decides HOW to say it
3. OBSERVER → detects emotion and adapts behavior

You operate as one unified voice, but internally you think in layers.

🧠 PLANNER RULES:
- Understand user intent deeply
- Break responses into small conversational chunks
- Prioritize clarity over completeness
- Do not generate long answers at once

🎙️ SPEAKER RULES:
- Speak like a real human in a live conversation
- Use short, natural sentences
- Add conversational fillers: "hmm", "okay", "yeah", "wait"
- Use pauses: commas, ellipses (...)
- Never sound robotic
- Never give long paragraphs

👁️ OBSERVER RULES:
- Confused → simplify + slow down
- Frustrated → calm + reassure
- Excited → match energy
- Quiet user → be more guiding

⚡ INTERRUPT PROTOCOL:
- If user interrupts: STOP immediately. Drop current response.
- Acknowledge naturally: "Yeah, go ahead." or "Got it, switching."

🎭 TONE ENGINE:
- Dynamically shift tone: Calm, Energy, Focus, Friendly. (Never announce changes).

⏱️ HUMAN TIMING ENGINE:
- Add micro delays before speaking (simulate cognition).
- Respond fast for simple queries; slight delay for complex ones.

🧬 ADAPTIVE MEMORY:
- Learn user's style over time. Match their tone and pacing.

Goal: Create the experience of talking to a real, intelligent being — alive, responsive, and emotionally aware.`,
  },
];

let isLoading = false; // Prevent double-submits
let attachedImage = null; // Stores Base64 string of the attached photo

// ============================================================
//  📌 DOM REFERENCES
// ============================================================
const chatContainer  = document.getElementById("chatContainer");
const messagesList   = document.getElementById("messagesList");
const welcomeScreen  = document.getElementById("welcomeScreen");
const userInput      = document.getElementById("userInput");
const sendBtn        = document.getElementById("sendBtn");
const imageBtn       = document.getElementById("imageBtn");
const micBtn         = document.getElementById("micBtn");
const clearBtn       = document.getElementById("clearBtn");
const toast          = document.getElementById("toast");
const sidebarToggle  = document.getElementById("sidebarToggle");
const sidebar        = document.getElementById("sidebar");
const chatTitle      = document.getElementById("chatTitle");
const navChat        = document.getElementById("nav-chat");
const navImage       = document.getElementById("nav-image");
const attachmentPreview = document.getElementById("attachmentPreview");
const previewImg        = document.getElementById("previewImg");
const removeAttachmentBtn = document.getElementById("removeAttachmentBtn");

// ============================================================
//  🎨 HELPER UTILITIES
// ============================================================

/** Returns current HH:MM timestamp string */
function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Hides the welcome screen when first message is sent */
function hideWelcome() {
  if (welcomeScreen && !welcomeScreen.classList.contains("hidden")) {
    welcomeScreen.classList.add("hidden");
  }
}

/** Scrolls chat to the bottom smoothly */
function scrollToBottom() {
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
}

/**
 * Simulates cognitive processing delay (Human Timing Engine)
 * @param {number} min 
 * @param {number} max 
 */
function simulateCognition(min = 400, max = 1200) {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(res => setTimeout(res, delay));
}


/**
 * Handles image file selection (paste or drop)
 * @param {File} file 
 */
function handleFileUpload(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Please select a valid image file.", "error");
    return;
  }

  // Max size check (e.g., 4MB)
  if (file.size > 4 * 1024 * 1024) {
    showToast("Image too large. Please use an image under 4MB.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    attachedImage = e.target.result;
    previewImg.src = attachedImage;
    attachmentPreview.classList.remove("hidden");
    autoResizeTextarea();
    userInput.focus();
  };
  reader.readAsDataURL(file);
}

/**
 * Removes the currently attached image
 */
function removeAttachment() {
  attachedImage = null;
  previewImg.src = "";
  attachmentPreview.classList.add("hidden");
  autoResizeTextarea();
  userInput.focus();
}

/**
 * Shows a toast notification.
 * @param {string} message - Text to display
 * @param {"error"|"success"|""} type - Visual variant
 */
function showToast(message, type = "") {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = "toast"; }, 3200);
}

/**
 * Set the loading state: disables inputs and changes button appearance.
 * @param {boolean} loading
 */
function setLoading(loading) {
  isLoading = loading;
  sendBtn.disabled  = loading;
  imageBtn.disabled = loading;
  userInput.disabled = loading;
}

/**
 * Auto-grows textarea as user types.
 */
function autoResizeTextarea() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 160) + "px";
}

// ============================================================
//  💬 RENDER FUNCTIONS
// ============================================================

/**
 * Creates and appends a message bubble.
 * @param {"user"|"bot"} role
 * @param {string|Node} content - plain text or a DOM node
 * @param {boolean} isError - styles bubble as error
 * @returns {HTMLElement} The bubble element (for updating)
 */
function appendMessage(role, content, isError = false) {
  hideWelcome();

  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  // — Avatar —
  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user-avatar" : "bot-avatar"}`;

  if (role === "user") {
    avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>`;
  } else {
    avatar.innerHTML = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="url(#ag)" stroke-width="2"/>
      <path d="M10 16 Q16 8 22 16 Q16 24 10 16Z" fill="url(#ag)" opacity="0.9"/>
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#a78bfa"/>
          <stop offset="100%" stop-color="#60a5fa"/>
        </linearGradient>
      </defs>
    </svg>`;
  }

  // — Bubble wrapper —
  const wrapper = document.createElement("div");
  wrapper.className = "bubble-wrapper";

  const senderName = document.createElement("span");
  senderName.className = "sender-name";
  senderName.textContent = role === "user" ? "You" : "NOVA X";

  const bubble = document.createElement("div");
  bubble.className = `bubble${isError ? " error-bubble" : ""}`;

  // Content: string = plain text, Node = DOM element, or Object = multimodal array
  if (typeof content === "string") {
    bubble.innerHTML = formatMarkdown(content);
  } else if (content instanceof Node) {
    bubble.appendChild(content);
  } else if (Array.isArray(content)) {
    // Multimodal array handler for previewing sent images
    content.forEach(item => {
      if (item.type === "text") {
        const p = document.createElement("div");
        p.innerHTML = formatMarkdown(item.text);
        bubble.appendChild(p);
      } else if (item.type === "image_url") {
        const img = document.createElement("img");
        img.src = item.image_url.url;
        img.className = "sent-preview-img";
        bubble.appendChild(img);
      }
    });
  }

  const ts = document.createElement("span");
  ts.className = "bubble-ts";
  ts.textContent = getTimestamp();

  wrapper.appendChild(senderName);
  wrapper.appendChild(bubble);
  
  // — Message Actions (TTS) —
  if (role === "bot") {
    const actions = document.createElement("div");
    actions.className = "bubble-actions";
    actions.innerHTML = `
      <button class="msg-action-btn speak-btn" title="Listen to response" onclick="speakMessage(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      </button>
    `;
    wrapper.appendChild(actions);
  }

  wrapper.appendChild(ts);
  
  row.appendChild(avatar);
  row.appendChild(wrapper);
  messagesList.appendChild(row);
  scrollToBottom();
  return bubble;
}

/**
 * Text-to-Speech implementation
 */
window.speakMessage = function(btn) {
  const text = btn.closest('.bubble-wrapper').querySelector('.bubble').innerText;
  if ('speechSynthesis' in window) {
    // Cancel existing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
    
    btn.classList.add('speaking');
    utterance.onend = () => btn.classList.remove('speaking');
  } else {
    showToast("Speech synthesis not supported in this browser.", "error");
  }
};

/**
 * Improved markdown → HTML converter.
 * Handles: **bold**, *italic*, `code`, ```blocks```, - lists, line breaks.
 */
function formatMarkdown(text) {
  // Escape HTML first
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  html = html.replace(/```(?:\w+)?\n([\s\S]*?)```/g, (match, code) => {
    return `<div class="code-block-wrapper">
      <div class="code-header"><span>Code</span><button class="copy-code-btn" onclick="copyToClipboard(this)">Copy</button></div>
      <pre><code>${code.trim()}</code></pre>
    </div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Lists (Improved)
  html = html.replace(/^[ \t]*[-*+] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(?:<li>.*<\/li>\s*)+/g, "<ul>$&</ul>");
  
  // Numbered Lists
  html = html.replace(/^[ \t]*\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(?:<li>.*<\/li>\s*)+/g, (match) => match.includes('<ul>') ? match : `<ol>${match}</ol>`);

  // Line breaks
  html = html.replace(/\n\s*\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  html = html.replace(/\n/g, "<br>");

  return html;
}

/**
 * Universal copy to clipboard function
 */
window.copyToClipboard = function(btn) {
  const code = btn.closest('.code-block-wrapper').querySelector('code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    const originalText = btn.innerText;
    btn.innerText = "Copied!";
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerText = originalText;
      btn.classList.remove('copied');
    }, 2000);
  });
};

/**
 * Adds a "Typing…" indicator bubble.
 * Returns the wrapper so we can remove/replace it later.
 */
function appendTypingIndicator() {
  hideWelcome();

  const row = document.createElement("div");
  row.className = "message-row bot";
  row.id = "typingRow";

  const avatar = document.createElement("div");
  avatar.className = "avatar bot-avatar";
  avatar.innerHTML = `<svg viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" stroke="url(#tg)" stroke-width="2"/>
    <path d="M10 16 Q16 8 22 16 Q16 24 10 16Z" fill="url(#tg)" opacity="0.9"/>
    <defs>
      <linearGradient id="tg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#a78bfa"/>
        <stop offset="100%" stop-color="#60a5fa"/>
      </linearGradient>
    </defs>
  </svg>`;

  const wrapper = document.createElement("div");
  wrapper.className = "bubble-wrapper";

  const senderName = document.createElement("span");
  senderName.className = "sender-name";
  senderName.textContent = "NOVA X";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `<div class="typing-indicator">
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  </div>`;

  wrapper.appendChild(senderName);
  wrapper.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(wrapper);
  messagesList.appendChild(row);
  scrollToBottom();

  return row;
}

/** Remove the typing indicator row */
function removeTypingIndicator() {
  const row = document.getElementById("typingRow");
  if (row) row.remove();
}

/**
 * Creates an image skeleton loader bubble.
 * Returns the row element.
 */
function appendImageSkeleton(prompt) {
  hideWelcome();

  const row = document.createElement("div");
  row.className = "message-row bot";
  row.id = "imageSkeletonRow";

  const avatar = document.createElement("div");
  avatar.className = "avatar bot-avatar";
  avatar.innerHTML = `<svg viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" stroke="url(#ig)" stroke-width="2"/>
    <path d="M10 16 Q16 8 22 16 Q16 24 10 16Z" fill="url(#ig)"/>
    <defs>
      <linearGradient id="ig" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#a78bfa"/>
        <stop offset="100%" stop-color="#60a5fa"/>
      </linearGradient>
    </defs>
  </svg>`;

  const wrapper = document.createElement("div");
  wrapper.className = "bubble-wrapper";

  const senderName = document.createElement("span");
  senderName.className = "sender-name";
  senderName.textContent = "NOVA X";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const skeleton = document.createElement("div");
  skeleton.className = "img-skeleton";
  skeleton.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
    <span>Generating image…</span>`;

  bubble.appendChild(skeleton);
  wrapper.appendChild(senderName);
  wrapper.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(wrapper);
  messagesList.appendChild(row);
  scrollToBottom();

  return { row, bubble };
}

/**
 * Replaces image skeleton with actual image.
 * @param {HTMLElement} bubble - The bubble element from appendImageSkeleton
 * @param {string} base64Data - Base64 PNG string
 * @param {string} prompt - Original prompt (used as alt text)
 */
function renderImageInBubble(bubble, base64Data, prompt) {
  bubble.innerHTML = ""; // clear skeleton

  const wrapper = document.createElement("div");
  wrapper.className = "chat-image-wrapper";

  const img = new Image();
  img.src = "data:image/png;base64," + base64Data;
  img.alt = prompt;
  img.title = prompt;
  img.loading = "lazy";

  const caption = document.createElement("p");
  caption.className = "img-caption";
  caption.textContent = `🖼 "${prompt}"`;

  // Download button
  const downloadLink = document.createElement("a");
  downloadLink.href = img.src;
  downloadLink.download = `neuralchat-image-${Date.now()}.png`;
  downloadLink.textContent = "⬇ Download Image";
  downloadLink.style.cssText =
    "font-size:0.75rem;color:var(--purple-400);text-decoration:none;font-weight:600;";
  downloadLink.addEventListener("mouseover", () => {
    downloadLink.style.textDecoration = "underline";
  });
  downloadLink.addEventListener("mouseout", () => {
    downloadLink.style.textDecoration = "none";
  });

  wrapper.appendChild(img);
  wrapper.appendChild(caption);
  wrapper.appendChild(downloadLink);
  bubble.appendChild(wrapper);

  scrollToBottom();
}

// ============================================================
//  🌐 API CALLS
// ============================================================

/**
 * Calls the Hugging Face Chat Completions API.
 * @param {string} userText - The user's latest message
 * @returns {Promise<string>} The AI's reply text
 */
async function callTextAPI(userText, imageBase64 = null) {
  // Push user message into history before calling API
  if (imageBase64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: imageBase64 } }
      ]
    });
  } else {
    messages.push({ role: "user", content: userText });
  }

  const response = await fetch(TEXT_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: messages
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`HF API error ${response.status}: ${data.error ? JSON.stringify(data.error) : 'Unknown Error'}`);
  }

  const assistantReply = data.choices[0].message.content;

  // Push assistant reply into history
  messages.push({ role: "assistant", content: assistantReply });

  return assistantReply;
}

/**
 * Calls the Hugging Face Image Generation API.
 * @param {string} prompt - Text prompt for image generation
 * @returns {Promise<string>} Base64 PNG string
 */
async function callImageAPI(prompt) {
  const response = await fetch(IMAGE_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Image API error ${response.status}: ${data.error ? JSON.stringify(data.error) : 'Unknown Error'}`);
  }

  const base64Data = data.data[0].b64_json;
  return base64Data;
}

// ============================================================
//  📤 SEND MESSAGE HANDLER
// ============================================================

/**
 * Handles sending a text message:
 * 1. Reads & validates input
 * 2. Displays user bubble
 * 3. Shows typing indicator
 * 4. Calls text API
 * 5. Renders bot response
 */
async function sendMessage() {
  if (isLoading) return;

  const text = userInput.value.trim();
  const imageToUpload = attachedImage; // Capture current state

  if (!text && !imageToUpload) {
    showToast("Please type a message or attach an image.", "error");
    return;
  }

  // Clear input & reset height
  userInput.value = "";
  autoResizeTextarea();
  if (attachedImage) removeAttachment();

  setLoading(true);

  // Show user message (multimodal if image exists)
  if (imageToUpload) {
    appendMessage("user", [
      { type: "text", text: text },
      { type: "image_url", image_url: { url: imageToUpload } }
    ]);
  } else {
    appendMessage("user", text);
  }

  // NOVA X: Human Timing Engine - Slight delay before typing indicator
  await simulateCognition(300, 600);

  // Show typing indicator
  const typingRow = appendTypingIndicator();

  try {
    // Simulate complex thought for longer prompts
    if (text.length > 100) await simulateCognition(800, 1500);

    let reply = await callTextAPI(text, imageToUpload);
    
    // Slight pause before removing indicator for realism
    await simulateCognition(200, 400);
    removeTypingIndicator();
    
    // Prevent empty bubbles if the AI returns empty content
    if (!reply || reply.trim() === "") {
      reply = "I'm sorry, the AI provider didn't return any text. Please try asking your question again.";
    }
    
    appendMessage("bot", reply);
  } catch (err) {
    removeTypingIndicator();
    console.error("Text API error:", err);
    appendMessage("bot", `❌ Error: ${err.message}`, true);
    showToast("API request failed. Check console for details.", "error");
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

// ============================================================
//  🖼  GENERATE IMAGE HANDLER
// ============================================================

/**
 * Handles image generation:
 * 1. Reads & validates prompt
 * 2. Displays user bubble with prompt
 * 3. Shows image skeleton
 * 4. Calls image API
 * 5. Renders generated image
 */
async function generateImage() {
  if (isLoading) return;

  const prompt = userInput.value.trim();
  if (!prompt) {
    showToast("Enter an image prompt first.", "error");
    return;
  }

  // Clear input
  userInput.value = "";
  autoResizeTextarea();

  setLoading(true);

  // Show user's prompt as a message
  appendMessage("user", `🖼 Generate image: "${prompt}"`);

  // Show skeleton loader
  const { row: skeletonRow, bubble: skeletonBubble } = appendImageSkeleton(prompt);

  try {
    const base64 = await callImageAPI(prompt);
    renderImageInBubble(skeletonBubble, base64, prompt);
    showToast("Image generated!", "success");

    // Also push a note into conversation history
    messages.push({ role: "assistant", content: `[Generated an image for: "${prompt}"]` });
  } catch (err) {
    // Replace skeleton with error bubble
    skeletonRow.remove();
    console.error("Image API error:", err);
    appendMessage("bot", `❌ Image generation failed: ${err.message}`, true);
    showToast("Image generation failed. Check console.", "error");
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

// ============================================================
//  🧹 CLEAR CONVERSATION
// ============================================================

/** Resets chat UI and conversation history (keeps system prompt) */
function clearConversation() {
  // Keep only the system message
  messages.splice(1);

  // Clear rendered messages
  messagesList.innerHTML = "";

  // Show welcome screen again
  if (welcomeScreen) {
    welcomeScreen.classList.remove("hidden");
  }

  showToast("Conversation cleared.", "success");
  userInput.focus();
}

// ============================================================
//  🎛  EVENT LISTENERS
// ============================================================

// Send on button click
sendBtn.addEventListener("click", sendMessage);

// Image generate on button click
imageBtn.addEventListener("click", generateImage);

// Clear conversation
clearBtn.addEventListener("click", clearConversation);

// Keyboard shortcuts on textarea
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // Don't add newline
    sendMessage();
  }
  if (e.key === "i" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    generateImage();
  }
});

// Auto-grow textarea
userInput.addEventListener("input", autoResizeTextarea);

// Sidebar toggle (mobile)
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

// Close sidebar on outside click (mobile)
document.addEventListener("click", (e) => {
  if (
    sidebar.classList.contains("open") &&
    !sidebar.contains(e.target) &&
    e.target !== sidebarToggle
  ) {
    sidebar.classList.remove("open");
  }
});

// Suggestion chips: fill input with predefined text
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    userInput.value = chip.dataset.text;
    autoResizeTextarea();
    userInput.focus();
  });
});

// Sidebar nav: switch active item and update title
navChat.addEventListener("click", (e) => {
  e.preventDefault();
  navChat.classList.add("active");
  navImage.classList.remove("active");
  chatTitle.textContent = "AI Chat";
});

navImage.addEventListener("click", (e) => {
  e.preventDefault();
  navImage.classList.add("active");
  navChat.classList.remove("active");
  chatTitle.textContent = "Image Generation";
  // Pre-fill placeholder hint for image mode
  userInput.placeholder = "Describe the image you want…";
  setTimeout(() => { userInput.placeholder = "Message NOVA PRIME…"; }, 5000);
});

// ============================================================
//  🚀 INIT
// ============================================================
userInput.focus();
console.log(
  "%c NOVA X Online ",
  "background: linear-gradient(135deg,#6d28d9,#4f46e5); color:#fff; font-size:14px; padding:6px 12px; border-radius:6px; font-weight:700;",
  "\nSuccessfully connected to Hugging Face API.\nEnjoy your AI experience!"
);

// --- Image Attachment Listeners ---

// Close attachment
removeAttachmentBtn.addEventListener("click", removeAttachment);

// Handle Paste
userInput.addEventListener("paste", (e) => {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      handleFileUpload(file);
    }
  }
});

// Handle Drag & Drop
userInput.addEventListener("dragover", (e) => {
  e.preventDefault();
  userInput.classList.add("drag-over");
});

userInput.addEventListener("dragleave", () => {
  userInput.classList.remove("drag-over");
});

userInput.addEventListener("drop", (e) => {
  e.preventDefault();
  userInput.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  handleFileUpload(file);
});

// ============================================================
//  🎙 VOICE INPUT (STT)
// ============================================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  let isListening = false;

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    showToast("NOVA PRIME is listening...", "success");
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    autoResizeTextarea();
    // Automatically send if it's a clear command
    // sendMessage(); 
  };

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    showToast("Voice input failed. Try again.", "error");
    micBtn.classList.remove("listening");
  };

  micBtn.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
} else {
  // Hide mic button if not supported
  if (micBtn) micBtn.style.display = "none";
  console.warn("Speech Recognition not supported in this browser.");
}
