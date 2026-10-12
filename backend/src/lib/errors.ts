export class AppError extends Error {
  constructor(public status: number, message: string, public code = 'error') {
    super(message);
  }
}
export const badRequest = (m: string) => new AppError(400, m, 'bad_request');
export const unauthorized = (m = 'Sign in required') => new AppError(401, m, 'unauthorized');
export const forbidden = (m = 'Not allowed') => new AppError(403, m, 'forbidden');
export const notFound = (what = 'Record') => new AppError(404, `${what} not found`, 'not_found');
export const conflict = (m: string) => new AppError(409, m, 'conflict');
