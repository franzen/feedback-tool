---
'@franzen/feedback-tool': patch
---

Stop inlining `html2canvas-pro` into the browser bundle. It is now imported from the installed dependency, as documented, so host bundlers can deduplicate it and the package no longer ships a second, frozen copy.
