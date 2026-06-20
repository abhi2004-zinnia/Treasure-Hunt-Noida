# Treasure Hunt Noida

A fun, interactive office treasure hunt that uses QR codes for an engaging team adventure — Hindi clues, real-time progress, and an admin dashboard. **Owner & maintainer:** [Abhishek](https://github.com/abhi2004-zinnia). **Repository:** [github.com/abhi2004-zinnia/Treasure-Hunt-Noida](https://github.com/abhi2004-zinnia/Treasure-Hunt-Noida).

## Features

- QR code-based clue system
- Real-time progress tracking
- Admin dashboard for monitoring teams
- Multi-team support
- Customizable clues and locations
- **Per-team task codes** — each team gets its own random codes (stored in Firestore as `taskOutputCodes`); teams cannot reuse another team’s codes.
- **Capped registration** — share `register.html`; the first five teams to register get spots; the admin dashboard lists roster and live progress.

## Team registration (`register.html`)

- Share **`register.html`** (full URL on your host) with teams. The **first five** successful submissions are accepted; a sixth visitor sees a polite “spots are full” message.
- Each team enters a **team name** (stored as letters/numbers only), **leader** name, and up to **four** other members (five people including the leader).
- Registration writes to **`registeredTeams/{teamId}`** and **`teams/{teamId}`** in one transaction, and increments **`meta/registrationGate.count`**.
- **Firestore rules** must allow clients to read/write these paths (or use Cloud Functions for production). Without rules updates, registration may fail if your database is locked down.

## Per-team codes (how it works)

When a team is **first created** in Firestore, the browser generates four random 6-character codes (plus a fixed `WINNER` label for the final step). Those values are stored on the team document under **`taskOutputCodes`**. Task pages load the code to display and verify from Firestore, not from fixed HTML.

**Why browser generation (what we implemented):** this repo is a static site with no backend. It keeps deployment simple and matches GitHub Pages–style hosting.

**Stronger option — Cloud Functions:** codes generated in a Callable/HTTPS Cloud Function (or Admin SDK on create) are not derivable from client logic and are easier to pair with strict Firestore rules. Use that if you need stronger anti-tamper guarantees; you would create the team document (or `taskOutputCodes` field) only from the server.

**Migration:** teams that **already have progress** (`completedTasks >= 1`) but no `taskOutputCodes` field receive the **legacy** global codes (`TC441`, …) once so in-flight hunts are not broken. New teams never use those legacy values.

**Firestore rules:** if every client can read all `teams` documents, motivated players could read other teams’ codes. Prefer rules that only allow a team to read its own document (usually requires Firebase Auth with a custom claim or a signed token pattern).

## Quick start

1. Clone this repository

```bash
git clone https://github.com/abhi2004-zinnia/Treasure-Hunt-Noida.git
cd Treasure-Hunt-Noida
```

2. Serve locally over HTTP (needed for Firebase and crypto APIs in some browsers), then open `http://localhost:3000/index.html`:

```bash
npm run serve
```

Or use any static server (e.g. VS Code Live Server). Firebase defaults are in **`firebase-script.js`**; optional overrides go in **`firebase-config.js`** (see comments in that file and **[SETUP.md](SETUP.md)**).

3. Set up your own Firebase project when you are ready for production (full walkthrough: **[SETUP.md](SETUP.md)**)
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database and publish rules that allow `teams`, `submissions`, `registeredTeams`, and `meta/registrationGate`
   - Paste your config into **`firebase-config.js`** (uncomment `window.FIREBASE_CONFIG`) or edit the defaults in `firebase-script.js` for a fork

4. Configure Firebase security (important)
   - In Firebase Console → Project Settings → your Web API Key → restrict the key to your domains
   - Set up Firestore rules appropriate for your event

5. Customize clues
   - Edit clue text in `task1.html` through `task5.html`
   - Update clues in `firebase-script.js` if needed
   - Regenerate QR codes using `generate_qr_codes.py` (set `TREASURE_HUNT_BASE_URL` to your live site URL)

6. Generate QR codes

```bash
pip install -r requirements.txt
python generate_qr_codes.py
```

7. Deploy and play
   - Host all HTML, CSS, and JS on your web server or [GitHub Pages](https://pages.github.com/)
   - Print and place the QR codes
   - Share the start URL with participants
   - Monitor progress at `/admin.html`

## Security considerations

1. **Firebase configuration** — Client keys are public by design; protect data with **Firestore rules** and API key restrictions. Do not put service account JSON in this repo.
2. **Firestore rules** — Implement authentication or scoped rules as soon as you move beyond a trusted internal test.

## Customization

### Modifying clues

1. Edit the HTML files (`task1.html` - `task5.html`)
2. Update clue text in `firebase-script.js`
3. Regenerate QR codes if URLs change

### Adding/removing tasks

1. Adjust `taskOutputCodes` handling and task HTML files in `firebase-script.js`
2. Create/delete corresponding HTML files
3. Update the QR code generation script

### Task output codes

Per-team codes are generated in **`firebase-script.js`** (`createNewTaskOutputCodes`, `ensureTaskOutputCodes`). Clues remain global in `this.clues`; only the numeric codes differ per team.

## Contributing

Contributions are welcome. Please open a pull request on [Treasure-Hunt-Noida](https://github.com/abhi2004-zinnia/Treasure-Hunt-Noida). For major changes, open an issue first.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file. Copyright Abhishek (see LICENSE for years).

## Issues

Found a bug or have a suggestion? [Open an issue](https://github.com/abhi2004-zinnia/Treasure-Hunt-Noida/issues).
