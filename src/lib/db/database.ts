import Dexie, { Table } from 'dexie';
import { BeadProject } from '../types';

export interface SavedProjectRecord extends BeadProject {
  thumbnail?: string;
}

export class BeadDatabase extends Dexie {
  projects!: Table<SavedProjectRecord, string>;

  constructor() {
    super('BeadGeneratorDB');
    this.version(1).stores({
      projects: 'id, name, width, height, updatedAt',
    });
  }
}

export const db = new BeadDatabase();
