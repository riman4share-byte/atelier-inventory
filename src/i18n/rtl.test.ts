import { afterEach, describe, expect, it } from 'vitest';
import i18n, { languageDirection } from './index';

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('RTL switching', () => {
  it('maps Arabic to rtl and English to ltr', () => {
    expect(languageDirection('ar')).toBe('rtl');
    expect(languageDirection('en')).toBe('ltr');
  });

  it('sets lang and dir on the document when the language changes', async () => {
    await i18n.changeLanguage('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
