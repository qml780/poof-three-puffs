(function() {
  if (!Array.prototype.includes) Object.defineProperty(Array.prototype, "includes", { value: function(value, from) {
    var start = from || 0;
    if (start < 0) start = Math.max(this.length + start, 0);
    for (var i = start; i < this.length; i++) if (this[i] === value || this[i] !== this[i] && value !== value) return true;
    return false;
  } });
  if (!String.prototype.padStart) Object.defineProperty(String.prototype, "padStart", { value: function(size, fill) {
    var text = String(this), pad = fill === void 0 ? " " : String(fill);
    if (!pad) return text;
    while (text.length < size) text = pad + text;
    return text.slice(text.length - Math.max(size, String(this).length));
  } });
  if (window.Element && !Element.prototype.closest) Element.prototype.closest = function(selector) {
    var el = this, matches = Element.prototype.matches || Element.prototype.webkitMatchesSelector || Element.prototype.msMatchesSelector;
    while (el && el.nodeType === 1) {
      if (matches.call(el, selector)) return el;
      el = el.parentElement;
    }
    return null;
  };
})();
