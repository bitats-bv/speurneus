import { db, type Antwoord, type Periode, type Spelsessie } from './db';
import { nieuwId } from './id';

/** Lokale datum als ISO-string (YYYY-MM-DD), zoals periodes ze bewaren. */
export function isoDatum(datum = new Date()): string {
  const m = String(datum.getMonth() + 1).padStart(2, '0');
  const d = String(datum.getDate()).padStart(2, '0');
  return `${datum.getFullYear()}-${m}-${d}`;
}

/** De periode van de klas waarin `datum` valt, als die bestaat. */
export async function periodeOp(klasId: string, datum = new Date()): Promise<Periode | undefined> {
  const dag = isoDatum(datum);
  const periodes = await db.periodes.where('klasId').equals(klasId).toArray();
  return periodes.find((p) => p.startdatum <= dag && dag <= p.einddatum);
}

export async function startSessie(gegevens: {
  kindId: string;
  klasId: string;
  themaId: string;
  aantalOpties: number;
  aantalVragen: number;
}): Promise<Spelsessie> {
  const periode = await periodeOp(gegevens.klasId);
  const sessie: Spelsessie = {
    id: nieuwId(),
    kindId: gegevens.kindId,
    themaId: gegevens.themaId,
    periodeId: periode?.id,
    aantalOpties: gegevens.aantalOpties,
    aantalVragen: gegevens.aantalVragen,
    start: Date.now(),
    status: 'bezig',
  };
  await db.sessies.add(sessie);
  return sessie;
}

/**
 * Bewaart het antwoord meteen. Eén poging per vraag: een tweede antwoord op dezelfde
 * vraag in dezelfde sessie wordt genegeerd en het eerste blijft staan.
 */
export async function bewaarAntwoord(gegevens: {
  sessie: Spelsessie;
  vraagNr: number;
  vraagId: string;
  gekozenOptieId: string;
  juistAntwoordId: string;
  reactietijdMs?: number;
}): Promise<Antwoord> {
  const { sessie } = gegevens;
  // Deterministische id per (sessie, vraagnummer): `add` faalt bij een dubbele tik.
  const id = `${sessie.id}#${gegevens.vraagNr}`;
  const antwoord: Antwoord = {
    id,
    sessieId: sessie.id,
    kindId: sessie.kindId,
    themaId: sessie.themaId,
    vraagId: gegevens.vraagId,
    gekozenOptieId: gegevens.gekozenOptieId,
    juist: gegevens.gekozenOptieId === gegevens.juistAntwoordId,
    reactietijdMs: gegevens.reactietijdMs,
    tijdstip: Date.now(),
  };
  return db.transaction('rw', db.antwoorden, async () => {
    const bestaand = await db.antwoorden.get(id);
    if (bestaand) return bestaand;
    await db.antwoorden.add(antwoord);
    return antwoord;
  });
}

export async function sluitSessie(
  sessieId: string,
  status: Exclude<Spelsessie['status'], 'bezig'>,
): Promise<void> {
  await db.sessies.update(sessieId, { status, einde: Date.now() });
}
