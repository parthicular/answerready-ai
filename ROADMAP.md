# Roadmap

This roadmap outlines planned direction for AnswerReady AI. Dates and scope may change based on feedback and maintenance capacity.

## Release milestones

### v0.7 — GitHub / portfolio release preparation

- Open-source documentation (`README`, `CHANGELOG`, `PRIVACY`, `LICENSE`)
- Settings and README wording aligned with current features
- Screenshot placeholders and portfolio-ready structure

### v0.8 — Beta testing and hardening

- Broader testing in real editorial workflows
- Error handling and edge-case fixes (empty drafts, long posts, REST failures)
- Dependency and WordPress version compatibility notes
- Performance review of editor sidebar and AI review calls

### v0.9 — GitHub release polish

- Repository structure (issue templates, contributing refinements)
- Version alignment between plugin header and tagged releases
- Screenshots and documentation review
- Optional CI for basic lint or packaging checks

### v1.0 — Public open-source release

- Stable settings and editor integration for contributors
- Clear privacy and limitation documentation
- Community contribution guidelines
- Tagged v1.0 release on GitHub

## Future features (post–1.0)

Ideas under consideration, not commitments:

| Area | Idea |
|------|------|
| **Scoring** | Content-type scoring modes (e.g. news, product, guide) |
| **History** | Review history stored per post in WordPress |
| **Reporting** | Exportable editorial readiness report (PDF/Markdown) |
| **Editing** | Replace existing TL;DR, FAQ, or Why this matters sections (optional) |
| **Scale** | Bulk article audit across selected posts |
| **Providers** | Additional AI providers beyond OpenAI |
| **Search** | Google Search Console integration for performance context |
| **Visibility** | AI visibility / citation tracking research |

## Non-goals

AnswerReady AI is not intended to:

- Guarantee rankings, AI Overview placement, or AI citations
- Detect AI authorship with certainty
- Replace professional SEO audits, legal review, or fact-checking
- Auto-publish content without human review

## How to influence the roadmap

Open a GitHub issue with:

- Your WordPress and editor setup
- The workflow you are trying to improve
- Whether you need local-only checks vs. API-powered review

Feature requests with reproducible examples are especially helpful.

## Version history

See [CHANGELOG.md](CHANGELOG.md) for released versions through **v0.7.2**.
