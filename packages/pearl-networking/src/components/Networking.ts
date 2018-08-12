import { Component, Entity } from 'pearl';
import NetworkedEntity from './NetworkedEntity';
import { NetworkedPrefab } from '../types';

export interface NetworkingSettings {
  prefabs: { [_: string]: NetworkedPrefab };
}

export default abstract class Networking<
  T extends NetworkingSettings = any
> extends Component<T> {
  prefabs!: { [_: string]: NetworkedPrefab };
  networkedEntities = new Map<string, Entity>();
  localPlayerId?: number;
  abstract isHost: boolean;

  protected registerSettings(opts: NetworkingSettings) {
    this.prefabs = opts.prefabs;
  }

  protected instantiateAndRegisterPrefab(
    prefabName: string,
    id?: string
  ): Entity {
    const entity = this.createEntity(prefabName);
    this.registerEntity(entity, id);
    return entity;
  }

  private getPrefab(prefabName: string): NetworkedPrefab {
    const prefab = this.prefabs[prefabName];

    if (!prefab) {
      throw new Error(`no registered networked prefab with name ${prefabName}`);
    }

    return prefab;
  }

  private createEntity(prefabName: string): Entity {
    const prefab = this.getPrefab(prefabName);

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
        }),
      ],
    });

    this.pearl.entities.add(entity);

    return entity;
  }

  private registerEntity(entity: Entity, id?: string) {
    const networked = entity.getComponent(NetworkedEntity);
    if (id) {
      networked.id = id;
    }
    this.networkedEntities.set(networked.id, entity);
  }

  abstract destroyNetworkedEntity(entity: Entity): void;

  protected deregisterNetworkedEntity(entity: Entity) {
    const networked = entity.getComponent(NetworkedEntity);
    this.networkedEntities.delete(networked.id);
  }

  protected setIdentity(id: number) {
    this.localPlayerId = id;
  }
}
