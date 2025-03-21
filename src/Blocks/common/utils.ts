export const formatPlaceholder = (str: string) =>
	str
		.replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase())
		.replace(/_/g, ' ')
