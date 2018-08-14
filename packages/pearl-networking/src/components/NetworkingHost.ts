import { Entity } from 'pearl';

import Networking, { NetworkingSettings } from './Networking';
import {
  EntitySnapshot,
  SnapshotMessageData,
  RpcMessageData,
  ServerMessage,
  ClientMessage,
} from '../messages';
import NetworkedEntity from './NetworkedEntity';
import Delegate from '../util/Delegate';
import { HostSession } from 'pearl-multiplayer-socket';

let playerIdCounter = 0;

interface OnPlayerAddedMsg {
  networkingPlayer: NetworkingPlayer;
}

interface Inputter {
  isKeyDown(keyCode: number): boolean;
  isKeyPressed(keyCode: number): boolean;
}

class NetworkedInputter implements Inputter {
  keysDown = new Set<number>();
  keysPressed = new Set<number>();

  isKeyDown(keyCode: number): boolean {
    return this.keysDown.has(keyCode);
  }

  isKeyPressed(keyCode: number): boolean {
    return this.keysPressed.has(keyCode);
  }
}

export class NetworkingPlayer {
  id: number;
  inputter: Inputter;

  constructor(id: number, inputter: Inputter) {
    this.id = id;
    this.inputter = inputter;
  }
}

interface AddPlayerOpts {
  inputter: Inputter;
  isLocal?: boolean;
}

interface Settings extends NetworkingSettings {
  maxClients: number;
}

export default class NetworkingHost extends Networking<Settings> {
  isHost = true;
  connectionState: 'connecting' | 'open' | 'closed' = 'connecting';
  onPlayerAdded = new Delegate<OnPlayerAddedMsg>();
  onPlayerRemoved = new Delegate<OnPlayerAddedMsg>();
  players = new Map<number, NetworkingPlayer>();
  maxClients: number;

  private connection!: HostSession;
  private snapshotClock = 0;
  private peerIdToPlayerId = new Map<string, number>();

  create(settings: Settings) {
    this.maxClients = settings.maxClients;
    this.registerSettings(settings);
  }

  // XXX: might be good in the future to have this use coroutines, once
  // coroutines can yield other coroutines. for now, should be okay since this
  // component never gets destroyed
  async connect(groovejetUrl: string): Promise<string> {
    const connection = new HostSession(groovejetUrl);
    this.connection = connection;

    const roomCode = await connection.getRoomCode();

    // report room created to parent for debug iframe usage
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'hostCreatedRoom',
          roomCode,
        },
        window.location.origin
      );
    }

    const promise = new Promise<string>((resolve, reject) => {
      connection.onGroovejetOpen = () => {
        this.connectionState = 'open';
        resolve(roomCode);
      };

      connection.onPeerOpen = this.onPeerConnected.bind(this);
      connection.onPeerMessage = this.onPeerMessage.bind(this);
      connection.onPeerClose = this.onPeerDisconnect.bind(this);
      // TODO: not actually implemented yet
      // connection.onPeerError = this.onPeerDisconnect;
    });

    this.connection.connectRoom(roomCode);

    return promise;
  }

  createNetworkedPrefab(name: string): Entity {
    const prefab = this.getPrefab(name);
    const entity = this.instantiatePrefab(prefab);
    this.wrapRpcFunctions(entity);
    return entity;
  }

  addLocalPlayer() {
    const player = this.addPlayer({
      inputter: this.pearl.inputter,
      isLocal: true,
    });

    this.setIdentity(player.id);
  }

  private onPeerConnected(peerId: string) {
    if (this.players.size === this.maxClients) {
      this.sendToPeer(peerId, {
        type: 'tooManyPlayers',
      });
      this.connection.closePeerConnection(peerId);
      return;
    }

    const player = this.addPlayer({
      inputter: new NetworkedInputter(),
    });

    this.peerIdToPlayerId.set(peerId, player.id);

    this.sendToPeer(peerId, {
      type: 'identity',
      data: {
        id: player.id,
      },
    });
  }

  private onPeerMessage(peerId: string, data: string) {
    const player = this.players.get(this.peerIdToPlayerId.get(peerId)!)!;
    const msg = JSON.parse(data) as ClientMessage;

    if (msg.type === 'keyDown') {
      this.onClientKeyDown(player, msg.data.keyCode);
    } else if (msg.type === 'keyUp') {
      this.onClientKeyUp(player, msg.data.keyCode);
    }
    // else if (msg.type === 'pong') {
    // const ping = Date.now() - this.lastPingTime; this.pings.set(playerId,
    // ping);
    // }
  }

  private onPeerDisconnect(peerId: string) {
    if (!this.peerIdToPlayerId.has(peerId)) {
      // this can happen if the socket is closed before the player is added
      return;
    }

    const player = this.players.get(this.peerIdToPlayerId.get(peerId)!)!;
    this.peerIdToPlayerId.delete(peerId);
    this.players.delete(player.id);
    this.removePlayer(player);
  }

  private addPlayer(opts: AddPlayerOpts): NetworkingPlayer {
    const playerId = playerIdCounter;
    playerIdCounter += 1;

    const player = new NetworkingPlayer(playerId, opts.inputter);
    this.players.set(playerId, player);

    if (opts.isLocal) {
      this.setIdentity(player.id);
    }

    this.onPlayerAdded.call({ networkingPlayer: player });

    return player;
  }

  private removePlayer(player: NetworkingPlayer): void {
    this.onPlayerRemoved.call({ networkingPlayer: player });
  }

  update(dt: number) {
    const snapshot = this.serializeSnapshot();

    this.sendAll(
      {
        type: 'snapshot',
        data: snapshot,
      },
      'unreliable'
    );
  }

  lateUpdate() {
    for (let player of this.players.values()) {
      if (player.inputter instanceof NetworkedInputter) {
        player.inputter.keysPressed = new Set();
      }
    }
  }

  private onClientKeyDown(player: NetworkingPlayer, keyCode: number) {
    if (player.inputter instanceof NetworkedInputter) {
      if (!player.inputter.keysDown.has(keyCode)) {
        player.inputter.keysDown.add(keyCode);
        player.inputter.keysPressed.add(keyCode);
      }
    }
  }

  private onClientKeyUp(player: NetworkingPlayer, keyCode: number) {
    if (player.inputter instanceof NetworkedInputter) {
      player.inputter.keysDown.delete(keyCode);
    }
  }

  private sendToPeer(
    peerId: string,
    msg: ServerMessage,
    channel: 'reliable' | 'unreliable' = 'reliable'
  ) {
    this.connection.sendPeer(peerId, JSON.stringify(msg), channel);
  }

  private sendAll(
    msg: ServerMessage,
    channel: 'reliable' | 'unreliable' = 'reliable'
  ): void {
    const serialized = JSON.stringify(msg);

    for (let peerId of this.peerIdToPlayerId.keys()) {
      this.connection.sendPeer(peerId, serialized, channel);
    }
  }

  private serializeSnapshot(): SnapshotMessageData {
    this.snapshotClock += 1;

    const networkedEntities = [...this.networkedEntities.values()];

    const serializedEntities: EntitySnapshot[] = networkedEntities.map(
      (entity) => {
        const networkedEntity = entity.getComponent(NetworkedEntity);

        let parentId;
        if (entity.parent) {
          parentId = entity.parent.getComponent(NetworkedEntity).id;
        }

        return {
          id: networkedEntity.id,
          type: networkedEntity.type,
          state: networkedEntity.hostSerialize(),
          parentId,
        };
      }
    );

    return {
      entities: serializedEntities,
      clock: this.snapshotClock,
    };
  }

  private wrapRpcFunctions(entity: Entity) {
    const components = entity.components;
    const entityId = entity.getComponent(NetworkedEntity).id;

    for (let component of components) {
      const componentName = component.constructor.name;

      // TODO: It'd be nice to have some extra guarantees here around ensuring
      // function is not a getter or setter, etc
      const rpcMethodNames = getRPCClassMethodNames(component);

      for (let methodName of rpcMethodNames) {
        const originalFn = (component as any)[methodName].bind(component);

        (component as any)[methodName] = (...args: any[]) => {
          originalFn(...args);

          this.dispatchRpc({
            entityId,
            // maybe replace this with a component ID at some point...
            componentName,
            methodName,
            args,
          });
        };
      }
    }
  }

  private dispatchRpc(opts: RpcMessageData) {
    this.sendAll({
      type: 'rpc',
      data: opts,
    });
  }
}

function getRecursiveProps(obj: Object): string[] {
  const prototype = Object.getPrototypeOf(obj);
  const propNames = Object.getOwnPropertyNames(obj);

  if (!prototype) {
    return propNames;
  } else {
    return propNames.concat(getRecursiveProps(prototype));
  }
}

// TODO: Would be nice to have guarantee rpc isn't a getter/setter, etc.
function getRPCClassMethodNames(obj: any): string[] {
  const props = getRecursiveProps(obj);

  return props
    .filter((prop) => prop.startsWith('rpc'))
    .filter((prop) => obj[prop] instanceof Function);
}
