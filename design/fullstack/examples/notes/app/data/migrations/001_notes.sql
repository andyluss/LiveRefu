create table if not exists notes (
  id integer primary key autoincrement,
  title text not null,
  body text not null,
  created_at text not null
);
