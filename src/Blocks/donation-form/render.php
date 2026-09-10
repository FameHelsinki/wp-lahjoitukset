<?php

declare(strict_types=1);

defined('ABSPATH') || exit;

/**
 * render.php for famehelsinki/donation-form
 *
 * @var array<string, mixed>|null $attributes
 * @var string|null              $content
 * @var WP_Block|null            $block
 */

$attributes = $attributes ?? [];
$content    = $content ?? '';

if (!function_exists('famehelsinki_sanitize_return_url')) {
  /**
   * Prevent open redirects:
   * - If empty: homepage (absolute)
   * - If relative "/path": convert to absolute with home_url()
   * - If absolute: allow only same-host
   */
  function famehelsinki_sanitize_return_url(string $url): string
  {
    $url = trim($url);

    $home      = home_url('/');
    $site_host = wp_parse_url($home, PHP_URL_HOST);

    if (!$site_host) {
      return $home;
    }

    if ($url === '') {
      return $home;
    }

    // Relative path -> absolute
    if (str_starts_with($url, '/')) {
      return esc_url_raw(home_url($url));
    }

    // Absolute URL -> check host
    $parsed = wp_parse_url($url);
    if (!$parsed || empty($parsed['host'])) {
      return $home;
    }

    if ($parsed['host'] !== $site_host) {
      return $home;
    }

    // Keep user's absolute URL as-is (same host)
    return esc_url_raw($url);
  }
}

$attrs = wp_parse_args($attributes, [
  'returnAddress'         => '/',
  'primaryColor'          => '#000000',
  'secondaryColor'        => '#FFFFFF',
  'buttonBorderColor'     => '',
  'thirdColor'            => '#444',
  'borderRadius'          => '0px',
  'borderWidth'           => '1px',
  'textFieldBorderRadius' => '0px',
  'dangerColor'           => '#dc3545',
  'sectionLabelColor'     => '',
  'sectionLabelFontSize'  => '1.25em',
]);

$primary_color       = sanitize_hex_color((string) $attrs['primaryColor']) ?: '#000000';
$secondary_color     = sanitize_hex_color((string) $attrs['secondaryColor']) ?: '#FFFFFF';
$third_color         = sanitize_hex_color((string) $attrs['thirdColor']) ?: '#444';
$danger_color        = sanitize_hex_color((string) $attrs['dangerColor']) ?: '#dc3545';
$button_border_color = sanitize_hex_color((string) $attrs['buttonBorderColor']) ?: $primary_color;
$section_label_color = sanitize_hex_color((string) $attrs['sectionLabelColor']) ?: 'inherit';
$valid_css_length = static function ($value, string $fallback): string {
  $length = (string) $value;
  return preg_match('/^\d*\.?\d+(px|rem|em|%)$/', $length) ? $length : $fallback;
};
$border_radius           = $valid_css_length($attrs['borderRadius'], '0px');
$border_width            = $valid_css_length($attrs['borderWidth'], '1px');
$text_field_border_radius = $valid_css_length($attrs['textFieldBorderRadius'], '0px');
$section_label_size      = $valid_css_length($attrs['sectionLabelFontSize'], '1.25em');

$wrapper_style = sprintf(
  '--primary-color:%s;--secondary-color:%s;--button-border-color:%s;--third-color:%s;--border-radius:%s;--border-width:%s;--text-field-border-radius:%s;--fame-clr-danger:%s;--section-label-color:%s;--section-label-font-size:%s;',
  esc_attr($primary_color),
  esc_attr($secondary_color),
  esc_attr($button_border_color),
  esc_attr($third_color),
  esc_attr($border_radius),
  esc_attr($border_width),
  esc_attr($text_field_border_radius),
  esc_attr($danger_color),
  esc_attr($section_label_color),
  esc_attr($section_label_size)
);

$block_wrapper_attrs = get_block_wrapper_attributes([
  'class' => 'fame-form-container fame-form__wrapper',
  'style' => $wrapper_style,
]);

/**
 * Render inner blocks robustly:
 * - Prefer parsed block tree ($block->inner_blocks)
 * - Fallback to serialized $content
 */
$inner = '';

if ($block instanceof WP_Block && count($block->inner_blocks) > 0) {
  foreach ($block->inner_blocks as $inner_block) {
    $inner .= $inner_block->render();
  }
} else {
  $inner = $content;
}

$return_address = famehelsinki_sanitize_return_url((string) ($attrs['returnAddress'] ?? '/'));
?>
<div <?php echo $block_wrapper_attrs; ?>>
  <form class="fame-form fame-form--donations" novalidate>
    <div class="fame-form__inner">
      <?php echo $inner; ?>
    </div>

    <input type="hidden" name="return_address" value="<?php echo esc_attr($return_address); ?>" />
    <input type="hidden" name="provider" data-selected-provider />

  </form>

  <div class="fame-form-overlay">
    <div class="fame-form-spinner" role="status">
      <span class="screen-reader-text"><?php echo esc_html__('Loading', 'fame_lahjoitukset'); ?></span>
    </div>
  </div>
</div>
