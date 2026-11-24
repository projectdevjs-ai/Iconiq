-- ICONIQ · CORRECTIF : copie tout, puis Supabase > SQL Editor > + > colle > Run
create extension if not exists pgcrypto with schema extensions;
create or replace function public.gen_random_bytes(int) returns bytea
language sql volatile set search_path = extensions as $$ select extensions.gen_random_bytes($1) $$;
notify pgrst, 'reload schema';
