/*
 * Site settings. Products come from assets/catalogue.js, generated from the
 * live genioactive.com Store API by scripts/build_catalogue.py.
 */
(function () {
  const U = 'https://genioactive.com/wp-content/uploads/';
  window.GENIO = {
    shop: 'https://genioactive.com',
    baseCurrency: 'USD',          // the Store API prices in USD
    kesPerUsd: 150,               // storefront shows KShs at this rate (White Pulse $50 = KShs 7,500)
    freeShipUSD: 300,             // site banner: "Get free delivery on orders over $300"
    deliveryNote: 'Delivered within 2 weeks of your order',
    stores: [
      { name: 'Ngong Road', address: 'Applewood Adams, Shop 110, 1st Floor, Ngong Road, Nairobi' },
      { name: 'Westlands', address: 'Shop 8, Eatery Strip Mall, Muthithi Road, Westlands, Nairobi' }
    ],
    phones: ['+254 741 307 704', '+254 715 307 703'],
    hero: {
      video: U + '2026/06/SnapInsta.to_AQNLNYcMgNS6GofP9Fmtw8jlYXOkJk8mZSpoqwmc3X8C-W1DjFmxB40VQT8iIab4V0N-g13Qh5fSOVy3KpzUXEjQBcJ31S3PxSm5mAg.mp4',
      poster: U + '2026/07/GENiOActiveShoot024.jpg'
    },
    categories: [
      { id: 'all', label: 'All' },
      { id: 'sets', label: 'Sets' },
      { id: 'onepieces', label: 'Jumpsuits & dresses' },
      { id: 'tops', label: 'Tops' },
      { id: 'shorts', label: 'Shorts' },
      { id: 'jackets', label: 'Jackets' },
      { id: 'headwear', label: 'Head gear' },
      { id: 'accessories', label: 'Accessories' },
      { id: 'gifts', label: 'Gift cards' }
    ],
    // Campaign stories from the genioactive.com homepage
    lines: [
      { name: 'Aura', note: 'Open back, flared leg, all in one', img: U + '2026/07/GENiOActiveShoot024.jpg', style: 'aura-jumpsuit' },
      { name: 'Siren Fitted', note: 'Sculpted, second-skin set', img: U + '2026/07/GENiOActiveShoot011.jpg', style: 'siren-fitted' },
      { name: 'Runner', note: 'Bra, high-waisted leggings and a full-zip jacket', img: U + '2025/11/er_0030__AP10451-800x1200.jpg', style: 'runner-3-piece' },
      { name: 'Liber', note: 'The cropped tee, cut for movement', img: U + '2026/02/26_0043__M7A0246-800x1200.jpg', style: 'liber-cropped-tee' },
      { name: 'Siren', note: 'The original Siren set', img: U + '2025/04/ip_0018__LP_0002.jpg', style: 'siren-set' },
      { name: 'Court Visor', note: 'For padel, tennis and the long run', img: U + '2026/07/hg66-scaled.jpg', style: 'court-visor-tennis-hat' },
      { name: 'Motion Hijab', note: 'Breathable cover that stays put', video: U + '2026/07/Motion.mp4', style: 'genio-motion-hijab' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  };
  window.GENIO.products = window.GENIO_CATALOGUE || [];
  window.GENIO.freeShip = window.GENIO.freeShipUSD;
})();
