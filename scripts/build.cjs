const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'src', name), 'utf8');
let html = read('template.html');
if (!html.includes('<!-- INLINE_STYLE -->') || !html.includes('<!-- INLINE_SCRIPTS -->')) {
  throw new Error('Source template is missing build markers.');
}
html = html.replace('<!-- INLINE_STYLE -->', () => '<style>' + read('style.css') + '</style>');
const scripts = ['compat.js', 'engine.js', 'levels.js', 'game.js'].map(name => {
  const code = read(name).replace(/<\/script/gi, '<\\/script');
  return '<script>' + code + '</script>';
}).join('\n');
html = html.replace('<!-- INLINE_SCRIPTS -->', () => scripts);
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('Built index.html: all 20 levels and assets are inline.');
