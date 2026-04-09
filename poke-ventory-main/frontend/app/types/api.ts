/**
 * Types pour les entités de l'API
 */

export type SubjectType = "cards" | "sealed";

export interface Card {
	id: string;
	local_id: string;
	name: string;
	image: string | null;
	hp: number | null;
	types: string[] | null;
	evolves_from: string | null;
	stage: string | null;
	rarity: string | null;
	category: string | null;
	illustrator: string | null;
	set_id: string;
	created_at: string;
	updated_at: string | null;
}

export interface Set {
	id: string;
	name: string;
	logo: string | null;
	symbol: string | null;
	card_count_official: number | null;
	card_count_total: number | null;
	release_date: string | null;
	series_id: string;
	created_at: string;
	updated_at: string | null;
}

export interface Series {
	id: string;
	name: string;
	logo: string | null;
	created_at: string;
	updated_at: string | null;
}

// Filtres
export interface CardFilters {
	set_id?: string | string[];
	series_id?: string | string[];
	name?: string;
	rarity?: string | string[];
	category?: string | string[];
	type?: string | string[];
	stage?: string | string[];
	local_id?: string;
	skip?: number;
	limit?: number;
}

export interface CardsResponse {
	items: Card[];
	total: number;
	skip: number;
	limit: number;
}

export interface SetFilters {
	series_id?: string;
	name?: string;
	skip?: number;
	limit?: number;
}

export interface DetectedMetadata {
	bounding_box?: number[];
	raw_text?: string;
	probable_name?: string;
	local_number?: string;
	set_hint?: string;
	hp_hint?: string;
	type_hint?: string[];
	attacks?: string[];
	illustrator_hint?: string;
	release_year?: string;
	raw_lines?: string[];
}

export interface CardCandidate {
	card_id: string;
	name: string;
	set_id: string;
	set_name: string;
	local_id: string;
	rarity?: string | null;
	score: number;
}

export interface CardDraft {
	id: string;
	batch_id: string;
	image_id: string;
	image_url: string;
	status: string;
	subject_type: SubjectType;
	candidates: CardCandidate[];
	top_candidate_id?: string | null;
	top_candidate_score?: number | null;
	detected_metadata?: DetectedMetadata | null;
	created_at: string;
}

export interface ImportBatchResponse {
	batch_id: string;
	drafts: CardDraft[];
	report_path?: string | null;
}

export interface CardSelectionPayload {
	card_id: string;
	quantity?: number;
	condition?: string;
	price_paid?: number | null;
	acquired_at?: string | null;
	notes?: string | null;
}

export interface UserCard {
	id: string;
	card_id: string;
	user_id: number;
	quantity: number;
	condition: string;
	price_paid?: number | null;
	acquired_at?: string | null;
	source?: string | null;
	notes?: string | null;
	created_at: string;
	updated_at?: string | null;
	card?: {
		id: string;
		name: string;
		local_id: string;
		image: string | null;
		set_id: string;
		rarity: string | null;
		category: string | null;
	} | null;
}

export interface UserCardsResponse {
	items: UserCard[];
	total: number;
	skip: number;
	limit: number;
}

export interface UserCardCreate {
	card_id: string;
	quantity?: number;
	condition?: string;
	price_paid?: number | null;
	acquired_at?: string | null;
	source?: string | null;
	notes?: string | null;
}

export interface UserMasterSet {
	id: string;
	user_id: number;
	set_id: string;
	tracked_card_count: number;
	owned_card_count: number;
	completion_rate: number;
	status: string;
}

export interface CardSelectionResponse {
	draft: CardDraft;
	user_card: UserCard;
	master_set?: UserMasterSet | null;
}
