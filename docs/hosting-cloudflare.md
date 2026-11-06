# Speurneus online zetten met Cloudflare Pages

Speurneus is een statische app: Cloudflare bewaart enkel de code, de themapakketten en de
afbeeldingen. **Kindgegevens, foto's en opnames blijven altijd op de iPad** (IndexedDB) en
gaan nooit naar Cloudflare.

Bij elke push naar `main` bouwt Cloudflare de app opnieuw en zet hij de nieuwe versie online.
Elke pull request krijgt automatisch een eigen voorbeeldadres om te testen.

## Wat al in de repo zit

| Bestand | Waarvoor |
|---|---|
| `app/.node-version` | Cloudflare bouwt met Node 22 (nodig voor Angular 22) |
| `app/public/_headers` | Caching (service worker en `index.html` nooit lang cachen, gehashte bestanden wel) en veiligheidsheaders. Microfoon en camera mogen enkel door de app zelf gebruikt worden. |

Doorverwijzen van adressen zoals `/juf/klas/3` naar `index.html` hoeft niet apart:
Cloudflare Pages doet dat vanzelf voor een app zonder `404.html`.

## Eenmalig instellen (Birger)

1. **Account maken** op <https://dash.cloudflare.com/sign-up> (gratis plan, geen kredietkaart nodig).
2. Ga in het dashboard naar **Workers & Pages** › **Create** › tabblad **Pages** ›
   **Import an existing Git repository**.
   Kies je enkel de knop voor een *Worker*, zoek dan het kleine linkje "Looking to deploy
   Pages? Get started".
3. **GitHub koppelen**: klik **Connect GitHub**, kies het account `bitats-bv` en geef
   toegang tot **enkel** de repo `speurneus` ("Only select repositories").
4. Kies de repo `speurneus` en vul de build-instellingen in:

   | Veld | Waarde |
   |---|---|
   | Project name | `speurneus` (wordt `https://speurneus.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist/speurneus/browser` |
   | Root directory (advanced) | `app` |

5. Klik **Save and Deploy**. De eerste build duurt een paar minuten.
6. Open `https://speurneus.pages.dev` op de iPad in **Safari** › deelknop ›
   **Zet op beginscherm**. Daarna werkt de app ook zonder internet.

## Over de EU-regio

Op het gratis plan kun je bij Cloudflare Pages **geen regio kiezen**: de bestanden staan op
hun wereldwijde netwerk en worden geleverd vanuit het datacenter dicht bij de iPad (voor ons
Brussel of Amsterdam). Data-lokalisatie in de EU zit enkel in het dure Enterprise-plan.

Voor Speurneus is dat geen probleem, omdat er geen persoonsgegevens op de server staan.
Cloudflare ziet enkel, zoals elke webhost, het IP-adres van de iPad wanneer die de app
ophaalt. Wil je dat toch vermijden, dan is Azure Static Web Apps (regio West Europe) het
alternatief.

## Updates

- Push naar `main` = binnen enkele minuten online.
- De iPad haalt de nieuwe versie op bij de volgende keer dat de app opent met internet, en
  gebruikt ze vanaf de keer daarna (zo werkt de Angular service worker).
- Een fout gepubliceerde versie terugdraaien: in het Cloudflare-dashboard › project ›
  **Deployments** › oudere versie › **Rollback to this deployment**.

## Later: eigen domeinnaam

Project › **Custom domains** › **Set up a custom domain**, bv. `speurneus.schoolnaam.be`.
Cloudflare regelt het https-certificaat zelf. Let op: een ander adres is voor de iPad een
andere app, met een lege database. Kies dus het definitieve adres **voor** de juf echte
gegevens invoert.
