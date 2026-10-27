#!/usr/bin/env python3
"""
Package the site as a self-contained private preview (claude.ai Artifact).

Preview pages may only load media from their own files, so this mirrors the
photos and films it needs from genioactive.com, resized for the web, and
rewrites the catalogue to point at the local copies.

    python3 scripts/build_preview.py OUT_DIR
"""
import io
import json
import re
import shutil
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
UPLOADS = 'https://genioactive.com/wp-content/uploads/'
WIDTH = 640

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=90).read()


def local(url):
    return 'media/' + url.split('/wp-content/uploads/', 1)[1]


def mirror_image(url, out):
    dest = out / re.sub(r'\.(png|webp|jpeg)$', '.jpg', local(url))
    if not dest.exists():
        im = Image.open(io.BytesIO(fetch(url))).convert('RGB')
        if im.width > WIDTH:
            im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, 'JPEG', quality=74, optimize=True, progressive=True)
    return str(dest.relative_to(out))


def mirror_file(url, out):
    dest = out / local(url)
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(fetch(url))
    return str(dest.relative_to(out))


def main():
    out = Path(sys.argv[1]).resolve()
    (out / 'assets').mkdir(parents=True, exist_ok=True)

    # Catalogue: one photo per colourway, plus a second photo for each style's lead colourway
    src = (ROOT / 'assets' / 'catalogue.js').read_text()
    cat = json.loads(src[src.index('['):src.rindex(']') + 1])
    jobs = {}
    for f in cat:
        for i, v in enumerate(f['variants']):
            pics = v['gallery'][:2] if i == 0 else v['gallery'][:1]
            for u in pics:
                jobs[u] = None
    with ThreadPoolExecutor(12) as pool:
        for u, path in zip(jobs, pool.map(lambda u: mirror_image(u, out), jobs)):
            jobs[u] = path
    for f in cat:
        for i, v in enumerate(f['variants']):
            pics = [jobs[u] for u in (v['gallery'][:2] if i == 0 else v['gallery'][:1])]
            v['img'] = pics[0] if pics else ''
            v['gallery'] = v['thumbs'] = pics
    (out / 'assets' / 'catalogue.js').write_text(
        '/* Preview copy: images point at mirrored, resized files. */\nwindow.GENIO_CATALOGUE = '
        + json.dumps(cat, ensure_ascii=False, separators=(',', ':')) + ';\n')

    # Campaign photos and films named in products.js
    settings = (ROOT / 'assets' / 'products.js').read_text()
    for path in re.findall(r"U \+ '([^']+)'", settings):
        url = UPLOADS + path
        (mirror_file if path.endswith('.mp4') else mirror_image)(url, out)
        if not path.endswith('.mp4') and not path.endswith('.jpg'):
            settings = settings.replace(path, re.sub(r'\.(png|webp|jpeg)$', '.jpg', path))
    settings = settings.replace("const U = 'https://genioactive.com/wp-content/uploads/';", "const U = 'media/';")
    (out / 'assets' / 'products.js').write_text(settings)

    for name in ('app.js', 'hero.js', 'garments.js', 'style.css'):
        shutil.copy(ROOT / 'assets' / name, out / 'assets' / name)

    # Page: the preview host supplies doctype/head/body, and gets the concept label
    page = (ROOT / 'index.html').read_text()
    for tag in ('<!doctype html>\n', '<html lang="en">\n', '<head>\n', '</head>\n', '<body>\n', '</body>\n', '</html>\n',
                '<meta charset="utf-8">\n',
                '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'):
        page = page.replace(tag, '')
    (out / 'index.html').write_text(page)

    files = sorted(str(p.relative_to(out)) for p in out.rglob('*') if p.is_file() and p.name != 'index.html')
    (out / 'files.json').write_text(json.dumps(files))
    size = sum((out / f).stat().st_size for f in files) / 1e6
    print(f'{len(files)} files, {size:.1f} MB -> {out}')


if __name__ == '__main__':
    main()
