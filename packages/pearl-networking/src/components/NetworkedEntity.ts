import { Component, Entity } from 'pearl';
import Networking from './Networking';
import * as uuidv4 from 'uuid/v4';
import { NetworkedComponent } from '../types';

interface Opts {
  type: string;
  networking: Networking;
}

type Snapshot = { [key: string]: any };

export default class NetworkedEntity extends Component<Opts> {
  networking!: Networking;

  id = uuidv4();
  type!: string;

  create(opts: Opts) {
    this.networking = opts.networking;
    this.type = opts.type;
  }

  get isHost() {
    return this.networking.isHost;
  }

  hostSerialize(): Snapshot {
    const entitySnapshot: Snapshot = {};

    for (let component of this.entity.components) {
      const networkedComponent = component as NetworkedComponent<Snapshot>;

      if (typeof networkedComponent.serialize === 'function') {
        const componentSnapshot = networkedComponent.serialize();
        const name = component.constructor.name;
        entitySnapshot[name] = componentSnapshot;
      }
    }

    return entitySnapshot;
  }

  clientDeserialize(snapshot: Snapshot, entitiesById: Map<string, Entity>) {
    for (let component of this.entity.components) {
      const networkedComponent = component as NetworkedComponent<Snapshot>;

      if (typeof networkedComponent.deserialize === 'function') {
        const name = component.constructor.name;
        networkedComponent.deserialize(snapshot[name], entitiesById);
      }
    }
  }

  onDestroy() {
    this.networking.destroyNetworkedEntity(this.entity);
  }
}
