-- File: migrations/phase1/005a_fi_charset.sql

-- Character set for fractional indexing (base62, sortable)
CREATE OR REPLACE FUNCTION public.fi_charset()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $fi_charset$
    SELECT '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
$fi_charset$;

-- Get index of character in charset
CREATE OR REPLACE FUNCTION public.fi_char_index(p_char CHAR(1))
RETURNS INT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $fi_char_index$
    SELECT position(p_char IN fi_charset()) - 1;
$fi_char_index$;

-- Get character at index in charset
CREATE OR REPLACE FUNCTION public.fi_index_char(p_index INT)
RETURNS CHAR(1)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $fi_index_char$
    SELECT substring(fi_charset() FROM (p_index + 1) FOR 1);
$fi_index_char$;