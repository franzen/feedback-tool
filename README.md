# Feedback Tool

A framework-free, embeddable JavaScript widget for capturing the visible webpage, annotating it, and collecting a compact feedback report. The repository also includes a realistic local demo.

## Install from GitHub Packages

The package is published as `@franzen/feedback-tool`. GitHub Packages requires authentication, including for public npm packages.

Add the registry mapping to the consuming project's `.npmrc`:

```ini
@franzen:registry=https://npm.pkg.github.com
```

For local development, authenticate with a classic GitHub personal access token that has `read:packages` permission. Do not commit the token:

```bash
npm login --scope=@franzen --auth-type=legacy --registry=https://npm.pkg.github.com
npm install @franzen/feedback-tool
```

For installation in GitHub Actions, grant the consuming repository read access in the package settings and use its `GITHUB_TOKEN`:

```yaml
permissions:
  contents: read
  packages: read

steps:
  - uses: actions/checkout@v6
  - uses: actions/setup-node@v4
    with:
      node-version: 24
      registry-url: https://npm.pkg.github.com
      scope: '@franzen'
  - run: npm ci
    env:
      NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Run the demo

```bash
npm install
npm run dev
```

Open the local URL printed by Vite and select **Give feedback**. Production bundles and a static demo build are created with:

```bash
npm run build
```

The ESM library output is written to `dist/`, and the static demo is written to `demo-dist/`.

## Module usage

```js
import { createFeedbackTool, reportToJson } from '@franzen/feedback-tool';

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

Set `launcher: false` when the host page supplies its own button. The controller returned by `createFeedbackTool()` exposes `open()`, `close()`, and `destroy()`.

The widget entry point is browser-only and ESM-only. The `/server` entry point requires Node.js and is isolated from browser bundles. `fabric` and `html2canvas` remain normal package dependencies so host bundlers can deduplicate and optimize them. TypeScript declarations are included.

## Forward feedback to support issues

Backend integrations are available from the separate `@franzen/feedback-tool/server` entry point. Keep this code on the server: GitHub credentials must never be imported into or sent to the browser.

The provider-neutral client exposes the same issue, status, and comment API regardless of which ticket system is used. GitHub is the first provider:

```js
import {
  createGithubIssueProvider,
  createSupportIssueClient,
} from '@franzen/feedback-tool/server';

const supportIssues = createSupportIssueClient({
  provider: createGithubIssueProvider({
    repository: 'your-org/support',
    auth: {
      type: 'app',
      clientId: process.env.GITHUB_APP_CLIENT_ID,
      installationId: process.env.GITHUB_APP_INSTALLATION_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
    },
  }),
});
```

Store the annotated `report.image` in storage controlled by your backend, then forward the report with a URL GitHub is allowed to render:

```js
const issue = await supportIssues.forwardFeedback(report, {
  title: 'Feedback from the billing page', // Optional; defaults to the first message line.
  screenshotUrl: 'https://app.example.com/api/feedback/screenshots/report-id.png',
  labels: ['in-app-feedback', 'bug'],
  context: {
    Application: 'Customer portal',
    Version: '2.4.0',
  },
});

// Persist issue.id alongside the local feedback record.
const latest = await supportIssues.getIssue(issue.id);
console.log(latest.status, latest.statusReason, latest.updatedAt);

const allIssues = await supportIssues.listIssues({ status: 'all', labels: ['in-app-feedback'] });
const comments = await supportIssues.listComments(issue.id);
await supportIssues.addComment(issue.id, 'Thanks — we can reproduce this.');
```

`forwardFeedback()` produces a Markdown issue body containing the message, screenshot link, and technical report metadata. Reporter email is excluded by default; opt in with `includeReporterEmail: true` only when your privacy policy allows it. Use `createIssue()` directly when an application needs complete control over title and body formatting.

The screenshot is not uploaded to GitHub by this package because the GitHub Issues API has no issue-attachment upload endpoint. Protect the screenshot URL according to the application's data policy, and remember that GitHub must be able to fetch it if it is embedded in the issue.

For a GitHub App, grant **Issues: Read and write**, install it only on the target repository, and provide the App client ID (or legacy App ID), installation ID, and PEM private key. Installation tokens are generated and cached automatically. A fine-grained token can also be used with `auth: { type: 'token', token }`; it likewise needs repository Issues read/write access.

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
npm run test:package
```

The browser tests cover viewport capture, all five annotation tools, history, validation, submission, and PNG/JSON downloads.

## Versioning and releases

Release-impacting pull requests include a Changeset:

```bash
npm run changeset
```

While the package is below 1.0, use a patch for compatible fixes and a minor for features or breaking API changes. Clearly call out breaking behavior in the Changeset summary. Documentation, tests, and CI-only work do not require a Changeset.

After changes land on `main`, the release workflow opens or updates a release pull request containing the next version and changelog. Approving and merging that pull request publishes the package to GitHub Packages, creates a Git tag, and creates a GitHub Release. Publishing uses the repository's short-lived `GITHUB_TOKEN`; no package publishing token is stored.

One-time repository setup remains intentionally outside the workflow:

- After the CI workflow has run on GitHub, protect `main` by requiring pull requests, one approval, and the `Verify package` status check.
- After the first publication, change the package visibility to **Public** in its package settings. GitHub does not allow a public package to be changed back to private.
- Grant each consuming repository package read access before using its `GITHUB_TOKEN` to install the package.
