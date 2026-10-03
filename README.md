# PROFLIX PC — Real Firebase Login + Admin Upload

This project is a responsive PROFLIX-style web app for PC and mobile.

## Files

- `login.html` — real Firebase email/password login + account creation
- `index.html` — home page, search, K-Drama, movies, My List, downloads
- `profile.html` — real Firebase profile update
- `settings.html` — settings + password reset
- `admin.html` — protected admin upload panel
- `style.css` — PROFLIX UI
- `app.js` — Firebase Auth, Firestore, Storage logic

## Important: this is a REAL login

There is **no hard-coded demo username/password**. The login uses Firebase Authentication. Firebase's official web documentation uses `signInWithEmailAndPassword` for email/password sign-in. See:
https://firebase.google.com/docs/auth/web/password-auth

## 1. Create Firebase project

1. Open Firebase Console.
2. Create a project.
3. Add a Web App.
4. Copy the Firebase web configuration.
5. In `app.js`, replace the `PASTE_YOUR_...` values in `firebaseConfig`.

Firebase's current CDN setup supports browser module imports. This project uses the Firebase 12.19.0 CDN URLs.

## 2. Enable Authentication

Firebase Console → Authentication → Sign-in method → enable **Email/Password**.

Then open `login.html` and create your first account.

## 3. Create Firestore database

Create a Firestore database.

The app creates a user document automatically:

`users/{uid}`

Example:

```json
{
  "uid": "USER_UID",
  "displayName": "Your Name",
  "email": "you@example.com",
  "photoURL": "",
  "role": "user"
}
```

## 4. Make yourself an admin

After creating your account, copy your Firebase Authentication **User UID**.

In Firestore create:

`admins/{YOUR_UID}`

with:

```json
{
  "active": true
}
```

Now the same real account can open `admin.html`.

Do NOT put an admin password in JavaScript. Admin access is checked against Firebase.

## 5. Storage

Enable Firebase Storage.

The admin page uploads:
- poster image → `posters/...`
- video → `videos/...`

The URLs are saved into the `movies` Firestore collection.

## 6. Security Rules

Use the rules in `firestore.rules` and `storage.rules` from the project folder. These rules are designed so normal users cannot make themselves admins.

## 7. Run on PC

For local testing, use a local web server instead of opening the HTML files with `file://`.

If you have VS Code, install Live Server and open `login.html`.

Or with Python:

```bash
python -m http.server 5500
```

Then open:

`http://localhost:5500/login.html`

## 8. Deploy

You can deploy with Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

Select the project and the folder containing these files.

## Notes

- The Firebase web config is not a secret, but Firestore/Storage Security Rules are essential.
- Large movie/video files may need Firebase Storage billing/quotas depending on usage.
- The download button opens the Firebase Storage URL in the browser. For a production-grade forced-download system, configure Storage/CORS or serve downloads through a backend.
- For a public movie service, only upload content you have permission to distribute.
