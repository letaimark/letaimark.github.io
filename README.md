# Ritmus — vitamin tracker

Egy reszponzív vitamin- és gyümölcs habit tracker heti és havi nézettel. Helyi fájlként továbbra is böngészőnként ment, GitHub Pagesen pedig Supabase-belépéssel két ember között valós időben szinkronizálható.

## Megnyitás

Nyisd meg az `index.html` fájlt közvetlenül bármely modern böngészőben. Nincs szükség telepítésre vagy build lépésre.

Az adatok a böngésző `localStorage` tárhelyére kerülnek, ezért ugyanabban a böngészőben és ugyanarról a fájlhelyről megnyitva megmaradnak. `file://` megnyitáskor a felhős belépés szándékosan nem indul el.

Ez a helyi Chrome-verzió a PWA-funkciók hozzáadása után is változatlanul használható. A service worker `file://` címről nem indul el, így nem zavarja a közvetlen fájlos használatot.

## Telepítés iPhone-ra PWA-ként

1. Töltsd fel a projekt összes fájlját egy HTTPS-t biztosító statikus tárhelyre, például GitHub Pagesre vagy Cloudflare Pagesre.
2. Nyisd meg a kapott címet az iPhone Safari böngészőjében.
3. Válaszd a **Megosztás → Főképernyőhöz adás** lehetőséget.
4. Kapcsold be a **Megnyitás webalkalmazásként** lehetőséget, majd nyomd meg a **Hozzáadás** gombot.

A telepített PWA offline is megnyílik. A már betöltött közös adatok helyben is megmaradnak; az offline pipálások a kapcsolat visszatérésekor szinkronizálódnak.

## Közös Supabase tracker beállítása

1. A Supabase Dashboardban nyisd meg a **SQL Editor → New query** oldalt.
2. Másold be és futtasd le a teljes `supabase-setup.sql` fájlt.
3. Az **Authentication → URL Configuration** oldalon állítsd a Site URL-t a GitHub Pages pontos HTTPS-címére, és add hozzá ugyanezt az Additional Redirect URLs listához.
4. Helyi teszteléshez külön redirectként használható például `http://localhost:5500/**`.
5. Töltsd fel az összes fájlt GitHub Pagesre, majd az oldalon kérj magic linket az e-mail-címedre.
6. Hozd létre a közös trackert, nyisd meg a jobb felső profilgombot, és küldd el a meghívólinket a másik résztvevőnek.

A `supabase-config.js` kizárólag a böngészőbe szánt publishable kulcsot tartalmazza. Secret vagy `service_role` kulcsot soha ne tegyél a projektbe.

Megjegyzés: külső e-mail-címekre küldött magic linkekhez a Supabase projektben saját SMTP szolgáltató beállítása válhat szükségessé.

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
- automatikus helyi mentés és offline szinkronsor
- kétfős, meghívókódos közös tracker
- e-mailes magic-link belépés
- valós idejű Supabase-szinkron RLS-védelemmel
- telepíthető PWA és offline indulás
- billentyűzetes és akadálymentes vezérlés
