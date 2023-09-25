'use strict';

const WorldNames = Object.freeze({
   Initial:Symbol(),
   TempTest:Symbol(),
   Pool:Symbol(),
   ShapeFun:Symbol(),
   Brownian:Symbol(),
   Convection:Symbol(),
   Strings:Symbol(),
});

function loadWorld(name, world={}) {
   clearWorld(world);

   Math.seedrandom(0);

   function createButton(func, params) {
      let buttonArea = document.getElementById('part-sim-button-area');
      let button = document.createElement('button');
      let state = {};
      func(button, state, params);
      button.addEventListener('click', function(evt) {func(button, state, params);});
      buttonArea.appendChild(button);
   }

   function buttonMouseProj(button, state, params) {
      if (Object.keys(state).length == 0) {
         state.initialized = true;
      } else {
         world.doMouseProj = !world.doMouseProj;
      }
      let status = 'Disabled';
      if (world.doMouseProj) status = 'Enabled'
      button.innerText = 'Mouse Projection: ' + status;
   }
   function buttonGravity(button, state, params) {
      if (Object.keys(state).length == 0) {
         state.options = [world.gravity].concat(params.options);
         state.optionInd = 0;
      } else {
         state.optionInd += 1;
         state.optionInd %= state.options.length;
      }
      world.gravity = state.options[state.optionInd];
      button.innerText = 'Gravity Strength: ' + world.gravity;
   }

   createButton(buttonMouseProj);

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


   } else if (name == WorldNames.ShapeFun) {

      let colors = ['hsl(0,50%,50%)', 'hsl(30,50%,50%)', 'hsl(60,50%,50%)', 'hsl(120,30%,50%)', 'hsl(240,50%,50%)', 'hsl(280,40%,50%)'];
      let radii = [20, 16, 13, 10, 8, 6];
      for (let i=0; i<6; i++) {
         let atomCount = 2000 / radii[i]**2;
         for (let a=0; a<atomCount; a++) {
            let newAtom = new Atom({x:0,y:0}, {x:0,y:0}, radii[i], colors[i]);
            let offset = {x: 550 * (i%3), y: 550 * Math.floor(i/3)};
            newAtom.randomizePos({x:-750+offset.x, y:-450+offset.y}, {x:-350+offset.x,y:-100+offset.y});
            let speed = 2;
            newAtom.randomizeVel({x:-speed,y:-speed}, {x:speed,y:speed});
            world.atoms.push(newAtom);
         }
      }

      let blockParams = {tempCondCoef:0};
      world.blocks.push(new Block([[-800,-500], [800,-500], [800,-490], [-800,-490]], blockParams));
      world.blocks.push(new Block([[-800,490], [800,490], [800,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[-800,-500], [-790,-500], [-790,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[790,-500], [800,-500], [800,500], [790,500]], blockParams));
      world.blocks.push(new Block([[-100,-200], [200,0], [200,300], [-100,300]], Object.assign(blockParams,{color:'hsl(0,0%,20%)'})));
      world.blocks.push(new Block([[-400,-100], [350,-100], [350,-50], [340,-90], [-350,-50], [-300,400]], Object.assign(blockParams,{color:'hsl(0,0%,30%)'})));

      world.gravity = 0.0;

      createButton(buttonGravity, {options:0.01});


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
      createButton(buttonGravity, {options:0.1});


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
      createButton(buttonGravity, {options:[0, -0.1]});
      createButton(function (button, state, params) {
         if (Object.keys(state).length == 0) {
            state.enabled = true;
            state.initProps = [];
            for (let b of world.blocks) state.initProps.push({tempCondCoef:b.tempCondCoef, color:b.color});
         } else {
            state.enabled = !state.enabled;
         }
         let status = 'Disabled';
         for (let b in world.blocks) {
            if (state.enabled) {
               status = 'Enabled';
               world.blocks[b].tempCondCoef = state.initProps[b].tempCondCoef;
               world.blocks[b].color = state.initProps[b].color;
            } else {
               world.blocks[b].tempCondCoef = 0;
               world.blocks[b].color = 'gray';
            }
         }
         button.innerText = 'Thermal Conduction: ' + status;
      });


   } else if (name == WorldNames.Strings) {
      let radius = 12;
      let atomCount = 60;
      for (let i=-atomCount/2; i<atomCount/2; i++) world.atoms.push(new Atom({x:(i + 0.5)*radius*2 ,y:-250+i*.5}, {x:0,y:0}, radius, 'hsl(200,50%,50%)'));
      for (let i=-atomCount/2; i<atomCount/2; i++) world.atoms.push(new Atom({x:(i + 0.5)*radius*2 ,y:-350-i*.5}, {x:0,y:0}, radius, 'hsl(240,50%,50%)'));
      for (let i=-atomCount/2; i<atomCount/2; i++) world.atoms.push(new Atom({x:(i + 0.5)*radius*2 ,y:-450+i*.5}, {x:0,y:0}, radius, 'hsl(280,50%,50%)'));
      for (let i=0; i<200; i++) {
         let newAtom = new Atom({x:0,y:0}, {x:0,y:0}, 5, 'green');
         newAtom.randomizePos({x:-750,y:0}, {x:750,y:480});
         newAtom.randomizeVel({x:-5,y:-5}, {x:5,y:5});
         world.atoms.push(newAtom);
      }

      let bondParams = {maxDist:20};
      for (let i=0; i<atomCount-1; i++) {
         world.bonds.push(new Bond(world.atoms[i], world.atoms[i+1], bondParams));
         world.bonds.push(new Bond(world.atoms[i+atomCount], world.atoms[i+atomCount+1], bondParams));
         world.bonds.push(new Bond(world.atoms[i+2*atomCount], world.atoms[i+2*atomCount+1], bondParams));
      }

      let blockParams = {temp:1000};
      world.blocks.push(new Block([[-800,-500], [800,-500], [800,-490], [-800,-490]], blockParams));
      world.blocks.push(new Block([[-800,490], [800,490], [800,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[-800,-500], [-790,-500], [-790,500], [-800,500]], blockParams));
      world.blocks.push(new Block([[790,-500], [800,-500], [800,500], [790,500]], blockParams));
      world.blocks.push(new Block([[0,-50], [20,50], [-20,50]], blockParams));
      world.blocks.push(new Block([[300,50], [320,150], [280,150]], blockParams));
      world.blocks.push(new Block([[-300,150], [-280,250], [-320,250]], blockParams));

      world.gravity = 0.1;
      createButton(buttonGravity, {options:0});


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
   world.doMouseProj = true;
   if ('frameRequest' in world) cancelAnimationFrame(world.frameRequest);

   let buttonArea = document.getElementById('part-sim-button-area');
   if (buttonArea != null) buttonArea.remove();
   buttonArea = document.createElement('div');
   buttonArea.id = 'part-sim-button-area';
   document.getElementById('part-sim-wrapper').appendChild(buttonArea);

}
