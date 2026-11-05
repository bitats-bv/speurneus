import { leesVoornamenUitCsv } from './csv';

describe('leesVoornamenUitCsv', () => {
  it('neemt de kolom Voornaam uit een Smartschool-achtige export met ;', () => {
    const csv = '﻿Naam;Voornaam;Klas\r\nPeeters;Lotte;K2A\r\nJanssens;Noah;K2A\r\n';
    expect(leesVoornamenUitCsv(csv)).toEqual(['Lotte', 'Noah']);
  });

  it('ondersteunt komma en aanhalingstekens', () => {
    const csv = 'voornaam,achternaam\n"Anne-Sophie","De Smet, jr."\n" Mila  Rose ",X\n';
    expect(leesVoornamenUitCsv(csv)).toEqual(['Anne-Sophie', 'Mila Rose']);
  });

  it('gebruikt de eerste kolom zonder herkende kop', () => {
    expect(leesVoornamenUitCsv('Lotte\nNoah\n\nlotte\n')).toEqual(['Lotte', 'Noah']);
  });

  it('valt terug op de kolom Naam', () => {
    expect(leesVoornamenUitCsv('Nr\tNaam\n1\tLotte\n2\tNoah')).toEqual(['Lotte', 'Noah']);
  });

  it('geeft een lege lijst voor een leeg bestand', () => {
    expect(leesVoornamenUitCsv('')).toEqual([]);
  });
});
