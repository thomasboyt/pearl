import Physical from '../Physical';
import CollisionShape from '../collision/shapes/CollisionShape';
import PolygonShape from '../collision/shapes/PolygonShape';
import Collider from '../collision/Collider';
import { Position, CollisionResponse } from '../collision/utils';
import { unit } from '../../util/vectorMaths';

export enum TileCollisionType {
  Empty,
  Wall,
  OneWay,
}

interface TileCollisionInformation {
  type: TileCollisionType;
  position: Position;
  polygon: PolygonShape;
}

export interface ITileMap {
  tileWidth: number;
  tileHeight: number;
}

export default class TileMapCollider extends Collider {
  tileMap!: ITileMap;
  collisionMap: (TileCollisionInformation | null)[][] = [];
  lastCollision?: TileCollisionInformation;

  create() {
    this.entity.registerCollider(this);
  }

  initializeCollisions(tileMap: ITileMap, collisionMap: TileCollisionType[][]) {
    this.tileMap = tileMap;

    this.collisionMap = collisionMap.map((row, y) => {
      return row.map((type, x) => {
        if (type === TileCollisionType.Empty) {
          return null;
        }

        const worldX = x * tileMap.tileWidth;
        const worldY = y * tileMap.tileHeight;

        let polygon: PolygonShape;
        if (type === TileCollisionType.OneWay) {
          polygon = new PolygonShape({
            points: [
              [-tileMap.tileWidth / 2, -tileMap.tileHeight / 2],
              [tileMap.tileWidth / 2, -tileMap.tileHeight / 2],
            ],
          });
        } else {
          polygon = PolygonShape.createBox({
            width: tileMap.tileWidth,
            height: tileMap.tileHeight,
          });
        }

        return {
          type,
          polygon,
          position: {
            center: {
              x: worldX + tileMap.tileWidth / 2,
              y: worldY + tileMap.tileHeight / 2,
            },
          },
        };
      });
    });
  }

  getTile(x: number, y: number): TileCollisionInformation | null {
    if (!this.collisionMap[y] || !this.collisionMap[y][x]) {
      return null;
    }

    return this.collisionMap[y][x];
  }

  // TODO: Allow non-rectangular tiles
  testShape(
    shape: CollisionShape,
    otherPosition: Position
  ): CollisionResponse | undefined {
    const phys = this.entity.maybeGetComponent(Physical);
    const worldCenter = phys ? phys.center : { x: 0, y: 0 };

    const { xBounds, yBounds } = this.getTileBoundsOfShape(
      shape,
      otherPosition
    );

    for (let y = yBounds[0]; y <= yBounds[1]; y += 1) {
      for (let x = xBounds[0]; x <= xBounds[1]; x += 1) {
        const collisionInfo = this.getTile(x, y);
        if (!collisionInfo) {
          continue;
        }
        const tilePolygonShape = collisionInfo.polygon;
        const worldPosition = {
          ...collisionInfo.position,
          center: {
            x: collisionInfo.position.center.x + worldCenter.x,
            y: collisionInfo.position.center.y + worldCenter.y,
          },
        };
        // TODO: should this be inverted?
        const resp = tilePolygonShape.testShape(
          shape,
          worldPosition,
          otherPosition
        );
        if (resp && resp.overlap > 0) {
          // see "internal edges"
          // https://wildbunny.co.uk/blog/2011/12/14/how-to-make-a-2d-platform-game-part-2-collision-detection/
          // XXX: This only works because overlapVector is always `{x: n, y: 0}`
          // or `{x: 0, y: n}`. May want to make sure this works for multi-axis
          // tests in the future...
          const normal = unit(resp.overlapVector);
          const adjacentTile = this.getTile(x + normal.x, y + normal.y);
          if (adjacentTile) {
            // TODO: This needs to be finer to prevent seam collisions on top
            // edge of one-way tiles, obviously
            if (adjacentTile.type !== TileCollisionType.OneWay) {
              continue;
            }
          }
          // this is used in a hack for one-way collisions, see Player.ts
          this.lastCollision = collisionInfo;
          return resp;
        }
      }
    }
  }

  /**
   * Get the minimum and maximum tile points a shape is overlapping. This is
   * used for broadphase collision filtering, so that only tiles a shape could
   * be overlapping are checked.
   */
  private getTileBoundsOfShape(shape: CollisionShape, position: Position) {
    const phys = this.entity.maybeGetComponent(Physical);
    const worldCenter = phys ? phys.center : { x: 0, y: 0 };

    // offset the world position passed to testShape() by the position of the
    // tilemap
    const localPosition = {
      x: position.center.x - worldCenter.x,
      y: position.center.y - worldCenter.y,
    };

    // TODO: getBoundingBox() doesn't take into account rotation
    const bounds = shape.getBoundingBox();

    const xBounds = [
      Math.floor((localPosition.x + bounds.xMin) / this.tileMap.tileWidth),
      Math.ceil((localPosition.x + bounds.xMax) / this.tileMap.tileWidth),
    ];
    const yBounds = [
      Math.floor((localPosition.y + bounds.yMin) / this.tileMap.tileHeight),
      Math.ceil((localPosition.y + bounds.yMax) / this.tileMap.tileHeight),
    ];

    return { xBounds, yBounds };
  }
}
