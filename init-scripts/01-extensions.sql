-- Postgres extensions required by card search and the OCR scan matcher.
-- Executed by the postgres image on first initialisation, so they exist before
-- TypeORM synchronises the schema and builds the indexes that depend on them.
-- Mirrors SeedService.enableExtensions(), which stays the path for databases
-- created before this script.

-- pg_trgm: trigram fuzzy search (% operator and similarity()).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent: "pokemon" must match "Pokémon", in every catalogue language.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is STABLE, so it cannot be indexed directly. This IMMUTABLE
-- wrapper pins the dictionary and is the form used by the catalogue indexes.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
$$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
