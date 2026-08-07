import assert from 'node:assert/strict';
import { createFeedbackTool, reportToJson } from '@franzen/feedback-tool';

assert.equal(typeof createFeedbackTool, 'function');
assert.equal(typeof reportToJson, 'function');
