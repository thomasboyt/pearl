import Entity from '../../../Entity';
import PolygonShape from '../../collision/shapes/PolygonShape';

import TileMapCollider, {
  ITileMap,
  TileCollisionType,
} from '../TileMapCollider';

class MockTileMap implements ITileMap {
  tileWidth = 10;
  tileHeight = 10;
}

const collider = new TileMapCollider();

const map = new MockTileMap();

const collisionMapStr = `
##########
#        #
#  ##    #
#  ##    #
#        #
#        #
#        #
##########
`.trim();

const collisionMap = collisionMapStr.split('\n').map((row) => {
  return row.split('').map((char) => {
    if (char === '#') {
      return TileCollisionType.Wall;
    } else {
      return TileCollisionType.Empty;
    }
  });
});

collider.initializeCollisions(map, collisionMap);

describe('TileMapCollider', () => {
  describe('testShape', () => {
    it('works for simple tile-sized boxes', () => {
      const box = PolygonShape.createBox({ width: 10, height: 10 });

      // placed at wall tile (1, 0)
      let collision = collider.testShape(box, { center: { x: 15, y: 5 } });
      expect(collision).toBeDefined();
      expect(collision!.overlap).toBe(10);

      // placed at empty tile (1, 1)
      collision = collider.testShape(box, { center: { x: 15, y: 15 } });
      expect(collision).toBeUndefined();
    });
  });

  it('works for larger boxes', () => {
    const box = PolygonShape.createBox({ width: 20, height: 20 });

    let collision = collider.testShape(box, { center: { x: 20, y: 20 } });
    expect(collision).toBeUndefined();

    collision = collider.testShape(box, { center: { x: 25, y: 20 } });
    expect(collision).toBeDefined();
  });
});
