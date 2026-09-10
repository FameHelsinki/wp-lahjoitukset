<?php

declare(strict_types=1);

defined('ABSPATH') || exit;

/**
 * render.php for famehelsinki/donation-campaigns
 *
 * @param array    $attributes
 * @param string   $content
 * @param WP_Block $block
 */

/** @var array<string, mixed>|null $attributes */
$attributes = $attributes ?? [];

$campaigns = isset($attributes['campaigns']) && is_array($attributes['campaigns'])
  ? $attributes['campaigns']
  : [];

$campaigns = array_values(array_filter(array_map(static function ($campaign): string {
  return trim((string) $campaign);
}, $campaigns), static function (string $campaign): bool {
  return $campaign !== '';
}));

if (count($campaigns) === 0) {
  return;
}

if (count($campaigns) === 1) : ?>
  <input type="hidden" name="campaign" value="<?php echo esc_attr($campaigns[0]); ?>" />
<?php
  return;
endif;

$showLabel = array_key_exists('showLabel', $attributes) ? (bool) $attributes['showLabel'] : true;
$label_raw = trim((string) ($attributes['label'] ?? ''));
$label     = $label_raw === '' || $label_raw === 'Campaign'
  ? __('Campaign', 'fame_lahjoitukset')
  : $label_raw;

$wrapper_attrs = get_block_wrapper_attributes([
  'class' => 'fame-form__group',
]);

?>
<div <?php echo $wrapper_attrs; ?>>
  <label
    for="campaign"
    class="<?php echo esc_attr($showLabel ? 'fame-form__label' : 'fame-form__label screen-reader-text'); ?>">
    <?php echo esc_html($label); ?>
  </label>

  <select name="campaign" id="campaign" class="fame-form__input">
    <option value="" selected>
      <?php echo esc_html__('Select campaign', 'fame_lahjoitukset'); ?>
    </option>

    <?php foreach ($campaigns as $campaign) : ?>
      <option value="<?php echo esc_attr($campaign); ?>">
        <?php echo esc_html($campaign); ?>
      </option>
    <?php endforeach; ?>
  </select>
</div>
