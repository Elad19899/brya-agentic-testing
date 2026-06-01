/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/api/ApiClient.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin, framework-friendly HTTP client built on Playwright's `APIRequestContext`.
 *
 * Why this wrapper?
 *   - It owns the *single* `APIRequestContext` used by every API test, baking
 *     in the base URL, default headers, and timeouts from `env.config.ts`.
 *   - Wrapping each verb (get/post/…) gives one place to add cross-cutting
 *     concerns — Allure step attachments, request/response logging, retries —
 *     without touching the test files.
 *   - Returns the raw `APIResponse`, keeping Playwright's assertion APIs
 *     (`expect(response).toBeOK()`, etc.) usable in test files.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { env } from '../../config/env.config';
import { logger } from '../utils/logger';

/** Subset of options we expose — keeps the call sites readable. */
export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  timeout?: number;
  /** Set to false when you need to inspect a 3xx response without auto-following. */
  maxRedirects?: number;
}

export class ApiClient {
  private context: APIRequestContext | null = null;

  constructor(private readonly baseUrl: string = env.apiBaseUrl) {}

  /**
   * Lazily build the `APIRequestContext`. Called once per test (or once per
   * worker if wired into a worker-scoped fixture).
   */
  async init(): Promise<void> {
    if (this.context) return;
    this.context = await request.newContext({
      baseURL: this.baseUrl,
      timeout: env.defaultTimeout,
      extraHTTPHeaders: {
        Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
        'X-Test-Source': 'brya-automation-framework',
      },
      ignoreHTTPSErrors: false,
    });
    logger.info(`ApiClient initialized for ${this.baseUrl}`);
  }

  /** Cleanly release the underlying context. Call from `afterAll`. */
  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
  }

  /** Internal accessor with a guard rail in case of misuse. */
  private get ctx(): APIRequestContext {
    if (!this.context) {
      throw new Error('ApiClient.init() must be awaited before issuing requests.');
    }
    return this.context;
  }

  /**
   * Issue a GET. Returns the raw response so callers can assert on status,
   * headers, body — anything Playwright exposes.
   */
  async get(url: string, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`GET ${url}`);
    return this.ctx.get(url, {
      headers: options.headers,
      params: options.params,
      timeout: options.timeout ?? env.defaultTimeout,
      maxRedirects: options.maxRedirects,
    });
  }

  async post(url: string, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`POST ${url}`);
    return this.ctx.post(url, {
      headers: options.headers,
      params: options.params,
      data: options.data,
      timeout: options.timeout ?? env.defaultTimeout,
    });
  }

  async put(url: string, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`PUT ${url}`);
    return this.ctx.put(url, {
      headers: options.headers,
      params: options.params,
      data: options.data,
      timeout: options.timeout ?? env.defaultTimeout,
    });
  }

  async patch(url: string, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`PATCH ${url}`);
    return this.ctx.patch(url, {
      headers: options.headers,
      params: options.params,
      data: options.data,
      timeout: options.timeout ?? env.defaultTimeout,
    });
  }

  async delete(url: string, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`DELETE ${url}`);
    return this.ctx.delete(url, {
      headers: options.headers,
      params: options.params,
      timeout: options.timeout ?? env.defaultTimeout,
    });
  }

  /** HEAD is invaluable for asset / link integrity sweeps without payload cost. */
  async head(url: string, options: RequestOptions = {}): Promise<APIResponse> {
    logger.info(`HEAD ${url}`);
    return this.ctx.head(url, {
      headers: options.headers,
      params: options.params,
      timeout: options.timeout ?? env.defaultTimeout,
      maxRedirects: options.maxRedirects,
    });
  }
}
