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
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
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
  const sections = ['## Feedback', '', report.feedback.message.trim() || '_No message provided._'];

  if (options.screenshotUrl) {
    sections.push('', '## Screenshot', '', `![Annotated screenshot](${options.screenshotUrl})`);
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
