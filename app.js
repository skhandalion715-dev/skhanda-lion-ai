const STORAGE_KEY = 'skhanda-lion-state-v1';

const starterPrompts = {
  plan: 'Help me plan a calm, productive week.',
  teach: 'Teach me something useful in a simple way.',
  talk: 'I’ve had a difficult day and need someone to talk to.'
};

const defaultState = {
  conversations: [],
  activeConversationId: null,
  memories: [],
  theme: 'light'
};

let state = loadState();
let isThinking = false;
let lastAssistantReply = '';
let voiceEnabled = false;

const els = {
  body: document.body,
  chatView: document.querySelector('#chatView'),
  memoryView: document.querySelector('#memoryView'),
  messages: document.querySelector('#messages'),
  emptyState: document.querySelector('#emptyState'),
  typingRow: document.querySelector('#typingRow'),
  form: document.querySelector('#composerForm'),
  input: document.querySelector('#messageInput'),
  send: document.querySelector('#sendButton'),
  newChat: document.querySelector('#newChatButton'),
  memoryCount: document.querySelector('#memoryCount'),
  memoryPanel: document.querySelector('#memoryPanel'),
  clearMemory: document.querySelector('#clearMemoryButton'),
  themeButton: document.querySelector('#themeButton'),
  voiceButton: document.querySelector('#voiceButton'),
  toast: document.querySelector('#toast'),
  pageTitle: document.querySelector('#pageTitle'),
  mobileMenu: document.querySelector('#mobileMenuButton'),
  sidebar: document.querySelector('.sidebar')
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState, ...(saved || {}) };
  } catch (error) {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeConversation() {
  return state.conversations.find((conversation) => conversation.id === state.activeConversationId);
}

function ensureConversation() {
  if (!activeConversation()) {
    const conversation = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title: 'New conversation', messages: [] };
    state.conversations.push(conversation);
    state.activeConversationId = conversation.id;
    saveState();
  }
  return activeConversation();
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function renderText(value) {
  const safe = escapeHTML(value);
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function renderMessages() {
  const conversation = activeConversation();
  const messages = conversation?.messages || [];
  els.messages.innerHTML = messages.map((message) => {
    const isUser = message.role === 'user';
    return `<article class="message-row ${isUser ? 'user' : 'assistant'}">
      ${isUser ? '' : '<div class="avatar avatar-assistant">SL</div>'}
      <div>
        <div class="message-bubble">${renderText(message.content)}</div>
        <div class="message-meta">${isUser ? 'You' : 'Skhanda'} · ${escapeHTML(message.time || '')}</div>
      </div>
    </article>`;
  }).join('');
  els.emptyState.classList.toggle('is-hidden', messages.length > 0);
  els.messages.classList.toggle('is-hidden', messages.length === 0);
  els.typingRow.classList.toggle('is-hidden', !isThinking);
  if (messages.length > 0) {
    requestAnimationFrame(() => { els.messages.parentElement.scrollTop = els.messages.parentElement.scrollHeight; });
  }
}

function renderMemories() {
  els.memoryCount.textContent = state.memories.length;
  if (!state.memories.length) {
    els.memoryPanel.innerHTML = '<div class="empty-memory">No saved wisdom yet. When something matters, tell Skhanda to remember it.</div>';
    return;
  }
  els.memoryPanel.innerHTML = state.memories.map((memory) => `<div class="memory-item">
    <div class="memory-bullet">✦</div>
    <div><p>${escapeHTML(memory.text)}</p><time>Saved ${escapeHTML(memory.time)}</time></div>
  </div>`).join('');
}

function setView(view) {
  const isMemory = view === 'memory';
  els.chatView.classList.toggle('is-hidden', isMemory);
  els.memoryView.classList.toggle('is-hidden', !isMemory);
  els.pageTitle.textContent = isMemory ? 'Keep the details that matter.' : 'A calm space to think clearly.';
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('is-active', item.dataset.view === view));
  if (isMemory) renderMemories();
  els.sidebar.classList.remove('is-open');
}

function addMessage(role, content) {
  const conversation = ensureConversation();
  conversation.messages.push({ role, content, time: formatTime() });
  if (role === 'user' && conversation.title === 'New conversation') {
    conversation.title = content.slice(0, 35) + (content.length > 35 ? '…' : '');
  }
  saveState();
  renderMessages();
}

function rememberFrom(message) {
  const match = message.match(/(?:remember that|remember this|don't forget that)\s+(.+)/i);
  if (!match) return null;
  const text = match[1].replace(/[.!?]+$/, '').trim();
  if (!text) return null;
  const alreadySaved = state.memories.some((memory) => memory.text.toLowerCase() === text.toLowerCase());
  if (!alreadySaved) {
    state.memories.unshift({ text: text.charAt(0).toUpperCase() + text.slice(1), time: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) });
    saveState();
    renderMemories();
  }
  return text;
}

function hasAny(message, words) {
  return words.some((word) => message.includes(word));
}

function generateReply(input) {
  const message = input.toLowerCase().trim();
  const remembered = rememberFrom(input);
  if (remembered) {
    return `I’ve got it. I’ll remember that **${remembered}** for our future conversations. You can always review or clear your saved wisdom from the side panel.`;
  }

  if (hasAny(message, ['kill myself', 'suicide', 'end my life', 'hurt myself', 'self harm', 'not worth living'])) {
    return `I’m really sorry you’re carrying this much right now. I can stay with you, but I can’t keep you safe by myself. **Please call your local emergency number now, or go to the nearest emergency department.** If you can, move away from anything you could use to hurt yourself and tell a trusted person: “I need you to stay with me.”\n\nAre you in immediate danger right now?`;
  }

  if (hasAny(message, ['hello', 'hi ', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
    return `Hello — I’m glad you’re here. You can bring me something practical, something personal, or just a thought that feels messy. What would feel most helpful right now?`;
  }

  if (hasAny(message, ['sad', 'lonely', 'overwhelmed', 'anxious', 'anxiety', 'stressed', 'stress', 'difficult day', 'not okay', 'upset', 'tired'])) {
    return `That sounds heavy, and you don’t have to make it sound neat for me. Let’s make this moment a little smaller.\n\nTry this with me: put both feet on the floor, take one slow breath out, and name the **one part** that feels loudest right now. We can look at just that part — no pressure to solve everything at once.`;
  }

  if (hasAny(message, ['teach', 'explain', 'learn', 'what is', 'how does', 'difference between'])) {
    return `Absolutely. I’ll keep it clear and build from the basics.\n\n**A simple way to learn anything:**\n• Start with the one-sentence idea\n• Connect it to a familiar example\n• Try one small practice question\n• Explain it back in your own words\n\nWhat topic would you like to explore? I can make it beginner-friendly, practical, or more advanced.`;
  }

  if (hasAny(message, ['plan', 'schedule', 'organize', 'productive', 'week', 'routine'])) {
    return `Let’s turn the swirl into a gentle plan.\n\n**1. Choose your three anchors** — one important task, one maintenance task, and one thing that gives you energy.\n**2. Make the first step tiny** — aim for 15 focused minutes, not a perfect day.\n**3. Leave breathing room** — a plan should support you, not chase you.\n\nTell me what you’re trying to get done and what your energy is like, and I’ll help you shape it around your real life.`;
  }

  if (hasAny(message, ['advice', 'should i', 'what do you think', 'help me decide', 'decision'])) {
    return `I can help you think it through without taking the choice away from you.\n\nLet’s look at three things: **what matters most to you, what each option costs, and what your calmer self might be grateful you considered.** You don’t need to decide in one dramatic leap — sometimes the next honest step is enough.\n\nWhat are the options you’re weighing?`;
  }

  if (hasAny(message, ['thank', 'thanks', 'appreciate'])) {
    return `You’re welcome. I’m glad I could make things a little lighter. You can come back to this whenever you need a calm place to sort your thoughts.`;
  }

  if (message.endsWith('?')) {
    return `That’s a thoughtful question. My first take is to separate **what we know, what we’re assuming, and what you want to be true**. That usually makes the next step clearer.\n\nHere’s the short answer: I can help you work through it carefully, but I’d like a little more context so I don’t give you a shallow answer. What part feels most important?`;
  }

  return `I hear you. There’s something real in what you’re saying, even if it’s still taking shape. We can slow down and look at it together.\n\nWould you like me to **listen**, **help you make a plan**, or **give you a clear point of view**?`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove('is-visible'), 2600);
}

async function handleSubmit(event) {
  event.preventDefault();
  const value = els.input.value.trim();
  if (!value || isThinking) return;
  els.input.value = '';
  resizeInput();
  setView('chat');
  addMessage('user', value);
  isThinking = true;
  els.send.disabled = true;
  renderMessages();
  await new Promise((resolve) => window.setTimeout(resolve, 700 + Math.min(value.length * 7, 750)));
  const reply = generateReply(value);
  lastAssistantReply = reply;
  addMessage('assistant', reply);
  isThinking = false;
  els.send.disabled = false;
  renderMessages();
  if (voiceEnabled && 'speechSynthesis' in window) speak(reply);
}

function resizeInput() {
  els.input.style.height = 'auto';
  els.input.style.height = `${Math.min(els.input.scrollHeight, 140)}px`;
}

function startNewConversation() {
  const conversation = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title: 'New conversation', messages: [] };
  state.conversations.push(conversation);
  state.activeConversationId = conversation.id;
  saveState();
  setView('chat');
  renderMessages();
  els.input.focus();
}

function speak(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*•]/g, ''));
  utterance.rate = .96;
  utterance.pitch = 1.02;
  window.speechSynthesis.speak(utterance);
}

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  els.voiceButton.classList.toggle('is-active', voiceEnabled);
  els.voiceButton.innerHTML = voiceEnabled ? '<span aria-hidden="true">◒</span> Voice on' : '<span aria-hidden="true">◒</span> Voice';
  showToast(voiceEnabled ? 'Voice replies are on.' : 'Voice replies are off.');
  if (voiceEnabled && lastAssistantReply && 'speechSynthesis' in window) speak(lastAssistantReply);
}

function boot() {
  document.documentElement.dataset.theme = state.theme;
  els.themeButton.textContent = state.theme === 'dark' ? '☾' : '☼';
  renderMessages();
  renderMemories();

  els.form.addEventListener('submit', handleSubmit);
  els.input.addEventListener('input', resizeInput);
  els.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      els.form.requestSubmit();
    }
  });
  els.newChat.addEventListener('click', startNewConversation);
  els.voiceButton.addEventListener('click', toggleVoice);
  els.mobileMenu.addEventListener('click', () => els.sidebar.classList.toggle('is-open'));
  els.themeButton.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    els.themeButton.textContent = state.theme === 'dark' ? '☾' : '☼';
    saveState();
  });
  els.clearMemory.addEventListener('click', () => {
    if (!state.memories.length) return;
    state.memories = [];
    saveState();
    renderMemories();
    showToast('Saved wisdom cleared from this browser.');
  });
  document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)));
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => {
    els.input.value = button.dataset.prompt;
    resizeInput();
    els.input.focus();
  }));
}

boot();