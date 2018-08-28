import PolygonShape from '../PolygonShape';
import CircleShape from '../CircleShape';

// TODO: These test kinda suck
// Do some math and come back to them
describe('PolygonShape', () => {
  describe('testShape', () => {
    it('translates polygons correctly', () => {
      const self = PolygonShape.createBox({
        width: 5,
        height: 5,
      });
      const other = PolygonShape.createBox({
        width: 5,
        height: 5,
      });

      let resp = self.testShape(
        other,
        { center: { x: 0, y: 0 } },
        { center: { x: 0, y: 0 } }
      );

      expect(resp).toBeDefined();
      expect(resp!.overlap).toBe(5);

      resp = self.testShape(
        other,
        { center: { x: 0, y: 0 } },
        { center: { x: 2.5, y: 0 } }
      );

      expect(resp).toBeDefined();
      expect(resp!.overlap).toBe(2.5);
    });

    it('rotates polygons correctly', () => {
      const self = PolygonShape.createBox({
        width: 1,
        height: 1,
      });
      const other = PolygonShape.createBox({
        width: 5,
        height: 5,
      });

      let resp = self.testShape(
        other,
        { center: { x: 0, y: 0 } },
        { center: { x: 2.5, y: 2.5 } }
      );

      expect(resp).toBeDefined();
      expect(resp!.overlap).toBe(0.5);

      resp = self.testShape(
        other,
        { center: { x: 0, y: 0 } },
        { center: { x: 2.5, y: 2.5 }, angle: 45 * (Math.PI / 180) }
      );

      expect(resp).toBeUndefined();
    });

    it('reverses points if they are not in CCW orientation', () => {
      const shape = new PolygonShape({
        points: [[0, -57.5], [-50, 57.5], [50, 57.5]],
      });

      expect(shape.getSATShape().points.map((v) => [v.x, v.y])).toEqual([
        [50, 57.5],
        [-50, 57.5],
        [0, -57.5],
      ]);
    });

    it('collides with circles correctly', () => {
      const polygonPoints: [number, number][] = [
        [0, -57.5],
        [-50, 57.5],
        [50, 57.5],
      ];

      let self = new PolygonShape({
        points: polygonPoints,
      });

      let resp = self.testShape(
        new CircleShape({ radius: 5 }),
        { center: { x: 320, y: 181.5 } },
        { center: { x: 320, y: 430 } }
      );

      expect(resp).toBeUndefined();

      // ensure works for reversed points
      polygonPoints.reverse();

      self = new PolygonShape({
        points: polygonPoints,
      });

      resp = self.testShape(
        new CircleShape({ radius: 5 }),
        { center: { x: 320, y: 181.5 } },
        { center: { x: 320, y: 430 } }
      );

      expect(resp).toBeUndefined();
    });
  });
});
