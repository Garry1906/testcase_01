// Original avatar art for each Hive member. Each design is drawn from the
// public mission of the company behind the assistant — not from its logo.
//
//  Claude (Anthropic)    — safety, honesty, care: a steady lantern flame held
//                          inside a protective ring.
//  Perplexity            — curiosity, accuracy, sources: a lens whose light
//                          branches out into linked citation nodes.
//  Copilot (Microsoft)   — empower every person, partnership: two wings side
//                          by side, flying the same course.

const hex = (fill, stroke) =>
  `<polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;

export const AVATARS = {
  claude: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="cl-g" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#F6C9A8"/><stop offset="100%" stop-color="#C2643C"/>
    </radialGradient>
  </defs>
  ${hex("url(#cl-g)", "#8A3F22")}
  <circle cx="50" cy="52" r="24" fill="none" stroke="#FFF4EA" stroke-width="3" opacity=".9"/>
  <path d="M50 30 C58 42 60 50 50 64 C40 50 42 42 50 30 Z" fill="#FFF4EA"/>
  <path d="M50 42 C54 48 54 53 50 59 C46 53 46 48 50 42 Z" fill="#E98B5C"/>
  <rect x="44" y="66" width="12" height="4" rx="2" fill="#FFF4EA"/>
</svg>`,

  perplexity: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="px-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7FE3DA"/><stop offset="100%" stop-color="#127C7A"/>
    </linearGradient>
  </defs>
  ${hex("url(#px-g)", "#0B5352")}
  <circle cx="40" cy="44" r="15" fill="none" stroke="#F0FFFD" stroke-width="4"/>
  <line x1="51" y1="55" x2="60" y2="64" stroke="#F0FFFD" stroke-width="5" stroke-linecap="round"/>
  <g stroke="#F0FFFD" stroke-width="2" fill="#F0FFFD">
    <line x1="62" y1="66" x2="74" y2="58"/><circle cx="74" cy="58" r="3.5"/>
    <line x1="62" y1="66" x2="76" y2="72"/><circle cx="76" cy="72" r="3.5"/>
    <line x1="62" y1="66" x2="64" y2="80"/><circle cx="64" cy="80" r="3.5"/>
  </g>
  <circle cx="40" cy="44" r="5" fill="#F0FFFD" opacity=".8"/>
</svg>`,

  copilot: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="cp-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9DB8FF"/><stop offset="100%" stop-color="#5B3FC4"/>
    </linearGradient>
  </defs>
  ${hex("url(#cp-g)", "#352187")}
  <path d="M24 60 C30 40 42 32 50 32 C44 40 42 50 44 62 Z" fill="#F3F0FF"/>
  <path d="M76 60 C70 40 58 32 50 32 C56 40 58 50 56 62 Z" fill="#F3F0FF" opacity=".75"/>
  <path d="M30 70 Q50 60 70 70" fill="none" stroke="#F3F0FF" stroke-width="3" stroke-linecap="round"/>
  <circle cx="50" cy="44" r="4" fill="#5B3FC4"/>
</svg>`,

  you: `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  ${hex("#F2B33D", "#9A6A0C")}
  <circle cx="50" cy="40" r="12" fill="#3A2A05"/>
  <path d="M28 76 C30 60 70 60 72 76 Z" fill="#3A2A05"/>
</svg>`,
};
