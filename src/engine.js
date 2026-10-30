var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
(function(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ClearEngine = api;
})(typeof globalThis === "undefined" ? this : globalThis, () => {
  "use strict";
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]], xy = (p, l) => [p % l.w, Math.floor(p / l.w)], inside = (x, y, l) => x >= 0 && x < l.w && y >= 0 && y < l.h;
  const copy = (items) => items.map((i) => __spreadValues({}, i));
  const initial = (l) => ({ items: l.items.map(([color, pos], id) => ({ id, color, pos })), echo: null, moves: 0, cleared: 0, combo: 0 });
  const clone = (s) => __spreadProps(__spreadValues({}, s), { items: copy(s.items) });
  function pulse(items, center, l) {
    const [cx, cy] = xy(center, l), walls = new Set(l.walls), cursor = [1, 1, 1, 1], done = [false, false, false, false], frames = [], events = [], rays = [[], [], [], []];
    let current = copy(items);
    for (let round = 0; round < l.w + l.h; round++) {
      const occupancy = new Map(current.map((i) => [i.pos, i])), hits = [];
      let any = false;
      for (let dir = 0; dir < 4; dir++) {
        if (done[dir]) continue;
        const [dx, dy] = dirs[dir];
        let hit = null;
        while (cursor[dir] <= (l.range || 3)) {
          const d = cursor[dir]++, x = cx + dx * d, y = cy + dy * d;
          if (!inside(x, y, l) || walls.has(y * l.w + x)) {
            done[dir] = true;
            break;
          }
          const pos = y * l.w + x;
          rays[dir].push(pos);
          const item = occupancy.get(pos);
          if (!item) continue;
          const tx = x + dx, ty = y + dy, to = ty * l.w + tx, target = inside(tx, ty, l) ? occupancy.get(to) : null;
          const kind = !inside(tx, ty, l) || walls.has(to) ? "wall" : target ? target.color === item.color ? "pop" : "blocked" : "move";
          hit = { kind, id: item.id, color: item.color, from: pos, to: kind === "move" || kind === "pop" ? to : pos, target: target == null ? void 0 : target.id, dir, dx, dy };
          if (kind !== "pop") done[dir] = true;
          break;
        }
        if (!hit) {
          done[dir] = true;
          continue;
        }
        hits.push(hit);
        any = true;
      }
      if (!any) break;
      const poppedIds = new Set(hits.filter((h) => h.kind === "pop").reduce((all, h) => all.concat([h.id, h.target]), []));
      const afterPush = current.map((i) => {
        const h = hits.find((h2) => h2.id === i.id && (h2.kind === "move" || h2.kind === "pop"));
        return h ? __spreadProps(__spreadValues({}, i), { pos: h.to }) : __spreadValues({}, i);
      });
      const after = afterPush.filter((i) => !poppedIds.has(i.id));
      frames.push({ before: copy(current), afterPush, after: copy(after), popped: copy(current.filter((i) => poppedIds.has(i.id))), hits });
      events.push(...hits);
      current = after;
      if (done.every(Boolean)) break;
    }
    return { center, items: current, frames, events, rays, popped: events.filter((h) => h.kind === "pop").length * 2, pairs: events.filter((h) => h.kind === "pop").length };
  }
  function act(s, center, l) {
    if (!Number.isInteger(center) || center < 0 || center >= l.w * l.h || l.walls.includes(center) || s.items.some((i) => i.pos === center) || s.moves >= (l.limit || 3) || !s.items.length) return { ok: false };
    const first = pulse(s.items, center, l), second = l.echo && s.echo !== null ? pulse(first.items, s.echo, l) : null, items = second ? second.items : first.items, pairs = first.pairs + ((second == null ? void 0 : second.pairs) || 0), won = !items.length;
    const state = { items: copy(items), echo: l.echo ? center : null, moves: s.moves + 1, cleared: s.cleared + 2 * pairs, combo: Math.max(s.combo, pairs) };
    return { ok: true, first, second, state, pairs, popped: pairs * 2, won, lost: !won && state.moves >= (l.limit || 3) };
  }
  const signature = (s) => {
    var _a;
    return [0, 1, 2].map((c) => s.items.filter((i) => i.color === c).map((i) => i.pos).sort((a, b) => a - b).join(",")).join("|") + "@" + ((_a = s.echo) != null ? _a : "-");
  };
  function search(l, start = initial(l), max = 9e4) {
    const nodes = [{ s: clone(start), parent: -1, c: null }], seen = /* @__PURE__ */ new Set([signature(start)]);
    let at = 0, finished = false;
    function advance(budget = 150) {
      if (finished) return { done: true, path: null };
      let n = 0;
      while (at < nodes.length && at < max && n++ < budget) {
        const id = at++, node = nodes[id];
        if (!node.s.items.length) {
          const path = [];
          let p = id;
          while (nodes[p].parent !== -1) {
            path.push(nodes[p].c);
            p = nodes[p].parent;
          }
          finished = true;
          return { done: true, path: path.reverse(), visited: at };
        }
        if (node.s.moves >= (l.limit || 3)) continue;
        for (let c = 0; c < l.w * l.h; c++) {
          const r = act(node.s, c, l);
          if (!r.ok) continue;
          const k = signature(r.state);
          if (seen.has(k)) continue;
          seen.add(k);
          nodes.push({ s: r.state, parent: id, c });
        }
      }
      if (at >= nodes.length || at >= max) {
        finished = true;
        return { done: true, path: null, limited: at >= max, visited: at };
      }
      return { done: false, visited: at };
    }
    return { advance };
  }
  function solve(l, s = initial(l), max) {
    const task = search(l, s, max);
    let r;
    do {
      r = task.advance(2e3);
    } while (!r.done);
    return r.path;
  }
  return { dirs, xy, inside, initial, clone, pulse, act, signature, search, solve };
});
