# Tutorial

In this tutorial, we'll make a very simple game, in which the heroic player, as represented by a box, shall pick up a sword to slay the terrifying, massive enemy, as represented by a somewhat larger box.

To get a sense of what we're making, it may make sense to preview the completed game [here](http://pearl-tutorial.surge.sh/). You can use the arrow keys to move.

## Setting up the boilerplate

You can use anything that knows how to build TypeScript to compile games in Pearl, but Pearl recommends the _lingua franca_ of build systems, [Webpack](https://webpack.js.org/), to build. Don't worry, for this tutorial you won't need to configure it yourself. To follow along at home, just clone the tutorial repo:

```
git clone git@github.com:thomasboyt/pearl-tutorial.git
cd pearl-tutorial
npm install
```

Once npm finishes installing all dependencies (that is: TypeScript, Webpack, several Webpack loaders, and Pearl itself), you can start the dev server with `npm run dev`, then navigate to `localhost:8080`. If you see a blank white screen with no console errors, you're all set up!

## Creating the game world and player object

First off, let's just create a game world that contains the player. `index.ts` already has the scaffolding for a game, so we'll fill it out further:

```typescript
// index.ts

import {
  Component,
  createPearl,
  Entity,
  Physical,
  BoxCollider,
  BoxRenderer,
} from 'pearl';

class Game extends Component<null> {
  init() {
    this.pearl.entities.add(
      new Entity({
        name: 'player',
        components: [
          new Physical({
            center: {
              x: 140,
              y: 20,
            },
          }),

          new BoxCollider({
            width: 20,
            height: 20,
          }),

          new BoxRenderer({
            fillStyle: 'cyan',
          }),
        ],
      })
    );
  }
}

createPearl({
  rootComponents: [new Game()],
  width: 300,
  height: 300,
  canvas: document.getElementById('canvas') as HTMLCanvasElement,
});
```

Start by looking at the bottom of the file: we're creating a new Pearl instance using `createPearl`. In addition to setting the canvas to use, and its width and height, we define a _root component_. This component is instantiated when the game starts, and is generally used as an "entry point" into the game. It's attached to a root entity, which can be accessed at `this.pearl.root`.

When the game component is initialized, we create a new entity, the player. The player entity is composed of a `Physical` component, giving it a position, a `BoxCollider` component, which creates a rectangular collider, and a `BoxRenderer` component, which renders the box defined by the `BoxCollider`.

{% hint style="info" %}
In addition to `BoxCollider`, Pearl also includes a `PolygonCollider` and `CircleCollider`, and corresponding `Render` components for both.
{% endhint %}

Now, when we start the game, we see a cyan box at the top of the screen. Our valiant player will venture down to face an enemy at the bottom of the screen, which we will add in a moment. However, before we do so, we need to give the player the ability to move.

## Adding player input

To give the player the ability to move, we'll create a new component, `Player`, which will be attached to the entity along with the previously-shown components. In a new file, a new component is created:

```typescript
// components/Player.ts

import { Component } from 'pearl';

export default class Player extends Component<null> {
}
```

Then, back in our root Game component, we import the component and add it to the components:

```typescript
// snip previously shown imports...
import Player from './components/Player';

class Game extends Component<null> {
  init() {
    this.pearl.entities.add(
      new Entity({
        name: 'player',
        components: [
          // snip previously shown components...
          new Player(),
        ]
      })
    );
  }
}
```

Now, we can add our input logic to `Player`.

To move the player, we need to do two things: read the input from the keyboard \(that is, which arrow keys are being pressed\), and then apply a velocity to the entity's `Physical` component:

```typescript
import { Component, Keys, Physical } from 'pearl';

export default class Player extends Component<null> {
  playerSpeed = 0.1;

  update(dt: number) {
    this.move(dt);
  }

  private move(dt: number) {
    let xVec = 0;
    let yVec = 0;

    if (this.pearl.inputter.isKeyDown(Keys.rightArrow)) {
      xVec = 1;
    } else if (this.pearl.inputter.isKeyDown(Keys.leftArrow)) {
      xVec = -1;
    }

    if (this.pearl.inputter.isKeyDown(Keys.downArrow)) {
      yVec = 1;
    } else if (this.pearl.inputter.isKeyDown(Keys.upArrow)) {
      yVec = -1;
    }

    this.getComponent(Physical).translate({
      x: xVec * this.playerSpeed * dt,
      y: yVec * this.playerSpeed * dt,
    });
  }
}
```

Here, we've defined a method, `move()`, which gets called on every frame through the `update()` hook. `move()` reads the currently-pressed keys via the `pearl.inputter` API, which is available in any component. The x and y velocities are just set to `0`, `1`, `-1` to indicate direction.

When we go to move the entity, we use the `Physical` component's `translate()` method, which moves the entity by a given x and y distance. To give the actual distance to move, the velocities are multiplied by `dt`, or delta-time. This is the amount of time, in ms, that have passed since the last frame. This is what allows objects to move smoothly over a variable framerate - e.g., whether your game runs at 30 frames a second or 60 frames a second, as long as you use delta-time as a factor in movement calculations, players will move the same distance over time. This is then multiplied by a `playerSpeed` factor that can be thought of as "pixels per millisecond." Our entity will move at `0.1` pixels per millisecond in the direction pushed, or `100` pixels a second.

If you reload the game, you'll see that you can move around the game world with the arrow keys. Great! Now we need something to defeat with our newfound mobility.

## Creating the enemy

We'll quickly throw in a big ol' enemy to fight. Underneath the player creation code in our `Game` component, we add another entity:

```typescript
class Game extends Component<null> {
  init() {
    // ... snip player creation code ...

    this.pearl.entities.add(
      new Entity({
        name: 'enemy',
        tags: ['enemy'],

        components: [
          new Physical({
            center: {
              x: 140,
              y: 260,
            },
          }),

          new BoxCollider({
            width: 40,
            height: 40,
          }),

          new BoxRenderer({
            fillStyle: 'red',
          }),
        ],
      })
    );
  }
}
```

This code should look familar, with only a few values changed from the player creation. One notable change is the addition of `tags` - these are strings that can be used to identify _types of entities_. In a traditional OOP game, you might use `instanceof` to determine what kind of object you're looking at - say, `entity instanceof Enemy` - but since here, all entities are merely instances of `Entity`, we use `tags` to distinguish them. You'll see this in use in the next section.

If you refresh, you'll see a big red box at the bottom of the screen, our new enemy. Currently, we can run right up to it - or through it - and laugh at it, since it currently has no way to fight back. Let's make it so that if you run into the enemy without a weapon, the enemy will, as expected, kill you.

## Adding collision detection

While Pearl includes several `Collider` components for various shapes, it doesn't automatically _do_ anything with them, unlike some fancier frameworks. This is partially so that you have control over handling and resolving collisions - since the way Pac-Man handles collisions is a heck of a lot different than how Mario would - but is also because I haven't come up with a good, magical collision API yet. It might get there eventually!

For now, we'll add collision detection inside the `Player` component. We need to check to see if the player has collided with the enemy, and if so, set the player to dead. Back in our player component, we add a new field to the player, and a new placeholder function for checking collisions:

```typescript
export default class Player extends Component<null> {
  playerSpeed = 0.1;
  isAlive = true;

  update(dt: number) {
    if (!this.isAlive) {
      return;
    }

    this.move(dt);
    this.checkCollisions();
  }

  private move(dt: number) { /* ... */ }

  private checkCollisions() {
    // TODO
  }
}
```

Now, we have a flag that determines whether the player is alive to dead. If they're dead, we'll early return from `update()` to prevent the player from moving, and to skip unnecessary collision detection.

Now, inside `checkCollisions()`, we just want to see if the player has collided with the enemy, and then set `isAlive` to false if they have:

```typescript
class Player extends Component<null> {
  /* ... */

  private checkCollisions() {
    const enemy = this.pearl.entities.all('enemy')[0];

    if (
      enemy
        .getComponent(BoxCollider)
        .isColliding(this.getComponent(BoxCollider))
    ) {
      this.isAlive = false;
    }
  }
}
```

A couple new APIs show up here. First off, we need to find the enemy entity. There are several ways for components to reference other entities, depending on your needs. For example, a component that is always associated with another entity could just have references set directly on the component. So here, we could have chosen to add `enemy` as a field on `Player`, and then set up the reference when creating our entities:

```typescript
class Game extends Component<null> {
  init() {
    const player = this.pearl.entities.add(new Entity(/* ... */));
    const enemy = this.pearl.entities.add(new Entity(/* ... */));
    player.enemy = enemy;
  }
}
```

However, what if we later wanted to add multiple enemies? Managing an array of enemies would be annoying, especially since we'd have to ensure the enemy is removed from the array when destroyed. In addition, if we later made it so enemies could spawn over time, or from other events in the game world, it might be annoying to look up the player every time.

In general, looking up entities from the game world is Fast Enough\(tm\) for most games. If you profile your game and find `entities.all()` becoming a bottleneck, you might want to add some level of caching - especially if you need to do some complex filtering beyond just looking at tags, such as "only get entities in a certain area of the world" - but using `entities.all()` is the easiest way to get started.

So, with entity lookup taken care of, we then use the `isColliding()` method of `BoxCollider`, which can check against another `BoxCollider`, to see if the entities are colliding. If they are, we just set the player to dead. Now, if you refresh the game, you should see the player rendered helplessly immobile after touching the enemy, presumedly because the enemy has eaten or stabbed or done something equally horrendous.

So now the player dies when they poke the evil enemy, and can no longer move or win the game. To emphasize this point, we'll add a _game over_ display.

## Creating a game over display

A simple UI will serve as a good introduction to canvas rendering in Pearl. Unlike `BoxRenderer`, Pearl currently doesn't have a drop-in component for displaying text content. That's okay, though, as it's very easy to add.

Any component can have a `render()` function on it. Traditionally, you'd probably make a new UI component that would probably live in a UI entity, or maybe be a sibling component of your main `Game` component. For simplicity's sake, we'll just add a `render()` method to our root `Game` component:

```typescript
class Game extends Component<null> {
  init() { /* ... */ }

  render(ctx: CanvasRenderingContext2D) {
  }
}
```

Canvas rendering is outside of the scope of this tutorial, but it's a simple, if maybe overly-naive, API to work with. In Pearl, you can think of rendering as somewhat _stateless_ - between every frame, the canvas is completely thrown away, and every component's render function is redrawn.

Now, canvas operations can be kind of expensive to do 60 times a second, but there are methods for caching/memoizing canvas rendering built into Pearl. For now, we'll just do the naive thing of rendering text on every frame.

To determine whether to render our game over text, we need to check to see if the player's still alive. To do so, we'll store the player entity as a reference on the class, and check it every frame.

```typescript
class Game extends Component<null> {
  playerEntity: Entity;

  init() {
    this.playerEntity = this.pearl.entities.add(new Entity(/* ... */));

    /* ... */
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.playerEntity.getComponent(Player).isAlive) {
      ctx.textAlign = 'center';
      ctx.font = '16px monospace';
      ctx.fillStyle = 'black';
      ctx.fillText('game over :(', 150, 150);
    }
  }
}
```

Now, if you run the game, you should see a nice game over message appear when you touch the enemy. Now the fun part: let's let the player win!

## Creating a sword

We've seen how to render boxes using `BoxRenderer`, and text using canvas drawing instructions. Now, for our sword, let's add a proper sword sprite, drawn by `SpriteRenderer`. The `SpriteRenderer` component simply renders a single sprite, while the `AnimationManager` can be used to add timed animations and multiple animation states to a component.

To load our image, in `assets/sword.png`, we'll use Webpack's `url-loader` (already pre-configured) and Pearl's built-in assets loader. To start, we add the assets we want to preload to a new `assets` field on `createGame()`:

```typescript
import { /* ... */, ImageAsset } from 'pearl';

createPearl({
  rootComponents: [new Game()],
  width: 300,
  height: 300,
  canvas: document.getElementById('canvas') as HTMLCanvasElement,
  assets: {
    swordImage: new ImageAsset(require('../assets/sword.png')),
  }
});
```

This will allow us to access the sword image (as an `HTMLImageElement`) using the `pearl.assets` API:

```typescript
// returns HTMLImageElement
this.pearl.assets.get(ImageAsset,  'swordImage');
```

{% hint style="info" %}
Note that the first argument is used to typecast the asset as well as to check its type _at runtime_. There is no static type safety on asset lookup!
{% endhint %}

We'll use this image to create a `Sprite`, which can be passed to a `SpriteRenderer` for rendering.

{% hint style="info" %}
We could also use an image to create a `SpriteSheet_` which can handle rendering multiple sprites from the same sheet.
{% endhint %}

Let's finally create the sword entity:

```typescript
class Game extends Component<null> {
  init() {
    /* ... */

    const swordImage = this.pearl.assets.get(ImageAsset,  'swordImage');

    const swordSprite = new Sprite(
      // sprite image
      swordImage,
      // offset x
      0,
      // offset y
      0,
      // sprite width
      swordImage.width,
      // sprite height
      swordImage.height
    );

    this.pearl.entities.add(
      new Entity({
        name: 'sword',
        tags: ['sword'],
        components: [
          new Physical({
            center: {
              x: 150,
              y: 150,
            },
          }),

          new BoxCollider({
            width: swordSprite.width,
            height: swordSprite.height,
          }),

          new SpriteRenderer({
            sprite: swordSprite,
          }),
        ],
      })
    );
  }
}
```

Now, if you refresh the game, you'll see our nice, definitely not stolen from a famous Nintendo game sword sprite, waiting to be picked up. Back in `Player`, we can add logic to check collision with the sword, and set a flag to indicate we picked it up:

```typescript
export default class Player extends Component<null> {
  /* ... */

  hasSword = false;

  private checkCollisions() {
    /* ... */

    if (!this.hasSword) {
      const sword = this.pearl.entities.all('sword')[0];

      if (
        sword
          .getComponent(BoxCollider)
          .isColliding(this.getComponent(BoxCollider))
      ) {
        this.hasSword = true;
      }
    }
  }
}
```

Great, except the sword's still left behind in the ground!

In a real game, the `sword` entity would likely have just represented a sword _pickup_, and once you've collected it, the entity would be removed from the world. However, since this is a tutorial and not a real game, this is a good time to show off one last feature of Pearl. We want to render the player _holding_ the sword, that is, the sword sprite moving along with the player. So let's add the sword as a _child entity_ of the player, and then set its position relative to the player's position:

```typescript
export default class Player extends Component<null> {
  /* ... */

  private checkCollisions() {
    /* ... */

    if (!this.hasSword) {
      const sword = this.pearl.entities.all('sword')[0];

      if (
        sword
          .getComponent(BoxCollider)
          .isColliding(this.getComponent(BoxCollider))
      ) {
        this.hasSword = true;

        this.entity.appendChild(sword);
        sword.getComponent(Physical).localCenter = {
          x: -5,
          y: 15,
        };
      }
    }
  }
}
```

Now, when we pick up the sword, we'll see it move along with us!

{% hint style="warning" %}
**TODO**: Eventually, I'd like child objects to render with their _angle_ relative to their parent's, not just their _position_. Once this is done, this would be a good time show off the sword also _rotating_ when the player turns \(though I'd also have to add some logic to set the player's angle... maybe this should all be done once player is also rendered by a sprite\).
{% endhint %}

## Slaying the enemy

There are only two pieces remaining now. When the player collides with the enemy, the enemy should be killed - that is, removed from the game world:

```typescript
export default class Player extends Component<null> {
  /* ... */

  private checkCollisions() {
    const enemy = this.pearl.entities.all('enemy')[0];

    if (
      // Note that sense the enemy can now be destroyed, we've added a check to
      // make sure it's present before checking collision against it, or else
      // it would error out!
      enemy &&
      enemy
        .getComponent(BoxCollider)
        .isColliding(this.getComponent(BoxCollider))
    ) {
      if (this.hasSword) {
        this.pearl.entities.destroy(enemy);
      } else {
        this.isAlive = false;
      }
    }

    /* ... */
  }
}
```

And the UI should be updated to show a nice "you win!" message:

```typescript
class Game extends Component<null> {
  init() {
    /* ... */

  render(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = 'center';
    ctx.font = '16px monospace';
    ctx.fillStyle = 'black';

    if (!this.playerEntity.getComponent(Player).isAlive) {
      ctx.fillText('game over :(', 150, 150);
    }

    if (this.pearl.entities.all('enemy').length === 0) {
      ctx.fillText('you win!', 150, 150);
    }
  }
}
```

All done!

## Exercises for the reader

* Can you make it so that the _sword_, not the player, has to collide with the enemy to defeat it? This should require creating a new component for either the sword or the enemy.
* Experiment with adding sprites for the player and enemy.
* The repo includes a second asset, `hit.wav`, meant to be played when the player hits the enemy with their sword. Use `AudioAsset` and the `pearl.audio` API to play it at the correct time.
