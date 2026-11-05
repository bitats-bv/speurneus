/**
 * Geluid in het spel. Een opgenomen audiobestand heeft voorrang; zonder bestand valt
 * het terug op de ingebouwde spraak van de iPad (werkt offline met lokale stemmen).
 * iOS laat geluid pas toe na een eerste tik: roep `ontgrendel()` aan in een tik-handler.
 */
let speler: HTMLAudioElement | null = null;
/** Elke nieuwe `speel` of `stop` maakt de vorige afloop ongeldig. */
let beurt = 0;
/** Beëindigt het wachten op een lopend audiobestand (bij `stop`). */
let afbreken: (() => void) | null = null;

export function ontgrendel(): void {
  speler ??= new Audio();
  // Een stille afspeelpoging binnen de tik ontgrendelt het element voor later.
  speler.muted = true;
  void speler.play().catch(() => undefined);
  speler.pause();
  speler.muted = false;
  if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
}

export function stop(): void {
  beurt++;
  afbreken?.();
  afbreken = null;
  speler?.pause();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

/**
 * Speelt de tekst of het audiobestand. Resolvet `true` als het geluid helemaal
 * uitgespeeld is, `false` als het onderbroken werd door een nieuwe `speel` of `stop`.
 */
export async function speel(tekst: string, audioUrl?: string | null): Promise<boolean> {
  stop();
  const mijn = beurt;
  if (audioUrl) {
    speler ??= new Audio();
    speler.src = audioUrl;
    try {
      const klaar = wachtOp(speler, 'ended');
      await speler.play();
      await klaar;
      return mijn === beurt;
    } catch {
      // Bestand ontbreekt of mag niet spelen: wachten opruimen en terugvallen op spraak.
      if (mijn !== beurt) return false;
      afbreken?.();
      afbreken = null;
    }
  }
  await spreek(tekst);
  return mijn === beurt;
}

function spreek(tekst: string): Promise<void> {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  const zin = new SpeechSynthesisUtterance(tekst);
  zin.lang = 'nl-BE';
  zin.rate = 0.85;
  const stem =
    speechSynthesis.getVoices().find((v) => v.lang === 'nl-BE') ??
    speechSynthesis.getVoices().find((v) => v.lang.startsWith('nl'));
  if (stem) zin.voice = stem;
  return new Promise((klaar) => {
    // Safari vuurt `end` niet altijd; daarom ook een ruime terugval op basis van de lengte.
    const reserve = setTimeout(klaar, 1500 + tekst.length * 100);
    zin.onend = zin.onerror = () => {
      clearTimeout(reserve);
      klaar();
    };
    speechSynthesis.speak(zin);
  });
}

/**
 * Wacht tot het bestand uitgespeeld is. Bewust géén `pause`-listener: het `pause`-event
 * van een vorige `stop()` komt asynchroon binnen en zou een korte opname meteen als
 * "klaar" laten gelden. Onderbreken loopt via `afbreken` in `stop()`.
 */
function wachtOp(el: HTMLAudioElement, gebeurtenis: string): Promise<void> {
  return new Promise((klaar, fout) => {
    const ac = new AbortController();
    const einde = () => {
      ac.abort();
      klaar();
    };
    afbreken = einde;
    el.addEventListener(gebeurtenis, einde, { signal: ac.signal });
    el.addEventListener(
      'error',
      () => {
        ac.abort();
        fout(new Error('audio'));
      },
      { signal: ac.signal },
    );
  });
}
