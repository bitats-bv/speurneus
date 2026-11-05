import type { PakketOptie, PakketVraag, ThemaPakket } from './themapakket';

/** Eén vraag zoals het kind ze krijgt: de vraag plus de getoonde opties in willekeurige volgorde. */
export interface Ronde {
  vraag: PakketVraag;
  opties: PakketOptie[];
}

export const MIN_OPTIES = 2;

/** Hoeveel antwoordopties maximaal kunnen bij dit thema. */
export function maxOpties(pakket: ThemaPakket): number {
  return pakket.antwoordopties.length;
}

/**
 * Stelt de rondes van een spel samen.
 * - Vragen worden gelijk verdeeld: elke vraag komt aan bod voor er één herhaald wordt,
 *   en dezelfde vraag komt nooit twee keer na elkaar (als er meer dan één vraag is).
 * - Het juiste antwoord zit altijd tussen de opties; de rest wordt willekeurig gekozen.
 * - De volgorde van de opties is altijd willekeurig.
 */
export function maakRondes(
  pakket: ThemaPakket,
  aantalOpties: number,
  aantalVragen: number,
  random: () => number = Math.random,
): Ronde[] {
  const optiesPerId = new Map(pakket.antwoordopties.map((o) => [o.id, o]));
  const vragen = pakket.vragen.filter((v) => optiesPerId.has(v.juistAntwoordId));
  if (vragen.length === 0 || aantalVragen < 1) return [];

  const n = Math.max(MIN_OPTIES, Math.min(aantalOpties, pakket.antwoordopties.length));
  const volgorde = verdeelVragen(vragen, aantalVragen, random);

  return volgorde.map((vraag) => {
    const juist = optiesPerId.get(vraag.juistAntwoordId)!;
    const afleiders = schud(
      pakket.antwoordopties.filter((o) => o.id !== juist.id),
      random,
    ).slice(0, n - 1);
    return { vraag, opties: schud([juist, ...afleiders], random) };
  });
}

function verdeelVragen<T>(vragen: T[], aantal: number, random: () => number): T[] {
  const uit: T[] = [];
  while (uit.length < aantal) {
    let ronde = schud(vragen, random);
    if (ronde.length > 1 && ronde[0] === uit.at(-1)) {
      ronde = [...ronde.slice(1), ronde[0]];
    }
    uit.push(...ronde);
  }
  return uit.slice(0, aantal);
}

/** Fisher–Yates; geeft een nieuwe array terug. */
export function schud<T>(lijst: readonly T[], random: () => number = Math.random): T[] {
  const kopie = [...lijst];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}
