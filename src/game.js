var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
(() => {
  "use strict";
  const E = window.ClearEngine, L = window.ClearLevels, $ = (id) => document.getElementById(id), colors = ["#edb2bf", "#a2d6c2", "#baa9e1"], symbols = ["▲", "●", "✦"], names = ["粉色", "绿色", "紫色"];
  const chapterNames = ["01 · 碰碰消", "02 · 借位组合", "03 · 三声进阶", "04 · 连锁棋局", "05 · 极限配对"], chapterTabs = ["碰撞", "借位", "进阶", "棋局", "极限"], scoreKey = "poof-clear-expert-v1-best";
  const layoutKey = (l) => l.scoreKey || l.id, scoreFor = (l) => best[layoutKey(l)];
  function mergeScores(target, source) {
    if (!source || typeof source !== "object") return;
    for (const l of L) {
      const k = layoutKey(l), b = source[k], a = target[k];
      if (b && Number.isInteger(b.moves) && b.moves > 0 && b.moves <= 3 && (!a || b.moves < a.moves || b.moves === a.moves && (b.combo || 0) > (a.combo || 0))) target[k] = __spreadValues({}, b);
    }
  }
  let best = {}, sound = true, audio;
  try {
    mergeScores(best, JSON.parse(localStorage.getItem("poof-clear-v1-best") || "{}"));
    mergeScores(best, JSON.parse(localStorage.getItem("poof-clear-strategy-v1-best") || "{}"));
    mergeScores(best, JSON.parse(localStorage.getItem(scoreKey) || "{}"));
    sound = localStorage.getItem("poof-clear-v1-sound") !== "off";
  } catch (e) {
  }
  if (!best || typeof best !== "object" || Array.isArray(best)) best = {};
  const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches), delay = (ms) => new Promise((r) => setTimeout(r, reduced ? 1 : ms));
  let index = 0, page = 0, state, visual = [], history = [], selected = null, hintCell = null, busy = false, won = false, lost = false, revision = 0, hinting = false, lastResult = null;
  const level = () => L[index], where = (p) => `${Math.floor(p / 6) + 1}行${p % 6 + 1}列`;
  function status(text, error = false) {
    $("status").textContent = text;
    $("status").classList.toggle("error", error);
  }
  function soundPaint() {
    $("sound").classList.toggle("off", !sound);
    $("sound").setAttribute("aria-pressed", String(sound));
    $("sound").setAttribute("aria-label", sound ? "关闭音效" : "开启音效");
  }
  function tone(kind, count = 1) {
    if (!sound) return;
    try {
      audio != null ? audio : audio = new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const t = audio.currentTime, frequencies = kind === "win" ? [523, 659, 784, 1047] : kind === "pop" ? [440 + count * 45, 660 + count * 45] : kind === "echo" ? [290] : [200];
      frequencies.forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, t + i * 0.045);
        if (kind === "puff") o.frequency.exponentialRampToValueAtTime(350, t + 0.13);
        g.gain.setValueAtTime(0, t + i * 0.045);
        g.gain.linearRampToValueAtTime(0.035, t + i * 0.045 + 0.015);
        g.gain.exponentialRampToValueAtTime(1e-3, t + i * 0.045 + 0.18);
        o.connect(g);
        g.connect(audio.destination);
        o.start(t + i * 0.045);
        o.stop(t + i * 0.045 + 0.2);
      });
    } catch (e) {
    }
  }
  function nav() {
    $("chapters").innerHTML = chapterNames.map((c, i) => `<button data-page="${i}" class="${i === page ? "active" : ""}" aria-label="${c}" aria-pressed="${i === page}">${chapterTabs[i]}</button>`).join("");
    $("levels").innerHTML = L.slice(page * 4, page * 4 + 4).map((l) => `<button data-level="${l.id - 1}" class="${l.id - 1 === index ? "active " : ""}${scoreFor(l) ? "done" : ""}" aria-label="第${l.id}盘：${l.title}" ${l.id - 1 === index ? 'aria-current="step"' : ""}>${String(l.id).padStart(2, "0")}${scoreFor(l) ? `<small>${scoreFor(l).moves} 声清盘</small>` : l.expert ? "<small>新棋局</small>" : l.strategy ? "<small>进阶</small>" : ""}</button>`).join("");
    $("completion").textContent = `${L.filter((l) => scoreFor(l)).length} / ${L.length}`;
    $("journey-title").textContent = `${L.length} 盘小挑战`;
  }
  function pieces(items = visual, rebuild = false) {
    if (rebuild) $("pieces").innerHTML = "";
    const ids = new Set(items.map((i) => String(i.id)));
    for (const el of [...$("pieces").children]) if (!ids.has(el.dataset.id)) el.remove();
    for (const item of items) {
      let el = $("pieces").querySelector(`[data-id="${item.id}"]`);
      if (!el) {
        el = document.createElement("div");
        el.dataset.id = item.id;
        el.className = "piece";
        el.innerHTML = `<div class="blob"><span class="symbol">${symbols[item.color]}</span><i class="eye l"></i><i class="eye r"></i><i class="mouth"></i><i class="cheek l"></i><i class="cheek r"></i></div>`;
        $("pieces").append(el);
      }
      el.style.setProperty("--color", colors[item.color]);
      el.style.setProperty("--x", item.pos % 6);
      el.style.setProperty("--y", Math.floor(item.pos / 6));
      el.classList.remove("pop", "will-pop", "echo-pop");
    }
  }
  function boardPaint() {
    const l = level();
    for (const el of $("board").children) {
      const p = +el.dataset.cell, item = visual.find((i) => i.pos === p), wall = l.walls.includes(p);
      el.className = "cell" + (item ? " occupied" : "") + (wall ? " wall" : "") + (selected === p && !busy && !won && !lost ? " selected" : "") + (state.echo === p ? " echo" : "") + (hintCell === p ? " hinted" : "");
      el.setAttribute("aria-label", `第${Math.floor(p / 6) + 1}行第${p % 6 + 1}列，${wall ? "墙" : item ? names[item.color] + symbols[item.color] + "角色" : "空格"}`);
      el.setAttribute("aria-disabled", String(busy || won || lost || !!item || wall));
      el.innerHTML = index === 0 && state.moves === 0 && selected === null && !busy && p === 13 ? '<span class="starter">✦</span>' : "";
    }
  }
  function stats() {
    const used = state.moves + (busy ? 1 : 0), remaining = Math.max(0, level().limit - used), total = level().items.length, cleared = total - visual.length;
    $("remaining").textContent = remaining;
    $("charges").innerHTML = Array.from({ length: level().limit }, (_, i) => `<i class="charge ${i < used ? "spent" : ""}" aria-hidden="true">${i < used ? "·" : "✦"}</i>`).join("");
    $("charges").setAttribute("aria-label", `还剩${remaining}声气浪`);
    $("clear-count").textContent = `${cleared} / ${total}`;
    $("clear-progress").style.width = `${100 * cleared / total}%`;
    $("combo-count").textContent = state.combo >= 2 ? `本盘最高 · ${state.combo} 组连消` : "同色一碰 · 成对消除";
    $("echo-label").innerHTML = state.echo === null ? "<b>②</b> 先留下回声" : `<b>②</b> ${busy ? "旧位置" : "下次回声"} · ${where(state.echo)}`;
    $("undo").disabled = !history.length;
    $("hint").disabled = busy || won || lost || hinting;
  }
  function phaseText(p) {
    if (!p) return "";
    const moving = p.events.filter((h) => h.kind === "move"), parts = [];
    if (p.pairs) parts.push(`消掉 ${p.popped} 只`);
    const movements = [...new Set(moving.map((h) => names[h.color] + ["向上", "向右", "向下", "向左"][h.dir] + "一格"))];
    if (movements.length) parts.push(movements.join("、"));
    if (!parts.length) return p.events.some((h) => h.kind === "blocked") ? "异色挡住，保持原位" : p.events.some((h) => h.kind === "wall") ? "边界挡住，保持原位" : "这阵风暂时不推动角色";
    return parts.join("，");
  }
  function summary(r, past = false) {
    if (past) return `刚才这一声：清掉 ${r.popped} 只${r.pairs >= 2 ? ` · ${r.pairs} 组连消！` : ""}
${r.popped ? "空出来的位置能继续用。" : "这次留下的印记，下一声会回响。"}`;
    return `① ${phaseText(r.first)}${r.second ? "\n② " + phaseText(r.second) : "\n② 本次位置会留给下一声回响"}${r.won ? " · 这一声可以清空！" : ""}`;
  }
  function preview() {
    $("preview").innerHTML = "";
    for (const el of $("pieces").children) el.classList.remove("will-pop", "echo-pop");
    if (busy || won || lost) return;
    if (selected === null) {
      $("prediction").textContent = lastResult ? summary(lastResult, true) : "直接点空格就吹气。三声内清空，就成功；同色碰撞后，风会穿过去接着吹。";
      return;
    }
    const r = E.act(state, selected, level());
    if (!r.ok) return;
    $("prediction").textContent = summary(r);
    const width = $("board").clientWidth || 500, gap = parseFloat(getComputedStyle($("board")).gap || 6) * 600 / width, stride = (600 + gap) / 6, size = (600 - 5 * gap) / 6;
    const center = (p) => [p % 6 * stride + size / 2, Math.floor(p / 6) * stride + size / 2];
    let svg = '<defs><marker id="new-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#edcf8d"/></marker><marker id="old-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c8a9ed"/></marker></defs>';
    function draw(p, n) {
      var _a;
      if (!p) return;
      const color = n === 1 ? "#edcf8d" : "#c8a9ed", marker = n === 1 ? "new-arrow" : "old-arrow";
      for (const h of p.events) {
        const [a, b] = center(h.from), [c, d] = center(h.to);
        if (h.kind === "move" || h.kind === "pop") svg += `<path d="M${a + h.dx * 12} ${b + h.dy * 12}L${c - h.dx * 12} ${d - h.dy * 12}" stroke="${color}" stroke-width="3" fill="none" ${n === 2 ? 'stroke-dasharray="4 5"' : ""} marker-end="url(#${marker})"/>`;
        if (h.kind === "pop") {
          for (const id of [h.id, h.target]) (_a = $("pieces").querySelector(`[data-id="${id}"]`)) == null ? void 0 : _a.classList.add(n === 1 ? "will-pop" : "echo-pop");
          svg += `<circle cx="${c}" cy="${d}" r="${size * 0.38}" fill="${color}" fill-opacity=".1" stroke="${color}" stroke-width="2" stroke-dasharray="4 4"/><text x="${c + size * 0.25}" y="${d - size * 0.25}" font-size="14" fill="${color}" font-weight="700">${n} ✦</text>`;
        }
      }
    }
    draw(r.first, 1);
    draw(r.second, 2);
    $("preview").innerHTML = svg;
  }
  function select(p, hint2 = false) {
    if (busy || won || lost || !E.act(state, p, level()).ok) return false;
    if (selected === p && !hint2) return true;
    selected = p;
    if (!hint2) hintCell = null;
    boardPaint();
    preview();
    return true;
  }
  function wave(center, echo = false) {
    const el = document.createElement("i"), word = document.createElement("b");
    el.className = "ripple";
    word.className = "poof-word";
    word.textContent = echo ? "echo…" : "POOF!";
    for (const x of [el, word]) {
      x.style.setProperty("--x", center % 6);
      x.style.setProperty("--y", Math.floor(center / 6));
      x.style.setProperty("--wave", echo ? "#c3a1e8" : "#f0cf88");
      $("effects").append(x);
      setTimeout(() => x.remove(), 650);
    }
    tone(echo ? "echo" : "puff");
  }
  function sparks(hit) {
    for (let i = 0; i < 6; i++) {
      const el = document.createElement("span"), angle = i * Math.PI / 3;
      el.className = "spark";
      el.textContent = i % 2 ? "·" : "✦";
      el.style.setProperty("--x", hit.to % 6);
      el.style.setProperty("--y", Math.floor(hit.to / 6));
      el.style.setProperty("--dx", `${Math.cos(angle) * 40}px`);
      el.style.setProperty("--dy", `${Math.sin(angle) * 40 - 12}px`);
      el.style.setProperty("--spark", colors[hit.color]);
      $("effects").append(el);
      setTimeout(() => el.remove(), 500);
    }
  }
  function combo(n) {
    var _a;
    if (n < 2) return;
    (_a = $("effects").querySelector(".combo-toast")) == null ? void 0 : _a.remove();
    const el = document.createElement("b");
    el.className = "combo-toast";
    el.textContent = `${n} 组连消！`;
    $("effects").append(el);
    setTimeout(() => el.remove(), 750);
  }
  function authored() {
    let s = E.initial(level());
    for (let i = 0; i < level().solution.length; i++) {
      if (E.signature(s) === E.signature(state) && level().solution.length - i <= level().limit - state.moves) return { cell: level().solution[i], why: level().why[i] };
      s = E.act(s, level().solution[i], level()).state;
    }
    return null;
  }
  function release(p) {
    return __async(this, null, function* () {
      if (busy || won || lost) return;
      const r = E.act(state, p, level());
      if (!r.ok) {
        status("点没有角色和石柱的空格，气浪就会从那里向四面吹。", true);
        $("board-wrap").classList.remove("bump");
        void $("board-wrap").offsetWidth;
        $("board-wrap").classList.add("bump");
        return;
      }
      const plan = authored(), why = (plan == null ? void 0 : plan.cell) === p ? plan.why : "";
      history.push(E.clone(state));
      busy = true;
      hinting = false;
      selected = null;
      hintCell = null;
      const token = ++revision;
      let turnPairs = 0;
      $("preview").innerHTML = "";
      boardPaint();
      stats();
      $("prediction").textContent = "① 本次气浪先出发…";
      status("看看这一声能连消几组。");
      function animate(data, echo) {
        return __async(this, null, function* () {
          var _a;
          wave(data.center, echo);
          if (!data.frames.length) {
            yield delay(100);
            return token === revision;
          }
          for (const frame of data.frames) {
            if (token !== revision) return false;
            visual = frame.afterPush;
            pieces();
            boardPaint();
            yield delay(155);
            if (token !== revision) return false;
            if (frame.popped.length) {
              turnPairs += frame.popped.length / 2;
              tone("pop", turnPairs);
              for (const item of frame.popped) (_a = $("pieces").querySelector(`[data-id="${item.id}"]`)) == null ? void 0 : _a.classList.add("pop");
              for (const hit of frame.hits.filter((h) => h.kind === "pop")) sparks(hit);
              combo(turnPairs);
              yield delay(150);
              if (token !== revision) return false;
            }
            visual = frame.after;
            pieces();
            boardPaint();
            stats();
          }
          return true;
        });
      }
      if (!(yield animate(r.first, false))) return;
      if (r.second && r.first.items.length) {
        $("prediction").textContent = "② 上一次的位置，补一阵回声…";
        if (!(yield animate(r.second, true))) return;
      }
      if (token !== revision) return;
      state = r.state;
      visual = state.items;
      busy = false;
      won = r.won;
      lost = r.lost;
      lastResult = r;
      pieces();
      boardPaint();
      stats();
      preview();
      $("prediction").textContent = summary(r, true);
      status(why || `这一声清掉 ${r.popped} 只，${level().limit - state.moves} 声还可以继续安排。`);
      if (won || lost) finish();
    });
  }
  function finish() {
    $("result").hidden = false;
    $("result").classList.toggle("loss", lost);
    if (won) {
      const key = layoutKey(level()), old = best[key];
      if (!old || state.moves < old.moves || state.moves === old.moves && state.combo > old.combo) best[key] = { moves: state.moves, combo: state.combo };
      try {
        mergeScores(best, JSON.parse(localStorage.getItem(scoreKey) || "{}"));
        localStorage.setItem(scoreKey, JSON.stringify(best));
      } catch (e) {
      }
      nav();
      tone("win");
      $("result-icon").textContent = "✦";
      $("result-kicker").textContent = state.combo >= 3 ? "WHAT A LOVELY CHAIN!" : "CLEAN BOARD. NICE LITTLE PUFFS.";
      $("result-title").textContent = "清光了，漂亮！";
      $("result-detail").textContent = `${state.moves} 声，清掉 ${state.cleared} 只${state.combo >= 2 ? "\n最高 " + state.combo + " 组连消" : "，还有 " + (level().limit - state.moves) + " 声余量"}。`;
      $("result-primary").textContent = index === L.length - 1 ? "全部完成，再消一遍 →" : "下一盘 →";
      $("result-secondary").textContent = "再消一次";
      status(`第 ${index + 1} 盘清空。消除后的空位，也成了下一阵风的路。`);
    } else {
      $("result-icon").textContent = "↺";
      $("result-kicker").textContent = "ONE DIFFERENT PUFF COULD DO IT.";
      $("result-title").textContent = `还差 ${state.items.length} 只`;
      $("result-detail").textContent = "三声用完了，试试换一个交点。\n可以撤销最后一声，继续想。";
      $("result-primary").textContent = "↩ 撤销最后一声";
      $("result-secondary").textContent = "↻ 从头再试";
      status("三声用完，还没有清空。撤销或重来即可继续试。", true);
    }
  }
  function undo() {
    if (!history.length) return;
    revision++;
    state = history.pop();
    visual = state.items;
    busy = false;
    won = false;
    lost = false;
    hinting = false;
    selected = null;
    hintCell = null;
    lastResult = null;
    $("result").hidden = true;
    $("effects").innerHTML = "";
    pieces(visual, true);
    boardPaint();
    stats();
    preview();
    status("回到上一声。角色、剩余次数和回声印记都一起恢复。");
  }
  function load(n) {
    revision++;
    index = Math.max(0, Math.min(L.length - 1, n));
    page = Math.floor(index / 4);
    state = E.initial(level());
    visual = state.items;
    history = [];
    busy = false;
    won = false;
    lost = false;
    hinting = false;
    selected = null;
    hintCell = null;
    lastResult = null;
    $("result").hidden = true;
    $("effects").innerHTML = "";
    $("chapter").textContent = `CHAPTER ${String(page + 1).padStart(2, "0")} · ${chapterNames[page].split(" · ")[1]}`;
    $("title").textContent = level().title;
    $("tag").textContent = level().tag;
    $("tip").textContent = level().tip;
    $("board").innerHTML = Array.from({ length: 36 }, (_, p) => `<button type="button" class="cell" data-cell="${p}" data-testid="cell-${p}"></button>`).join("");
    pieces(visual, true);
    boardPaint();
    stats();
    nav();
    preview();
    status(index === 0 ? "点闪光空格，试着让两只粉色碰一下。" : "每次点击都算一声。先看交点、空位，以及下一阵回声。");
    try {
      const url = new URL(location.href);
      url.searchParams.set("level", index + 1);
      window.history.replaceState(null, "", url);
    } catch (e) {
    }
  }
  function hint() {
    if (busy || won || lost || hinting) return;
    const token = revision, plan = authored();
    const show = (p, why) => {
      if (token !== revision) return;
      hinting = false;
      if (p === void 0) {
        stats();
        status("剩余次数里暂时没有清盘路线。撤销一声，换一个交点再试。", true);
        return;
      }
      hintCell = p;
      select(p, true);
      stats();
      status(`下一步：${where(p)}。${why}`);
      safeScroll();
    };
    if (plan) {
      show(plan.cell, plan.why);
      return;
    }
    hinting = true;
    stats();
    status("看看剩下的几声怎么连起来…");
    const task = E.search(level(), state);
    function step() {
      var _a;
      if (token !== revision) return;
      const r = task.advance(100);
      if (!r.done) {
        setTimeout(step, 0);
        return;
      }
      const p = (_a = r.path) == null ? void 0 : _a[0];
      show(p, p === void 0 ? "" : summary(E.act(state, p, level())));
    }
    setTimeout(step, 0);
  }
  $("board").addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || e.buttons || hintCell !== null) return;
    const c = e.target.closest("[data-cell]");
    if (c) select(+c.dataset.cell);
  });
  $("board").addEventListener("focusin", (e) => {
    const c = e.target.closest("[data-cell]");
    if (c) select(+c.dataset.cell);
  });
  $("board").addEventListener("click", (e) => {
    const c = e.target.closest("[data-cell]");
    if (c) release(+c.dataset.cell);
  });
  $("chapters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (b) {
      page = +b.dataset.page;
      nav();
    }
  });
  $("levels").addEventListener("click", (e) => {
    const b = e.target.closest("[data-level]");
    if (b) {
      load(+b.dataset.level);
      safeScroll();
    }
  });
  $("undo").addEventListener("click", undo);
  $("restart").addEventListener("click", () => load(index));
  $("hint").addEventListener("click", hint);
  $("result-primary").addEventListener("click", () => lost ? undo() : load((index + 1) % L.length));
  $("result-secondary").addEventListener("click", () => load(index));
  $("sound").addEventListener("click", () => {
    sound = !sound;
    try {
      localStorage.setItem("poof-clear-v1-sound", sound ? "on" : "off");
    } catch (e) {
    }
    soundPaint();
    if (sound) tone("pop");
  });
  function openHelp() {
    const d = $("help-dialog");
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
  }
  function closeHelp() {
    const d = $("help-dialog");
    if (typeof d.close === "function") d.close();
    else d.removeAttribute("open");
  }
  $("help").addEventListener("click", openHelp);
  for (const id of ["close-help", "help-play"]) $(id).addEventListener("click", closeHelp);
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || $("help-dialog").open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "z") {
      e.preventDefault();
      undo();
    } else if (k === "r") load(index);
    else if (k === "h") hint();
    else if (e.code === "Space" && selected !== null) {
      e.preventDefault();
      if (!e.repeat) release(selected);
    } else if (e.code === "Escape") {
      selected = null;
      hintCell = null;
      boardPaint();
      preview();
    }
  });
  function safeScroll() {
    const card = document.querySelector(".play-card");
    if (!card || !card.scrollIntoView) return;
    try {
      card.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (e) {
      card.scrollIntoView(true);
    }
  }
  function fitBoard() {
    const b = $("board"), width = b.clientWidth || b.getBoundingClientRect().width;
    if (width > 0 && Math.abs(parseFloat(b.style.height || 0) - width) > 0.5) b.style.height = width + "px";
    if (state) preview();
  }
  fitBoard();
  soundPaint();
  const found = /(?:^|[?&])level=(\d+)/.exec(location.search || ""), q = found ? Number(found[1]) : 1;
  load(Number.isInteger(q) && q >= 1 && q <= L.length ? q - 1 : 0);
  window.addEventListener("resize", fitBoard);
  window.addEventListener("orientationchange", fitBoard);
  if (typeof window.ResizeObserver === "function") {
    try {
      new window.ResizeObserver(fitBoard).observe($("board"));
    } catch (e) {
    }
  }
  fitBoard();
  $("mobile-open-note").hidden = true;
  document.documentElement.classList.add("game-ready");
})();
