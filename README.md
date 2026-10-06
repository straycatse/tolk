# Tolk

**Translation CSV editor for Shopify.** Edit the file from *Settings → Languages → Export* without breaking it.

Some Shopify strings can only be translated by exporting every translation to CSV, editing the file and importing it again. Spreadsheets make that risky: they mangle UTF-8, break multi-line HTML cells and give you no idea which of 20,000 rows still need work. Tolk understands the file.

> Your file never leaves your browser. Tolk has no server and stores nothing.

## Features

- **Grouped by resource**: products, collections, theme, metafields, menus, policies and more, with progress per group and language.
- **Find the gaps**: filter by missing, same as source, translated, edited or rows with issues.
- **Catches import breakers**: missing or unknown Liquid placeholders (`{{ count }}`) and unbalanced HTML are flagged before you import.
- **Export only what changed**: a small import file that can't overwrite translations you didn't touch.
- **Lossless round-trip**: unedited rows are written back byte for byte, including quoting, line endings and BOM.

## Usage

1. In Shopify admin, go to [**Settings → Languages**](https://admin.shopify.com/settings/languages) and click **Export**.
2. Open the CSV in Tolk and translate.
3. Click **Export changes** and import that file under [**Settings → Languages**](https://admin.shopify.com/settings/languages) → **Import**.

## Development

```sh
npm install
npm run dev     # start the dev server
npm test        # run the tests
npm run build   # production build in dist/
```

Built with React, TypeScript and Vite. The CSV parser is hand-written so that untouched cells keep their exact original text; see `src/lib/csv.ts`.

CI runs lint, tests and build on every push and pull request. The site is a static build, deployed on Vercel.

## License

MIT

---

Not affiliated with or endorsed by Shopify Inc.
