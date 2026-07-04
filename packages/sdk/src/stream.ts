/**
 * Connects to a Server-Sent Events stream from the API or Horizon, parses
 * events, and emits typed envelopes via the returned EventTarget-like
 * object.
 *
 * Usage:
 * ```ts
 * const stream = await client.stream.livePayments(address);
 * stream.addEventListener('payment', (e: CustomEvent<Payment>) => …);
 * stream.close();
 * ```
 */

export interface StreamOptions {
  /** Allowed networks contract ids (filter). */
  contractIds?: string[];
}

export class StreamClient {
  constructor(
    private readonly opts: {
      horizonUrl: string;
      sorobanRpcUrl: string;
    },
  ) {}

  /**
   * Connects to Horizon SSE for live payments to a given account. Returns
   * a `LiveStream` instance which is an `EventTarget`.
   */
  livePayments(account: string): LiveStream {
    const url = `${this.opts.horizonUrl}/accounts/${account}/payments?_format=event_stream`;
    return new LiveStream(url, 'payment', (line) => {
      // Horizon SSE emits JSON per line.
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    });
  }

  liveSorobanEvents(opts: { startLedger: number; contractIds?: string[] }): LiveStream {
    const params = new URLSearchParams({
      rpcUrl: this.opts.sorobanRpcUrl,
      startLedger: String(opts.startLedger),
    });
    if (opts.contractIds) params.set('contractIds', opts.contractIds.join(','));
    const url = `/api/streams/events?${params.toString()}`; // backend SSE proxy
    return new LiveStream(url, 'event', (line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    });
  }
}

/**
 * A minimal SSE consumer. We use the native `fetch` body iterator so this
 * works on Vercel Edge / Cloudflare Workers where `EventSource` is not
 * available.
 */
export class LiveStream extends EventTarget {
  private readonly controller: AbortController;
  private parser: (line: string) => unknown;
  private closed = false;

  constructor(private readonly url: string, private readonly eventName: string, parser: (l: string) => unknown) {
    super();
    this.controller = new AbortController();
    this.parser = parser;
    void this.start();
  }

  async start() {
    try {
      await this.startImpl();
    } catch (e) {
      if (!this.closed) this.dispatchEvent(new Event('error'));
    }
  }

  private async startImpl() {
      // Use EventSource when available (browsers):
      if (typeof EventSource !== 'undefined' && this.url.startsWith('http')) {
        const es = new EventSource(this.url);
        es.addEventListener(this.eventName, (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data);
            this.dispatchEvent(new CustomEvent(this.eventName, { detail: data }));
          } catch {
            /* ignore */
          }
        });
        es.addEventListener('error', () => {
          this.dispatchEvent(new Event('error'));
        });
        return;
      }

      // Fall-back: fetch streaming body.
      const res = await fetch(this.url, {
        headers: { Accept: 'text/event-stream' },
        signal: this.controller.signal,
      });
      if (!res.body) throw new Error('No body in SSE response');
      const reader = (res.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (!this.closed) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const payload = this.parser(line.slice(5).trim());
          if (payload != null) {
            this.dispatchEvent(new CustomEvent(this.eventName, { detail: payload }));
          }
        }
      }
  }

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | ((e: Event) => void) | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    // Normalise listener signature for ergonomics.
    const cb =
      typeof listener === 'function'
        ? (listener as (e: Event) => void)
        : listener &&
            typeof (listener as EventListenerObject).handleEvent === 'function'
          ? (e: Event) => (listener as EventListenerObject).handleEvent(e)
          : listener;
    super.addEventListener(type, cb, options);
  }

  close() {
    this.closed = true;
    try {
      this.controller.abort();
    } catch {
      /* ignore */
    }
  }
}
