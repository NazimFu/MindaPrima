import type { Config } from '../config';
import type { Db } from '../sheets/repo';
import type { SessionUser } from '@minda/common';

export interface AppContext { config: Config; db: Db }

declare module 'express-serve-static-core' {
  interface Request { user?: SessionUser; sid?: string }
}
