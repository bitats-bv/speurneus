import { maakRondes, schud } from './spelopbouw';
import type { ThemaPakket } from './themapakket';

const ids = ['blij', 'boos', 'verdrietig', 'bang'];
const pakket: ThemaPakket = {
  id: 'gevoelens',
  naam: 'Gevoelens',
  bron: 'standaard',
  vragen: ids.map((id) => ({
    id,
    vraagTekst: `Waar is Jules ${id}?`,
    vraagAudio: null,
    juistAntwoordId: id,
  })),
  antwoordopties: ids.map((id) => ({ id, afbeelding: `${id}.png` })),
};

describe('spelopbouw', () => {
  it('maakt het gevraagde aantal rondes met het juiste antwoord erbij', () => {
    const rondes = maakRondes(pakket, 3, 10);
    expect(rondes).toHaveLength(10);
    for (const r of rondes) {
      expect(r.opties).toHaveLength(3);
      expect(new Set(r.opties.map((o) => o.id)).size).toBe(3);
      expect(r.opties.map((o) => o.id)).toContain(r.vraag.juistAntwoordId);
    }
  });

  it('verdeelt de vragen gelijk en herhaalt nooit direct dezelfde vraag', () => {
    for (let poging = 0; poging < 50; poging++) {
      const rondes = maakRondes(pakket, 2, 8);
      const tellingen = new Map<string, number>();
      rondes.forEach((r, i) => {
        tellingen.set(r.vraag.id, (tellingen.get(r.vraag.id) ?? 0) + 1);
        if (i > 0) expect(r.vraag.id).not.toBe(rondes[i - 1].vraag.id);
      });
      expect([...tellingen.values()]).toEqual([2, 2, 2, 2]);
    }
  });

  it('begrenst het aantal opties tussen 2 en het aantal afbeeldingen', () => {
    expect(maakRondes(pakket, 1, 1)[0].opties).toHaveLength(2);
    expect(maakRondes(pakket, 9, 1)[0].opties).toHaveLength(4);
  });

  it('zet het juiste antwoord niet altijd op dezelfde plaats', () => {
    const plaatsen = new Set(
      maakRondes(pakket, 4, 40).map((r) =>
        r.opties.findIndex((o) => o.id === r.vraag.juistAntwoordId),
      ),
    );
    expect(plaatsen.size).toBeGreaterThan(1);
  });

  it('schud verandert de oorspronkelijke lijst niet', () => {
    const lijst = [1, 2, 3];
    schud(lijst);
    expect(lijst).toEqual([1, 2, 3]);
  });
});
