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
      </defs>
    </svg>
  );
}
