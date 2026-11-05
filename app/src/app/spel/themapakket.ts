/**
 * Meegeleverde themapakketten uit `public/themas/<id>/theme.json`.
 * Paden in theme.json zijn relatief aan de themamap; bij het laden maken we er
 * bruikbare URL's van.
 */

export interface PakketVraag {
  id: string;
  vraagTekst: string;
  vraagAudio: string | null;
  juistAntwoordId: string;
}

export interface PakketOptie {
  id: string;
  afbeelding: string;
  audio?: string | null;
}

export interface ThemaPakket {
  id: string;
  naam: string;
  icoon?: string;
  bron: 'standaard' | 'eigen';
  vragen: PakketVraag[];
  antwoordopties: PakketOptie[];
}

const BASIS = 'themas';

/** Ids van de meegeleverde thema's (`public/themas/index.json`). */
export async function laadThemaIds(): Promise<string[]> {
  return haalJson<string[]>(`${BASIS}/index.json`);
}

export async function laadThema(id: string): Promise<ThemaPakket> {
  const map = `${BASIS}/${id}`;
  const ruw = await haalJson<ThemaPakket>(`${map}/theme.json`);
  return maakPadenAbsoluut(ruw, map);
}

export async function laadAlleThemas(): Promise<ThemaPakket[]> {
  const ids = await laadThemaIds();
  return Promise.all(ids.map(laadThema));
}

export function maakPadenAbsoluut(pakket: ThemaPakket, map: string): ThemaPakket {
  const pad = (p: string) => `${map}/${p}`;
  return {
    ...pakket,
    icoon: pakket.icoon ? pad(pakket.icoon) : undefined,
    vragen: pakket.vragen.map((v) => ({
      ...v,
      vraagAudio: v.vraagAudio ? pad(v.vraagAudio) : null,
    })),
    antwoordopties: pakket.antwoordopties.map((o) => ({
      ...o,
      afbeelding: pad(o.afbeelding),
      audio: o.audio ? pad(o.audio) : null,
    })),
  };
}

async function haalJson<T>(url: string): Promise<T> {
  const antwoord = await fetch(url);
  if (!antwoord.ok) throw new Error(`Kon ${url} niet laden (${antwoord.status})`);
  return antwoord.json() as Promise<T>;
}
