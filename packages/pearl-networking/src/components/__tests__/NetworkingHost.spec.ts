import { Entity, Component, createTestPearl } from 'pearl';
jest.mock('pearl/dist/AudioManager');

import NetworkingHost from '../NetworkingHost';
import { NetworkedComponent } from '../../types';
import { EntityCreateMessage, EntityDestroyMessage } from '../../messages';
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

    expect(mockSendAll.mock.calls[0][0]).toEqual(expectedMsg);
  });

  it('sends destroy messages on entity destruction', async () => {
    const host = await setup();
    const mockSendAll = (host['sendAll'] = jest.fn());

    const prefab = host.createNetworkedPrefab('examplePrefab');
    host.pearl.entities.destroy(prefab);

    const expectedMsg: EntityDestroyMessage = {
      type: 'entityDestroy',
      data: {
        id: prefab.getComponent(NetworkedEntity).id,
      },
    };

    expect(mockSendAll.mock.calls[1][0]).toEqual(expectedMsg);
  });
});
