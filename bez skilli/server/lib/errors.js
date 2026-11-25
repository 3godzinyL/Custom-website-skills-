export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} code machine-readable error code for the client
   * @param {string} message human-readable, safe to show to the user
   * @param {unknown} [details]
   */
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** @param {string} [message] @param {unknown} [details] */
export const badRequest = (message = 'Invalid request.', details) => new HttpError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Please sign in to continue.') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have permission to do that.', code = 'forbidden') => new HttpError(403, code, message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);
/** @param {string} message @param {unknown} [details] */
export const conflict = (message, details) => new HttpError(409, 'conflict', message, details);
/** @param {string} [message] @param {number} [retryAfter] */
export const tooMany = (message = 'Too many requests. Please slow down.', retryAfter) =>
  new HttpError(429, 'rate_limited', message, { retryAfter });
/** @param {string} message @param {unknown} [details] */
export const limitReached = (message, details) => new HttpError(402, 'plan_limit', message, details);
