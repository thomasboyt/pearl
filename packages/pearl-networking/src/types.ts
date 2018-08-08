import { PearlInstance, Component, Entity } from 'pearl';

export interface NetworkedPrefab {
  type: string;
  tags?: string[];
  zIndex?: number;
  createComponents: (pearl: PearlInstance) => Component<any>[];
}

export interface NetworkedComponent<T> extends Component<any> {
  serialize: () => T;
  deserialize: (snapshot: T, entitiesById: Map<string, Entity>) => void;
}
