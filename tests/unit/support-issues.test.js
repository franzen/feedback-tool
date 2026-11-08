import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createGithubIssueProvider,
  createSupportIssueClient,
  feedbackReportToIssue,
  SupportIssueProviderError,
} from '../../src/server/index.js';

function jsonResponse(body, init) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function githubIssue(overrides = {}) {
  return {
    number: 42,
    title: 'Export is clipped',
    body: 'Issue body',
    state: 'open',
    state_reason: null,
    html_url: 'https://github.com/acme/app/issues/42',
    user: { login: 'reporter' },
    labels: [{ name: 'feedback' }, 'bug'],
    comments: 2,
    created_at: '2026-08-07T10:00:00Z',
    updated_at: '2026-08-07T11:00:00Z',
    closed_at: null,
    ...overrides,
  };
}

function feedbackReport() {
  return {
    schemaVersion: 1,
    id: 'feedback-123',
    createdAt: '2026-08-07T10:00:00.000Z',
    feedback: {
      message: 'The export button is clipped.\nIt happens on a narrow screen.',
      email: 'reporter@example.com',
    },
    image: new Blob(['png'], { type: 'image/png' }),
    annotations: [],
    metadata: {
      url: 'https://app.example.com/export',
      title: 'Exports | Acme',
      viewport: { width: 390, height: 844 },
      screenshot: { width: 780, height: 1688, mimeType: 'image/png' },
      language: 'en-US',
      userAgent: 'Test Browser',
      devicePixelRatio: 2,
    },
  };
}

describe('feedbackReportToIssue', () => {
  it('creates an issue payload without leaking the optional email by default', () => {
    const issue = feedbackReportToIssue(feedbackReport(), {
      screenshotUrl: 'https://app.example.com/screenshots/feedback-123.png',
      labels: ['feedback', 'bug'],
      context: { Application: 'Admin portal', Version: '2.4.0' },
    });

    expect(issue.title).toBe('The export button is clipped.');
    expect(issue.labels).toEqual(['feedback', 'bug']);
    expect(issue.body).toContain('## Feedback');
    expect(issue.body).toContain('![Annotated screenshot](https://app.example.com/screenshots/feedback-123.png)');
    expect(issue.body).toContain('| Viewport | 390×844 |');
    expect(issue.body).toContain('| Application | Admin portal |');
    expect(issue.body).not.toContain('reporter@example.com');
  });

  it('can explicitly include the reporter and omit technical metadata', () => {
    const withReporter = feedbackReportToIssue(feedbackReport(), { includeReporterEmail: true });
    const withoutMetadata = feedbackReportToIssue(feedbackReport(), { includeTechnicalMetadata: false });

    expect(withReporter.body).toContain('| Reporter | reporter@example.com |');
    expect(withoutMetadata.body).not.toContain('## Context');
  });

  it('escapes existing backslashes before Markdown table separators', () => {
    const issue = feedbackReportToIssue(feedbackReport(), {
      context: { Custom: String.raw`path\|segment` },
    });

    expect(issue.body).toContain(String.raw`| Custom | path\\\|segment |`);
  });

  it('keeps plain feedback text and line breaks unchanged', () => {
    const issue = feedbackReportToIssue(feedbackReport());

    expect(issue.body).toContain('## Feedback\n\nThe export button is clipped.\nIt happens on a narrow screen.\n');
  });

  it('neutralizes mentions, issue references and Markdown in the feedback message', () => {
    const report = feedbackReport();
    report.feedback.message = [
      'Hi @octocat, same as #12 and acme/app#7 (GH-9)',
      '',
      '',
      '',
      '# Injected heading',
      '- list item',
      '> quote',
      '1. ordered',
      '    indented code',
      '---',
      '**bold** [link](https://evil.example) <img src=x> `code` a|b',
    ].join('\n');

    const { body } = feedbackReportToIssue(report);
    const feedback = body.slice(body.indexOf('## Feedback'), body.indexOf('## Context'));
    const ZWSP = '​';

    expect(feedback).toBe([
      '## Feedback',
      '',
      `Hi @${ZWSP}octocat, same as #${ZWSP}12 and acme/app#${ZWSP}7 (GH-${ZWSP}9)`,
      '',
      String.raw`\# Injected heading`,
      String.raw`\- list item`,
      String.raw`\> quote`,
      String.raw`1\. ordered`,
      'indented code',
      String.raw`\---`,
      String.raw`\*\*bold\*\* \[link\](https://evil.example) \<img src=x\> \`code\` a\|b`,
      '',
      '',
    ].join('\n'));
  });

  it('uses a placeholder for a blank feedback message', () => {
    const report = feedbackReport();
    report.feedback.message = ' \n\t ';

    expect(feedbackReportToIssue(report).body).toContain('## Feedback\n\n_No message provided._');
  });

  describe('annotations', () => {
    const bounds = { x: 0, y: 0, width: 24, height: 24 };
    const comment = (number, text) => ({
      id: `comment-${number}`,
      type: 'comment',
      number,
      comment: text,
      point: { x: 10, y: 10 },
      bounds,
    });
    const ZWSP = '​';

    it('omits the section when there are no comment annotations', () => {
      const report = feedbackReport();
      expect(feedbackReportToIssue(report).body).not.toContain('## Annotations');

      report.annotations = [
        { id: 'arrow-1', type: 'arrow', bounds, geometry: { bounds } },
        { id: 'redact-1', type: 'redact', bounds },
      ];
      expect(feedbackReportToIssue(report).body).not.toContain('## Annotations');

      delete report.annotations;
      expect(feedbackReportToIssue(report).body).not.toContain('## Annotations');
    });

    it('lists comments in pin order after the screenshot, keeping pin numbers', () => {
      const report = feedbackReport();
      report.annotations = [
        comment(3, 'Should be "Publish", not "Save"'),
        { id: 'arrow-1', type: 'arrow', bounds, geometry: { bounds } },
        comment(1, 'Button label is cut off here'),
      ];

      const { body } = feedbackReportToIssue(report, { screenshotUrl: 'https://example.com/s.png' });

      expect(body).toContain([
        '## Annotations',
        '',
        '- **1.** Button label is cut off here',
        '- **3.** Should be "Publish", not "Save"',
      ].join('\n'));
      expect(body.indexOf('## Screenshot')).toBeLessThan(body.indexOf('## Annotations'));
      expect(body.indexOf('## Annotations')).toBeLessThan(body.indexOf('## Context'));
    });

    it('neutralizes mentions, issue references, newlines and Markdown in comment text', () => {
      const report = feedbackReport();
      report.annotations = [
        comment(1, '@octocat see #123, acme/app#7 and GH-9'),
        comment(2, 'line one\n\n## Injected heading\r\n- item'),
        comment(3, '**bold** [link](https://evil.example) <img src=x> `code` a|b \\'),
        comment(4, '   '),
      ];

      const { body } = feedbackReportToIssue(report);

      expect(body).toContain(`- **1.** @${ZWSP}octocat see #${ZWSP}123, acme/app#${ZWSP}7 and GH-${ZWSP}9`);
      expect(body).not.toMatch(/@octocat|#123|#7|GH-9/);
      expect(body).toContain('- **2.** line one ## Injected heading - item');
      expect(body).not.toMatch(/^## Injected heading/m);
      expect(body).toContain(
        String.raw`- **3.** \*\*bold\*\* \[link\](https://evil.example) \<img src=x\> \`code\` a\|b \\`,
      );
      expect(body).toContain('- **4.** _No comment provided._');
    });
  });
});

describe('createSupportIssueClient', () => {
  it('forwards reports and exposes the provider-neutral read/comment API', async () => {
    const provider = {
      provider: 'test',
      createIssue: vi.fn().mockResolvedValue({ id: '1' }),
      getIssue: vi.fn(),
      listIssues: vi.fn(),
      listComments: vi.fn(),
      addComment: vi.fn(),
    };
    const client = createSupportIssueClient({ provider });

    await client.forwardFeedback(feedbackReport(), { title: 'Custom title' });
    expect(provider.createIssue).toHaveBeenCalledWith(expect.objectContaining({ title: 'Custom title' }));

    client.getIssue('1');
    client.listIssues({ status: 'open' });
    client.listComments('1');
    client.addComment('1', 'Any update?');
    expect(provider.getIssue).toHaveBeenCalledWith('1');
    expect(provider.listIssues).toHaveBeenCalledWith({ status: 'open' });
    expect(provider.listComments).toHaveBeenCalledWith('1', undefined);
    expect(provider.addComment).toHaveBeenCalledWith('1', 'Any update?');
  });
});

describe('createGithubIssueProvider', () => {
  it('creates and normalizes issues with token authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(githubIssue()));
    const provider = createGithubIssueProvider({
      repository: 'acme/app',
      auth: { type: 'token', token: 'secret-token' },
      fetch: fetchMock,
    });

    const issue = await provider.createIssue({
      title: 'Export is clipped',
      body: 'Steps to reproduce',
      labels: ['feedback'],
    });

    expect(issue).toEqual(expect.objectContaining({
      id: '42',
      provider: 'github',
      number: 42,
      status: 'open',
      labels: ['feedback', 'bug'],
      commentCount: 2,
    }));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/acme/app/issues',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }),
        body: JSON.stringify({ title: 'Export is clipped', body: 'Steps to reproduce', labels: ['feedback'] }),
      }),
    );
  });

  it('lists only issues, exposes status, and reads/writes comments', async () => {
    const comment = {
      id: 99,
      body: 'We are looking at it.',
      html_url: 'https://github.com/acme/app/issues/42#issuecomment-99',
      user: { login: 'maintainer', type: 'User' },
      created_at: '2026-08-07T12:00:00Z',
      updated_at: '2026-08-07T12:00:00Z',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([
        githubIssue({ state: 'closed', state_reason: 'completed' }),
        githubIssue({ number: 43, pull_request: { url: 'https://api.github.com/pulls/43' } }),
      ]))
      .mockResolvedValueOnce(jsonResponse([comment]))
      .mockResolvedValueOnce(jsonResponse(comment));
    const provider = createGithubIssueProvider({
      repository: 'acme/app',
      auth: { type: 'token', token: 'secret-token' },
      fetch: fetchMock,
    });

    const issues = await provider.listIssues({ status: 'all', labels: ['feedback'], perPage: 100 });
    const comments = await provider.listComments(42);
    const added = await provider.addComment('42', 'Any update?');

    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual(expect.objectContaining({ status: 'closed', statusReason: 'completed' }));
    expect(comments[0]).toEqual(expect.objectContaining({ id: '99', author: 'maintainer' }));
    expect(added.body).toBe('We are looking at it.');
    expect(fetchMock.mock.calls[0][0]).toContain('state=all');
    expect(fetchMock.mock.calls[0][0]).toContain('labels=feedback');
    expect(fetchMock.mock.calls[2][1].body).toBe(JSON.stringify({ body: 'Any update?' }));
  });

  it('authenticates as a GitHub App and caches installation tokens', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        token: 'installation-token',
        expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      }))
      .mockResolvedValueOnce(jsonResponse(githubIssue()))
      .mockResolvedValueOnce(jsonResponse(githubIssue()));
    const provider = createGithubIssueProvider({
      repository: 'acme/app',
      auth: {
        type: 'app',
        clientId: 'Iv1.test-client-id',
        installationId: '456',
        privateKey: privateKeyPem,
      },
      fetch: fetchMock,
    });

    await provider.getIssue(42);
    await provider.getIssue(42);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/app/installations/456/access_tokens');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toMatch(/^Bearer [^.]+\.[^.]+\.[^.]+$/);
    const jwt = fetchMock.mock.calls[0][1].headers.Authorization.replace('Bearer ', '');
    expect(JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())).toEqual(expect.objectContaining({
      iss: 'Iv1.test-client-id',
    }));
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer installation-token');
    expect(fetchMock.mock.calls[1][1].headers['X-GitHub-Api-Version']).toBe('2026-03-10');
  });

  it('returns a structured error without exposing credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(
      { message: 'Not Found' },
      { status: 404 },
    ));
    const provider = createGithubIssueProvider({
      repository: 'acme/app',
      auth: { type: 'token', token: 'do-not-leak' },
      fetch: fetchMock,
    });

    const error = await provider.getIssue(404).catch((caught) => caught);
    expect(error).toBeInstanceOf(SupportIssueProviderError);
    expect(error).toEqual(expect.objectContaining({
      provider: 'github',
      operation: 'fetch issue',
      status: 404,
    }));
    expect(error.message).toContain('Not Found');
    expect(JSON.stringify(error)).not.toContain('do-not-leak');
  });
});
