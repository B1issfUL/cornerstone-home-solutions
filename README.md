# Cornerstone Home Solutions

React/Vite website served by GitHub Pages at https://stonecornerhome.com/.

```sh
npm ci
npm run dev
npm run build
node scripts/check-public-build.mjs
```

## Public inquiries

The website directs inquiries to the business email. It does not load Maps or Firebase
on the homepage, collect contact details in a form, or send leads to Formspree.
Language and appearance choices stay in browser storage.

## Owner dashboard

`/#/admin` is the legacy Firebase owner dashboard for internal property-review
statistics. The homepage no longer reads or displays that document. The Firebase
variables in `.env.example` are browser configuration, not server credentials.
Never put an upstream service credential in a Vite variable.

The rules in `firestore.rules` allow only the verified owner to get, create or update
the one stats document. They deny listing, deletion and other client document access.
**Pages does not publish these rules.** See [release and provider checklist](SECURITY-OPERATIONS.md).
