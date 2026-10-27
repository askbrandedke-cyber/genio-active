# GENiO Active, "Luxury in Motion" redesign

A static front end for genioactive.com, built on the live store's own catalogue, photography and brand system. It has no build step: serve the folder and open `index.html`.

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Built from the live site (checked 27 Oct 2026)

| From genioactive.com | Used here |
| --- | --- |
| WooCommerce Store API: 294 products | 62 styles; colourways grouped with swatches |
| Product photography and galleries | Cards (with hover second image), quick view gallery, bag, search |
| Variation data (size, Pick, gift card amount) and each option's own price | Option pickers; Cherri look builder (bra $22, crop $22, shorts $25, pants $25, 4-piece $75) |
| "Move freely" campaign film, Aura / Siren / Runner / Liber / Court Visor / Motion Hijab stories | Hero film portal and the campaign rail |
| Logo mark (`themes/GENIO/img/icon.svg`) | Header and footer |
| Theme fonts and colours: Montserrat Bold caps, Helvetica; #111111, #1b1b1b, #444444, #E0E0E0, #e7e7e7, #f6f6f6, white; #e2401c for errors | Every token in `assets/style.css` |
| USD prices shown as KShs at 150 (White Pulse $50 = KShs 7,500) | USD / KSh toggle |
| Free delivery over $300, delivery within 2 weeks, stores and phone numbers | Bag progress bar, marquee, footer |

## Files

| File | Role |
| --- | --- |
| `index.html` | Page structure: hero, campaign rail, shop, look builder, fit, story, newsletter, modals, bag |
| `assets/style.css` | GENiO tokens (black chapters and a `.light` soft-grey scope) and all styles |
| `assets/catalogue.js` | **Generated.** Live catalogue data; do not edit by hand |
| `assets/products.js` | Site settings: currency, delivery, stores, campaign stories, categories |
| `assets/app.js` | Shop, quick view, bag, checkout handoff, look builder, search (`/` key), currency |
| `assets/hero.js` | Three.js monochrome "fabric" behind the hero (falls back to a gradient) |
| `assets/garments.js` | SVG pieces for the look builder, and a fallback if a product has no photo |
| `scripts/build_catalogue.py` | Rebuilds `catalogue.js` from the live Store API |

## Keeping products current

```
python3 scripts/build_catalogue.py
```

This fetches every product, groups colourways ("Brown Aura Jumpsuit" and "Peach Aura Jumpsuit" become one style), fetches the price of each option on range-priced styles, and uses only image sizes the API reports. Re-run it after adding products in WooCommerce. New-release styles are listed in `NEW_RELEASE` in the script.

## Checkout

- **Deployed on genioactive.com** (same origin): Checkout fills the real WooCommerce cart through the Store API (`/wp-json/wc/store/v1/cart/add-item`), then opens `/checkout/`.
- **Anywhere else** (local preview): Checkout lists one WooCommerce add-to-cart link per bag line, then a link to `/checkout/`. Tested: a link added "Pink Cherri 4 PCS, M, Sport Bra, $22" to a live cart.

## To confirm with GENiO

1. **Delivery threshold:** the banner says $300, but the page metadata still says $200. The site uses $300.
2. **Size guide:** the measurements are a general guide; replace them with GENiO's own chart.
3. **Swatch colours** are mapped from colour names in the build script (`COLOURS`), so a few may need tuning.
4. **Category** for styles such as Rank, Snap, Agile and Flakes is inferred from names and tags.
5. **Newsletter:** the form is front-end only. Connect it to GENiO's email platform.
6. **Founding year:** most sources (The Star, April 2019; Pulse) give 2019, and one biography says 2018. The site says 2019.

## Our story: sources

The story and fit copy only states what public sources support:

- **Founder:** Corazon Kwamboka, founder and CEO of Genio Active Wear. Sources: Ecobank Kenya on X (March 2024) and the YouTube interview "Corazon Kwamboka - Founder and CEO of Genio Active Wear".
- **Origin:** a lover of sport and the gym, and a curvy size 16/18, she found that international brands didn't cater to her, so she started her own line for women of all sizes. Source: The Star, 11 April 2019.
- **Promises:** high quality, high-waisted, super stretchy, anti-cellulite. Source: GENiO's own social bios.
- **Second-skin feel:** from the Aura Jumpsuit copy. **Polyester and spandex:** from the Opal T-Shirt copy.
- **Removed as unsupported:** "Genio is Italian for genius" as a brand story, and the fabric details "double-layer waistband", "shaped gusset" and "four-way stretch".

## Hosting on GitHub Pages

The folder is a static site, so GitHub Pages serves it as it is (`.nojekyll` is included):

1. Push this folder to a GitHub repository.
2. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, then select `main` and the `/ (root)` folder.
3. The site appears at `https://<account>.github.io/<repository>/`.

Product photos and films load directly from genioactive.com. The "Design concept" label (`.preview-flag` in `index.html`) stays on wherever the site is hosted outside genioactive.com.

## Accessibility and performance

- The hero WebGL pauses when off-screen; the campaign film and rail videos are only a few MB.
- Product images are lazy-loaded API thumbnails; the quick view uses about 800px images.
- Every control is a real button, modals close on Esc and return focus, and focus is always visible.
- Reduced motion turns off the film autoplay, marquee, cursor, tilt, float and hero animation.
