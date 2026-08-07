import { describe, expect, it, vi } from 'vitest';
import { expectedCaptureDimensions } from '../../src/capture.js';
import { buildMetadata, createReport, reportToJson, validateFeedback } from '../../src/report.js';

describe('validateFeedback', () => {
  it('requires a useful message', () => {
    const result = validateFeedback('   ', '');
    expect(result.valid).toBe(false);
    expect(result.errors.message).toMatch(/describe/i);
  });

  it('normalizes valid values', () => {
    const result = validateFeedback('  The export button is clipped.  ', '  nils@example.com ');
    expect(result).toEqual({
      valid: true,
      errors: {},
      values: {
        message: 'The export button is clipped.',
        email: 'nils@example.com',
      },
    });
  });

  it('rejects malformed optional email addresses', () => {
    const result = validateFeedback('Something is wrong', 'not-an-email');
    expect(result.valid).toBe(false);
    expect(result.errors.email).toMatch(/valid email/i);
  });

  it('uses supplied validation messages', () => {
    const result = validateFeedback('', 'invalid', {
      feedbackRequired: 'Beskriv vad som hände.',
      invalidEmail: 'Ange en giltig e-postadress.',
    });
    expect(result.errors).toEqual({
      message: 'Beskriv vad som hände.',
      email: 'Ange en giltig e-postadress.',
    });
  });
});

describe('capture and report metadata', () => {
  it('caps viewport capture scale at 2x', () => {
    expect(expectedCaptureDimensions({ innerWidth: 800, innerHeight: 600, devicePixelRatio: 3 })).toEqual({
      width: 1600,
      height: 1200,
      scale: 2,
    });
  });

  it('builds a serializable report without embedding the image in JSON', () => {
    const image = new Blob(['png'], { type: 'image/png' });
    const now = new Date('2026-08-07T10:00:00.000Z');
    const randomUUID = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('report-id');
    const report = createReport({
      feedback: { message: 'A report', email: null },
      image,
      annotations: [{ id: 'a1', type: 'highlight' }],
      metadata: { url: 'http://localhost/' },
      now,
    });

    expect(report.id).toBe('report-id');
    expect(report.createdAt).toBe('2026-08-07T10:00:00.000Z');
    expect(report.image).toBe(image);
    expect(JSON.parse(reportToJson(report))).not.toHaveProperty('image');
    randomUUID.mockRestore();
  });

  it('collects viewport and page context', () => {
    const metadata = buildMetadata({
      capture: { width: 2048, height: 1536 },
      doc: { title: 'Demo page' },
      win: {
        location: { href: 'http://localhost/demo' },
        innerWidth: 1024,
        innerHeight: 768,
        devicePixelRatio: 2,
        navigator: { language: 'en-GB', userAgent: 'Test Browser' },
      },
    });

    expect(metadata).toMatchObject({
      url: 'http://localhost/demo',
      title: 'Demo page',
      viewport: { width: 1024, height: 768 },
      screenshot: { width: 2048, height: 1536, mimeType: 'image/png' },
      devicePixelRatio: 2,
    });
  });
});
