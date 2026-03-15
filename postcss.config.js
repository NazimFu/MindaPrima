// postcss.config.js
//
// Tailwind CSS v4 moved its PostCSS integration to a separate package.
// Install it once: npm install @tailwindcss/postcss
//
// If you are on Tailwind v3, revert to: plugins: { tailwindcss: {}, autoprefixer: {} }

module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};