'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { Level, Session, SessionUserDto, Subject, Vehicle } from '@minda/common';

export interface RefData { sessions: Session[]; levels: Level[]; subjects: Subject[]; vehicles: Vehicle[]; reload: () => void }
interface Ctx { user: SessionUserDto; ref: RefData }

const C = createContext<Ctx | null>(null);
export const SessionProvider = ({ value, children }: { value: Ctx; children: ReactNode }) => <C.Provider value={value}>{children}</C.Provider>;

export function useSession(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error('useSession outside provider');
  return v;
}
