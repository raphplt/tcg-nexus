export const FULLSCREEN_PATHS = ["/auth/login", "/auth/register"];

// Routes qui nécessitent une authentification
export const PROTECTED_ROUTES = [
  "/collection",
  "/pokemon/smash-or-pass",
  "/profile",
  "/dashboard",
  "/marketplace/create",
  "/marketplace/checkout",
  "/marketplace/listings",
  "/marketplace/orders",
  "/cart",
  "/orders",
  "/tournaments/create",
  "/tournaments/admin",
  "/admin",
  "/settings",
  "/support",
];

// Routes d'authentification (rediriger si déjà connecté)
export const AUTH_ROUTES = ["/auth/login", "/auth/register"];
