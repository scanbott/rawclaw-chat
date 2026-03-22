-- RawClaw Shared Schema
-- One Supabase per company. Both rawclaw-platform and rawclaw-chat connect to it.

-- Company settings (key-value config)
create table public.company_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Users (shared across both products)
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text,
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  product_access text not null default 'chat' check (product_access in ('platform', 'chat', 'both')),
  team_id uuid references public.teams(id),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add FK from teams.created_by to users now that users table exists
alter table public.teams add constraint teams_created_by_fkey foreign key (created_by) references public.users(id);

-- Knowledge base documents
create table public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'general',
  subcategory text,
  tags text[] default '{}',
  source text not null default 'manual' check (source in ('manual', 'agent', 'integration')),
  status text not null default 'approved' check (status in ('approved', 'pending_review', 'rejected', 'draft')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat history (Company LLM chats)
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'New Chat',
  starred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Agent definitions (platform-managed, shared)
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  system_prompt text default '',
  model text,
  skills text[] default '{}',
  tools jsonb default '[]',
  enabled boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Agent teams (groups of agents)
create table public.agent_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  orchestration_mode text default 'sequential',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.agent_team_members (
  team_id uuid not null references public.agent_teams(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  sort_order integer default 0,
  primary key (team_id, agent_id)
);

-- Agent execution logs
create table public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id),
  user_id uuid references public.users(id),
  chat_id uuid references public.chats(id),
  prompt text,
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'stopped')),
  result text,
  metadata jsonb default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Integration configs
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  config jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ingestion queue (for webhook/integration data)
create table public.ingestion_queue (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Employee account connections (OAuth tokens)
create table public.user_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

-- Indexes
create index idx_knowledge_docs_category on public.knowledge_docs(category);
create index idx_knowledge_docs_status on public.knowledge_docs(status);
create index idx_chats_user_id on public.chats(user_id);
create index idx_messages_chat_id on public.messages(chat_id);
create index idx_agent_logs_agent_id on public.agent_logs(agent_id);
create index idx_agent_logs_user_id on public.agent_logs(user_id);
create index idx_agent_logs_status on public.agent_logs(status);
create index idx_ingestion_queue_status on public.ingestion_queue(status);
create index idx_user_connections_user_id on public.user_connections(user_id);

-- Row Level Security
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_docs enable row level security;
alter table public.agent_logs enable row level security;
alter table public.user_connections enable row level security;

-- RLS Policies: Chats
create policy "Users see own chats" on public.chats
  for all using (user_id = auth.uid());

create policy "Managers see team chats" on public.chats
  for select using (
    exists (
      select 1 from public.users u1
      join public.users u2 on u1.team_id = u2.team_id
      where u1.id = auth.uid()
      and u1.role in ('manager', 'admin')
      and u2.id = chats.user_id
    )
  );

create policy "Admins see all chats" on public.chats
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- RLS Policies: Messages (follow chat access)
create policy "Users see own messages" on public.messages
  for all using (
    exists (select 1 from public.chats where id = messages.chat_id and user_id = auth.uid())
  );

create policy "Managers see team messages" on public.messages
  for select using (
    exists (
      select 1 from public.chats c
      join public.users u1 on u1.id = auth.uid()
      join public.users u2 on u2.id = c.user_id and u1.team_id = u2.team_id
      where c.id = messages.chat_id
      and u1.role in ('manager', 'admin')
    )
  );

create policy "Admins see all messages" on public.messages
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- RLS Policies: Knowledge docs (all authenticated users can read approved)
create policy "All users read approved knowledge" on public.knowledge_docs
  for select using (status = 'approved');

create policy "Admins manage all knowledge" on public.knowledge_docs
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- RLS Policies: Agent logs
create policy "Users see own agent logs" on public.agent_logs
  for select using (user_id = auth.uid());

create policy "Admins see all agent logs" on public.agent_logs
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- RLS Policies: User connections (own only)
create policy "Users manage own connections" on public.user_connections
  for all using (user_id = auth.uid());
