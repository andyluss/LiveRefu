create table if not exists messages (
  id integer primary key autoincrement,
  name text not null,
  body text not null,
  created_at text not null
);
