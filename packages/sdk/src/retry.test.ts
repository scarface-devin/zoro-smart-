import { describe, it, expect, vi } from 'vitest';
import { withRetry, CircuitBreaker } from '../src/retry.js';

describe('withRetry', () => {
  it('returns the value on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('done');
    const out = await withRetry(fn, { attempts: 3, initialDelayMs: 1 });
    expect(out).toBe('done');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok');
    const out = await withRetry(fn, { attempts: 3, initialDelayMs: 1 });
    expect(out).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(
      withRetry(fn, { attempts: 3, initialDelayMs: 1 }),
    ).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('honours shouldRetry returning false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fatal'));
    await expect(
      withRetry(fn, {
        attempts: 5,
        initialDelayMs: 1,
        shouldRetry: () => false,
      }),
    ).rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('invokes onRetry between attempts', async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('a'))
      .mockResolvedValueOnce('b');
    await withRetry(fn, { attempts: 3, initialDelayMs: 1, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('passes attempt index to the wrapped fn', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('a'))
      .mockResolvedValueOnce('b');
    await withRetry(fn, { attempts: 3, initialDelayMs: 1 });
    const seen = fn.mock.calls.map((c) => c[0]);
    expect(seen).toEqual([1, 2]);
  });
});

describe('CircuitBreaker', () => {
  it('starts closed', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 10 });
    expect(cb.current()).toBe('closed');
  });

  it('opens after failure threshold and short-circuits', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 60_000 });
    await expect(cb.exec(() => Promise.reject(new Error('a')))).rejects.toThrow('a');
    await expect(cb.exec(() => Promise.reject(new Error('b')))).rejects.toThrow('b');
    expect(cb.current()).toBe('open');
    await expect(cb.exec(() => Promise.resolve('x'))).rejects.toThrow('Circuit breaker is open');
  });

  it('transitions to half-open after reset window and closes on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5 });
    await expect(cb.exec(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await new Promise((r) => setTimeout(r, 15));
    expect(cb.current()).toBe('half-open');
    const out = await cb.exec(() => Promise.resolve('ok'));
    expect(out).toBe('ok');
    expect(cb.current()).toBe('closed');
  });

  it('re-opens on failure in half-open', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5 });
    await expect(cb.exec(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await new Promise((r) => setTimeout(r, 15));
    expect(cb.current()).toBe('half-open');
    await expect(cb.exec(() => Promise.reject(new Error('y')))).rejects.toThrow('y');
    expect(cb.current()).toBe('open');
  });

  it('reset() returns to closed state', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60_000 });
    cb.reset();
    expect(cb.current()).toBe('closed');
  });
});
