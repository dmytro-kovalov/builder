<?php

if (!defined('ABSPATH')) {
    header('Status: 403 Forbidden');
    header('HTTP/1.1 403 Forbidden');
    exit;
}

require_once(ABSPATH . 'wp-admin/includes/admin.php');

// @codingStandardsIgnoreStart
global $title, $hook_suffix, $current_screen, $wp_locale, $pagenow, $wp_version,
       $update_title, $total_update_count, $parent_file, $typenow;

if (empty($current_screen)) {
    set_current_screen();
}
// @codingStandardsIgnoreEnd
$typenow = get_post_type();
/**
 * @var $editableLink - link to editable content
 */
/** @var \VisualComposer\Helpers\Url $urlHelper */
$urlHelper = vchelper('Url');
/** @var \VisualComposer\Helpers\Nonce $nonceHelper */
$nonceHelper = vchelper('Nonce');
$optionsHelper = vchelper('Options');

$extraOutput = vcfilter('vcv:frontend:update:head:extraOutput', []);
if (is_array($extraOutput)) {
    foreach ($extraOutput as $output) {
        echo $output;
    }
    unset($output);
}
?>
<script>
  window.vcvAccountUrl = '<?php echo $urlHelper->ajax(['vcv-action' => 'bundle:update:adminNonce']); ?>'
  window.vcvNonce = '<?php echo $nonceHelper->admin(); ?>';
  window.vcvPageBack = '<?php echo $optionsHelper->getTransient('_vcv_update_page_redirect_url'); ?>';
</script>

<!-- Third screen / loading screen -->
<div class="vcv-popup-content vcv-popup-loading-screen">
    <!-- Loading image -->
    <div class="vcv-loading-dots-container">
        <div class="vcv-loading-dot vcv-loading-dot-1"></div>
        <div class="vcv-loading-dot vcv-loading-dot-2"></div>
    </div>

    <span class="vcv-popup-loading-heading"><?php
        echo __('We are updating assets from the Visual Composer Cloud ... Please wait.', 'vcwb');
        ?></span>


    <span class="vcv-popup-helper"><?php
        echo __('Don’t close this window while update is in process.', 'vcwb');
        ?></span>
    <!-- Loading big white circle -->
    <div class="vcv-popup-loading-zoom"></div>
</div>
<div data-vcv-error-description class="vcv-popup-content vcv-popup-error-description vcv-popup--hidden">
    <div class="vcv-logo">
        <svg width="36px" height="37px" viewBox="0 0 36 37" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="01-Intro-Free" transform="translate(-683.000000, -185.000000)">
                    <g id="VC-Logo" transform="translate(683.000000, 185.000000)">
                        <polygon id="Fill-1" fill="#257CA0" points="17.982 21.662 17.989 37 8.999 31.837 8.999 21.499"></polygon>
                        <polyline id="Fill-5" fill="#74953D" points="17.71 5.977 26.694 6.139 26.708 21.494 17.71 21.315 17.71 5.977"></polyline>
                        <polyline id="Fill-4" fill="#2CA2CF" points="26.708 21.494 17.982 26.656 8.999 21.498 17.72 16.315 26.708 21.494"></polyline>
                        <polyline id="Fill-6" fill="#9AC753" points="35.42 5.972 26.694 11.135 17.71 5.977 26.432 0.793 35.42 5.972"></polyline>
                        <polygon id="Fill-8" fill="#A77E2D" points="8.984 6.145 8.998 21.499 0 16.32 0 5.98"></polygon>
                        <polyline id="Fill-9" fill="#F2AE3B" points="17.71 5.977 8.984 11.139 0 5.98 8.722 0.799 17.71 5.977"></polyline>
                    </g>
                </g>
            </g>
        </svg>
    </div>
    <div class="vcv-popup-heading">
        <?php echo __('Oops!', 'vcwb'); ?>
    </div>
    <span class="vcv-popup-loading-heading"><?php
        echo __(
            'It seems that something went wrong with assets update from the Visual Composer Cloud. Please make sure to check your internet connection and try again.',
            'vcwb'
        );
        ?></span>
    <div class="vcv-button-container">
        <button data-vcv-retry class="vcv-popup-button vcv-popup-form-submit vcv-popup-form-update"><span><?php echo __(
                    'Retry Update',
                    'vcwb'
                ); ?></span></button>
    </div>
</div>