/**
 * Use a translated default until the editor saves a genuinely custom value.
 * Legacy English defaults are treated as unsaved defaults for backwards compatibility.
 */
export function localizedDefault(
	value: string | undefined,
	legacyDefault: string,
	translatedDefault: string
): string {
	const trimmed = value?.trim() ?? ''
	return trimmed === '' || trimmed === legacyDefault ? translatedDefault : value!
}
