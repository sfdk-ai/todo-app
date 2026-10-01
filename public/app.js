const API = '/api';
const PAGE_SIZE = 10;

const state = { page: 1, q: '' };
const byId = (id) => document.getElementById(id);

async function request(method, path, body) {
  const response = await fetch(API + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `The server answered ${response.status}`);
  return data;
}

function showError(error) {
  const box = byId('error');
  box.textContent = error ? error.message : '';
  box.hidden = !error;
}

async function act(work) {
  try {
    showError(null);
    await work();
    await refresh();
  } catch (error) {
    showError(error);
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, className, onClick) {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function renderTodo(todo) {
  const item = element('li', todo.done ? 'todo done' : 'todo');

  const statusButton = todo.done
    ? button('Reopen', 'secondary', () => act(() => request('PATCH', `/todos/${todo.id}`, { done: false })))
    : button('Done', 'primary', () => act(() => request('POST', `/todos/${todo.id}/done`)));

  const text = element('div', 'text');
  text.append(element('span', 'title', todo.title));
  const meta = element('div', 'meta');
  for (const tag of todo.tags) meta.append(element('span', 'tag', tag));
  meta.append(element('span', 'muted', new Date(todo.createdAt).toLocaleDateString()));
  text.append(meta);

  const remove = button('Delete', 'danger', () => act(() => request('DELETE', `/todos/${todo.id}`)));

  item.append(statusButton, text, remove);
  return item;
}

async function refresh() {
  const params = new URLSearchParams({ page: String(state.page), pageSize: String(PAGE_SIZE) });
  if (state.q) params.set('q', state.q);
  const [list, tags] = await Promise.all([request('GET', `/todos?${params}`), request('GET', '/tags')]);

  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  if (state.page > pages) {
    state.page = pages;
    return refresh();
  }

  const search = state.q ? `?${new URLSearchParams({ q: state.q })}` : '';
  byId('download').href = `${API}/todos.csv${search}`;
  byId('todos').replaceChildren(...list.items.map(renderTodo));
  byId('empty').hidden = list.items.length > 0;
  byId('page-info').textContent = `Page ${state.page} of ${pages}`;
  byId('previous').disabled = state.page <= 1;
  byId('next').disabled = state.page >= pages;

  byId('tag-counts').replaceChildren(
    ...tags.map((tag) => {
      const item = element('li');
      item.append(element('span', 'tag', tag.name), element('span', 'muted', String(tag.count)));
      return item;
    }),
  );
  byId('no-tags').hidden = tags.length > 0;
}

let adding = false;
byId('new-todo').addEventListener('submit', async (event) => {
  event.preventDefault();
  // A second Enter or click while the first add is saving would add the todo twice.
  if (adding) return;
  adding = true;
  const addButton = event.target.querySelector('button[type="submit"]');
  addButton.disabled = true;
  const title = byId('title').value;
  const tags = byId('tags').value.split(',');
  try {
    await act(async () => {
      await request('POST', '/todos', { title, tags });
      byId('new-todo').reset();
      state.page = 1;
    });
  } finally {
    adding = false;
    addButton.disabled = false;
  }
});

let searchTimer;
byId('search').addEventListener('input', (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.q = event.target.value.trim();
    state.page = 1;
    act(async () => {});
  }, 250);
});

byId('previous').addEventListener('click', () => {
  state.page -= 1;
  act(async () => {});
});

byId('next').addEventListener('click', () => {
  state.page += 1;
  act(async () => {});
});

act(async () => {});
