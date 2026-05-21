# Changelog

All notable changes to AnswerReady AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where practical.

## [0.7.2] - 2026-05-20

### Changed

- Settings page intro, roadmap list, and AI-generated content notice
- OpenAI API key and AI model helper text
- README, CHANGELOG, and ROADMAP aligned for GitHub/portfolio release

## [0.7.0] - 2026-05-20

### Added

- Open-source and portfolio release documentation (`README.md`, `CHANGELOG.md`, `PRIVACY.md`, `ROADMAP.md`, `LICENSE`)

### Notes

- Release preparation docs

## [0.6.0] - 2026-05-20

### Added

- Collapsible checklist cards for SEO, AI Readiness, and Human Editorial Signal sections
- Compact headers with passed/total counts, section scores, and expand/collapse controls

### Changed

- Checklist sections collapsed by default to reduce sidebar scrolling

## [0.5.2] - 2026-05-20

### Changed

- Shortened Copy / Insert button labels to fit narrow sidebar
- Copy feedback shows “Copied” temporarily; Insert shows “Inserted” until a new review loads
- Improved action button layout and overflow handling

## [0.5.1] - 2026-05-20

### Changed

- Polished copy/insert action button layout, spacing, and feedback messages

## [0.5.0] - 2026-05-20

### Added

- Copy buttons for suggested TL;DR, FAQs, Why this matters, and full AI review
- Insert buttons to add TL;DR, FAQ, and Why this matters blocks into the post via the block editor

## [0.4.1] - 2026-05-20

### Added

- AI review cost safeguards: content-hash cache, reuse saved review, confirm before API call
- Estimated API use label and last-reviewed timestamp in the sidebar

### Changed

- Normalized AI `readiness_score` display to 0–100 when models return a 1–10 scale

## [0.4.0] - 2026-05-20

### Added

- Run AI Review button and OpenAI integration via WordPress REST API
- AI Editorial Review panel (assessment, risks, entities, suggestions)
- OpenAI API key and model settings

## [0.3.0] - 2026-05-20

### Added

- WordPress settings page (enable/disable checklist sections, minimum recommended score)
- Settings → AnswerReady AI under **Settings**
- REST route preparation for AI review

## [0.2.0] - 2026-05-20

### Added

- Top fixes section
- Score status labels (Strong, Good, Needs work, Weak)
- Disabled-section warning when all checklists are off

### Fixed

- Score grid display in the editor sidebar

## [0.1.0] - 2026-05-20

### Added

- Initial Gutenberg sidebar plugin
- Rule-based SEO, AI Readiness, and Human Signal checklists
- Overall score and basic editor panel

[0.7.2]: https://github.com/your-org/answerready-ai/compare/v0.7.0...v0.7.2
[0.7.0]: https://github.com/your-org/answerready-ai/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/your-org/answerready-ai/compare/v0.5.2...v0.6.0
[0.5.2]: https://github.com/your-org/answerready-ai/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/your-org/answerready-ai/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/your-org/answerready-ai/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/your-org/answerready-ai/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/your-org/answerready-ai/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/your-org/answerready-ai/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/your-org/answerready-ai/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/answerready-ai/releases/tag/v0.1.0
