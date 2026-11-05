import { Injectable, signal } from '@angular/core';

export interface SpelInstellingen {
  klasId: string;
  themaId: string;
  aantalOpties: number;
  aantalVragen: number;
}

const SLEUTEL = 'speurneus.spelinstellingen';

/**
 * Wat de juf koos voor deze speelronde. Blijft bewaard in sessionStorage zodat een
 * herlaad op de iPad (bv. na wisselen van app) de klas niet terug naar de juf stuurt.
 */
@Injectable({ providedIn: 'root' })
export class SpelInstellingenService {
  private readonly _huidig = signal<SpelInstellingen | null>(lees());
  readonly huidig = this._huidig.asReadonly();

  zet(instellingen: SpelInstellingen): void {
    this._huidig.set(instellingen);
    try {
      sessionStorage.setItem(SLEUTEL, JSON.stringify(instellingen));
    } catch {
      // Geen opslag (privévenster): instellingen blijven enkel in het geheugen.
    }
  }
}

function lees(): SpelInstellingen | null {
  try {
    const ruw = sessionStorage.getItem(SLEUTEL);
    return ruw ? (JSON.parse(ruw) as SpelInstellingen) : null;
  } catch {
    return null;
  }
}
