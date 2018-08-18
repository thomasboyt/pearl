import Component, { requireComponents } from '../Component';
import Physical from './Physical';

import PolygonCollider from './collision/PolygonCollider';
import BoxCollider from './collision/BoxCollider';

export interface Options {
  fillStyle?: string;
  strokeStyle?: string;
}

@requireComponents(Physical)
export default class PolygonRenderer extends Component<Options> {
  fillStyle: string | null = null;
  strokeStyle: string | null = null;

  create(opts: Options = {}) {
    this.fillStyle = opts.fillStyle || null;
    this.strokeStyle = opts.strokeStyle || null;
  }

  init() {
    if (!this.poly) {
      throw new Error(
        'PolygonRenderer cannot render without PolygonCollider or BoxCollider'
      );
    }
  }

  get poly() {
    return (
      this.entity.maybeGetComponent(PolygonCollider) ||
      this.entity.maybeGetComponent(BoxCollider)
    );
  }

  render(ctx: CanvasRenderingContext2D) {
    const phys = this.getComponent(Physical);

    const points = this.poly!.getCollisionShape().points;
    ctx.translate(phys.center.x, phys.center.y);
    ctx.rotate(phys.angle);

    ctx.beginPath();

    ctx.moveTo(points[0][0], points[0][1]);

    for (let point of points.slice(1)) {
      ctx.lineTo(point[0], point[1]);
    }

    ctx.lineTo(points[0][0], points[0][1]);

    if (this.fillStyle) {
      ctx.fillStyle = this.fillStyle;
      ctx.fill();
    }
    if (this.strokeStyle) {
      ctx.strokeStyle = this.strokeStyle;
      ctx.stroke();
    }

    ctx.closePath();
  }
}
