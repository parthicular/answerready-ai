# AnswerReady AI — Beta test log

Copy this template for each testing session or tester. Replace placeholder rows with your results.

**Tester:**  
**Date:**  
**WordPress version:**  
**Plugin version:**  
**Browser:**  
**OpenAI model (if used):**  

---

## Test results

| Test ID | Article type | Word count | SEO score | AI Readiness score | Human Signal score | Overall score | AI Review used? (yes/no) | Expected behavior | Actual behavior | Bugs/issues | Notes | Pass/fail |
|---------|--------------|------------|-----------|-------------------|-------------------|---------------|--------------------------|-------------------|-----------------|-------------|-------|-----------|
| T01 | Empty draft | | | | | | | Scores/messages handle empty content; AI Review fails gracefully | | | | |
| T02 | Very short article | | | | | | | Checks appropriate for short content | | | | |
| T03 | News article | | | | | | | Realistic SEO/AI/Human scores | | | | |
| T04 | Evergreen guide | | | | | | | Depth, headings, links reflected | | | | |
| T05 | B2B blog post | | | | | | | Excerpt, implications, credibility | | | | |
| T06 | Local journalism | | | | | | | Specific context, sources | | | | |
| T07 | Opinion/analysis | | | | | | | Editorial signals scored | | | | |
| T08 | Product comparison | | | | | | | Claims, entities, links | | | | |
| T09 | Long article (2000+ words) | | | | | | | Sidebar usable; high cost label | | | | |
| T10 | No links | | | | | | | Link checks fail as expected | | | | |
| T11 | Many links | | | | | | | Link checks pass or reasonable | | | | |
| T12 | Has TL;DR/FAQ/Why sections | | | | | | | Matching checks pass | | | | |
| T13 | Missing API key | | | | | | no | Run AI Review blocked/guided | | | | |
| T14 | Invalid API key | | | | | | yes | Clear error message | | | | |
| T15 | AI Review cancelled | | | | | | no | No API call after cancel | | | | |
| T16 | AI Review twice (unchanged) | | | | | | yes | Cache/unchanged prompt | | | | |
| T17 | AI Review after edit | | | | | | yes | Changed-draft notice; fresh review | | | | |
| T18 | Copy suggestions | | | | | | yes | Clipboard + feedback | | | | |
| T19 | Insert suggestions | | | | | | yes | New blocks only | | | | |
| T20 | Toggle checklist sections | | | | | | | Cards/scores match settings | | | | |
| T21 | All sections disabled | | | | | | | Warning shown | | | | |

Add extra rows as needed:

| Test ID | Article type | Word count | SEO score | AI Readiness score | Human Signal score | Overall score | AI Review used? (yes/no) | Expected behavior | Actual behavior | Bugs/issues | Notes | Pass/fail |
|---------|--------------|------------|-----------|-------------------|-------------------|---------------|--------------------------|-------------------|-----------------|-------------|-------|-----------|
| T22 | | | | | | | | | | | | |

---

## Qualitative feedback

Answer honestly; there are no “right” scores.

### Were suggestions useful?

- AI Review assessment:
- Suggested TL;DR:
- Suggested FAQs:
- Suggested Why this matters:
- Top fixes / rule-based suggestions:

### Did the score feel fair?

- SEO:
- AI Readiness:
- Human Signal:
- Overall:

### Did anything feel confusing?

- Sidebar layout:
- Collapsible checklists:
- AI Review flow (cache, confirm, copy/insert):
- Settings page:

### Did anything feel too strict?

### Did anything feel too lenient?

---

## Summary

**Critical issues (blockers):**  

**Minor issues:**  

**Enhancement ideas:**  

**Overall recommendation:** pass beta / needs work / not ready  
