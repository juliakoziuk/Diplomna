import { AsyncLocalStorage } from 'async_hooks';
import { NextFunction, Request, Response } from 'express';

export type Lang = 'en' | 'uk';

const store = new AsyncLocalStorage<Lang>();

/**
 * Express middleware: remembers the language of the current request so error messages
 * can be returned in it. `Accept-Language: uk…` selects Ukrainian, anything else English.
 */
export function langMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = String(req.headers['accept-language'] ?? '');
  store.run(/^\s*uk\b/i.test(header) ? 'uk' : 'en', () => next());
}

/** Picks the wording for the current request's language (English outside a request). */
export const msg = (en: string, uk: string): string => (store.getStore() === 'uk' ? uk : en);
