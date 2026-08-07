import type { FeedbackReport } from './index.js';

export type SupportIssueStatus = 'open' | 'closed';

export interface SupportIssue {
  id: string;
  provider: string;
  number?: number;
  title: string;
  body: string | null;
  status: SupportIssueStatus;
  statusReason: string | null;
  url: string;
  author: string | null;
  labels: string[];
  commentCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
}

export interface SupportIssueComment {
  id: string;
  provider: string;
  body: string;
  url: string;
  author: string | null;
  authorType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateSupportIssueInput {
  title: string;
  body?: string;
  labels?: string[];
}

export interface ListSupportIssuesOptions {
  status?: SupportIssueStatus | 'all';
  labels?: string[];
  page?: number;
  perPage?: number;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  since?: string | number | Date;
}

export interface ListSupportIssueCommentsOptions {
  page?: number;
  perPage?: number;
}

export interface SupportIssueProvider {
  readonly provider: string;
  createIssue(input: CreateSupportIssueInput): Promise<SupportIssue>;
  getIssue(issueId: string | number): Promise<SupportIssue>;
  listIssues(options?: ListSupportIssuesOptions): Promise<SupportIssue[]>;
  listComments(
    issueId: string | number,
    options?: ListSupportIssueCommentsOptions,
  ): Promise<SupportIssueComment[]>;
  addComment(issueId: string | number, body: string): Promise<SupportIssueComment>;
}

export interface FeedbackIssueOptions {
  title?: string;
  screenshotUrl?: string;
  labels?: string[];
  context?: Record<string, string | number | boolean | null | undefined>;
  includeReporterEmail?: boolean;
  includeTechnicalMetadata?: boolean;
}

export function feedbackReportToIssue(
  report: FeedbackReport,
  options?: FeedbackIssueOptions,
): CreateSupportIssueInput;

export interface SupportIssueClient extends SupportIssueProvider {
  forwardFeedback(report: FeedbackReport, options?: FeedbackIssueOptions): Promise<SupportIssue>;
}

export function createSupportIssueClient(options: {
  provider: SupportIssueProvider;
  formatFeedback?: (
    report: FeedbackReport,
    options?: FeedbackIssueOptions,
  ) => CreateSupportIssueInput;
}): SupportIssueClient;

export interface GithubAppAuthBase {
  type: 'app';
  installationId: string | number;
  /** PEM-encoded PKCS#1 or PKCS#8 private key. Escaped newlines are accepted. */
  privateKey: string;
}

export type GithubAppAuth = GithubAppAuthBase & (
  | {
      /** GitHub recommends the App client ID as the JWT issuer. */
      clientId: string;
      appId?: string | number;
    }
  | {
      clientId?: never;
      /** App ID is also accepted as the JWT issuer, matching older integrations. */
      appId: string | number;
    }
);

export interface GithubTokenAuth {
  type: 'token';
  token: string;
}

export interface GithubIssueProviderOptions {
  repository: `${string}/${string}`;
  auth: GithubAppAuth | GithubTokenAuth;
  apiBaseUrl?: string;
  apiVersion?: string;
  fetch?: (input: string | URL, init?: RequestInit) => Promise<Response>;
}

export function createGithubIssueProvider(options: GithubIssueProviderOptions): SupportIssueProvider;

export class SupportIssueProviderError extends Error {
  provider?: string;
  operation?: string;
  status?: number;
  response?: object | null;
}
