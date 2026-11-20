-- Pricing queue (Karim approved Nov 20 2026). Applied to Supabase Nov 20 2026 (migration "price_queue").
-- The database is the task board: one PriceTask per card+grade per run, claimed with a lease so stalled work returns to the
-- pile and two writers never take the same card. Helpers write ProposedComp rows; the checker approves or rejects them;
-- apply_proposed_comps writes approved rows to CardComp + CompSale (duplicate sales skipped, a failing row is marked failed).
create table if not exists "PriceTask" (
  id bigserial primary key,
  "runId" text not null,
  job text not null default 'prices',
  "cardId" uuid not null references "Card"(id),
  grade text not null,
  reason text,
  priority int not null default 100,
  status text not null default 'todo' check (status in ('todo','claimed','proposed','applied','open','skipped')),
  "claimedBy" text,
  "leaseUntil" timestamptz,
  attempts int not null default 0,
  "lastError" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("runId","cardId",grade)
);
create index if not exists price_task_pick on "PriceTask" ("runId", status, priority, id);
alter table "PriceTask" enable row level security;

create table if not exists "ProposedComp" (
  id bigserial primary key,
  "taskId" bigint references "PriceTask"(id),
  "runId" text not null,
  "cardId" uuid not null references "Card"(id),
  grade text not null,
  price numeric(10,2) not null check (price > 0),
  low numeric(10,2), high numeric(10,2),
  "sampleSize" int not null default 0,
  method text not null,
  source text not null,
  "asOf" date not null,
  confidence int,
  sales jsonb not null default '[]'::jsonb,
  "guardOk" boolean,
  "guardErrors" jsonb,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','applied','failed')),
  "checkedBy" text, "checkedAt" timestamptz, "checkNote" text,
  "appliedCompId" int references "CardComp"(id),
  "applyError" text,
  "createdAt" timestamptz not null default now()
);
create index if not exists proposed_comp_run on "ProposedComp" ("runId", status);
alter table "ProposedComp" enable row level security;

create or replace function claim_price_tasks(p_run text, p_worker text, p_n int default 12, p_lease interval default interval '45 minutes')
returns setof "PriceTask" language plpgsql as $$
begin
  return query
  update "PriceTask" t set status='claimed', "claimedBy"=p_worker, "leaseUntil"=now()+p_lease, attempts=t.attempts+1, "updatedAt"=now()
  where t.id in (
    select id from "PriceTask"
    where "runId"=p_run and (status='todo' or (status='claimed' and "leaseUntil" < now()))
    order by priority, id
    for update skip locked
    limit p_n)
  returning t.*;
end $$;

create or replace function apply_proposed_comps(p_run text)
returns table(applied int, failed int) language plpgsql as $$
declare r record; v_id int; n_ok int := 0; n_bad int := 0;
begin
  for r in select * from "ProposedComp" where "runId"=p_run and status='approved' order by id for update loop
    begin
      insert into "CardComp" ("cardId",grade,price,low,high,"sampleSize",method,source,"asOf",confidence)
      values (r."cardId",r.grade,r.price,r.low,r.high,r."sampleSize",r.method,r.source,r."asOf",r.confidence)
      returning id into v_id;
      insert into "CompSale" ("compId",date,price,title,source,url,kept,"rejectReason")
      select v_id, (s->>'date')::date, (s->>'price')::numeric, s->>'title', s->>'source', s->>'url',
             coalesce((s->>'kept')::boolean,false), nullif(s->>'rejectReason','')
      from jsonb_array_elements(r.sales) s
      on conflict do nothing;
      update "ProposedComp" set status='applied', "appliedCompId"=v_id where id=r.id;
      update "PriceTask" set status='applied', "updatedAt"=now() where id=r."taskId";
      n_ok := n_ok + 1;
    exception when others then
      update "ProposedComp" set status='failed', "applyError"=sqlerrm where id=r.id;
      n_bad := n_bad + 1;
    end;
  end loop;
  return query select n_ok, n_bad;
end $$;

create or replace view price_queue_status as
select "runId", job,
  count(*) filter (where status='todo')::int as todo,
  count(*) filter (where status='claimed' and "leaseUntil" >= now())::int as working,
  count(*) filter (where status='claimed' and "leaseUntil" < now())::int as stalled,
  count(*) filter (where status='proposed')::int as proposed,
  count(*) filter (where status='applied')::int as applied,
  count(*) filter (where status in ('open','skipped'))::int as open,
  max("updatedAt") as last_activity,
  min("createdAt") as started
from "PriceTask" group by 1,2;
