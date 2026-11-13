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

## Безкоштовний деплой: Render + Neon (без картки)

Бекенд і фронтенд: один безкоштовний Web Service на **Render**. База: безкоштовний Postgres на **Neon**
(не береться Postgres від Render: безкоштовний там видаляється приблизно через 30 днів).
Перед реєстрацією перевірте актуальні умови обох сервісів: якщо Render попросить картку,
запасний варіант: Hugging Face Spaces (тип Docker, порт `7860`) із тією ж базою Neon.

### 1. База на Neon

1. Зареєструйтесь на neon.tech і створіть проєкт (регіон ближче до Render, наприклад Frankfurt).
2. Скопіюйте **connection string** (`postgresql://…@…neon.tech/neondb?sslmode=require`).

### 2. Сервіс на Render

1. Запуште гілку `production` (у репозиторії є `render.yaml`, він бере код саме з неї).
2. На render.com: **New → Blueprint**, підключіть GitHub-репозиторій, оберіть гілку `production`.
3. Коли Render запитає `DATABASE_URL`, вставте рядок із Neon. Інші змінні (`DATABASE_SSL`,
   нові `ACCESS_TOKEN_SECRET` і `REFRESH_TOKEN_SECRET`) уже описані в `render.yaml`.
4. Дочекайтесь збірки (кілька хвилин) і перевірте `https://<сервіс>.onrender.com/health`.

Оновлення: змінили код у `develop`, злили в `production`, і Render перебудує сервіс сам.

### 3. Блокчейн-анкорування (необов'язково)

Додайте вручну в **Environment** сервісу на Render: `ANCHOR_PRIVATE_KEY`, `ANCHOR_CHAIN_ID` (`80002` для
Polygon Amoy), `ANCHOR_CONTRACT_DOCUMENTS`. Використовуйте гаманець для тестової мережі, ключ не комітьте.
Поки сервіс спить, таймер анкорування не працює: накопичені хеші потраплять у ланцюжок після пробудження.

### 4. Сон безкоштовного сервісу

Після ~15 хвилин без запитів Render присипляє сервіс, перший запит потім триває 30–60 секунд.
Перед демонстрацією відкрийте сайт заздалегідь.

## Кроки (Render або Railway, платний Postgres)

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
