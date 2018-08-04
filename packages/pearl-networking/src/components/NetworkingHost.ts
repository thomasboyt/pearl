import { Entity } from 'pearl';

import Networking, { Snapshot, EntitySnapshot } from './Networking';
import NetworkedEntity from './NetworkedEntity';
import Delegate from '../util/Delegate';
import HostConnection from '../HostConnection';

let playerIdCounter = 0;

// TODO: HOLY SHIT MOVE THIS AAA
const MAX_CLIENTS = 2;

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

export interface RpcMessage {
  entityId: string;
  componentName: string;
  methodName: string;
  args: any[];
}

export default class NetworkingHost extends Networking {
  peerIdToPlayerId = new Map<string, number>();
  players = new Map<number, NetworkingPlayer>();

  onPlayerAdded = new Delegate<OnPlayerAddedMsg>();
  onPlayerRemoved = new Delegate<OnPlayerAddedMsg>();

  connectionState: 'connecting' | 'open' | 'closed' = 'connecting';
  private connection!: HostConnection;
  private snapshotClock = 0;
  isHost = true;

  // XXX: might be good in the future to have this use coroutines, once
  // coroutines can yield other coroutines. for now, should be okay since this
  // component never gets destroyed
  async connect(groovejetUrl: string): Promise<string> {
    const connection = new HostConnection(groovejetUrl);
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

  private onPeerConnected(peerId: string) {
    if (this.players.size === MAX_CLIENTS) {
      this.connection.sendPeer(
        peerId,
        JSON.stringify({
          type: 'tooManyPlayers',
        })
      );
      this.connection.closePeerConnection(peerId);
      return;
    }

    const player = this.addPlayer({
      inputter: new NetworkedInputter(),
    });

    this.peerIdToPlayerId.set(peerId, player.id);

    this.connection.sendPeer(
      peerId,
      JSON.stringify({
        type: 'identity',
        data: {
          id: player.id,
        },
      })
    );
  }

  private onPeerMessage(peerId: string, data: string) {
    const player = this.players.get(this.peerIdToPlayerId.get(peerId)!)!;
    const msg = JSON.parse(data);

    if (msg.type === 'keyDown') {
      this.onClientKeyDown(player, msg.data.keyCode);
    } else if (msg.type === 'keyUp') {
      this.onClientKeyUp(player, msg.data.keyCode);
    } else if (msg.type === 'pong') {
      // const ping = Date.now() - this.lastPingTime; this.pings.set(playerId,
      // ping);
    }
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

  addLocalPlayer() {
    const player = this.addPlayer({
      inputter: this.pearl.inputter,
      isLocal: true,
    });

    this.setIdentity(player.id);
  }

  private removePlayer(player: NetworkingPlayer): void {
    this.onPlayerRemoved.call({ networkingPlayer: player });
  }

  update(dt: number) {
    const snapshot = this.serializeSnapshot();

    this.sendToPeers(
      {
        type: 'snapshot',
        data: snapshot,
      },
      'unreliable'
    );

    // TODO: This is wrapped in setImmediate() so that keys aren't unset before
    // everything else's update() hook is called This is a decent argument for
    // adding a lateUpdate() hook that happens after update()
    setImmediate(() => {
      for (let player of this.players.values()) {
        if (player.inputter instanceof NetworkedInputter) {
          player.inputter.keysPressed = new Set();
        }
      }
    });
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

  createNetworkedPrefab(name: string): Entity {
    const prefab = this.getPrefab(name);
    const entity = this.instantiatePrefab(prefab);
    this.wrapRpcFunctions(entity);
    return entity;
  }

  private sendToPeers(
    msg: any,
    channel: 'reliable' | 'unreliable' = 'reliable'
  ): void {
    // const serialized = serializeMessage('host', msg);
    const serialized = JSON.stringify(msg);

    for (let peerId of this.peerIdToPlayerId.keys()) {
      this.connection.sendPeer(peerId, serialized, channel);
    }
  }

  private serializeSnapshot(): Snapshot {
    this.snapshotClock += 1;

    const networkedEntities = [...this.networkedEntities.values()];

    const serializedEntities: EntitySnapshot[] = networkedEntities.map(
      (entity) => {
        const networkedEntity = entity.getComponent(NetworkedEntity);

        return {
          id: networkedEntity.id,
          type: networkedEntity.type,
          state: networkedEntity.hostSerialize(),
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

  dispatchRpc(opts: RpcMessage) {
    this.sendToPeers({
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
