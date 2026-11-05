# Cornerstone Home Solutions

React/Vite website served by GitHub Pages at https://stonecornerhome.com/.

```sh
npm ci
npm run dev
npm run build
node scripts/check-public-build.mjs
```

## Public inquiries

The on-site inquiry form uses Google Places for address selection, validates contact
details and requires consent before submitting to Formspree. Formspree delivers to
the configured business inbox. Language and appearance choices stay in browser
storage. The owner's personal phone is not published.

Set the restricted Maps browser key and public Formspree form ID via the repository
Actions secrets shown in `.env.example`. Vite embeds both in the site; never use a
private credential for either setting.

## Owner dashboard

`/#/admin` is the legacy Firebase owner dashboard for internal property-review
statistics. The homepage no longer reads or displays that document. The Firebase
variables in `.env.example` are browser configuration, not server credentials.
Never put an upstream service credential in a Vite variable.

The rules in `firestore.rules` allow only the verified owner to get, create or update
the one stats document. They deny listing, deletion and other client document access.
**Pages does not publish these rules.** See [release and provider checklist](SECURITY-OPERATIONS.md).
