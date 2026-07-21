# Naplet Community Bot

Customowy bot dla serwera Naplet Community.

## Funkcje

- `/ping` - test działania,
- `/serwer` - informacje o serwerze,
- `/wyczysc` - moderacyjne czyszczenie wiadomości,
- `/panel-ticket` - publikuje panel prywatnych ticketów,
- `/panel-weryfikacja` - publikuje panel weryfikacji,
- bezpieczne zamykanie ticketów bez automatycznego usuwania kanału.

## Uruchomienie

1. Skopiuj `.env.example` jako `.env`.
2. Uzupełnij `DISCORD_TOKEN`, `CLIENT_ID` i `GUILD_ID` z Discord Developer Portal.
3. Uzupełnij `TICKET_CATEGORY_ID`, `SUPPORT_ROLE_ID`, `VERIFIED_ROLE_ID` oraz `WELCOME_CHANNEL_ID`, jeśli używasz tych funkcji.
4. Uruchom `npm install`.
5. Zarejestruj komendy: `npm run deploy`.
6. Uruchom bota: `npm start`.

Nigdy nie wysyłaj tokena na czacie ani nie zapisuj go w repozytorium.
