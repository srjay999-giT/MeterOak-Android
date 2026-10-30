# MeterOak Android

An Android preview of **MeterOak**, an AI usage dashboard for exploring token usage, model breakdowns, and API cost estimates.

[**Live browser demo**](https://meteroak-android.vercel.app) · [**Download Android APK**](https://github.com/srjay999-giT/MeterOak-Android/releases) · [**Website & main repository**](https://github.com/srjay999-giT/MeterOak)

This preview works offline with bundled sample data. It does not access your AI accounts or local usage history. Cost figures are estimates, not bills.

## Portfolio mode

<img src="portfolio-overview.png" alt="Real MeterOak Android screenshot showing the green Portfolio usage overview" width="360">

*Real screenshot of version 0.1.1 running on an Android 14 emulator in the green Portfolio appearance.*

## Install

Download the APK from [Releases](https://github.com/srjay999-giT/MeterOak-Android/releases) and open it on **Android 12 or newer**. Allow installation from your browser or file manager if Android asks.

## Browser demo

The interactive web version includes all seven app screens, Portfolio and Original appearances, charts, filters, session details, temporary budget targets, and CSV downloads. It uses the same bundled sample data; connectivity is a future feature.

To run locally with Node.js 24:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4899`. Run `npm test` for data checks and `npm run build` for a production build. Vercel uses the included configuration to build and serve `dist/`.

For interaction checks, install the isolated test browser with `npx playwright install chromium`, start `npm run preview` after building, then run `npm run test:browser`.
