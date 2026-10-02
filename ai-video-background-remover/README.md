# Video Background Remover: AI — support and legal site

This directory is the standalone static GitHub Pages site for the iOS app. It is separate from the `stub/` reference folder.

## App Store Connect URLs

- Support URL (English, with language chooser): https://oskar14156.github.io/ai-video-background-remover/
- Privacy Policy URL: https://oskar14156.github.io/ai-video-background-remover/privacy.html
- User Privacy Choices URL (optional): https://oskar14156.github.io/ai-video-background-remover/privacy-choices.html
- Terms URL: https://oskar14156.github.io/ai-video-background-remover/terms.html
- Data deletion: https://oskar14156.github.io/ai-video-background-remover/deletion.html
- Provider information: https://oskar14156.github.io/ai-video-background-remover/imprint.html

English and German pages are at the directory root; the German app-support section is linked with `#de`. Other locales use `/<locale>/<page>.html`, for example `/ja/privacy.html` and `/pt-BR/terms.html`. Each locale folder contains support, privacy, terms, deletion, provider, and privacy-choices pages.

Supported locale tags: `en`, `de`, `es`, `fr`, `it`, `pt-BR`, `ja`, `ko`, `zh-Hans`, `zh-Hant`, `nl`, `pl`, `tr`, `id`, `th`, `ar`, `nb`, `sv`, `da`.

## Translation and legal review

The English pages are the canonical source. Localized legal/support pages are draft translations and have not received native-speaker or legal review. Do not present them as approved legal translations. Review the exact release build, privacy disclosures, store configuration, and RevenueCat behavior before submission.

## Publishing

The parent `oskar14156.github.io` repository serves each top-level folder at its matching path. Stage and publish only `ai-video-background-remover/` for this app. Leave other app folders and pre-existing worktree changes untouched.

## Content boundary

The policy reflects the current implementation documented in the app repository: source videos are processed on-device, generated outputs and project metadata stay local, sharing is user-initiated, and purchase information can be processed by Apple and RevenueCat when purchases are configured. Update these pages if implementation or store disclosures change.
