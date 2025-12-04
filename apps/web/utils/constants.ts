export const FULLSCREEN_PATHS = ["/auth/login", "/auth/register", "/strategy"];

// Routes qui nécessitent une authentification
export const PROTECTED_ROUTES = [
  "/collection",
  "/pokemon/smash-or-pass",
  "/profile",
  "/dashboard",
  "/marketplace/create",
  "/tournaments/create",
  "/tournaments/admin",
  "/admin",
  "/settings",
];

// Routes d'authentification (rediriger si déjà connecté)
export const AUTH_ROUTES = ["/auth/login", "/auth/register"];
