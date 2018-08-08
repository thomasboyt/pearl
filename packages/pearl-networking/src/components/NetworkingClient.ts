import { Entity } from 'pearl';
import Networking from './Networking';
import {
  SnapshotMessage,
  RpcMessage,
  SnapshotMessageData,
  RpcMessageData,
  ServerMessage,
  ClientMessage,
} from '../messages';

// TODO: replace this with something better?
import PlayerInputter from '../util/PlayerInputter';
import NetworkedEntity from './NetworkedEntity';
import { ClientSession } from 'pearl-multiplayer-socket';

interface ConnectionOptions {
  groovejetUrl: string;
  roomCode: string;
}

type ConnectionState = 'connecting' | 'connected' | 'error' | 'closed';

export default class NetworkingClient extends Networking {
  isHost = false;
  connectionState: ConnectionState = 'connecting';
  errorReason?: string;

  private connection!: ClientSession;
  private snapshotClock = 0;
  private inputter?: PlayerInputter;

  connect(connectionOptions: ConnectionOptions) {
    const connection = new ClientSession(connectionOptions.groovejetUrl);
    this.connection = connection;

    const promise = new Promise((resolve, reject) => {
      connection.onOpen = () => {
        this.onOpen();
        resolve();
      };
      connection.onMessage = this.onMessage.bind(this);
    });

    connection.connectRoom(connectionOptions.roomCode);

    return promise;
  }

  private onMessage(strData: any) {
    const msg = JSON.parse(strData) as ServerMessage;

    if (msg.type === 'snapshot') {
      this.onSnapshot(msg.data);
    } else if (msg.type === 'identity') {
      this.setIdentity(msg.data.id);
    } else if (msg.type === 'tooManyPlayers') {
      this.connectionState = 'error';
      this.errorReason = 'Room at max capacity';
    } else if (msg.type === 'rpc') {
      this.handleRpc(msg.data);
    }
    // else if (msg.type === 'ping') {
    // this.sendToHost({
    //   type: 'pong',
    // });
    // }
  }

  private onOpen() {
    this.connectionState = 'connected';

    this.inputter = new PlayerInputter({
      onKeyDown: (keyCode) => {
        this.sendToHost({
          type: 'keyDown',
          data: {
            keyCode,
          },
        });
      },
      onKeyUp: (keyCode) => {
        this.sendToHost({
          type: 'keyUp',
          data: {
            keyCode,
          },
        });
      },
    });

    this.inputter.registerLocalListeners();
  }

  private onClose() {
    this.connectionState = 'closed';
    if (this.inputter) {
      this.inputter.onKeyDown = () => {};
      this.inputter.onKeyUp = () => {};
    }
  }

  private sendToHost(msg: ClientMessage) {
    this.connection.send(JSON.stringify(msg));
  }

  private createNetworkedPrefab(name: string, id: string): Entity {
    const prefab = this.getPrefab(name);
    return this.instantiatePrefab(prefab, id);
  }

  private onSnapshot(snapshot: SnapshotMessageData) {
    const clock = snapshot.clock;
    if (clock < this.snapshotClock) {
      return;
    }
    this.snapshotClock = clock;

    const unseenIds = new Set(this.networkedEntities.keys());

    // first, find any prefabs that don't exist, and create them. this happens
    // first so entities that are created on the same frame can still be linked
    // together
    const newEntities = snapshot.entities.filter(
      (entity) => !this.networkedEntities.has(entity.id)
    );

    for (let snapshotEntity of newEntities) {
      this.createNetworkedPrefab(snapshotEntity.type, snapshotEntity.id);
    }

    for (let snapshotEntity of snapshot.entities) {
      const entity = this.networkedEntities.get(snapshotEntity.id)!;

      entity
        .getComponent(NetworkedEntity)
        .clientDeserialize(snapshotEntity.state, this.networkedEntities);

      unseenIds.delete(snapshotEntity.id);
    }

    for (let unseenId of unseenIds) {
      this.pearl.entities.destroy(this.networkedEntities.get(unseenId)!);
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
