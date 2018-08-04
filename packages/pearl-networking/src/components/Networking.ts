import { Component, Entity, PearlInstance } from 'pearl';
import NetworkedEntity from './NetworkedEntity';

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

interface Opts {
  prefabs: { [_: string]: NetworkedPrefab };
}

export default abstract class Networking extends Component<Opts> {
  prefabs!: { [_: string]: NetworkedPrefab };
  networkedEntities = new Map<string, Entity>();
  localPlayerId?: number;
  abstract isHost: boolean;

  create(opts: Opts) {
    this.prefabs = opts.prefabs;
  }

  protected getPrefab(prefabName: string): NetworkedPrefab {
    const prefab = this.prefabs[prefabName];

    if (!prefab) {
      throw new Error(`no registered networked prefab with name ${prefabName}`);
    }

    return prefab;
  }

  protected instantiatePrefab(prefab: NetworkedPrefab, id?: string): Entity {
    const components = prefab.createComponents(this.pearl);

    const entity = new Entity({
      name: prefab.type,
      tags: [prefab.type, ...(prefab.tags || [])],
      zIndex: prefab.zIndex || 0,
      components: [
        ...components,
        new NetworkedEntity({
          networking: this,
          type: prefab.type,
          id,
        }),
      ],
    });

    this.pearl.entities.add(entity);

    const networked = entity.getComponent(NetworkedEntity);
    this.networkedEntities.set(networked.id, entity);

    return entity;
  }

  deregisterNetworkedEntity(entity: Entity) {
    const networked = entity.getComponent(NetworkedEntity);
    this.networkedEntities.delete(networked.id);
  }

  protected setIdentity(id: number) {
    this.localPlayerId = id;
  }
}
