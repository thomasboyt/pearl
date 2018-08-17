import { Entity, Component, createTestPearl } from 'pearl';
jest.mock('pearl/dist/AudioManager');
jest.mock('pearl-multiplayer-socket');

import NetworkingHost from '../NetworkingHost';
import { NetworkedComponent } from '../../types';
import {
  EntityCreateMessage,
  EntityDestroyMessage,
  InitialSnapshotMessage,
  TooManyPlayersMessage,
} from '../../messages';
import NetworkedEntity from '../NetworkedEntity';

interface TestComponentSnapshot {
  a: number;
}

class TestComponent extends Component<void>
  implements NetworkedComponent<TestComponentSnapshot> {
  a = 0;

  create() {
    this.a = 1;
  }

  serialize() {
    return { a: this.a };
  }

  deserialize(snapshot: TestComponentSnapshot) {
    this.a = snapshot.a;
  }
}

async function setup() {
  const host = new NetworkingHost({
    maxClients: 1,
    prefabs: {
      examplePrefab: {
        type: 'examplePrefab',
        createComponents: () => [new TestComponent()],
      },
    },
  });

  const pearl = await createTestPearl({
    rootComponents: [host],
  });

  return host;
}

describe('NetworkingHost', () => {
  it('sends creation messages on entity creation', async () => {
    const host = await setup();
    const mockSendAll = (host['sendAll'] = jest.fn());

    const prefab = host.createNetworkedPrefab('examplePrefab');

    const expectedMsg: EntityCreateMessage = {
      type: 'entityCreate',
      data: {
        id: prefab.getComponent(NetworkedEntity).id,
        parentId: undefined,
        state: {
          TestComponent: {
            a: 1,
          },
        },
        type: 'examplePrefab',
      },
    };

    host.pearl.ticker.step(0);

    expect(mockSendAll.mock.calls[0][0]).toEqual(expectedMsg);
  });

  it('sends destroy messages on entity destruction', async () => {
    const host = await setup();
    const mockSendAll = (host['sendAll'] = jest.fn());

    const prefab = host.createNetworkedPrefab('examplePrefab');
    host.pearl.ticker.step(0);

    host.pearl.entities.destroy(prefab);

    const expectedMsg: EntityDestroyMessage = {
      type: 'entityDestroy',
      data: {
        id: prefab.getComponent(NetworkedEntity).id,
      },
    };

    expect(mockSendAll.mock.calls[2][0]).toEqual(expectedMsg);
  });

  it('sends initial snapshot message when player joins', async () => {
    const host = await setup();
    await host.connect('/');

    const peerId = 'peerId';

    host['connection'].onPeerOpen(peerId);

    const expectedMessage: InitialSnapshotMessage = {
      type: 'initialSnapshot',
      data: {
        entities: [],
        clock: 1,
      },
    };

    const sendPeerMock = host['connection'].sendPeer as jest.Mock<{}>;

    expect(sendPeerMock.mock.calls[0][0]).toEqual(peerId);
    expect(sendPeerMock.mock.calls[0][1]).toEqual(
      JSON.stringify(expectedMessage)
    );
  });

  it('sends a too-many-clients message when too many players join', async () => {
    const host = await setup();
    await host.connect('/');
    host['connection'].onPeerOpen('one');
    host['connection'].onPeerOpen('two');

    const sendPeerMock = host['connection'].sendPeer as jest.Mock<{}>;

    const expectedMessage: TooManyPlayersMessage = {
      type: 'tooManyPlayers',
    };

    expect(sendPeerMock.mock.calls[2][0]).toEqual('two');
    expect(sendPeerMock.mock.calls[2][1]).toEqual(
      JSON.stringify(expectedMessage)
    );
  });
});
