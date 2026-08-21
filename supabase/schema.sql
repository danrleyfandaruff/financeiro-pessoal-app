-- ============================================================
-- CONTROLE FINANCEIRO PESSOAL — SCHEMA COMPLETO
-- Execute no SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- ── PERFIS ────────────────────────────────────────────────────
create table if not exists perfis (
  id        uuid references auth.users(id) on delete cascade primary key,
  nome      text,
  criado_em timestamptz default now()
);

-- ── CATEGORIAS ────────────────────────────────────────────────
create table if not exists categorias (
  id        uuid default gen_random_uuid() primary key,
  user_id   uuid references auth.users(id) on delete cascade not null,
  nome      text not null,
  tipo      text not null check (tipo in ('entrada', 'saida', 'ambos')),
  criado_em timestamptz default now(),
  unique (user_id, nome)
);

-- ── CAIXA (livro-razão de todas as movimentações efetivas) ────
create table if not exists caixa (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  tipo            text not null check (tipo in ('entrada', 'saida')),
  descricao       text not null,
  valor           numeric(10,2) not null check (valor > 0),
  data            date not null default current_date,
  categoria       text,
  forma_pagamento text check (forma_pagamento in ('PIX','Dinheiro','Cartão Débito','Cartão Crédito','Transferência')),
  observacoes     text,
  origem          text check (origem in ('manual','conta_pagar','conta_receber','recorrencia')),
  criado_em       timestamptz default now()
);

-- ── CONTAS A PAGAR ────────────────────────────────────────────
create table if not exists contas_pagar (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  descricao       text not null,
  valor           numeric(10,2) not null check (valor > 0),
  vencimento      date not null,
  categoria       text,
  pago            boolean not null default false,
  data_pagamento  date,
  forma_pagamento text,
  id_caixa        uuid references caixa(id) on delete set null,
  id_recorrencia  uuid,
  numero_parcela  int,
  observacoes     text,
  criado_em       timestamptz default now()
);

-- ── CONTAS A RECEBER ──────────────────────────────────────────
create table if not exists contas_receber (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  descricao        text not null,
  valor            numeric(10,2) not null check (valor > 0),
  vencimento       date not null,
  categoria        text,
  pago             boolean not null default false,
  data_recebimento date,
  forma_pagamento  text,
  id_caixa         uuid references caixa(id) on delete set null,
  observacoes      text,
  criado_em        timestamptz default now()
);

-- ── RECORRÊNCIAS / PARCELAMENTOS ──────────────────────────────
create table if not exists recorrencias (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  tipo            text not null check (tipo in ('entrada', 'saida')),
  descricao       text not null,
  valor_parcela   numeric(10,2) not null check (valor_parcela > 0),
  total_parcelas  int,
  periodicidade   text not null check (periodicidade in ('semanal','quinzenal','mensal','bimestral','trimestral','semestral','anual')),
  data_inicio     date not null,
  categoria       text,
  cancelado       boolean not null default false,
  observacoes     text,
  criado_em       timestamptz default now()
);

-- FK diferida para evitar circular reference
alter table contas_pagar
  add constraint contas_pagar_recorrencia_fk
  foreign key (id_recorrencia) references recorrencias(id) on delete set null;

-- ── PATRIMÔNIO ────────────────────────────────────────────────
create table if not exists patrimonio (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  nome           text not null,
  descricao      text,
  valor          numeric(10,2) not null check (valor > 0),
  data_aquisicao date not null,
  categoria      text,
  id_caixa       uuid references caixa(id) on delete set null,
  criado_em      timestamptz default now()
);


-- ══════════════════════════════════════════════════════════════
--  INDEXES
-- ══════════════════════════════════════════════════════════════

create index if not exists caixa_user_data_idx          on caixa(user_id, data);
create index if not exists contas_pagar_user_idx        on contas_pagar(user_id, vencimento);
create index if not exists contas_receber_user_idx      on contas_receber(user_id, vencimento);
create index if not exists recorrencias_user_idx        on recorrencias(user_id);
create index if not exists patrimonio_user_idx          on patrimonio(user_id);


-- ══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

alter table perfis          enable row level security;
alter table categorias      enable row level security;
alter table caixa           enable row level security;
alter table contas_pagar    enable row level security;
alter table contas_receber  enable row level security;
alter table recorrencias    enable row level security;
alter table patrimonio      enable row level security;

-- Perfis
create policy "perfis_select" on perfis for select using (auth.uid() = id);
create policy "perfis_insert" on perfis for insert with check (auth.uid() = id);
create policy "perfis_update" on perfis for update using (auth.uid() = id);

-- Policies para tabelas com user_id
do $$
declare tbl text;
begin
  foreach tbl in array array['categorias','caixa','contas_pagar','contas_receber','recorrencias','patrimonio']
  loop
    execute format('create policy "%s_select" on %I for select using (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "%s_insert" on %I for insert with check (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "%s_update" on %I for update using (auth.uid() = user_id)', tbl, tbl);
    execute format('create policy "%s_delete" on %I for delete using (auth.uid() = user_id)', tbl, tbl);
  end loop;
end $$;


-- ══════════════════════════════════════════════════════════════
--  TRIGGER: cria perfil automaticamente no cadastro
-- ══════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Cria perfil
  insert into public.perfis (id, nome)
  values (new.id, new.raw_user_meta_data ->> 'nome');

  -- Cria categorias padrão
  insert into public.categorias (user_id, nome, tipo) values
    (new.id, 'Salário',          'entrada'),
    (new.id, 'Freelance',        'entrada'),
    (new.id, 'Investimentos',    'entrada'),
    (new.id, 'Aluguel recebido', 'entrada'),
    (new.id, 'Outros recebidos', 'entrada'),
    (new.id, 'Moradia/Aluguel',  'saida'),
    (new.id, 'Alimentação',      'saida'),
    (new.id, 'Mercado',          'saida'),
    (new.id, 'Restaurante',      'saida'),
    (new.id, 'Transporte',       'saida'),
    (new.id, 'Saúde/Farmácia',   'saida'),
    (new.id, 'Educação',         'saida'),
    (new.id, 'Lazer',            'saida'),
    (new.id, 'Vestuário',        'saida'),
    (new.id, 'Assinaturas',      'saida'),
    (new.id, 'Casa/Manutenção',  'saida'),
    (new.id, 'Impostos',         'saida'),
    (new.id, 'Outros',           'ambos');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ══════════════════════════════════════════════════════════════
--  FUNÇÃO: dar baixa numa conta a pagar (atômico)
-- ══════════════════════════════════════════════════════════════

create or replace function dar_baixa_conta_pagar(
  p_conta_id      uuid,
  p_data          date,
  p_forma         text
) returns void language plpgsql security definer as $$
declare
  v   contas_pagar%rowtype;
  cid uuid;
begin
  select * into v from contas_pagar where id = p_conta_id and user_id = auth.uid();
  if not found then raise exception 'Conta não encontrada'; end if;

  insert into caixa (user_id, tipo, descricao, valor, data, categoria, forma_pagamento, origem)
  values (auth.uid(), 'saida', v.descricao, v.valor, p_data, v.categoria, p_forma, 'conta_pagar')
  returning id into cid;

  update contas_pagar
  set pago = true, data_pagamento = p_data, forma_pagamento = p_forma, id_caixa = cid
  where id = p_conta_id;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  FUNÇÃO: dar baixa numa conta a receber (atômico)
-- ══════════════════════════════════════════════════════════════

create or replace function dar_baixa_conta_receber(
  p_conta_id uuid,
  p_data     date,
  p_forma    text
) returns void language plpgsql security definer as $$
declare
  v   contas_receber%rowtype;
  cid uuid;
begin
  select * into v from contas_receber where id = p_conta_id and user_id = auth.uid();
  if not found then raise exception 'Conta não encontrada'; end if;

  insert into caixa (user_id, tipo, descricao, valor, data, categoria, forma_pagamento, origem)
  values (auth.uid(), 'entrada', v.descricao, v.valor, p_data, v.categoria, p_forma, 'conta_receber')
  returning id into cid;

  update contas_receber
  set pago = true, data_recebimento = p_data, forma_pagamento = p_forma, id_caixa = cid
  where id = p_conta_id;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  FUNÇÃO: desfazer baixa conta a pagar
-- ══════════════════════════════════════════════════════════════

create or replace function desfazer_baixa_conta_pagar(p_conta_id uuid)
returns void language plpgsql security definer as $$
declare v contas_pagar%rowtype;
begin
  select * into v from contas_pagar where id = p_conta_id and user_id = auth.uid();
  if not found then raise exception 'Conta não encontrada'; end if;
  if v.id_caixa is not null then
    delete from caixa where id = v.id_caixa and user_id = auth.uid();
  end if;
  update contas_pagar
  set pago = false, data_pagamento = null, forma_pagamento = null, id_caixa = null
  where id = p_conta_id;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  FUNÇÃO: desfazer baixa conta a receber
-- ══════════════════════════════════════════════════════════════

create or replace function desfazer_baixa_conta_receber(p_conta_id uuid)
returns void language plpgsql security definer as $$
declare v contas_receber%rowtype;
begin
  select * into v from contas_receber where id = p_conta_id and user_id = auth.uid();
  if not found then raise exception 'Conta não encontrada'; end if;
  if v.id_caixa is not null then
    delete from caixa where id = v.id_caixa and user_id = auth.uid();
  end if;
  update contas_receber
  set pago = false, data_recebimento = null, forma_pagamento = null, id_caixa = null
  where id = p_conta_id;
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  FUNÇÃO: gerar próxima parcela de uma recorrência
-- ══════════════════════════════════════════════════════════════

create or replace function gerar_proxima_parcela(p_rec_id uuid)
returns void language plpgsql security definer as $$
declare
  rec       recorrencias%rowtype;
  ultima    date;
  proxima   date;
  num       int;
  intervalo interval;
begin
  select * into rec from recorrencias where id = p_rec_id and user_id = auth.uid();
  if not found then raise exception 'Recorrência não encontrada'; end if;
  if rec.cancelado then raise exception 'Recorrência cancelada'; end if;

  select count(*) into num from contas_pagar where id_recorrencia = p_rec_id;
  if rec.total_parcelas is not null and num >= rec.total_parcelas then
    raise exception 'Todas as parcelas já foram geradas';
  end if;

  intervalo := case rec.periodicidade
    when 'semanal'    then '7 days'::interval
    when 'quinzenal'  then '15 days'::interval
    when 'mensal'     then '1 month'::interval
    when 'bimestral'  then '2 months'::interval
    when 'trimestral' then '3 months'::interval
    when 'semestral'  then '6 months'::interval
    when 'anual'      then '1 year'::interval
  end;

  select max(vencimento) into ultima from contas_pagar where id_recorrencia = p_rec_id;
  proxima := coalesce(ultima + intervalo, rec.data_inicio);

  insert into contas_pagar (user_id, descricao, valor, vencimento, categoria, id_recorrencia, numero_parcela)
  values (auth.uid(), rec.descricao, rec.valor_parcela, proxima, rec.categoria, p_rec_id, num + 1);
end;
$$;


-- ══════════════════════════════════════════════════════════════
--  VIEW: evolução mensal (últimos 12 meses)
-- ══════════════════════════════════════════════════════════════

create or replace view evolucao_mensal as
select
  user_id,
  to_char(data, 'YYYY-MM')                                          as mes,
  sum(case when tipo = 'entrada' then valor else 0 end)             as entradas,
  sum(case when tipo = 'saida'   then valor else 0 end)             as saidas,
  sum(case when tipo = 'entrada' then valor else -valor end)        as saldo
from caixa
group by user_id, to_char(data, 'YYYY-MM')
order by mes;


-- ══════════════════════════════════════════════════════════════
--  VIEW: conferência — contas pagas sem registro no caixa
-- ══════════════════════════════════════════════════════════════

create or replace view conferencia_inconsistencias as
select
  'conta_pagar'   as tipo,
  user_id,
  id              as id_referencia,
  descricao,
  valor,
  data_pagamento  as data
from contas_pagar
where pago = true and id_caixa is null
union all
select
  'conta_receber' as tipo,
  user_id,
  id,
  descricao,
  valor,
  data_recebimento
from contas_receber
where pago = true and id_caixa is null;


-- ══════════════════════════════════════════════════════════════
--  CATEGORIAS PADRÃO (chamadas após primeiro login)
-- ══════════════════════════════════════════════════════════════

-- Rode manualmente inserindo o UUID do seu usuário, ou crie via app.
-- Exemplo:
-- insert into categorias (user_id, nome, tipo) values
--   ('SEU-USER-UUID', 'Salário',          'entrada'),
--   ('SEU-USER-UUID', 'Freelance',        'entrada'),
--   ('SEU-USER-UUID', 'Investimentos',    'entrada'),
--   ('SEU-USER-UUID', 'Aluguel',          'saida'),
--   ('SEU-USER-UUID', 'Alimentação',      'saida'),
--   ('SEU-USER-UUID', 'Mercado',          'saida'),
--   ('SEU-USER-UUID', 'Transporte',       'saida'),
--   ('SEU-USER-UUID', 'Saúde/Farmácia',   'saida'),
--   ('SEU-USER-UUID', 'Lazer',            'saida'),
--   ('SEU-USER-UUID', 'Educação',         'saida'),
--   ('SEU-USER-UUID', 'Casa',             'saida'),
--   ('SEU-USER-UUID', 'Vestuário',        'saida'),
--   ('SEU-USER-UUID', 'Outros',           'ambos');
