import PearlInstance, { CreatePearlOpts } from '../PearlInstance';

export default async function createTestPearl(
  opts: Partial<CreatePearlOpts>
): Promise<PearlInstance> {
  const defaultOpts: CreatePearlOpts = {
    canvas: document.createElement('canvas'),
    width: 100,
    height: 100,
    rootComponents: [],
  };

  const finalOpts = { ...defaultOpts, ...opts };

  const game = new PearlInstance();

  await game.loadAssets(opts.assets || {});
  game.run(finalOpts);

  return game;
}
