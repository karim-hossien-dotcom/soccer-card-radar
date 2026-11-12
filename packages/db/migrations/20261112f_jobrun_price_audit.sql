-- Independent Sunday price audit writes its own JobRun row (F5, Karim Nov 12 2026). Applied.
alter table "JobRun" drop constraint "JobRun_job_check";
alter table "JobRun" add constraint "JobRun_job_check" check (job = any (array['prices','players','photos','price-audit']));
