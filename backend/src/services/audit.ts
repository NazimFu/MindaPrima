import type { SessionUser } from '@minda/common';
import type { AppContext } from '../lib/context';
import { newId } from '../sheets/repo';

/** Never put secrets or personal data in `detail`. Ids and short labels only. */
export async function audit(
  ctx: AppContext, user: Pick<SessionUser, 'id'> | null, action: string, entity: string, entityId = '', detail = '',
): Promise<void> {
  try {
    await ctx.db.auditLog.insert({
      id: newId(), at: new Date().toISOString(), userId: user?.id ?? '', action, entity, entityId, detail: detail.slice(0, 200),
    });
  } catch (err) {
    console.error('audit write failed', (err as Error).message);
  }
}
