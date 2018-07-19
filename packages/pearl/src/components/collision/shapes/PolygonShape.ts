import * as SAT from 'sat';

import CollisionShape from './CollisionShape';
import CircleShape from './CircleShape';
import { CollisionResponse, Point, Position, responseFromSAT } from '../utils';

export interface BoxOptions {
  width: number;
  height: number;
}

export interface PolygonSettings {
  points?: [number, number][];
}

export default class PolygonShape extends CollisionShape {
  /**
   * Convenience method to create a rectangular polygon.
   */
  static createBox(opts: BoxOptions): PolygonShape {
    const poly = new PolygonShape();

    poly.setBoxSize({
      width: opts.width,
      height: opts.height,
    });

    return poly;
  }

  points: [number, number][] = [];

  // These properties only exist on Boxes, and maybe should be moved to an actual BoxShape
  // subclass of this. Hm.
  // https://docs.unity3d.com/ScriptReference/Renderer-bounds.html might be worth looking into
  width?: number;
  height?: number;

  constructor(settings: PolygonSettings = {}) {
    super();
    if (settings.points) {
      this.points = settings.points;
    }
  }

  /**
   * Replace the points in this collider with a box.
   */
  setBoxSize(opts: BoxOptions) {
    const points: Point[] = [
      [-opts.width / 2, -opts.height / 2],
      [opts.width / 2, -opts.height / 2],
      [opts.width / 2, opts.height / 2],
      [-opts.width / 2, opts.height / 2],
    ];

    this.points = points;

    this.width = opts.width;
    this.height = opts.height;
  }

  getSATShape(): SAT.Polygon {
    // TODO: Cache this
    const vectors = this.points.map(([x, y]) => new SAT.Vector(x, y));
    const polygon = new SAT.Polygon(new SAT.Vector(0, 0), vectors);
    return polygon;
  }

  testShape(
    shape: CollisionShape,
    selfPosition: Position,
    otherPosition: Position
  ): CollisionResponse | undefined {
    const selfPolygon = this.getSATShape();
    if (selfPosition.angle !== undefined) {
      selfPolygon.rotate(selfPosition.angle);
    }
    selfPolygon.translate(selfPosition.center.x, selfPosition.center.y);

    // ****
    // TODO: Rotate & translate shape here!!!
    // ****

    const resp = new SAT.Response();
    let collided: boolean;

    if (shape instanceof PolygonShape) {
      const otherPolygon = shape.getSATShape();
      // don't bother rotating for undefined _or_ 0, since the default is always 0
      if (otherPosition.angle) {
        otherPolygon.rotate(otherPosition.angle);
      }
      otherPolygon.translate(otherPosition.center.x, otherPosition.center.y);
      collided = SAT.testPolygonPolygon(selfPolygon, otherPolygon, resp);
    } else if (shape instanceof CircleShape) {
      const otherCircle = shape.getSATShape();
      otherCircle.pos = new SAT.Vector(
        otherPosition.center.x,
        otherPosition.center.y
      );
      collided = SAT.testPolygonCircle(selfPolygon, otherCircle, resp);
    } else {
      throw new Error('Unrecognized shape');
    }

    if (collided) {
      return responseFromSAT(resp);
    }
  }
}
