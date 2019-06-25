'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  plus(vector) {
    if (vector instanceof(Vector)) {
      return new Vector(this.x + vector.x, this.y + vector.y);
    } else {
      throw new Error('Можно прибавлять к вектору только вектор типа Vector');
    }
  }
  
  times(mult) {
    return new Vector(this.x * mult, this.y * mult);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!(pos instanceof Vector)) {
      throw new Error('Не объект типа Vector');
    } else if (!(size instanceof Vector)) {
      throw new Error('Не объект типа Vector');
    } else if (!(speed instanceof Vector)) {
      throw new Error('Не объект типа Vector');
    } else {
      this.pos = pos;
      this.size = size;
      this.speed = speed;
    }
  }
  
  get left() {
    return this.pos.x;
  }
  
  get right() {
    return this.pos.x + this.size.x;
  }
  
  get top() {
    return this.pos.y;
  }
  
  get bottom() {
    return this.pos.y + this.size.y;
  }
  
  act() {}
  
  get type() {
    return 'actor';
  }
  
  isIntersect(actorObj) {
    if (!(actorObj instanceof Actor)) {
      throw new Error('Передан не объект типа Actor');
    } else if (actorObj === this) {
      return false;
    }
    
    return actorObj.left < this.right && actorObj.right > this.left && actorObj.top < this.bottom && actorObj.bottom > this.top;
  }
}

class Level {
  constructor(grid, actors) {
    this.grid = grid; 
    this.actors = []; 
    this.height = 0;
    this.width = 0;
    this.player = null;

    if (actors !== undefined) {
      this.actors = actors;
      for (let actor of actors) {
        if (actor.type === 'player') {
          this.player = actor;
          break;
        }
      }
    }

    
    if (grid) {
      grid.forEach(row => this.width = (row.length > this.width ? row.length : this.width));
      this.height = grid.length;
    }

    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    if(this.status !== null && (this.finishDelay < 0)) {
      return true;
    } else {
      return false;
    }
  }

  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('Передан не объект типа Actor');
    }

    return this.actors.find(elems => actor.isIntersect(elems));
  }

  obstacleAt(pos, size) {
    let actor = new Actor(pos, size);


    if (actor.bottom > this.height) {
      return 'lava';
    }

    if (actor.left < 0 || actor.top < 0 || actor.right > this.width) {
      return 'wall';
    }

    for (let h = Math.floor(actor.left); h < actor.right; h++) {
      for (let v = Math.floor(actor.top); v < actor.bottom; v++) {
        if (this.grid[v][h] !== undefined) {
          return this.grid[v][h];
        }
      }
    }
  }

  removeActor(actor) {
    for (let obj in this.actors) {
      if (this.actors.hasOwnProperty(obj) && actor === this.actors[obj]) {
        this.actors.splice(obj, 1);
        return;
      }
    }
  }

  noMoreActors(type) {
    if (this.actors.length === 0) {
      return true;
    }

    for (let actor of this.actors) {
      if (actor.type === type) {
        return false;
      }
    }

    return true;
  }

  playerTouched(type, actor) {
    if (this.status !== null) {
      return;
    }

    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
      return;
    }

    if (type === 'coin' && actor instanceof Actor) {
      this.removeActor(actor);
      if(this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(actorsDict) {
    this.actorsDict = actorsDict;
  }

  actorFromSymbol(symbol) {
    if (symbol === undefined || this.actorsDict === undefined) {
      return undefined;
    }

    if (symbol in this.actorsDict) {
      return this.actorsDict[symbol];
    } else {
    return undefined;
    }
  }

  obstacleFromSymbol(symbol) {
    let result;
    switch (symbol) {
      case 'x':
        result = 'wall';
        break;
      case '!':
        result = 'lava';
        break;
      default:
        result = undefined;
        break;
    }

    return result;
  }

  createGrid(plan) {
    return plan.map(row => {
      return row.split('').map(cell => {
        return this.obstacleFromSymbol(cell);
      });
    });
  }

  createActors(plan) {
    return plan.reduce((result, row, y) => {
      row.split('').forEach((cell, x) => {
        let actor = this.actorFromSymbol(cell);
        if (typeof actor === 'function') {
          let obj = new actor(new Vector(x, y));
          if (obj instanceof Actor) {
            result.push(obj);
          }
        }
      });
      return result;
    }, []);
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos, speed) {
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }
  handleObstacle() {
    this.speed.x *= -1;
    this.speed.y *= -1;
  }

  act(time, level) {
    let nextPosition = this.getNextPosition(time);
    if(level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 3));
    this.originalPosition = pos;
  }

  handleObstacle() {
    this.pos.x = this.originalPosition.x;
    this.pos.y = this.originalPosition.y;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    if (!(pos instanceof Vector)) {
      throw new Error('Положение должно быть типа Vector');
    }

    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.firstPosition = this.pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.spring += this.springSpeed * time;
    return this.firstPosition.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball
};

const parser = new LevelParser(actorDict);

loadLevels().then(levelsStr => {
  const levels = JSON.parse(levelsStr);
  return runGame(levels, parser, DOMDisplay);
}).then(() => {});
