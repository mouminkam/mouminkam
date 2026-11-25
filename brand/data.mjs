/**
 * Everything the generator draws comes from here. Feeds and detection boxes
 * mirror src/content/projects.ts in the portfolio, so GitHub and the site
 * always tell the same story.
 */

const portfolio = "https://moumen-alkamsheh.vercel.app";

export const person = {
  name: "Moumen",
  fullName: "Moumen Alkamsheh",
  role: "Full-stack & mobile developer",
  thesis: ["Web, mobile and", "the API between them."],
  camera: "CAM_04",
  city: "Damascus",
  timeZone: "Asia/Damascus",
  portfolio,
  github: "https://github.com/mouminkam",
  linkedin: "https://www.linkedin.com/in/moumen-alkamsheh/",
  email: "mo2min.2001@gmail.com",
  cv: `${portfolio}/Moumen-Alkamsheh-CV.pdf`,
};

/** Box = [x, y, width, height] as 0–1 fractions of the screenshot. */
export const feeds = [
  {
    slug: "promoo",
    feed: "FEED_01",
    title: "Promoo",
    kicker: "Mobile app · dashboard · API",
    scope: "Full-stack · mobile",
    image: "promoo.webp",
    detections: [
      { box: [0.06, 0.09, 0.266, 0.844], label: "flutter app", score: 0.98 },
      { box: [0.34, 0.16, 0.623, 0.7], label: "admin dashboard", score: 0.96 },
    ],
  },
  {
    slug: "magic-show",
    feed: "FEED_02",
    title: "Magic Show",
    kicker: "Store · dashboard · API",
    scope: "Full-stack",
    image: "magic-show.webp",
    detections: [
      { box: [0.313, 0.07, 0.65, 0.65], label: "dashboard", score: 0.95 },
      { box: [0.037, 0.29, 0.65, 0.65], label: "storefront", score: 0.98 },
    ],
  },
  {
    slug: "liulong",
    feed: "FEED_03",
    title: "Liulong",
    kicker: "Restaurant showcase · 3D",
    scope: "Frontend · 3D",
    image: "liulong.webp",
    detections: [
      { box: [0.67, 0.135, 0.255, 0.68], label: "3d steamer", score: 0.97 },
      { box: [0.04, 0.26, 0.39, 0.39], label: "headline", score: 0.95 },
      { box: [0.04, 0.821, 0.114, 0.052], label: "cta", score: 0.91 },
    ],
  },
  {
    slug: "merova",
    feed: "FEED_04",
    title: "Merova Healthcare",
    kicker: "Investor website",
    scope: "Frontend",
    image: "merova.webp",
    detections: [
      { box: [0.025, 0.27, 0.95, 0.2], label: "headline", score: 0.97 },
      { box: [0.375, 0.585, 0.25, 0.058], label: "cta", score: 0.93 },
    ],
  },
  {
    slug: "shahrayar",
    feed: "FEED_05",
    title: "Shahrayar",
    kicker: "Restaurant ordering",
    scope: "Frontend",
    image: "shahrayar.webp",
    detections: [
      { box: [0.54, 0.24, 0.41, 0.54], label: "dish", score: 0.98 },
      { box: [0.05, 0.395, 0.425, 0.2], label: "headline", score: 0.94 },
      { box: [0.05, 0.63, 0.114, 0.054], label: "cta", score: 0.91 },
    ],
  },
  {
    slug: "maison-eternel",
    feed: "FEED_06",
    title: "Maison Éternel",
    kicker: "Luxury events platform",
    scope: "Frontend",
    image: "maison-eternel.webp",
    detections: [
      { box: [0.275, 0.24, 0.44, 0.3], label: "headline", score: 0.96 },
      { box: [0.59, 0.49, 0.335, 0.5], label: "gallery", score: 0.93 },
      { box: [0.2775, 0.705, 0.3, 0.052], label: "cta", score: 0.9 },
    ],
  },
];

/**
 * One entry per public repository that carries the house style.
 * `active` names the detection boxes that belong to this repo; the rest are drawn dimmed.
 */
export const repos = [
  {
    repo: "Promoo-dashboard-demo",
    hello: "The admin console for Promoo, a marketplace for companies, influencers and service providers. It runs on its own, no backend needed.",
    feed: "promoo",
    surface: "Admin console",
    active: ["admin dashboard"],
    live: "https://promoo-dashboard-demo.vercel.app",
    stack: ["React 19", "Vite 6", "TypeScript", "Tailwind CSS 4", "TanStack Query", "Radix UI", "i18next"],
  },
  {
    repo: "Magic_Show",
    hello: "The storefront for a handmade footwear brand from Damascus. Shop in English or Arabic, right to left included.",
    feed: "magic-show",
    surface: "Storefront",
    active: ["storefront"],
    live: "https://magic-show.vercel.app",
    stack: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "Zustand", "Zod", "Jest", "Playwright"],
  },
  {
    repo: "Magic-Show-dashboard",
    hello: "The admin console behind Magic Show: 32 screens for orders, stock, coupons and customers.",
    feed: "magic-show",
    surface: "Admin console",
    active: ["dashboard"],
    live: "https://magic-show-dashboard.vercel.app",
    stack: ["React 19", "Vite 6", "TypeScript", "Tailwind CSS 4", "TanStack Query", "TanStack Table", "Radix UI", "Zod"],
  },
  {
    repo: "Magic-Show-back-end-",
    hello: "The Laravel API that keeps Magic Show’s catalog, carts and orders in one place, with tests in CI.",
    feed: "magic-show",
    surface: "Backend API",
    kind: "api",
    stack: ["Laravel 12", "PHP 8.2+", "Sanctum", "MySQL / SQLite", "PHPUnit", "Firebase Cloud Messaging"],
  },
  {
    repo: "MerovaHealthcare",
    hello: "An investor site for a pharmaceutical group, with a hero drawn live on canvas as you scroll. About 420 KB in total.",
    feed: "merova",
    surface: "Investor site",
    active: ["headline", "cta"],
    live: "https://merova-project-2.vercel.app",
    stack: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "GSAP ScrollTrigger", "Canvas 2D"],
  },
  {
    repo: "Shahrayar",
    hello: "Order Middle Eastern dishes in English, Arabic or Bulgarian, with Stripe checkout and a delivery map.",
    feed: "shahrayar",
    surface: "Ordering storefront",
    active: ["dish", "headline", "cta"],
    live: "https://shahrayar.vercel.app",
    stack: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "Zustand", "Zod", "Leaflet", "Stripe"],
  },
  {
    repo: "Maison_-ternel",
    hello: "Plan a wedding in the Gulf: find a venue, book it in four steps and keep the planning in one place.",
    feed: "maison-eternel",
    surface: "Events platform",
    active: ["headline", "gallery", "cta"],
    live: "https://maison-ternel.vercel.app",
    stack: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "GSAP", "Motion", "React Hook Form", "Zod"],
  },
];

/** The verbs from the portfolio's stack section. */
export const stack = [
  {
    verb: "Build",
    line: ["Interfaces people use every day,", "in English and Arabic."],
    items: ["TypeScript", "React", "Next.js", "Tailwind CSS", "Zustand", "TanStack Query", "GSAP", "Framer Motion"],
  },
  {
    verb: "Serve",
    line: ["APIs, data and the rules", "behind them."],
    items: ["Node.js", "Express", "Laravel", "PHP", "PostgreSQL", "MySQL", "MongoDB", "Supabase", "Stripe"],
  },
  {
    verb: "Ship",
    line: ["Mobile apps, tests and the", "road to production."],
    items: ["Flutter", "Dart", "Riverpod", "Firebase", "Jest", "Playwright", "Git", "Vercel"],
  },
];

/** A believable slice of the Magic Show API's traffic, for its feed. Routes are real (routes/api.php). */
export const apiLog = [
  ["GET", "/api/v1/health", 200, "3ms"],
  ["GET", "/api/v1/shop/products?page=1", 200, "41ms"],
  ["GET", "/api/v1/products/128", 200, "18ms"],
  ["POST", "/api/v1/cart", 201, "27ms"],
  ["POST", "/api/v1/cart/validate-coupon", 200, "14ms"],
  ["POST", "/api/v1/auth/login", 200, "88ms"],
  ["POST", "/api/v1/cart/checkout", 201, "112ms"],
  ["GET", "/api/v1/orders", 200, "35ms"],
  ["GET", "/api/v1/admin/orders", 403, "4ms", "admin.api"],
  ["POST", "/api/v1/contact/send-message", 429, "2ms", "throttle"],
  ["GET", "/api/v1/wishlist", 401, "2ms"],
];
