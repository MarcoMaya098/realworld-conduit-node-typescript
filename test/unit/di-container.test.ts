import { describe, expect, it } from 'vitest';
import { buildContainer, DiContainer } from '../../src/di-container';
import { UserService } from '../../src/services/user.service';

interface TestRegistry {
  counter: { id: number };
  shared: { id: number };
}

describe('DiContainer', () => {
  it('creates a new instance per resolve with register, and one shared instance with singleton', () => {
    let created = 0;
    const c = new DiContainer<TestRegistry>()
      .register('counter', () => ({ id: ++created }))
      .singleton('shared', () => ({ id: ++created }));

    expect(c.resolve('counter')).not.toBe(c.resolve('counter'));
    expect(c.resolve('shared')).toBe(c.resolve('shared'));
    expect(created).toBe(3);
  });

  it('builds singletons lazily, on first resolve', () => {
    let built = false;
    const c = new DiContainer<TestRegistry>().singleton('shared', () => {
      built = true;
      return { id: 1 };
    });
    expect(built).toBe(false);
    c.resolve('shared');
    expect(built).toBe(true);
  });

  it('fails loudly for a key that was never registered', () => {
    expect(() => new DiContainer<TestRegistry>().resolve('counter')).toThrow('No factory registered for "counter"');
  });
});

describe('buildContainer', () => {
  it('wires the services as singletons shared by every controller and middleware', () => {
    const c = buildContainer();
    expect(c.resolve('userService')).toBeInstanceOf(UserService);
    expect(c.resolve('userService')).toBe(c.resolve('userService'));
    expect(c.resolve('articleRepository')).toBe(c.resolve('articleRepository'));
  });
});
