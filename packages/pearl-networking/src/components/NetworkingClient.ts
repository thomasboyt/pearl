import { Entity, PearlKeyEvent } from 'pearl';
import Networking, { NetworkingSettings } from './Networking';
import {
  SnapshotMessage,
  RpcMessage,
  SnapshotMessageData,
  RpcMessageData,
  ServerMessage,
  ClientMessage,
  EntitySnapshot,
  EntityDestroyData,
} from '../messages';

import NetworkedEntity from './NetworkedEntity';
import { ClientSession, GroovejetError } from 'pearl-multiplayer-socket';

interface ConnectionOptions {
  groovejetUrl: string;
  roomCode: string;
}

export default class NetworkingClient extends Networking<NetworkingSettings> {
  isHost: false = false;

  private connection!: ClientSession;
  private snapshotClock = 0;

  create(settings: NetworkingSettings) {
    this.registerSettings(settings);
  }

  async connect(connectionOptions: ConnectionOptions) {
    const connection = new ClientSession(connectionOptions.groovejetUrl);
    this.connection = connection;

    connection.onOpen = this.onOpen.bind(this);
    connection.onMessage = this.onMessage.bind(this);
    connection.onClose = this.onClose.bind(this);

    try {
      this.clientId = await connection.connect();
      await connection.joinRoom(connectionOptions.roomCode);
    } catch (err) {
      this.connectionState = 'error';

      if (err instanceof GroovejetError) {
        if (err.type === 'hostDisconnected') {
          this.errorReason = 'Host disconnected';
        } else if (err.type === 'noRoomFound') {
          this.errorReason = 'No room found';
        } else {
          this.errorReason = err.message;
        }
      }

      throw err;
    }

    this.connectionState = 'open';
  }

  private onMessage(strData: any) {
    const msg = JSON.parse(strData) as ServerMessage;

    if (msg.type === 'snapshot') {
      this.onSnapshot(msg.data);
    } else if (msg.type === 'tooManyPlayers') {
      this.connectionState = 'error';
      this.errorReason = 'Room at max capacity';
    } else if (msg.type === 'rpc') {
      this.handleRpc(msg.data);
    } else if (msg.type === 'entityCreate') {
      this.onEntityCreate(msg.data);
    } else if (msg.type === 'entityDestroy') {
      this.onEntityDestroy(msg.data);
    } else if (msg.type === 'initialSnapshot') {
      this.onInitialSnapshot(msg.data);
    }
    // else if (msg.type === 'ping') {
    // this.sendToHost({
    //   type: 'pong',
    // });
    // }
  }

  private onOpen() {
    this.connectionState = 'open';

    this.pearl.inputter.onKeyDown.add(this.onKeyDown);
    this.pearl.inputter.onKeyUp.add(this.onKeyUp);
  }

  private onKeyDown = ({ keyCode }: PearlKeyEvent) => {
    this.sendToHost({
      type: 'keyDown',
      data: {
        keyCode,
      },
    });
  };

  private onKeyUp = ({ keyCode }: PearlKeyEvent) => {
    this.sendToHost({
      type: 'keyUp',
      data: {
        keyCode,
      },
    });
  };

  private onClose() {
    this.connectionState = 'closed';
    this.pearl.inputter.onKeyDown.remove(this.onKeyDown);
    this.pearl.inputter.onKeyUp.remove(this.onKeyUp);
  }

  private sendToHost(msg: ClientMessage) {
    this.connection.send(JSON.stringify(msg));
  }

  private onEntityCreate(snapshot: EntitySnapshot) {
    this.instantiateAndRegisterPrefab(snapshot.type, snapshot.id);
    this.deserializeEntity(snapshot);
  }

  private onEntityDestroy({ id }: EntityDestroyData) {
    if (!this.networkedEntities.has(id)) {
      return;
    }

    this.pearl.entities.destroy(this.networkedEntities.get(id)!);
  }

  destroyNetworkedEntity(entity: Entity) {
    this.deregisterNetworkedEntity(entity);
  }

  private deserializeEntity(snapshot: EntitySnapshot) {
    const entity = this.networkedEntities.get(snapshot.id)!;

    if (!entity) {
      console.warn(
        `snapshot contained nonexistent entity: ${snapshot.type}/${snapshot.id}`
      );
      return;
    }

    entity
      .getComponent(NetworkedEntity)
      .clientDeserialize(snapshot.state, this.networkedEntities);

    if (snapshot.parentId) {
      const parent = this.networkedEntities.get(snapshot.parentId)!;
      // XXX: this is safe to do every frame since children is a set
      parent.appendChild(entity);
    } else if (entity.parent && !snapshot.parentId) {
      entity.parent.removeChild(entity);
    }
  }

  private onSnapshot(snapshot: SnapshotMessageData) {
    const clock = snapshot.clock;
    if (clock < this.snapshotClock) {
      return;
    }
    this.snapshotClock = clock;

    for (let snapshotEntity of snapshot.entities) {
      this.deserializeEntity(snapshotEntity);
    }
  }

  private onInitialSnapshot(snapshot: SnapshotMessageData) {
    this.snapshotClock = snapshot.clock;

    for (let snapshotEntity of snapshot.entities) {
      this.instantiateAndRegisterPrefab(snapshotEntity.type, snapshotEntity.id);
    }

    for (let snapshotEntity of snapshot.entities) {
      this.deserializeEntity(snapshotEntity);
    }
  }

  private handleRpc(rpc: RpcMessageData) {
    const { entityId, componentName, methodName, args } = rpc;
    const entity = this.networkedEntities.get(entityId);

    if (!entity) {
      console.warn(
        `ignoring rpc for nonexistent entity ${entityId} -
        ${rpc.componentName}, ${rpc.methodName}`
      );
      return;
    }

    if (!methodName.startsWith('rpc')) {
      throw new Error(
        'refusing to allow rpc message to execute non-rpc method ' +
          `${componentName}.${methodName}`
      );
    }

    const component = entity.components.find(
      (component) => component.constructor.name === componentName
    );

    if (!component) {
      throw new Error(
        `missing component ${component} for rpc message ${methodName}`
      );
    }

    (component as any)[methodName](...args);
  }
}
