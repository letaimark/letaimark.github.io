# Ritmus — vitamin tracker

Egy helyben futó, reszponzív vitamin- és gyümölcs habit tracker heti és havi nézettel.

## Megnyitás

Nyisd meg az `index.html` fájlt közvetlenül bármely modern böngészőben. Nincs szükség telepítésre vagy build lépésre.

Az adatok a böngésző `localStorage` tárhelyére kerülnek, ezért ugyanabban a böngészőben és ugyanarról a fájlhelyről megnyitva megmaradnak.

Ez a helyi Chrome-verzió a PWA-funkciók hozzáadása után is változatlanul használható. A service worker `file://` címről nem indul el, így nem zavarja a közvetlen fájlos használatot.

## Telepítés iPhone-ra PWA-ként

1. Töltsd fel a projekt összes fájlját egy HTTPS-t biztosító statikus tárhelyre, például GitHub Pagesre vagy Cloudflare Pagesre.
2. Nyisd meg a kapott címet az iPhone Safari böngészőjében.
3. Válaszd a **Megosztás → Főképernyőhöz adás** lehetőséget.
4. Kapcsold be a **Megnyitás webalkalmazásként** lehetőséget, majd nyomd meg a **Hozzáadás** gombot.

A telepített PWA offline is megnyílik. Az iPhone-on rögzített adatok az iPhone saját böngészőtárhelyén maradnak, és nem írják felül a számítógépen már meglévő Chrome-adatokat.

### PWA fájlok

- `manifest.webmanifest` — alkalmazásnév, színek és ikonok
- `service-worker.js` — offline alkalmazás-cache
- `pwa-register.js` — biztonságos service worker regisztráció
- `icons/` — iOS- és PWA-ikonok

## Funkciók

- heti nézet és hétváltás
- mobilos napi kártyanézet
- havi naptár és szerkeszthető napi részletek
- D-vitamin, reggeli magnézium, cink, esti magnézium és gyümölcs követése
- automatikus helyi mentés
- telepíthető PWA és offline indulás
- billentyűzetes és akadálymentes vezérlés
