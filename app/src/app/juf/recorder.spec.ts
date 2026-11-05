import {
  MAX_OPNAME_MS,
  MELDING_GEEN_MICROFOON,
  MELDING_GEEN_TOEGANG,
  MELDING_ONVEILIG,
  Recorder,
  kiesMimeType,
  vertaalFout,
} from './recorder';

const fout = (name: string) => Object.assign(new Error(name), { name });

/** Minimale nep-MediaRecorder: levert één stuk audio bij stop. */
class NepRecorder {
  static isTypeSupported = (t: string) => t === 'audio/mp4';
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    public stream: unknown,
    public opties?: { mimeType?: string },
  ) {}
  get mimeType() {
    return this.opties?.mimeType ?? '';
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['geluid'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

describe('recorder', () => {
  it('kiest het eerste ondersteunde formaat', () => {
    expect(kiesMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(kiesMimeType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(kiesMimeType(() => false)).toBe('');
  });

  it('vertaalt fouten naar Nederlandse meldingen', () => {
    expect(vertaalFout(fout('NotAllowedError'))).toBe(MELDING_GEEN_TOEGANG);
    expect(vertaalFout(fout('NotFoundError'))).toBe(MELDING_GEEN_MICROFOON);
    expect(vertaalFout(fout('GeenOndersteuning'))).toBe(MELDING_ONVEILIG);
    expect(vertaalFout('iets anders')).toMatch(/Probeer opnieuw/);
  });

  describe('met nep-microfoon', () => {
    let gestopt: number;

    function zetMicrofoon(getUserMedia: () => Promise<unknown>) {
      vi.stubGlobal('MediaRecorder', NepRecorder);
      vi.stubGlobal('isSecureContext', true);
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia },
      });
    }

    beforeEach(() => {
      gestopt = 0;
      vi.useFakeTimers();
      zetMicrofoon(async () => ({ getTracks: () => [{ stop: () => gestopt++ }] }));
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('neemt op, geeft de blob terug en zet de microfoon uit', async () => {
      const r = new Recorder();
      await r.start();
      expect(r.neemtOp).toBe(true);
      vi.advanceTimersByTime(1200);
      const resultaat = await r.stop();
      expect(resultaat?.mimeType).toBe('audio/mp4');
      expect(resultaat?.duurMs).toBe(1200);
      expect(gestopt).toBe(1);
    });

    it('negeert een opname korter dan 300 ms', async () => {
      const r = new Recorder();
      await r.start();
      vi.advanceTimersByTime(100);
      expect(await r.stop()).toBeNull();
      expect(gestopt).toBe(1);
    });

    it('stopt vanzelf na 15 seconden', async () => {
      const auto = vi.fn();
      const r = new Recorder(auto);
      await r.start();
      await vi.advanceTimersByTimeAsync(MAX_OPNAME_MS);
      expect(auto).toHaveBeenCalledWith(expect.objectContaining({ duurMs: MAX_OPNAME_MS }));
      expect(r.neemtOp).toBe(false);
      expect(gestopt).toBe(1);
    });

    it('geeft een duidelijke melding als de microfoon geweigerd wordt', async () => {
      zetMicrofoon(() => Promise.reject(fout('NotAllowedError')));
      await expect(new Recorder().start()).rejects.toThrow(MELDING_GEEN_TOEGANG);
    });

    it('annuleren bewaart niets en zet de microfoon uit', async () => {
      const r = new Recorder();
      await r.start();
      r.annuleer();
      expect(r.neemtOp).toBe(false);
      expect(gestopt).toBe(1);
    });
  });
});
