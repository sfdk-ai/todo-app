# Todo app

A small todo app: an HTTP API on Postgres, and a web page served by the same server.

- `src/` is the server: Express 5 and TypeScript, talking to Postgres through `pg`.
- `public/` is the web page, plain HTML and JavaScript with no build step.
- `db/schema.sql` is the database schema. The server applies it when it starts.

The mobile app, [`sfdk-ai/todo-mobile`](https://github.com/sfdk-ai/todo-mobile), is another client of the same API.

## What you need

- Node 22 or later (see `.nvmrc`)
- Docker with Compose, for the local database

## Install and start

```sh
npm ci
docker compose up -d
npm start
```

Then open http://localhost:3000.

`docker compose up -d` starts Postgres 16 as the Compose service `db`, on port 5432. `npm start` compiles the TypeScript to `dist/` and starts the server on port 3000. It waits up to 30 seconds for Postgres, so it's fine to run it straight after `docker compose up -d`.

To fill an empty database with a dozen sample todos:

```sh
npm run db:seed
```

To stop Postgres, run `docker compose down`. Add `-v` to delete its data as well.

## Settings

The server reads these environment variables. Every one has a default, so you only need to set the ones you want to change. To keep them in a file, copy `.env.example` to `.env`; the server reads `.env` from the directory it starts in.

| Variable | Default | What it sets |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://todo:todo@localhost:5432/todo` | The Postgres database, as a connection URL. The default is the Compose database. |
| `HOST` | `0.0.0.0` | The address the server listens on. `0.0.0.0` means every network interface. |
| `PORT` | `3000` | The port the server listens on. |

## Tests

```sh
npm test
```

runs both sets of tests:

- `npm run test:unit` runs the unit tests in `test/unit`. They need no database.
- `npm run test:integration` runs the integration tests in `test/integration` against the database in `DATABASE_URL`, so start it first with `docker compose up -d`. They empty the tables before each test, so run `npm run db:seed` again afterwards if you want the sample todos back.

Also:

- `npm run lint` runs ESLint.
- `npm run typecheck` runs the TypeScript compiler without writing files.

GitHub Actions runs all four on every push and pull request (`.github/workflows/ci.yml`).

## API

### Base URL

Every route is under `/api`. On your own computer the base URL is `http://localhost:3000/api`.

The web page calls the API on the server it was loaded from. Another client, such as the mobile app, has an `API_BASE_URL` setting that must name this same server, for example `http://192.168.1.20:3000/api`. The API allows calls from any origin.

### Todos

A todo looks like this:

```json
{
  "id": 1,
  "title": "Buy milk",
  "done": false,
  "createdAt": "2026-10-01T07:25:53.619Z",
  "tags": ["groceries"]
}
```

- `id` is a whole number the server assigns.
- `title` is 1 to 200 characters, with spaces trimmed from both ends.
- `createdAt` is when the todo was created, as an ISO 8601 time in UTC.
- `tags` is a list of words. The server trims them, lowercases them, drops duplicates and sorts them.

### Routes

| Method | Path | What it does | Success |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Checks the database connection. Answers `{ "ok": true }`. | 200 |
| `GET` | `/api/todos` | Lists todos, newest first. Takes `q`, `page` and `pageSize`; see below. | 200 |
| `POST` | `/api/todos` | Creates a todo from `{ "title", "tags" }`. `tags` is optional. Answers the new todo. | 201 |
| `GET` | `/api/todos/:id` | Answers one todo. | 200 |
| `PATCH` | `/api/todos/:id` | Changes any of `title`, `done` and `tags`. A `tags` list replaces the old one. Answers the todo. | 200 |
| `POST` | `/api/todos/:id/done` | Marks a todo done. Answers the todo. | 200 |
| `DELETE` | `/api/todos/:id` | Deletes a todo. | 204 |
| `GET` | `/api/tags` | Lists every tag with the number of todos carrying it, most used first: `[{ "name": "groceries", "count": 2 }]`. | 200 |

To reopen a todo, send `PATCH /api/todos/:id` with `{ "done": false }`.

### Listing todos

`GET /api/todos` takes three query parameters, all optional:

| Parameter | Default | Meaning |
| --- | --- | --- |
| `q` | none | Only todos whose title contains this text. |
| `page` | `1` | Which page to answer, counting from 1. |
| `pageSize` | `20` | How many todos a page holds, from 1 to 100. |

It answers one page and the total number of matching todos:

```json
{
  "items": [{ "id": 2, "title": "Call grandma", "done": false, "createdAt": "2026-10-01T07:26:10.002Z", "tags": [] }],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

A page past the end answers an empty `items` list.

### Errors

An error answers a JSON body with a message:

```json
{ "error": "title must be a string" }
```

- 400: the request body or a query parameter is invalid.
- 404: no todo has that id, or no route has that path.
- 500: something went wrong on the server. The server logs the details.

### Examples

```sh
curl -X POST http://localhost:3000/api/todos \
  -H 'Content-Type: application/json' \
  -d '{"title": "Buy milk", "tags": ["groceries"]}'

curl 'http://localhost:3000/api/todos?q=milk&page=1&pageSize=10'

curl -X POST http://localhost:3000/api/todos/1/done

curl -X PATCH http://localhost:3000/api/todos/1 \
  -H 'Content-Type: application/json' \
  -d '{"done": false, "tags": ["groceries", "weekend"]}'

curl -X DELETE http://localhost:3000/api/todos/1

curl http://localhost:3000/api/tags
```
