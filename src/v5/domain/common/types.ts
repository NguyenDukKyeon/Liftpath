export type EntityId = string;
export type ISODateTime = string;
export type PolicyVersion = `${number}.${number}.${number}`;
export type Revision = number;

export interface VersionedRecord {
  id: EntityId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  revision: Revision;
}
