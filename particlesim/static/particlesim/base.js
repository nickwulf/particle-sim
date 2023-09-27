'use strict'

class Atom {
   pos;
   vel;
   radius;
   mass;
   bonds;
   pals;
   color;
   push;

   constructor(pos, vel, radius, color) {
      this.pos = {x:pos.x, y:pos.y};
      this.vel = {x:vel.x, y:vel.y};
      this.radius = radius;
      this.mass = radius**2;
      this.bonds = [];
      this.pals = [];
      this.color = color;
      this.push = {x:0, y:0};
   }

   draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(...toArray(viewTransWorldToDraw(this.pos)), viewScaleWorldToDraw(this.radius), 0, Math.PI*2);
      ctx.fill();
   }

   randomizePos(minPos, maxPos) {
      this.pos = {x:Math.random()*(maxPos.x-minPos.x) + minPos.x, y:Math.random()*(maxPos.y-minPos.y) + minPos.y};
   }

   randomizeVel(minVel, maxVel) {
      this.vel = {x:Math.random()*(maxVel.x-minVel.x) + minVel.x, y:Math.random()*(maxVel.y-minVel.y) + minVel.y};
   }

   testAtomCollision(other) {
      let posDelta = {x:this.pos.x-other.pos.x, y:this.pos.y-other.pos.y}
      let dist = Math.sqrt(squareMag(posDelta));
      if (dist <= this.radius + other.radius) return true;
      return false;
   }
}

class Bond {
   atom1;
   atom2;
   broken;
   maxDist;

   constructor(atom1, atom2, params) {
      let paramsDefaults = {maxDist:8};
      for (let p in paramsDefaults) {
         if (p in params) this[p] = params[p];
         else this[p] = paramsDefaults[p];
      }
      this.atom1 = atom1;
      this.atom2 = atom2;
      atom1.bonds.push(this);
      atom1.pals.push(atom2);
      atom2.bonds.push(this);
      atom2.pals.push(atom1);
      this.broken = false;
   }

   draw() {
      ctx.beginPath();
      ctx.moveTo(...toArray(viewTransWorldToDraw(this.atom1.pos)));
      ctx.lineTo(...toArray(viewTransWorldToDraw(this.atom2.pos)));
      ctx.stroke();
   }

   forceAtoms() {
      let posDiff = {x:this.atom1.pos.x-this.atom2.pos.x, y:this.atom1.pos.y-this.atom2.pos.y};
      let dist = Math.sqrt(squareMag(posDiff));
      let displacement = dist - this.atom1.radius - this.atom2.radius;
      if (displacement > this.maxDist) {
         this.break();
         return
      }
      let displaceSign = 1;
      if (displacement < 0) displaceSign *= -1;
      displacement = displacement * Math.abs(displacement);
      let tangent = {x:posDiff.x/dist, y:posDiff.y/dist};
      let k = 5;
      this.atom1.vel.x -= k / this.atom1.mass * displacement * tangent.x;
      this.atom1.vel.y -= k / this.atom1.mass * displacement * tangent.y;
      this.atom2.vel.x += k / this.atom2.mass * displacement * tangent.x;
      this.atom2.vel.y += k / this.atom2.mass * displacement * tangent.y;
   }

   break() {
      let index = this.atom1.bonds.indexOf(this);
      this.atom1.bonds.splice(index,1);
      this.atom1.pals.splice(index,1);
      this.atom1 = null;
      index = this.atom2.bonds.indexOf(this);
      this.atom2.bonds.splice(index,1);
      this.atom2.pals.splice(index,1);
      this.atom2 = null;
      this.broken = true;
   }
}

class Block {
   pts;
   minPos;
   maxPos;
   norms;
   temp;
   tempCondCoef;
   color;

   constructor(pts, params) {
      // Temperature coeficient controls amount of energy matching for colliding particles. 1 means colliding particles completely match block temp. 0.5 is probably highest realistic value
      let paramsDefaults = {temp:1000, tempCondCoef:0.5, color:'black'};
      for (let p in paramsDefaults) {
         if (p in params) this[p] = params[p];
         else this[p] = paramsDefaults[p];
      }
      this.pts = [];
      this.minPos = {x:pts[0][0], y:pts[0][1]};
      this.maxPos = {x:pts[0][0], y:pts[0][1]};
      for (let p of pts) {
         this.pts.push({x:p[0], y:p[1]});
         if (p[0] < this.minPos.x) this.minPos.x = p[0];
         if (p[1] < this.minPos.y) this.minPos.y = p[1];
         if (p[0] > this.maxPos.x) this.maxPos.x = p[0];
         if (p[1] > this.maxPos.y) this.maxPos.y = p[1];
      }
      this.pts.push({...this.pts[0]});
      this.norms = [];
      for (let i=0; i<this.pts.length-1; i++) {
         let diff = {x:this.pts[i+1].x-this.pts[i].x, y:this.pts[i+1].y-this.pts[i].y};
         let dist = Math.sqrt(diff.x**2 + diff.y**2);
         let dir = {x:diff.x/dist, y:diff.y/dist};
         this.norms.push({x:dir.y, y:-dir.x});
      }
   }

   collision(atom, progress, avoidId) {
      let result = {t:Infinity, collidePos:null, wallNorm:null, wallInd:null, newVel:null, newPos:null};
      let p = {x:atom.pos.x - atom.vel.x*progress, y:atom.pos.y - atom.vel.y*progress};
      let r = atom.vel;
      if ((p.x+atom.radius<this.minPos.x) && (atom.pos.x+atom.radius<this.minPos.x)) return result;
      if ((p.x-atom.radius>this.maxPos.x) && (atom.pos.x-atom.radius>this.maxPos.x)) return result;
      if ((p.y+atom.radius<this.minPos.y) && (atom.pos.y+atom.radius<this.minPos.y)) return result;
      if ((p.y-atom.radius>this.maxPos.y) && (atom.pos.y-atom.radius>this.maxPos.y)) return result;

      // Test each of the walls
      for (let i=0; i<this.pts.length-1; i++) {
         if (i == avoidId) continue;

         // Line segment collision based on http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
         // p is atom pos minus vel, r is atom vel, q is 1st wall point (pushed out by radius in direction of normal), s is 2nd wall point minus 1st (also pushed out)
         let q = {x:this.pts[i].x+(atom.radius*this.norms[i].x), y:this.pts[i].y+(atom.radius*this.norms[i].y)};
         let s = {x:this.pts[i+1].x - this.pts[i].x, y:this.pts[i+1].y - this.pts[i].y};
         let qMinusP = {x:q.x-p.x, y:q.y-p.y};
         let tNum = (qMinusP.x * s.y) - (qMinusP.y * s.x);
         let uNum = (qMinusP.x * r.y) - (qMinusP.y * r.x);
         let rCrossS = (r.x * s.y) - (r.y * s.x);
         if (rCrossS != 0) { // This fails when r is parallel to s
            let t = tNum / rCrossS; // t is relative distance along r
            let u = uNum / rCrossS; // u is relative distance along s
            if ((t>=0 && t<=progress) && (u>=0 && u<=1) && t<result.t) {
               let collidePos = {x:t*r.x+p.x, y:t*r.y+p.y};
               result = {t:t, collidePos:collidePos, wallNorm:this.norms[i], wallInd:i, newVel:null, newPos:null};
            }
         }

         // Test if p is in between pushed out wall and wall itself by projecting (p-q) onto s
         let sDotS = squareMag(s);
         let pMinusQDotS = -qMinusP.x*s.x - qMinusP.y*s.y;
         let u2 = pMinusQDotS / sDotS;
         if (u2>=0 && u2<=1) { // Occurs when atom is inside of wall edges
            let projPos = {x:s.x*u2+q.x, y:s.y*u2+q.y}; // The atom's projected position onto the wall
            let projDiff = {x:projPos.x-p.x, y:projPos.y-p.y};
            let projDist = Math.sqrt(squareMag(projDiff));
            let projDotNorm = projDiff.x*this.norms[i].x + projDiff.y*this.norms[i].y;
            if (projDist <= atom.radius && projDotNorm >= 0) {
               result = {t:0, collidePos:projPos, wallNorm:this.norms[i], wallInd:i, newVel:null, newPos:null};
            }
         }
      }

      // Test each of the points
      for (let i=0; i<this.pts.length-1; i++) {
         if (i+this.pts.length-1 == avoidId) continue;

         // If point is inverted then skip
         let normLeft = this.norms[this.norms.length-1];
         if (i > 0) normLeft = this.norms[i-1];
         if ((normLeft.x*this.norms[i].y - normLeft.y*this.norms[i].x) <= 0 ) continue;

         // Test if atom point vector intersects with circle of atom.radius centered around each point
         // I.e., find when ((r*t+p)-c)^2 = atom.radius^2 or when r.r*t^2 + 2r.(p-c)*t + ((p-c)^2-radius^2) = 0, where c is circle center
         let pMinusC = {x:p.x-this.pts[i].x, y:p.y-this.pts[i].y};
         let a = squareMag(r);
         let b = 2 * (r.x*pMinusC.x + r.y*pMinusC.y);
         let c = squareMag(pMinusC) - atom.radius**2;
         let ans = solveQuadratic(a,b,c);
         if (ans[0] != null) {
            for (let j=0; j<2; j++) {
               let t = ans[j];
               if (t>=0 && t<=progress && t<result.t) {
                  let collidePos = {x:t*r.x+p.x, y:t*r.y+p.y};
                  let norm = {x:(collidePos.x-this.pts[i].x)/atom.radius, y:(collidePos.y-this.pts[i].y)/atom.radius};
                  let normLeft = this.norms[this.norms.length-1];
                  if (i > 0) normLeft = this.norms[i-1];
                  if (((normLeft.x*norm.y)-(normLeft.y*norm.x) > 0) && ((this.norms[i].x*norm.y)-(this.norms[i].y*norm.x) < 0)) {
                     result = {t:t, collidePos:collidePos, wallNorm:norm, wallInd:i+this.pts.length-1, newVel:null, newPos:null};
                  }
               }
            }
         }

         // Test if atom starts within a radius of the point
         let pDist = Math.sqrt(squareMag(pMinusC));
         if (pDist<=atom.radius && result.t>0) {
            let norm = {x:pMinusC.x/pDist, y:pMinusC.y/pDist};
            let collidePos = {x:atom.radius*norm.x+this.pts[i].x, y:atom.radius*norm.y+this.pts[i].y}
            if (((normLeft.x*norm.y)-(normLeft.y*norm.x) > 0) && ((this.norms[i].x*norm.y)-(this.norms[i].y*norm.x) < 0)) {
               result = {t:0, collidePos:collidePos, wallNorm:norm, wallInd:i+this.pts.length-1, newVel:null, newPos:null};
            }
         }
      }

      if (result.t <= progress) {
         let rDotNorm = r.x*result.wallNorm.x + r.y*result.wallNorm.y;
         if (rDotNorm < 0) { // If the atom is traveling towards outside then don't worry about it
            // Change energy of atom in norm direction to make it more closely match block energy/temp
            let energy = 0.5 * atom.mass * squareMag(r);
            let energyNorm = 0.5 * atom.mass * rDotNorm**2;
            let energyTarget = this.temp * (1 + 0.2*(1 - 2*Math.random()));
            // energyTarget = this.temp;
            let energyAdd = (energyTarget - energy) * this.tempCondCoef * Math.sqrt(energyNorm / energy);

            // if (energyAdd < 0) energyAdd /= 2.5;

            let energyNormNew = Math.max(0, energyNorm + energyAdd);

            let rDotNormNew = Math.sqrt(energyNormNew / atom.mass * 2);
            let rDotNormDelta = rDotNormNew - rDotNorm;
            result.newVel = {x:r.x + rDotNormDelta*result.wallNorm.x, y:r.y + rDotNormDelta*result.wallNorm.y};
            result.newPos = {...result.collidePos};
            result.newPos.x += (progress - result.t) * result.newVel.x;
            result.newPos.y += (progress - result.t) * result.newVel.y;


         } else {
            result = {t:Infinity, collidePos:null, wallNorm:null, wallInd:null, newVel:null, newPos:null};
         }
      } else {
         result = {t:Infinity, collidePos:null, wallNorm:null, wallInd:null, newVel:null, newPos:null};
      }
      return result;
   }

   draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(...toArray(viewTransWorldToDraw(this.pts[0])));
      for (let i=1; i<this.pts.length-1; i++) ctx.lineTo(...toArray(viewTransWorldToDraw(this.pts[i])));
      ctx.closePath();
      ctx.fill();
   }
}

class PerformanceTimer {
   steps;
   queue;
   startTime;

   constructor(steps) {
      this.steps = steps;
      this.queue = [];
      this.startTime = null;
   }

   start() {
      let nowDate = new Date();
      this.startTime = nowDate.getTime();
   }

   end() {
      let nowDate = new Date();
      if (this.startTime == null) return;
      this.queue.push(nowDate.getTime() - this.startTime);
      if (this.queue.length > this.steps) this.queue.shift();
      this.startTime = null;
   }

   getAverage() {
      let total = 0;
      for (let q of this.queue) total += q;
      return total / this.queue.length;
   }
}


var canvas = null;
var ctx = null;
var timers = {frame:null, update:null, atomOnAtom:null, draw:null};
var mouse = {pos:null, posClick:null};
var viewDesiredDims = {width:1600, height:1000};
var world = {};

document.addEventListener('DOMContentLoaded', function() {
   canvas = document.getElementById('part-sim-canvas');
   canvas.width = viewDesiredDims.width;
   canvas.height = viewDesiredDims.height;
   ctx = canvas.getContext('2d');

   timers.frame = new PerformanceTimer(100);
   timers.update = new PerformanceTimer(100);
   timers.atomOnAtom = new PerformanceTimer(100);
   timers.draw = new PerformanceTimer(100);

   mouse.pos = {x:0, y:0};
   mouse.posClick = {...mouse.pos};

   function moveEvent(evt) {
      let rect = canvas.getBoundingClientRect();
      let movePos = {};
      if (evt instanceof TouchEvent) {
         movePos = {x:evt.touches[0].clientX, y:evt.touches[0].clientY};
      } else {
         movePos = {x:evt.clientX, y:evt.clientY};
      }
      mouse.pos = {};
      mouse.pos.x = (movePos.x - rect.left) / rect.width * canvas.width - canvas.width/2;
      mouse.pos.y = (movePos.y - rect.top) / rect.height * canvas.height - canvas.height/2;
   }
   window.addEventListener('mousemove', moveEvent);
   window.addEventListener('touchmove', moveEvent);
   canvas.onclick = function() {
      mouse.posClick = {...mouse.pos};
   };
   canvas.addEventListener('touchmove', function(evt) {
      moveEvent(evt);
      evt.preventDefault();
      evt.stopPropagation();
      return false;
   });

});


function update() {
   world.frameNumber ++;
   timers.frame.end();
   timers.frame.start();
   timers.update.start();
   let energy = 0;
   for (let a of world.atoms) {
      a.vel.y += world.gravity;
      // energy += -.01 * a.mass * a.pos.y;
   }

   // Apply force from bonds on respective atoms and clean up any broken bonds
   for (let b=0; b<world.bonds.length; b++) {
      world.bonds[b].forceAtoms();
      if (world.bonds[b].broken) {
         world.bonds.splice(b,1);
         b--;
      }
   }

   // Apply forces from atom-to-atom interactions (i.e. collisions and anti-meld push, not bonds)
   timers.atomOnAtom.start();
   impactAtomsOnAtoms(world.atoms, world.atom2atom);
   // pushAtomsOnAtoms(world.atoms, world.atom2atom);
   timers.atomOnAtom.end();

   // Apply atom velocities
   for (let a of world.atoms) {
      a.pos.x += a.vel.x;
      a.pos.y += a.vel.y;
   }

   // Apply forces/richochets from blocks to atoms
   for (let a of world.atoms) {
      impactAtomOnBlocks(a, world.blocks);
   }

   // Calculate statistics for monitoring/debug
   let momentum = [0,0];
   momentum[0] += world.envMomentum[0];
   momentum[1] += world.envMomentum[1];
   for (let a of world.atoms) {
      energy += 0.5 * a.mass * (a.vel.x**2 + a.vel.y**2);
      momentum[0] += a.mass * a.vel.x;
      momentum[1] += a.mass * a.vel.y;
   }

   // Completely clear the drawing area in preparation for new frame
   timers.draw.start();
   ctx.clearRect(0, 0, canvas.width, canvas.height);

   // Redraw objects in the world
   for (let b of world.blocks) b.draw();
   for (let b of world.bonds) b.draw();
   for (let a of world.atoms) a.draw();

   // Draw theoretical ball launched via mouse
   if (world.doMouseProj) {
      let cursorRadius = 30;
      let launchMult = 4;
      let tSteps = 100;
      let mouseDelta = {x:mouse.pos.x - mouse.posClick.x, y:mouse.pos.y - mouse.posClick.y};
      let mouseDist = Math.sqrt(squareMag(mouseDelta));
      let mouseDir = {x:mouseDelta.x/mouseDist, y:mouseDelta.y/mouseDist};
      let mouseNorm = {x:-mouseDir.y, y:mouseDir.x};
      let mouseOffset = {x:mouseNorm.x*cursorRadius, y:mouseNorm.y*cursorRadius};
      ctx.strokeStyle = 'blue';
      ctx.beginPath();
      ctx.moveTo(...toArray(viewTransWorldToDraw({x:mouse.pos.x+mouseOffset.x, y:mouse.pos.y+mouseOffset.y})));
      ctx.lineTo(...toArray(viewTransWorldToDraw({x:mouse.posClick.x+mouseOffset.x, y:mouse.posClick.y+mouseOffset.y})));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(...toArray(viewTransWorldToDraw({x:mouse.pos.x-mouseOffset.x, y:mouse.pos.y-mouseOffset.y})));
      ctx.lineTo(...toArray(viewTransWorldToDraw({x:mouse.posClick.x-mouseOffset.x, y:mouse.posClick.y-mouseOffset.y})));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(...toArray(viewTransWorldToDraw(mouse.pos)), viewScaleWorldToDraw(cursorRadius), 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(...toArray(viewTransWorldToDraw(mouse.posClick)), viewScaleWorldToDraw(cursorRadius), 0, Math.PI*2);
      ctx.stroke();

      let mouseAtomVel = {x:mouseDelta.x*launchMult/tSteps, y:mouseDelta.y*launchMult/tSteps};
      let mouseAtomPos = {x:mouse.posClick.x+mouseAtomVel.x*tSteps, y:mouse.posClick.y+mouseAtomVel.y*tSteps};
      let mouseAtom = new Atom(mouseAtomPos, mouseAtomVel, cursorRadius, 'black');
      let collisions = impactAtomOnBlocks(mouseAtom, world.blocks, tSteps);
      let drawPoss = [mouse.posClick];
      let drawProjs = [mouseAtomPos];
      for (let c of collisions) {
         drawPoss.push(c.collidePos);
         drawProjs.push(c.newPos);
         mouseAtomPos = c.newPos;
      }
      drawPoss.push(mouseAtomPos);
      let drawCycles = drawProjs.length;
      for (let d=0; d<drawCycles; d++) {
         ctx.strokeStyle = `hsl(0, ${100*(drawCycles-d)/drawCycles}%, 50%)`;
         ctx.beginPath()
         ctx.moveTo(...toArray(viewTransWorldToDraw(drawPoss[d])));
         ctx.lineTo(...toArray(viewTransWorldToDraw(drawProjs[d])));
         ctx.stroke();
         ctx.beginPath();
         ctx.arc(...toArray(viewTransWorldToDraw(drawPoss[d+1])), viewScaleWorldToDraw(cursorRadius), 0, Math.PI*2);
         ctx.stroke();
      }
   }


   // Draw stats on top of world
   ctx.font = '16px sans-serif'
   ctx.fillStyle = '#000000';
   let updateAvg = timers.update.getAverage();
   ctx.fillText(`FPS: ${(1000/timers.frame.getAverage()).toFixed(1)} - ${(100*updateAvg/timers.frame.getAverage()).toFixed(1)}\%`, 30, 50);
   ctx.fillText(`AtomOnAtom: ${(100*timers.atomOnAtom.getAverage()/updateAvg).toFixed(1)}\%`, 200, 50);
   ctx.fillText(`Draw: ${(100*timers.draw.getAverage()/updateAvg).toFixed(1)}\%`, 400, 50);
   ctx.fillText('Energy:' + energy.toFixed(1), 30, 75);
   ctx.fillText('Mouse: ' + mouse.pos.x.toFixed(1) + ', ' + mouse.pos.y.toFixed(1), 30, 125);
   ctx.fillText('Frame #: ' + world.frameNumber, 30, 150);

   timers.draw.end();
   timers.update.end();

   world.frameRequest = window.requestAnimationFrame(update);
}

function solveQuadratic(a,b,c) {
   let underSq = b**2 - (4*a*c);
   if (underSq < 0) return [null,null];
   let plusMinus = Math.abs(Math.sqrt(underSq)/(2*a));
   let leftSide = -b/(2*a);
   return [leftSide-plusMinus, leftSide+plusMinus];
}

function squareMag(coords) {
   return coords.x**2 + coords.y**2
}

function toArray(coords) {
   return [coords.x, coords.y];
}

function viewTransWorldToDraw(coords) {
   // Transform from world coordinates to draw coordinates. The world coordinate of [0,0] with [0,0] view offset corresponds to the center of the canvas
   let coordsNew = {...coords};

   coordsNew.x -= world.view.offset.x;
   coordsNew.y -= world.view.offset.y;

   coordsNew.x *= world.view.zoom;
   coordsNew.y *= world.view.zoom;

   coordsNew.x += canvas.width / 2;
   coordsNew.y += canvas.height / 2;
   return coordsNew;
}

function viewScaleWorldToDraw(size) {
   return size * world.view.zoom;
}

function impactAtomsOnAtoms(atoms, atom2atom) {
   for (let i=0; i<atoms.length; i++) {
      let minX = atoms[i].pos.x - atoms[i].radius;
      let minY = atoms[i].pos.y - atoms[i].radius;
      let maxX = atoms[i].pos.x + atoms[i].radius;
      let maxY = atoms[i].pos.y + atoms[i].radius;
      for (let j=i+1; j<atoms.length; j++) {
         if (atoms[j].pos.x+atoms[j].radius < minX) continue;
         if (atoms[j].pos.x-atoms[j].radius > maxX) continue;
         if (atoms[j].pos.y+atoms[j].radius < minY) continue;
         if (atoms[j].pos.y-atoms[j].radius > maxY) continue;
         if (atoms[i].testAtomCollision(atoms[j])) {
            if (atom2atom[i][j] < 10) atom2atom[i][j] += 1;
            // Handle collision due to opposing velocities
            let velDiff = {x:atoms[i].vel.x-atoms[j].vel.x, y:atoms[i].vel.y-atoms[j].vel.y};
            let posDiff = {x:atoms[i].pos.x-atoms[j].pos.x, y:atoms[i].pos.y-atoms[j].pos.y};
            let numerator = velDiff.x*posDiff.x + velDiff.y*posDiff.y;
            let denomenator = posDiff.x*posDiff.x + posDiff.y*posDiff.y;
            if (denomenator == 0) continue; // This stops atoms from breaking when on top of each other
            if (numerator <= 0) { // This helps atoms not to stick if they go through each other
               let massScalar = 2 / (atoms[i].mass + atoms[j].mass);
               let bulkScalar = massScalar * numerator / denomenator;
               atoms[i].vel.x -= atoms[j].mass * bulkScalar * posDiff.x;
               atoms[i].vel.y -= atoms[j].mass * bulkScalar * posDiff.y;
               atoms[j].vel.x += atoms[i].mass * bulkScalar * posDiff.x;
               atoms[j].vel.y += atoms[i].mass * bulkScalar * posDiff.y;
            }
            else {
               // if (atom2atom[i][j] < 5) continue;
               // // Handle slight push off due to close positions
               // // Don't execute when atoms collide or excess energy will be added
               // let newDiff = {x:posDiff.x+velDiff.x, y:posDiff.y+velDiff.y};
               // let totalRadius = atoms[i].radius + atoms[j].radius;
               // if ((newDiff.x*newDiff.x + newDiff.y*newDiff.y) > (totalRadius*totalRadius)) continue; // Also don't execute if atoms are moving away quickly
               // let posDiffMag = Math.sqrt(denomenator);
               // let displacement = Math.pow(totalRadius - posDiffMag,1);
               // let springConstant = 10.0;
               // let bulkCalc = springConstant * displacement / posDiffMag;
               // let velDelta1 = bulkCalc / atoms[i].mass;
               // let velDelta2 = bulkCalc / atoms[j].mass;
               // // if (velDelta1 > .2) velDelta1 = .2;
               // // if (velDelta2 > .2) velDelta2 = .2;
               // atoms[i].vel.x += velDelta1 * posDiff.x;
               // atoms[i].vel.y += velDelta1 * posDiff.y;
               // atoms[j].vel.x -= velDelta2 * posDiff.x;
               // atoms[j].vel.y -= velDelta2 * posDiff.y;
               // atoms[i].color = 'rgb\(' + Math.round(230*Math.random()) + ',' + Math.round(230*Math.random()) + ',' + Math.round(230*Math.random()) + '\)';
               // atoms[j].color = 'rgb\(' + Math.round(230*Math.random()) + ',' + Math.round(230*Math.random()) + ',' + Math.round(230*Math.random()) + '\)';
            }
         } else {
            if (atom2atom[i][j] > 0) atom2atom[i][j] -= 1;
         }
      }
   }
}

function pushAtomsOnAtoms(atoms, atom2atom) {
   for (let i=0; i<atoms.length; i++) atoms[i].push = {x:0, y:0};
   for (let i=0; i<atoms.length; i++) {
      let minX = atoms[i].pos.x - atoms[i].radius;
      let minY = atoms[i].pos.y - atoms[i].radius;
      let maxX = atoms[i].pos.x + atoms[i].radius;
      let maxY = atoms[i].pos.y + atoms[i].radius;
      for (let j=i+1; j<atoms.length; j++) {
         if (atoms[j].pos.x+atoms[j].radius < minX) continue;
         if (atoms[j].pos.x-atoms[j].radius > maxX) continue;
         if (atoms[j].pos.y+atoms[j].radius < minY) continue;
         if (atoms[j].pos.y-atoms[j].radius > maxY) continue;
         if (atoms[i].testAtomCollision(atoms[j])) {
            if (atom2atom[i][j] < 10) atom2atom[i][j] += 1;
            // Handle collision due to opposing velocities
            let velDiff = {x:atoms[i].vel.x-atoms[j].vel.x, y:atoms[i].vel.y-atoms[j].vel.y};
            let posDiff = {x:atoms[i].pos.x-atoms[j].pos.x, y:atoms[i].pos.y-atoms[j].pos.y};
            let numerator = velDiff.x*posDiff.x + velDiff.y*posDiff.y;
            let denomenator = posDiff.x*posDiff.x + posDiff.y*posDiff.y;
            if (denomenator == 0) continue; // This stops atoms from breaking when on top of each other
            if (numerator <= 0) { // This helps atoms not to stick if they go through each other
               // let massScalar = 2.0 / (atoms[i].mass + atoms[j].mass);
               // let bulkScalar = massScalar * numerator / denomenator;
               // atoms[i].vel.x -= atoms[j].mass * bulkScalar * posDiff.x;
               // atoms[i].vel.y -= atoms[j].mass * bulkScalar * posDiff.y;
               // atoms[j].vel.x += atoms[i].mass * bulkScalar * posDiff.x;
               // atoms[j].vel.y += atoms[i].mass * bulkScalar * posDiff.y;
            }
            else {
               // if (atom2atom[i][j] < 5) continue;
               // Handle slight push off due to close positions
               // Don't execute when atoms collide or excess energy will be added
               let newDiff = {x:posDiff.x+velDiff.x, y:posDiff.y+velDiff.y};
               let totalRadius = atoms[i].radius + atoms[j].radius;
               if ((newDiff.x*newDiff.x + newDiff.y*newDiff.y) > (totalRadius*totalRadius)) continue; // Also don't execute if atoms are moving away quickly
               let posDiffMag = Math.sqrt(denomenator);
               let displacement = Math.pow(totalRadius - posDiffMag,1);
               let springConstant = 0.5;
               let bulkCalc = springConstant * displacement / posDiffMag;
               let velDelta1 = bulkCalc / atoms[i].mass;
               let velDelta2 = bulkCalc / atoms[j].mass;
               // if (velDelta1 > .2) velDelta1 = .2;
               // if (velDelta2 > .2) velDelta2 = .2;

               // atoms[i].pos.x += velDelta1 * posDiff.x;
               // atoms[i].pos.y += velDelta1 * posDiff.y;
               // atoms[j].pos.x -= velDelta2 * posDiff.x;
               // atoms[j].pos.y -= velDelta2 * posDiff.y;

               atoms[i].push.x += velDelta1 * posDiff.x;
               atoms[i].push.y += velDelta1 * posDiff.y;
               atoms[j].push.x -= velDelta2 * posDiff.x;
               atoms[j].push.y -= velDelta2 * posDiff.y;
               // atoms[i].color = 'rgb\(' + Math.round(230*Math.random()) + ',' + Math.round(230*Math.random()) + ',' + Math.round(230*Math.random()) + '\)';
               // atoms[j].color = 'rgb\(' + Math.round(230*Math.random()) + ',' + Math.round(230*Math.random()) + ',' + Math.round(230*Math.random()) + '\)';
            }
         } else {
            if (atom2atom[i][j] > 0) atom2atom[i][j] -= 1;
         }
      }
   }
   for (let i=0; i<atoms.length; i++) {
      atoms[i].vel.x += atoms[i].push.x;
      atoms[i].vel.y += atoms[i].push.y;
   }
}

function impactAtomOnBlocks(atom, blocks, tSteps=1) {
   let lastBlock = null;
   let lastObjectId = null;
   let hitNum = 10;
   let collisions = [];
   while (tSteps>0) {
      let result = {t:tSteps, collidePos:null, wallNorm:null, wallInd:null, newVel:null, newPos:null};
      let newLastBlock = null;
      for (let i=0; i<blocks.length; i++) {
         let resultTemp;
         if (lastBlock == i) resultTemp = blocks[i].collision(atom, tSteps, lastObjectId);
         else resultTemp = blocks[i].collision(atom, tSteps, null);

         if (resultTemp.t <= result.t) {
            result = resultTemp;
            newLastBlock = i;
         }
      }

      lastBlock = newLastBlock;
      lastObjectId = result.wallInd;
      if (result.collidePos == null) break;

      tSteps -= result.t;
      hitNum--;
      if (hitNum <= 0) {
         tSteps = 0;
         result.newPos = result.collidePos;
      }

      atom.vel = result.newVel;
      atom.pos = result.newPos;

      collisions.push(result);
   }
   return collisions;
}
