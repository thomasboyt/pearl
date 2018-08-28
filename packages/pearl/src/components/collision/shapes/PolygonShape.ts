import * as SAT from 'sat';

import CollisionShape from './CollisionShape';
import CircleShape from './CircleShape';
import testShapes from './testShapes';
import {
  CollisionResponse,
  Point,
  Position,
  responseFromSAT,
  Bounds,
} from '../utils';

interface BoxOptions {
  width: number;
  height: number;
}

export interface PolygonSettings {
  points?: [number, number][];
}

export default class PolygonShape extends CollisionShape {
  points: [number, number][] = [];

  constructor(settings: PolygonSettings = {}) {
    super();
    if (settings.points) {
      this.points = settings.points;
    }
  }

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
  }

  getSATShape(): SAT.Polygon {
    // TODO: Cache this
    const vectors = this.points.map(([x, y]) => new SAT.Vector(x, y));
    const polygon = new SAT.Polygon(new SAT.Vector(0, 0), vectors);
    return polygon;
  }

  getBoundingBox(): Bounds {
    // TODO: Use SAT.Polygon.getBoundingBox() here

    const points = this.getSATShape().calcPoints;

    let xMin = points[0].x;
    let yMin = points[0].y;
    let xMax = points[0].x;
    let yMax = points[0].y;

    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      if (point.x < xMin) {
        xMin = point.x;
      } else if (point.x > xMax) {
        xMax = point.x;
      }
      if (point.y < yMin) {
        yMin = point.y;
      } else if (point.y > yMax) {
        yMax = point.y;
      }
    }

    return { xMin, yMin, xMax, yMax };
  }
}
