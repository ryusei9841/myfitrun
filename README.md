# myfitrun

Strava と連携して、AI コーチ（Claude）があなたのランやウォークを評価し、
次の目標と練習メニューを提案する Web アプリ。

## スタック

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL
- Strava API (OAuth 2.0)
- Anthropic Claude API (`claude-sonnet-4-6`)

## セットアップ

### 1. Strava API アプリを作成

[Strava API Settings](https://www.strava.com/settings/api) で My API Application を作成。

- Authorization Callback Domain: `localhost`
- Client ID と Client Secret をメモ

### 2. 環境変数

`.env.example` を `.env.local` にコピーして値を埋める：

```bash
cp .env.example .env.local
```

必須項目：

- `DATABASE_URL` — ローカル Postgres の接続文字列
- `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET`
- `ANTHROPIC_API_KEY` — [console.anthropic.com](https://console.anthropic.com/) で取得
- `SESSION_SECRET` — `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` で生成

### 3. データベースをマイグレート

```bash
npx prisma migrate dev --name init
```

### 4. 開発サーバー起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

## 使い方

1. トップページで「Strava でログイン」
2. ダッシュボードで「Strava と同期」を押すと最近のラン/ウォークを取得
3. アクティビティを開いて「評価する」を押すと Claude が分析・コーチング

## 注意

- `.env.local` は絶対に Git にコミットしない（`.gitignore` 済み）
- Strava API の利用規約に従うこと
