# Деплой: один сервіс (бек + фронт) і Postgres

Бекенд (NestJS) сам віддає зібраний фронтенд, тож усе живе на одному домені:
httpOnly-куки сесії працюють без налаштувань між доменами, CORS не потрібен.
Образ збирається з кореня репозиторію через `Dockerfile`.

## Без оплати (Free-тариф)

Не задавайте жодних `STRIPE_*` змінних. Тоді:

- `GET /billing/status` повертає `{ "billingEnabled": false }`;
- на `/pricing` платні тарифи показуються з кнопкою «Скоро», картку прив'язувати ніде не треба;
- усі користувачі на Free (100 документів на місяць).

Щоб показати платний флоу на демо без справжніх грошей, задайте `STRIPE_SECRET_KEY=sk_test_…`
і запустіть `npm run stripe:setup` (див. `docs/billing-setup.md`). Реальні картки не потрібні.

## Змінні середовища

| Змінна | Навіщо |
|---|---|
| `DATABASE_URL` | рядок підключення до Postgres |
| `DATABASE_SSL` | `true`, якщо Postgres доступний через інтернет (Neon, Supabase) |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` | **нові** випадкові секрети, не ті, що були в старому `.env` |
| `PORT` | хостинг ставить сам |
| `FRONTEND_URL` | публічна адреса сайту, потрібна лише для Stripe-редіректів |

Згенерувати секрет:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`NODE_ENV=production` образ ставить сам: у цьому режимі куки отримують прапорці `Secure` і `SameSite=Lax`,
тому сайт має відкриватися по HTTPS (Render, Railway, Fly дають його автоматично).

## Кроки (Render або Railway)

1. Створіть керований **PostgreSQL** і скопіюйте його `DATABASE_URL` (internal, якщо сервіс на тій самій платформі).
2. Створіть **Web Service** з цього репозиторію, середовище Docker, `Dockerfile` у корені.
3. Додайте змінні з таблиці вище.
4. Деплой. Міграції виконуються самі при кожному старті контейнера (`scripts/migrate.js`), вони ідемпотентні.
5. Перевірка:
   - `https://<ваш-домен>/health` відповідає `Hello World!`;
   - `https://<ваш-домен>/` відкриває сайт, реєстрація та вхід працюють;
   - `https://<ваш-домен>/docs` — Swagger.

## Локальна перевірка образу

```bash
docker build -t anchorproof .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://johndoe:123@host.docker.internal:5433/chatapp \
  -e ACCESS_TOKEN_SECRET=dev -e REFRESH_TOKEN_SECRET=dev \
  anchorproof
```

На `http://localhost:3000` куки з `Secure` працюють у Chrome, у Safari і Firefox вхід по http може не спрацювати:
для перевірки без HTTPS додайте `-e NODE_ENV=development`.

## Відомі обмеження

- Анкорування поки mock у пам'яті сервера: після перезапуску перевірка кореня в ланцюжку для старих
  квитанцій покаже «недоступний» (доказ Меркла лишається валідним). Це лікується розгортанням
  `contracts/contracts/MerkleAnchor.sol` (запис у справжній блокчейн описано в docs/blockchain.md).
- Безкоштовні тарифи хостингів засинають без трафіку: перший запит після паузи повільний.
