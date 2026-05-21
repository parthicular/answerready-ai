# Beta testing guide

AnswerReady AI is in beta. This guide helps testers evaluate the plugin in real WordPress editorial workflows before a broader open-source release.

## Purpose of beta testing

Beta testing aims to:

- Confirm rule-based scores and checklists behave sensibly across different article types
- Validate AI Review, caching, and cost safeguards in everyday use
- Find UI, accessibility, and settings issues in the block editor sidebar
- Collect feedback on usefulness, clarity, and fairness—not to prove ranking or AI citation outcomes

AnswerReady AI does **not** guarantee search rankings, AI Overview inclusion, or AI citations.

## What testers should test

Focus on:

- **Gutenberg sidebar** — scores, recommendation, top fixes, collapsible checklists
- **Settings** — enabling/disabling sections, minimum recommended score, API key and model
- **AI Review** — run, cancel, cache reuse, changed vs unchanged drafts
- **Copy / Insert** — TL;DR, FAQs, Why this matters, full review copy
- **Edge cases** — empty drafts, very short posts, long posts, missing/invalid API keys

Use [TEST_LOG_TEMPLATE.md](TEST_LOG_TEMPLATE.md) to record results.

## Installation steps

1. Copy the `answerready-ai` folder into `wp-content/plugins/`.
2. In **Plugins**, activate **AnswerReady AI**.
3. Go to **Settings → AnswerReady AI** and configure checklist sections and minimum score.
4. Optionally add an **OpenAI API key** and **AI model** for AI Review tests.
5. Open a post in the **block editor** and locate the **AnswerReady AI** document sidebar panel.

Requirements:

- WordPress with the block editor (Gutenberg)
- Administrator or editor access to settings (for API key tests)
- OpenAI API key only for AI Review scenarios

## Recommended test article types

Prepare drafts (or reuse existing content) that represent how you publish:

| Type | Why it matters |
|------|----------------|
| News article | Timeliness, sources, structure |
| Evergreen guide | Depth, headings, internal links |
| B2B blog post | Excerpt, implications, credibility |
| Local journalism | Specific place names, dates, sources |
| Opinion / analysis | Editorial voice, “why this matters” |
| Product comparison | Claims, entities, external links |

Also test synthetic edge cases listed below (empty, short, no links, etc.).

## Specific test scenarios

Run each scenario in a **new or duplicated draft** when possible. Log results in the test template.

### Content shape

1. **Empty draft** — no title, no body. Expect sensible empty-state scores and messaging; AI Review should fail gracefully or warn.
2. **Very short article** — under ~100 words. Note whether scores and suggestions feel appropriate.
3. **Long article over 2,000 words** — check sidebar performance, word-count label, and AI Review cost label (high estimated use).
4. **Article with no links** — confirm failed checks for internal/external links where expected.
5. **Article with many links** — confirm link-related checks pass or behave as expected.
6. **Article with existing TL;DR / FAQ / Why this matters** — confirm matching checks pass; test copy/insert does not remove existing blocks.

### Article types (content realism)

7. **News article**
8. **Evergreen guide**
9. **B2B blog post**
10. **Local journalism article**
11. **Opinion / analysis article**
12. **Product comparison article**

For each, note whether **SEO**, **AI Readiness**, and **Human Signal** scores align with your editorial judgment.

### Settings

13. **Toggle checklist sections** — disable SEO only, then AI only, then Human; confirm cards and overall score update.
14. **Disable all checklist sections** — confirm warning appears; overall score behavior remains understandable.

### AI Review and API

15. **Missing OpenAI API key** — Run AI Review disabled or shows settings guidance; no key in browser devtools localized settings.
16. **Invalid API key** — Save a deliberately wrong key; run AI Review; expect clear error, no silent failure.
17. **AI Review cancelled before API call** — Dismiss confirmation dialog; no API charge; no partial review state.
18. **AI Review run twice on unchanged draft** — Second run should offer cached review / “unchanged” flow, not immediate duplicate API call (unless “run again anyway”).
19. **AI Review run after content changes** — Edit title or body; expect “draft changed” notice; fresh review allowed after confirm.

### Copy and insert

20. **Copy AI suggestions** — TL;DR, FAQs, Why this matters, full review; clipboard and button feedback.
21. **Insert AI suggestions** — Insert TL;DR, FAQs, Why this matters; new blocks only, existing content untouched.

## What feedback to report

Please report:

- **Bugs** — errors, broken UI, REST failures, wrong scores for obvious cases
- **UX** — confusing labels, overflow in sidebar, unclear recommendations
- **AI Review** — poor suggestions, wrong score scale, timeout/errors
- **Accessibility** — keyboard use, focus states on collapsible cards and buttons
- **Documentation gaps** — README, settings text, privacy expectations

Include when possible:

- WordPress version
- PHP version (if known)
- Browser
- Steps to reproduce
- Screenshots or screen recording

## Known limitations

- Rule-based checks are heuristics, not a full SEO audit.
- Does **not** detect AI-written text.
- Does **not** guarantee rankings or AI citations.
- **OpenAI only** for API-powered review in this release.
- Built for the **block editor**; Classic Editor workflows may differ.
- Very narrow sidebars may stack controls; long checklists require expanding cards.
- AI Review quality depends on model, prompt, and draft content.

See [README.md](README.md) and [PRIVACY.md](PRIVACY.md) for more detail.

## Privacy and API warning

- Rule-based checks run in the editor without sending draft text to third parties as part of that flow.
- **AI Review** sends the current **title**, **excerpt**, and **content** to **OpenAI** using the site owner’s API key via WordPress REST API.
- The API key is stored in WordPress and is **not** exposed to browser JavaScript.
- Cached reviews may be stored in **browser localStorage**.

**Do not test AI Review on confidential or unpublished sensitive content** unless your organization allows sending it to OpenAI.

## How to report issues on GitHub

1. Search existing issues to avoid duplicates.
2. Open a **new issue** with a clear title (e.g. `Beta: AI Review fails on empty draft`).
3. Use labels such as `bug`, `beta`, or `documentation` if available.
4. Include:
   - Scenario number from this guide (if applicable)
   - WordPress and plugin version
   - Expected vs actual behavior
   - Steps to reproduce
   - Screenshots (redact API keys and private content)

For security concerns about API keys or data handling, contact the maintainer privately if a security policy is published; otherwise use a private channel agreed with the project owner.

Thank you for helping improve AnswerReady AI before v1.0.
