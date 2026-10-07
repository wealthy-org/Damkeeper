// Same icon set as reference-landing.html's inline <symbol> sprite, so /app pages
// can reference icons the identical way: <svg className="icon"><use href="#i-x"/></svg>
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", overflow: "hidden" }} aria-hidden="true">
      <defs>
        <symbol id="i-arrow" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </g>
        </symbol>
        <symbol id="i-up" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="m6 18 12-12M6 6h12v12" />
          </g>
        </symbol>
        <symbol id="i-lock" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
          </g>
        </symbol>
        <symbol id="i-chart" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4v16h16M8 15l4-4 4 1 4-7" />
          </g>
        </symbol>
        <symbol id="i-link" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="m10 7 2-2a5 5 0 0 1 7 7l-2 2M7 10l-2 2a5 5 0 0 0 7 7l2-2m-6-2 7-7" />
          </g>
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
            <path d="m8 12 3 3 5-6" />
          </g>
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <path d="m5 12 4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-clock" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7v5l3 2" />
          </g>
        </symbol>
        <symbol id="i-close" viewBox="0 0 24 24">
          <path d="m6 6 12 12M6 18 18 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-code" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20" />
          </g>
        </symbol>
        <symbol id="i-layers" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5" />
          </g>
        </symbol>
        <symbol id="i-wallet" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-5a2 2 0 1 0 0 4h6" />
          </g>
        </symbol>
        <symbol id="i-home" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
          </g>
        </symbol>
        <symbol id="i-search" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
          </g>
        </symbol>
        <symbol id="i-menu" viewBox="0 0 24 24">
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-coins" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <ellipse cx="9" cy="7" rx="5.5" ry="2.5" />
            <path d="M3.5 7v5c0 1.4 2.5 2.5 5.5 2.5M3.5 12v5c0 1.4 2.5 2.5 5.5 2.5" />
            <ellipse cx="15" cy="13" rx="5.5" ry="2.5" />
            <path d="M9.5 13v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5" />
          </g>
        </symbol>
        <symbol id="i-drop" viewBox="0 0 24 24">
          <path d="M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-copy" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </g>
        </symbol>
        <symbol id="i-flame" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A3.5 3.5 0 0 0 12 18a3.5 3.5 0 0 0 3.5-3.5c0-2-1.5-3.5-2.5-5C12 7.5 12 6 12 4c-3 3-6 7-6 10.5a6 6 0 0 0 12 0c0-2.5-1-4.5-2.5-6.5" />
          </g>
        </symbol>
        <symbol id="i-dead" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 10h.01M15 10h.01M10 14h4" />
            <path d="M4 12a8 8 0 0 1 16 0c0 3-1.5 5.5-3.5 7v2a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-2C5.5 17.5 4 15 4 12Z" />
            <path d="M10 20v2M14 20v2" />
          </g>
        </symbol>
        <symbol id="i-x" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor" />
        </symbol>
        <symbol id="i-alert" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </g>
        </symbol>
        <symbol id="i-sparkle" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </g>
        </symbol>
        <symbol id="i-gift" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 4.8 0 0 1 12 8a4.8 4.8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}
