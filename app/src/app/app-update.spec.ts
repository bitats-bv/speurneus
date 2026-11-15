import { isRustigScherm } from './app-update';

describe('isRustigScherm', () => {
  it('laat herladen toe op de start- en keuzeschermen', () => {
    for (const url of ['/', '', '/spel', '/spel/kinderen', '/juf', '/resultaten', '/juf/']) {
      expect(isRustigScherm(url)).toBe(true);
    }
  });

  it('negeert query en hash', () => {
    expect(isRustigScherm('/resultaten?kind=abc')).toBe(true);
    expect(isRustigScherm('/spel/kinderen#boven')).toBe(true);
  });

  it('herlaadt nooit tijdens een spel, opname of bewerking', () => {
    for (const url of ['/spel/speel/k1', '/juf/stem', '/juf/stem/dieren', '/juf/klas/k1']) {
      expect(isRustigScherm(url)).toBe(false);
    }
  });
});
