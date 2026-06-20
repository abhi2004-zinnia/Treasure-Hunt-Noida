# Firebase and hosting setup

This guide walks through creating a new Firebase project, wiring the web app config, enabling Firestore with usable rules, and hosting the static site so the treasure hunt (registration, gameplay, and admin) works end to end.

For game rules and customization, see [README.md](README.md).

---

## 1. Create the Firebase project

1. Open [Firebase Console](https://console.firebase.google.com) and sign in.
2. Click **Add project** (or **Create a project**).
3. Enter a project name (for example `office-treasure-hunt`) and continue.
4. **Google Analytics** is optional; you can disable it to keep the project minimal.
5. Click **Create project** and wait for it to finish.

---

## 2. Register a Web app and get `firebaseConfig`

The Web SDK needs a **client configuration object** (not a username/password). The `apiKey` identifies your app to Google’s services; **Firestore Security Rules** (step 5) control who can read and write data.

1. In the Firebase project overview, click the **Web** icon `</>` (**Add app** → **Web**).
2. Choose an app nickname (for example `treasure-hunt-web`) and register the app.
3. Copy the **`firebaseConfig`** object from the Firebase snippet. It looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX" // optional; Analytics only
};
```

### Where to paste it in *this* repository

- **`firebase-script.js`** — Replace the existing `firebaseConfig` object at the top of the file with your new values. The app calls `firebase.initializeApp(firebaseConfig)` from this file.
- **`firebase-config.js`** (optional but recommended) — Copy `firebase-config.sample.js` to `firebase-config.js` and fill in the same values. Several HTML pages load `firebase-config.js` before `firebase-script.js`; having a real file avoids 404s. If you later refactor so only `firebase-config.js` holds config, remove the duplicate from `firebase-script.js` and read `window.FIREBASE_CONFIG` once—until then, **keep `firebase-script.js` in sync** with the project you intend to use.

Do **not** commit real production keys to a public repo if you care about abuse; use private repos, environment-specific branches, or inject config at deploy time.

---

## 3. Create Firestore

1. In the left menu: **Build** → **Firestore Database**.
2. Click **Create database**.
3. Choose a **location** close to your players (hard to change later).
4. **Starting mode**
   - **Test mode** — Open read/write for a limited time. Fine for a quick internal demo; **set real rules before the deadline** (Firestore shows the expiry in the console).
   - **Production mode** — Starts locked down; you **must** publish rules (step 5) that allow the operations below, or the UI will fail (check the browser **Developer tools → Console** for permission errors).
5. Enable the database.

You do **not** need to create collections manually. The app creates documents on first use.

### Collections and documents the app uses

| Path | Purpose |
|------|--------|
| `teams/{teamId}` | Game state per team: progress, `taskOutputCodes`, history, leader/member names from registration, etc. |
| `submissions/{autoId}` | Append-only log rows when tasks are completed. |
| `registeredTeams/{teamId}` | Registration roster: leader, members, slot number, timestamps. |
| `meta/registrationGate` | Single document: `count` (how many of the five slots are used), `maxSlots`. |

After someone registers or plays, open **Firestore → Data** and expand these paths to inspect fields like a spreadsheet row.

### Index note

The admin roster listens to `registeredTeams` ordered by `registrationSlot`. Firestore usually provisions a single-field index automatically. If the console shows a **link to create an index**, open it once and publish.

---

## 4. Security rules (required for success)

If rules deny a read or write, features break (registration, tasks, admin refresh).

### Minimum paths your rules must allow (client SDK)

The static site performs reads and writes on:

- `teams/*`
- `submissions/*`
- `registeredTeams/*`
- `meta/registrationGate`

### Example: permissive rules for a **short internal test only**

Replace the expiry date with a **future** date, or switch to production rules as soon as possible.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /teams/{teamId} {
      allow read, write: if true;
    }
    match /submissions/{docId} {
      allow read, write: if true;
    }
    match /registeredTeams/{teamId} {
      allow read, write: if true;
    }
    match /meta/{docId} {
      allow read, write: if true;
    }
  }
}
```

Publish under **Firestore → Rules → Publish**.

**Important:** `allow read, write: if true` on `teams` lets any visitor read **every** team’s `taskOutputCodes` if they guess document IDs. For a public URL, tighten rules over time (scoped paths, Firebase Auth, admin-only deletes, etc.).

---

## 5. Host the static site

Deploy **all** HTML, CSS, and JS files together, including:

- `index.html`, `register.html`, `admin.html`
- `task1.html` … `task5.html`
- `firebase-script.js`, `style.css`
- `firebase-config.js` (your filled copy, not only the sample)

Examples:

- [Firebase Hosting](https://firebase.google.com/docs/hosting/quickstart)
- [GitHub Pages](https://pages.github.com/)
- Any static file host (S3 + CloudFront, Netlify, Azure Static Web Apps, etc.)

Ensure **HTTPS** is used in production (`crypto.getRandomValues` for codes expects a secure context in most browsers).

---

## 6. Run the event (checklist)

1. **Share the registration link** — Full URL to `register.html` (first five teams get slots; sixth sees a polite full message).
2. **Share the game entry** — `index.html` and/or QR codes pointing at `task1.html` … `task5.html` on the same origin (see `generate_qr_codes.py` for URL base).
3. **Organizers** — Open `admin.html` for **registered teams** table and **live leaderboard** (note: the admin page is not password-protected unless you add hosting/auth yourself).

---

## 7. Verify it works

1. Open `register.html` on the deployed URL; complete one test registration.
2. In Firestore **Data**, confirm `registeredTeams`, `teams`, and `meta/registrationGate` updated.
3. From `index.html`, start the hunt with the **same Team ID** as registration (letters/numbers only; spaces and symbols are stripped).
4. Complete task 1 and confirm `submissions` grows and `teams` updates.
5. Open `admin.html` and confirm roster and leaderboard update.

---

## 8. Optional: Analytics, Auth, Functions

- **Analytics** — Only if you enabled it and kept `measurementId` in config.
- **Authentication** — Not required by the current code; adding it would enable stricter Firestore rules later.
- **Cloud Functions** — Optional for server-side registration or code generation; the app runs entirely in the browser today.

---

## Troubleshooting

| Symptom | Things to check |
|--------|------------------|
| Blank page or “Firebase not defined” | Script load order: Firebase App + Firestore compat scripts before `firebase-script.js` (see any `task*.html` head). |
| Permission denied in console | Firestore rules; confirm all four path families are allowed for your test. |
| Registration always fails | Rules, network, and that `firebaseConfig` matches this project’s Firestore. |
| Admin roster empty | `registeredTeams` listener; rules; index link from console if query errors. |
| “Team is not registered” when playing | Team must use **register.html** first; Team ID must match the sanitized ID (same letters/numbers as shown after registration). |

---

## Related files in this repo

| File | Role |
|------|------|
| `firebase-script.js` | Firebase init, game logic, registration transaction, admin helpers. |
| `firebase-config.sample.js` | Template for `firebase-config.js`. |
| `register.html` | Public registration (five teams cap). |
| `admin.html` | Roster + leaderboard (clears `teams`, `submissions`, `registeredTeams`, resets gate). |
