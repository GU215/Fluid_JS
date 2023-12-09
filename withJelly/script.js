"use strict";
const c = document.querySelector("canvas");
const ctx = c.getContext("2d");
const output = document.querySelector("p");
const button = document.getElementById("button");

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    magnitude() {
        return Math.sqrt(this.dot(this));
    }

    normalize() {
        const length = this.magnitude();
        this.x /= length;
        this.y /= length;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    subClone(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    times(num) {
        this.x *= num;
        this.y *= num;
        return this;
    }

    // clone() {
    //     return new Vector(this.x, this.y);
    // }
}

class Particle {
    constructor(x = 0, y = 0) {
        this.position = new Vector(x, y);
        this.velocity = new Vector();
        this.velocity2 = new Vector();
        this.force = new Vector();
        this.pressure = 0;
        this.density = 0;
        // this.active = true;
    }

    // remove() {
    //     this.active = false;
    // }

    indexX(cell) {
        return Math.floor((this.position.x - cell.region.left) / cell.h);
    }

    indexY(cell) {
        return Math.floor((this.position.y - cell.region.bottom) / cell.h);
    }

    indexCell(cell) {
        return this.indexX(cell) + this.indexY(cell) * cell.nx;
    }

    forNeighbor(cell, func) {
        const indexX = this.indexX(cell);
        const indexY = this.indexY(cell);

        for (let i = indexX - 1; i <= indexX + 1; i++) {
            if (i < 0 || i >= cell.nx) continue;

            for (let j = indexY - 1; j <= indexY + 1; j++) {
                if (j < 0 || j >= cell.ny) continue;
                const indexCell = i + j * cell.nx;

                for (let k = 0, n = cell.bucket[indexCell].length; k < n; k++) {
                    const pNeighbor = cell.bucket[indexCell][k];
                    const rv = this.position.subClone(pNeighbor.position);
                    if (rv.magnitude() >= cell.h) continue;

                    func(pNeighbor, rv);
                }
            }
        }
    }
}

class Spring {
    constructor(p1, p2, length) {
        this.p1 = p1;
        this.p2 = p2;
        this.length = length;
    }

    calcForce() {
        const sub = this.p1.position.subClone(this.p2.position);
        const length = sub.magnitude();
        const lx = (length - this.length) * (sub.x / length);
        const ly = (length - this.length) * (sub.y / length);
        const v = this.p1.velocity.subClone(this.p2.velocity);
        this.p1.velocity2.x -= (lx * k + b * v.x) / (1);
        this.p1.velocity2.y -= (ly * k + b * v.y) / (1);
        this.p2.velocity2.x += (lx * k + b * v.x) / (1);
        this.p2.velocity2.y += (ly * k + b * v.y) / (1);
        // console.log(this.p1.force, this.p2.force);
    }
}

class Cell {
    constructor(region, h) {
        this.h = h;
        this.nx = Math.ceil(region.width / this.h);
        this.ny = Math.ceil(region.height / this.h);
        this.bucket = new Array(this.nx * this.ny);
        this.region = region;
    }

    init(region, h) {
        this.h = h;
        this.nx = Math.ceil(region.width / this.h);
        this.ny = Math.ceil(region.height / this.h);
        this.bucket = new Array(this.nx * this.ny);
        this.region = region;
    }

    clear() {
        for (let i = 0, n = this.bucket.length; i < n; i++) {
            this.bucket[i] = [];
        }
    }

    add(p) {
        for (let i = 0, n = p.length; i < n; i++) {
            this.bucket[p[i].indexCell(this)].push(p[i]);
        }
    }
}

class Rectangle {
    constructor(x, y, width, height) {
        this.width = width;
        this.height = height;
        this.left = x;
        this.right = x + width;
        this.bottom = y;
        this.top = y + height;
    }

    init(x, y, width, height) {
        this.width = width;
        this.height = height;
        this.left = x;
        this.right = x + width;
        this.bottom = y;
        this.top = y + height;
    }
}

class Kernel {
    constructor(h) {
        this.h = h;
        this.alpha = 4 / (Math.PI * Math.pow(h, 8));
    }

    init(h) {
        this.h = h;
        this.alpha = 4 / (Math.PI * Math.pow(h, 8));
    }

    kernel(r) {
        if (r < this.h) {
            return this.alpha * Math.pow(this.h * this.h - r * r, 3);
        } else {
            return 0;
        }
    }

    gradient(rv) {
        const r = rv.magnitude();
        if (r < this.h) {
            const c = -6 * this.alpha * Math.pow(this.h * this.h - r * r, 2);
            return new Vector(c * rv.x, c * rv.y);
        } else {
            return new Vector();
        }
    }
}

class ParticleGroup {
    constructor(radius, density, viscosity) {
        this.radius = radius || 0.025;
        this.density = density || 1000;
        this.viscosity = viscosity || 1;
        this.particles = new Array();
    }
}




const gui = new lil.GUI();

const GUIControls = {
    particleSize: 0.06,
    stiffness: 100,
    density0: 1000,
    viscosity: 4,
    iterationNum: 3,
    grabScale: 6,
    grvForce: 9.8 * 0.5,
    isRun: true,
    reset: function () { reset() }
}

GUIControls.timeDelta = GUIControls.particleSize * 0.1;

let cellSize = GUIControls.particleSize * 1.5;
let massParticle = (GUIControls.particleSize ** 2) * GUIControls.density0;
const w = new Kernel(cellSize);
const grv = new Vector(0, 0 - GUIControls.grvForce);
// const iterationNum = Math.floor((1 / 60) / timeDelta);

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
c.width = canvasWidth;
c.height = canvasHeight;
let calcSpace = new Rectangle(0, 0, 1, 1);
calcSpace.init(0, 0, canvasWidth / canvasHeight, 1);
let simLeft = GUIControls.particleSize;
let simRight = calcSpace.width - GUIControls.particleSize;
let simTop = calcSpace.height - GUIControls.particleSize;
let simBottom = GUIControls.particleSize; 2
let cell = new Cell(calcSpace, cellSize);
let grabScaleRange = GUIControls.grabScale * cell.h * c.height;
let grabRange = GUIControls.grabScale * cell.h;
let grabRange2 = grabRange * grabRange
let range = GUIControls.grabScale * 2 + 1, loopNum = GUIControls.grabScale;
let grabPower = 0.2 / grabRange;

window.addEventListener("resize", function () {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    c.width = canvasWidth;
    c.height = canvasHeight;
    calcSpace.init(0, 0, canvasWidth / canvasHeight, 1);
    simLeft = GUIControls.particleSize;
    simRight = calcSpace.width - GUIControls.particleSize;
    simTop = calcSpace.height - GUIControls.particleSize;
    simBottom = GUIControls.particleSize;
    cellSize = GUIControls.particleSize * 1.5;
    cell.init(calcSpace, cellSize);
    w.init(cellSize)
    grabScaleRange = GUIControls.grabScale * cell.h * c.height;
    grabRange = GUIControls.grabScale * cell.h;
    grabRange2 = grabRange * grabRange
    range = GUIControls.grabScale * 2 + 1, loopNum = GUIControls.grabScale;
})

let p = [];
let particles = new Rectangle(calcSpace.width * 0.05, 0, calcSpace.width * 0.3, 1);
// let particles2 = new Rectangle(calcSpace.width * 0.7, 0, calcSpace.width * 0.3, 1);
createParticle(p, particles);
// createParticle(p, particles2);

const k = 3.0;
const b = 0.05;
const springsId = [0, 5, 5, 10, 10, 15, 15, 20, 1, 6, 6, 11, 11, 16, 16, 21, 2, 7, 7, 12, 12, 17, 17, 22, 3, 8, 8, 13, 13, 18, 18, 23, 4, 9, 9, 14, 14, 19, 19, 24, 0, 1, 1, 2, 2, 3, 3, 4, 5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 11, 12, 12, 13, 13, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 21, 22, 22, 23, 23, 24, 0, 6, 1, 7, 2, 8, 3, 9, 5, 11, 6, 12, 7, 13, 8, 14, 10, 16, 11, 17, 12, 18, 13, 19, 15, 21, 16, 22, 17, 23, 18, 24, 1, 5, 2, 6, 3, 7, 4, 8, 6, 10, 7, 11, 8, 12, 9, 13, 11, 15, 12, 16, 13, 17, 14, 18, 16, 20, 17, 21, 18, 22, 19, 23];
const springs = [];
for (let i = 0; i < 80; i += 2) {
    console.log(springsId[i], springsId[i + 1]);
    springs.push(new Spring(p[springsId[i]], p[springsId[i + 1]], GUIControls.particleSize));
}
for (let i = 80; i < springsId.length; i += 2) {
    console.log(springsId[i], springsId[i + 1]);
    springs.push(new Spring(p[springsId[i]], p[springsId[i + 1]], GUIControls.particleSize * Math.sqrt(2)));
}

GUIControls.particlesNum = String(p.length);
gui.add(GUIControls, "particlesNum").listen();
gui.add(GUIControls, "particleSize", 0.01, 0.1, 0.001).listen();
gui.add(GUIControls, "stiffness", 10, 150, 5);
gui.add(GUIControls, "density0", 500, 1500, 10);
gui.add(GUIControls, "viscosity", 1, 10, 0.1);
gui.add(GUIControls, "timeDelta", 0.0001, 0.01, 0.0001).listen();
gui.add(GUIControls, "iterationNum", 1, 10, 1);
gui.add(GUIControls, "grabScale", 1, 100, 1).onChange(e => {
    grabScaleRange = e * cell.h * c.height;
    grabRange = e * cell.h;
    grabRange2 = grabRange * grabRange
    range = e * 2 + 1, loopNum = e;
    grabPower = 3 / e;
});
gui.add(GUIControls, "grvForce", 0, 20, 0.01);
gui.add(GUIControls, "isRun");
gui.add(GUIControls, "reset");

function setParam() {
    massParticle = (GUIControls.particleSize ** 2) * GUIControls.density0;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    c.width = canvasWidth;
    c.height = canvasHeight;
    calcSpace.init(0, 0, canvasWidth / canvasHeight, 1);
    p = [];
    particles = new Rectangle(calcSpace.width * 0.05, 0, calcSpace.width * 0.3, 1);
    // particles2 = new Rectangle(calcSpace.width * 0.7, 0, calcSpace.width * 0.3, 1);
    createParticle(p, particles);
    // createParticle(p, particles2);
    const springs = [];
    for (let i = 0; i < springsId.length; i += 2) {
        springs.push(new Spring(p[springsId[i]], p[springsId[i + 1]], 0.01));
    }

    simLeft = GUIControls.particleSize;
    simRight = calcSpace.width - GUIControls.particleSize;
    simTop = calcSpace.height - GUIControls.particleSize;
    simBottom = GUIControls.particleSize; 2
    grabScaleRange = GUIControls.grabScale * cell.h * c.height;
    grabRange = GUIControls.grabScale * cell.h;
    grabRange2 = grabRange * grabRange
    range = GUIControls.grabScale * 2 + 1, loopNum = GUIControls.grabScale;
    grabPower = 0.2 / grabRange;
    w.init(cellSize)
    cellSize = GUIControls.particleSize * 1.5;
    cell.init(calcSpace, cellSize);
    GUIControls.timeDelta = GUIControls.particleSize * 0.1;
    GUIControls.particlesNum = String(p.length);

    console.log("reset")
}

let time = 0;
let flipForce = 1;
let deviceMotion = new Array(2);

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);


let mouse = {
    eventTarget: null,
    x: 0,
    y: 0,
    fx: 0,
    fy: 0,
    isPressed: false,
    isRightClick: false
}

c.addEventListener("mousedown", function (e) {
    e.preventDefault();
    mDown(e)
})
c.addEventListener("mousemove", function (e) {
    e.preventDefault();
    mMove(e)
})
c.addEventListener("mouseup", function (e) {
    e.preventDefault();
    mUp();
})
c.addEventListener("touchstart", function (e) {
    e.preventDefault();
    mDown(e.changedTouches[0])
})
c.addEventListener("touchmove", function (e) {
    e.preventDefault();
    mMove(e.changedTouches[0])
})
c.addEventListener("touchend", function (e) {
    e.preventDefault();
    mUp();
})
c.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    flipForce = -flipForce;
})
window.addEventListener("devicemotion", function (e) {
    deviceMotion = [true, e.accelerationIncludingGravity];
})

function mDown(m) {
    mouse.x = m.pageX / canvasHeight;
    mouse.y = calcSpace.height - m.pageY / canvasHeight;
    mouse.fx = 0;
    mouse.fy = 0;
    mouse.isPressed = true;
}
function mMove(m) {
    mouse.fx = mouse.x - m.pageX / canvasHeight;
    mouse.fy = mouse.y - (calcSpace.height - m.pageY / canvasHeight);
    mouse.x = m.pageX / canvasHeight;
    mouse.y = calcSpace.height - m.pageY / canvasHeight;
    mouse.eventTarget = m;
}
function mUp() {
    mouse.eventTarget = null;
    mouse.isPressed = false;
}

function createParticle(p, region) {
    // const nx = Math.round(region.width / GUIControls.particleSize);
    // const ny = Math.round(region.height / GUIControls.particleSize);
    const nx = 5;
    const ny = 5;
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const x = region.left + (i + 0.5) * GUIControls.particleSize;
            const y = region.bottom + (j + 0.5) * GUIControls.particleSize;

            p.push(new Particle(x, y));
        }
    }
};

function setParticleToCell() {
    cell.clear();
    cell.add(p);
    // cell.add(pWall);
}

function densityPressure() {
    //密度を計算する
    // 周囲と自分の密度が一定になるようにする 
    function calcDP(p) {
        for (let i = 0, n = p.length; i < n; i++) {
            //if (!p[i].active) continue;

            let density = 0;
            p[i].forNeighbor(cell, function (pNeighbor, rv) {
                density += w.kernel(rv.magnitude()) * massParticle;
            });
            p[i].density = density;
            p[i].pressure = Math.max(GUIControls.stiffness * (p[i].density - GUIControls.density0), 0);
        }
    };

    calcDP(p);
    // calcDP(pWall);
}

function particleForce() {
    for (let i = 0, n = p.length; i < n; i++) {
        //if (!p[i].active) continue;

        const force = new Vector();

        p[i].forNeighbor(cell, function (pNeighbor, rv) {
            if (p[i] !== pNeighbor) {
                const r = rv.magnitude();

                // 圧力項
                const wp = w.gradient(rv);
                const fp = (0 - massParticle)
                    * (pNeighbor.pressure / (pNeighbor.density * pNeighbor.density)
                        + p[i].pressure / (p[i].density * p[i].density));
                force.x += wp.x * fp;
                force.y += wp.y * fp;

                // 粘性項
                const dv = p[i].velocity.subClone(pNeighbor.velocity);
                const fv = massParticle * 2 * GUIControls.viscosity / (pNeighbor.density * p[i].density) * rv.dot(wp) / (r * r + 0.01 * cellSize * cellSize);
                force.x += fv * dv.x;
                force.y += fv * dv.y;
            }
        });

        // 重力
        force.x += grv.x;
        force.y += grv.y;

        // 力の更新
        p[i].force.x = force.x;
        p[i].force.y = force.y;
    }
}

function update(iterNum) {
    for (let j = 0; j < iterNum; j++) {
        time += GUIControls.timeDelta;

        setParticleToCell();
        densityPressure();
        particleForce();

        for (let i = 0, n = springs.length; i < n; i++) {
            springs[i].calcForce();
        }

        for (let i = 0, n = p.length; i < n; i++) {
            //if (!p[i].active) continue;

            p[i].velocity2.x += p[i].force.x * GUIControls.timeDelta;
            p[i].velocity2.y += p[i].force.y * GUIControls.timeDelta;

            p[i].position.x += p[i].velocity2.x * GUIControls.timeDelta;
            p[i].position.y += p[i].velocity2.y * GUIControls.timeDelta;

            if (p[i].position.y < simBottom || p[i].position.y > simTop) {
                p[i].velocity2.y = -p[i].velocity2.y;
            }
            if (p[i].position.x < simLeft || p[i].position.x > simRight) {
                p[i].velocity2.x = -p[i].velocity2.x;
            }
            p[i].position.x = Math.min(simRight, Math.max(p[i].position.x, simLeft));
            p[i].position.y = Math.min(simTop, Math.max(p[i].position.y, simBottom));

            p[i].velocity.x = p[i].velocity2.x + 0.5 * p[i].force.x * GUIControls.timeDelta;
            p[i].velocity.y = p[i].velocity2.y + 0.5 * p[i].force.y * GUIControls.timeDelta;
        }
    }
}

function draw() {
    ctx.strokeStyle = "white";
    ctx.fillStyle = "blue";
    
    function drawArc(p, scaleX, scaleY, d) {
        for (let i = 0, n = p.length; i < n; i++) {
            // if(!p[i].active) continue;
            const arcSize = d / 4;
            const x = (p[i].position.x - calcSpace.left) * scaleX;
            const y = canvasHeight - (p[i].position.y - calcSpace.bottom) * scaleY;
            // ctx.fillStyle = "hsl(" + (220 - p[i].pressure / 100) + ", 80%, 40%)";
            ctx.beginPath();
            ctx.arc(x, y, arcSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        };
    };

    
    const scaleX = canvasWidth / calcSpace.width;
    const scaleY = canvasHeight / calcSpace.height;
    const d = GUIControls.particleSize * scaleY;
    
    // ctx.fillStyle = "#00FFFF";
    drawArc(p, scaleX, scaleY, d);
    
    for (let i = 0, n = springs.length; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(springs[i].p1.position.x * scaleX, (1 - springs[i].p1.position.y) * scaleY);
        ctx.lineTo(springs[i].p2.position.x * scaleX, (1 - springs[i].p2.position.y) * scaleY);
        ctx.stroke();
        ctx.closePath();
    }
}


function reset() {
    time = 0;
    setParam();
    ctx.clearRect(0, 0, c.width, c.height);
    draw();
}

function setup() {
    time = 0;
    ctx.clearRect(0, 0, c.width, c.height);
    draw();
}

function grabParticles() {
    const mxIndex = Math.floor((mouse.x - cell.region.left) / cell.h);
    const myIndex = Math.floor((mouse.y - cell.region.bottom) / cell.h);
    for (let i = mxIndex - loopNum; i <= mxIndex + loopNum; i++) {
        if (i < 0 || i >= cell.nx) continue;

        for (let j = myIndex - loopNum; j <= myIndex + loopNum; j++) {
            if (j < 0 || j >= cell.ny) continue;
            const cellPos = i + j * cell.nx;

            for (let k = 0, n = cell.bucket[cellPos].length; k < n; k++) {
                const pNeighbor = cell.bucket[cellPos][k];
                const dx = mouse.x - pNeighbor.position.x;
                const dy = mouse.y - pNeighbor.position.y;
                if (dx * dx + dy * dy > grabRange2) continue;
                const vacuumVector = new Vector(dx, dy);
                vacuumVector.times(GUIControls.iterationNum * grabPower * flipForce);
                pNeighbor.velocity2.add(vacuumVector);
            }
        }
    }
}

let ms = new Array(20);
function render() {

    if (GUIControls.isRun) {
        stats.begin();
        ctx.clearRect(0, 0, c.width, c.height);

        if (deviceMotion[0]) {
            grv.x = deviceMotion[1].x;
            grv.y = deviceMotion[1].y;
            grv.normalize();
            grv.times(0 - GUIControls.grvForce);
        }

        update(GUIControls.iterationNum);
        if (mouse.isPressed) {
            grabParticles();

            ctx.beginPath();
            if (flipForce == 1) {
                ctx.strokeStyle = "#22BC46";
            } else {
                ctx.strokeStyle = "#B92121";
            }
            ctx.lineWidth = 1;
            ctx.arc(mouse.x * c.height, c.height * (1 - mouse.y), grabScaleRange, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
        }
        draw();

        stats.end();
    }

    requestAnimationFrame(render);
};

setup();
render();
