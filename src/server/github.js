import { createPrivateKey, createSign } from 'node:crypto';

const DEFAULT_API_BASE_URL = 'https://api.github.com';
const DEFAULT_API_VERSION = '2026-03-10';
const USER_AGENT = '@franzen/feedback-tool';

export class SupportIssueProviderError extends Error {
  constructor(message, { provider, operation, status, response } = {}) {
    super(message);
    this.name = 'SupportIssueProviderError';
    this.provider = provider;
    this.operation = operation;
    this.status = status;
    this.response = response;
  }
}

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function positiveInteger(value, name) {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
  return parsed;
}

function parseRepository(repository) {
  const value = requiredString(repository, 'repository');
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(value);
  if (!match) throw new TypeError('repository must use the "owner/repo" format.');
  return `${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function normalizePrivateKey(value) {
  return requiredString(value, 'auth.privateKey').replace(/\\n/g, '\n');
}

function createAppJwt({ appId, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const encoded = [
    base64UrlJson({ alg: 'RS256', typ: 'JWT' }),
    base64UrlJson({ iat: now - 60, exp: now + 9 * 60, iss: String(appId) }),
  ].join('.');
  const signer = createSign('RSA-SHA256');
  signer.update(encoded);
  signer.end();
  return `${encoded}.${signer.sign(privateKey, 'base64url')}`;
}

function normalizeAuth(auth) {
  if (!auth || typeof auth !== 'object') throw new TypeError('auth is required.');

  if (auth.type === 'token') {
    const token = requiredString(auth.token, 'auth.token');
    return { getToken: async () => token };
  }

  if (auth.type !== 'app') {
    throw new TypeError('auth.type must be "app" or "token".');
  }

  const appId = requiredString(String(auth.clientId ?? auth.appId ?? ''), 'auth.clientId or auth.appId');
  const installationId = positiveInteger(auth.installationId, 'auth.installationId');
  const privateKey = createPrivateKey(normalizePrivateKey(auth.privateKey));
  let cachedToken = null;
  let pendingToken = null;

  return {
    async getToken(request) {
      const now = Date.now();
      if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.value;
      if (pendingToken) return pendingToken;

      pendingToken = (async () => {
        const jwt = createAppJwt({ appId, privateKey });
        const result = await request(
          `/app/installations/${installationId}/access_tokens`,
          { method: 'POST', token: jwt, tokenScheme: 'Bearer' },
          'authenticate',
        );
        const value = requiredString(result?.token, 'GitHub installation token');
        const expiresAt = Date.parse(result.expires_at);
        cachedToken = { value, expiresAt: Number.isFinite(expiresAt) ? expiresAt : now + 5 * 60_000 };
        return value;
      })();

      try {
        return await pendingToken;
      } finally {
        pendingToken = null;
      }
    },
  };
}

function asDate(value) {
  return value == null ? null : String(value);
}

function labelName(label) {
  return typeof label === 'string' ? label : label?.name;
}

function mapIssue(issue) {
  return {
    id: String(issue.number),
    provider: 'github',
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    status: issue.state,
    statusReason: issue.state_reason ?? null,
    url: issue.html_url,
    author: issue.user?.login ?? null,
    labels: (issue.labels ?? []).map(labelName).filter(Boolean),
    commentCount: issue.comments ?? 0,
    createdAt: asDate(issue.created_at),
    updatedAt: asDate(issue.updated_at),
    closedAt: asDate(issue.closed_at),
  };
}

function mapComment(comment) {
  return {
    id: String(comment.id),
    provider: 'github',
    body: comment.body ?? '',
    url: comment.html_url,
    author: comment.user?.login ?? null,
    authorType: comment.user?.type ?? null,
    createdAt: asDate(comment.created_at),
    updatedAt: asDate(comment.updated_at),
  };
}

function pagination(options = {}) {
  return {
    page: positiveInteger(options.page ?? 1, 'page'),
    perPage: Math.min(100, positiveInteger(options.perPage ?? 30, 'perPage')),
  };
}

function errorResponseBody(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  return { message: String(value) };
}

/** Create a server-side GitHub issue provider using a GitHub App or token. */
export function createGithubIssueProvider(options = {}) {
  const repository = parseRepository(options.repository);
  const apiBaseUrl = requiredString(options.apiBaseUrl ?? DEFAULT_API_BASE_URL, 'apiBaseUrl').replace(/\/$/, '');
  const apiVersion = requiredString(options.apiVersion ?? DEFAULT_API_VERSION, 'apiVersion');
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (typeof fetchImplementation !== 'function') throw new TypeError('A fetch implementation is required.');

  async function request(path, init = {}, operation = 'request') {
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': apiVersion,
      'User-Agent': USER_AGENT,
      ...init.headers,
    };
    if (init.token) headers.Authorization = `${init.tokenScheme ?? 'Bearer'} ${init.token}`;
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await fetchImplementation(`${apiBaseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch (cause) {
      throw new SupportIssueProviderError(`GitHub ${operation} request failed.`, {
        provider: 'github',
        operation,
        response: { message: cause instanceof Error ? cause.message : String(cause) },
      });
    }

    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!response.ok) {
      const details = errorResponseBody(body);
      const githubMessage = details?.message ? `: ${details.message}` : '';
      throw new SupportIssueProviderError(`GitHub ${operation} failed (${response.status})${githubMessage}`, {
        provider: 'github',
        operation,
        status: response.status,
        response: details,
      });
    }
    return body;
  }

  const auth = normalizeAuth(options.auth);

  async function authorizedRequest(path, init, operation) {
    const token = await auth.getToken(request);
    return request(path, { ...init, token }, operation);
  }

  return Object.freeze({
    provider: 'github',

    async createIssue(input = {}) {
      const title = requiredString(input.title, 'title');
      const body = input.body == null ? undefined : String(input.body);
      const labels = input.labels?.map((label) => requiredString(label, 'label'));
      const issue = await authorizedRequest(
        `/repos/${repository}/issues`,
        { method: 'POST', body: { title, body, labels } },
        'create issue',
      );
      return mapIssue(issue);
    },

    async getIssue(issueId) {
      const number = positiveInteger(issueId, 'issueId');
      const issue = await authorizedRequest(`/repos/${repository}/issues/${number}`, {}, 'fetch issue');
      return mapIssue(issue);
    },

    async listIssues(options = {}) {
      const { page, perPage } = pagination(options);
      const status = options.status ?? 'all';
      if (!['open', 'closed', 'all'].includes(status)) {
        throw new TypeError('status must be "open", "closed", or "all".');
      }
      const params = new URLSearchParams({
        state: status,
        page: String(page),
        per_page: String(perPage),
        sort: options.sort ?? 'updated',
        direction: options.direction ?? 'desc',
      });
      if (options.labels?.length) params.set('labels', options.labels.join(','));
      if (options.since) params.set('since', new Date(options.since).toISOString());

      const issues = await authorizedRequest(
        `/repos/${repository}/issues?${params}`,
        {},
        'list issues',
      );
      return issues.filter((issue) => !issue.pull_request).map(mapIssue);
    },

    async listComments(issueId, options = {}) {
      const number = positiveInteger(issueId, 'issueId');
      const { page, perPage } = pagination(options);
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      const comments = await authorizedRequest(
        `/repos/${repository}/issues/${number}/comments?${params}`,
        {},
        'list comments',
      );
      return comments.map(mapComment);
    },

    async addComment(issueId, body) {
      const number = positiveInteger(issueId, 'issueId');
      const commentBody = requiredString(body, 'body');
      const comment = await authorizedRequest(
        `/repos/${repository}/issues/${number}/comments`,
        { method: 'POST', body: { body: commentBody } },
        'add comment',
      );
      return mapComment(comment);
    },
  });
}
