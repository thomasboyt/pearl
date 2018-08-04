import { Physical, Vector2 } from 'pearl';

interface Snapshot {
  localCenter: Vector2;
  angle: number;
}

export default class NetworkedPhysical extends Physical {
  serialize(): Snapshot {
    return {
      localCenter: this.localCenter,
      angle: this.angle,
    };
  }

  deserialize(snapshot: Snapshot) {
    this.localCenter = snapshot.localCenter;
    this.angle = snapshot.angle;
  }
}
