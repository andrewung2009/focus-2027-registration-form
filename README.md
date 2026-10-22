# Focus 2027 Registration Form

A self-contained registration form for the Focus 2027 camp. Built with plain HTML, CSS and JavaScript (ES modules) — no frameworks, no build step. Node.js is used only to serve the form locally and run the tests.

## Features

- **Four registration types**
  - Just myself (1 adult, includes room selection)
  - Married couple (2 adults, one male and one female)
  - Family (up to 6 people: adults, youth, children)
  - Group of adult friends (2 or 4 adults rooming together)
- Per-person validation, including:
  - MyKad (Malaysian IC) checksums, state codes and birth-date matching, with auto-formatting as you type
  - Passport numbers with an issuing-country field
  - Phone numbers per country, with the leading 0 stripped automatically for Malaysian numbers
  - Date of birth bands (adult / youth / child) that keep each person in the correct section
  - CHTBB age limits (1–10) and youth program questions
- Email address collected for the first adult only
- Room selection for solo registrations, with an inline "I would like to room with ___" field; choosing "Assign me a roommate" clears the typed name
- Duplicate IC/passport detection across people in one registration
- Review page, success page with a reference code, and "Register another group" reset

## Running locally

1. Install Node.js (any recent version).
2. Run:

   ```bat
   start.bat
   ```

   or manually:

   ```sh
   npm start
   ```

3. Open the printed URL (http://localhost:5173 by default).

Submissions are posted to the `/api/register` local endpoint (configured in `config.js`) and appended to `data/registrations.jsonl` by `serve.js`. To use a real endpoint later, change `endpoint` in `config.js`.

## Testing

```sh
npm test        # unit tests (node --test)
```

Tests cover age banding, per-mode rules, and field validation, including the MyKad, phone, email and room-selection rules.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page shell and banner container |
| `styles.css` | All styling |
| `config.js` | Camp details, cutoff date and submission endpoint |
| `serve.js` | Local static server + registration receiver |
| `start.bat` | One-click launcher |
| `src/` | Application modules (schema, model, validation, UI, submission) |
| `tests/` | Node test suites |

## Key rules

- Ages are computed against the camp cutoff date (`config.js`): children born 2017 onward, youth born 2010–2016, adults born 2009 or earlier.
- A family registration is capped at 6 people; friends groups must have exactly 2 or 4 adults.
- Married couples must be one male and one female adult.
- Adding a person is blocked while an existing person in the same section has errors.
