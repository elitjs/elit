/**
 * Playwright-style response object — status(), ok(), json(), text(), headers()
 * are methods, mirroring Playwright's APIResponse.
 */
export class E2EResponse {
  private readonly requestUrl: string;
  private readonly statusCode: number;
  private readonly statusTextValue: string;
  private readonly headerRecord: Record<string, string | string[] | undefined>;
  private readonly bodyBuffer: Buffer;

  constructor(init: {
    url: string;
    status: number;
    statusText: string;
    headers: Record<string, string | string[] | undefined>;
    body: Buffer;
  }) {
    this.requestUrl = init.url;
    this.statusCode = init.status;
    this.statusTextValue = init.statusText;
    this.headerRecord = init.headers;
    this.bodyBuffer = init.body;
  }

  url(): string {
    return this.requestUrl;
  }

  status(): number {
    return this.statusCode;
  }

  statusText(): string {
    return this.statusTextValue;
  }

  ok(): boolean {
    return this.statusCode >= 200 && this.statusCode < 300;
  }

  headers(): Record<string, string | string[] | undefined> {
    return { ...this.headerRecord };
  }

  headerValue(name: string): string | null {
    const value = this.headerRecord[name.toLowerCase()];
    if (value === undefined) return null;
    return Array.isArray(value) ? value.join(', ') : value;
  }

  async body(): Promise<Buffer> {
    return this.bodyBuffer;
  }

  async text(): Promise<string> {
    return this.bodyBuffer.toString('utf8');
  }

  async json<T = unknown>(): Promise<T> {
    const text = await this.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }
}
