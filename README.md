# Church Website Template

A full-stack website I originally built for my own church, pulled apart into a genericized
template so other developers — or churches without a website at all — can start from something
real instead of a blank repo. It includes a public site (home, about, ministries, blog, contact),
a role-based event calendar, and an admin panel for managing content and user roles.

Everywhere you see a `[bracket]`, that's on purpose — it's a placeholder that still needs your
own church's information before this looks like a real site, not something left over by mistake.


## What's Inside

Five roles — Pastor, Co-admin, Encargado (ministry leader), Ministry member, and Public — are
enforced server-side in Firestore's own security rules, not just hidden in the UI. Most of the
site's copy (hero text, about-page paragraphs, ministry descriptions) is also editable live from
an in-app admin mode, so a good chunk of customizing this for a real church doesn't require
touching code at all. The same codebase wraps with Capacitor into an iOS/Android app, and there's
an optional Cloud Function for connecting a church's Facebook/Instagram account.


## See It In Action

[Live example](https://comunidadcristianalapalabradefe.com) — a real church site built on this template

To run this yourself, see [SETUP.md](SETUP.md) — it covers environment setup, a couple of things
that were intentionally left out of this repo (like logo images), and how to customize it for
your own church.


## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router <br>
**Backend:** Firebase Authentication, Cloud Firestore, Storage, Cloud Messaging <br>
**Mobile:** Capacitor (iOS/Android) <br>
**Optional:** Cloud Functions (Facebook/Instagram OAuth) <br>
**Development Tools:** Git, Firebase CLI


## License

MIT © [Amyruth Rubio](https://github.com/amy14rubio) — see [LICENSE](LICENSE).
