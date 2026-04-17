/**
 * Waystones Logo SVG content (without the wrapping <span> or <a>)
 * Standard 200x200 viewBox.
 */
export const WAYSTONES_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="stoneFace" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#eef0ff" />
      <stop offset="28%" stop-color="#f3f4ff" />
      <stop offset="52%" stop-color="#f5f6ff" />
      <stop offset="78%" stop-color="#f3f4ff" />
      <stop offset="100%" stop-color="#eef0ff" />
    </linearGradient>
    <radialGradient id="cosmicCore" cx="46%" cy="44%" r="58%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="8%" stop-color="#c7d2fe" stop-opacity="0.95" />
      <stop offset="22%" stop-color="#4338ca" stop-opacity="0.75" />
      <stop offset="42%" stop-color="#4338ca" stop-opacity="0.5" />
      <stop offset="65%" stop-color="#eef0ff" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#f5f5ff" stop-opacity="1" />
    </radialGradient>
    <radialGradient id="nebula1" cx="60%" cy="38%" r="50%">
      <stop offset="0%" stop-color="#4338ca" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#4338ca" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="nebula2" cx="35%" cy="65%" r="45%">
      <stop offset="0%" stop-color="#4338ca" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#4338ca" stop-opacity="0" />
    </radialGradient>
    <filter id="bigBloom" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="8" result="b1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b2" />
      <feMerge><feMergeNode in="b1" /><feMergeNode in="b2" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.5" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="rockGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="4" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <clipPath id="hexClip">
      <polygon points="100,14 171,55 171,137 100,178 29,137 29,55" />
    </clipPath>
    <clipPath id="portalClip">
      <ellipse cx="100" cy="96" rx="48" ry="58" />
    </clipPath>
  </defs>
  <polygon points="100,11 174,53 174,139 100,181 26,139 26,53" fill="#dde0ff" />
  <polygon points="100,14 171,55 171,137 100,178 29,137 29,55" fill="url(#stoneFace)" />
  <g clip-path="url(#hexClip)" fill="none" stroke-linecap="round">
    <path d="M 46,68 Q 40,82 45,98" stroke="#4338ca" stroke-width="1.1" opacity="0.35" />
    <path d="M 154,68 Q 160,82 155,98" stroke="#4338ca" stroke-width="1.1" opacity="0.35" />
  </g>
  <polygon points="100,14 171,55 171,137 100,178 29,137 29,55" fill="none" stroke="#4338ca" stroke-width="1.5" opacity="0.45" filter="url(#glow)" />
  <polygon points="84,18 90,6 97,0 103,0 110,6 116,18 108,26 100,24 92,26" fill="#dde0ff" stroke="#c7d2fe" stroke-width="0.5" />
  <polygon points="86,18 91,8 97,2 103,2 109,8 114,18 107,25 100,23 93,25" fill="#eef0ff" />
  <path d="M 84,18 L 92,26 L 100,24 L 108,26 L 116,18" fill="none" stroke="#4338ca" stroke-width="2.2" stroke-linecap="round" opacity="0.9" filter="url(#rockGlow)" />
  <polygon points="165,42 172,33 180,30 187,36 192,46 188,58 178,64 170,60 166,50" fill="#dde0ff" stroke="#c7d2fe" stroke-width="0.5" />
  <path d="M 165,42 L 166,50 L 170,60 L 178,64" fill="none" stroke="#4338ca" stroke-width="2.2" stroke-linecap="round" opacity="0.9" filter="url(#rockGlow)" />
  <polygon points="165,150 170,132 178,128 188,134 192,146 188,158 180,164 172,160 166,152" fill="#dde0ff" stroke="#c7d2fe" stroke-width="0.5" />
  <path d="M 165,150 L 166,152 L 170,132 L 178,128" fill="none" stroke="#4338ca" stroke-width="2.2" stroke-linecap="round" opacity="0.9" filter="url(#rockGlow)" />
  <polygon points="84,174 92,166 100,168 108,166 116,174 110,186 103,192 97,192 90,186" fill="#dde0ff" stroke="#c7d2fe" stroke-width="0.5" />
  <path d="M 84,174 L 92,166 L 100,168 L 108,166 L 116,174" fill="none" stroke="#4338ca" stroke-width="2.2" stroke-linecap="round" opacity="0.9" filter="url(#rockGlow)" />
  <polygon points="22,128 30,128 34,132 35,150 30,160 20,164 12,158 8,146 12,136" fill="#dde0ff" stroke="#c7d2fe" stroke-width="0.5" />
  <path d="M 22,128 L 30,128 L 34,132 L 35,150" fill="none" stroke="#4338ca" stroke-width="2.2" stroke-linecap="round" opacity="0.9" filter="url(#rockGlow)" />
  <polygon points="22,64 12,58 8,46 13,36 21,30 30,32 35,42 34,54 28,62" fill="#dde0ff" stroke="#c7d2fe" stroke-width="0.5" />
  <path d="M 22,64 L 34,54 L 35,42 L 30,32" fill="none" stroke="#4338ca" stroke-width="2.2" stroke-linecap="round" opacity="0.9" filter="url(#rockGlow)" />
  <ellipse cx="100" cy="96" rx="50" ry="60" fill="#f5f6ff" />
  <ellipse cx="100" cy="96" rx="49" ry="59" fill="url(#cosmicCore)" />
  <ellipse cx="100" cy="96" rx="49" ry="59" fill="none" stroke="#4338ca" stroke-width="2.5" opacity="0.8" filter="url(#glow)" />
  <path d="M 100,96 C 106,88 116,87 121,95 C 127,104 122,118 110,122 C 97,127 82,120 77,106 C 71,91 78,73 94,69 C 113,65 130,78 132,99 C 135,123 119,140 100,141 C 77,143 59,124 58,101"
    fill="none" stroke="#4338ca" stroke-width="2.2" stroke-linecap="round" filter="url(#glow)" />
</svg>
`;

/**
 * Waystones Favicon as a Data URL (SVG)
 */
export const WAYSTONES_FAVICON_DATA_URL = `data:image/svg+xml,${encodeURIComponent(WAYSTONES_LOGO_SVG)}`;
