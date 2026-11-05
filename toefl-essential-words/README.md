# Essential Words for TOEFL - 2026 Complete the Words Practice

Student-facing vocabulary study and fill-in-the-blank practice for all 500 entries in *Essential Words for the TOEFL, 7th Edition*.

## Live site

https://jenniferenglishteacher.github.io/Essential-words-for-TOEFL-7th-edition-fill-in-blanks-HTML-quiz/

## Included

- Motherboard with links to 30 unit pages
- 500 vocabulary entries with part of speech, English definition, Traditional Chinese definition, B1 context sentence, and US English text-to-speech
- Two 2026 TOEFL-style `Complete the Words` passage sets per unit
- 10 incomplete words per passage, first-half cues, two-attempt feedback, answer reveal, and local best-score tracking
- Automatic result submission to the teacher's `test result` Google Sheet tab
- Responsive desktop/mobile layout and print styles

## Result collector

The source for the Google Apps Script web app is in `apps-script/Code.gs`. Its deployed `/exec` URL is configured in `assets/config.js`.

## Rebuild

The source PDF stays outside this repository. With the bundled Python environment available:

```text
python tools/extract_book.py
python tools/translate_zh_tw.py
python tools/generate_site.py
```

TOEFL is a registered trademark of ETS. This independent classroom practice site is not endorsed or approved by ETS.
