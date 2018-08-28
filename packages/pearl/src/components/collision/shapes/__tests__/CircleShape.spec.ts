import CircleShape from '../CircleShape';
import PolygonShape from '../PolygonShape';

describe('CircleShape', () => {
  describe('testShape', () => {
    it('collides with circles correctly', () => {
      const self = new CircleShape({
        radius: 5,
      });

      const other = new CircleShape({
        radius: 5,
      });

      let resp = self.testShape(
        other,
        { center: { x: 0, y: 0 } },
        { center: { x: 0, y: 0 } }
      );

      expect(resp).toBeDefined();
      expect(resp!.overlap).toBe(10);
    });

    it('collides with polygons correctly', () => {
      const self = new CircleShape({
        radius: 5,
      });

      const triangle = new PolygonShape({
        points: [[0, -57.5], [-50, 57.5], [50, 57.5]],
      });

      let resp = self.testShape(
        triangle,
        { center: { x: 320, y: 430 } },
        { center: { x: 320, y: 181.5 } }
      );

      expect(resp).toBeUndefined();
    });
  });
});
