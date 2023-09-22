'use strict';

const WorldNames = Object.freeze({
   Initial:Symbol(),
   TempTest:Symbol(),
});

function loadWorld(name, world={}) {
   clearWorld(world);

   Math.seedrandom(0);

   if (name == WorldNames.Initial) {
      for (let i=0; i<100; i++) {
         let newAtom = new Atom({x:i*10-460,y:80}, {x:0,y:0}, 20, '#FF0000');
         newAtom.randomizePos({x:-450,y:-290}, {x:-30,y:290});
         newAtom.randomizeVel({x:-10,y:-10}, {x:10,y:10});
         world.atoms.push(newAtom);
      }
      for (let i=0; i<500; i++) {
         let newAtom = new Atom({x:i*10-460,y:80}, {x:0,y:0}, 5, '#AAAA00');
         newAtom.randomizePos({x:30,y:-290}, {x:450,y:290});
         newAtom.randomizeVel({x:-5,y:-5}, {x:5,y:5});
         world.atoms.push(newAtom);
      }

      world.blocks.push(new Block([[-800,-500], [800,-500], [800,-490], [-800,-490]], 0, '#000000'));
      world.blocks.push(new Block([[-800,490], [800,490], [800,500], [-800,500]], 0, '#000000'));
      world.blocks.push(new Block([[-800,-500], [-790,-500], [-790,500], [-800,500]], 0, '#000000'));
      world.blocks.push(new Block([[790,-500], [800,-500], [800,500], [790,500]], 0, '#000000'));
      world.blocks.push(new Block([[-5,-500], [5,-500], [5,500], [-5,500]], 0, '#000000'));

   } else if (name == WorldNames.TempTest) {
      for (let i=0; i<100; i++) {
         let newAtom = new Atom({x:0,y:0}, {x:0,y:0}, 15, '#FF0000');
         newAtom.randomizePos({x:-750,y:-480}, {x:750,y:-400});
         newAtom.randomizeVel({x:-1,y:0}, {x:1,y:0});
         world.atoms.push(newAtom);
      }

      world.blocks.push(new Block([[-800,-500], [800,-500], [800,-490], [-800,-490]], 0, '#000000'));
      world.blocks.push(new Block([[-800,490], [800,490], [800,500], [-800,500]], 0, '#000000'));
      world.blocks.push(new Block([[-800,-500], [-790,-500], [-790,500], [-800,500]], 0, '#000000'));
      world.blocks.push(new Block([[790,-500], [800,-500], [800,500], [790,500]], 0, '#000000'));
      world.blocks.push(new Block([[-600,-5], [600,-5], [600,5], [-600,5]], 0, '#000000'));

   }

   // Initialize atom-to-atom stats structure
   for (let i in world.atoms) {
      world.atom2atom.push([])
      for (let j in world.atoms) {
         world.atom2atom[i].push(0);
      }
   }

   world.updateTimer = setInterval(update, 33);

   return world;

}

function clearWorld(world) {
   world.atoms = [];
   world.bonds = [];
   world.blocks = [];
   world.atom2atom = [];
   world.envMomentum = [0,0];
   world.frameNumber = 0;
   world.view = {offset:{x:0, y:0}, zoom: 1}; // Offset is in world coordinates
   if ('updateTimer' in world) clearInterval(world.updateTimer);

}
