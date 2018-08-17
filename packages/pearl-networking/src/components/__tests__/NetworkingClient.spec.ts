import { Entity, Component, createTestPearl, PearlInstance } from 'pearl';
jest.mock('pearl/dist/AudioManager');
jest.mock('pearl-multiplayer-socket');

import NetworkingClient from '../NetworkingClient';
import { NetworkedComponent } from '../../types';
import {
  EntityCreateMessage,
  EntityDestroyMessage,
  InitialSnapshotMessage,
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
  const client = new NetworkingClient({
    prefabs: {
      examplePrefab: {
        type: 'examplePrefab',
        createComponents: () => [new TestComponent()],
      },
    },
  });

  const pearl = await createTestPearl({
    rootComponents: [client],
  });

  return client;
}

async function createTestEntity(client: NetworkingClient) {
  const msg: EntityCreateMessage = {
    type: 'entityCreate',
    data: {
      id: '1234',
      parentId: undefined,
      state: {
        TestComponent: {
          a: 1,
        },
      },
      type: 'examplePrefab',
    },
  };

  const promise = client.connect({
    roomCode: '',
    groovejetUrl: '',
  });
  client['connection'].onOpen();
  await promise;

  client['connection'].onMessage(JSON.stringify(msg));
}

function getTestEntity(pearl: PearlInstance): Entity | undefined {
  // TODO: This currently gets the entities as a set so it can check if the
  // entity got added before it was instantiated. There should really be a
  // getEntityByName or some shit for this instead :\
  const entitiesSet: Set<Entity> = pearl.entities['_entities'];

  const entity = [...entitiesSet].filter((entity) => {
    const networked = entity.maybeGetComponent(NetworkedEntity);
    if (networked) {
      return networked.id === '1234';
    }
    return false;
  })[0];

  return entity;
}

describe('NetworkingClient', () => {
  it('creates entity when entityCreate message is received', async () => {
    const client = await setup();
    await createTestEntity(client);

    const entity = getTestEntity(client.pearl);
    expect(entity).toBeDefined();
    expect(entity!.getComponent(TestComponent).a).toBe(1);
  });

  it('destroys entity when entityDestroy message is received', async () => {
    const client = await setup();
    await client.connect({ groovejetUrl: '/', roomCode: 'roomCode' });
    await createTestEntity(client);

    const msg: EntityDestroyMessage = {
      type: 'entityDestroy',
      data: {
        id: '1234',
      },
    };

    client['connection'].onMessage(JSON.stringify(msg));

    const entity = getTestEntity(client.pearl);
    expect(entity).toBeUndefined();
  });

  it('creates entities from the initial snapshot when received', async () => {
    const client = await setup();
    await client.connect({ groovejetUrl: '/', roomCode: 'roomCode' });

    const msg: InitialSnapshotMessage = {
      type: 'initialSnapshot',
      data: {
        clock: 1,
        entities: [
          {
            id: '1234',
            parentId: undefined,
            state: {
              TestComponent: {
                a: 1,
              },
            },
            type: 'examplePrefab',
          },
        ],
      },
    };

    client['connection'].onMessage(JSON.stringify(msg));

    const entity = getTestEntity(client.pearl);
    expect(entity).toBeDefined();
    expect(entity!.getComponent(TestComponent).a).toBe(1);
  });
});
