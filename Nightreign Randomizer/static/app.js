const DATA = window.__DATA__;

// Ensure "None" exists (regular map)
if (!DATA.earth.some(e => e.slug === "none")) {
  DATA.earth = [{ name: "None", slug: "none" }, ...DATA.earth];
}

const els = {
  segButtons: Array.from(document.querySelectorAll(".seg-btn")),
  hint: document.getElementById("hint"),
  btnRoll: document.getElementById("btnRoll"),
  btnCopy: document.getElementById("btnCopy"),

  bossTile: document.getElementById("bossTile"),
  bossIconStrip: document.getElementById("bossIconStrip"),
  bossNameStrip: document.getElementById("bossNameStrip"),
  bossNameReel: document.getElementById("bossNameReel"),

  earthNameStrip: document.getElementById("earthNameStrip"),
  earthNameReel: document.getElementById("earthNameReel"),

  party: document.getElementById("party"),
};

const state = {
  count: 1,
  playerNames: ["Player 1", "Player 2", "Player 3"],
  boss: null,
  earth: null,
  picks: [],
  canCopy: false,
};

const REPEATS = 12;

// ---------- helpers ----------
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

function initials(s) {
  const str = String(s || "").replace(/[^a-z0-9]+/gi, " ").trim();
  if (!str) return "??";
  const parts = str.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "?";
  const b = (parts[1]?.[0] || parts[0]?.[1] || "?");
  return (a + b).toUpperCase();
}

function setSelected(el, on){ el.classList.toggle("selected", !!on); }
function setSpinning(el, on){ el.classList.toggle("spinning", !!on); }

function setRolling(isRolling) {
  // lock/unlock mode buttons
  for (const b of els.segButtons) b.disabled = isRolling;

  // roll button
  els.btnRoll.disabled = isRolling;

  // copy button (only enabled when not rolling AND canCopy)
  els.btnCopy.disabled = isRolling || !state.canCopy;
}

// ---------- strip builders ----------
function buildIconStrip(stripEl, pool) {
  stripEl.innerHTML = "";
  for (let r = 0; r < REPEATS; r++) {
    for (const item of pool) {
      const cell = document.createElement("div");
      cell.className = "tile-item";
      if (item.imgUrl) {
        const img = document.createElement("img");
        img.src = item.imgUrl;
        img.alt = item.name;
        cell.appendChild(img);
      } else {
        const fb = document.createElement("div");
        fb.className = "fallback";
        fb.textContent = initials(item.name || item.slug);
        cell.appendChild(fb);
      }
      stripEl.appendChild(cell);
    }
  }
}

function buildNameStrip(stripEl, pool) {
  stripEl.innerHTML = "";
  for (let r = 0; r < REPEATS; r++) {
    for (const item of pool) {
      const cell = document.createElement("div");
      cell.className = "name-item";
      cell.textContent = item.name;
      stripEl.appendChild(cell);
    }
  }
}

// Keep translateY within [-stripHeight, 0] for DISPLAY only
function wrapY(y, stripHeight) {
  if (stripHeight <= 0) return y;
  let w = y % stripHeight;
  if (w > 0) w -= stripHeight;
  return w;
}

/**
 * Stable reel spin:
 * - animate UNWRAPPED y (_yu)
 * - render WRAPPED y (wrapY)
 * - no teleport on spin #2+
 */
function spinStrip({ stripEl, itemHeight, pool, targetSlug, durationMs }) {
  return new Promise((resolve) => {
    const poolLen = pool.length;
    const targetIndex = Math.max(0, pool.findIndex(x => x.slug === targetSlug));

    const period = poolLen * itemHeight;
    const stripHeight = period * REPEATS;
    const baseTarget = -targetIndex * itemHeight;

    const startUnwrapped = (typeof stripEl._yu === "number") ? stripEl._yu : (stripEl._y || 0);

    const laps = 4 + Math.floor(Math.random() * 2); // 4–5 laps
    const travelRef = startUnwrapped - laps * period;

    const k = Math.round((baseTarget - travelRef) / period);
    const endUnwrapped = baseTarget - k * period;

    const t0 = performance.now();
    function frame(now){
      const t = Math.min(1, (now - t0) / durationMs);
      const e = easeOutCubic(t);

      const yu = startUnwrapped + (endUnwrapped - startUnwrapped) * e;
      const y = wrapY(yu, stripHeight);

      stripEl.style.transform = `translateY(${y}px)`;
      stripEl._y = y;
      stripEl._yu = yu;

      if (t < 1) requestAnimationFrame(frame);
      else {
        stripEl._yu = endUnwrapped;
        const finalY = wrapY(endUnwrapped, stripHeight);
        stripEl._y = finalY;
        stripEl.style.transform = `translateY(${finalY}px)`;
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// ---------- landing without animation (init / mode switch) ----------
function landToSlug(stripEl, itemHeight, pool, slug) {
  const idx = Math.max(0, pool.findIndex(x => x.slug === slug));
  const yu = -idx * itemHeight;
  stripEl._yu = yu;

  const stripHeight = pool.length * itemHeight * REPEATS;
  stripEl._y = wrapY(yu, stripHeight);
  stripEl.style.transform = `translateY(${stripEl._y}px)`;
}

// ---------- Great Hollow rule ----------
function isGreatHollowEarth(earthObj) {
  if (!earthObj) return false;
  const n = String(earthObj.name || "").toLowerCase();
  const s = String(earthObj.slug || "").toLowerCase();
  return n.includes("great hollow") || s.includes("great-hollow") || s.includes("the-great-hollow");
}

function earthAllowedForBoss(bossObj, earthObj) {
  if (!earthObj || !bossObj) return true;
  if (!isGreatHollowEarth(earthObj)) return true;

  const b = String(bossObj.slug || bossObj.name || "").toLowerCase();
  return (b.includes("dreglord") || b.includes("balancers"));
}

function coerceEarth(bossObj, earthObj) {
  if (earthAllowedForBoss(bossObj, earthObj)) return earthObj;
  return DATA.earth.find(e => e.slug === "none") || DATA.earth[0];
}

// ---------- party UI ----------
function renderParty(count) {
  els.party.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "party-row";

    const nameBox = document.createElement("div");
    nameBox.className = "pname";
    const input = document.createElement("input");
    input.placeholder = `Player ${i + 1} name`;
    input.value = state.playerNames[i] || `Player ${i + 1}`;
    input.addEventListener("input", () => state.playerNames[i] = input.value);
    nameBox.appendChild(input);

    const tile = document.createElement("div");
    tile.className = "tile slot-tile";
    const tileWin = document.createElement("div");
    tileWin.className = "tile-window";
    const iconStrip = document.createElement("div");
    iconStrip.className = "tile-strip";
    tileWin.appendChild(iconStrip);
    tile.appendChild(tileWin);

    const reel = document.createElement("div");
    reel.className = "reel";
    const win = document.createElement("div");
    win.className = "reel-window";
    const nameStrip = document.createElement("div");
    nameStrip.className = "reel-strip";
    win.appendChild(nameStrip);
    reel.appendChild(win);

    row._tile = tile;
    row._iconStrip = iconStrip;
    row._reel = reel;
    row._nameStrip = nameStrip;

    buildIconStrip(iconStrip, DATA.nightfarers);
    buildNameStrip(nameStrip, DATA.nightfarers);

    row.appendChild(nameBox);
    row.appendChild(tile);
    row.appendChild(reel);

    els.party.appendChild(row);
  }
}

function setMode(count) {
  // Reset copy permission and lock copy
  state.canCopy = false;
  els.btnCopy.disabled = true;

  // Reset selection state
  state.count = count;
  state.picks = [];
  state.boss = null;
  state.earth = null;

  els.segButtons.forEach(b => b.classList.toggle("is-active", Number(b.dataset.count) === count));
  els.hint.textContent = `Mode: ${count === 1 ? "Solo" : count === 2 ? "Duo" : "Trio"}`;

  renderParty(count);

  // clear glow/spin classes
  resetAllGlowAndSpinClasses();

  // land defaults (no glow until first roll)
  landDefaultsForMode();
}

function resetAllGlowAndSpinClasses() {
  const rows = Array.from(els.party.children);
  const targets = [
    els.bossTile, els.bossNameReel, els.earthNameReel,
    ...rows.flatMap(r => [r._tile, r._reel])
  ];
  for (const el of targets) {
    el.classList.remove("selected", "spinning");
    if (el.classList.contains("tile")) el.classList.remove("spinning-tile");
  }
}

function landDefaultsForMode() {
  const tileH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--tile"), 10) || 64;
  const nameH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--reelItemH"), 10) || 52;

  const bossDefault = DATA.bosses[0] || null;
  const earthDefault = DATA.earth.find(e => e.slug === "none") || DATA.earth[0] || null;

  if (bossDefault) {
    landToSlug(els.bossIconStrip, tileH, DATA.bosses, bossDefault.slug);
    landToSlug(els.bossNameStrip, nameH, DATA.bosses, bossDefault.slug);
    state.boss = bossDefault;
  }
  if (earthDefault) {
    landToSlug(els.earthNameStrip, nameH, DATA.earth, earthDefault.slug);
    state.earth = earthDefault;
  }

  // Player defaults: show Wylder immediately
  const rows = Array.from(els.party.children);
  for (let i = 0; i < rows.length; i++) {
    landToSlug(rows[i]._iconStrip, tileH, DATA.nightfarers, "wylder");
    landToSlug(rows[i]._nameStrip, nameH, DATA.nightfarers, "wylder");
  }
}

// ---------- server ----------
async function fetchRoll(count) {
  const res = await fetch("/api/roll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error("roll failed");
  return data;
}

// ---------- spins (each section locks glow immediately after landing) ----------
async function spinBoss(result) {
  const tileH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--tile"), 10) || 64;
  const nameH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--reelItemH"), 10) || 52;

  // Only expedition section loses glow when it starts rerolling
  setSelected(els.bossTile, false);
  setSelected(els.bossNameReel, false);

  setSpinning(els.bossTile, true);
  setSpinning(els.bossNameReel, true);
  els.bossTile.classList.add("spinning-tile");

  await Promise.all([
    spinStrip({ stripEl: els.bossIconStrip, itemHeight: tileH, pool: DATA.bosses, targetSlug: result.boss.slug, durationMs: 1200 }),
    spinStrip({ stripEl: els.bossNameStrip, itemHeight: nameH, pool: DATA.bosses, targetSlug: result.boss.slug, durationMs: 1120 }),
  ]);

  els.bossTile.classList.remove("spinning-tile");
  setSpinning(els.bossTile, false);
  setSpinning(els.bossNameReel, false);

  // lock glow
  setSelected(els.bossTile, true);
  setSelected(els.bossNameReel, true);
}

async function spinEarth(result) {
  const nameH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--reelItemH"), 10) || 52;

  setSelected(els.earthNameReel, false);

  setSpinning(els.earthNameReel, true);
  await spinStrip({ stripEl: els.earthNameStrip, itemHeight: nameH, pool: DATA.earth, targetSlug: result.earth.slug, durationMs: 1050 });
  setSpinning(els.earthNameReel, false);

  setSelected(els.earthNameReel, true);
}

async function spinPlayers(result) {
  const tileH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--tile"), 10) || 64;
  const nameH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--reelItemH"), 10) || 52;

  const rows = Array.from(els.party.children);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pick = result.picks[i];

    setSelected(row._tile, false);
    setSelected(row._reel, false);

    setSpinning(row._tile, true);
    setSpinning(row._reel, true);
    row._tile.classList.add("spinning-tile");

    await Promise.all([
      spinStrip({ stripEl: row._iconStrip, itemHeight: tileH, pool: DATA.nightfarers, targetSlug: pick.slug, durationMs: 1100 }),
      spinStrip({ stripEl: row._nameStrip, itemHeight: nameH, pool: DATA.nightfarers, targetSlug: pick.slug, durationMs: 1040 }),
    ]);

    row._tile.classList.remove("spinning-tile");
    setSpinning(row._tile, false);
    setSpinning(row._reel, false);

    setSelected(row._tile, true);
    setSelected(row._reel, true);

    await sleep(120);
  }
}

// ---------- actions ----------
async function roll() {
  // lock UI during roll
  state.canCopy = false;
  setRolling(true);

  try {
    const result = await fetchRoll(state.count);

    // Great Hollow rule
    result.earth = coerceEarth(result.boss, result.earth);

    await spinBoss(result);
    await sleep(140);
    await spinEarth(result);
    await sleep(160);
    await spinPlayers(result);

    state.boss = result.boss;
    state.earth = result.earth;
    state.picks = result.picks;

    // enable copy now that everything is done
    state.canCopy = true;
  } finally {
    setRolling(false);
  }
}

function copyResults() {
  if (!state.canCopy) return;

  const lines = [
    "Nightreign Randomizer Results",
    `Mode: ${state.count === 1 ? "Solo" : state.count === 2 ? "Duo" : "Trio"}`,
    `Expedition: ${state.boss?.name || "—"}`,
    `Shifting Earth: ${state.earth?.name || "—"}`,
    ""
  ];

  for (let i = 0; i < state.count; i++) {
    const pname = (state.playerNames[i] || `Player ${i + 1}`).trim() || `Player ${i + 1}`;
    const pick = state.picks[i]?.name || "—";
    lines.push(`- ${pname}: ${pick}`);
  }

  navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
}

// ---------- init ----------
function init() {
  buildIconStrip(els.bossIconStrip, DATA.bosses);
  buildNameStrip(els.bossNameStrip, DATA.bosses);
  buildNameStrip(els.earthNameStrip, DATA.earth);

  setMode(1);

  // start in non-rolling state
  setRolling(false);

  els.segButtons.forEach(btn => btn.addEventListener("click", () => setMode(Number(btn.dataset.count))));
  els.btnRoll.addEventListener("click", roll);
  els.btnCopy.addEventListener("click", copyResults);
}

init();
