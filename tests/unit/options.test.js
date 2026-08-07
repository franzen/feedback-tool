import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FEEDBACK_COLORS,
  DEFAULT_FEEDBACK_MESSAGES,
  formatMessage,
  normalizeOptions,
} from '../../src/options.js';

describe('feedback tool options', () => {
  it('merges message and color overrides with stable defaults', () => {
    const options = normalizeOptions({
      colors: { accent: '#005ea8', panel: '#f8fafc' },
      locale: 'sv',
      messages: { next: 'Nästa' },
    });

    expect(options.locale).toBe('sv');
    expect(options.messages).toMatchObject({ next: 'Nästa', retry: DEFAULT_FEEDBACK_MESSAGES.retry });
    expect(options.colors).toMatchObject({
      accent: '#005ea8',
      control: '#005ea8',
      panel: '#f8fafc',
      ink: DEFAULT_FEEDBACK_COLORS.ink,
    });
  });

  it('uses localized launcher text and formats count placeholders', () => {
    const options = normalizeOptions({ messages: { launcherLabel: 'Ge feedback' } });
    expect(options.launcher.label).toBe('Ge feedback');
    expect(formatMessage('{count} markeringar', { count: 3 })).toBe('3 markeringar');
  });

  it('keeps accentColor as a backwards-compatible alias', () => {
    const options = normalizeOptions({ accentColor: '#123456' });
    expect(options.colors).toMatchObject({ accent: '#123456', accentHover: '#123456', control: '#123456' });
  });
});
