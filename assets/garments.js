/*
 * Flat-lay garment illustrations, drawn in each product's colourway.
 * Each piece is authored in a 200x200 box; looks place pieces on a 200x300 stage.
 * When a product has an `image`, the app shows the photo instead.
 */
(function () {
  const PIECES = {
    bra: 'M58 70 C72 44 88 40 100 58 C112 40 128 44 142 70 L150 118 C128 130 72 130 50 118 Z M66 62 L78 14 L86 14 L80 56 Z M134 62 L122 14 L114 14 L120 56 Z',
    crop: 'M52 30 L82 16 Q100 32 118 16 L148 30 L180 62 L160 80 L148 70 L148 132 L52 132 L52 70 L40 80 L20 62 Z',
    tee: 'M52 22 L82 8 Q100 24 118 8 L148 22 L182 58 L160 78 L148 66 L148 192 L52 192 L52 66 L40 78 L18 58 Z',
    tank: 'M70 12 L84 12 Q100 46 116 12 L130 12 Q136 50 150 62 L154 188 L46 188 L50 62 Q64 50 70 12 Z',
    leggings: 'M60 6 H140 L142 26 H58 Z M58 26 H142 L148 92 L138 196 L112 196 L102 100 H98 L88 196 L62 196 L52 92 Z',
    shorts: 'M50 26 H150 L152 44 H48 Z M48 44 H152 L162 128 L108 136 L100 96 L92 136 L38 128 Z',
    playsuit: 'M70 6 L84 6 Q100 40 116 6 L130 6 Q136 44 148 56 L152 124 L162 192 L108 198 L100 160 L92 198 L38 192 L48 124 L52 56 Q64 44 70 6 Z',
    jacket: 'M60 18 L86 8 Q100 22 114 8 L140 18 L188 150 L166 158 L146 92 L146 194 L54 194 L54 92 L34 158 L12 150 Z',
    hcrop: 'M78 14 H122 L124 30 L150 40 L152 122 L48 122 L50 40 L76 30 Z',
    flare: 'M60 6 H140 L142 26 H58 Z M58 26 H142 L146 92 L150 156 L162 196 L110 196 L104 128 L102 100 H98 L96 128 L90 196 L38 196 L50 156 L54 92 Z',
    jumpsuit: 'M70 6 L84 6 Q100 36 116 6 L130 6 Q136 40 148 50 L150 96 L148 120 L144 196 L114 196 L104 126 H96 L86 196 L56 196 L52 120 L50 96 L52 50 Q64 40 70 6 Z'
  };
  const DETAILS = {
    bra: 'M56 112 C80 120 120 120 144 112',
    crop: 'M52 124 H148',
    tee: 'M52 184 H148',
    tank: 'M48 178 H152',
    leggings: 'M58 26 H142 M100 26 V98',
    shorts: 'M48 44 H152 M100 44 V94',
    playsuit: 'M50 118 H150',
    jacket: 'M100 20 V194 M54 186 H146',
    hcrop: 'M76 30 H124 M50 114 H150',
    flare: 'M58 26 H142 M100 26 V98',
    jumpsuit: 'M50 96 H150'
  };

  // [piece, centreX, top, scale]
  const LOOKS = {
    leggings: [['leggings', 100, 30, 1.25]],
    tee: [['tee', 100, 50, 1.0]],
    tank: [['tank', 100, 46, 1.0]],
    shorts: [['shorts', 100, 70, 1.05]],
    playsuit: [['playsuit', 100, 40, 1.15]],
    jacket: [['jacket', 100, 50, 1.0]],
    set: [['bra', 100, 6, 0.78], ['leggings', 100, 104, 0.98]],
    three: [['bra', 54, 14, 0.5], ['crop', 146, 10, 0.52], ['leggings', 100, 96, 1.0]],
    bra: [['bra', 100, 70, 1.0]],
    jumpsuit: [['jumpsuit', 100, 30, 1.25]],
    blaze: [['hcrop', 100, 4, 0.72], ['flare', 100, 96, 1.0]],
    runner: [['bra', 54, 14, 0.5], ['jacket', 146, 10, 0.52], ['leggings', 100, 104, 0.96]],
    four: [['bra', 54, 26, 0.5], ['crop', 146, 22, 0.52], ['shorts', 52, 160, 0.5], ['leggings', 146, 108, 0.82]]
  };

  const SOLO = {
    bra: ['bra', 100, 70, 1.0], crop: ['crop', 100, 60, 1.0],
    shorts: ['shorts', 100, 70, 1.05], leggings: ['leggings', 100, 30, 1.25]
  };

  let uid = 0;

  function lum(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function piece(name, cx, top, s, color, id) {
    const dark = lum(color) < 0.25;
    const tx = cx - 100 * s;
    return '<g transform="translate(' + tx.toFixed(1) + ' ' + top + ') scale(' + s + ')">' +
      '<path d="' + PIECES[name] + '" fill="' + color + '" fill-rule="evenodd" stroke="' + (dark ? 'rgba(215,220,228,.28)' : 'rgba(0,0,0,.18)') + '" stroke-width="' + (1.2 / s).toFixed(2) + '"/>' +
      '<path d="' + PIECES[name] + '" fill="url(#k' + id + ')" fill-rule="evenodd"/>' +
      '<path d="' + PIECES[name] + '" fill="url(#s' + id + ')" fill-rule="evenodd"/>' +
      '<path d="' + DETAILS[name] + '" fill="none" stroke="' + (dark ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.22)') + '" stroke-width="' + (1 / s).toFixed(2) + '" stroke-dasharray="' + (3 / s).toFixed(1) + ' ' + (2 / s).toFixed(1) + '"/>' +
      '</g>';
  }

  // pieces: optional list of piece names to show (used by the look builder)
  function render(look, color, opts) {
    opts = opts || {};
    const id = ++uid;
    let parts = (LOOKS[look] || LOOKS.set).filter(function (p) { return !opts.only || opts.only.indexOf(p[0]) > -1; });
    // A single piece pulled out of a set is shown centred, like its own product
    if (opts.only && opts.only.length === 1) parts = [SOLO[opts.only[0]] || parts[0]];
    const body = (opts.layout || parts).map(function (p) { return piece(p[0], p[1], p[2], p[3], color, id); }).join('');
    return '<svg class="garment" viewBox="0 0 200 300" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="s' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset=".42" stop-color="#fff" stop-opacity=".22"/>' +
      '<stop offset=".5" stop-color="#fff" stop-opacity=".04"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity=".22"/>' +
      '</linearGradient>' +
      '<pattern id="k' + id + '" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 2h4" stroke="#fff" stroke-opacity=".06"/></pattern>' +
      '</defs>' + body + '</svg>';
  }

  window.Garments = { render: render, LOOKS: LOOKS, lum: lum };
})();
