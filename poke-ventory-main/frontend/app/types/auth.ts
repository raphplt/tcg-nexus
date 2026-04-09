/**
 * Types pour l'authentification
 */

export interface User {
	id: string;
	email: string;
	username: string;
	created_at: string;
	updated_at: string | null;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface RegisterData {
	email: string;
	username: string;
	password: string;
}

export interface AuthResponse {
	access_token: string;
	refresh_token: string;
	token_type: string;
}
