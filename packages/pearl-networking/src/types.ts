import { PearlInstance, Component } from 'pearl';

export interface EntitySnapshot {
  id: string;
  type: string;
  state: any;
}

export interface Snapshot {
  entities: EntitySnapshot[];
  clock: number;
}

export interface NetworkedPrefab {
  type: string;
  tags?: string[];
  zIndex?: number;
  createComponents: (pearl: PearlInstance) => Component<any>[];
}
