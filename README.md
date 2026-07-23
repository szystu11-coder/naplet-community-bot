# Naplet Community Bot

Bot Discord zawierający:

- prywatne tickety z przejmowaniem zgłoszeń i transcriptami,
- konkursy z automatycznym zakończeniem i ponownym losowaniem,
- logi wiadomości, członków, ról, kanałów, banów, voice i zmian serwera,
- powitania z własnym tekstem,
- weryfikację przyciskiem i automatyczną rolę dla nowych osób,
- konfigurację wykonywaną komendami slash.

## Wymagania

- Node.js 20 lub nowszy,
- bot utworzony w Discord Developer Portal.

## Instalacja

1. W Discord Developer Portal otwórz aplikację bota i w zakładce **Bot** włącz:
   - Server Members Intent,
   - Message Content Intent nie jest wymagany.
2. Zaproś bota z zakresami `bot` oraz `applications.commands`. Na start najprościej nadać mu uprawnienie Administrator; później można je ograniczyć.
3. Skopiuj `.env.example` jako `.env` i uzupełnij token, Application ID oraz ID serwera.
4. W terminalu uruchom:

```bash
npm install
npm start
```

## Konfiguracja na Discordzie

Po uruchomieniu użyj kolejno:

1. `/config channel` — ustaw kanał logów, powitań i logów ticketów.
2. `/config role` — ustaw role zweryfikowaną, niezweryfikowaną i obsługi.
3. `/config category` — ustaw kategorię, w której mają powstawać tickety.
4. `/config welcome` — opcjonalnie zmień powitanie. Dostępne zmienne: `{user}`, `{server}`, `{count}`.
5. `/verification-panel` — wyślij panel weryfikacji.
6. `/ticket-panel` — wyślij panel ticketów.

Konkurs uruchomisz przez `/giveaway start`. Czas podaje się np. jako `30m`, `2h`, `3d` lub `1w`. Komendy `/giveaway end` i `/giveaway reroll` korzystają z ID widocznego w wiadomości konkursowej.

> Rola bota musi znajdować się wyżej od ról weryfikacyjnych i ról, którymi ma zarządzać.

## Hosting na Render

Projekt zawiera `render.yaml` i endpoint `/health` potrzebny do uruchomienia jako Render Web Service.

1. Wyślij projekt do prywatnego repozytorium GitHub. Plik `.env` jest ignorowany i nie może trafić do repozytorium.
2. W Render wybierz **New > Blueprint** i podłącz repozytorium.
3. Podaj sekrety `DISCORD_TOKEN`, `CLIENT_ID` i `GUILD_ID` w ustawieniach usługi.
4. Po wdrożeniu skopiuj adres `https://nazwa-uslugi.onrender.com/health`.
5. W UptimeRobot utwórz monitor **HTTP(s)** dla tego adresu.

Darmowy Render używa nietrwałego systemu plików. Po restarcie lub ponownym wdrożeniu lokalne dane konfiguracji, ticketów i konkursów mogą zostać utracone. Do trwałego działania potrzebny jest płatny Persistent Disk albo zewnętrzna baza danych.
# Ekonomia Naplet Community

Ekonomia używa SQLite przez wbudowany moduł `node:sqlite` i automatycznie tworzy/migruje tabele przy pierwszym uruchomieniu. Wymagany jest Node.js `>=22.5.0`.

## Komendy

`/balance`, `/daily`, `/work`, `/crime`, `/deposit`, `/withdraw`, `/pay`, `/leaderboard`, `/shop`, `/buy`, `/inventory`, `/use` i `/rob`.

Nagrody, cooldowny, limity i sklep są w [src/economy/config.js](src/economy/config.js). Przykładowe przedmioty to `coffee`, `insurance` i `lucky-charm`.

## Baza danych

Domyślna ścieżka to `data/economy.sqlite`. Można ją zmienić przez `ECONOMY_DB_PATH`. Migrację/inicjalizację uruchamia:

```text
npm run economy:migrate
```

W środowisku Render ścieżka musi wskazywać na persistent disk albo zewnętrzną usługę przechowującą dane. Darmowy, efemeryczny dysk Rendera nie gwarantuje zachowania SQLite po odtworzeniu usługi. Przed wdrożeniem ustaw `ECONOMY_DB_PATH` na ścieżkę zamontowanego persistent disk i wykonaj `npm run economy:migrate`.

## Sklep

Przedmiot w `src/economy/config.js` ma pola `id`, `name`, `description`, `price`, `effect` i `consumable`. Efekty są parsowane w `useItem`, więc kolejne efekty można dodawać jako osobne moduły bez zmiany komend.
