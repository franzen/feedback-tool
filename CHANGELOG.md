# @franzen/feedback-tool

## 0.3.2

### Patch Changes

- [#31](https://github.com/franzen/feedback-tool/pull/31) [`d8f6329`](https://github.com/franzen/feedback-tool/commit/d8f6329d2e6fda887a1d331140f55ef2d2096a14) Thanks [@franzen](https://github.com/franzen)! - Stop inlining `html2canvas-pro` into the browser bundle. It is now imported from the installed dependency, as documented, so host bundlers can deduplicate it and the package no longer ships a second, frozen copy.

## 0.3.1

### Patch Changes

- [#26](https://github.com/franzen/feedback-tool/pull/26) [`ca5f11e`](https://github.com/franzen/feedback-tool/commit/ca5f11e74ac03deb75d07ad354bec536809102b3) Thanks [@franzen](https://github.com/franzen)! - Fix the widget occasionally hanging on "Preparing…" for about 7 seconds after clicking Next (and a similar delay when opening the editor) on busy pages in Chromium-based browsers. Screenshots are now encoded synchronously instead of with `canvas.toBlob()`, which Chromium defers to idle time.

- [#26](https://github.com/franzen/feedback-tool/pull/26) [`ca5f11e`](https://github.com/franzen/feedback-tool/commit/ca5f11e74ac03deb75d07ad354bec536809102b3) Thanks [@franzen](https://github.com/franzen)! - Include comment annotation text in issues created by the default `feedbackReportToIssue` formatter. Comments are listed under a new `## Annotations` section in pin order.
  
  The feedback message and comment text are now sanitized before they are embedded in the issue body: @mentions and issue references (`[#123](https://github.com/franzen/feedback-tool/issues/123)`, `owner/repo#123`, `GH-123`) no longer notify users or cross-link issues, and Markdown/HTML in the reporter's text renders as plain text. Line breaks in the message are preserved.

## 0.3.0

### Minor Changes

- Add typed partial overrides for all widget messages and semantic colors, stable English defaults, and locale metadata for accessible localized integrations.
- Support CSS Color Level 4 values during page capture by using the modern-color-compatible html2canvas renderer.

## 0.2.0

### Minor Changes

- Add a server-only support issue abstraction with a GitHub provider for forwarding feedback, fetching issue status, listing issues and comments, and posting replies.

## 0.1.0

### Minor Changes

- [#1](https://github.com/franzen/feedback-tool/pull/1) [`c1489b5`](https://github.com/franzen/feedback-tool/commit/c1489b5fcb967d55bc96f538ae3887759f5621ce) Thanks [@franzen](https://github.com/franzen)! - Publish the initial ESM package with TypeScript declarations for the feedback widget and report payload.
