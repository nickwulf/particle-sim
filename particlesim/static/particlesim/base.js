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
      ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI*2);
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

   constructor(atom1, atom2) {
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
      ctx.moveTo(this.atom1.pos.x, this.atom1.pos.y);
      ctx.lineTo(this.atom2.pos.x, this.atom2.pos.y);
      ctx.stroke();
   }

   forceAtoms() {
      let posDiff = {x:this.atom1.pos.x-this.atom2.pos.x, y:this.atom1.pos.y-this.atom2.pos.y};
      let dist = Math.sqrt(squareMag(posDiff));
      let displacement = dist - this.atom1.radius - this.atom2.radius;
      if (displacement > 8) {
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
   color;

   constructor(pts, temp, color) {
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
      this.temp = temp;
      this.color = color;
   }

   collision(atom, progress, avoidId) {
      let result = {t:Infinity, collidePos:null, wallNorm:null, wallInd:null, velNew:null};
      let p = {x:atom.pos.x - atom.vel.x*progress, y:atom.pos.y - atom.vel.y*progress};
      let r = atom.vel;
      if ((p.x+atom.radius<this.minPos.x) && (atom.pos.x+atom.radius<this.minPos.x)) return result;
      if ((p.x-atom.radius>this.maxPos.x) && (atom.pos.x-atom.radius>this.maxPos.x)) return result;
      if ((p.y+atom.radius<this.minPos.y) && (atom.pos.y+atom.radius<this.minPos.y)) return result;
      if ((p.y-atom.radius>this.maxPos.y) && (atom.pos.y-atom.radius>this.maxPos.y)) return result;
      this.color = "#0000FF";

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
            let t = 1.0 * tNum / rCrossS; // t is relative distance along r
            let u = 1.0 * uNum / rCrossS; // u is relative distance along s
            if ((t>=0 && t<=1) && (u>=0 && u<=1) && t<result.t) {
               //this.color = "#FF0000";
               let collidePos = {x:t*r.x+p.x, y:t*r.y+p.y};
               result = {t:t, collidePos:collidePos, wallNorm:this.norms[i], wallInd:i, velNew:null};
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
               //this.color = "#FF8888";
               result = {t:0, collidePos:projPos, wallNorm:this.norms[i], wallInd:i, velNew:null};
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
               if (t>=0 && t<=1 && t<result.t) {
                  let collidePos = {x:t*r.x+p.x, y:t*r.y+p.y};
                  let norm = {x:(collidePos.x-this.pts[i].x)/atom.radius, y:(collidePos.y-this.pts[i].y)/atom.radius};
                  let normLeft = this.norms[this.norms.length-1];
                  if (i > 0) normLeft = this.norms[i-1];
                  if (((normLeft.x*norm.y)-(normLeft.y*norm.x) > 0) && ((this.norms[i].x*norm.y)-(this.norms[i].y*norm.x) < 0)) {
                     //this.color = "#00FFFF";
                     result = {t:t, collidePos:collidePos, wallNorm:norm, wallInd:i+this.pts.length-1, velNew:null};
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
               //this.color = "#00AAAA";
               result = {t:0, collidePos:collidePos, wallNorm:norm, wallInd:i+this.pts.length-1, velNew:null};
            }
         }
      }

      if (result.t <= 1) {
         let rDotNorm = r.x*result.wallNorm.x + r.y*result.wallNorm.y;
         if (rDotNorm < 0) { // If the atom is traveling towards outside then don't worry about it
            let alpha = 1;
            alpha = 0.1;
            result.velNew = {x:r.x-((1+alpha)*rDotNorm*result.wallNorm.x), y:r.y-((1+alpha)*rDotNorm*result.wallNorm.y)};
         } else {
            result = {t:Infinity, collidePos:null, wallNorm:null, wallInd:null, velNew:null};
         }
      }
      return result;
   }

   draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.pts[0].x, this.pts[0].y);
      for (let i=1; i<this.pts.length-1; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
      ctx.closePath();
      ctx.fill();
      this.color = "#000000";
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
var world = {};
var atomCount = 100;

document.addEventListener("DOMContentLoaded", function() {
   Math.seedrandom(0);

   canvas = document.getElementById("myCanvas");
   ctx = canvas.getContext("2d");

   timers.frame = new PerformanceTimer(100);
   timers.update = new PerformanceTimer(100);
   timers.atomOnAtom = new PerformanceTimer(100);
   timers.draw = new PerformanceTimer(100);

   mouse.pos = {x:0, y:0};
   mouse.posClick = {...mouse.pos};

   world.atoms = [];
   world.bonds = [];
   world.blocks = [];
   world.atom2atom = [];
   world.envMomentum = [0,0];
   world.frameNumber = 0;

   function handleMouseMoveEvent(evt) {
      let rect = canvas.getBoundingClientRect();
      mouse.pos = {x: evt.clientX - rect.left, y: evt.clientY - rect.top};
   }
   canvas.addEventListener('mousemove', handleMouseMoveEvent, false);
   canvas.onclick = function() {mouse.posClick = mouse.pos};

   for (let i=0; i<atomCount; i++) {
      let newAtom = new Atom({x:i*10+20,y:400}, {x:0,y:0}, 20, "#FF0000");
      newAtom.randomizePos({x:30,y:30}, {x:450,y:610});
      newAtom.randomizeVel({x:-10,y:-10}, {x:10,y:10});
      world.atoms.push(newAtom);
   }
   for (let i=0; i<atomCount*5; i++) {
      let newAtom = new Atom({x:i*10+20,y:400}, {x:0,y:0}, 5, "#AAAA00");
      newAtom.randomizePos({x:510,y:30}, {x:930,y:610});
      newAtom.randomizeVel({x:-5,y:-5}, {x:5,y:5});
      world.atoms.push(newAtom);
   }
   for (let i=0; i<392; i+=8) {
      // world.bonds.push(new Bond(world.atoms[i],world.atoms[i+8]));
      // world.bonds.push(new Bond(world.atoms[i+1],world.atoms[i+9]));
      // world.bonds.push(new Bond(world.atoms[i+2],world.atoms[i+10]));
      // world.bonds.push(new Bond(world.atoms[i+3],world.atoms[i+11]));
   }
   //world.bonds.push(new Bond(world.atoms[0],world.atoms[8]));
   world.blocks.push(new Block([[10,10], [950,10], [950,20], [10,20]], 0, "#000000"));
   world.blocks.push(new Block([[10,620], [950,620], [950,630], [10,630]], 0, "#000000"));
   world.blocks.push(new Block([[10,10], [20,10], [20,630], [10,630]], 0, "#000000"));
   world.blocks.push(new Block([[940,10], [950,10], [950,630], [940,630]], 0, "#000000"));
   world.blocks.push(new Block([[475,10], [485,10], [485,630], [475,630]], 0, "#000000"));
   // world.blocks.push(new Block([[61,10], [71,10], [71,630], [61,630]], 0, "#000000"));
   // world.blocks.push(new Block([[200,200], [650,200], [275,250], [300,600]], 0, "#000000"));

   for (let i in world.atoms) {
      world.atom2atom.push([])
      for (let j in world.atoms) {
         world.atom2atom[i].push(0);
      }
   }

   setInterval(update, 33);
});


function update() {
   world.frameNumber ++;
   timers.frame.end();
   timers.frame.start();
   timers.update.start();
   let energy = 0;
   for (let a of world.atoms) {
      a.vel.y += .02;
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
   pushAtomsOnAtoms(world.atoms, world.atom2atom);
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
   let energy1 = 0;
   let energy2 = 0;
   for (let i=0; i<atomCount; i++) {
      energy1 += 0.5 * world.atoms[i].mass * (world.atoms[i].vel.x**2 + world.atoms[i].vel.y**2);
      energy2 += 0.5 * world.atoms[i+atomCount].mass * (world.atoms[i+atomCount].vel.x**2 + world.atoms[i+atomCount].vel.y**2);
   }

   // Completely clear the drawing area in preparation for new frame
   timers.draw.start();
   ctx.clearRect(0, 0, canvas.width, canvas.height);

   // Redraw objects in the world
   for (let b of world.blocks) b.draw();
   for (let b of world.bonds) b.draw();
   for (let a of world.atoms) a.draw();

   // Draw stats on top of world
   ctx.fillStyle = "#000000";
   let updateAvg = timers.update.getAverage();
   ctx.fillText(`FPS: ${(1000/timers.frame.getAverage()).toFixed(1)} - ${(100*updateAvg/timers.frame.getAverage()).toFixed(1)}\%`, 25, 35);
   ctx.fillText("E:" + energy, 25, 50);
   ctx.fillText("E1:" + energy1, 25, 65);
   ctx.fillText("E2:" + energy2, 25, 80);
   ctx.fillText("mouse: " + mouse.pos.x + ", " + mouse.pos.y, 25, 95);
   ctx.fillText("Frame #: " + world.frameNumber, 25, 110);
   ctx.fillText(`AtomOnAtom: ${(100*timers.atomOnAtom.getAverage()/updateAvg).toFixed(1)}\%`, 125, 35);
   ctx.fillText(`Draw: ${(100*timers.draw.getAverage()/updateAvg).toFixed(1)}\%`, 250, 35);

   timers.draw.end();
   timers.update.end();
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
               // atoms[i].color = "rgb\(" + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "\)";
               // atoms[j].color = "rgb\(" + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "\)";
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
               // atoms[i].color = "rgb\(" + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "\)";
               // atoms[j].color = "rgb\(" + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "\)";
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

function impactAtomOnBlocks(atom, blocks) {
   let t = 1;
   let lastBlock = null;
   let lastObjectId = null;
   let hitNum = 2;
   while (t>0) {
      let result = {t:Infinity, collidePos:null, wallNorm:null, wallInd:null, velNew:null};
      let newLastBlock = null;
      for (let i=0; i<blocks.length; i++) {
         if (mouse.pos.x>800 && i==blocks.length-1) continue;
         let resultTemp;
         if (lastBlock == i) resultTemp = blocks[i].collision(atom, t, lastObjectId);
         else resultTemp = blocks[i].collision(atom, t, null);

         if (resultTemp.t < result.t) {
            result = resultTemp;
            newLastBlock = i;
         }
      }
      lastBlock = newLastBlock;
      lastObjectId = result.wallInd;
      if (result.collidePos == null) break;
      t -= result.t;
      hitNum--;
      if (hitNum <= 0) t = 0;

      atom.vel = result.velNew;
      atom.pos = {x:t*result.velNew.x+result.collidePos.x, y:t*result.velNew.y+result.collidePos.y};
   }
}
