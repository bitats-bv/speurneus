/**
 * Kleine wrapper rond MediaRecorder om een vraag in te spreken. Geen Angular nodig.
 * Na elke opname worden alle microfoonsporen gestopt, zodat het lampje op de iPad uitgaat.
 */

export const MAX_OPNAME_MS = 15_000;
export const MIN_OPNAME_MS = 300;

const VOORKEUR = [
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/webm;codecs=opus',
  'audio/webm',
];

export interface OpnameResultaat {
  blob: Blob;
  mimeType: string;
  duurMs: number;
}

/** Eerste ondersteunde formaat; leeg = laat de browser kiezen. */
export function kiesMimeType(
  isTypeSupported: (t: string) => boolean = (t) => MediaRecorder.isTypeSupported(t),
): string {
  return VOORKEUR.find((t) => isTypeSupported(t)) ?? '';
}

export function kanOpnemen(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof isSecureContext === 'undefined' || isSecureContext)
  );
}

export const MELDING_GEEN_TOEGANG =
  'Geef Speurneus toegang tot de microfoon (Instellingen › Safari › Microfoon).';
export const MELDING_GEEN_MICROFOON = 'Geen microfoon gevonden.';
export const MELDING_ONVEILIG = 'Opnemen kan enkel via https of op deze iPad als beginscherm-app.';

/** Vertaalt een fout van getUserMedia/MediaRecorder naar een Nederlandse melding. */
export function vertaalFout(fout: unknown): string {
  const naam = (fout as { name?: string } | null)?.name;
  switch (naam) {
    case 'NotAllowedError':
    case 'SecurityError':
      return MELDING_GEEN_TOEGANG;
    case 'NotFoundError':
    case 'OverconstrainedError':
      return MELDING_GEEN_MICROFOON;
    case 'GeenOndersteuning':
      return MELDING_ONVEILIG;
    default:
      return 'Opnemen lukte niet. Probeer opnieuw.';
  }
}

export class Recorder {
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private stukken: Blob[] = [];
  private begin = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private bezigMetStoppen?: Promise<OpnameResultaat | null>;

  /** `opAutoStop` krijgt het resultaat als de opname na 15 s vanzelf stopt. */
  constructor(private readonly opAutoStop?: (r: OpnameResultaat | null) => void) {}

  get neemtOp(): boolean {
    return this.recorder?.state === 'recording';
  }

  /** Vraagt de microfoon en start. Gooit een Error met Nederlandse melding bij falen. */
  async start(): Promise<void> {
    if (this.neemtOp) return;
    try {
      if (!kanOpnemen()) throw Object.assign(new Error(), { name: 'GeenOndersteuning' });
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = kiesMimeType();
      this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      this.ruimOp();
      throw new Error(vertaalFout(e), { cause: e });
    }
    this.stukken = [];
    this.bezigMetStoppen = undefined;
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.stukken.push(e.data);
    };
    this.recorder.start();
    this.begin = Date.now();
    this.timer = setTimeout(() => {
      void this.stop().then((r) => this.opAutoStop?.(r));
    }, MAX_OPNAME_MS);
  }

  /** Stopt en geeft de opname; null als ze te kort was (per ongeluk getikt). */
  stop(): Promise<OpnameResultaat | null> {
    if (this.bezigMetStoppen) return this.bezigMetStoppen;
    const recorder = this.recorder;
    if (!recorder || recorder.state === 'inactive') {
      this.ruimOp();
      return Promise.resolve(null);
    }
    clearTimeout(this.timer);
    this.bezigMetStoppen = new Promise((klaar) => {
      recorder.onstop = () => {
        const duurMs = Math.min(Date.now() - this.begin, MAX_OPNAME_MS);
        const mimeType = recorder.mimeType || this.stukken[0]?.type || 'audio/mp4';
        const blob = new Blob(this.stukken, { type: mimeType });
        this.ruimOp();
        klaar(duurMs < MIN_OPNAME_MS || blob.size === 0 ? null : { blob, mimeType, duurMs });
      };
      recorder.stop();
    });
    return this.bezigMetStoppen;
  }

  /** Stopt zonder te bewaren (bv. bij wegnavigeren). */
  annuleer(): void {
    clearTimeout(this.timer);
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.ruimOp();
  }

  private ruimOp(): void {
    clearTimeout(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    this.recorder = undefined;
    this.stukken = [];
  }
}
