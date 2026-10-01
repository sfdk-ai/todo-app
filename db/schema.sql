CREATE TABLE IF NOT EXISTS todos (
  id serial PRIMARY KEY,
  title text NOT NULL CHECK (btrim(title) <> ''),
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id integer NOT NULL,
  tag text NOT NULL,
  PRIMARY KEY (todo_id, tag)
);

CREATE INDEX IF NOT EXISTS todo_tags_tag_idx ON todo_tags (tag);
