import Physical from '../Physical';
import CollisionShape from '../collision/shapes/CollisionShape';
import PolygonShape from '../collision/shapes/PolygonShape';
import Collider from '../collision/Collider';
import { Position, CollisionResponse } from '../collision/utils';
import { unit } from '../../util/vectorMaths';
import { Vector2 } from '../../types';

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

/**
 * TileMapCollider is a simple collider that can be used to represent a tile
 * map, or a grid of same-sized static entities. It's meant to be used with a
 * custom TileMap component (implementing ITileMap).
 *
 * After constructing or changing the tile map,
 * `TileMapCollider.initializeCollisions()` should be called with a
 * `collisionMap` that's simply a 2-D array containing TileCollisionType items.
 * Then, this can be used like any other Collider component.
 *
 * TODO: Note that TileMapCollider currently only supports _rectangular_ tiles.
 * Eventually, I'd like to add support for other tile shapes, and you'll be able
 * to pass a custom `PolygonShape` to `collisionMap`.
 *
 * The main tricky bit here is still supporting the idea of "collapsing seams" -
 * that is, not detecting collisions on a solid edge between tiles (see
 * https://gamedev.stackexchange.com/q/29036). This is easy to do with
 * rectangular tiles, but trickier to do when edges can be "partially" solid.
 */
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

  testShape(
    shape: CollisionShape,
    otherWorldPosition: Position
  ): CollisionResponse | undefined {
    const phys = this.entity.maybeGetComponent(Physical);
    const worldCenter = phys ? phys.center : { x: 0, y: 0 };

    // offset the world position passed to testShape() by the position of the
    // tilemap
    const otherLocalPosition: Position = {
      angle: otherWorldPosition.angle,
      center: {
        x: otherWorldPosition.center.x - worldCenter.x,
        y: otherWorldPosition.center.y - worldCenter.y,
      },
    };

    const { xBounds, yBounds } = this.getTileBoundsOfShape(
      shape,
      otherLocalPosition
    );

    for (let y = yBounds[0]; y <= yBounds[1]; y += 1) {
      for (let x = xBounds[0]; x <= xBounds[1]; x += 1) {
        const tileCollisionInfo = this.getTile(x, y);
        if (!tileCollisionInfo) {
          continue;
        }

        const collision = this.testCollisionWithTile(
          { x, y },
          tileCollisionInfo,
          shape,
          otherLocalPosition
        );

        if (collision) {
          // this is used in a hack for one-way collisions, see Player.ts
          this.lastCollision = tileCollisionInfo;
          return collision;
        }
      }
    }
  }

  private testCollisionWithTile(
    tileCoordinates: Vector2,
    tileCollisionInfo: TileCollisionInformation,
    shape: CollisionShape,
    otherPosition: Position
  ): CollisionResponse | undefined {
    const { x, y } = tileCoordinates;

    // TODO: should this be inverted?
    const resp = tileCollisionInfo.polygon.testShape(
      shape,
      tileCollisionInfo.position,
      otherPosition
    );

    if (!resp || resp.overlap === 0) {
      return;
    }

    // see "internal edges"
    // https://wildbunny.co.uk/blog/2011/12/14/how-to-make-a-2d-platform-game-part-2-collision-detection/
    // XXX: This only works because overlapVector is always `{x: n, y: 0}` or
    // `{x: 0, y: n}`. May want to make sure this works for multi-axis tests in
    // the future...
    const normal = unit(resp.overlapVector);
    const adjacentTile = this.getTile(x + normal.x, y + normal.y);
    if (adjacentTile) {
      // TODO: This needs to be finer to prevent seam collisions on top
      // edge of one-way tiles, obviously
      if (adjacentTile.type !== TileCollisionType.OneWay) {
        return;
      }
    }

    return resp;
  }

  /**
   * Get the minimum and maximum tile points a shape is overlapping. This is
   * used for broadphase collision filtering, so that only tiles a shape could
   * be overlapping are checked.
   */
  private getTileBoundsOfShape(shape: CollisionShape, localPosition: Position) {
    // TODO: getBoundingBox() doesn't take into account rotation
    const bounds = shape.getBoundingBox();
    const localCenter = localPosition.center;

    const xBounds = [
      Math.floor((localCenter.x + bounds.xMin) / this.tileMap.tileWidth),
      Math.ceil((localCenter.x + bounds.xMax) / this.tileMap.tileWidth),
    ];
    const yBounds = [
      Math.floor((localCenter.y + bounds.yMin) / this.tileMap.tileHeight),
      Math.ceil((localCenter.y + bounds.yMax) / this.tileMap.tileHeight),
    ];

    return { xBounds, yBounds };
  }

  private getTile(x: number, y: number): TileCollisionInformation | null {
    if (!this.collisionMap[y] || !this.collisionMap[y][x]) {
      return null;
    }

    return this.collisionMap[y][x];
  }
}
