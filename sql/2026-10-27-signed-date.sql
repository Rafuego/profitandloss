-- Signed-date logging for the dashboard's "Signed in <month>" figure.
-- Run in the Supabase SQL editor (Profit and Loss project). Safe to re-run.

alter table accounts add column if not exists signed_date date;

-- Backfill from the Ignition → Zapier → #12-closed-won feed (post dates
-- = contract close dates), accounts signed since mid-August 2026:
update accounts set signed_date = '2026-10-20' where name = 'Superintelligence Dynamics' and signed_date is null;
update accounts set signed_date = '2026-10-02' where name = 'Spring Lane Capital'         and signed_date is null;
update accounts set signed_date = '2026-09-30' where name = 'Whitespace'                  and signed_date is null;
update accounts set signed_date = '2026-09-26' where name = 'Specter Aero'                and signed_date is null;
update accounts set signed_date = '2026-09-18' where name = '1921'                        and signed_date is null;
update accounts set signed_date = '2026-09-17' where name like 'Antares%Deck'             and signed_date is null;
update accounts set signed_date = '2026-09-15' where name = 'Simbe Robotics'              and signed_date is null;
update accounts set signed_date = '2026-09-15' where name = 'AVERI'                       and signed_date is null;
update accounts set signed_date = '2026-09-09' where name = 'Oceanus'                     and signed_date is null;
update accounts set signed_date = '2026-09-09' where name = 'Lorimer'                     and signed_date is null;
update accounts set signed_date = '2026-09-04' where name = 'Framework Automation'        and signed_date is null;
update accounts set signed_date = '2026-09-02' where name = 'Ceres Industries'            and signed_date is null;
update accounts set signed_date = '2026-08-26' where name = 'Generational Partners'       and signed_date is null;
update accounts set signed_date = '2026-08-21' where name = 'Manzanita'                   and signed_date is null;
update accounts set signed_date = '2026-08-19' where name = 'Aeon'                        and signed_date is null;
