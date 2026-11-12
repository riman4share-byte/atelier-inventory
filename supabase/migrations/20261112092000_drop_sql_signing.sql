-- ---------------------------------------------------------------------------
-- The signed link to a photograph is made by the `public-photo` function,
-- not here: this database has no function that can sign an object, so the
-- first attempt at doing it in SQL could not work.
--
-- The function that only reads the path is kept, because it is harmless and
-- it documents which photograph the public card shows.
-- ---------------------------------------------------------------------------

-- The old SQL signing attempt is removed: it did not compile against this
-- project's storage schema.
drop function if exists public.get_public_dress_photo_url(uuid);
