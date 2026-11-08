const REQUIRED_PROVIDER_METHODS = [
  'createIssue',
  'getIssue',
  'listIssues',
  'listComments',
  'addComment',
];

function assertProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new TypeError('A support issue provider is required.');
  }
  if (typeof provider.provider !== 'string' || !provider.provider.trim()) {
    throw new TypeError('Support issue provider must have a provider name.');
  }

  for (const method of REQUIRED_PROVIDER_METHODS) {
    if (typeof provider[method] !== 'function') {
      throw new TypeError(`Support issue provider must implement ${method}().`);
    }
  }
}

function cleanTitle(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

function titleFromMessage(message) {
  const firstLine = String(message ?? '').split(/\r?\n/, 1)[0];
  const title = cleanTitle(firstLine);
  if (!title) return 'In-app feedback';
  return title.length > 120 ? `${title.slice(0, 117).trimEnd()}...` : title;
}

function escapeTableValue(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .trim();
}

const ZERO_WIDTH_SPACE = '​';

// Control characters other than tab/newline/carriage return have no business in an issue body.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Escape characters that start inline Markdown formatting, HTML, or table cells. */
function escapeInlineMarkdown(text) {
  return text.replace(/[\\`*_~[\]<>&|]/g, '\\$&');
}

/** Break @mentions and issue references so GitHub neither notifies users nor cross-links issues. */
function neutralizeReferences(text) {
  return text
    .replace(/@(?=[\w-])/g, `@${ZERO_WIDTH_SPACE}`)
    .replace(/#(?=\d)/g, `#${ZERO_WIDTH_SPACE}`)
    .replace(/\b(GH)-(?=\d)/gi, `$1-${ZERO_WIDTH_SPACE}`);
}

/**
 * Make user-supplied text safe to embed inline in a GitHub Markdown list item:
 * one line, no inline formatting/HTML, and no mentions or issue references.
 */
function sanitizeInlineMarkdown(value) {
  const text = String(value ?? '').replace(CONTROL_CHARACTERS, '').replace(/\s+/g, ' ').trim();
  return neutralizeReferences(escapeInlineMarkdown(text));
}

/**
 * Make multi-line user-supplied text safe to embed as plain paragraphs in a GitHub
 * Markdown body. Line breaks are kept (GitHub renders them in issue bodies), but no
 * line can start a heading, list, quote, code block, rule or table, and inline
 * formatting, HTML, mentions and issue references are neutralized.
 */
function sanitizeMarkdownBlock(value) {
  const lines = String(value ?? '')
    .replace(CONTROL_CHARACTERS, '')
    .split(/\r\n|\r|\n/)
    // Leading whitespace would turn a line into an indented code block; trailing
    // double spaces are hard breaks. Neither carries meaning in plain feedback text.
    .map((line) => line.trim())
    .map((line) => escapeInlineMarkdown(line)
      // Block-level markers only matter at the start of a line. `*` is already escaped.
      .replace(/^([#>+=-])/, '\\$1')
      .replace(/^(\d+)([.)])/, '$1\\$2'))
    .map(neutralizeReferences);

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function commentAnnotations(report) {
  if (!Array.isArray(report.annotations)) return [];
  return report.annotations
    .filter((annotation) => annotation?.type === 'comment' && Number.isFinite(annotation.number))
    .sort((a, b) => a.number - b.number);
}

function renderContextRows(report, context, includeReporterEmail) {
  const metadata = report.metadata ?? {};
  const viewport = metadata.viewport;
  const screenshot = metadata.screenshot;
  const rows = [
    ['Report', report.id],
    ['Submitted', report.createdAt],
    ['Page', metadata.url],
    ['Page title', metadata.title],
    ['Viewport', viewport?.width && viewport?.height ? `${viewport.width}×${viewport.height}` : null],
    [
      'Screenshot',
      screenshot?.width && screenshot?.height
        ? `${screenshot.width}×${screenshot.height} (${screenshot.mimeType ?? 'unknown type'})`
        : null,
    ],
    ['Language', metadata.language],
    ['User agent', metadata.userAgent],
  ];

  if (includeReporterEmail) rows.splice(2, 0, ['Reporter', report.feedback?.email]);
  for (const [key, value] of Object.entries(context ?? {})) rows.push([key, value]);

  return rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim());
}

/**
 * Convert a browser FeedbackReport into a provider-neutral issue input.
 * The screenshot itself is never uploaded; backends can store it and pass its URL.
 */
export function feedbackReportToIssue(report, options = {}) {
  if (!report || typeof report !== 'object' || typeof report.feedback?.message !== 'string') {
    throw new TypeError('A feedback report with feedback.message is required.');
  }

  const title = cleanTitle(options.title) || titleFromMessage(report.feedback.message);
  const sections = ['## Feedback', '', sanitizeMarkdownBlock(report.feedback.message) || '_No message provided._'];

  if (options.screenshotUrl) {
    sections.push('', '## Screenshot', '', `![Annotated screenshot](${options.screenshotUrl})`);
  }

  const comments = commentAnnotations(report);
  if (comments.length) {
    // Pin numbers come from a monotonic counter, so deleting a pin leaves gaps (1, 3, ...).
    // A Markdown ordered list would renumber those, so the pin number is rendered explicitly.
    sections.push('', '## Annotations', '');
    for (const annotation of comments) {
      const text = sanitizeInlineMarkdown(annotation.comment) || '_No comment provided._';
      sections.push(`- **${annotation.number}.** ${text}`);
    }
  }

  if (options.includeTechnicalMetadata !== false) {
    const rows = renderContextRows(report, options.context, options.includeReporterEmail === true);
    if (rows.length) {
      sections.push('', '## Context', '', '| Field | Value |', '| --- | --- |');
      for (const [key, value] of rows) {
        sections.push(`| ${escapeTableValue(key)} | ${escapeTableValue(value)} |`);
      }
    }
  }

  return {
    title,
    body: sections.join('\n'),
    labels: options.labels ? [...options.labels] : undefined,
  };
}

/**
 * Create a provider-independent facade. Swap the provider without changing callers.
 */
export function createSupportIssueClient({ provider, formatFeedback = feedbackReportToIssue } = {}) {
  assertProvider(provider);
  if (typeof formatFeedback !== 'function') {
    throw new TypeError('formatFeedback must be a function.');
  }

  return Object.freeze({
    provider: provider.provider,
    forwardFeedback(report, options) {
      return provider.createIssue(formatFeedback(report, options));
    },
    createIssue(input) {
      return provider.createIssue(input);
    },
    getIssue(issueId) {
      return provider.getIssue(issueId);
    },
    listIssues(options) {
      return provider.listIssues(options);
    },
    listComments(issueId, options) {
      return provider.listComments(issueId, options);
    },
    addComment(issueId, body) {
      return provider.addComment(issueId, body);
    },
  });
}
