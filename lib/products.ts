// Standaard productcatalogus — initieel gevuld, uitbreidbaar via /producten
export type Product = {
  id: string
  merk: string
  naam: string
  artikelnummer: string
  omschrijving: string
  categorie: 'beveiliging' | 'kast' | 'laadpaal' | 'kabel' | 'meting' | 'overig'
  prijs?: number
  actief: boolean
  bevinding_tags: string[] // welke bevinding-categorieën triggeren dit product
}

export const DEFAULT_PRODUCTS: Omit<Product, 'id'>[] = [
  // ABB — Beveiliging
  {
    merk: 'ABB',
    naam: 'Aardlekautomaat 16A C-karakteristiek Type A',
    artikelnummer: 'DS201 C16 A30',
    omschrijving: 'Aardlekautomaat 1P+N 16A C-kar. 30mA Type A — standaard laadpaalgroep woning',
    categorie: 'beveiliging',
    prijs: 89.50,
    actief: true,
    bevinding_tags: ['rcd', 'laadpaal_groep'],
  },
  {
    merk: 'ABB',
    naam: 'Aardlekautomaat 16A C-karakteristiek Type B',
    artikelnummer: 'DS201 C16 B30',
    omschrijving: 'Aardlekautomaat 1P+N 16A C-kar. 30mA Type B — vereist bij bepaalde 3-fase omvormers',
    categorie: 'beveiliging',
    prijs: 149.00,
    actief: true,
    bevinding_tags: ['rcd', 'rcd_type_b'],
  },
  {
    merk: 'ABB',
    naam: 'Aardlekschakelaar 40A 2-polig Type A',
    artikelnummer: 'F202 A-40/0,03',
    omschrijving: 'Aardlekschakelaar 2P 40A 30mA Type A — vervanging bestaande RCD woning',
    categorie: 'beveiliging',
    prijs: 67.00,
    actief: true,
    bevinding_tags: ['rcd', 'rcd_vervanging'],
  },
  {
    merk: 'ABB',
    naam: 'Overspanningsbeveiliging Type 2',
    artikelnummer: 'OVR T2 1N 40 P TS',
    omschrijving: 'Overspanningsbegrenzer Type 2, 1P+N — aanbevolen bij nieuwe groepenkast',
    categorie: 'beveiliging',
    prijs: 112.00,
    actief: true,
    bevinding_tags: ['overspanning'],
  },
  {
    merk: 'ABB',
    naam: 'Automaat 16A B-karakteristiek',
    artikelnummer: 'SH201 B16',
    omschrijving: 'Installatieautomaat 1P 16A B-karakteristiek',
    categorie: 'beveiliging',
    prijs: 12.50,
    actief: true,
    bevinding_tags: ['beveiliging', 'groep_toevoegen'],
  },
  {
    merk: 'ABB',
    naam: 'Automaat 16A C-karakteristiek',
    artikelnummer: 'SH201 C16',
    omschrijving: 'Installatieautomaat 1P 16A C-karakteristiek — voor motorbelasting / laadpaal',
    categorie: 'beveiliging',
    prijs: 12.50,
    actief: true,
    bevinding_tags: ['beveiliging', 'laadpaal_groep'],
  },
  // Attema — Kasten
  {
    merk: 'Attema',
    naam: 'Groepenkast 1-rij 12 modules',
    artikelnummer: 'AT11080',
    omschrijving: 'Inbouw groepenkast 1 rij 12 modules — kleine uitbreidingen',
    categorie: 'kast',
    prijs: 45.00,
    actief: true,
    bevinding_tags: ['kast_te_klein', 'kast_vervangen'],
  },
  {
    merk: 'Attema',
    naam: 'Groepenkast 2-rij 24 modules',
    artikelnummer: 'AT11082',
    omschrijving: 'Inbouw groepenkast 2 rijen 24 modules — standaard woning',
    categorie: 'kast',
    prijs: 69.00,
    actief: true,
    bevinding_tags: ['kast_te_klein', 'kast_vervangen', 'kast_uitbreiden'],
  },
  {
    merk: 'Attema',
    naam: 'Groepenkast 3-rij 36 modules',
    artikelnummer: 'AT11084',
    omschrijving: 'Inbouw groepenkast 3 rijen 36 modules — uitgebreide woning / kleine zakelijk',
    categorie: 'kast',
    prijs: 95.00,
    actief: true,
    bevinding_tags: ['kast_te_klein', 'kast_vervangen'],
  },
  // Zaptec — Laadpalen
  {
    merk: 'Zaptec',
    naam: 'Zaptec Go2',
    artikelnummer: 'ZAP-GO2',
    omschrijving: 'Slimme laadpaal 7,4kW — standaard woning, inclusief app en loadbalancing',
    categorie: 'laadpaal',
    prijs: 549.00,
    actief: true,
    bevinding_tags: ['laadpaal_nieuw'],
  },
  {
    merk: 'Zaptec',
    naam: 'Zaptec Pro',
    artikelnummer: 'ZAP-PRO',
    omschrijving: 'Zakelijke laadpaal 22kW 3-fase — standaard zakelijk',
    categorie: 'laadpaal',
    prijs: 999.00,
    actief: true,
    bevinding_tags: ['laadpaal_nieuw_zakelijk'],
  },
  {
    merk: 'Zaptec',
    naam: 'Zaptec Sense P1',
    artikelnummer: 'ZAP-SENSE',
    omschrijving: 'P1-module voor slimme meter — loadbalancing bij meerdere laadpalen',
    categorie: 'meting',
    prijs: 89.00,
    actief: true,
    bevinding_tags: ['laadpaal_nieuw', 'loadbalancing'],
  },
  // Kabel
  {
    merk: 'Algemeen',
    naam: 'YMVK-as 5x4mm² (per meter)',
    artikelnummer: 'YMVK-5x4',
    omschrijving: '5-aderige installatiekabel 4mm² — standaard laadpaalgroep',
    categorie: 'kabel',
    prijs: 4.20,
    actief: true,
    bevinding_tags: ['laadpaal_groep', 'kabel_toevoegen'],
  },
  {
    merk: 'Algemeen',
    naam: 'YMVK-as 5x6mm² (per meter)',
    artikelnummer: 'YMVK-5x6',
    omschrijving: '5-aderige installatiekabel 6mm² — langere kabeltracés of hogere belasting',
    categorie: 'kabel',
    prijs: 5.80,
    actief: true,
    bevinding_tags: ['kabel_toevoegen'],
  },
]
