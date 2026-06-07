let state = { cards: [], totals: {}, yandex: {}, authEnabled: false };
let editing = null;

const $ = (id) => document.getElementById(id);
const metrics = $("metrics");
const cardsEl = $("cards");
const notice = $("notice");
const search = $("search");
const advisor = $("advisor");
const deck = $("deck");
const problemOnly = $("problemOnly");
const editor = $("editor");

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function metric(value, label) {
  return `<div class="metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
}

function renderMetrics() {
  const t = state.totals;
  metrics.innerHTML = [
    metric(t.cards || 0, "карточек всего"),
    metric(t.advisors || 0, "советников"),
    metric(t.views || 0, "просмотров карт"),
    metric(t.likes || 0, "лайков"),
    metric(t.dislikes || 0, "дизлайков"),
    metric(t.overrides || 0, "правок"),
  ].join("");
  const y = state.yandex;
  const auth = state.authEnabled ? "" : " Пароль админки не задан: включи ADMIN_PASSWORD на сервере.";
  notice.textContent = y.configured
    ? `Yandex Metrica подключена к счетчику ${y.counterId}. Визиты за 30 дней: ${y.totals?.[0] ?? "нет данных"}.${auth}`
    : `Yandex Metrica API не настроена: добавь YANDEX_METRICA_TOKEN для общей сводки. Новые карточные события собираются через /api/collect.${auth}`;
}

function fillFilters() {
  const advisors = [...new Set(state.cards.map((card) => card.advisorName))].sort();
  const decks = [...new Set(state.cards.map((card) => card.deck))].sort();
  advisor.innerHTML = `<option value="">Все советники</option>${advisors.map((name) => `<option>${esc(name)}</option>`).join("")}`;
  deck.innerHTML = `<option value="">Все колоды</option>${decks.map((name) => `<option>${esc(name)}</option>`).join("")}`;
}

function isProblem(card) {
  return card.stats.dislikes > card.stats.likes || card.override || !card.text || !card.left?.label || !card.right?.label;
}

function filteredCards() {
  const q = search.value.trim().toLowerCase();
  return state.cards.filter((card) => {
    if (advisor.value && card.advisorName !== advisor.value) return false;
    if (deck.value && card.deck !== deck.value) return false;
    if (problemOnly.checked && !isProblem(card)) return false;
    if (!q) return true;
    return [card.sourceKey, card.cardId, card.advisorName, card.effectiveText, card.left?.label, card.right?.label]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

function renderCards() {
  const cards = filteredCards().sort((a, b) => (b.stats.dislikes - a.stats.dislikes) || (b.stats.views - a.stats.views));
  cardsEl.innerHTML = cards.map((card) => {
    const s = card.stats;
    return `
      <article class="row">
        <div><span class="tag">${esc(card.deck)}</span><p class="muted">${esc(card.sourceId)}<br>${esc(card.cardId)}</p></div>
        <div><strong>${esc(card.advisorName)}</strong><p class="muted">${esc(card.advisorRole)}</p>${card.override ? '<p class="override">есть оверрайд</p>' : ""}</div>
        <div class="text">${esc(card.effectiveText)}<div class="choices"><span class="choice">${esc(card.effectiveLeft?.label)}</span><span class="choice">${esc(card.effectiveRight?.label)}</span></div></div>
        <div class="stat">
          <div>views ${s.views}</div>
          <div class="good">+ ${s.likes}</div>
          <div class="bad">- ${s.dislikes}</div>
          <div class="muted">реш. ${s.decisions}</div>
        </div>
        <button data-edit="${esc(card.sourceKey)}">Править</button>
      </article>
    `;
  }).join("");
}

function openEditor(sourceKey) {
  editing = state.cards.find((card) => card.sourceKey === sourceKey);
  if (!editing) return;
  $("editorMeta").textContent = `${editing.sourceKey} · ${editing.advisorName}`;
  $("editText").value = editing.effectiveText;
  $("editLeftLabel").value = editing.effectiveLeft?.label || "";
  $("editRightLabel").value = editing.effectiveRight?.label || "";
  $("editLeftText").value = editing.effectiveLeft?.text || "";
  $("editRightText").value = editing.effectiveRight?.text || "";
  editor.showModal();
}

async function saveEdit(event) {
  event.preventDefault();
  if (!editing) return;
  await fetch("/api/overrides", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceKey: editing.sourceKey,
      text: $("editText").value,
      left: { ...editing.left, label: $("editLeftLabel").value, text: $("editLeftText").value },
      right: { ...editing.right, label: $("editRightLabel").value, text: $("editRightText").value },
    }),
  });
  editor.close();
  await load();
}

async function load() {
  const response = await fetch("/api/dashboard");
  state = await response.json();
  renderMetrics();
  fillFilters();
  renderCards();
}

$("refresh").addEventListener("click", load);
$("saveEdit").addEventListener("click", saveEdit);
[search, advisor, deck, problemOnly].forEach((el) => el.addEventListener("input", renderCards));
cardsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit]");
  if (button) openEditor(button.dataset.edit);
});

load().catch((error) => {
  notice.textContent = `Не удалось загрузить данные: ${error.message}`;
});
