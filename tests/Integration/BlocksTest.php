<?php

declare(strict_types=1);

namespace Fame\WordPress\Lahjoitukset\Tests\Integration;

use WP_Block_Type_Registry;
use WP_UnitTestCase;

final class BlocksTest extends WP_UnitTestCase
{
    private const BLOCKS = [
        'famehelsinki/contact-form',
        'famehelsinki/donation-amounts',
        'famehelsinki/donation-campaigns',
        'famehelsinki/donation-form',
        'famehelsinki/donation-providers',
        'famehelsinki/donation-type',
		'famehelsinki/recurring-due-date',
        'famehelsinki/form-controls',
    ];

    public function testAllBlocksAreRegistered(): void
    {
        $registry = WP_Block_Type_Registry::get_instance();

        foreach (self::BLOCKS as $name) {
            $this->assertTrue($registry->is_registered($name), "Block $name is not registered.");
        }
    }

    public function testDonationFormBlockHasViewScript(): void
    {
        $block = WP_Block_Type_Registry::get_instance()->get_registered('famehelsinki/donation-form');

        $this->assertNotEmpty($block->view_script_handles);

        // The view script receives the backend configuration.
        $viewScript = reset($block->view_script_handles);
        $data = wp_scripts()->get_data($viewScript, 'data');
        $this->assertStringContainsString('backend_url', (string) $data);
    }

    public function testDonationFormMarkupSurvivesRendering(): void
    {
        $markup = '<!-- wp:famehelsinki/donation-form {"type":"single"} -->'
            . '<form class="wp-block-famehelsinki-donation-form" data-type="single"></form>'
            . '<!-- /wp:famehelsinki/donation-form -->';

        $rendered = do_blocks($markup);

        $this->assertStringContainsString('wp-block-famehelsinki-donation-form', $rendered);
    }

    public function testOtherAmountHelpTextIsRendered(): void
    {
		$settings = [
			[
				'type' => 'single',
				'default' => true,
				'defaultAmount' => 10,
				'minAmount' => 10,
				'maxAmount' => 10000,
				'helpText' => 'Vähintään 10€',
				'unit' => '€',
				'amounts' => [],
			]
		];

		$rendered = do_blocks('<!-- wp:famehelsinki/donation-amounts ' . wp_json_encode(['other' => true, 'settings' => $settings]) . ' /-->');

        $this->assertStringContainsString('id="single-amount-help"', $rendered);
        $this->assertStringContainsString('Vähintään 10€', $rendered);
        $this->assertStringContainsString('aria-describedby="single-amount-help"', $rendered);
    }

    public function testCampaignSelectorIsNotRenderedWithoutCampaigns(): void
    {
        $rendered = do_blocks('<!-- wp:famehelsinki/donation-campaigns ' . wp_json_encode(['campaigns' => []]) . ' /-->');

        $this->assertStringNotContainsString('name="campaign"', $rendered);
    }

    public function testSingleCampaignIsRenderedAsHiddenInput(): void
    {
        $rendered = do_blocks('<!-- wp:famehelsinki/donation-campaigns ' . wp_json_encode(['campaigns' => ['Spring']]) . ' /-->');

        $this->assertStringContainsString('<input type="hidden" name="campaign" value="Spring"', $rendered);
        $this->assertStringNotContainsString('<select', $rendered);
    }

    public function testMultipleCampaignsAreRenderedAsSelect(): void
    {
        $rendered = do_blocks('<!-- wp:famehelsinki/donation-campaigns ' . wp_json_encode(['campaigns' => ['Spring', 'Autumn']]) . ' /-->');

        $this->assertStringContainsString('<select name="campaign"', $rendered);
        $this->assertStringContainsString('<option value="Spring">', $rendered);
        $this->assertStringContainsString('<option value="Autumn">', $rendered);
    }

    public function testDueDateWithoutDaysIsRenderedAsHiddenInputWithDefaultDay(): void
    {
        $rendered = do_blocks('<!-- wp:famehelsinki/recurring-due-date ' . wp_json_encode(['days' => []]) . ' /-->');

        $this->assertStringContainsString('<input type="hidden" name="due_date" value="5"', $rendered);
        $this->assertStringContainsString('data-recurring-due-date-input', $rendered);
        $this->assertStringContainsString('disabled', $rendered);
        $this->assertStringNotContainsString('<select', $rendered);
    }

    public function testSingleDueDateDayIsRenderedAsHiddenInput(): void
    {
        $rendered = do_blocks('<!-- wp:famehelsinki/recurring-due-date ' . wp_json_encode(['days' => [12]]) . ' /-->');

        $this->assertStringContainsString('<input type="hidden" name="due_date" value="12"', $rendered);
        $this->assertStringNotContainsString('<select', $rendered);
    }

    public function testMultipleDueDateDaysAreRenderedAsSelect(): void
    {
        $rendered = do_blocks('<!-- wp:famehelsinki/recurring-due-date ' . wp_json_encode(['days' => [15, 1]]) . ' /-->');

        $this->assertStringContainsString('name="due_date"', $rendered);
        $this->assertStringNotContainsString('<input type="hidden" name="due_date"', $rendered);

        // Days are sorted, so the lowest day is the preselected default.
        $this->assertStringContainsString("<option value=\"1\"  selected='selected'>", $rendered);
        $this->assertStringContainsString('<option value="15" >', $rendered);
        $this->assertStringNotContainsString('<option value="2"', $rendered);
    }
}
