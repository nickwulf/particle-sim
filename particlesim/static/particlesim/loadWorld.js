'use strict';

const WorldNames = Object.freeze({
   Initial:Symbol(),
   TempTest:Symbol(),
   Pool:Symbol(),
   Brownian:Symbol(),
   Convection:Symbol(),
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

      let tempCondCoef = 1;
      world.blocks.push(new Block([[-800,-500], [800,-500], [800,-490], [-800,-490]], 0, '#000000'));
      world.blocks.push(new Block([[-800,490], [800,490], [800,500], [-800,500]], 0, '#000000'));
      world.blocks.push(new Block([[-800,-500], [-790,-500], [-790,500], [-800,500]], 0, '#000000'));
      world.blocks.push(new Block([[790,-500], [800,-500], [800,500], [790,500]], 0, '#000000'));
      world.blocks.push(new Block([[-5,-500], [5,-500], [5,500], [-5,500]], 0, '#000000'));


   } else if (name == WorldNames.TempTest) {
      for (let i=0; i<50; i++) {
         let newAtom = new Atom({x:0,y:0}, {x:0,y:0}, 15, '#FF0000');
         newAtom.randomizePos({x:-750,y:-480}, {x:750,y:-400});
         newAtom.randomizeVel({x:-1,y:0}, {x:1,y:10});
         world.atoms.push(newAtom);
      }
      for (let i=0; i<450; i++) {
         let newAtom = new Atom({x:0,y:0}, {x:0,y:0}, 4, '#AAAA00');
         newAtom.randomizePos({x:-750,y:-480}, {x:750,y:-400});
         newAtom.randomizeVel({x:-1,y:0}, {x:1,y:10});
         world.atoms.push(newAtom);
      }

      let blockParams = {temp:10000, tempCondCoef:0.5};
      world.blocks.push(new Block([[-800,-500], [800,-500], [800,-490], [-800,-490]], blockParams));
      world.blocks.push(new Block([[-800,490], [800,490], [800,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[-800,-500], [-790,-500], [-790,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[790,-500], [800,-500], [800,500], [790,500]], blockParams));
      world.blocks.push(new Block([[0,-50], [600,50], [-600,50]], blockParams));

      world.gravity = 0.0;


   } else if (name == WorldNames.Pool) {
      let radius = 25;
      let spacer = radius * 1.02;
      let posCenter = {x:500, y:0};
      let ballInd = 0;
      let colorList = ['hsl(0,0%,100%)', 'hsl(60,60%,50%)', 'hsl(240,100%,50%)', 'hsl(0,100%,50%)', 'hsl(280,100%,50%)', 'hsl(30,100%,50%)', 'hsl(120,100%,30%)', 'hsl(30,60%,40%)', 'black', 'hsl(60,60%,65%)', 'hsl(240,100%,70%)', 'hsl(0,100%,70%)', 'hsl(280,100%,70%)', 'hsl(30,100%,60%)', 'hsl(120,100%,40%)', 'hsl(30,60%,50%)']
      let ballOrder = [1, 9, 10, 2, 8, 3, 11, 12, 4, 13, 5, 14, 6, 15, 7];
      for (let x=0; x<5; x++) {
         for (let y=0; y<x+1; y++) {
            let posNew = {...posCenter};
            posNew.x += (x-2) * spacer * Math.sqrt(3);
            posNew.y += 2 * y * spacer - (x * spacer);
            world.atoms.push(new Atom(posNew, {x:0,y:0}, radius, colorList[ballOrder[ballInd]]));
            ballInd++;
         }
      }
      world.atoms.push(new Atom({x:-700, y:-400}, {x:20,y:1.99}, radius, colorList[0]));

      let blockParams = {tempCondCoef:0, color:'green'};
      world.blocks.push(new Block([[-800,-500], [800,-500], [800,-490], [-800,-490]], blockParams));
      world.blocks.push(new Block([[-800,490], [800,490], [800,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[-800,-500], [-790,-500], [-790,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[790,-500], [800,-500], [800,500], [790,500]], blockParams));

      world.gravity = 0.0;


   } else if (name == WorldNames.Brownian) {
      for (let i=0; i<50; i++) {
         let newAtom = new Atom({x:0,y:0}, {x:0,y:0}, 20, 'brown');
         newAtom.randomizePos({x:-750,y:-480}, {x:-20,y:480});
         newAtom.randomizeVel({x:-20,y:-20}, {x:20,y:20});
         world.atoms.push(newAtom);
      }
      for (let i=0; i<1000; i++) {
         let newAtom = new Atom({x:0,y:0}, {x:0,y:0}, 4, 'orange');
         newAtom.randomizePos({x:20,y:-480}, {x:750,y:480});
         // newAtom.randomizeVel({x:-40,y:-40}, {x:40,y:40});
         world.atoms.push(newAtom);
      }

      let blockParams = {tempCondCoef:0};
      world.blocks.push(new Block([[-800,-500], [800,-500], [800,-490], [-800,-490]], blockParams));
      world.blocks.push(new Block([[-800,490], [800,490], [800,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[-800,-500], [-790,-500], [-790,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[790,-500], [800,-500], [800,500], [790,500]], blockParams));

      world.gravity = 0.0;


   } else if (name == WorldNames.Convection) {
      for (let i=0; i<500; i++) {
         let newAtom = new Atom({x:0,y:0}, {x:0,y:0}, 12, 'purple');
         newAtom.randomizePos({x:-750,y:-480}, {x:750,y:480});
         newAtom.randomizeVel({x:-5,y:-5}, {x:5,y:5});
         world.atoms.push(newAtom);
      }

      let blockParams = {temp:0, color:'blue'};
      world.blocks.push(new Block([[-800,-500], [0,-500], [0,-490], [-800,-490]], blockParams));
      world.blocks.push(new Block([[-800,-500], [-790,-500], [-790,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[-800,490], [0,490], [0,500], [-800,500]], blockParams));
      blockParams = {temp:20000, color:'red'};
      world.blocks.push(new Block([[0,-500], [800,-500], [800,-490], [0,-490]], blockParams));
      world.blocks.push(new Block([[790,-500], [800,-500], [800,500], [790,500]], blockParams));
      world.blocks.push(new Block([[0,490], [800,490], [800,500], [0,500]], blockParams));
      blockParams = {tempCondCoef:0, color:'gray'};
      world.blocks.push(new Block([[-300,-300], [300,-300], [300,300], [-300,300]], blockParams));

      world.gravity = 0.1;
   }

   // Initialize atom-to-atom stats structure
   for (let i in world.atoms) {
      world.atom2atom.push([])
      for (let j in world.atoms) {
         world.atom2atom[i].push(0);
      }
   }

   world.frameRequest = window.requestAnimationFrame(update);

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
   world.gravity = 0.02;
   if ('frameRequest' in world) cancelAnimationFrame(world.frameRequest);

}
