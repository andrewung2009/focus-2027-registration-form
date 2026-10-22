# Focus 2027 Registration Form — Development Plan & Status

*A form for HTBB's Focus 2027 camp (16-18 September 2027, Amverton Cove Golf & Island Resort).*

Status as of 22 October 2026: the form is fully functional, tested, published to a private GitHub repository and available as a static site on GitHub Pages.

## Original scope (requirements)

Three camper sections — Adult, Youth and Child — with per-person fields:

- Adult: name, IC/passport, date of birth with automatic age calculation, gender, contact number, diet, ability to add extra adults
- Youth: same as adult, plus "Are you going to join the youth program?", ability to add extra youths
- Child: name, IC/passport, date of birth (child is valid from 1.5 to 10 years old as of 1 January 2028), gender, diet, "Are you going to join the CHTBB program?", ability to add extra children

## Current status

### Registration types
Implemented, in order of choice on the landing page:

| Mode | Rules |
| --- | --- |
| Just myself | 1 adult only; room selection required on the adult |
| Married couple | exactly 2 adults, one male + one female (enforced with per-person errors) |
| Family | 1+ adults, youth and/or children, capped at 6 people total |
| Adult friends rooming together | exactly 2 or 4 adults |

Sections outside the chosen mode are hidden; switching modes preserves completed people and prunes blank ones.

### Person fields
- **Name** — validated (letters only, length limits)
- **Email** — required on adult 1 only (the registration contact)
- **ID** — MyKad (12-digit, valid state code, birth date must match the date of birth, auto-formatting with dashes as you type) or passport (6-12 alphanumeric + required issuing-country select). Duplicate IC/passport numbers across people in one registration are rejected
- **Date of birth** — typed dd/mm/yyyy with auto-slashes, browser date picker fallback, live age label. Section bands: adult born 2009 or earlier, youth born 2010-2016, child born 2017 onward; mismatches tell the user which section to move the person to
- **Gender** — male/female radios
- **Contact number** — country selector (+60 · Malaysia first), E.164 normalisation, validation per country. For Malaysian numbers the leading 0 is stripped automatically as typed
- **Diet** — none/vegetarian/vegan/gluten free/other, notes required for "other"
- **Youth program / stay preference** — youth only
- **CHTBB program** — children only, restricted to ages 1.5-10 at Focus 2027 (born 02/01/2017 to 01/07/2026)

### Flow and UI
- Add buttons per section, gated so a person cannot be added while an existing one in the same section has errors; labels progress from "Add Youth" / "Add Child" to "Add another youth" / "Add another child"
- Remove buttons where the mode allows adults or extra youth/children
- Solo adults must answer room selection: twin sharing (with inline "I would like to room with ___" name field, or "Assign me a roommate" which clears a typed name) or single occupancy
- No separate "Check my form" — the Review registration button runs full validation, blocks on errors, and goes to the review page when clean
- Review page summarising every person; editable by returning to the form
- Submit posts the registration and shows a success page with a reference code and head count; "Register another group" resets to a fresh form

### Backend and storage
- `serve.js` serves the site locally (port 5173, auto-opens the browser) and accepts `POST /api/register`
- Submitted registrations are appended to `data/registrations.jsonl` (git-ignored)
- `config.js` currently points `endpoint` at the local `/api/register` route

### Testing
- 55 unit tests (`npm test`, Node's built-in test runner) covering age banding, mode rules, and field validation (MyKad, passport, phone, email, room selection, section mismatches, rally rules such as couple genders, friends group sizes and the family cap)
- Headless-browser smoke runs verified key flows end to end (email on adult 1, phone stripping, review gating, submit/reset cycle, room selection)
- `test.bat` and `npm test` both run the suite

### Version control and hosting
- Repository: <https://github.com/andrewung2009/focus-2027-registration-form> (private)
- Live site (GitHub Pages): <https://andrewung2009.github.io/focus-2027-registration-form/>
- Pages builds automatically from `main` on every push

## Known gaps / next steps

1. **Real submission endpoint** — the static GitHub Pages host cannot run `serve.js`, so submit fails on the live site until a real endpoint (e.g. Google Apps Script, church server) replaces `/api/register` in `config.js`. Locally this works today.
2. **Waiver / consent prompt** — the intro promises a Waiver (Adults) or Consent Form (Youths & Children) link at the end of registration; this prompt is not built yet.
3. **Pricing automation** — Early Bird vs Regular prices (until 31 May vs 1 June-31 July) are shown on the intro only; a payment step or auto-computed fee has not been designed.
4. Optional: email receipt to the address collected on adult 1, and export/admin tooling for the stored registrations.
