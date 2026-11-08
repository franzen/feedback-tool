---
"@franzen/feedback-tool": patch
---

Fix the widget occasionally hanging on "Preparing…" for about 7 seconds after clicking Next (and a similar delay when opening the editor) on busy pages in Chromium-based browsers. Screenshots are now encoded synchronously instead of with `canvas.toBlob()`, which Chromium defers to idle time.
