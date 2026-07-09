# SpaceX Invest — Landing Page Prototype

This repository is a production-minded prototype for the SpaceX Invest landing page built with:

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion
- lucide-react (icons)
- Recharts (available in package.json for later charting / dashboards)
- Local, small UI primitives under components/ui/ (no external shadcn/ui package dependency)

What is included:
- Fully-structured Next.js app with App Router (app/)
- Reusable components for Navigation, Hero, Investment Overview, Featured Opportunities, Why SpaceX Invest, Security & Compliance, FAQ, Footer
- Responsive, mobile-first layout and Tailwind CSS design tokens consistent with the SpaceX-style language provided
- Placeholder hero poster at `public/media/hero-poster.svg`
- All components in TypeScript

How to run locally:
1. node v18+ recommended
2. Install dependencies:
   npm install
3. Run development server:
   npm run dev
4. Open http://localhost:3000

Notes & next steps:
- Replace `public/media/hero.mp4` with your final hero video for an immersive hero.
- Charts and the full investor dashboard are Phase 2 — Recharts is already included and ready.
- Accessibility: keyboard trapping for the mobile menu and additional focus states can be added in the next iteration.

If you want, I can:
- Add a small test suite
- Add Lighthouse-focused optimizations (font preloading, image formats)
- Add keyboard focus-trap to mobile menu
