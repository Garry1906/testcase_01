import { AVATARS } from "./avatars.js";
import { MEMBERS, ORDER, makeAgent, testConnection } from "./agents.js";
import { Council } from "./council.js";

// ---------- local storage (this phone only) ----------
const store = {
  get(k, fallback) {
    try {
      const v = localStorage.getItem("hive." + k);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem("hive." + k, JSON.stringify(v));
    } catch {
      /* storage blocked: the app still works for this session */
    }
  },
};

const state = {
  conns: store.get("conns", {}), // { claude: {key, model, ok}, ... }
  chair: store.get("chair", "claude"),
  prefs: store.get("prefs", []),
  history: store.get("history", []),
  council: null,
  busy: false,
};
const save = () => {
  store.set("conns", state.conns);
  store.set("chair", state.chair);
  store.set("prefs", state.prefs);
  store.set("history", state.history);
};
const connected = () => ORDER.filter((id) => state.conns[id]?.key);

// ---------- helpers ----------
const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function toast(msg) {
  const t = el("div", "toast", esc(msg));
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

// Small, safe Markdown renderer (escapes everything first).
function md(src) {
  const blocks = [];
  let s = esc(src).replace(/```[\w-]*\n?([\s\S]*?)```/g, (_, code) => {
    blocks.push(`<pre><code>${code}</code></pre>`);
    return `\u0000${blocks.length - 1}\u0000`;
  });
  const inline = (t) =>
    t
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\[(Claude|Perplexity|Copilot)\]/g, '<span class="tag">$1</span>');
  const out = [];
  let list = null;
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const line of s.split("\n")) {
    let m;
    if ((m = line.match(/^\u0000(\d+)\u0000$/))) { close(); out.push(blocks[+m[1]]); }
    else if ((m = line.match(/^(#{1,4})\s+(.*)/))) { close(); out.push(`<h${Math.min(m[1].length + 1, 4)}>${inline(m[2])}</h${Math.min(m[1].length + 1, 4)}>`); }
    else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if (!line.trim()) { close(); }
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join("").replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[+i]);
}

// ---------- header council ----------
function renderCouncil() {
  const ids = connected();
  const demo = ids.length === 0;
  $("#council").innerHTML = "";
  $("#welcome-cells").innerHTML = "";
  for (const id of ["claude", "perplexity", "copilot"]) {
    const on = demo || ids.includes(id);
    const b = el("button", `member${on ? "" : " off"}`, AVATARS[id]);
    b.dataset.id = id;
    b.type = "button";
    b.title = `${MEMBERS[id].name} — ${on ? MEMBERS[id].role : "not connected"}`;
    b.setAttribute("aria-label", b.title);
    b.onclick = () => show("connect");
    $("#council").append(b);
    const c = el("div", `cell${on ? "" : " off"}`, AVATARS[id] + esc(MEMBERS[id].name));
    $("#welcome-cells").append(c);
  }
  $("#demo-hint").innerHTML = demo
    ? 'No accounts connected yet — you\'re in <strong>demo mode</strong>. <a href="#" id="go-connect">Connect your accounts</a> for real answers.'
    : `${ids.length} of 3 members connected · chair: ${esc(MEMBERS[chairId()].name)}`;
  $("#go-connect")?.addEventListener("click", (e) => {
    e.preventDefault();
    show("connect");
  });
}
const chairId = () => {
  const ids = connected();
  return ids.includes(state.chair) ? state.chair : ids[0] || "claude";
};

// ---------- feed ----------
const feed = () => $("#feed");
function scroll() {
  const f = feed();
  requestAnimationFrame(() => (f.scrollTop = f.scrollHeight));
}
function addMsg(m) {
  const mem = m.agentId === "you" ? { name: "You", color: "#E9A520" } : MEMBERS[m.agentId];
  const kind = m.kind ? ` ${m.kind}` : "";
  const wrap = el("div", `msg${m.agentId === "you" ? " user" : ""}${kind}`);
  wrap.append(el("div", "av", AVATARS[m.agentId]));
  const b = el("div", "bubble");
  b.style.setProperty("--c", mem.color);
  const label = m.kind === "plan" ? '<span class="tag">Plan</span>' : m.kind === "final" ? '<span class="tag">Result</span>' : "";
  b.innerHTML = `<div class="who">${esc(mem.name)}${label}</div><div class="body">${md(m.text || "")}</div>`;
  if (m.sources?.length) {
    const s = el("div", "sources", "<strong>Sources</strong>");
    m.sources.slice(0, 8).forEach((u) => {
      const a = el("a", null, esc(u));
      a.href = u;
      a.target = "_blank";
      a.rel = "noopener";
      s.append(a);
    });
    b.append(s);
  }
  wrap.append(b);
  feed().append(wrap);
  scroll();
  return wrap;
}

const ui = {
  phase(title, sub) {
    feed().append(el("div", "phase", `<div>${esc(title)}<small>${esc(sub || "")}</small></div>`));
    scroll();
  },
  message: addMsg,
  thinking(id, on) {
    document.querySelector(`.member[data-id="${id}"]`)?.classList.toggle("thinking", on);
  },
  error(id, msg) {
    feed().append(el("div", "err", `${esc(MEMBERS[id].name)}: ${esc(msg)}`));
    scroll();
  },
  note(msg) {
    feed().append(el("div", "note", esc(msg)));
    scroll();
  },
  votes(tally) {
    const row = el("div", "votes");
    tally.forEach((v) => {
      const c = el("div", `vote ${v.agree ? "yes" : "no"}`,
        `${AVATARS[v.agentId]}<b>${v.agree ? "Agree" : "Object"}</b><span>${esc(v.reason)}</span>`);
      c.title = v.reason;
      row.append(c);
    });
    feed().append(row);
    scroll();
  },
};

function ask(buttons, withText) {
  return new Promise((resolve) => {
    const box = el("div", "actions");
    let ta;
    if (withText) {
      ta = el("textarea");
      ta.rows = 2;
      ta.placeholder = withText;
      box.append(ta);
    }
    buttons.forEach(([label, value, cls]) => {
      const b = el("button", `btn ${cls || ""}`, esc(label));
      b.type = "button";
      b.onclick = () => {
        box.remove();
        resolve({ value, text: ta?.value.trim() || "" });
      };
      box.append(b);
    });
    feed().append(box);
    scroll();
  });
}

function setBusy(on) {
  state.busy = on;
  $("#send").textContent = on ? "Stop" : "Send";
  $("#send").classList.toggle("primary", !on);
}

// ---------- a meeting ----------
async function meet(task) {
  $("#welcome")?.remove();
  addMsg({ agentId: "you", text: task });
  const ids = connected();
  const demo = ids.length === 0;
  const agents = (demo ? ORDER : ids).map((id) => makeAgent(id, state.conns[id], state.prefs, demo));
  if (demo) ui.note("Demo mode — these are sample replies. Connect your accounts for real answers.");

  const council = new Council({ agents, chairId: demo ? "claude" : chairId(), ui });
  state.council = council;
  setBusy(true);
  try {
    let plan = await council.deliberate(task);
    for (;;) {
      ui.phase("Your call", "Approve the plan, or tell the Hive what to change.");
      const r = await ask(
        [["Approve & build", "go", "primary"], ["Revise with my changes", "revise"], ["End meeting", "end"]],
        "Changes you want (optional)…",
      );
      if (r.value === "end") { ui.note("Meeting ended."); return; }
      if (r.value === "revise") {
        if (r.text) addMsg({ agentId: "you", text: r.text });
        plan = await council.reachConsensus(r.text || "Make it better and simpler.");
        continue;
      }
      break;
    }
    const result = await council.build(ORDER);
    state.history.unshift({ task, plan, result: result.text, at: Date.now() });
    state.history = state.history.slice(0, 30);
    save();
    renderMemory();

    ui.phase("How did we do?", "Your feedback teaches the Hive what you like.");
    const fb = await ask(
      [["Loved it", "up", "primary"], ["Not quite", "down"]],
      "What should the Hive always / never do? (optional)",
    );
    if (fb.text) {
      state.prefs.push(fb.text);
      save();
      renderMemory();
      ui.note("Saved — every member will follow that from now on.");
    } else {
      ui.note(fb.value === "up" ? "Thanks! The Hive will keep it up." : "Got it. Tell the Hive what to change any time in Memory.");
    }
  } catch (e) {
    if (e.name === "AbortError") ui.note("Stopped.");
    else ui.note("Meeting stopped: " + e.message);
  } finally {
    state.council = null;
    setBusy(false);
  }
}

// ---------- connect view ----------
function renderConnect() {
  const root = $("#connect-cards");
  root.innerHTML = "";
  for (const id of ["claude", "perplexity", "copilot"]) {
    const m = MEMBERS[id];
    const c = state.conns[id] || {};
    const card = el("div", "card");
    card.style.setProperty("--c", m.color);
    const status = c.key ? (c.ok === false ? '<span class="status bad">Check key</span>' : '<span class="status on">Connected</span>') : '<span class="status">Not connected</span>';
    card.innerHTML = `
      <div class="card-head">${AVATARS[id]}
        <div><h4>${esc(m.name)}</h4><div class="sub">${esc(m.company)} · ${esc(m.role)}</div></div>
        ${status}
      </div>
      <p class="creed">${esc(m.creed)}</p>
      <label for="key-${id}">${esc(m.keyLabel)}</label>
      <div class="row">
        <input id="key-${id}" type="password" placeholder="${esc(m.keyHint)}" value="${esc(c.key || "")}" autocomplete="off" spellcheck="false">
        <button class="btn primary" type="button" data-act="save">${c.key ? "Test" : "Connect"}</button>
      </div>
      <p class="steps">${esc(m.keySteps)} <a href="${m.keyUrl}" target="_blank" rel="noopener">Open sign-in page ↗</a></p>
      <details><summary>Advanced</summary>
        <label for="model-${id}">Model</label>
        <input id="model-${id}" placeholder="${esc(m.defaultModel)}" value="${esc(c.model || "")}" spellcheck="false">
        <div class="row" style="margin-top:8px"><button class="btn danger" type="button" data-act="remove">Disconnect</button></div>
      </details>`;
    card.querySelector('[data-act="save"]').onclick = async (ev) => {
      const key = card.querySelector(`#key-${id}`).value.trim();
      const model = card.querySelector(`#model-${id}`).value.trim();
      if (!key) return toast("Paste your key first.");
      state.conns[id] = { key, model };
      ev.target.disabled = true;
      ev.target.textContent = "Testing…";
      try {
        await testConnection(id, state.conns[id]);
        state.conns[id].ok = true;
        toast(`${m.name} joined the Hive.`);
      } catch (e) {
        state.conns[id].ok = false;
        toast(`${m.name}: ${e.message}`);
      }
      save();
      renderAll();
    };
    card.querySelector('[data-act="remove"]').onclick = () => {
      delete state.conns[id];
      save();
      renderAll();
    };
    root.append(card);
  }

  const seg = $("#chair-seg");
  seg.innerHTML = "";
  const ids = connected();
  for (const id of ["claude", "perplexity", "copilot"]) {
    const b = el("button", null, esc(MEMBERS[id].name));
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(chairId() === id));
    b.disabled = ids.length > 0 && !ids.includes(id);
    b.onclick = () => {
      state.chair = id;
      save();
      renderAll();
    };
    seg.append(b);
  }
}

// ---------- memory view ----------
function renderMemory() {
  const pl = $("#prefs");
  pl.innerHTML = state.prefs.length ? "" : '<li class="empty">Nothing yet.</li>';
  state.prefs.forEach((p, i) => {
    const li = el("li", null, `<span>${esc(p)}</span>`);
    const x = el("button", "x", "×");
    x.type = "button";
    x.setAttribute("aria-label", "Remove");
    x.onclick = () => {
      state.prefs.splice(i, 1);
      save();
      renderMemory();
    };
    li.append(x);
    pl.append(li);
  });
  const hl = $("#history");
  hl.innerHTML = state.history.length ? "" : '<li class="empty">No meetings yet.</li>';
  state.history.forEach((h) => {
    const li = el("li", null, `<span>${esc(h.task)}<small>${new Date(h.at).toLocaleString()}</small></span>`);
    li.style.cursor = "pointer";
    li.onclick = () => {
      show("hive");
      $("#welcome")?.remove();
      ui.phase("From your history", new Date(h.at).toLocaleString());
      addMsg({ agentId: "you", text: h.task });
      addMsg({ agentId: chairId(), text: h.result, kind: "final" });
    };
    hl.append(li);
  });
}

// ---------- navigation ----------
function show(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
}
function renderAll() {
  renderCouncil();
  renderConnect();
  renderMemory();
}

// ---------- wiring ----------
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => show(t.dataset.view)));

const EXAMPLES = [
  "Plan a weekend trip for two under $600",
  "Help me pick a laptop for school and gaming",
  "Write a simple budget tracker I can use",
];
EXAMPLES.forEach((x) => {
  const b = el("button", "chip", esc(x));
  b.type = "button";
  b.onclick = () => {
    $("#task").value = x;
    $("#task").focus();
  };
  $("#examples").append(b);
});

const ta = $("#task");
ta.addEventListener("input", () => {
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
});
ta.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer: coarse)").matches) {
    e.preventDefault();
    $("#composer").requestSubmit();
  }
});
$("#composer").addEventListener("submit", (e) => {
  e.preventDefault();
  if (state.busy) {
    state.council?.stop();
    return;
  }
  const task = ta.value.trim();
  if (!task) return;
  ta.value = "";
  ta.style.height = "auto";
  meet(task);
});

$("#pref-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#pref-input").value.trim();
  if (!v) return;
  state.prefs.push(v);
  $("#pref-input").value = "";
  save();
  renderMemory();
});
$("#clear-history").onclick = () => {
  if (!confirm("Clear all past meetings on this phone?")) return;
  state.history = [];
  save();
  renderMemory();
};

// Setup code: move your connections to your other phone in one paste.
$("#copy-setup").onclick = async () => {
  if (!connected().length) return toast("Connect at least one account first.");
  const code = "HIVE1:" + btoa(unescape(encodeURIComponent(JSON.stringify({ conns: state.conns, chair: state.chair, prefs: state.prefs }))));
  try {
    await navigator.clipboard.writeText(code);
    toast("Setup code copied. Paste it on your other phone.");
  } catch {
    prompt("Copy this setup code:", code);
  }
};
$("#paste-setup").onclick = async () => {
  let code = "";
  try {
    code = await navigator.clipboard.readText();
  } catch {
    /* clipboard read not allowed — ask instead */
  }
  if (!code.startsWith("HIVE1:")) code = prompt("Paste your setup code:") || "";
  if (!code.startsWith("HIVE1:")) return toast("That isn't a Hive setup code.");
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(code.slice(6)))));
    state.conns = { ...state.conns, ...data.conns };
    if (data.chair) state.chair = data.chair;
    state.prefs = [...new Set([...state.prefs, ...(data.prefs || [])])];
    save();
    renderAll();
    toast("This phone is connected.");
  } catch {
    toast("That setup code couldn't be read.");
  }
};

renderAll();

if ("serviceWorker" in navigator && location.protocol !== "capacitor:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
