create extension if not exists "pgjwt" with schema "extensions";


create sequence "public"."document_collaborators_id_seq";

create table "public"."agents" (
    "id" text not null,
    "model_type" text not null,
    "model_id" text not null,
    "name" text not null,
    "description" text not null,
    "instructions" text not null,
    "contexts" text[] not null,
    "context_args" jsonb not null,
    "status" text not null,
    "capabilities" text[],
    "stats" jsonb not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "mcp_config" jsonb,
    "user_id" uuid
);


alter table "public"."agents" enable row level security;

create table "public"."conversations" (
    "key" text not null,
    "value" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."document_collaborators" (
    "id" integer not null default nextval('document_collaborators_id_seq'::regclass),
    "document_id" text not null,
    "agent_id" text not null,
    "role" text default 'collaborator'::text,
    "task_description" text,
    "status" text default 'assigned'::text,
    "assigned_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "completed_at" timestamp with time zone
);


alter table "public"."document_collaborators" enable row level security;

create table "public"."documents" (
    "id" text not null,
    "agent_id" text not null,
    "path" text not null,
    "content" text not null,
    "type" text not null,
    "metadata" jsonb default '{}'::jsonb,
    "chunks" jsonb default '[]'::jsonb,
    "indexed" boolean default false,
    "indexed_at" timestamp without time zone,
    "size" integer,
    "hash" text,
    "created_at" timestamp without time zone default now(),
    "updated_at" timestamp without time zone default now()
);


alter table "public"."documents" enable row level security;

create table "public"."sessions" (
    "id" text not null,
    "name" text not null,
    "agent_id" text not null,
    "daydreams_key" text not null,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "user_id" uuid
);


alter table "public"."sessions" enable row level security;

create table "public"."shared_documents" (
    "id" text not null,
    "title" text not null,
    "content" text default ''::text,
    "created_by" text,
    "status" text default 'draft'::text,
    "manager_notes" text,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
);


alter table "public"."shared_documents" enable row level security;

create table "public"."templates" (
    "id" text not null,
    "name" text not null,
    "description" text,
    "model_type" text,
    "model_id" text,
    "instructions" text,
    "contexts" jsonb,
    "context_args" jsonb,
    "capabilities" jsonb,
    "variables" jsonb,
    "example_prompts" jsonb,
    "tags" jsonb,
    "version" text default '1.0.0'::text,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "mcp_servers" jsonb default '[]'::jsonb,
    "status" text default 'active'::text,
    "owner_id" text,
    "metadata" jsonb default '{}'::jsonb
);


alter table "public"."templates" enable row level security;

alter sequence "public"."document_collaborators_id_seq" owned by "public"."document_collaborators"."id";

CREATE INDEX agents_model_type_idx ON public.agents USING btree (model_type);

CREATE UNIQUE INDEX agents_pkey ON public.agents USING btree (id);

CREATE INDEX agents_status_idx ON public.agents USING btree (status);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (key);

CREATE UNIQUE INDEX document_collaborators_document_id_agent_id_key ON public.document_collaborators USING btree (document_id, agent_id);

CREATE UNIQUE INDEX document_collaborators_pkey ON public.document_collaborators USING btree (id);

CREATE UNIQUE INDEX documents_agent_id_path_key ON public.documents USING btree (agent_id, path);

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

CREATE INDEX idx_agents_status ON public.agents USING btree (status);

CREATE INDEX idx_agents_user_id ON public.agents USING btree (user_id);

CREATE INDEX idx_document_collaborators_agent_id ON public.document_collaborators USING btree (agent_id);

CREATE INDEX idx_document_collaborators_document_id ON public.document_collaborators USING btree (document_id);

CREATE INDEX idx_document_collaborators_status ON public.document_collaborators USING btree (status);

CREATE INDEX idx_documents_agent_id ON public.documents USING btree (agent_id);

CREATE INDEX idx_documents_indexed ON public.documents USING btree (indexed);

CREATE INDEX idx_documents_path ON public.documents USING btree (path);

CREATE INDEX idx_documents_type ON public.documents USING btree (type);

CREATE INDEX idx_sessions_agent_id ON public.sessions USING btree (agent_id);

CREATE INDEX idx_sessions_daydreams_key ON public.sessions USING btree (daydreams_key);

CREATE INDEX idx_shared_documents_created_by ON public.shared_documents USING btree (created_by);

CREATE INDEX idx_shared_documents_status ON public.shared_documents USING btree (status);

CREATE INDEX idx_templates_created_at ON public.templates USING btree (created_at DESC);

CREATE INDEX idx_templates_name ON public.templates USING btree (name);

CREATE INDEX idx_templates_owner ON public.templates USING btree (owner_id);

CREATE INDEX idx_templates_status ON public.templates USING btree (status);

CREATE INDEX idx_templates_tags ON public.templates USING gin (tags);

CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (id);

CREATE UNIQUE INDEX shared_documents_pkey ON public.shared_documents USING btree (id);

CREATE UNIQUE INDEX templates_pkey ON public.templates USING btree (id);

alter table "public"."agents" add constraint "agents_pkey" PRIMARY KEY using index "agents_pkey";

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."document_collaborators" add constraint "document_collaborators_pkey" PRIMARY KEY using index "document_collaborators_pkey";

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."sessions" add constraint "sessions_pkey" PRIMARY KEY using index "sessions_pkey";

alter table "public"."shared_documents" add constraint "shared_documents_pkey" PRIMARY KEY using index "shared_documents_pkey";

alter table "public"."templates" add constraint "templates_pkey" PRIMARY KEY using index "templates_pkey";

alter table "public"."agents" add constraint "agents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."agents" validate constraint "agents_user_id_fkey";

alter table "public"."document_collaborators" add constraint "document_collaborators_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE not valid;

alter table "public"."document_collaborators" validate constraint "document_collaborators_agent_id_fkey";

alter table "public"."document_collaborators" add constraint "document_collaborators_document_id_agent_id_key" UNIQUE using index "document_collaborators_document_id_agent_id_key";

alter table "public"."document_collaborators" add constraint "document_collaborators_document_id_fkey" FOREIGN KEY (document_id) REFERENCES shared_documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_collaborators" validate constraint "document_collaborators_document_id_fkey";

alter table "public"."documents" add constraint "documents_agent_id_path_key" UNIQUE using index "documents_agent_id_path_key";

alter table "public"."documents" add constraint "documents_type_check" CHECK ((type = ANY (ARRAY['markdown'::text, 'json'::text, 'text'::text, 'yaml'::text]))) not valid;

alter table "public"."documents" validate constraint "documents_type_check";

alter table "public"."sessions" add constraint "sessions_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_agent_id_fkey";

alter table "public"."sessions" add constraint "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_user_id_fkey";

alter table "public"."templates" add constraint "templates_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'draft'::text, 'archived'::text]))) not valid;

alter table "public"."templates" validate constraint "templates_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.approve_user(user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"approved": true}'::jsonb,
        email_confirmed_at = CASE 
            WHEN email_confirmed_at IS NULL THEN NOW() 
            ELSE email_confirmed_at 
        END,
        updated_at = NOW()
    WHERE email = user_email;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_table_if_not_exists(table_name text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ', table_name);
END;$function$
;

CREATE OR REPLACE FUNCTION public.is_user_approved(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = user_id 
        AND (raw_user_meta_data->>'approved')::boolean = true
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_user_approval(user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"approved": false}'::jsonb,
        updated_at = NOW()
    WHERE email = user_email;
END;
$function$
;

create or replace view "public"."user_approval_list" as  SELECT users.id,
    users.email,
    COALESCE(((users.raw_user_meta_data ->> 'approved'::text))::boolean, false) AS is_approved,
    (users.raw_user_meta_data ->> 'full_name'::text) AS full_name,
    users.created_at,
    users.last_sign_in_at,
    (users.email_confirmed_at IS NOT NULL) AS email_confirmed
   FROM auth.users
  ORDER BY users.created_at DESC;


create or replace view "public"."user_profiles" as  SELECT users.id,
    users.email,
    (users.raw_user_meta_data ->> 'approved'::text) AS is_approved,
    (users.raw_user_meta_data ->> 'full_name'::text) AS full_name,
    users.created_at,
    users.updated_at,
    users.email_confirmed_at
   FROM auth.users;


create policy "Allow all operations for authenticated and anon users"
on "public"."agents"
as permissive
for all
to authenticated, anon
using (true)
with check (true);


create policy "Enable all operations for agents"
on "public"."agents"
as permissive
for all
to public
using (true)
with check (true);


create policy "Users can create own agents"
on "public"."agents"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can delete own agents"
on "public"."agents"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Users can update own agents"
on "public"."agents"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view own agents"
on "public"."agents"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "Allow all operations for authenticated and anon users"
on "public"."document_collaborators"
as permissive
for all
to authenticated, anon
using (true)
with check (true);


create policy "Allow all operations for authenticated and anon users"
on "public"."sessions"
as permissive
for all
to authenticated, anon
using (true)
with check (true);


create policy "Users can create own sessions"
on "public"."sessions"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can delete own sessions"
on "public"."sessions"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Users can update own sessions"
on "public"."sessions"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view own sessions"
on "public"."sessions"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "Allow all operations for authenticated and anon users"
on "public"."shared_documents"
as permissive
for all
to authenticated, anon
using (true)
with check (true);


create policy "Allow all operations for authenticated and anon users"
on "public"."templates"
as permissive
for all
to authenticated, anon
using (true)
with check (true);



