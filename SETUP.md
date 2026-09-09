# Setup

## 1. Assets that were deliberately left out

A few image files were removed from this template rather than genericized, since a placeholder
image would just be one more thing to notice and replace anyway. You need to supply these before
the app looks right (it will run without them, just with a few broken images):

| File | Used for | Notes |
|---|---|---|
| `web/public/logo.png` | Header/footer logo, app icon source | 506×493px in the original, but any square-ish image works |
| `web/assets/icon.png` | Capacitor app icon source | Same image as `logo.png` in the original |
| `web/assets/splash.png` | Capacitor splash screen source | Same image as `logo.png` in the original |
| `web/public/logo-jovenes.webp` | Youth ministry page logo | Only needed if you keep `MinisterioJovenesPage.tsx` as-is |

If you don't have Capacitor icon/splash assets ready yet, [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets)
can generate the full native icon/splash set from one source image once you add `logo.png`.

## 2. Install and configure

```bash
cd web
npm install
cp .env.example .env.local
```

Then pick one of the two setups below.

### Option A — a real Firebase project (recommended default; works for everyone, no extra installs)

1. Create a Firebase project (the free Spark plan is enough — Blaze is only needed if you deploy
   the optional Facebook/Instagram Cloud Function) at
   [console.firebase.google.com](https://console.firebase.google.com).
2. Enable Email/Password sign-in — Authentication → Sign-in method.
3. In `web/.env.local`, set `VITE_USE_FIREBASE_EMULATOR=false` and fill in the rest from your
   project's Project settings → General → Your apps → SDK setup and configuration. A YouTube Data
   API key, Formspree endpoints, and a Cloud Messaging VAPID key are all optional.
4. Deploy rules:
   ```bash
   firebase use --add
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

### Option B — the Firebase Local Emulator Suite (fully offline, no cloud project at all)

Requires a Java Runtime on your machine (the Firestore/Storage emulators run on it). If you don't
have Java and don't want to install it, use Option A instead — it's not a lesser path, just a
different one. The optional Facebook/Instagram Cloud Function still needs a real Meta App either
way, so this path is really about Auth/Firestore/Storage for the rest of the site.

1. Install Java if you don't have it (e.g. `brew install openjdk` on macOS), then confirm with
   `java -version`.
2. Leave `web/.env.local` as-is — its placeholder `demo-*` values and
   `VITE_USE_FIREBASE_EMULATOR=true` already match this path.
3. Run the emulators (separate terminal from `npm run dev`):
   ```bash
   firebase emulators:start
   ```
   The Emulator UI is at `http://127.0.0.1:4000`. Data resets every time you stop the emulators
   unless you add `--export-on-exit` / `--import`.

## 3. Bootstrap the first Pastor account

Once your backend (real or emulated) is up:

- Sign up once through the app's login screen (creates your `users/{uid}` doc).
- In the Firestore console, open that document and change `role` to `admin`.
- That account can then manage everyone else's role from the admin panel.

## 4. Local development

```bash
cd web
npm run dev      # start the dev server
npm run build    # type-check + production build
```

## 5. Customizing for your church

Branding and content live inline in components rather than a single config file — replace these:

| What | Where |
|---|---|
| Church name, tagline, page titles | `web/index.html`, `web/src/components/layout/SiteFooter.tsx`, `AppLogoLink.tsx`, `SiteHeader.tsx`, `HomePage.tsx`, `AboutPage.tsx` |
| Pastor's name | `web/src/pages/AboutPage.tsx` |
| Address | `web/src/pages/ContactPage.tsx` (`DEFAULT_ADDRESS`) |
| City/state (founding story, meta description) | `web/src/pages/AboutPage.tsx`, `web/index.html` |
| Facebook / YouTube links | `web/src/components/layout/SiteFooter.tsx` |
| YouTube channel handle | `web/src/lib/youtube.ts` (`CHANNEL_HANDLE`) |
| Logo/icon/splash images | see the table in step 1 |
| Ministry pages/content | `web/src/pages/Ministerio*.tsx`, `EscuelaDominicalPage.tsx`, `DiscipleshipPage.tsx` |
| Facebook/Instagram App IDs (if using the Cloud Function) | `functions/src/index.ts` — search for `REPLACE_WITH_YOUR_` |

Most editable site copy (hero text, about-page paragraphs, ministry descriptions) also has an
in-app admin edit mode once you're signed in as staff — look for the "Entrar en modo edición" menu
item — so a lot of customization can be done live rather than in code.

## 6. Deploying

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only hosting          # after npm run build in web/
firebase deploy --only functions        # only if using the optional social-media feature
```

## Project structure

```
church-website-template/
├── firebase.json / firestore.rules / firestore.indexes.json / storage.rules
├── functions/                # optional Facebook/Instagram OAuth Cloud Functions
└── web/
    └── src/
        ├── types/models.ts           # AppUser, Ministry, CalendarEvent, Rsvp
        ├── firebase/config.ts        # Firebase SDK init (reads web/.env.local)
        ├── contexts/                 # Auth, Theme, SiteText (editable content), SiteEditMode
        ├── hooks/usePermissions.ts
        ├── components/
        │   ├── layout/                # SiteHeader, SiteFooter, Layout, route guards
        │   ├── calendar/               # CalendarView, EventFormModal, EventDetailsModal
        │   ├── admin/                  # role/ministry management
        │   └── site/                   # marketing-page building blocks (carousels, editable slots)
        └── pages/                     # one file per route, see App.tsx for the route list
```
