---
"@franzen/feedback-tool": patch
---

Include comment annotation text in issues created by the default `feedbackReportToIssue` formatter. Comments are listed under a new `## Annotations` section in pin order.

The feedback message and comment text are now sanitized before they are embedded in the issue body: @mentions and issue references (`#123`, `owner/repo#123`, `GH-123`) no longer notify users or cross-link issues, and Markdown/HTML in the reporter's text renders as plain text. Line breaks in the message are preserved.
