# 🎯 Office Treasure Hunt Game

A fun and interactive treasure hunt game that uses QR codes to create an engaging office-wide adventure! Perfect for team building events, office parties, or just adding some excitement to the workday.

## 🌟 Features

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

**Why browser generation (what we implemented):** this repo is a static site with no backend. It keeps deployment simple and matches your current GitHub Pages style hosting.

**Stronger option — Cloud Functions:** codes generated in a Callable/HTTPS Cloud Function (or Admin SDK on create) are not derivable from client logic and are easier to pair with strict Firestore rules. Use that if you need stronger anti-tamper guarantees; you would create the team document (or `taskOutputCodes` field) only from the server.

**Migration:** teams that **already have progress** (`completedTasks >= 1`) but no `taskOutputCodes` field receive the **legacy** global codes (`TC441`, …) once so in-flight hunts are not broken. New teams never use those legacy values.

**Firestore rules:** if every client can read all `teams` documents, motivated players could read other teams’ codes. Prefer rules that only allow a team to read its own document (usually requires Firebase Auth with a custom claim or a signed token pattern).

## 🚀 Quick Start

1. Clone this repository
```bash
git clone https://github.com/yourusername/treasure-hunt-game.git
cd treasure-hunt-game
```

2. Set up Firebase (full walkthrough: **[SETUP.md](SETUP.md)**)
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database and publish rules that allow `teams`, `submissions`, `registeredTeams`, and `meta/registrationGate`
   - Copy `firebase-config.sample.js` to `firebase-config.js` and fill in values; **also** paste the same config into `firebase-script.js` (see SETUP.md)

3. Configure Firebase Security (Important!)
   - In Firebase Console, go to Project Settings
   - Find your Web API Key
   - Under "API Restrictions", restrict the key to your domains
   - Set up Firestore Rules to secure your data

4. Customize Clues
   - Edit the clue text in `task1.html` through `task5.html`
   - Update the clues in `firebase-script.js` if needed
   - Generate new QR codes using `generate_qr_codes.py`

5. Generate QR Codes
```bash
pip install -r requirements.txt
python generate_qr_codes.py
```

6. Deploy & Play!
   - Host the files on your web server
   - Print and place the QR codes
   - Share the start URL with participants
   - Monitor progress at `/admin.html`

## 🔒 Security Considerations

1. **Firebase Configuration**
   - Never commit `firebase-config.js` to version control
   - Use `firebase-config.sample.js` as a template
   - Restrict your Firebase API key to your domains

2. **Firestore Rules**
   - Implement proper authentication if needed
   - Restrict read/write access appropriately
   - Example rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
         // Or for public access with rate limiting:
         // allow read, write: if true;
       }
     }
   }
   ```

## 🛠️ Customization

### Modifying Clues
1. Edit the HTML files (`task1.html` - `task5.html`)
2. Update clue text in `firebase-script.js`
3. Regenerate QR codes if URLs change

### Adding/Removing Tasks
1. Adjust `taskOutputCodes` handling and task HTML files in `firebase-script.js`
2. Create/delete corresponding HTML files
3. Update the QR code generation script

### Task output codes
Per-team codes are generated in **`firebase-script.js`** (`createNewTaskOutputCodes`, `ensureTaskOutputCodes`). Clues remain global in `this.clues`; only the numeric codes differ per team.

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues

Found a bug or have a suggestion? Please open an issue on GitHub! 