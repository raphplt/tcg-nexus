import messages from "~/messages/fr.json";

/**
 * Composable pour les traductions
 */
export const useI18n = () => {
	const t = (key: string): string => {
		const keys = key.split(".");
		let value: any = messages;
		
		for (const k of keys) {
			if (value && typeof value === "object" && k in value) {
				value = value[k];
			} else {
				return key;
			}
		}
		
		return typeof value === "string" ? value : key;
	};

	return { t };
};

