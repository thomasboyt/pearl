import * as SAT from 'sat';
import CollisionShape from './CollisionShape';
import { CollisionResponse, Position, responseFromSAT } from '../utils';

function setSATPosition(
  shape: SAT.Polygon | SAT.Circle,
  position: Position
): void {
  if (shape instanceof SAT.Polygon) {
    if (position.angle) {
      shape.rotate(position.angle);
    }
    shape.translate(position.center.x, position.center.y);
  } else {
    shape.pos = new SAT.Vector(position.center.x, position.center.y);
  }
}

export default function testShapes(
  a: CollisionShape,
  aPosition: Position,
  b: CollisionShape,
  bPosition: Position
): CollisionResponse | undefined {
  const aSAT = a.getSATShape();
  const bSAT = b.getSATShape();

  setSATPosition(aSAT, aPosition);
  setSATPosition(bSAT, bPosition);

  const resp = new SAT.Response();
  let collided: boolean;

  if (aSAT instanceof SAT.Polygon && bSAT instanceof SAT.Polygon) {
    collided = SAT.testPolygonPolygon(aSAT, bSAT, resp);
  } else if (aSAT instanceof SAT.Polygon && bSAT instanceof SAT.Circle) {
    collided = SAT.testPolygonCircle(aSAT, bSAT, resp);
  } else if (aSAT instanceof SAT.Circle && bSAT instanceof SAT.Polygon) {
    collided = SAT.testCirclePolygon(aSAT, bSAT, resp);
  } else if (aSAT instanceof SAT.Circle && bSAT instanceof SAT.Circle) {
    collided = SAT.testCircleCircle(aSAT, bSAT, resp);
  } else {
    throw new Error('Unrecognized shape pair');
  }

  if (collided) {
    return responseFromSAT(resp);
  }
}
