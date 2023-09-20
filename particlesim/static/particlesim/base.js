
function Atom (pos, vel, radius, color) {
  this.pos = {x:pos.x, y:pos.y};
  this.vel = {x:vel.x, y:vel.y};
  this.radius = radius;
  this.mass = radius*radius;
  this.bonds = [];
  this.pals = [];
  this.color = color;
  this.push = {x:0, y:0};

  this.draw = function() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI*2);
    ctx.fill();
  };

  this.randomizePos = function(minPos, maxPos) {
    this.pos = {x:Math.random()*(maxPos.x-minPos.x) + minPos.x, y:Math.random()*(maxPos.y-minPos.y) + minPos.y};
  };

  this.randomizeVel = function(minVel, maxVel) {
    this.vel = {x:Math.random()*(maxVel.x-minVel.x) + minVel.x, y:Math.random()*(maxVel.y-minVel.y) + minVel.y};
  };

  this.testAtomCollision = function(other) {
    var posDelta = {x:this.pos.x-other.pos.x, y:this.pos.y-other.pos.y}
    var dist = Math.sqrt((posDelta.x*posDelta.x) + (posDelta.y*posDelta.y));
    if (dist <= this.radius + other.radius) return true;
    return false;
  };
}

function Bond (atom1, atom2) {
  this.atom1 = atom1;
  this.atom2 = atom2;
  atom1.bonds.push(this);
  atom1.pals.push(atom2);
  atom2.bonds.push(this);
  atom2.pals.push(atom1);
  this.broken = false;

  this.draw = function() {
    ctx.beginPath();
    ctx.moveTo(this.atom1.pos.x, this.atom1.pos.y);
    ctx.lineTo(this.atom2.pos.x, this.atom2.pos.y);
    ctx.stroke();
  };

  this.forceAtoms = function() {
    var posDiff = {x:this.atom1.pos.x-this.atom2.pos.x, y:this.atom1.pos.y-this.atom2.pos.y};
    var dist = Math.sqrt(posDiff.x*posDiff.x + posDiff.y*posDiff.y);
    var displacement = dist - this.atom1.radius - this.atom2.radius;
    if (displacement > 8) {
      this.break();
      return
    }
    var displaceSign = 1;
    if (displacement < 0) displaceSign *= -1;
    displacement = displacement * Math.abs(displacement);
    var tangent = {x:posDiff.x/dist, y:posDiff.y/dist};
    var k = 5;
    this.atom1.vel.x -= k / this.atom1.mass * displacement * tangent.x;
    this.atom1.vel.y -= k / this.atom1.mass * displacement * tangent.y;
    this.atom2.vel.x += k / this.atom2.mass * displacement * tangent.x;
    this.atom2.vel.y += k / this.atom2.mass * displacement * tangent.y;
  };

  this.break = function() {
    var index = this.atom1.bonds.indexOf(this);
    this.atom1.bonds.splice(index,1);
    this.atom1.pals.splice(index,1);
    delete this.atom1;
    index = this.atom2.bonds.indexOf(this);
    this.atom2.bonds.splice(index,1);
    this.atom2.pals.splice(index,1);
    delete this.atom2;
    this.broken = true;
  };
}

function Block (pts, temp, color) {
  this.pts = [];
  this.minPos = {x:pts[0][0], y:pts[0][1]};
  this.maxPos = {x:pts[0][0], y:pts[0][1]};
  for (var i=0; i<pts.length; i++) {
    this.pts.push({x:pts[i][0], y:pts[i][1]});
    if (pts[i][0] < this.minPos.x) this.minPos.x = pts[i][0];
    if (pts[i][1] < this.minPos.y) this.minPos.y = pts[i][1];
    if (pts[i][0] > this.maxPos.x) this.maxPos.x = pts[i][0];
    if (pts[i][1] > this.maxPos.y) this.maxPos.y = pts[i][1];
  }
  this.pts.push({x:pts[0][0], y:pts[0][1]});
  this.norms = [];
  for (var i=0; i<this.pts.length-1; i++) {
    var diff = {x:this.pts[i+1].x-this.pts[i].x, y:this.pts[i+1].y-this.pts[i].y};
    var dist = Math.sqrt(Math.pow(diff.x,2) + Math.pow(diff.y,2));
    var dir = {x:diff.x/dist, y:diff.y/dist};
    this.norms.push({x:dir.y, y:-dir.x});
  }
  this.temp = temp;
  this.color = color;

  this.collision = function(atom, progress, avoidId) {
    var result = [2, null, null, null];
    var p = {x:atom.pos.x - atom.vel.x*progress, y:atom.pos.y - atom.vel.y*progress};
    var r = atom.vel;
    if ((p.x+atom.radius<this.minPos.x) && (atom.pos.x+atom.radius<this.minPos.x)) return result;
    if ((p.x-atom.radius>this.maxPos.x) && (atom.pos.x-atom.radius>this.maxPos.x)) return result;
    if ((p.y+atom.radius<this.minPos.y) && (atom.pos.y+atom.radius<this.minPos.y)) return result;
    if ((p.y-atom.radius>this.maxPos.y) && (atom.pos.y-atom.radius>this.maxPos.y)) return result;
    this.color = "#0000FF";

    // Test each of the walls
    for (var i=0; i<this.pts.length-1; i++) {
      if (i == avoidId) continue;

      // Line segment collision based on http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
      // p is atom pos minus vel, r is atom vel, q is 1st wall point (pushed out by radius in direction of normal), s is 2nd wall point minus 1st (also pushed out)
      var q = {x:this.pts[i].x+(atom.radius*this.norms[i].x), y:this.pts[i].y+(atom.radius*this.norms[i].y)};
      var s = {x:this.pts[i+1].x - this.pts[i].x, y:this.pts[i+1].y - this.pts[i].y};
      var qMinusP = {x:q.x-p.x, y:q.y-p.y};
      var tNum = (qMinusP.x * s.y) - (qMinusP.y * s.x);
      var uNum = (qMinusP.x * r.y) - (qMinusP.y * r.x);
      var rCrossS = (r.x * s.y) - (r.y * s.x);
      if (rCrossS != 0) { // This fails when r is parallel to s
        var t = 1.0 * tNum / rCrossS; // t is relative distance along r
        var u = 1.0 * uNum / rCrossS; // u is relative distance along s
        if ((t>=0 && t<=1) && (u>=0 && u<=1) && t<result[0]) {
          //this.color = "#FF0000";
          var collidePos = {x:t*r.x+p.x, y:t*r.y+p.y};
          result = [t, collidePos, this.norms[i], i];
        }
      }

      // Test if p is in between pushed out wall and wall itself by projecting (p-q) onto s
      var sDotS = s.x*s.x + s.y*s.y; // Equivalent to the squared magnitude of s
      var pMinusQDotS = -qMinusP.x*s.x - qMinusP.y*s.y;
      var u2 = 1.0 * pMinusQDotS / sDotS;
      if (u2>=0 && u2<=1) { // Occurs when atom is inside of wall edges
        var projPos = {x:s.x*u2+q.x, y:s.y*u2+q.y}; // The atom's projected position onto the wall
        var projDiff = {x:projPos.x-p.x, y:projPos.y-p.y};
        var projDist = Math.sqrt(Math.pow(projDiff.x,2) + Math.pow(projDiff.y,2));
        var projDotNorm = projDiff.x*this.norms[i].x + projDiff.y*this.norms[i].y;
        if (projDist <= atom.radius && projDotNorm >= 0) {
          //this.color = "#FF8888";
          result = [0, projPos, this.norms[i], i];
        }
      }
    }

    // Test each of the points
    for (var i=0; i<this.pts.length-1; i++) {
      if (i+this.pts.length-1 == avoidId) continue;

      // If point is inverted then skip
      var normLeft = this.norms[this.norms.length-1];
      if (i > 0) normLeft = this.norms[i-1];
      if ((normLeft.x*this.norms[i].y - normLeft.y*this.norms[i].x) <= 0 ) continue;

      // Test if atom point vector intersects with circle of atom.radius centered around each point
      // I.e., find when ((r*t+p)-c)^2 = atom.radius^2 or when r.r*t^2 + 2r.(p-c)*t + ((p-c)^2-radius^2) = 0, where c is circle center
      var pMinusC = {x:p.x-this.pts[i].x, y:p.y-this.pts[i].y};
      var a = r.x*r.x + r.y*r.y;
      var b = 2 * (r.x*pMinusC.x + r.y*pMinusC.y);
      var c = pMinusC.x*pMinusC.x + pMinusC.y*pMinusC.y - Math.pow(atom.radius,2);
      var ans = solveQuadratic(a,b,c);
      if (ans[0] != null) {
        for (var j=0; j<2; j++) {
          var t = ans[j];
          if (t>=0 && t<=1 && t<result[0]) {
            var collidePos = {x:t*r.x+p.x, y:t*r.y+p.y};
            var norm = {x:(1.0*collidePos.x-this.pts[i].x)/atom.radius, y:(1.0*collidePos.y-this.pts[i].y)/atom.radius};
            var normLeft = this.norms[this.norms.length-1];
            if (i > 0) normLeft = this.norms[i-1];
            if (((normLeft.x*norm.y)-(normLeft.y*norm.x) > 0) && ((this.norms[i].x*norm.y)-(this.norms[i].y*norm.x) < 0)) {
              //this.color = "#00FFFF";
              result = [t, collidePos, norm, i+this.pts.length-1];
            }
          }
        }
      }

      // Test if atom starts within a radius of the point
      var pDist = Math.sqrt(Math.pow(pMinusC.x,2) + Math.pow(pMinusC.y,2));
      if (pDist<=atom.radius && result[0]>0) {
        var norm = {x:1.0*pMinusC.x/pDist, y:1.0*pMinusC.y/pDist};
        var collidePos = {x:atom.radius*norm.x+this.pts[i].x, y:atom.radius*norm.y+this.pts[i].y}
        if (((normLeft.x*norm.y)-(normLeft.y*norm.x) > 0) && ((this.norms[i].x*norm.y)-(this.norms[i].y*norm.x) < 0)) {
          //this.color = "#00AAAA";
          result = [0, collidePos, norm, i+this.pts.length-1];
        }
      }
    }

    if (result[0] <= 1) {
      var rDotNorm = r.x*result[2].x + r.y*result[2].y;
      if (rDotNorm < 0) { // If the atom is traveling towards outside then don't worry about it
        var alpha = 1.0;
        alpha = 0.1;
        var newVel = {x:r.x-((1.0+alpha)*rDotNorm*result[2].x), y:r.y-((1.0+alpha)*rDotNorm*result[2].y)};
        result[2] = newVel;
      } else {
        result[2] = r;
        result = [2, null, null, null];
      }
    }
    return result;
  };

  this.draw = function() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (var i=1; i<this.pts.length-1; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.closePath();
    ctx.fill();
    this.color = "#000000";
  };
}

function PerformanceTimer (steps) {
  this.steps = steps;
  this.queue = [];
  this.startTime = null;

  this.startTimer = function() {
    var nowDate = new Date();
    this.startTime = nowDate.getTime();
  };

  this.endTimer = function() {
    var nowDate = new Date();
    if (this.startTime == null) return;
    this.queue.push(nowDate.getTime() - this.startTime);
    if (this.queue.length > steps) this.queue.shift();
    this.startTime = null;
  };

  this.reportAverage = function() {
    var total = 0;
    for (var i=0; i<this.queue.length; i++) total += this.queue[i];
    return (1.0 * total / this.queue.length);
  };
}

var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var frameTimer = new PerformanceTimer(100);
var drawTimer = new PerformanceTimer(100);
var atomOnAtomTimer = new PerformanceTimer(100);

Math.seedrandom(0);

var mousePos = {x:0, y:0};
var mouseClickPos = mousePos;
var frameNumber = 0;

canvas.addEventListener('mousemove', handleMouseMoveEvent, false);
function handleMouseMoveEvent(evt) {
  var rect = canvas.getBoundingClientRect();
  mousePos = {x: evt.clientX - rect.left, y: evt.clientY - rect.top};
}
canvas.onclick = function() {mouseClickPos = mousePos};

var x = canvas.width/2.0;
var y = canvas.height-30.0;
var balls = [];
var atoms = [];
var envMomentum = [0,0];
var atomCount = 100;
// for (var i=0; i<atomCount; i++) {
//   var randColor = "rgb\(" + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "," + Math.round(230*Math.random()) + "\)";
//   var newAtom = new Atom({x:i*10+20,y:400}, {x:0,y:0}, 1+8.0*Math.random(), randColor);
//   newAtom.randomizePos({x:30,y:30}, {x:930,y:610});
//   newAtom.randomizeVel({x:-5,y:-5}, {x:5,y:5});
//   atoms.push(newAtom);
// }
// atoms.push(new Atom({x:200,y:300}, {x:0,y:0}, 20, "#FF0000"));
// atoms.push(new Atom({x:201,y:300}, {x:0,y:0}, 20, "#00FF00"));
for (var i=0; i<atomCount; i++) {
  var newAtom = new Atom({x:i*10+20,y:400}, {x:0,y:0}, 20, "#FF0000");
  newAtom.randomizePos({x:30,y:30}, {x:450,y:610});
  newAtom.randomizeVel({x:-10,y:-10}, {x:10,y:10});
  atoms.push(newAtom);
}
for (var i=0; i<atomCount*5; i++) {
  var newAtom = new Atom({x:i*10+20,y:400}, {x:0,y:0}, 5, "#AAAA00");
  newAtom.randomizePos({x:510,y:30}, {x:930,y:610});
  newAtom.randomizeVel({x:-5,y:-5}, {x:5,y:5});
  atoms.push(newAtom);
}
var bonds = [];
for (var i=0; i<392; i+=8) {
  // bonds.push(new Bond(atoms[i],atoms[i+8]));
  // bonds.push(new Bond(atoms[i+1],atoms[i+9]));
  // bonds.push(new Bond(atoms[i+2],atoms[i+10]));
  // bonds.push(new Bond(atoms[i+3],atoms[i+11]));
}
//bonds.push(new Bond(atoms[0],atoms[8]));
var blocks = [];
blocks.push(new Block([[10,10], [950,10], [950,20], [10,20]], 0, "#000000"));
blocks.push(new Block([[10,620], [950,620], [950,630], [10,630]], 0, "#000000"));
blocks.push(new Block([[10,10], [20,10], [20,630], [10,630]], 0, "#000000"));
blocks.push(new Block([[940,10], [950,10], [950,630], [940,630]], 0, "#000000"));
blocks.push(new Block([[475,10], [485,10], [485,630], [475,630]], 0, "#000000"));
// blocks.push(new Block([[61,10], [71,10], [71,630], [61,630]], 0, "#000000"));
// blocks.push(new Block([[200,200], [650,200], [275,250], [300,600]], 0, "#000000"));

var atom2atom = [];
for (var i=0; i<atoms.length; i++) {
  atom2atom.push([])
  for (var j=0; j<atoms.length; j++) {
    atom2atom[i].push(0);
  }
}



function draw() {
  frameNumber ++;
  frameTimer.endTimer();
  frameTimer.startTimer();
  drawTimer.startTimer();
  var energy = 0;
  for (var i=0; i<atoms.length; i++) {
    atoms[i].vel.y += .02;
    // energy += -.01 * atoms[i].mass * atoms[i].pos.y;
  }

  for (var i=0; i<bonds.length; i++) {
    bonds[i].forceAtoms();
    if (bonds[i].broken) {
      bonds.splice(i,1);
      i--;
    }
  }

  atomOnAtomTimer.startTimer();
  impactAtomsOnAtoms(atoms);
  pushAtomsOnAtoms(atoms);
  atomOnAtomTimer.endTimer();

  for (var a=0; a<atoms.length; a++) {
    // var alpha = .9;
    // if(atoms[a].pos.x + atoms[a].vel.x > canvas.width-atoms[a].radius || atoms[a].pos.x + atoms[a].vel.x < atoms[a].radius) {
    //     envMomentum[0] += (1+alpha) * atoms[a].mass * atoms[a].vel.x;
    //     atoms[a].vel.x *= -alpha;
    // }
    // if(atoms[a].pos.y + atoms[a].vel.y > canvas.height-atoms[a].radius || atoms[a].pos.y + atoms[a].vel.y < atoms[a].radius) {
    //     envMomentum[1] += (1+alpha) * atoms[a].mass * atoms[a].vel.y;
    //     atoms[a].vel.y *= -alpha;
    // }

    atoms[a].pos.x += atoms[a].vel.x;
    atoms[a].pos.y += atoms[a].vel.y;

  }

  for (var a=0; a<atoms.length; a++) {
    impactAtomOnBlocks(atoms[a], blocks);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i=0; i<blocks.length; i++) blocks[i].draw();
  for (var i=0; i<bonds.length; i++) bonds[i].draw();
  for (var i=0; i<atoms.length; i++) atoms[i].draw();

  var momentum = [0,0];
  momentum[0] += envMomentum[0];
  momentum[1] += envMomentum[1];
  for (var i=0; i<atoms.length; i++) {
    energy += 0.5 * atoms[i].mass * (atoms[i].vel.x*atoms[i].vel.x + atoms[i].vel.y*atoms[i].vel.y);
    momentum[0] += atoms[i].mass * atoms[i].vel.x;
    momentum[1] += atoms[i].mass * atoms[i].vel.y;
  }
  var energy1 = 0;
  var energy2 = 0;
  for (var i=0; i<atomCount; i++) {
    energy1 += 0.5 * atoms[i].mass * (atoms[i].vel.x*atoms[i].vel.x + atoms[i].vel.y*atoms[i].vel.y);
    energy2 += 0.5 * atoms[i+atomCount].mass * (atoms[i+atomCount].vel.x*atoms[i+atomCount].vel.x + atoms[i+atomCount].vel.y*atoms[i+atomCount].vel.y);
  }

  ctx.fillStyle = "#000000";
  ctx.fillText("FPS: " + Math.round(1000/frameTimer.reportAverage()) + " - " + Math.round(100*drawTimer.reportAverage()/frameTimer.reportAverage()) + "\%", 25, 35);
  ctx.fillText("E:" + energy, 25, 50);
  ctx.fillText("E1:" + energy1, 25, 65);
  ctx.fillText("E2:" + energy2, 25, 80);
  ctx.fillText("mouse: " + mousePos.x + ", " + mousePos.y, 25, 95);
  ctx.fillText("frameNumber: " + frameNumber, 25, 110);
  ctx.fillText("AtomOnAtom (us):" + Math.round(1000*atomOnAtomTimer.reportAverage()), 125, 35);

  drawTimer.endTimer();
}

setInterval(draw, 33);

function solveQuadratic(a,b,c) {
  var underSq = Math.pow(b,2) - (4.0*a*c);
  if (underSq < 0) return [null,null];
  var plusMinus = Math.abs(Math.sqrt(underSq)/(2.0*a));
  var leftSide = -b/(2.0*a);
  return [leftSide-plusMinus, leftSide+plusMinus];
}

function impactAtomsOnAtoms(atoms) {
  for (var i=0; i<atoms.length; i++) {
    var minX = atoms[i].pos.x - atoms[i].radius;
    var minY = atoms[i].pos.y - atoms[i].radius;
    var maxX = atoms[i].pos.x + atoms[i].radius;
    var maxY = atoms[i].pos.y + atoms[i].radius;
    for (var j=i+1; j<atoms.length; j++) {
      if (atoms[j].pos.x+atoms[j].radius < minX) continue;
      if (atoms[j].pos.x-atoms[j].radius > maxX) continue;
      if (atoms[j].pos.y+atoms[j].radius < minY) continue;
      if (atoms[j].pos.y-atoms[j].radius > maxY) continue;
      if (atoms[i].testAtomCollision(atoms[j])) {
        if (atom2atom[i][j] < 10) atom2atom[i][j] += 1;
        // Handle collision due to opposing velocities
        var velDiff = {x:atoms[i].vel.x-atoms[j].vel.x, y:atoms[i].vel.y-atoms[j].vel.y};
        var posDiff = {x:atoms[i].pos.x-atoms[j].pos.x, y:atoms[i].pos.y-atoms[j].pos.y};
        var numerator = velDiff.x*posDiff.x + velDiff.y*posDiff.y;
        var denomenator = posDiff.x*posDiff.x + posDiff.y*posDiff.y;
        if (denomenator == 0) continue; // This stops atoms from breaking when on top of each other
        if (numerator <= 0) { // This helps atoms not to stick if they go through each other
          var massScalar = 2.0 / (atoms[i].mass + atoms[j].mass);
          var bulkScalar = massScalar * numerator / denomenator;
          atoms[i].vel.x -= atoms[j].mass * bulkScalar * posDiff.x;
          atoms[i].vel.y -= atoms[j].mass * bulkScalar * posDiff.y;
          atoms[j].vel.x += atoms[i].mass * bulkScalar * posDiff.x;
          atoms[j].vel.y += atoms[i].mass * bulkScalar * posDiff.y;
        }
        else {
          // if (atom2atom[i][j] < 5) continue;
          // // Handle slight push off due to close positions
          // // Don't execute when atoms collide or excess energy will be added
          // var newDiff = {x:posDiff.x+velDiff.x, y:posDiff.y+velDiff.y};
          // var totalRadius = atoms[i].radius + atoms[j].radius;
          // if ((newDiff.x*newDiff.x + newDiff.y*newDiff.y) > (totalRadius*totalRadius)) continue; // Also don't execute if atoms are moving away quickly
          // var posDiffMag = Math.sqrt(denomenator);
          // var displacement = Math.pow(totalRadius - posDiffMag,1);
          // var springConstant = 10.0;
          // var bulkCalc = springConstant * displacement / posDiffMag;
          // var velDelta1 = bulkCalc / atoms[i].mass;
          // var velDelta2 = bulkCalc / atoms[j].mass;
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

function pushAtomsOnAtoms(atoms) {
  for (var i=0; i<atoms.length; i++) atoms[i].push = {x:0, y:0};
  for (var i=0; i<atoms.length; i++) {
    var minX = atoms[i].pos.x - atoms[i].radius;
    var minY = atoms[i].pos.y - atoms[i].radius;
    var maxX = atoms[i].pos.x + atoms[i].radius;
    var maxY = atoms[i].pos.y + atoms[i].radius;
    for (var j=i+1; j<atoms.length; j++) {
      if (atoms[j].pos.x+atoms[j].radius < minX) continue;
      if (atoms[j].pos.x-atoms[j].radius > maxX) continue;
      if (atoms[j].pos.y+atoms[j].radius < minY) continue;
      if (atoms[j].pos.y-atoms[j].radius > maxY) continue;
      if (atoms[i].testAtomCollision(atoms[j])) {
        if (atom2atom[i][j] < 10) atom2atom[i][j] += 1;
        // Handle collision due to opposing velocities
        var velDiff = {x:atoms[i].vel.x-atoms[j].vel.x, y:atoms[i].vel.y-atoms[j].vel.y};
        var posDiff = {x:atoms[i].pos.x-atoms[j].pos.x, y:atoms[i].pos.y-atoms[j].pos.y};
        var numerator = velDiff.x*posDiff.x + velDiff.y*posDiff.y;
        var denomenator = posDiff.x*posDiff.x + posDiff.y*posDiff.y;
        if (denomenator == 0) continue; // This stops atoms from breaking when on top of each other
        if (numerator <= 0) { // This helps atoms not to stick if they go through each other
          // var massScalar = 2.0 / (atoms[i].mass + atoms[j].mass);
          // var bulkScalar = massScalar * numerator / denomenator;
          // atoms[i].vel.x -= atoms[j].mass * bulkScalar * posDiff.x;
          // atoms[i].vel.y -= atoms[j].mass * bulkScalar * posDiff.y;
          // atoms[j].vel.x += atoms[i].mass * bulkScalar * posDiff.x;
          // atoms[j].vel.y += atoms[i].mass * bulkScalar * posDiff.y;
        }
        else {
          // if (atom2atom[i][j] < 5) continue;
          // Handle slight push off due to close positions
          // Don't execute when atoms collide or excess energy will be added
          var newDiff = {x:posDiff.x+velDiff.x, y:posDiff.y+velDiff.y};
          var totalRadius = atoms[i].radius + atoms[j].radius;
          if ((newDiff.x*newDiff.x + newDiff.y*newDiff.y) > (totalRadius*totalRadius)) continue; // Also don't execute if atoms are moving away quickly
          var posDiffMag = Math.sqrt(denomenator);
          var displacement = Math.pow(totalRadius - posDiffMag,1);
          var springConstant = 0.5;
          var bulkCalc = springConstant * displacement / posDiffMag;
          var velDelta1 = bulkCalc / atoms[i].mass;
          var velDelta2 = bulkCalc / atoms[j].mass;
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
  for (var i=0; i<atoms.length; i++) {
    atoms[i].vel.x += atoms[i].push.x;
    atoms[i].vel.y += atoms[i].push.y;
  }
}

function impactAtomOnBlocks(atom, blocks) {
  var t = 1.0;
  var lastBlock = null;
  var lastObjectId = null;
  var hitNum = 2;
  while (t>0) {
    var result = [t, null, null, null];
    var newLastBlock = null;
    for (var i=0; i<blocks.length; i++) {
      if (mousePos.x>800 && i==blocks.length-1) continue;
      var resultTemp;
      if (lastBlock == i) resultTemp = blocks[i].collision(atom, t, lastObjectId);
      else resultTemp = blocks[i].collision(atom, t, null);
      if (resultTemp[0] < result[0]) {
        result = resultTemp;
        newLastBlock = i;
      }
    }
    lastBlock = newLastBlock;
    lastObjectId = result[3];
    if (result[1] == null) break;
    t -= result[0];
    hitNum--;
    if (hitNum <= 0) t = 0;

    atom.vel = result[2];
    atom.pos = {x:t*result[2].x+result[1].x, y:t*result[2].y+result[1].y};
  }
}