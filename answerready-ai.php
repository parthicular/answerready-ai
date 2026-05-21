<?php
/**
 * Plugin Name: AnswerReady AI
 * Description: SEO, AI search readiness, and human editorial signal checklist for WordPress editors.
 * Version: 0.7.0
 * Author: Parth Joshi
 * Text Domain: answerready-ai
 */

if (!defined('ABSPATH')) {
    exit;
}

define('ANSWERREADY_AI_VERSION', '0.7.0');
define('ANSWERREADY_AI_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ANSWERREADY_AI_PLUGIN_PATH', plugin_dir_path(__FILE__));

/**
 * Default plugin options.
 */
function answerready_ai_default_options() {
    return array(
        'enable_seo_checks' => 1,
        'enable_ai_checks' => 1,
        'enable_human_signal_checks' => 1,
        'minimum_recommended_score' => 75,
        'enable_ai_review' => 1,
        'openai_api_key' => '',
        'openai_model' => 'gpt-4o-mini'
    );
}

/**
 * Get saved plugin options merged with defaults.
 */
function answerready_ai_get_options() {
    $defaults = answerready_ai_default_options();
    $saved_options = get_option('answerready_ai_options', array());

    if (!is_array($saved_options)) {
        $saved_options = array();
    }

    return wp_parse_args($saved_options, $defaults);
}

/**
 * Register settings.
 */
function answerready_ai_register_settings() {
    register_setting(
        'answerready_ai_settings_group',
        'answerready_ai_options',
        'answerready_ai_sanitize_options'
    );

    add_settings_section(
        'answerready_ai_main_section',
        'Core Settings',
        'answerready_ai_main_section_callback',
        'answerready-ai'
    );

    add_settings_field(
        'enable_seo_checks',
        'Enable SEO checks',
        'answerready_ai_checkbox_field_callback',
        'answerready-ai',
        'answerready_ai_main_section',
        array(
            'key' => 'enable_seo_checks',
            'label' => 'Show classic SEO checks in the editor sidebar.'
        )
    );

    add_settings_field(
        'enable_ai_checks',
        'Enable AI Readiness checks',
        'answerready_ai_checkbox_field_callback',
        'answerready-ai',
        'answerready_ai_main_section',
        array(
            'key' => 'enable_ai_checks',
            'label' => 'Show AI search readiness checks in the editor sidebar.'
        )
    );

    add_settings_field(
        'enable_human_signal_checks',
        'Enable Human Signal checks',
        'answerready_ai_checkbox_field_callback',
        'answerready-ai',
        'answerready_ai_main_section',
        array(
            'key' => 'enable_human_signal_checks',
            'label' => 'Show human editorial value and generic-content risk checks.'
        )
    );

    add_settings_field(
        'minimum_recommended_score',
        'Minimum recommended score',
        'answerready_ai_number_field_callback',
        'answerready-ai',
        'answerready_ai_main_section',
        array(
            'key' => 'minimum_recommended_score',
            'min' => 0,
            'max' => 100,
            'description' => 'Used as a publishing-readiness benchmark. Recommended: 75.'
        )
    );

    add_settings_section(
        'answerready_ai_openai_section',
        'AI Review Settings',
        'answerready_ai_openai_section_callback',
        'answerready-ai'
    );

    add_settings_field(
        'enable_ai_review',
        'Enable AI Review',
        'answerready_ai_checkbox_field_callback',
        'answerready-ai',
        'answerready_ai_openai_section',
        array(
            'key' => 'enable_ai_review',
            'label' => 'Allow editors to run API-powered AI Review from the post editor.'
        )
    );

    add_settings_field(
        'openai_api_key',
        'OpenAI API key',
        'answerready_ai_password_field_callback',
        'answerready-ai',
        'answerready_ai_openai_section',
        array(
            'key' => 'openai_api_key',
            'description' => 'AI Review uses this key server-side to send the current draft to OpenAI. The key is stored in this WordPress install and is not exposed in the editor JavaScript.'
        )
    );

    add_settings_field(
        'openai_model',
        'AI model',
        'answerready_ai_text_field_callback',
        'answerready-ai',
        'answerready_ai_openai_section',
        array(
            'key' => 'openai_model',
            'description' => 'Choose the model used for AI Review. Recommended: gpt-4o-mini for lower cost. You can enter another OpenAI model ID if it is available to your API account.'
        )
    );
}
add_action('admin_init', 'answerready_ai_register_settings');

/**
 * Sanitize saved options.
 */
function answerready_ai_sanitize_options($input) {
    $defaults = answerready_ai_default_options();
    $output = array();

    $output['enable_seo_checks'] = isset($input['enable_seo_checks']) ? 1 : 0;
    $output['enable_ai_checks'] = isset($input['enable_ai_checks']) ? 1 : 0;
    $output['enable_human_signal_checks'] = isset($input['enable_human_signal_checks']) ? 1 : 0;

    $minimum_score = isset($input['minimum_recommended_score'])
        ? absint($input['minimum_recommended_score'])
        : $defaults['minimum_recommended_score'];

    if ($minimum_score > 100) {
        $minimum_score = 100;
    }

    $output['minimum_recommended_score'] = $minimum_score;

    $output['enable_ai_review'] = isset($input['enable_ai_review']) ? 1 : 0;

    $output['openai_api_key'] = isset($input['openai_api_key'])
        ? sanitize_text_field($input['openai_api_key'])
        : '';

    $output['openai_model'] = isset($input['openai_model']) && $input['openai_model'] !== ''
        ? sanitize_text_field($input['openai_model'])
        : $defaults['openai_model'];

    return $output;
}

/**
 * Settings page intro.
 */
function answerready_ai_main_section_callback() {
    echo '<p>Choose which readiness checks appear in the WordPress editor sidebar.</p>';
}

/**
 * OpenAI section intro.
 */
function answerready_ai_openai_section_callback() {
    echo '<p>Configure optional API-powered AI Review. Rule-based checks work without an API key.</p>';
}

/**
 * Checkbox field.
 */
function answerready_ai_checkbox_field_callback($args) {
    $options = answerready_ai_get_options();
    $key = $args['key'];
    $label = $args['label'];

    printf(
        '<label><input type="checkbox" name="answerready_ai_options[%1$s]" value="1" %2$s> %3$s</label>',
        esc_attr($key),
        checked(1, isset($options[$key]) ? $options[$key] : 0, false),
        esc_html($label)
    );
}

/**
 * Number field.
 */
function answerready_ai_number_field_callback($args) {
    $options = answerready_ai_get_options();
    $key = $args['key'];
    $min = isset($args['min']) ? $args['min'] : 0;
    $max = isset($args['max']) ? $args['max'] : 100;
    $description = isset($args['description']) ? $args['description'] : '';

    printf(
        '<input type="number" name="answerready_ai_options[%1$s]" value="%2$s" min="%3$s" max="%4$s" class="small-text">',
        esc_attr($key),
        esc_attr(isset($options[$key]) ? $options[$key] : ''),
        esc_attr($min),
        esc_attr($max)
    );

    if ($description) {
        printf('<p class="description">%s</p>', esc_html($description));
    }
}

/**
 * Password field.
 */
function answerready_ai_password_field_callback($args) {
    $options = answerready_ai_get_options();
    $key = $args['key'];
    $description = isset($args['description']) ? $args['description'] : '';

    printf(
        '<input type="password" name="answerready_ai_options[%1$s]" value="%2$s" class="regular-text" autocomplete="off">',
        esc_attr($key),
        esc_attr(isset($options[$key]) ? $options[$key] : '')
    );

    if ($description) {
        printf('<p class="description">%s</p>', esc_html($description));
    }
}

/**
 * Text field.
 */
function answerready_ai_text_field_callback($args) {
    $options = answerready_ai_get_options();
    $key = $args['key'];
    $description = isset($args['description']) ? $args['description'] : '';

    printf(
        '<input type="text" name="answerready_ai_options[%1$s]" value="%2$s" class="regular-text">',
        esc_attr($key),
        esc_attr(isset($options[$key]) ? $options[$key] : '')
    );

    if ($description) {
        printf('<p class="description">%s</p>', esc_html($description));
    }
}

/**
 * Add settings page under Settings.
 */
function answerready_ai_add_settings_page() {
    add_options_page(
        'AnswerReady AI Settings',
        'AnswerReady AI',
        'manage_options',
        'answerready-ai',
        'answerready_ai_render_settings_page'
    );
}
add_action('admin_menu', 'answerready_ai_add_settings_page');

/**
 * Render settings page.
 */
function answerready_ai_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    ?>
    <div class="wrap">
        <h1>AnswerReady AI Settings</h1>

        <p>
            AnswerReady AI checks whether a draft is prepared for classic SEO, AI-powered search,
            and human editorial value. The editor panel includes rule-based checks and optional
            API-powered AI Review when an OpenAI API key is configured.
        </p>

        <form method="post" action="options.php">
            <?php
            settings_fields('answerready_ai_settings_group');
            do_settings_sections('answerready-ai');
            submit_button('Save Settings');
            ?>
        </form>

        <hr>

        <h2>Current roadmap</h2>
        <ol>
            <li><strong>v0.7:</strong> GitHub/portfolio release preparation</li>
            <li><strong>v0.8:</strong> Beta testing and hardening</li>
            <li><strong>v0.9:</strong> Release polish, screenshots, and documentation review</li>
            <li><strong>v1.0:</strong> Public open-source release</li>
        </ol>

        <h2>Important note on AI-generated content</h2>
        <p>
            This plugin does not claim to detect whether text was written by AI. Instead, it checks
            whether the article has editorial value, specificity, sources, structure, and usefulness.
            AI-assisted content can still be helpful when it is reviewed, sourced, and improved by humans.
            AnswerReady AI does not guarantee rankings, AI Overview inclusion, or AI citations.
        </p>
    </div>
    <?php
}

/**
 * Enqueue editor assets.
 */
function answerready_ai_enqueue_editor_assets() {
    $options = answerready_ai_get_options();

    wp_enqueue_script(
        'answerready-ai-editor',
        ANSWERREADY_AI_PLUGIN_URL . 'editor.js',
        array(
            'wp-plugins',
            'wp-edit-post',
            'wp-element',
            'wp-components',
            'wp-data',
            'wp-i18n'
        ),
        ANSWERREADY_AI_VERSION,
        true
    );

    wp_localize_script(
        'answerready-ai-editor',
        'answerreadyAiSettings',
        array(
            'enableSeoChecks' => (bool) $options['enable_seo_checks'],
            'enableAiChecks' => (bool) $options['enable_ai_checks'],
            'enableHumanSignalChecks' => (bool) $options['enable_human_signal_checks'],
            'minimumRecommendedScore' => absint($options['minimum_recommended_score']),
            'enableAiReview' => !empty($options['enable_ai_review']),
            'hasOpenAiKey' => !empty($options['openai_api_key']),
            'openAiModel' => sanitize_text_field($options['openai_model']),
            'restUrl' => esc_url_raw(rest_url('answerready-ai/v1/review')),
            'nonce' => wp_create_nonce('wp_rest')
        )
    );

    wp_enqueue_style(
        'answerready-ai-editor-style',
        ANSWERREADY_AI_PLUGIN_URL . 'editor.css',
        array(),
        ANSWERREADY_AI_VERSION
    );
}
add_action('enqueue_block_editor_assets', 'answerready_ai_enqueue_editor_assets');

/**
 * Admin notice only on Plugins page.
 */
function answerready_ai_admin_notice() {
    $screen = get_current_screen();

    if ($screen && $screen->base === 'plugins') {
        echo '<div class="notice notice-success"><p><strong>AnswerReady AI:</strong> Plugin is active. Open a post in the block editor to see the SEO + AI readiness panel. Configure settings under <a href="' . esc_url(admin_url('options-general.php?page=answerready-ai')) . '">Settings → AnswerReady AI</a>.</p></div>';
    }
}
add_action('admin_notices', 'answerready_ai_admin_notice');

/**
 * Register REST API route for AI review.
 */
function answerready_ai_register_rest_routes() {
    register_rest_route(
        'answerready-ai/v1',
        '/review',
        array(
            'methods' => 'POST',
            'callback' => 'answerready_ai_run_ai_review',
            'permission_callback' => function () {
                return current_user_can('edit_posts');
            }
        )
    );
}
add_action('rest_api_init', 'answerready_ai_register_rest_routes');

/**
 * Run AI review through OpenAI.
 */
function answerready_ai_run_ai_review($request) {
    $options = answerready_ai_get_options();

    if (empty($options['enable_ai_review'])) {
        return new WP_Error(
            'answerready_ai_review_disabled',
            'AI Review is disabled in AnswerReady AI settings.',
            array('status' => 403)
        );
    }

    $api_key = isset($options['openai_api_key']) ? trim($options['openai_api_key']) : '';
    $model = isset($options['openai_model']) && $options['openai_model'] !== ''
        ? sanitize_text_field($options['openai_model'])
        : 'gpt-4o-mini';

    if (empty($api_key)) {
        return new WP_Error(
            'answerready_missing_api_key',
            'OpenAI API key is missing. Add it under Settings → AnswerReady AI.',
            array('status' => 400)
        );
    }

    $params = $request->get_json_params();

    $title = isset($params['title']) ? sanitize_text_field($params['title']) : '';
    $excerpt = isset($params['excerpt']) ? sanitize_textarea_field($params['excerpt']) : '';
    $content = isset($params['content']) ? wp_kses_post($params['content']) : '';
    $plain_content = wp_strip_all_tags($content);

    if (empty($title) && empty($plain_content)) {
        return new WP_Error(
            'answerready_empty_content',
            'There is no article content to review.',
            array('status' => 400)
        );
    }

    $plain_content = mb_substr($plain_content, 0, 12000);

    $prompt = answerready_ai_build_review_prompt($title, $excerpt, $plain_content);

    $body = array(
        'model' => $model,
        'input' => array(
            array(
                'role' => 'system',
                'content' => 'You are an expert editorial strategist, SEO reviewer, and AI search readiness analyst. Return only valid JSON. Do not include markdown fences.'
            ),
            array(
                'role' => 'user',
                'content' => $prompt
            )
        ),
        'text' => array(
            'format' => array(
                'type' => 'json_object'
            )
        )
    );

    $response = wp_remote_post(
        'https://api.openai.com/v1/responses',
        array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json'
            ),
            'body' => wp_json_encode($body),
            'timeout' => 45
        )
    );

    if (is_wp_error($response)) {
        return new WP_Error(
            'answerready_openai_request_failed',
            $response->get_error_message(),
            array('status' => 500)
        );
    }

    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $decoded = json_decode($response_body, true);

    if ($status_code < 200 || $status_code >= 300) {
        $message = 'OpenAI API request failed.';

        if (isset($decoded['error']['message'])) {
            $message = $decoded['error']['message'];
        }

        return new WP_Error(
            'answerready_openai_api_error',
            $message,
            array('status' => $status_code)
        );
    }

    $output_text = '';

    if (isset($decoded['output_text'])) {
        $output_text = $decoded['output_text'];
    } elseif (isset($decoded['output'][0]['content'][0]['text'])) {
        $output_text = $decoded['output'][0]['content'][0]['text'];
    }

    if (empty($output_text)) {
        return new WP_Error(
            'answerready_empty_openai_output',
            'OpenAI returned an empty response.',
            array('status' => 500)
        );
    }

    $review_json = json_decode($output_text, true);

    if (!is_array($review_json)) {
        return new WP_Error(
            'answerready_invalid_json',
            'OpenAI response was not valid JSON.',
            array('status' => 500)
        );
    }

    return rest_ensure_response(
        array(
            'success' => true,
            'review' => $review_json
        )
    );
}

/**
 * Build AI review prompt.
 */
function answerready_ai_build_review_prompt($title, $excerpt, $plain_content) {
    return '
Review this WordPress article for SEO, AI search readiness, and human editorial value.

Return only valid JSON in this exact structure:

{
  "overall_assessment": "2-4 sentence editorial assessment.",
  "readiness_score": 0,
  "generic_content_risk": "low | medium | high",
  "top_risks": ["risk 1", "risk 2", "risk 3"],
  "unsupported_claims": ["claim or issue 1", "claim or issue 2"],
  "main_entities": ["entity 1", "entity 2", "entity 3"],
  "suggested_tldr": "A concise TL;DR of 60-100 words.",
  "suggested_faqs": [
    {
      "question": "FAQ question",
      "answer": "Short answer"
    }
  ],
  "suggested_why_this_matters": "A concise Why this matters section.",
  "next_edits": ["edit 1", "edit 2", "edit 3"]
}

Rules:
- The readiness_score must be an integer from 0 to 100. Do not use a 1-10 scale.
- Do not pretend to know whether the article was written by AI.
- Do identify generic, thin, unsupported, vague, or low-originality writing.
- Do not invent facts.
- If a source is needed, say what kind of source is needed.
- Keep suggestions practical for an editor.
- Focus on clarity, source strength, entity clarity, answer-readiness, originality, and business/editorial implication.

Article title:
' . $title . '

Article excerpt:
' . $excerpt . '

Article content:
' . $plain_content;
}