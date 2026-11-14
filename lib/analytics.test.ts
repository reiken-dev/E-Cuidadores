import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from './analytics';

describe('analytics (sin proveedor)', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('no hace nada en el servidor', () => {
    expect(() => track('paywall_visto')).not.toThrow();
  });
  it('en el navegador solo escribe en la consola durante el desarrollo y nunca lanza', () => {
    vi.stubGlobal('window', {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    track('paywall_cta', { plan: 'anual' });
    expect(debug).toHaveBeenCalledWith('[track]', 'paywall_cta', { plan: 'anual' });
    debug.mockRestore();
  });
});
