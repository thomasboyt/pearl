import { PearlInstance, Component } from 'pearl';

export interface NetworkedPrefab {
  type: string;
  tags?: string[];
  zIndex?: number;
  createComponents: (pearl: PearlInstance) => Component<any>[];
}
