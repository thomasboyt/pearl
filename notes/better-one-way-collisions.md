#  Better one-way collisions with TileMapCollider

### Remove TileCollisionType

The only reason TileMapCollider even cares about the type is so it:

* Can create an "edge" polygon instead of a block
* Doesn't mark the edge between an top-facing edge tile and a horizontally-adjacent block tile as an internal collision

By allowing passing a polygon in `initializeCollisions`, and more intelligently handling seams, we can avoid both parts of this.

At this point, knowledge of a tile's "type" would then be transfered to the TileMap and not the TileMapCollider. TileMapCollider should at least make it easy to get the tile coordinates from the collision somehow (maybe using "meta" key as described below).

### Put the player in charge of toggling the collisions on/off

Currently, PlatformerPhysics does a check like

```typescript
if (collision.entity.collider instanceof TileMapCollider) {
  const tileMapCollider = collision.entity.collider;

  if (
    tileMapCollider.lastCollision!.type === TileCollisionType.OneWay &&
    this.vel.y < 0
  ) {
    phys.translate({ x, y });
    continue;
  }
}
```

This sorta works, but makes PlatformerPhysics require special knowledge of TileMapCollider, which is annoying. It also doesn't include a solution for one-way collisions _without_ TileMapCollider.

One way to solve this might be to just require some very special logic in the "player" component that knows to toggle one-way collisions off while ascending, and on while descending.

### Add a "meta" key to CollisionResponse

```typescript
interface CollisionResponse {
  // ...
  meta: any;
}

interface TileCollisionResponse extends CollisionResponse {
  meta: {
    tile: TileCollisionInfo
  }
}

// somwehere inside TileMapCollider.getCollision():

const resp = tileCollisionInfo.polygon.testShape(
  shape,
  tileCollisionInfo.position,
  otherPosition
);

return {
  ...resp,
  meta: {
    tile: TileCollisionInfo,
  }
}

// in PlatformerPhysics:

function isTileCollision(collision: CollisionResponse): collision is TileCollisionResponse {
  return collision.collider instanceof TileMapCollider;
}

const collisions = this.getComponent(KinematicBody).moveAndSlide(this.vel);

for (let collision of collisions) {
  if (isTileCollision(collision)) {
    if (collision.meta.tile.type === TileCollisionType.OneWay) {
      // one-way logic
    }
  }
}
```

