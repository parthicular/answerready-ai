# Privacy and data handling

This document describes how AnswerReady AI handles data in a typical WordPress installation. It is intended for site owners, editors, and developers evaluating the plugin.

## Summary

- **Rule-based checks** run locally in the browser/editor. They do not send draft content to AnswerReady AI servers (there are no AnswerReady AI servers in the default plugin).
- **AI Review** sends draft content to **OpenAI** using the **site owner’s** API key, via your WordPress site’s REST API.
- The **OpenAI API key** is stored in the WordPress database and is **not** exposed to browser JavaScript.
- **Cached AI reviews** may be stored in the browser’s **localStorage** on the editor’s device.

## Rule-based checks (local)

SEO, AI Readiness, Human Signal, and Overall scores are calculated in the editor from the current draft title, excerpt, and content using client-side rules.

That analysis:

- Does not require an OpenAI API key
- Does not send draft text to third-party services as part of the default rule-based flow
- Updates as you edit the post in the block editor

## AI Review (OpenAI)

When an authorized user runs **AI Review**:

1. The editor sends the current **title**, **excerpt**, and **content** (and summary analysis metadata) to your WordPress site’s REST endpoint.
2. WordPress calls the **OpenAI API** using the API key saved in **Settings → AnswerReady AI**.
3. The API response is returned to the editor for display.

**Who controls the data:** The WordPress site owner configures the API key and is responsible for OpenAI account terms, retention, and compliance.

**Do not use AI Review on confidential drafts** unless your organization explicitly allows sending that content to OpenAI (or the model provider you configure).

## API key storage

- The OpenAI API key is stored in the WordPress options table for this install (`answerready_ai_options`).
- The key is used **server-side** only when handling the review REST request.
- The key is **not** included in localized script settings exposed to the browser (the editor receives a boolean such as whether a key exists, not the key itself).

Site administrators should protect WordPress admin access and follow standard secret-handling practices (backups, access control, key rotation).

## Browser localStorage cache

To reduce repeat API usage, the plugin may store in **localStorage**:

- A content fingerprint (hash) of the draft
- The last AI review result and related metadata (timestamp, word count, model name if available)

This cache is per browser and per post (or draft fallback key). It is not synced across users or devices unless the browser profile syncs localStorage.

Users can clear site data in the browser to remove cached reviews.

## What this plugin does not do

- **Does not claim to detect AI-written content.** It evaluates structure, specificity, sources, and editorial signals—not authorship detection.
- **Does not guarantee** search rankings, Google AI Overview inclusion, or citations in AI assistants.
- **Does not** automatically publish, replace, or delete post content without explicit editor action (insert actions add new blocks; they do not bulk-replace the post).

## Third-party services

AI Review relies on **OpenAI** (or whichever API endpoint your configured model uses). Their privacy policy and data processing terms apply to content sent through your API key.

Review OpenAI’s documentation and your organizational policies before enabling AI Review on production content.

## Site owner responsibilities

- Inform editors whether AI Review is approved for their workflows
- Restrict plugin settings to trusted administrators
- Use appropriate API keys, billing limits, and monitoring on the OpenAI account
- Comply with applicable privacy laws and internal data classification rules

## Questions

For plugin-specific questions, open an issue in the project repository. For legal or compliance decisions, consult your organization’s counsel or data protection lead.
