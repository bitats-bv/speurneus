/**
 * Klaslijst uit een CSV-bestand halen (bv. een export uit Smartschool of Excel).
 * Ondersteunt `;`, `,` en tab als scheidingsteken, aanhalingstekens en een BOM.
 * Zoekt een kolom "voornaam"; zonder herkende kop wordt de eerste kolom gebruikt.
 */
export function leesVoornamenUitCsv(tekst: string): string[] {
  const schoon = tekst.replace(/^﻿/, '');
  const regels = schoon.split(/\r\n|\n|\r/).filter((r) => r.trim() !== '');
  if (regels.length === 0) return [];

  const scheiding = raadScheidingsteken(regels[0]);
  const rijen = regels.map((r) => splitsRegel(r, scheiding));

  const kop = rijen[0].map((c) => c.trim().toLowerCase());
  let kolom = kop.findIndex((c) => c === 'voornaam' || c === 'first name' || c === 'firstname');
  let start = 1;
  if (kolom === -1) {
    const naamKolom = kop.findIndex((c) => c === 'naam' || c === 'name');
    if (naamKolom !== -1) {
      kolom = naamKolom;
    } else {
      kolom = 0;
      start = 0;
    }
  }

  const gezien = new Set<string>();
  const namen: string[] = [];
  for (const rij of rijen.slice(start)) {
    const naam = normaliseerNaam(rij[kolom] ?? '');
    const sleutel = naam.toLocaleLowerCase('nl');
    if (naam && !gezien.has(sleutel)) {
      gezien.add(sleutel);
      namen.push(naam);
    }
  }
  return namen;
}

export function normaliseerNaam(naam: string): string {
  return naam.trim().replace(/\s+/g, ' ');
}

function raadScheidingsteken(regel: string): string {
  const kandidaten = [';', '\t', ','];
  let beste = ';';
  let max = -1;
  for (const k of kandidaten) {
    const aantal = splitsRegel(regel, k).length;
    if (aantal > max) {
      max = aantal;
      beste = k;
    }
  }
  return beste;
}

function splitsRegel(regel: string, scheiding: string): string[] {
  const cellen: string[] = [];
  let huidig = '';
  let tussenQuotes = false;
  for (let i = 0; i < regel.length; i++) {
    const t = regel[i];
    if (tussenQuotes) {
      if (t === '"' && regel[i + 1] === '"') {
        huidig += '"';
        i++;
      } else if (t === '"') {
        tussenQuotes = false;
      } else {
        huidig += t;
      }
    } else if (t === '"') {
      tussenQuotes = true;
    } else if (t === scheiding) {
      cellen.push(huidig);
      huidig = '';
    } else {
      huidig += t;
    }
  }
  cellen.push(huidig);
  return cellen;
}
