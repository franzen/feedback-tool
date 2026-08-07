export const WIDGET_STYLES = `
  :host {
    all: initial;
    color-scheme: light;
  }

  *, *::before, *::after { box-sizing: border-box; }

  button, input, textarea { font: inherit; }

  .ft-root {
    --ft-accent: #6558d3;
    --ft-accent-dark: #5146b7;
    --ft-ink: #172034;
    --ft-muted: #667085;
    --ft-border: #d9deea;
    --ft-panel: #ffffff;
    --ft-soft: #f5f6fa;
    font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--ft-ink);
    font-size: 14px;
    line-height: 1.45;
  }

  .ft-hidden { display: none !important; }

  .ft-launcher {
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 2147483645;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-height: 46px;
    padding: 0 18px;
    border: 0;
    border-radius: 999px;
    background: var(--ft-accent);
    color: #fff;
    box-shadow: 0 10px 30px rgba(43, 38, 102, .28);
    cursor: pointer;
    font-weight: 700;
    letter-spacing: -.01em;
  }

  .ft-launcher:hover { background: var(--ft-accent-dark); transform: translateY(-1px); }
  .ft-launcher:focus-visible, .ft-button:focus-visible, .ft-tool:focus-visible,
  .ft-icon-button:focus-visible, .ft-input:focus-visible, .ft-textarea:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--ft-accent) 30%, transparent);
    outline-offset: 2px;
  }

  .ft-launcher-mark {
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    background: rgba(255,255,255,.18);
    font-size: 13px;
  }

  .ft-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    background: rgba(15, 23, 42, .54);
    backdrop-filter: blur(4px);
  }

  .ft-capturing {
    display: grid;
    place-items: center;
  }

  .ft-capturing-card, .ft-error-card {
    width: min(420px, calc(100vw - 32px));
    padding: 28px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 24px 80px rgba(15, 23, 42, .25);
    text-align: center;
  }

  .ft-spinner {
    width: 32px;
    height: 32px;
    margin: 0 auto 16px;
    border: 3px solid #e5e7eb;
    border-top-color: var(--ft-accent);
    border-radius: 50%;
    animation: ft-spin .75s linear infinite;
  }

  @keyframes ft-spin { to { transform: rotate(360deg); } }

  .ft-card-title { margin: 0 0 6px; font-size: 18px; font-weight: 750; }
  .ft-card-copy { margin: 0; color: var(--ft-muted); }
  .ft-error-actions { display: flex; justify-content: center; gap: 10px; margin-top: 22px; }

  .ft-editor {
    display: grid;
    grid-template-rows: 64px minmax(0, 1fr) 68px;
    background: #eef0f5;
    backdrop-filter: none;
  }

  .ft-header, .ft-footer {
    display: flex;
    align-items: center;
    min-width: 0;
    background: var(--ft-panel);
    border-color: var(--ft-border);
  }

  .ft-header {
    justify-content: space-between;
    padding: 0 18px 0 22px;
    border-bottom: 1px solid var(--ft-border);
  }

  .ft-footer {
    justify-content: space-between;
    padding: 0 22px;
    border-top: 1px solid var(--ft-border);
  }

  .ft-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .ft-brand-mark {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: var(--ft-accent);
    color: #fff;
    font-size: 17px;
    font-weight: 800;
  }
  .ft-brand-copy { min-width: 0; }
  .ft-brand-title { display: block; font-weight: 750; line-height: 1.2; }
  .ft-brand-subtitle { display: block; color: var(--ft-muted); font-size: 12px; white-space: nowrap; }

  .ft-header-actions, .ft-footer-actions { display: flex; align-items: center; gap: 8px; }

  .ft-workspace {
    min-height: 0;
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
  }

  .ft-toolrail {
    min-height: 0;
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    background: var(--ft-panel);
    border-right: 1px solid var(--ft-border);
  }

  .ft-tool {
    min-height: 58px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 6px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: transparent;
    color: #475467;
    cursor: pointer;
    font-size: 11px;
    font-weight: 650;
  }

  .ft-tool-symbol { font-size: 19px; line-height: 1; font-weight: 500; }
  .ft-tool:hover { background: var(--ft-soft); color: var(--ft-ink); }
  .ft-tool[aria-pressed="true"] {
    border-color: color-mix(in srgb, var(--ft-accent) 28%, white);
    background: color-mix(in srgb, var(--ft-accent) 10%, white);
    color: var(--ft-accent-dark);
  }

  .ft-palette {
    display: grid;
    grid-template-columns: repeat(3, 22px);
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
    padding-top: 14px;
    border-top: 1px solid var(--ft-border);
  }

  .ft-color {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 2px solid #fff;
    border-radius: 50%;
    outline: 1px solid #c7ceda;
    background: var(--ft-color);
    cursor: pointer;
  }

  .ft-color[aria-pressed="true"] {
    outline: 3px solid color-mix(in srgb, var(--ft-color) 55%, white);
    outline-offset: 2px;
  }

  .ft-color:focus-visible {
    outline: 3px solid var(--ft-ink);
    outline-offset: 2px;
  }

  .ft-stage-shell {
    min-width: 0;
    min-height: 0;
    padding: 22px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background-color: #e8eaf0;
    background-image: linear-gradient(45deg, rgba(148,163,184,.13) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(148,163,184,.13) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(148,163,184,.13) 75%),
      linear-gradient(-45deg, transparent 75%, rgba(148,163,184,.13) 75%);
    background-size: 24px 24px;
    background-position: 0 0, 0 12px, 12px -12px, -12px 0;
  }

  .ft-stage {
    position: relative;
    box-shadow: 0 12px 48px rgba(15, 23, 42, .24);
    background: #fff;
    line-height: 0;
  }

  .ft-stage .canvas-container { line-height: 0; }

  .ft-button, .ft-icon-button {
    border: 1px solid var(--ft-border);
    background: #fff;
    color: var(--ft-ink);
    cursor: pointer;
    font-weight: 700;
  }

  .ft-button {
    min-height: 40px;
    padding: 0 16px;
    border-radius: 9px;
  }

  .ft-button:hover:not(:disabled), .ft-icon-button:hover:not(:disabled) { background: var(--ft-soft); }
  .ft-button-primary { border-color: var(--ft-accent); background: var(--ft-accent); color: #fff; }
  .ft-button-primary:hover:not(:disabled) { background: var(--ft-accent-dark); }
  .ft-button-danger { color: #b42318; }
  .ft-button:disabled, .ft-icon-button:disabled { opacity: .45; cursor: not-allowed; }

  .ft-icon-button {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    font-size: 17px;
  }

  .ft-status { color: var(--ft-muted); font-size: 12px; }

  .ft-popover {
    position: fixed;
    z-index: 2147483647;
    width: min(320px, calc(100vw - 24px));
    padding: 14px;
    border: 1px solid var(--ft-border);
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 16px 45px rgba(15, 23, 42, .2);
  }

  .ft-popover-label { display: block; margin-bottom: 7px; font-weight: 700; }
  .ft-popover-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }

  .ft-textarea, .ft-input {
    width: 100%;
    border: 1px solid #cfd5e1;
    border-radius: 9px;
    background: #fff;
    color: var(--ft-ink);
  }
  .ft-textarea { min-height: 94px; padding: 10px 11px; resize: vertical; line-height: 1.45; }
  .ft-input { height: 43px; padding: 0 11px; }

  .ft-review-view {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(340px, .85fr);
    background: #eef0f5;
  }

  .ft-review-shell {
    grid-row: 1 / -1;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: 64px minmax(0, 1fr) 68px;
  }

  .ft-review-shell .ft-header, .ft-review-shell .ft-footer { width: 100%; }

  .ft-review-preview { min-width: 0; min-height: 0; padding: 28px; display: grid; place-items: center; overflow: hidden; }
  .ft-review-preview img { max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 12px 48px rgba(15,23,42,.2); }
  .ft-review-form { min-height: 0; overflow-y: auto; padding: 34px; background: #fff; border-left: 1px solid var(--ft-border); }
  .ft-review-form h2 { margin: 0 0 8px; font-size: 24px; letter-spacing: -.025em; }
  .ft-review-intro { margin: 0 0 28px; color: var(--ft-muted); }
  .ft-field { margin-bottom: 20px; }
  .ft-field label { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 7px; font-weight: 700; }
  .ft-optional { color: var(--ft-muted); font-size: 12px; font-weight: 500; }
  .ft-field-error { min-height: 18px; margin: 5px 0 0; color: #b42318; font-size: 12px; }
  .ft-meta-card { margin-top: 28px; padding: 16px; border-radius: 12px; background: var(--ft-soft); }
  .ft-meta-title { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--ft-muted); }
  .ft-meta-row { display: flex; justify-content: space-between; gap: 16px; margin-top: 6px; font-size: 12px; }
  .ft-meta-row span:first-child { color: var(--ft-muted); }
  .ft-meta-row span:last-child { min-width: 0; max-width: 68%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ft-submit-error { margin: 18px 0 0; padding: 11px 12px; border-radius: 9px; background: #fef3f2; color: #b42318; }

  .ft-success-view { display: grid; place-items: center; background: #f3f5f9; }
  .ft-success-view { grid-row: 1 / -1; }
  .ft-success-card { width: min(460px, calc(100vw - 32px)); padding: 36px; border-radius: 18px; background: #fff; box-shadow: 0 18px 60px rgba(15,23,42,.16); text-align: center; }
  .ft-success-mark { width: 54px; height: 54px; display: grid; place-items: center; margin: 0 auto 17px; border-radius: 50%; background: #e7f8ef; color: #067647; font-size: 28px; font-weight: 800; }
  .ft-success-card h2 { margin: 0 0 8px; font-size: 22px; }
  .ft-success-card p { margin: 0 0 22px; color: var(--ft-muted); }

  @media (max-width: 760px) {
    .ft-editor { grid-template-rows: 58px minmax(0, 1fr) 62px; }
    .ft-header { padding: 0 10px 0 14px; }
    .ft-brand-subtitle, .ft-status, .ft-clear-label { display: none; }
    .ft-workspace { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) 76px; }
    .ft-stage-shell { grid-row: 1; padding: 10px; }
    .ft-toolrail { grid-row: 2; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: 0; border-top: 1px solid var(--ft-border); padding: 7px; }
    .ft-tool { min-width: 62px; min-height: 60px; }
    .ft-palette { flex: 0 0 auto; display: flex; align-items: center; margin: 0 0 0 4px; padding: 0 8px 0 12px; border-top: 0; border-left: 1px solid var(--ft-border); }
    .ft-footer { padding: 0 12px; }
    .ft-review-view { grid-template-columns: 1fr; grid-template-rows: minmax(190px, 36vh) minmax(0, 1fr); }
    .ft-review-shell { grid-template-rows: 58px minmax(0, 1fr) 62px; }
    .ft-review-preview { padding: 14px; }
    .ft-review-form { padding: 22px 18px; border-left: 0; border-top: 1px solid var(--ft-border); }
    .ft-review-form h2 { font-size: 21px; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; }
  }
`;
