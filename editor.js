(function (wp) {
    const { registerPlugin } = wp.plugins;
    const { PluginDocumentSettingPanel } = wp.editPost;
    const { useSelect } = wp.data;
    const { createElement: el, useState, useEffect } = wp.element;

    const pluginSettings = window.answerreadyAiSettings || {};

    function settingIsEnabled(value) {
        return value === true || value === 1 || value === "1";
    }

    const enabledSections = {
        seo: settingIsEnabled(pluginSettings.enableSeoChecks),
        ai: settingIsEnabled(pluginSettings.enableAiChecks),
        human: settingIsEnabled(pluginSettings.enableHumanSignalChecks)
    };

    const minimumRecommendedScore = Number(pluginSettings.minimumRecommendedScore || 75);
    const hasAnyEnabledSection = enabledSections.seo || enabledSections.ai || enabledSections.human;

    const AI_REVIEW_CONFIRM_MESSAGE =
        "Run AI Review? This sends the current draft to OpenAI using your saved API key and may incur API cost.";

    function buildContentHash(title, excerpt, content) {
        const combined = String(title || "") + "\n" + String(excerpt || "") + "\n" + String(content || "");
        let hash = 0;

        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash = hash & hash;
        }

        return "h" + String(Math.abs(hash));
    }

    function getReviewCacheKey(postId) {
        if (postId) {
            return "answerready-ai-review-" + postId;
        }

        return "answerready-ai-review-draft";
    }

    function readReviewCache(cacheKey) {
        try {
            const raw = localStorage.getItem(cacheKey);

            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);

            if (!parsed || !parsed.contentHash || !parsed.review) {
                return null;
            }

            return parsed;
        } catch (error) {
            return null;
        }
    }

    function saveReviewCache(cacheKey, payload) {
        try {
            localStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch (error) {
            // Ignore storage errors (for example private browsing or quota limits).
        }
    }

    function getCostLabel(wordCount) {
        const count = Number(wordCount) || 0;

        if (count <= 800) {
            return {
                text: "Low estimated API use",
                className: "answerready-ai-cost-label answerready-ai-cost-low"
            };
        }

        if (count <= 2000) {
            return {
                text: "Medium estimated API use",
                className: "answerready-ai-cost-label answerready-ai-cost-medium"
            };
        }

        return {
            text: "High estimated API use",
            className: "answerready-ai-cost-label answerready-ai-cost-high"
        };
    }

    function formatReviewTimestamp(timestamp) {
        if (!timestamp) {
            return "";
        }

        const date = new Date(timestamp);

        if (isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleString();
    }

    function normalizeReadinessScore(score) {
        const numericScore = Number(score);

        if (isNaN(numericScore)) {
            return null;
        }

        if (numericScore > 0 && numericScore <= 10) {
            return Math.round(numericScore * 10);
        }

        return Math.round(numericScore);
    }

    function hasSuggestionText(text) {
        return !!(text && String(text).trim());
    }

    function hasValidFaqs(faqs) {
        if (!faqs || !faqs.length) {
            return false;
        }

        return faqs.some(function (faq) {
            return faq && (hasSuggestionText(faq.question) || hasSuggestionText(faq.answer));
        });
    }

    function formatBulletListForCopy(items, emptyLabel) {
        if (!items || !items.length) {
            return emptyLabel || "None flagged.";
        }

        return items
            .map(function (item) {
                return "- " + String(item);
            })
            .join("\n");
    }

    function formatFaqsForCopy(faqs) {
        if (!hasValidFaqs(faqs)) {
            return "None suggested.";
        }

        return faqs
            .map(function (faq) {
                return "Q: " + String(faq.question || "").trim() + "\nA: " + String(faq.answer || "").trim();
            })
            .join("\n\n");
    }

    function buildFullAiReviewText(review, readinessScoreText) {
        return [
            "AnswerReady AI Review",
            "",
            "Assessment:",
            review.overall_assessment || "No assessment returned.",
            "",
            "AI Review Score:",
            readinessScoreText,
            "",
            "Generic content risk:",
            review.generic_content_risk || "N/A",
            "",
            "Top risks:",
            formatBulletListForCopy(review.top_risks),
            "",
            "Unsupported claims / source gaps:",
            formatBulletListForCopy(review.unsupported_claims),
            "",
            "Main entities:",
            formatBulletListForCopy(review.main_entities),
            "",
            "Suggested TL;DR:",
            review.suggested_tldr || "No TL;DR suggested.",
            "",
            "Suggested FAQs:",
            formatFaqsForCopy(review.suggested_faqs),
            "",
            "Suggested Why this matters:",
            review.suggested_why_this_matters || "No section suggested.",
            "",
            "Next edits:",
            formatBulletListForCopy(review.next_edits)
        ].join("\n");
    }

    function createHeadingBlock(text, level) {
        return wp.blocks.createBlock("core/heading", {
            content: text,
            level: level
        });
    }

    function createParagraphBlock(text) {
        return wp.blocks.createBlock("core/paragraph", {
            content: text
        });
    }

    function buildTldrBlocks(tldrText) {
        return [createHeadingBlock("TL;DR", 2), createParagraphBlock(tldrText)];
    }

    function buildFaqBlocks(faqs) {
        const blocks = [createHeadingBlock("FAQ", 2)];

        faqs
            .filter(function (faq) {
                return faq && (hasSuggestionText(faq.question) || hasSuggestionText(faq.answer));
            })
            .forEach(function (faq) {
                const question = String(faq.question || "").trim();
                const answer = String(faq.answer || "").trim();

                if (question) {
                    blocks.push(createHeadingBlock(question, 3));
                }

                if (answer) {
                    blocks.push(createParagraphBlock(answer));
                }
            });

        return blocks;
    }

    function buildWhyThisMattersBlocks(text) {
        return [
            createHeadingBlock("Why this matters", 2),
            createParagraphBlock(text)
        ];
    }

    function getBlockInsertionIndex() {
        const blockEditorSelect = wp.data.select("core/block-editor");

        if (!blockEditorSelect) {
            return undefined;
        }

        if (blockEditorSelect.getBlockInsertionPoint) {
            const insertionPoint = blockEditorSelect.getBlockInsertionPoint();

            if (insertionPoint && typeof insertionPoint.index === "number") {
                return insertionPoint.index;
            }
        }

        if (blockEditorSelect.getSelectedBlockClientId) {
            const selectedBlockClientId = blockEditorSelect.getSelectedBlockClientId();

            if (selectedBlockClientId && blockEditorSelect.getBlockIndex) {
                const selectedIndex = blockEditorSelect.getBlockIndex(selectedBlockClientId);

                if (typeof selectedIndex === "number") {
                    return selectedIndex + 1;
                }
            }
        }

        if (blockEditorSelect.getBlockCount) {
            return blockEditorSelect.getBlockCount();
        }

        return undefined;
    }

    function insertSuggestionBlocks(blocks) {
        if (!wp.blocks || !wp.blocks.createBlock) {
            return {
                success: false,
                message: "Block editor is not available."
            };
        }

        const blockEditorDispatch = wp.data.dispatch("core/block-editor");

        if (!blockEditorDispatch || !blockEditorDispatch.insertBlocks) {
            return {
                success: false,
                message: "Could not insert blocks."
            };
        }

        const insertionIndex = getBlockInsertionIndex();

        blockEditorDispatch.insertBlocks(blocks, insertionIndex);

        return {
            success: true,
            message: "Inserted into post."
        };
    }

    function copyTextToClipboard(text, callbacks) {
        const onSuccess = callbacks && callbacks.onSuccess ? callbacks.onSuccess : function () {};
        const onFailure = callbacks && callbacks.onFailure ? callbacks.onFailure : function () {};

        if (!hasSuggestionText(text)) {
            onFailure("No suggestion available.");
            return;
        }

        function handleSuccess() {
            onSuccess();
        }

        function handleFailure() {
            onFailure("Could not copy text.");
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
                .writeText(text)
                .then(handleSuccess)
                .catch(handleFailure);
            return;
        }

        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand("copy");
            handleSuccess();
        } catch (error) {
            handleFailure();
        }

        document.body.removeChild(textarea);
    }

    function stripHtml(html) {
        const temporaryElement = document.createElement("div");
        temporaryElement.innerHTML = html || "";
        return temporaryElement.textContent || temporaryElement.innerText || "";
    }

    function parseHtml(content) {
        const parser = new DOMParser();
        return parser.parseFromString(content || "", "text/html");
    }

    function countWords(text) {
        const cleanText = (text || "").trim();
        if (!cleanText) return 0;
        return cleanText.split(/\s+/).filter(Boolean).length;
    }

    function hasPhrase(text, phrases) {
        const lower = (text || "").toLowerCase();
        return phrases.some((phrase) => lower.includes(phrase.toLowerCase()));
    }

    function getLinks(documentObject) {
        return Array.from(documentObject.querySelectorAll("a[href]"));
    }

    function getImages(documentObject) {
        return Array.from(documentObject.querySelectorAll("img"));
    }

    function getHeadings(documentObject) {
        return Array.from(documentObject.querySelectorAll("h2, h3"));
    }

    function getParagraphs(documentObject) {
        return Array.from(documentObject.querySelectorAll("p"));
    }

    function scoreCheck(condition, points) {
        return condition ? points : 0;
    }

    function buildCheck(label, passed, suggestion, points, earned, category) {
        return {
            label,
            passed,
            suggestion,
            points,
            earned,
            category
        };
    }

    function getScoreStatus(score) {
        if (score >= 85) {
            return {
                label: "Strong",
                className: "answerready-score-high",
                message: "This section is in good shape."
            };
        }

        if (score >= 70) {
            return {
                label: "Good",
                className: "answerready-score-good",
                message: "Solid, but a few improvements would help."
            };
        }

        if (score >= 50) {
            return {
                label: "Needs work",
                className: "answerready-score-medium",
                message: "Important publishing checks are still missing."
            };
        }

        return {
            label: "Weak",
            className: "answerready-score-low",
            message: "This needs significant improvement before publishing."
        };
    }

    function getOverallRecommendation(overallScore, seoScore, aiScore, humanSignalScore) {
        if (overallScore >= minimumRecommendedScore + 10) {
            return "Publishing readiness looks strong. Do a final human edit and source check before publishing.";
        }
    
        if (overallScore >= minimumRecommendedScore) {
            return "This draft meets the current recommended publishing score. Review the top fixes before publishing.";
        }
    
        if (enabledSections.seo && enabledSections.ai && seoScore < 60 && aiScore >= 75) {
            return "The article is AI-readable, but classic SEO basics need work. Improve excerpt, links, depth, and metadata.";
        }
    
        if (enabledSections.seo && enabledSections.ai && aiScore < 60 && seoScore >= 75) {
            return "The article has decent SEO foundations, but needs stronger AI-readiness signals like summaries, FAQ, clear entities, and source-backed takeaways.";
        }
    
        if (enabledSections.human && humanSignalScore < 60) {
            return "The draft needs stronger human editorial value. Add original analysis, specific context, sources, examples, or a clearer implication for readers.";
        }
    
        return "This draft is below the current recommended score. Start with the top fixes below.";
    }

    function analyzePost(title, content, excerpt) {
        const documentObject = parseHtml(content);
        const plainText = stripHtml(content);
        const lowerText = plainText.toLowerCase();

        const wordCount = countWords(plainText);
        const headings = getHeadings(documentObject);
        const links = getLinks(documentObject);
        const images = getImages(documentObject);
        const paragraphs = getParagraphs(documentObject);

        const internalLinks = links.filter((link) => {
            const href = link.getAttribute("href") || "";
            return href.includes(window.location.hostname) || href.startsWith("/");
        });

        const externalLinks = links.filter((link) => {
            const href = link.getAttribute("href") || "";
            return href.startsWith("http") && !href.includes(window.location.hostname);
        });

        const imagesWithAlt = images.filter((image) => {
            const alt = image.getAttribute("alt");
            return alt && alt.trim().length > 0;
        });

        const titleText = typeof title === "string" ? title : "";
        const excerptText = typeof excerpt === "string" ? stripHtml(excerpt) : "";

        const hasSummary = hasPhrase(lowerText, [
            "tl;dr",
            "tldr",
            "summary",
            "key takeaway",
            "key takeaways",
            "in short",
            "at a glance"
        ]);

        const hasWhyThisMatters = hasPhrase(lowerText, [
            "why this matters",
            "why it matters",
            "what this means",
            "business implication",
            "implications"
        ]);

        const hasFAQ = hasPhrase(lowerText, [
            "faq",
            "frequently asked questions",
            "questions and answers",
            "q&a"
        ]);

        const hasSpecificDate =
            /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/i.test(plainText) ||
            /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i.test(plainText) ||
            /\b20\d{2}\b/.test(plainText);

        const hasVagueTiming = hasPhrase(lowerText, [
            "recently",
            "last year",
            "this year",
            "soon",
            "in the future",
            "these days"
        ]);

        const vagueTimingNeedsFix = hasVagueTiming && !hasSpecificDate;

        const hasOriginalSignal = hasPhrase(lowerText, [
            "interview",
            "according to our analysis",
            "we analysed",
            "we analyzed",
            "our data",
            "case study",
            "methodology",
            "survey",
            "screenshot",
            "first-hand",
            "first hand",
            "reported",
            "we tested",
            "we reviewed"
        ]);

        const hasClaimSignal = /\b\d+%|\b\d+\s?(million|billion|thousand|lakh|crore)\b|\bresearch\b|\bstudy\b|\breport\b|\bdata\b/i.test(plainText);

        const genericPhraseCount = [
            "in today's digital landscape",
            "rapidly evolving",
            "game changer",
            "it is important to note",
            "in conclusion",
            "leveraging",
            "unlock the potential",
            "seamless experience",
            "robust solution",
            "cutting-edge",
            "revolutionize",
            "more than ever",
            "nowadays",
            "these days"
        ].filter((phrase) => lowerText.includes(phrase)).length;
        
        const humanSignalChecks = [];
        
        humanSignalChecks.push(buildCheck(
            "Original reporting or analysis signal found",
            hasOriginalSignal,
            "Add original reporting, testing, analysis, methodology, interview material, screenshots, or a case study.",
            25,
            scoreCheck(hasOriginalSignal, 25),
            "Human Signal"
        ));
        
        humanSignalChecks.push(buildCheck(
            "Sources support credibility",
            externalLinks.length >= 2,
            "Add credible external sources to show the article is grounded in verifiable information.",
            20,
            scoreCheck(externalLinks.length >= 2, 20),
            "Human Signal"
        ));
        
        humanSignalChecks.push(buildCheck(
            "Specific context is present",
            hasSpecificDate,
            "Add specific dates, years, companies, places, products, or examples to make the article less generic.",
            20,
            scoreCheck(hasSpecificDate, 20),
            "Human Signal"
        ));
        
        humanSignalChecks.push(buildCheck(
            "Avoids generic AI-style filler",
            genericPhraseCount === 0,
            "Remove generic filler phrases and replace them with specific, useful analysis.",
            20,
            scoreCheck(genericPhraseCount === 0, 20),
            "Human Signal"
        ));
        
        humanSignalChecks.push(buildCheck(
            "Clear editorial implication included",
            hasWhyThisMatters,
            "Add a clear 'Why this matters' or 'What this means' section with a real implication for the reader.",
            15,
            scoreCheck(hasWhyThisMatters, 15),
            "Human Signal"
        ));

        const averageParagraphWords = paragraphs.length
            ? Math.round(wordCount / paragraphs.length)
            : wordCount;

        const seoChecks = [];

        seoChecks.push(buildCheck(
            "Title is present",
            titleText.trim().length > 0,
            "Add a clear article title.",
            10,
            scoreCheck(titleText.trim().length > 0, 10),
            "SEO"
        ));

        seoChecks.push(buildCheck(
            "Title length is SEO-friendly",
            titleText.trim().length >= 35 && titleText.trim().length <= 70,
            "Aim for a title between 35 and 70 characters.",
            10,
            scoreCheck(titleText.trim().length >= 35 && titleText.trim().length <= 70, 10),
            "SEO"
        ));

        seoChecks.push(buildCheck(
            "Excerpt/meta description exists",
            excerptText.trim().length > 0,
            "Add an excerpt. This can act as a draft meta description.",
            10,
            scoreCheck(excerptText.trim().length > 0, 10),
            "SEO"
        ));

        seoChecks.push(buildCheck(
            "Article has enough depth",
            wordCount >= 600,
            "Aim for at least 600 words for a substantial article, unless this is intentionally short.",
            15,
            scoreCheck(wordCount >= 600, 15),
            "SEO"
        ));

        seoChecks.push(buildCheck(
            "Uses H2/H3 headings",
            headings.length >= 2,
            "Add at least two H2/H3 sections to make the article easier to scan.",
            15,
            scoreCheck(headings.length >= 2, 15),
            "SEO"
        ));

        seoChecks.push(buildCheck(
            "Includes internal links",
            internalLinks.length >= 1,
            "Add at least one internal link to a relevant page on your site.",
            10,
            scoreCheck(internalLinks.length >= 1, 10),
            "SEO"
        ));

        seoChecks.push(buildCheck(
            "Includes external source links",
            externalLinks.length >= 2,
            "Add at least two external source links to support claims.",
            10,
            scoreCheck(externalLinks.length >= 2, 10),
            "SEO"
        ));

        seoChecks.push(buildCheck(
            "Images have alt text",
            images.length === 0 || imagesWithAlt.length === images.length,
            "Add descriptive alt text to all images.",
            10,
            scoreCheck(images.length === 0 || imagesWithAlt.length === images.length, 10),
            "SEO"
        ));

        seoChecks.push(buildCheck(
            "Paragraphs are readable",
            averageParagraphWords <= 90,
            "Break up long paragraphs for better readability.",
            10,
            scoreCheck(averageParagraphWords <= 90, 10),
            "SEO"
        ));

        const aiChecks = [];

        aiChecks.push(buildCheck(
            "Summary/TL;DR section found",
            hasSummary,
            "Add a short TL;DR, summary, or key takeaway near the top.",
            15,
            scoreCheck(hasSummary, 15),
            "AI"
        ));

        aiChecks.push(buildCheck(
            "Main answer appears early",
            wordCount > 0 && countWords(plainText.slice(0, 900)) >= 80,
            "Make sure the intro clearly answers the main question within the first 150 words.",
            10,
            scoreCheck(wordCount > 0 && countWords(plainText.slice(0, 900)) >= 80, 10),
            "AI"
        ));

        aiChecks.push(buildCheck(
            "Clear extractable structure",
            headings.length >= 3,
            "Use clear H2/H3 sections so AI systems can understand the article structure.",
            15,
            scoreCheck(headings.length >= 3, 15),
            "AI"
        ));

        aiChecks.push(buildCheck(
            "FAQ or Q&A section found",
            hasFAQ,
            "Add a short FAQ or Q&A section to answer direct search-style questions.",
            10,
            scoreCheck(hasFAQ, 10),
            "AI"
        ));

        aiChecks.push(buildCheck(
            "Why this matters section found",
            hasWhyThisMatters,
            "Add a 'Why this matters' or 'What this means' section.",
            10,
            scoreCheck(hasWhyThisMatters, 10),
            "AI"
        ));

        aiChecks.push(buildCheck(
            "Specific dates or years included",
            hasSpecificDate,
            "Use specific dates or years where relevant instead of vague timing.",
            10,
            scoreCheck(hasSpecificDate, 10),
            "AI"
        ));

        aiChecks.push(buildCheck(
            "Avoids unsupported vague timing",
            !vagueTimingNeedsFix,
            "Replace vague timing like 'recently' or 'this year' with specific dates where possible.",
            5,
            scoreCheck(!vagueTimingNeedsFix, 5),
            "AI"
        ));

        aiChecks.push(buildCheck(
            "Source links support AI trust",
            externalLinks.length >= 3,
            "Add at least three credible external sources, especially primary sources.",
            15,
            scoreCheck(externalLinks.length >= 3, 15),
            "AI"
        ));

        aiChecks.push(buildCheck(
            "Original value signal found",
            hasOriginalSignal,
            "Add original reporting, analysis, methodology, interview material, screenshots, testing, or a case study.",
            10,
            scoreCheck(hasOriginalSignal, 10),
            "AI"
        ));

        aiChecks.push(buildCheck(
            "Data or claim signals are source-backed",
            !hasClaimSignal || externalLinks.length >= 2,
            "This article appears to include data, research, or claims. Add source links to support them.",
            10,
            scoreCheck(!hasClaimSignal || externalLinks.length >= 2, 10),
            "AI"
        ));

        const seoEarned = seoChecks.reduce((sum, check) => sum + check.earned, 0);
const seoMax = seoChecks.reduce((sum, check) => sum + check.points, 0);
const aiEarned = aiChecks.reduce((sum, check) => sum + check.earned, 0);
const aiMax = aiChecks.reduce((sum, check) => sum + check.points, 0);
const humanEarned = humanSignalChecks.reduce((sum, check) => sum + check.earned, 0);
const humanMax = humanSignalChecks.reduce((sum, check) => sum + check.points, 0);

const seoScore = Math.round((seoEarned / seoMax) * 100);
const aiScore = Math.round((aiEarned / aiMax) * 100);
const humanSignalScore = Math.round((humanEarned / humanMax) * 100);

const enabledScoreValues = [];

if (enabledSections.seo) {
    enabledScoreValues.push(seoScore);
}

if (enabledSections.ai) {
    enabledScoreValues.push(aiScore);
}

if (enabledSections.human) {
    enabledScoreValues.push(humanSignalScore);
}

const overallScore = enabledScoreValues.length
    ? Math.round(enabledScoreValues.reduce((sum, score) => sum + score, 0) / enabledScoreValues.length)
    : 0;

let allChecks = [];

if (enabledSections.seo) {
    allChecks = allChecks.concat(seoChecks);
}

if (enabledSections.ai) {
    allChecks = allChecks.concat(aiChecks);
}

if (enabledSections.human) {
    allChecks = allChecks.concat(humanSignalChecks);
}

const passedChecksCount = allChecks.filter((check) => check.passed).length;
const failedChecksCount = allChecks.filter((check) => !check.passed).length;

        const allFailedChecks = allChecks
        .filter((check) => !check.passed)
        .sort((a, b) => b.points - a.points);

        const topFixes = allFailedChecks.slice(0, 3);

        return {
            wordCount,
            headingCount: headings.length,
            linkCount: links.length,
            internalLinkCount: internalLinks.length,
            externalLinkCount: externalLinks.length,
            imageCount: images.length,
            paragraphCount: paragraphs.length,
            averageParagraphWords,
            seoScore,
            aiScore,
            humanSignalScore,
            overallScore,
            seoStatus: getScoreStatus(seoScore),
            aiStatus: getScoreStatus(aiScore),
            humanSignalStatus: getScoreStatus(humanSignalScore),
            overallStatus: getScoreStatus(overallScore),
            passedChecksCount,
            failedChecksCount,
            recommendation: getOverallRecommendation(overallScore, seoScore, aiScore, humanSignalScore),
            seoChecks,
            aiChecks,
            humanSignalChecks,
            topFixes
        };
    }

    function ScoreBadge({ label, score, status }) {
        return el(
            "div",
            { className: "answerready-score-card " + status.className },
            el("span", { className: "answerready-score-label" }, label),
            el("strong", { className: "answerready-score-number" }, score + "/100"),
            el("span", { className: "answerready-score-status" }, status.label)
        );
    }

    function CheckItem({ check }) {
        return el(
            "div",
            { className: "answerready-check-item " + (check.passed ? "passed" : "failed") },
            el(
                "div",
                { className: "answerready-check-header" },
                el("span", { className: "answerready-check-icon" }, check.passed ? "✓" : "×"),
                el("span", { className: "answerready-check-label" }, check.label),
                el("span", { className: "answerready-check-points" }, check.earned + "/" + check.points)
            ),
            !check.passed &&
                el("p", { className: "answerready-suggestion" }, check.suggestion)
        );
    }

    function getChecklistCounts(checks) {
        const total = checks.length;
        const passed = checks.filter(function (check) {
            return check.passed;
        }).length;

        return {
            passed: passed,
            total: total,
            failed: total - passed
        };
    }

    function CollapsibleChecklist({ title, checks, score, idPrefix }) {
        const counts = getChecklistCounts(checks);
        const [isExpanded, setIsExpanded] = useState(false);

        function toggleExpanded() {
            setIsExpanded(!isExpanded);
        }

        function handleHeaderKeyDown(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleExpanded();
            }
        }

        return el(
            "div",
            { className: "answerready-collapsible-card" },
            el(
                "button",
                {
                    type: "button",
                    className: "answerready-collapsible-header",
                    onClick: toggleExpanded,
                    onKeyDown: handleHeaderKeyDown,
                    "aria-expanded": isExpanded
                },
                el(
                    "div",
                    { className: "answerready-collapsible-header-content" },
                    el("span", { className: "answerready-collapsible-title" }, title),
                    el(
                        "span",
                        { className: "answerready-collapsible-meta" },
                        counts.passed + "/" + counts.total + " passed · " + score + "/100"
                    )
                ),
                el("span", { className: "answerready-collapsible-arrow", "aria-hidden": "true" }, isExpanded ? "▾" : "▸")
            ),
            isExpanded &&
                el(
                    "div",
                    { className: "answerready-collapsible-body" },
                    checks.map(function (check, index) {
                        return el(CheckItem, { key: idPrefix + "-" + index, check: check });
                    })
                )
        );
    }

    function TopFixes({ fixes }) {
        if (!fixes.length) {
            return el(
                "div",
                { className: "answerready-top-fixes answerready-top-fixes-good" },
                el("strong", null, "No major fixes"),
                el("p", null, "No major missing checks. Do a final human edit and source review.")
            );
        }
    
        return el(
            "div",
            { className: "answerready-top-fixes" },
            el("strong", null, fixes.length === 1 ? "Top fix" : "Top " + fixes.length + " fixes"),
            el(
                "ol",
                null,
                fixes.map(function (fix, index) {
                    return el(
                        "li",
                        { key: "fix-" + index },
                        el("span", { className: "answerready-fix-category" }, fix.category),
                        " — ",
                        fix.suggestion
                    );
                })
            )
        );
    }
    function AiReviewPanel({ review }) {
        if (!review) {
            return null;
        }

        const [actionStatus, setActionStatus] = useState("");
        const [copiedState, setCopiedState] = useState({});
        const [insertedState, setInsertedState] = useState({
            tldr: false,
            faqs: false,
            why_this_matters: false
        });
        const normalizedReadinessScore = normalizeReadinessScore(review.readiness_score);
        const readinessScoreText =
            normalizedReadinessScore === null ? "N/A" : normalizedReadinessScore + "/100";

        const hasTldr = hasSuggestionText(review.suggested_tldr);
        const hasFaqs = hasValidFaqs(review.suggested_faqs);
        const hasWhyThisMatters = hasSuggestionText(review.suggested_why_this_matters);

        useEffect(function () {
            setCopiedState({});
            setInsertedState({
                tldr: false,
                faqs: false,
                why_this_matters: false
            });
        }, [review]);

        function getInsertStateKey(actionKey) {
            return actionKey === "why" ? "why_this_matters" : actionKey;
        }

        function showActionStatus(message) {
            setActionStatus(message);

            window.setTimeout(function () {
                setActionStatus("");
            }, 2000);
        }

        function showCopiedFeedback(copyKey) {
            setCopiedState(function (current) {
                const nextState = Object.assign({}, current);
                nextState[copyKey] = true;
                return nextState;
            });

            window.setTimeout(function () {
                setCopiedState(function (current) {
                    const nextState = Object.assign({}, current);
                    delete nextState[copyKey];
                    return nextState;
                });
            }, 2000);
        }

        function getCopyButtonLabel(copyKey) {
            return copiedState[copyKey] ? "Copied" : "Copy";
        }

        function getFullReviewCopyLabel() {
            return copiedState.full_review ? "Copied" : "Copy full review";
        }

        function getInsertButtonLabel(insertKey) {
            return insertedState[insertKey] ? "Inserted" : "Insert";
        }

        function markInserted(insertKey) {
            setInsertedState(function (current) {
                const nextState = Object.assign({}, current);
                nextState[insertKey] = true;
                return nextState;
            });
        }

        function renderSuggestionActions(options) {
            const actionKey = options.actionKey;
            const copyText = options.copyText;
            const copyStatusMessage = options.copyStatusMessage;
            const insertStatusMessage = options.insertStatusMessage;
            const buildBlocks = options.buildBlocks;
            const hasSuggestion = options.hasSuggestion;
            const copyKey = actionKey === "why" ? "why_this_matters" : actionKey;
            const insertKey = getInsertStateKey(actionKey);

            if (!hasSuggestion) {
                return el("p", { className: "answerready-ai-no-suggestion" }, "No suggestion available.");
            }

            return el(
                "div",
                { className: "answerready-action-row" },
                el(
                    "button",
                    {
                        type: "button",
                        className: "button button-small button-secondary answerready-action-button answerready-copy-button",
                        onClick: function () {
                            copyTextToClipboard(copyText, {
                                onSuccess: function () {
                                    showActionStatus(copyStatusMessage);
                                    showCopiedFeedback(copyKey);
                                },
                                onFailure: showActionStatus
                            });
                        }
                    },
                    getCopyButtonLabel(copyKey)
                ),
                el(
                    "button",
                    {
                        type: "button",
                        className: "button button-small button-primary answerready-action-button answerready-insert-button",
                        onClick: function () {
                            const result = insertSuggestionBlocks(buildBlocks());

                            if (result.success) {
                                showActionStatus(insertStatusMessage);
                                markInserted(insertKey);
                            } else {
                                showActionStatus(result.message);
                            }
                        }
                    },
                    getInsertButtonLabel(insertKey)
                )
            );
        }

        function renderList(items) {
            if (!items || !items.length) {
                return el("p", { className: "answerready-ai-empty" }, "None flagged.");
            }

            return el(
                "ul",
                { className: "answerready-ai-list" },
                items.map(function (item, index) {
                    return el("li", { key: "ai-item-" + index }, String(item));
                })
            );
        }

        function renderFaqs(faqs) {
            if (!hasValidFaqs(faqs)) {
                return el("p", { className: "answerready-ai-empty" }, "No FAQs suggested.");
            }

            return el(
                "div",
                { className: "answerready-ai-faqs" },
                faqs.map(function (faq, index) {
                    return el(
                        "div",
                        { className: "answerready-ai-faq", key: "faq-" + index },
                        el("strong", null, faq.question || "Question"),
                        el("p", null, faq.answer || "")
                    );
                })
            );
        }

        return el(
            "div",
            { className: "answerready-ai-review" },
            el("h3", { className: "answerready-section-title" }, "AI Editorial Review"),

            actionStatus &&
                el("p", { className: "answerready-action-status" }, actionStatus),

            el(
                "div",
                { className: "answerready-ai-review-card" },
                el("strong", null, "Assessment"),
                el("p", null, review.overall_assessment || "No assessment returned.")
            ),

            el(
                "div",
                { className: "answerready-ai-review-meta" },
                el("span", null, "AI Review Score: " + readinessScoreText),
                el("span", null, "Generic risk: " + (review.generic_content_risk || "N/A"))
            ),

            el("h4", null, "Top risks"),
            renderList(review.top_risks),

            el("h4", null, "Unsupported claims / source gaps"),
            renderList(review.unsupported_claims),

            el("h4", null, "Main entities"),
            renderList(review.main_entities),

            el("h4", null, "Suggested TL;DR"),
            el(
                "p",
                { className: "answerready-ai-suggestion-block" },
                hasTldr ? review.suggested_tldr : "No TL;DR suggested."
            ),
            renderSuggestionActions({
                actionKey: "tldr",
                copyText: review.suggested_tldr,
                copyStatusMessage: "Copied TL;DR",
                insertStatusMessage: "Inserted TL;DR into post",
                buildBlocks: function () {
                    return buildTldrBlocks(review.suggested_tldr);
                },
                hasSuggestion: hasTldr
            }),

            el("h4", null, "Suggested FAQs"),
            renderFaqs(review.suggested_faqs),
            renderSuggestionActions({
                actionKey: "faqs",
                copyText: formatFaqsForCopy(review.suggested_faqs),
                copyStatusMessage: "Copied FAQs",
                insertStatusMessage: "Inserted FAQs into post",
                buildBlocks: function () {
                    return buildFaqBlocks(review.suggested_faqs);
                },
                hasSuggestion: hasFaqs
            }),

            el("h4", null, "Suggested Why this matters"),
            el(
                "p",
                { className: "answerready-ai-suggestion-block" },
                hasWhyThisMatters ? review.suggested_why_this_matters : "No section suggested."
            ),
            renderSuggestionActions({
                actionKey: "why",
                copyText: review.suggested_why_this_matters,
                copyStatusMessage: "Copied Why this matters",
                insertStatusMessage: "Inserted Why this matters into post",
                buildBlocks: function () {
                    return buildWhyThisMattersBlocks(review.suggested_why_this_matters);
                },
                hasSuggestion: hasWhyThisMatters
            }),

            el("h4", null, "Next edits"),
            renderList(review.next_edits),

            el(
                "div",
                { className: "answerready-action-row answerready-action-row-single" },
                el(
                    "button",
                    {
                        type: "button",
                        className: "button button-small button-secondary answerready-action-button answerready-copy-button",
                        onClick: function () {
                            copyTextToClipboard(buildFullAiReviewText(review, readinessScoreText), {
                                onSuccess: function () {
                                    showActionStatus("Copied full review");
                                    showCopiedFeedback("full_review");
                                },
                                onFailure: showActionStatus
                            });
                        }
                    },
                    getFullReviewCopyLabel()
                )
            )
        );
    }

    function AnswerReadyPanel() {
        const postData = useSelect(function (select) {
            const editor = select("core/editor");

            return {
                postId: editor.getCurrentPostId ? editor.getCurrentPostId() : 0,
                title: editor.getEditedPostAttribute("title") || "",
                content: editor.getEditedPostAttribute("content") || "",
                excerpt: editor.getEditedPostAttribute("excerpt") || ""
            };
        }, []);

        const analysis = analyzePost(postData.title, postData.content, postData.excerpt);
        const contentHash = buildContentHash(postData.title, postData.excerpt, postData.content);
        const reviewCacheKey = getReviewCacheKey(postData.postId);
        const cachedReview = readReviewCache(reviewCacheKey);
        const isContentUnchanged = !!(cachedReview && cachedReview.contentHash === contentHash);
        const isContentChanged = !!(cachedReview && cachedReview.contentHash !== contentHash);
        const costLabel = getCostLabel(analysis.wordCount);

        const [aiReview, setAiReview] = useState(null);
        const [aiReviewLoading, setAiReviewLoading] = useState(false);
        const [aiReviewError, setAiReviewError] = useState("");
        const [showUnchangedPrompt, setShowUnchangedPrompt] = useState(false);

        useEffect(function () {
            setShowUnchangedPrompt(false);
        }, [contentHash]);

        function runAiReviewApi() {
            setAiReviewLoading(true);
            setAiReviewError("");
            setAiReview(null);

            fetch(pluginSettings.restUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-WP-Nonce": pluginSettings.nonce
                },
                body: JSON.stringify({
                    title: postData.title,
                    excerpt: postData.excerpt,
                    content: postData.content,
                    analysis: {
                        seoScore: analysis.seoScore,
                        aiScore: analysis.aiScore,
                        humanSignalScore: analysis.humanSignalScore,
                        overallScore: analysis.overallScore,
                        topFixes: analysis.topFixes
                    }
                })
            })
                .then(function (response) {
                    return response.json().then(function (data) {
                        if (!response.ok) {
                            throw new Error(data.message || "AI review failed.");
                        }

                        return data;
                    });
                })
                .then(function (data) {
                    if (data && data.review) {
                        setAiReview(data.review);

                        saveReviewCache(reviewCacheKey, {
                            contentHash: contentHash,
                            review: data.review,
                            timestamp: Date.now(),
                            wordCount: analysis.wordCount,
                            model: pluginSettings.openAiModel || ""
                        });
                    } else {
                        throw new Error("AI review returned no review data.");
                    }
                })
                .catch(function (error) {
                    setAiReviewError(error.message || "Something went wrong.");
                })
                .finally(function () {
                    setAiReviewLoading(false);
                });
        }

        function confirmAndRunAiReview() {
            if (!window.confirm(AI_REVIEW_CONFIRM_MESSAGE)) {
                return;
            }

            setShowUnchangedPrompt(false);
            runAiReviewApi();
        }

        function handleRunAiReviewClick() {
            if (!pluginSettings.hasOpenAiKey || !pluginSettings.restUrl) {
                setAiReviewError("Add your OpenAI API key under Settings → AnswerReady AI.");
                return;
            }

            setAiReviewError("");

            if (isContentUnchanged) {
                setShowUnchangedPrompt(true);
                return;
            }

            confirmAndRunAiReview();
        }

        function showSavedReview() {
            if (cachedReview && cachedReview.review) {
                setAiReview(cachedReview.review);
                setShowUnchangedPrompt(false);
                setAiReviewError("");
            }
        }

        function runAgainAnyway() {
            confirmAndRunAiReview();
        }

        return el(
            PluginDocumentSettingPanel,
            {
                name: "answerready-ai-panel",
                title: "AnswerReady AI",
                className: "answerready-panel"
            },
            el(
                "div",
                { className: "answerready-wrapper" },
                el("p", { className: "answerready-intro" }, "SEO + AI search readiness checks for this draft."),

                !hasAnyEnabledSection &&
                    el(
                        "div",
                        { className: "answerready-disabled-warning" },
                        "All checklist sections are currently disabled. Enable at least one section in Settings → AnswerReady AI."
                    ),

                el(
                    "div",
                    { className: "answerready-score-grid" },
                    el(ScoreBadge, {
                        label: "Overall",
                        score: analysis.overallScore,
                        status: analysis.overallStatus
                    }),
                    enabledSections.seo &&
                        el(ScoreBadge, {
                            label: "SEO",
                            score: analysis.seoScore,
                            status: analysis.seoStatus
                        }),
                    enabledSections.ai &&
                        el(ScoreBadge, {
                            label: "AI Readiness",
                            score: analysis.aiScore,
                            status: analysis.aiStatus
                        }),
                    enabledSections.human &&
                        el(ScoreBadge, {
                            label: "Human Signal",
                            score: analysis.humanSignalScore,
                            status: analysis.humanSignalStatus
                        })
                ),

                el(
                    "div",
                    { className: "answerready-recommendation " + analysis.overallStatus.className },
                    el("strong", null, analysis.overallStatus.label + ": "),
                    analysis.recommendation,
                    el("p", { className: "answerready-minimum-note" }, "Current recommended score: " + minimumRecommendedScore + "/100")
                ),

                el(TopFixes, { fixes: analysis.topFixes }),

                el(
                    "div",
                    { className: "answerready-ai-review-actions" },
                    el("span", { className: costLabel.className }, costLabel.text),

                    cachedReview &&
                        el(
                            "div",
                            { className: "answerready-ai-cache-meta" },
                            el("p", null, "Last AI review: " + formatReviewTimestamp(cachedReview.timestamp)),
                            isContentUnchanged &&
                                el(
                                    "p",
                                    { className: "answerready-ai-cache-status answerready-ai-cache-status-unchanged" },
                                    "Current draft is unchanged since that review."
                                ),
                            isContentChanged &&
                                el(
                                    "p",
                                    { className: "answerready-ai-cache-status answerready-ai-cache-status-changed" },
                                    "Current draft has changed since that review."
                                )
                        ),

                    isContentChanged &&
                        el(
                            "div",
                            { className: "answerready-ai-cache-notice answerready-ai-cache-notice-changed" },
                            "This draft has changed since the last AI review. A fresh review may be useful."
                        ),

                    showUnchangedPrompt &&
                        el(
                            "div",
                            { className: "answerready-ai-cache-notice answerready-ai-cache-notice-unchanged" },
                            el("p", null, "This draft has not changed since the last AI review."),
                            el(
                                "div",
                                { className: "answerready-ai-cache-actions" },
                                el(
                                    "button",
                                    {
                                        type: "button",
                                        className: "button button-secondary",
                                        onClick: showSavedReview,
                                        disabled: aiReviewLoading
                                    },
                                    "Show saved review"
                                ),
                                el(
                                    "button",
                                    {
                                        type: "button",
                                        className: "button",
                                        onClick: runAgainAnyway,
                                        disabled: aiReviewLoading
                                    },
                                    "Run again anyway"
                                )
                            )
                        ),

                    el(
                        "button",
                        {
                            type: "button",
                            className: "button button-primary",
                            onClick: handleRunAiReviewClick,
                            disabled: aiReviewLoading || !pluginSettings.hasOpenAiKey
                        },
                        aiReviewLoading ? "Running AI Review..." : "Run AI Review"
                    ),
                    !pluginSettings.hasOpenAiKey &&
                        el(
                            "p",
                            { className: "answerready-ai-error" },
                            "Add your OpenAI API key under Settings → AnswerReady AI."
                        ),
                    aiReviewError &&
                        el(
                            "p",
                            { className: "answerready-ai-error" },
                            aiReviewError
                        )
                ),

                el(AiReviewPanel, { review: aiReview }),

                el(
                    "div",
                    { className: "answerready-stats" },
                    el("span", null, "Words: " + analysis.wordCount),
                    el("span", null, "Headings: " + analysis.headingCount),
                    el("span", null, "Links: " + analysis.linkCount),
                    el("span", null, "External: " + analysis.externalLinkCount),
                    el("span", null, "Internal: " + analysis.internalLinkCount),
                    el("span", null, "Images: " + analysis.imageCount),
                    el("span", null, "Passed: " + analysis.passedChecksCount),
                    el("span", null, "Failed: " + analysis.failedChecksCount)
                ),

                enabledSections.seo &&
                    el(CollapsibleChecklist, {
                        title: "SEO Checklist",
                        checks: analysis.seoChecks,
                        score: analysis.seoScore,
                        idPrefix: "seo"
                    }),

                enabledSections.ai &&
                    el(CollapsibleChecklist, {
                        title: "AI Readiness Checklist",
                        checks: analysis.aiChecks,
                        score: analysis.aiScore,
                        idPrefix: "ai"
                    }),

                enabledSections.human &&
                    el(CollapsibleChecklist, {
                        title: "Human Editorial Signal",
                        checks: analysis.humanSignalChecks,
                        score: analysis.humanSignalScore,
                        idPrefix: "human"
                    }),

                el(
                    "p",
                    { className: "answerready-note" },
                    "Rule-based checks run automatically. AI Review uses your saved OpenAI API key and includes cost safeguards."
                )
            )
        );
    }

    registerPlugin("answerready-ai", {
        render: AnswerReadyPanel
    });
})(window.wp);