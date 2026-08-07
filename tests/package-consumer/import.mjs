import assert from 'node:assert/strict';
import { createFeedbackTool, reportToJson } from '@franzen/feedback-tool';
import { createGithubIssueProvider, createSupportIssueClient } from '@franzen/feedback-tool/server';

assert.equal(typeof createFeedbackTool, 'function');
assert.equal(typeof reportToJson, 'function');
assert.equal(typeof createGithubIssueProvider, 'function');
assert.equal(typeof createSupportIssueClient, 'function');
