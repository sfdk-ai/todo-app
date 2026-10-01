CREATE TABLE IF NOT EXISTS todos (
  id serial PRIMARY KEY,
  title text NOT NULL CHECK (btrim(title) <> ''),
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id integer NOT NULL REFERENCES todos (id) ON DELETE CASCADE,
  tag text NOT NULL,
  PRIMARY KEY (todo_id, tag)
);

-- A database made before todo_tags referenced todos kept the tags of deleted
-- todos. Drop those rows, then add the reference it was made without.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'todo_tags_todo_id_fkey') THEN
    DELETE FROM todo_tags WHERE NOT EXISTS (SELECT 1 FROM todos WHERE todos.id = todo_tags.todo_id);
    ALTER TABLE todo_tags
      ADD CONSTRAINT todo_tags_todo_id_fkey FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS todo_tags_tag_idx ON todo_tags (tag);
