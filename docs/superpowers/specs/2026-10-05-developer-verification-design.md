# Developer Verification Website Design

## Context

This repository is a collection of static HTML project, support, and policy pages published from the repository root on `main`. There is no framework, package manifest, build step, or GitHub Actions workflow. The repository has a `.nojekyll` file and a custom `404.html`, but no tracked top-level `index.html`; the root therefore does not currently have a normal homepage.

The repository already identifies Oskar Polster as the developer and lists `oskarpolster.business@gmail.com` as a contact address. Existing app directories provide project pages and, where present, support and privacy pages. Changes already present in `novus/` and untracked `aula/`, `overa/`, and `shottrace/` content belong to the user's local work and must not enter this task's commits.

## Goals

1. Make `https://oskar14156.github.io/` a real, responsive, publicly accessible homepage that returns HTTP 200.
2. Put the supplied Google Search Console verification tag exactly once inside the root homepage's `<head>`:

   ```html
   <meta name="google-site-verification" content="8AOThZMZqUVvmZpXsz2TkvNenVl_I-jNsZA8KAI0mUs" />
   ```

3. Add a professional independent developer profile at `/developer/`, returning HTTP 200.
4. Preserve the existing project URLs, app pages, legal pages, static publishing model, and deployment configuration.
5. Use only developer and contact information already present in this repository; do not invent business or registration details.
6. Commit only files created for this task, push to the existing `main` branch without rewriting history, and verify the deployed pages.

## Proposed structure and content

- `index.html` becomes the root portfolio homepage. It introduces Oskar Polster as an independent software developer and acts as a directory for project pages already present in the repository. It links to `/developer/` and to existing project roots, without implying that a project has a particular store listing or commercial status.
- `developer/index.html` is the official developer information page. It contains the developer name, a concise independent-developer statement, the existing contact email, a link back home, and links to existing project pages plus their support or privacy pages when those pages exist.
- `styles.css` supplies shared styling for the two new pages only. No existing project page is rethemed or modified.

Project links are to be derived from tracked project pages in the current `HEAD`. Untracked local app folders must not be exposed by this task's new pages. Use root-relative links so they work at both `/` and `/developer/`.

## Visual and interaction direction

Use a polished editorial portfolio aesthetic: a restrained dark-ink and warm-neutral foundation, one vivid accent, expressive but readable typography, generous spacing, and a clear project-card grid. The first screen should identify the developer and lead into the existing work, while the developer page should prioritize the profile and contact route. Keep the design lightweight, responsive, keyboard accessible, legible at high zoom, and respectful of reduced-motion preferences. Use local CSS and native HTML; add no external fonts, JavaScript framework, or image dependency.

Navigation should use descriptive labels and normal links. Project cards should make each destination clear. Visible focus indicators and sufficient text contrast are required; any hover motion must have a reduced-motion fallback.

## Metadata and access

- Give each page an accurate title, language, viewport, and description.
- Include the exact verification tag only in the root page's `<head>`; do not add a duplicate to the developer page.
- Do not add `noindex`, authentication, client-side redirect, or canonical metadata pointing away from the requested URLs.
- Keep navigation links within existing or newly created routes. Use HTTPS for absolute external links.

## Deployment and validation

There is no local build or test script. Before publishing, inspect both rendered source files and run focused static checks for HTML structure, the one exact verification tag inside the root `<head>`, absence of `noindex`/redirect behavior, and local links to existing files. Check the working tree and stage only the files for this task. Push the resulting commit to `origin/main` without force.

After the push, request both production URLs while following redirects. Confirm HTTP 200, HTTPS, the exact verification token in the live root HTML, a real developer page instead of the GitHub Pages 404, and deployment of the new commit. If the local shell cannot reach the public site, use another available HTTP-capable method and report any remaining verification limitation accurately.

## Out of scope

- Changes to existing app, support, privacy, legal, or deployment pages.
- Changes to DNS, GitHub account settings, or repositories outside this checkout.
- Invented legal entity, address, phone, email, D-U-N-S, or registration information.
- New dependencies, generated assets, analytics, forms, or application behavior.
