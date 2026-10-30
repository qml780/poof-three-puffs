const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../src/engine.js');
const L = require('../src/levels.js');
test('All 20 authored routes clear within their three-puff budget', () => {
  assert.equal(L.length, 20);
  for (const level of L) {
    let state = E.initial(level);
    for (const cell of level.solution) {
      const r = E.act(state, cell, level);
      assert(r.ok, 'Legal source in level ' + level.id);
      assert.equal(r.state.items.length + r.state.cleared, level.items.length);
      assert.equal(new Set(r.state.items.map(i => i.pos)).size, r.state.items.length);
      state = r.state;
    }
    assert.equal(state.items.length, 0, 'Level ' + level.id);
    assert(state.moves <= 3);
  }
});
test('Shortest route lengths match the intended difficulty', () => {
  const expected = [1, 1, 2, 2, 2, 2, ...Array(14).fill(3)];
  L.forEach((level, i) => assert.equal(E.solve(level).length, expected[i], 'Level ' + level.id));
});
test('Third-puff victory wins; exhausted budgets reject further moves', () => {
  const level = L[0];
  let state = E.initial(level);
  state = E.act(state, 0, level).state;
  state = E.act(state, 0, level).state;
  const win = E.act(state, level.solution[0], level);
  assert.equal(win.won, true); assert.equal(win.lost, false); assert.equal(win.state.moves, 3);
  const lose = E.act(state, 0, level);
  assert.equal(lose.lost, true);
  assert.equal(E.act(lose.state, level.solution[0], level).ok, false);
});
test('Final level clears twelve pieces in the last turn', () => {
  const level = L[19]; let state = E.initial(level), result;
  for (const cell of level.solution) { result = E.act(state, cell, level); state = result.state; }
  assert.equal(result.popped, 12); assert.equal(state.combo, 6); assert.equal(state.cleared, 18);
});
test('Single HTML embeds the exact source scripts and all 20 layouts', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(scripts.length, 4);
  ['compat.js', 'engine.js', 'levels.js', 'game.js'].forEach((file, i) => {
    assert.equal(scripts[i], fs.readFileSync(path.join(root, 'src', file), 'utf8').replace(/<\/script/gi, '<\\/script'));
    new vm.Script(scripts[i]);
  });
  assert(!/<script[^>]+src=|localhost|127\.0\.0\.1/.test(html));
  assert(html.includes('id="mobile-open-note"'));
  assert.equal((html.match(/data-cell="\d+"/g) || []).length, 36);
});
