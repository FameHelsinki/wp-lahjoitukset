<?php

declare(strict_types=1);

use Fame\WordPress\Lahjoitukset\Settings;

defined('ABSPATH') || exit;

/**
 * render.php for famehelsinki/donation-providers
 *
 * @var string              $content
 * @var WP_Block            $block
 */


/** @var array<string, mixed>|null $attributes */
$attributes = $attributes ?? [];

$providers = (isset($attributes['providers']) && is_array($attributes['providers']))
  ? $attributes['providers']
  : [];

$legend_raw = trim((string) ($attributes['legend'] ?? ''));
$legend = $legend_raw === '' || in_array($legend_raw, ['Payment provider', 'Provider type'], true)
  ? __('Payment provider', 'fame_lahjoitukset')
  : $legend_raw;

$showLegend = array_key_exists('showLegend', $attributes) ? (bool) $attributes['showLegend'] : true;

$grouped = [];
foreach ($providers as $p) {
  if (!is_array($p)) {
    continue;
  }

  $type  = isset($p['type']) ? (string) $p['type'] : '';
  $value = isset($p['value']) ? (string) $p['value'] : '';
  $label = isset($p['label']) ? (string) $p['label'] : '';

  if ($type === '' || $value === '') {
    continue;
  }

  if (!isset($grouped[$type])) {
    $grouped[$type] = [];
  }

  $grouped[$type][] = ['type' => $type, 'value' => $value, 'label' => $label];
}

// Filter the saved selection against the providers currently enabled for this
// organization, so a provider disabled after the block was saved never renders.
// Fails closed: when the API is unreachable or the slug is missing, do not show
// stale provider choices that may no longer be valid for this organization.
$enabled = (new Settings())->getEnabledProviders();
$providers_unavailable = !is_array($enabled) || $enabled === [];
$display_provider_label = static function (string $value, string $label): string {
  if (in_array(strtolower($value), ['checkout', 'paytrail'], true)) {
    $normalized_label = strtolower(trim($label));
    // Empty and legacy provider names intentionally mean "use the Paytrail default".
    if ($normalized_label === '' || in_array($normalized_label, ['checkout', 'paytrail'], true)) {
      return 'Paytrail';
    }
  }

  return $label;
};

if ($providers_unavailable) {
  $grouped = [];
} else {
  foreach ($grouped as $type => $list) {
    $filtered = [];
    $priorities = [];

    foreach ($list as $provider) {
      $value = (string) $provider['value'];
      $was_native_paytrail = strtolower($value) === 'paytrail';

      // Migrate legacy Checkout selections when the backend starts exposing
      // the same provider by its current Paytrail machine name.
      if (
        strtolower($value) === 'checkout' &&
        isset($enabled['paytrail']) &&
        $enabled['paytrail']->supportsType((string) $type)
      ) {
        $provider['value'] = 'paytrail';
        $provider['label'] = $display_provider_label('paytrail', (string) $provider['label']);
        $value = 'paytrail';
      }

      if (isset($enabled[$value]) && $enabled[$value]->supportsType((string) $type)) {
        if (in_array(strtolower($value), ['checkout', 'paytrail'], true)) {
          $provider['label'] = $display_provider_label($value, (string) $provider['label']);
        }
        $key = strtolower($value);
        $priority = $was_native_paytrail ? 2 : 1;

        if (!isset($priorities[$key]) || $priority > $priorities[$key]) {
          $filtered[$key] = $provider;
          $priorities[$key] = $priority;
        }
      }
    }

    if ($filtered) {
      $grouped[$type] = array_values($filtered);
    } else {
      unset($grouped[$type]);
    }
  }

  $providers_unavailable = $grouped === [];
}

$legendAlign_raw = isset($attributes['legendAlign']) ? (string) $attributes['legendAlign'] : 'left';
$legendAlign     = in_array($legendAlign_raw, ['left', 'center', 'right', 'justify'], true)
  ? $legendAlign_raw
  : 'left';
$legend_style = 'text-align:' . $legendAlign . ';';

$wrapper_attrs = get_block_wrapper_attributes();

?>
<div <?php echo $wrapper_attrs; ?>>
  <?php if ($providers_unavailable) : ?>
    <div class="fame-form__notice fame-form__notice--warning" role="status">
      <?php echo esc_html__('Payment methods are currently unavailable. Please try again later.', 'fame_lahjoitukset'); ?>
    </div>
  <?php endif; ?>

  <?php foreach ($grouped as $type => $list) :
    $single = count($list) === 1;

    // A single provider renders as a hidden input, so there is nothing for the
    // legend to label: drop it entirely instead of exposing it to assistive tech.
    $legend_class = 'fame-form__legend' . ($showLegend ? '' : ' screen-reader-text');
    $fieldset_class = 'payment-method-selector fame-form__fieldset'
      . ($single ? ' payment-method-selector--hidden' : '');
  ?>
    <fieldset
      class="<?php echo esc_attr($fieldset_class); ?>"
      data-type="<?php echo esc_attr((string) $type); ?>">
      <?php if (!$single) : ?>
        <legend class="<?php echo esc_attr($legend_class); ?>" style="<?php echo esc_attr($legend_style); ?>">
          <?php echo esc_html($legend); ?>
        </legend>
      <?php endif; ?>

      <?php if ($single) : ?>
        <input
          type="hidden"
          name="provider"
          value="<?php echo esc_attr((string) $list[0]['value']); ?>"
          data-type="<?php echo esc_attr((string) $list[0]['type']); ?>" />
      <?php else : ?>

      <?php foreach ($list as $provider) :
        $ptype = (string) $provider['type'];
        $pval  = (string) $provider['value'];
        $plab  = (string) $provider['label'];

        $id = 'payment_method_' . sanitize_key($ptype) . '_' . sanitize_key($pval);
      ?>
        <div
          class="fame-form__group"
          data-type="<?php echo esc_attr($ptype); ?>">
          <label for="<?php echo esc_attr($id); ?>" class="fame-form__label">
            <input
              class="fame-form__check-input"
              type="radio"
              id="<?php echo esc_attr($id); ?>"
              name="provider"
              value="<?php echo esc_attr($pval); ?>"
              data-type="<?php echo esc_attr($ptype); ?>"
              required />
            <?php echo esc_html($plab); ?>
          </label>
        </div>

      <?php endforeach; ?>
      <?php endif; ?>
    </fieldset>
  <?php endforeach; ?>

  <?php
  // Render InnerBlocks content (e.g. terms paragraph).
  if (!empty($content)) {
    echo $content;
  }
  ?>
</div>
