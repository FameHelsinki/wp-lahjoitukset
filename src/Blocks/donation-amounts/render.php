<?php

declare(strict_types=1);

defined('ABSPATH') || exit;

/**
 * render.php for famehelsinki/donation-amounts
 *
 * @param array    $attributes
 * @param string   $content
 * @param WP_Block $block
 */

/** @var array<string, mixed>|null $attributes */
$attributes = $attributes ?? [];

/**
 * Attribute helpers.
 */
$attr_bool = static function (string $key, bool $fallback = false) use ($attributes): bool {
  return array_key_exists($key, $attributes) ? (bool) $attributes[$key] : $fallback;
};

$attr_string = static function (string $key, string $fallback = '') use ($attributes): string {
  if (!isset($attributes[$key])) {
    return $fallback;
  }

  $value = (string) $attributes[$key];
  return trim($value) !== '' ? $value : $fallback;
};

$settings     = isset($attributes['settings']) && is_array($attributes['settings']) ? $attributes['settings'] : [];
$other        = $attr_bool('other', false);
$other_label  = $attr_string('otherLabel', __('Other amount', 'fame_lahjoitukset'));
$other_label  = $other_label === 'Other amount'
  ? __('Other amount', 'fame_lahjoitukset')
  : $other_label;
$show_legend  = $attr_bool('showLegend', true);
$legend       = $attr_string('legend', __('Donation amount', 'fame_lahjoitukset'));
$legend       = in_array($legend, ['Amount', 'Donation amount'], true)
  ? __('Donation amount', 'fame_lahjoitukset')
  : $legend;
$legend_align_raw = $attr_string('legendAlign', 'left');
$legend_align     = in_array($legend_align_raw, ['left', 'center', 'right', 'justify'], true)
  ? $legend_align_raw
  : 'left';

$legend_classes = ['fame-form__legend'];

if (!$show_legend) {
  $legend_classes[] = 'screen-reader-text';
}

$legend_classes[] = 'has-text-align-' . $legend_align;

/**
 * Safe int helper.
 */
$int = static function ($value, int $fallback): int {
  if (is_int($value)) {
    return $value;
  }
  if (is_string($value) && $value !== '' && is_numeric($value)) {
    return (int) $value;
  }
  if (is_float($value)) {
    return (int) $value;
  }
  return $fallback;
};

/**
 * Safe string helper.
 */
$str = static function ($value, string $fallback = ''): string {
  return isset($value) ? (string) $value : $fallback;
};

/**
 * Safe int attribute helper.
 */
$attr_int = static function (string $key, int $fallback) use ($attributes, $int): int {
  if (!array_key_exists($key, $attributes)) {
    return $fallback;
  }
  return $int($attributes[$key], $fallback);
};

$cols_amounts = $attr_int('colsAmounts', 3);
$cols_amounts = max(1, min(3, $cols_amounts));

/**
 * Find default type setting.
 */
$default_setting = null;
foreach ($settings as $s) {
  if (is_array($s) && !empty($s['default'])) {
    $default_setting = $s;
    break;
  }
}
if (!$default_setting && !empty($settings) && is_array($settings[0])) {
  $default_setting = $settings[0];
}

$DEFAULT_AMOUNT = 10;
$MIN_AMOUNT     = 10;
$MAX_AMOUNT     = 10000;
$DEFAULT_UNIT   = '€';

$default_amount_euros = $default_setting ? $int($default_setting['defaultAmount'] ?? null, $DEFAULT_AMOUNT) : $DEFAULT_AMOUNT;
$default_amount_cents = $default_amount_euros * 100;

// Visible if "other" or any type has amount buttons
$has_buttons = false;
foreach ($settings as $s) {
  if (is_array($s) && !empty($s['amounts']) && is_array($s['amounts'])) {
    foreach ($s['amounts'] as $a) {
      if (is_array($a) && !empty($a['value'])) {
        $has_buttons = true;
        break 2;
      }
    }
  }
}
$visible = $other || $has_buttons;

$wrapper_class = $visible
  ? 'fame-form__fieldset fame-form__fieldset--amounts'
  : 'fame-form__hidden';

$wrapper_attrs = get_block_wrapper_attributes([
  'class' => $wrapper_class,
  'style' => '--amount-cols:' . esc_attr((string) $cols_amounts) . ';',
]);

if (!$visible) : ?>
  <div <?php echo $wrapper_attrs; ?>>
    <input name="amount" type="hidden" value="<?php echo esc_attr((string) $default_amount_cents); ?>" />
  </div>
<?php
  return;
endif;
?>

<fieldset <?php echo $wrapper_attrs; ?>>

  <legend class="<?php echo esc_attr(implode(' ', $legend_classes)); ?>">
    <?php echo esc_html($legend); ?>
  </legend>

  <?php foreach ($settings as $type_setting) :
    if (!is_array($type_setting)) {
      continue;
    }

    $type = $str($type_setting['type'] ?? null, '');
    if ($type === '') {
      continue;
    }

    $is_default    = !empty($type_setting['default']);
    $unit          = $str($type_setting['unit'] ?? null, $DEFAULT_UNIT);
    $min_amount    = $int($type_setting['minAmount'] ?? null, $MIN_AMOUNT);
    $max_amount    = $int($type_setting['maxAmount'] ?? null, $MAX_AMOUNT);
    $help_text     = trim($str($type_setting['helpText'] ?? null, ''));
    $default_euros = $int($type_setting['defaultAmount'] ?? null, $DEFAULT_AMOUNT);

    $amounts = isset($type_setting['amounts']) && is_array($type_setting['amounts']) ? $type_setting['amounts'] : [];
  ?>

    <div
      class="<?php echo esc_attr("donation-amounts donation-amounts--{$type}"); ?>"
      data-type="<?php echo esc_attr($type); ?>"
      <?php echo $is_default ? ' data-default="1"' : ''; ?>
      data-default-amount="<?php echo esc_attr((string) $default_euros); ?>"
      data-min-amount="<?php echo esc_attr((string) $min_amount); ?>"
      data-max-amount="<?php echo esc_attr((string) $max_amount); ?>"
      style="<?php echo $is_default ? '' : 'display:none'; ?>">
      <?php
      $idx = 0;
      foreach ($amounts as $a) :
        if (!is_array($a)) {
          continue;
        }
        $value = $a['value'] ?? null;
        if ($value === null || $value === '' || !is_numeric($value)) {
          continue;
        }

        $value_str = (string) (int) $value;
        $id        = "{$type}-amount-{$idx}";
        $idx++;
      ?>
        <div class="fame-form__group">
          <label for="<?php echo esc_attr($id); ?>" class="fame-form__label">
            <input
              data-type="<?php echo esc_attr($type); ?>"
              class="fame-form__check-input"
              id="<?php echo esc_attr($id); ?>"
              name="<?php echo esc_attr("amount-radio-{$type}"); ?>"
              value="<?php echo esc_attr($value_str); ?>"
              type="radio" />
            <?php echo esc_html($value_str); ?>
            <span class="donation-amounts__unit"><?php echo esc_html($unit); ?></span>
          </label>
        </div>
      <?php endforeach; ?>
    </div>

    <?php if ($other) :
      $other_id = "{$type}-other";
      $help_id  = "{$type}-amount-help";
    ?>
      <div
        class="donation-amounts__other"
        data-type="<?php echo esc_attr($type); ?>"
        style="<?php echo $is_default ? '' : 'display:none'; ?>">
        <div class="label-wrapper">
          <label for="<?php echo esc_attr($other_id); ?>" class="fame-form__label">
            <?php echo esc_html($other_label); ?>
          </label>
          <span class="donation-amounts__unit"><?php echo esc_html($unit); ?></span>
        </div>

        <div class="donation-amounts__input-wrapper">
          <input
            id="<?php echo esc_attr($other_id); ?>"
            class="fame-form__input"
            name="<?php echo esc_attr("amount-{$type}"); ?>"
            type="number"
            min="<?php echo esc_attr((string) $min_amount); ?>"
            max="<?php echo esc_attr((string) $max_amount); ?>"
            value="<?php echo esc_attr((string) $default_euros); ?>"
            <?php if ($help_text !== '') : ?>
            aria-describedby="<?php echo esc_attr($help_id); ?>"
            <?php endif; ?> />
          <?php if ($help_text !== '') : ?>
            <small id="<?php echo esc_attr($help_id); ?>" class="fame-form__help">
              <?php echo esc_html($help_text); ?>
            </small>
          <?php endif; ?>
        </div>
      </div>
    <?php endif; ?>

  <?php endforeach; ?>

  <!-- Server expects name="amount" (in cents). JS keeps this updated. -->
  <input name="amount" type="hidden" value="<?php echo esc_attr((string) $default_amount_cents); ?>" />
</fieldset>
