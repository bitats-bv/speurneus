import type { Antwoord, Kind, Spelsessie } from '../data/db';
import { maakOverzicht } from './overzicht';

const kind = (id: string): Kind => ({ id, klasId: 'k', voornaam: id, actief: true });
const sessie = (id: string, kindId: string, start: number): Spelsessie => ({
  id,
  kindId,
  themaId: 'gevoelens',
  aantalOpties: 2,
  aantalVragen: 2,
  start,
  status: 'klaar',
});
const antwoord = (
  sessieId: string,
  kindId: string,
  juist: boolean,
  tijdstip: number,
): Antwoord => ({
  id: `${sessieId}#${tijdstip}`,
  sessieId,
  kindId,
  themaId: 'gevoelens',
  vraagId: 'blij',
  gekozenOptieId: juist ? 'blij' : 'boos',
  juist,
  tijdstip,
});

describe('maakOverzicht', () => {
  it('telt juist en totaal per kind, nieuwste sessie eerst', () => {
    const o = maakOverzicht(
      [kind('lotte'), kind('noah')],
      [sessie('s1', 'lotte', 1), sessie('s2', 'lotte', 5)],
      [
        antwoord('s1', 'lotte', true, 2),
        antwoord('s1', 'lotte', false, 3),
        antwoord('s2', 'lotte', true, 6),
      ],
    );
    expect(o[0].juist).toBe(2);
    expect(o[0].totaal).toBe(3);
    expect(o[0].procent).toBe(67);
    expect(o[0].sessies.map((s) => s.sessie.id)).toEqual(['s2', 's1']);
    expect(o[0].laatst).toBe(5);
    expect(o[1].procent).toBeNull();
  });
});
