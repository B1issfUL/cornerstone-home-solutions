# Crescent Home Solutions — Landing Page

A responsive, dark-themed landing page for a real-estate home-buying company.
Built with React + Vite and plain CSS. No backend, no external APIs.

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints.

To build for production:

```bash
npm run build
npm run preview
```

## Structure

```
crescent-home-solutions/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx               # Page composition
    ├── index.css             # Design tokens, reset, shared styles
    └── components/
        ├── Header.jsx / .css          # Nav bar + mobile hamburger menu
        ├── Hero.jsx / .css            # Two-column hero
        ├── AddressForm.jsx / .css     # Validated address form
        ├── StatisticsPanel.jsx / .css # "Property Review Status" card
        ├── HowItWorks.jsx / .css      # Three numbered steps
        ├── Benefits.jsx / .css        # "Why Choose Us" grid
        ├── Contact.jsx / .css         # Contact card + CTA
        └── Footer.jsx / .css          # Legal links, disclaimer, copyright
```

## Form behavior

- Submission never refreshes the page and the address is never sent or stored.
- Input is trimmed; fewer than 5 characters shows:
  "Please enter a valid property address."
- A valid submission clears the input and shows:
  "Thank you. We received your address and will reach out soon."
- Feedback is announced to screen readers via an `aria-live` region.

## Accessibility

- Semantic landmarks (`header`, `main`, `section`, `footer`, `nav`)
- Labeled form field, visible focus styles, keyboard-navigable menu
- `aria-expanded` / `aria-controls` on the mobile menu toggle
- Respects `prefers-reduced-motion`
