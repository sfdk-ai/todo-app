import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// Runs public/app.js against a small stand-in for the page, so the add form's
// handler can be driven without a browser.

type Listener = (event: { preventDefault(): void; target: FakeElement }) => void;

class FakeElement {
  value = '';
  textContent = '';
  className = '';
  href = '';
  hidden = false;
  disabled = false;
  type = '';
  private listeners: Record<string, Listener[]> = {};
  addEventListener(name: string, listener: Listener) {
    (this.listeners[name] ??= []).push(listener);
  }
  fire(name: string) {
    for (const listener of this.listeners[name] ?? []) listener({ preventDefault() {}, target: this });
  }
  querySelector(): FakeElement | null {
    return null;
  }
  reset() {}
  append() {}
  replaceChildren() {}
}

function loadPage() {
  const title = new FakeElement();
  const tags = new FakeElement();
  const add = new FakeElement();
  add.type = 'submit';
  const form = new FakeElement();
  form.querySelector = () => add;
  form.reset = () => {
    title.value = '';
    tags.value = '';
  };
  const elements: Record<string, FakeElement> = { 'new-todo': form, title, tags };

  const posts: { body: unknown; answer: () => void }[] = [];
  const respond = (body: unknown, status = 200) => ({ status, ok: status < 400, json: async () => body });
  const fetch = (url: string, init: { method: string; body?: string }) => {
    if (init.method === 'POST' && url === '/api/todos') {
      return new Promise((resolve) => {
        posts.push({ body: JSON.parse(init.body ?? '{}'), answer: () => resolve(respond({ id: posts.length }, 201)) });
      });
    }
    return Promise.resolve(respond(url.startsWith('/api/tags') ? [] : { items: [], total: 0 }));
  };

  const document = {
    getElementById: (id: string) => (elements[id] ??= new FakeElement()),
    createElement: () => new FakeElement(),
  };
  runInNewContext(readFileSync('public/app.js', 'utf8'), {
    document,
    fetch,
    setTimeout,
    clearTimeout,
    URLSearchParams,
  });
  return { form, title, add, posts };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the add form', () => {
  it('adds the todo once when Enter is pressed twice before the server answers', async () => {
    const { form, title, posts } = loadPage();
    title.value = 'Buy milk';

    form.fire('submit');
    form.fire('submit');
    await settle();

    expect(posts).toHaveLength(1);
    posts[0].answer();
    await settle();
    expect(posts).toHaveLength(1);
  });

  it('disables Add while the todo is being saved, and allows the next add after', async () => {
    const { form, title, add, posts } = loadPage();
    title.value = 'Buy milk';

    form.fire('submit');
    expect(add.disabled).toBe(true);
    posts[0].answer();
    await settle();
    expect(add.disabled).toBe(false);

    title.value = 'Buy milk';
    form.fire('submit');
    await settle();
    expect(posts).toHaveLength(2);
  });
});
