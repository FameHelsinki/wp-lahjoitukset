<?php

declare(strict_types=1);

defined('ABSPATH') || exit;

/**
 * render.php for famehelsinki/donation-type
 *
 * @var array<string, mixed>|null $attributes Block attributes.
 * @var string|null              $content    Inner content (unused here).
 */

$attributes = $attributes ?? [];

$localized_default = static function ($value, string $legacy, string $translated): string {
  $value = trim((string) $value);
  return $value === '' || $value === $legacy ? $translated : $value;
};

$show_legend = array_key_exists('showLegend', $attributes) ? (bool) $attributes['showLegend'] : true;

$legend = $localized_default(
  $attributes['legend'] ?? '',
  'Donation type',
  __('Donation type', 'fame_lahjoitukset')
);

$legend_align_raw = isset($attributes['legendAlign']) ? (string) $attributes['legendAlign'] : 'left';
$legend_align     = in_array($legend_align_raw, ['left', 'center', 'right', 'justify'], true)
  ? $legend_align_raw
  : 'left';

$legend_classes = ['fame-form__legend'];

if (!$show_legend) {
  $legend_classes[] = 'screen-reader-text';
}

$legend_classes[] = 'has-text-align-' . $legend_align;

$legend_style = 'text-align:' . $legend_align . ';';

$saved_types = (isset($attributes['types']) && is_array($attributes['types'])) ? $attributes['types'] : [];
$saved_value = isset($attributes['value']) ? (string) $attributes['value'] : '';

$types = !empty($saved_types)
  ? $saved_types
  : [
    ['value' => 'single', 'label' => __('Single', 'fame_lahjoitukset')],
  ];

$types = array_values(array_filter(
  $types,
  static fn($t) =>
  is_array($t) && isset($t['value']) && (string) $t['value'] !== ''
));

$types = array_map(static function (array $type) use ($localized_default): array {
  $value = (string) $type['value'];
  if ($value === 'single') {
    $type['label'] = $localized_default($type['label'] ?? '', 'Single', __('Single', 'fame_lahjoitukset'));
  } elseif ($value === 'recurring') {
    $type['label'] = $localized_default($type['label'] ?? '', 'Recurring', __('Recurring', 'fame_lahjoitukset'));
  }
  return $type;
}, $types);

// Fallback
if (empty($types)) {
  $types = [
    ['value' => 'single', 'label' => __('Single', 'fame_lahjoitukset')],
  ];
}

$values = array_map(static fn($t) => (string) ($t['value'] ?? ''), $types);

$default_value =
  ($saved_value !== '' && in_array($saved_value, $values, true))
  ? $saved_value
  : (string) ($types[0]['value'] ?? '');

$is_hidden = count($types) <= 1;

$classes = $is_hidden
  ? 'fame-form__hidden'
  : 'fame-form__fieldset fame-form__fieldset--donation-type';

$wrapper_attrs = get_block_wrapper_attributes(['class' => $classes]);

?>

<?php if ($is_hidden) :
  $val = (string) ($types[0]['value'] ?? $default_value);
?>
  <div <?php echo $wrapper_attrs; ?>>
    <input type="hidden" name="type" value="<?php echo esc_attr($val); ?>" />
  </div>
<?php else : ?>
  <fieldset <?php echo $wrapper_attrs; ?>>

    <legend
      class="<?php echo esc_attr(implode(' ', $legend_classes)); ?>"
      style="<?php echo esc_attr($legend_style); ?>">
      <?php echo esc_html($legend); ?>
    </legend>

    <?php foreach ($types as $t) :
      $value = (string) ($t['value'] ?? '');
      $label = (string) (($t['label'] ?? '') !== '' ? $t['label'] : $value);
      $id    = 'donation-type-' . sanitize_title($value);
    ?>
      <div class="fame-form__group">
        <label for="<?php echo esc_attr($id); ?>" class="fame-form__label">
          <input
            id="<?php echo esc_attr($id); ?>"
            class="fame-form__check-input"
            type="radio"
            name="type"
            value="<?php echo esc_attr($value); ?>"
            <?php checked($value, $default_value); ?> />
          <?php echo esc_html($label); ?>
        </label>
      </div>
    <?php endforeach; ?>
  </fieldset>
<?php endif; ?>
