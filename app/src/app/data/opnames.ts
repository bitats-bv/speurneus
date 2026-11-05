import type { ThemaPakket } from '../spel/themapakket';
import { db, type Opname } from './db';

export function opnameId(themaId: string, vraagId: string): string {
  return `${themaId}/${vraagId}`;
}

/** Bewaart de opname; een vorige opname van dezelfde vraag wordt overschreven. */
export async function bewaarOpname(
  themaId: string,
  vraagId: string,
  audio: Blob,
  mimeType: string,
  duurMs: number,
): Promise<Opname> {
  const opname: Opname = {
    id: opnameId(themaId, vraagId),
    themaId,
    vraagId,
    audio,
    mimeType,
    duurMs,
    opgenomen: Date.now(),
  };
  await db.opnames.put(opname);
  return opname;
}

export async function wisOpname(themaId: string, vraagId: string): Promise<void> {
  await db.opnames.delete(opnameId(themaId, vraagId));
}

/** Opnames van één thema, per vraagId. */
export async function opnamesVoorThema(themaId: string): Promise<Map<string, Opname>> {
  const lijst = await db.opnames.where('themaId').equals(themaId).toArray();
  return new Map(lijst.map((o) => [o.vraagId, o]));
}

/**
 * Geeft een kopie van het pakket waarin `vraagAudio` naar de eigen opname wijst waar die
 * bestaat. Voorrang: eigen opname → audio uit het pakket → (null) computerstem.
 * De aangemaakte object-URL's komen mee terug zodat de aanroeper ze kan opruimen.
 */
export function metOpnames(
  pakket: ThemaPakket,
  opnames: Map<string, Opname>,
  maakUrl: (blob: Blob) => string = (b) => URL.createObjectURL(b),
): { pakket: ThemaPakket; urls: string[] } {
  const urls: string[] = [];
  const vragen = pakket.vragen.map((v) => {
    const opname = opnames.get(v.id);
    if (!opname) return v;
    const url = maakUrl(opname.audio);
    urls.push(url);
    return { ...v, vraagAudio: url };
  });
  return { pakket: { ...pakket, vragen }, urls };
}
