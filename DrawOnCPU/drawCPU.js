"use strict";
const c = document.querySelector("canvas");
const ctx = c.getContext("2d");

// vector class
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
        if (length === 0) {
            this.x = 1;
            this.y = 1;
        }
        this.x /= length;
        this.y /= length;
    }


    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
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

}


// particles
class Particle {
    constructor(x = 0, y = 0) {
        this.position = new Vector(x, y);
        this.velocity = new Vector();
        this.force = new Vector();
        this.pressure = 0;
        this.density = 0;
        // this.active = true;
    }

    // remove() {
    //     this.active = false;
    // }

    indexCell(cell) {
        return Math.floor((this.position.x - cell.region.left) / cell.h) + Math.floor((this.position.y - cell.region.bottom) / cell.h) * cell.nx;
    }


    forNeighbor(cell, func) {
        const indexCell = this.indexCell(cell);

        for (let i = 0; i < cell.bucketNeighbor[indexCell].length; i++) {
            for (let j = 0; j < cell.bucket[cell.bucketNeighbor[indexCell][i]].length; j++) {
                const pNeighbor = cell.bucket[cell.bucketNeighbor[indexCell][i]][j];
                const rv = this.position.sub(pNeighbor.position);
                const rvm = rv.magnitude();
                if (rvm >= cell.h) continue;

                func(pNeighbor, rv, rvm);
            }
        }
    }

}


// spring for elastic body
class Spring {
    constructor(p1, p2, length) {
        this.p1 = p1;
        this.p2 = p2;
        this.length = length;
        this.maxLength = this.length * 2;
        this.active = true;
    }


    remove() {
        this.active = false;
    }


    calcForce() {
        // a = − (k ⁄ m) * x − (b ⁄ m) * v
        const sub = this.p1.position.sub(this.p2.position);
        const length = sub.magnitude();
        if (length > this.maxLength) {
            this.active = false;
        }
        const lx = (length - this.length) * (sub.x / length);
        const ly = (length - this.length) * (sub.y / length);
        const v = this.p1.velocity.sub(this.p2.velocity);
        this.p1.velocity.x -= (lx * k + b * v.x);
        this.p1.velocity.y -= (ly * k + b * v.y);
        this.p2.velocity.x += (lx * k + b * v.x);
        this.p2.velocity.y += (ly * k + b * v.y);
    }
}


// cell for neighbor search
class Cell {
    constructor(region, h) {
        this.h = h;
        this.nx = Math.ceil(region.width / this.h);
        this.ny = Math.ceil(region.height / this.h);
        this.bucket = new Array(this.nx * this.ny);
        this.region = region;
        this.bucketNeighbor = new Array(this.bucket.length);
        this.neighborCellPos = [
            this.nx - 1, this.nx, this.nx + 1,
            -1, 0, 1,
            -this.nx - 1, -this.nx, 1 - this.nx
        ]
        for (let i = 0, n = this.bucketNeighbor.length; i < n; i++) {
            this.bucketNeighbor[i] = [];
        }
        for (let k = 0, n = this.bucketNeighbor.length; k < n; k++) {
            const index = indexCell2Pos(k, this.nx, this.ny);
            const indexX = index.x;
            const indexY = index.y;
            for (let i = indexX - 1; i <= indexX + 1; i++) {
                if (i < 0 || i >= this.nx) continue;

                for (let j = indexY - 1; j <= indexY + 1; j++) {
                    if (j < 0 || j >= this.ny) continue;
                    const indexCell = i + j * this.nx;

                    this.bucketNeighbor[k].push(indexCell);
                }
            }
        }
    }

    init(region, h) {
        this.h = h;
        this.nx = Math.ceil(region.width / this.h);
        this.ny = Math.ceil(region.height / this.h);
        this.bucket = new Array(this.nx * this.ny);
        this.region = region;
        this.bucketNeighbor = new Array(this.bucket.length);
        this.neighborCellPos = [
            this.nx - 1, this.nx, this.nx + 1,
            -1, 0, 1,
            -this.nx - 1, -this.nx, 1 - this.nx
        ]
        for (let i = 0, n = this.bucketNeighbor.length; i < n; i++) {
            this.bucketNeighbor[i] = [];
        }
        for (let k = 0, n = this.bucketNeighbor.length; k < n; k++) {
            const index = indexCell2Pos(k, this.nx, this.ny);
            const indexX = index.x;
            const indexY = index.y;
            for (let i = indexX - 1; i <= indexX + 1; i++) {
                if (i < 0 || i >= this.nx) continue;

                for (let j = indexY - 1; j <= indexY + 1; j++) {
                    if (j < 0 || j >= this.ny) continue;
                    const indexCell = i + j * this.nx;

                    this.bucketNeighbor[k].push(indexCell);
                }
            }
        }
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

function indexCell2Pos(indexCell, nx, ny) {
    const x = indexCell % nx;
    const y = Math.floor(indexCell / nx);
    return { x: x, y: y }
}

// rect region
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


// wPoly6 Kernel
class Poly6 {
    constructor(h) {
        this.h = h;
        this.alpha = 4 / (PI * Math.pow(h, 8));
    }


    init(h) {
        this.h = h;
        this.alpha = 4 / (PI * Math.pow(h, 8));
    }


    kernel(r) {
        return this.alpha * Math.pow(this.h * this.h - r * r, 3);
    }


    gradient(rv, rvm) {
        const c = -6 * this.alpha * Math.pow(this.h * this.h - rvm * rvm, 2);
        return new Vector(c * rv.x, c * rv.y);
    }


    laplacian(rv, rvm) {
        const c = -6 * this.alpha * 3 * Math.pow(this.h * this.h - rvm * rvm, 2) - 4 * rvm * rvm * Math.pow(this.h * this.h - rvm * rvm, 2);
        return new Vector(c * rv.x, c * rv.y);
    }
}

const gui = new lil.GUI();


const PI = Math.PI;
const sqrt2 = Math.sqrt(2);
// set parameters
const GUIControls = {
    particleSize: 0.03,
    stiffness: 100,
    density0: 1000,
    viscosity: 4,
    iterationNum: 3,
    grabScale: 6,
    grvForce: 9.8,
    isRun: true,
    reset: function () { reset() }
}
GUIControls.timeDelta = GUIControls.particleSize * 0.1;
let cellSize = GUIControls.particleSize * 1.5;
let massParticle = (GUIControls.particleSize ** 2) * GUIControls.density0;
const wPoly6 = new Poly6(cellSize);
const grv = new Vector(0, -GUIControls.grvForce * 0.5);
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
c.width = canvasWidth;
c.height = canvasHeight;
let calcSpace = new Rectangle(0, 0, 1, 1);
calcSpace.init(0, 0, canvasWidth / canvasHeight, 1);
let simMargin = GUIControls.particleSize / 2;
let simLeft = simMargin;
let simRight = calcSpace.width - simMargin;
let simTop = calcSpace.height - simMargin;
let simBottom = simMargin;
let cell = new Cell(calcSpace, cellSize);
cell.clear();
let grabScaleRange = GUIControls.grabScale * cell.h * c.height;
let grabRange = GUIControls.grabScale * cell.h;
let grabRange2 = grabRange * grabRange
let range = GUIControls.grabScale * 2 + 1, loopNum = GUIControls.grabScale;
let grabPower = 0.15 / grabRange;
window.addEventListener("resize", function () {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    c.width = canvasWidth;
    c.height = canvasHeight;
    calcSpace.init(0, 0, canvasWidth / canvasHeight, 1);
    simMargin = GUIControls.particleSize / 2;
    simLeft = simMargin;
    simRight = calcSpace.width - simMargin;
    simTop = calcSpace.height - simMargin;
    simBottom = simMargin;
    cellSize = GUIControls.particleSize * 1.5;
    cell.init(calcSpace, cellSize);
    cell.clear();
    wPoly6.init(cellSize);
    grabScaleRange = GUIControls.grabScale * cell.h * c.height;
    grabRange = GUIControls.grabScale * cell.h;
    grabRange2 = grabRange * grabRange
    range = GUIControls.grabScale * 2 + 1, loopNum = GUIControls.grabScale;
})


// k : spring constant, b : damping constant
const k = 10.0;
const b = 0.05;


let p = [];
let springs = [];


createParticleRect(p, 0, 0, calcSpace.width * 0.5, 0.8);
// createElasticCircle(p, springs, 0.5, 0.5, 0.3);


function sortFunc(a, b) {
    return a - b;
}
function sortFunc2(a, b) {
    return a[0] - b[0];
}

function createParticleRect(p, x, y, w, h) {
    const nx = Math.round(w / GUIControls.particleSize);
    const ny = Math.round(h / GUIControls.particleSize);
    cell.clear();
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const px = x + (i + 0.5) * GUIControls.particleSize;
            const py = y + (j + 0.5) * GUIControls.particleSize;
            // if (!isSimArea(px, py)) continue;


            p.push(new Particle(px, py));
        }
    }
};

function createElasticRect(p, s, x, y, w, h) {
    const nx = Math.round(w / GUIControls.particleSize);
    const ny = Math.round(h / GUIControls.particleSize);
    // const nx = 25;
    // const ny = 25;
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const px = x + (i + 0.5) * GUIControls.particleSize;
            const py = y + (j + 0.5) * GUIControls.particleSize;
            // if (!isSimArea(px, py)) continue;


            p.push(new Particle(px, py));
        }
    }
    let springsIdHV = [];
    let springsIdD = [];
    // Vertical springsID
    for (let i = 0; i < ny; i++) {
        for (let j = 0; j < nx - 1; j++) {
            springsIdHV.push(ny * j + i, ny * (j + 1) + i);
        }
    }
    // Horizontal springsID
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny - 1; j++) {
            springsIdHV.push(j + i * ny, j + 1 + i * ny);
        }
    }
    // Diagonal springsID
    for (let i = 0; i < nx - 1; i++) {
        for (let j = 0; j < ny - 1; j++) {
            springsIdD.push(j + i * ny, j + ny + 1 + i * ny);
            springsIdD.push(j + 1 + i * ny, j + ny + i * ny);
        }
    }


    // create springs
    for (let i = 0, n = springsIdHV.length; i < n; i += 2) {
        s.push(new Spring(p[springsIdHV[i]], p[springsIdHV[i + 1]], GUIControls.particleSize));
    }
    for (let i = 0, n = springsIdD.length; i < n; i += 2) {
        s.push(new Spring(p[springsIdD[i]], p[springsIdD[i + 1]], GUIControls.particleSize * sqrt2));
    }
}

function createElasticCircle(p, s, x, y, r) {
    const nx = Math.round((2 * r) / GUIControls.particleSize);
    let pCount = 0;
    let tSpringIdVH = [];
    let tSpringIdD = [];
    let springIdVH = [];
    let springIdD = [];
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < nx; j++) {
            const px = x - r + (i + 0.5) * GUIControls.particleSize;
            const py = y - r + (j + 0.5) * GUIControls.particleSize;


            if (((px - x) * (px - x) + (py - y) * (py - y)) <= r * r) {
                if (!isSimArea(px, py)) continue;
                p.push(new Particle(px, py));
                pCount++;
            }
        }
    }


    cell.clear();
    cell.add(p);


    for (let i = 0, n = p.length; i < n; i++) {
        p[i].forNeighbor(cell, function (pNeighbor, rv, rvm) {
            if (Math.abs(rvm - GUIControls.particleSize * sqrt2) < 0.001) {
                tSpringIdD.push([p.indexOf(p[i]), p.indexOf(pNeighbor)]);
            } else if (Math.abs(rvm - GUIControls.particleSize) < 0.001) {
                tSpringIdVH.push([p.indexOf(p[i]), p.indexOf(pNeighbor)]);
            }
        });
    }
    tSpringIdVH.forEach(e => {
        e.sort(sortFunc);
    });
    tSpringIdD.forEach(e => {
        e.sort(sortFunc);
    });
    for (let i = 0, n = tSpringIdVH.length; i < n; i++) {
        tSpringIdVH[i] = tSpringIdVH[i][0] + "," + tSpringIdVH[i][1];
    }
    for (let i = 0, n = tSpringIdD.length; i < n; i++) {
        tSpringIdD[i] = tSpringIdD[i][0] + "," + tSpringIdD[i][1];
    }
    tSpringIdVH = (Array.from(new Set(tSpringIdVH)));
    tSpringIdD = (Array.from(new Set(tSpringIdD)));
    for (let i = 0, n = tSpringIdVH.length; i < n; i++) {
        tSpringIdVH[i] = tSpringIdVH[i].split(",");
        springIdVH.push(Number(tSpringIdVH[i][0]), Number(tSpringIdVH[i][1]))
    }
    for (let i = 0, n = tSpringIdD.length; i < n; i++) {
        tSpringIdD[i] = tSpringIdD[i].split(",");
        springIdD.push(Number(tSpringIdD[i][0]), Number(tSpringIdD[i][1]))
    }


    for (let i = 0, n = springIdVH.length; i < n; i += 2) {
        s.push(new Spring(p[springIdVH[i]], p[springIdVH[i + 1]], GUIControls.particleSize));
    }
    for (let i = 0, n = springIdD.length; i < n; i += 2) {
        s.push(new Spring(p[springIdD[i]], p[springIdD[i + 1]], GUIControls.particleSize * sqrt2));
    }
}

function isSimArea(x, y) {
    if (x < simLeft || x > simRight || y < simBottom || y > simTop) {
        return false;
    }
    return true;
}


GUIControls.particlesNum = String(p.length);
gui.add(GUIControls, "particlesNum").listen();
gui.add(GUIControls, "particleSize", 0.01, 0.1, 0.001).listen();
gui.add(GUIControls, "stiffness", 10, 150, 1);
gui.add(GUIControls, "density0", 500, 2000, 10);
gui.add(GUIControls, "viscosity", 0.1, 10, 0.1);
gui.add(GUIControls, "timeDelta", 0.0001, 0.01, 0.0001).listen();
gui.add(GUIControls, "iterationNum", 1, 10, 1);
gui.add(GUIControls, "grabScale", 1, 100, 1).onChange(e => {
    grabScaleRange = e * cell.h * c.height;
    grabRange = e * cell.h;
    grabRange2 = grabRange * grabRange
    range = e * 2 + 1, loopNum = e;
    grabPower = 3 / e;
});
gui.add(GUIControls, "grvForce", 0, 20, 0.01).onChange(e => {
    grv.y = -GUIControls.grvForce * 0.5;
});
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
    springs = [];
    createParticleRect(p, 0, 0, calcSpace.width * 0.5, 0.8);


    simMargin = GUIControls.particleSize / 2;
    simLeft = simMargin;
    simRight = calcSpace.width - simMargin;
    simTop = calcSpace.height - simMargin;
    simBottom = simMargin;
    grabScaleRange = GUIControls.grabScale * cell.h * c.height;
    grabRange = GUIControls.grabScale * cell.h;
    grabRange2 = grabRange * grabRange
    range = GUIControls.grabScale * 2 + 1, loopNum = GUIControls.grabScale;
    grabPower = 0.2 / grabRange;
    cellSize = GUIControls.particleSize * 1.5;
    cell.init(calcSpace, cellSize);
    cell.clear();
    wPoly6.init(cellSize);
    GUIControls.timeDelta = GUIControls.particleSize * 0.1;
    GUIControls.particlesNum = String(p.length);


    // grv.x = 0;
    // grv.y = -GUIControls.grvForce;
}

let flipForce = 1;
let deviceMotion = new Array(2);


// const stats = new Stats();
// stats.showPanel(0);
// document.body.appendChild(stats.dom);

ctx.font = "16px serif";

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
let canUseDeviceMotion = false;
window.addEventListener("devicemotion", function (e) {
    deviceMotion = [true, e.accelerationIncludingGravity];
    if (e.accelerationIncludingGravity.x != null) {
        canUseDeviceMotion = true;
    }
})


function mDown(m) {
    mouse.x = m.pageX / canvasHeight;
    mouse.y = calcSpace.height - m.pageY / canvasHeight;
    // mouse.fx = 0;
    // mouse.fy = 0;
    mouse.isPressed = true;
}
function mMove(m) {
    // mouse.fx = m.pageX / canvasHeight - mouse.x;
    // mouse.fy = (calcSpace.height - m.pageY / canvasHeight) - mouse.y;
    mouse.x = m.pageX / canvasHeight;
    mouse.y = calcSpace.height - m.pageY / canvasHeight;
    mouse.eventTarget = true;
}
function mUp() {
    mouse.eventTarget = null;
    mouse.isPressed = false;
}


// update simulation
function update(iterNum) {
    for (let j = 0; j < iterNum; j++) {
        cell.clear();
        cell.add(p);

        // calculate density
        springs.forEach(e => {
            e.calcForce();
        })

        // calculate density
        p.forEach(e => {
            let density = 0;
            e.forNeighbor(cell, function (pNeighbor, rv, rvm) {
                density += wPoly6.kernel(rvm) * massParticle;
            });
            e.density = density;
            e.pressure = Math.max(GUIControls.stiffness * (e.density - GUIControls.density0), 0);
        });

        // calculate force
        p.forEach(e => {
            const force = new Vector();
            e.forNeighbor(cell, function (pNeighbor, rv, rvm) {
                const wp = wPoly6.gradient(rv, rvm);
                const fp = (0 - massParticle) * (pNeighbor.pressure / (pNeighbor.density ** 2) + e.pressure / (e.density ** 2));
                const dv = e.velocity.sub(pNeighbor.velocity);
                const fv = massParticle * 2 * GUIControls.viscosity / (pNeighbor.density * e.density) * rv.dot(wp) / (rvm * rvm + 0.01 * cellSize * cellSize);
                force.x += wp.x * fp + fv * dv.x;
                force.y += wp.y * fp + fv * dv.y;
            });
            force.x += grv.x;
            force.y += grv.y;
            e.force.x = force.x;
            e.force.y = force.y;
        });

        p.forEach(e => {
            e.velocity.x += e.force.x * GUIControls.timeDelta;
            e.velocity.y += e.force.y * GUIControls.timeDelta;
            e.position.x += (e.velocity.x + 0.5 * e.force.x * GUIControls.timeDelta) * GUIControls.timeDelta;
            e.position.y += (e.velocity.y + 0.5 * e.force.y * GUIControls.timeDelta) * GUIControls.timeDelta;
            if (e.position.y < simBottom || e.position.y > simTop) {
                e.velocity.y = -e.velocity.y;
            }
            if (e.position.x < simLeft || e.position.x > simRight) {
                e.velocity.x = -e.velocity.x;
            }
            e.position.x = Math.min(simRight, Math.max(e.position.x, simLeft));
            e.position.y = Math.min(simTop, Math.max(e.position.y, simBottom));
        });
    }
}


function drawArc(p, scaleX, scaleY, d) {
    for (let i = 0, n = p.length; i < n; i++) {
        // if(!p[i].active) continue;
        const arcSize = d / 4;
        const x = (p[i].position.x - calcSpace.left) * scaleX;
        const y = canvasHeight - (p[i].position.y - calcSpace.bottom) * scaleY;


        // change particle color according to the particle's pressure
        ctx.fillStyle = "hsl(" + (220 - p[i].pressure / 100) + ", 80%, 40%)";
        ctx.beginPath();
        ctx.arc(x, y, arcSize, 0, PI * 2);
        ctx.fill();
        // ctx.fillRect(x - arcSize, y - arcSize, arcSize * 2, arcSize * 2);
        ctx.closePath();
    };
};


function draw() {
    ctx.strokeStyle = "white";
    ctx.fillStyle = "blue";


    const scaleX = canvasWidth / calcSpace.width;
    const scaleY = canvasHeight / calcSpace.height;
    const d = GUIControls.particleSize * scaleY;


    drawArc(p, scaleX, scaleY, d);


    // Display Springs


    // for (let i = 0, n = springs.length; i < n; i++) {
    //     if (!springs[i].active) continue;
    //     ctx.beginPath();
    //     ctx.moveTo(springs[i].p1.position.x * scaleX, (1 - springs[i].p1.position.y) * scaleY);
    //     ctx.lineTo(springs[i].p2.position.x * scaleX, (1 - springs[i].p2.position.y) * scaleY);
    //     ctx.stroke();
    //     ctx.closePath();
    // }
}


// reset simulation
function reset() {
    setParam();
    ctx.clearRect(0, 0, c.width, c.height);
    draw();
}


// set up simulation
function setup() {
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
                vacuumVector.times(GUIControls.iterationNum * 0.6 * grabPower * flipForce);
                pNeighbor.velocity.add(vacuumVector);
            }
        }
    }
}

let msR = new Array(20);
let ms = 0;
let fps = 0;

function render() {
    if (GUIControls.isRun) {
        // stats.begin();
        const sT = performance.now();

        ctx.clearRect(0, 0, c.width, c.height);


        // deviceMotion
        if (canUseDeviceMotion && deviceMotion[0]) {
            grv.x = 0 - Math.min(1, Math.max(-1 , deviceMotion[1].x));
            grv.y = 0 - Math.min(1, Math.max(-1 , deviceMotion[1].y));
            grv.times(GUIControls.grvForce * 0.5);
        }
        // update simulation
        update(GUIControls.iterationNum);
        // add force when you grab particles
        if (mouse.isPressed) {
            grabParticles();
            ctx.beginPath();
            if (flipForce == 1) {
                ctx.strokeStyle = "#22BC46";
            } else {
                ctx.strokeStyle = "#B92121";
            }
            ctx.lineWidth = 1;
            ctx.arc(mouse.x * c.height, c.height * (1 - mouse.y), grabScaleRange, 0, PI * 2);
            ctx.stroke();
            ctx.closePath();
        }


        // render
        draw();

        // stats.end();
        const eT = performance.now();
        ms = 0;
        msR.shift();
        msR.push(eT - sT);
        msR.forEach(e => {
            ms += e;
        });
        ms /= msR.length;
        fps = Number((1000 / ms).toFixed(1));
        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.fillText(ms.toFixed(1) + " ms", 5, 16);
        if (fps < 60) {
            ctx.fillStyle = "red";
        } else if(fps >= 70) {
            ctx.fillStyle = "limegreen";
        }
        ctx.fillText(fps + " fps", 5, 32);
        ctx.closePath();
    }


    requestAnimationFrame(render);
};


setup();
render();
