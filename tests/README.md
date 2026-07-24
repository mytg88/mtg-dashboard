# Tests

Unit tests for the dashboard's pure helper functions, which live in `assets/helpers.js`.
`index.html` loads that file as a plain `<script src>` before its own inline script, so the
helpers are the same globals they always were; the export block at the bottom of the file only
runs under Node.

```bash
npm install
npm test          # run once
npm run coverage  # run with a coverage report (text + coverage/index.html)
```

Anything that touches the DOM, the Apps Script API or module-level dashboard state stays in
`index.html` and is not covered here.
