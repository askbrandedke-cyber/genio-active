#!/usr/bin/env python3
"""
Build assets/catalogue.js from the live GENiO WooCommerce Store API.

    python3 scripts/build_catalogue.py                  # fetch live
    python3 scripts/build_catalogue.py api_1.json ...   # use saved API pages

Each Woo product is one colourway. Colourways that share a name
("Brown Aura Jumpsuit", "Peach Aura Jumpsuit") become one product family
with swatches, so the shop shows ~100 styles instead of ~300 tiles.
"""
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

API = 'https://genioactive.com/wp-json/wc/store/v1/products?per_page=100&page={}'
ONE = 'https://genioactive.com/wp-json/wc/store/v1/products/{}'
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'catalogue.js'

# Colour vocabulary, longest names first so "Hot Pink" wins over "Pink".
COLOURS = {
    'Army Green': '#4B5320', 'Baby Blue': '#A9C7E3', 'Black Red': '#5A1A1F', 'Deep Blue': '#1F2F6B',
    'Deep Green': '#1F4A35', 'Deep Plum': '#4A2240', 'Deep Purple': '#3F2160', 'Ebony Black': '#151517',
    'Full Blue': '#2346B8', 'Green White': '#B9D8B4', 'Hot Peach': '#F0866E', 'Green Pink': '#9DBF8E', 'Hot Pink': '#E0337A',
    'Navy Blue': '#1E2A4D', 'Off White': '#EEE8DC', 'Pale Purple': '#B8A3D1', 'Sand Brown': '#A9805B',
    'Sea Green': '#4FA08B', 'Sky Blue': '#8EC3EA', 'Space Gray': '#5A5D63', 'Light Blue': '#B5D3EE',
    'Hotpink': '#E0337A', 'Black': '#17171A', 'Blue': '#2F5DB0', 'Brown': '#7B5B49', 'Burgundy': '#6B1F2E',
    'Beige': '#D8C4A6', 'Cream': '#EDE3CF', 'Gray': '#8C9097', 'Grey': '#8C9097', 'Green': '#5E8C4F',
    'Lavender': '#B7A6DA', 'Light': '#C9CDD3', 'Lemon': '#EEE27A', 'Magenta': '#B8236F', 'Mahogany': '#5E2A22', 'Mint': '#A9DCC3',
    'Mustard': '#C9A23A', 'Navy': '#1E2A4D', 'Nude': '#D5AF95', 'Orange': '#E07A3A', 'Peach': '#F2B09A',
    'Pink': '#EBA3BC', 'Plum': '#6E2F5E', 'Powder': '#C9D6E6', 'Purple': '#6A4790', 'Red': '#B3283A',
    'Slate': '#5E6B78', 'Sky': '#8EC3EA', 'Teal': '#2A7C80', 'Thistle': '#D3B9D9', 'White': '#F4F2EE',
    'Yellow': '#F1D35A',
}
ORDERED = sorted(COLOURS, key=len, reverse=True)

# Homepage "New Release" families (genioactive.com, checked 27 Oct 2026)
NEW_RELEASE = {'Pulse', 'Aura Jumpsuit', 'Oversized Tee', 'Bloom'}


def load(paths):
    if paths:
        pages = [json.load(open(p)) for p in paths]
    else:
        pages, n = [], 1
        while True:
            page = get(API.format(n))
            if not page:
                break
            pages.append(page)
            n += 1
    return [p for page in pages for p in page]


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return json.load(urllib.request.urlopen(req, timeout=60))


def variation_price(vid, unit):
    """Range-priced products (Cherri: bra $22 … 4-piece $75) need each option's own price."""
    try:
        return int(get(ONE.format(vid))['prices']['price']) / unit
    except Exception as e:  # keep building; the option falls back to the range
        print(f'  price for variation {vid} unavailable: {e}', file=sys.stderr)
        return None


SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']


def by_size(sizes):
    return sorted(sizes, key=lambda s: SIZE_ORDER.index(s) if s in SIZE_ORDER else 99)


def intro(p):
    """Opening paragraph only: the bullet list is shown separately as highlights."""
    text = clean(p['short_description'] or p['description'])
    text = re.split(r'\s(?:Highlights|Key Features|Features)\b:?', text)[0].strip()
    return text[:320]


def clean(s):
    text = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s or ''))).strip()
    return re.sub(r'\s+([.,;:!?])', r'\1', text)


def split_colour(name):
    for c in ORDERED:
        if name.lower().startswith(c.lower() + ' '):
            return c, name[len(c) + 1:].strip()
    return '', name


def category(p, family):
    cats = {c['name'].strip().lower() for c in p['categories']}
    tags = {t['name'].strip().lower() for t in p.get('tags', [])}
    n = family.lower()
    if 'gift card' in cats:
        return 'gifts'
    if 'head gears' in cats or re.search(r'cap|visor|headband|hat', n):
        return 'headwear'
    if 'accessories' in cats or re.search(r'bag|hijab|glove|bottle|pack|resist', n):
        return 'accessories'
    if re.search(r'jumpsuit|play ?suit|dress', n) or 'jumpsuit' in tags:
        return 'onepieces'
    if re.search(r'jacket', n):
        return 'jackets'
    if re.search(r'set|pcs|piece', n) or 'matching set' in tags or 'women sets' in tags:
        return 'sets'
    if re.search(r'short|skirt', n):
        return 'shorts'
    if re.search(r'legging|pant|flare', n) or 'leggings' in tags:
        return 'leggings'
    if re.search(r'tee|top|bra|crop|t-shirt|halter|neck|back', n) or 'tops' in tags or 'sports bra' in tags:
        return 'tops'
    return 'sets'


def highlights(desc):
    """Pull 'Label: …' bullets out of the long description."""
    feats = []
    for m in re.finditer(r'<(?:strong|b)\b[^>]*>\s*([^<:]{3,40}?)\s*:\s*</(?:strong|b)>', desc or ''):
        f = clean(m.group(1)).rstrip(':').strip()
        if f and f.lower() not in ('highlights', 'key features', 'features') and f not in feats:
            feats.append(f)
    return feats[:4]


def from_srcset(img, want=800):
    """Smallest real size at least `want` px wide, taken from the API's srcset (never guessed)."""
    sizes = []
    for part in (img.get('srcset') or '').split(','):
        bits = part.strip().split(' ')
        if len(bits) == 2 and bits[1].endswith('w'):
            sizes.append((int(bits[1][:-1]), bits[0]))
    wide = sorted(x for x in sizes if x[0] >= want)
    return wide[0][1] if wide else img['src']


def main():
    items = load(sys.argv[1:])
    families = {}
    for p in items:
        if not p.get('is_purchasable', True):
            continue
        name = clean(p['name'])
        colour, family = split_colour(name)
        family = re.sub(r"\bWomen['’]?s\b\s*", '', family).strip() or name
        key = family.lower()
        pr = p['prices']
        unit = 10 ** pr['currency_minor_unit']
        lo = int((pr.get('price_range') or {}).get('min_amount') or pr['price']) / unit
        hi = int((pr.get('price_range') or {}).get('max_amount') or pr['price']) / unit
        attrs = {a['taxonomy'] or a['name']: [t['name'] for t in a['terms']] for a in p['attributes']}
        imgs = p['images'][:4]
        variant = {
            'wooId': p['id'],
            'slug': p['slug'],
            'url': p['permalink'],
            'color': colour or 'One colour',
            'hex': COLOURS.get(colour, '#8C9097'),
            'from': lo, 'to': hi,
            'sizes': by_size(attrs.get('pa_size', [])),
            'picks': attrs.get('pa_pick', []),
            'variations': [
                {'id': v['id'], 'attrs': {a['name'].lower(): a['value'] for a in v['attributes'] if a['value']},
                 'usd': variation_price(v['id'], unit) if lo != hi else lo}
                for v in p.get('variations', [])
            ],
            'img': (imgs[0].get('thumbnail') or imgs[0]['src']) if imgs else '',
            'thumbs': [i.get('thumbnail') or i['src'] for i in imgs],
            'gallery': [from_srcset(i) for i in imgs],
            'inStock': p['is_in_stock'],
        }
        f = families.setdefault(key, {
            'id': re.sub(r'[^a-z0-9]+', '-', key).strip('-'),
            'name': family,
            'cat': category(p, family),
            'desc': intro(p),
            'feats': highlights(p['description']),
            'isNew': family in NEW_RELEASE,
            'variants': [],
        })
        f['variants'].append(variant)
        # Colourways often carry different copy; keep the richest
        if not f['feats']:
            f['feats'] = highlights(p['description'])
        if len(f['desc']) < 60:
            f['desc'] = intro(p)

    out = []
    for f in families.values():
        v = f['variants']
        f['from'] = min(x['from'] for x in v)
        f['to'] = max(x['to'] for x in v)
        sizes = []
        for x in v:
            sizes += [s for s in x['sizes'] if s not in sizes]
        f['sizes'] = by_size(sizes)
        if f['desc'].endswith(('.', '!')) is False and len(f['desc']) >= 320:
            f['desc'] = f['desc'].rsplit(' ', 1)[0] + '…'
        out.append(f)

    # New releases first, then styles with the most colourways
    out.sort(key=lambda f: (not f['isNew'], -len(f['variants']), f['name']))
    for i, f in enumerate(out):
        f['featured'] = i + 1

    OUT.write_text(
        '/* Generated by scripts/build_catalogue.py from the genioactive.com Store API. Do not edit by hand. */\n'
        'window.GENIO_CATALOGUE = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    )
    print(f'{len(items)} products -> {len(out)} styles -> {OUT}')


if __name__ == '__main__':
    main()
