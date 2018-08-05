# Pearl

[![Build Status](https://travis-ci.org/thomasboyt/pearl.svg?branch=master)](https://travis-ci.org/thomasboyt/pearl)

Pearl is a small framework for creating video games in the browser. It's written in TypeScript, but can be used in any language that compiles to JavaScript.

Pearl aims to be a a simpler, code-only alternative to full-scale frameworks like [Unity](http://unity3d.com/) or [Superpowers](http://superpowers-html5.com/). Like those frameworks, Pearl uses the [Component](http://gameprogrammingpatterns.com/component.html) pattern to avoid complex object hierarchies and difficult-to-decompose entities. Unlike those frameworks, Pearl is a _code-only framework_, and does not include any editor or special tooling.

**Pearl is in very early alpha stages,** and will probably undergo many significant breaking changes before the first `0.1.0` release. There are many unanswered questions in the current design.

## [Docs](https://pearl-docs.disco.zone/)

## Development Overview

Pearl is in a monorepo powered by [Lerna](https://github.com/lerna/lerna), which has a lot of quirks. It's currently using Lerna v3 which just entered RC, but still seems very underdocumented and in flux.

### Build

To install:

```text
npm install
npx lerna bootstrap
```

Then to actually build:

```text
npx lerna run build
```

There's no harm to running individual builds for individual projects as you work on them, but watch out for dependency ordering issues.

### Test

Tests can be run through the root of the project (for all packages), or through an individual package, with `npm test`:

```text
npm test
```

Everything uses Jest for testing.

Note that packages that import other packages are importing their _build artifacts_, not their original source. This means that you should make sure to rebuild with `npm run build` before re-running your test if you change a dependency.

### Release

To publish to NPM:

```text
npx lerna publish
```

### Caveats

#### Using `npm link`

NPM links kinda mess things up by default with this monorepo, because it'll run `npm install` inside a folder, which leads to duplicate dependencies in `node_modules/` and all sorts of mess. It's still doable, you'll just want to remove the added packages & lockfile and re-run `lerna bootstrap`:

```text
cd packages/pearl
npm link
rm package-lock.json
rm node_modules/
cd ../..
npm run bootstrap
```

Also, if you link a module that depends on Pearl (like `pearl-networking`), you'll _also need to link Pearl!_ Otherwise the type analysis will get all messed up because it won't be able to equate types between the Pearl inside the local monorepo and Pearl installed in the linker's `node_modules/`.

#### Lockfiles

Pearl currently doesn't have a full lockfile, because [lockfiles in Lerna 3](https://github.com/lerna/lerna/issues/1462#issuecomment-410475552) seem to be an unanswered question. The lockfile only contains the `devDependencies` within the root `package.json`.

This is more or less fine since the only things that really need to be locked are, in fact, the common dev dependencies - remember, NPM doesn't use lockfiles when installing packages, so having lockfiles for published `packages/` is kinda pointless (you'd want to be developing against the versions of dependencies your users would be using).

The only thing to watch out for is that you can't use `npm ci` to install dependencies in this project, since it'll freak out that `package-lock.json` doesn't match `package.json`.

#### npx

`npx` isn't able to resolve `.bin/` dependencies from a parent folder (see https://github.com/zkat/npx/issues/118), meaning if you want to run a hoisted dependency's bin script inside a specific package's folder, you'll need to use `../../node_modules/.bin/<command>`  instead of `npx`.

#### Using sibling packages in tests

Remember that packages in this repo import the `dist` folders of sibling packages, even in development. If you change a sibling package, you'll want to rebuild it before e.g. re-running tests. Root-level `npm test` handles this for you.

Pearl currently ships certain packages as ES6 modules to allow for fancy code-shaking. This is one of those things that's totally fine until you try to use the wrong tool that can't handle ES modules, and one of those tools is Jest. There's a workaround for this that basically boils down to "run the TypeScript compiler on certain JS files in `node_modules/`"; see `jest.config.js` and `jest.tsconfig.json` for details. Note that this is also an issue with adding tests to any Pearl game, and this documentation should be included in a section on testing at some point.
