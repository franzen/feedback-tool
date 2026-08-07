# Feedback Tool

A framework-free, embeddable JavaScript widget for capturing the visible webpage, annotating it, and collecting a compact feedback report. The repository also includes a realistic local demo.

## Run the demo

```bash
npm install
npm run dev
```

Open the local URL printed by Vite and select **Give feedback**. Production bundles and a static demo build are created with:

```bash
npm run build
```

The library output is written to `dist/`, and the static demo is written to `demo-dist/`.

## Module usage

```js
import { createFeedbackTool, reportToJson } from './dist/feedback-tool.es.js';

const feedback = createFeedbackTool({
  accentColor: '#6558d3',
  collectEmail: true,
  launcher: {
    enabled: true,
    label: 'Give feedback',
    position: 'bottom-right',
  },
  onSubmit: async (report) => {
    // report.image is a flattened PNG Blob.
    // report.annotations and report.metadata are JSON-safe.
    console.log(reportToJson(report));
  },
  onError: (error) => console.error(error),
});

// The launcher calls this automatically, or open it from your own UI.
await feedback.open();

// Later:
feedback.close();
feedback.destroy();
```

## Plain script usage

```html
<script src="./dist/feedback-tool.iife.js"></script>
<script>
  const feedback = FeedbackTool.createFeedbackTool({
    onSubmit: async (report) => {
      console.log(report);
    },
  });
</script>
```

Set `launcher: false` when the host page supplies its own button. The controller returned by `createFeedbackTool()` exposes `open()`, `close()`, and `destroy()`.

## Report payload

`onSubmit` receives:

- `schemaVersion`, `id`, and `createdAt`.
- `feedback.message` and optional `feedback.email`.
- `image`, a flattened `image/png` `Blob` containing all visible annotations and redactions.
- Tool-independent `annotations` with screenshot-coordinate geometry and comment text.
- `metadata` containing the URL, title, visible viewport, screenshot dimensions, pixel ratio, language, and user agent.

`reportToJson(report)` intentionally omits the binary image. The unannotated screenshot is never included in the report payload.

## Capture behavior and limitations

The internal `captureViewport()` adapter currently uses `html2canvas` and captures only the visible viewport. Widget UI is excluded, animations are paused, resources receive a short loading window, and output is validated before the editor opens.

Because `html2canvas` reconstructs a page from its DOM rather than taking a native browser screenshot, some advanced CSS, cross-origin images without CORS headers, tainted canvases, and cross-origin iframe content may not render perfectly. The capture adapter is intentionally isolated so a different renderer can be evaluated later without changing the editor or public API.

## Verification

```bash
npm test
npm run test:e2e
npm run build
```

The browser tests cover viewport capture, all five annotation tools, history, validation, submission, and PNG/JSON downloads.
