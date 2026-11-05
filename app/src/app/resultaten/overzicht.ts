import type { Antwoord, Kind, Spelsessie } from '../data/db';

export interface SessieOverzicht {
  sessie: Spelsessie;
  antwoorden: Antwoord[];
  juist: number;
}

export interface KindOverzicht {
  kind: Kind;
  sessies: SessieOverzicht[]; // nieuwste eerst
  juist: number;
  totaal: number;
  /** Percentage juist, of null als er nog geen antwoorden zijn. */
  procent: number | null;
  laatst?: number;
}

/**
 * Groepeert sessies en antwoorden per kind. Telt enkel antwoorden van sessies die
 * door de filter komen, zodat een onvolledige sessie toch meetelt voor wat beantwoord is.
 */
export function maakOverzicht(
  kinderen: Kind[],
  sessies: Spelsessie[],
  antwoorden: Antwoord[],
): KindOverzicht[] {
  const perSessie = new Map<string, Antwoord[]>();
  for (const a of antwoorden) {
    const lijst = perSessie.get(a.sessieId) ?? [];
    lijst.push(a);
    perSessie.set(a.sessieId, lijst);
  }

  return kinderen.map((kind) => {
    const eigen = sessies
      .filter((s) => s.kindId === kind.id)
      .sort((a, b) => b.start - a.start)
      .map((sessie) => {
        const lijst = (perSessie.get(sessie.id) ?? []).sort((a, b) => a.tijdstip - b.tijdstip);
        return { sessie, antwoorden: lijst, juist: lijst.filter((a) => a.juist).length };
      });
    const totaal = eigen.reduce((n, s) => n + s.antwoorden.length, 0);
    const juist = eigen.reduce((n, s) => n + s.juist, 0);
    return {
      kind,
      sessies: eigen,
      juist,
      totaal,
      procent: totaal ? Math.round((juist / totaal) * 100) : null,
      laatst: eigen[0]?.sessie.start,
    };
  });
}
