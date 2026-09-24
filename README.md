# Form

Paste rough text and turn it into an editable BlockNote document. Jev judges where blocks begin and which editor component each block should use. The source text stays available for comparison, and the edited result can be copied as Markdown.

## Run locally

Requires Node 22.13+ and a TypeSafe API key.

```sh
npm ci
cp .env.example .env
# Replace TYPESAFE_API_KEY in .env with your own key.
npm run dev
```

Open http://127.0.0.1:5173. The API runs on port 3001. If you already have a local `.env`, leave it in place; Git ignores it.

## How formatting works

The formatter lists source lines and punctuation, tab, and line-break offsets as possible cut locations. Jev sees the whole paste and makes three semantic judgments in order: whether each source line needs internal cuts, whether each eligible offset is a cut, and which BlockNote role each resulting block has. Questions run in parallel within each stage. The code uses Jev's choices directly; it does not interpret Markdown markers or override low-confidence choices.

The automatic flow creates editable headings, paragraphs, lists, checkboxes, toggles, quotes, code, and notes. It preserves each block's text, including literal Markdown markers. BlockNote offers its other components for manual editing; the automatic flow does not construct tables or media blocks from pasted text. Formatting sends source text to the TypeSafe API. The key is used only on the server.

## API

- `GET /api/health`: reports whether the formatter is configured.
- `POST /api/format-draft`: accepts `{ "text": "..." }` and returns editable blocks.

## Verify

```sh
npm run build
npm test
```

`npm start` serves a production build on port 3001. The server binds to loopback by default.

## Contributing and license

Contributions are welcome through pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and review requirements. This project is released under the [MIT license](LICENSE).
