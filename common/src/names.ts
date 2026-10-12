import { CONNECTOR_LABEL, type Connector } from './constants';

export interface NameParts { firstName: string; connector: Connector; fatherName: string }

/** "Adam Bin Rahman". Used on Invoice and Receipt. Every other screen shows firstName only. */
export function fullName({ firstName, connector, fatherName }: NameParts): string {
  const parts = [firstName.trim()];
  if (connector !== 'none') parts.push(CONNECTOR_LABEL[connector]);
  if (fatherName.trim()) parts.push(fatherName.trim());
  return parts.join(' ');
}

/** What every normal screen shows for a student. */
export function displayName({ firstName }: Pick<NameParts, 'firstName'>): string {
  return firstName.trim();
}
