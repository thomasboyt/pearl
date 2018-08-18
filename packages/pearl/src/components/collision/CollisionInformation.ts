import Collider from './Collider';
import { CollisionResponse } from './utils';
import Entity from '../../Entity';
import * as V from '../../util/vectorMaths';

export default class CollisionInformation {
  collider: Collider;
  entity: Entity;
  response: CollisionResponse;

  constructor(collider: Collider, response: CollisionResponse) {
    this.collider = collider;
    this.entity = collider.entity;
    this.response = response;
  }

  static invertResponse(response: CollisionResponse): CollisionResponse {
    return {
      aInB: response.bInA,
      bInA: response.aInB,
      overlap: -response.overlap,
      overlapVector: V.negative(response.overlapVector),
    };
  }
}
