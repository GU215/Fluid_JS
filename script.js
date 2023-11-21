
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

    // sub(v) {
    //     this.x -= v.x;
    //     this.y -= v.y;
    //     return this;
    // }

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

class Particle {
    constructor(x = 0, y = 0) {
        this.position = new Vector(x, y);
        this.velocity = new Vector();
        this.velocity2 = new Vector();
        this.force = new Vector();
        this.pressure = 0;
        this.density = 0;
        this.active = true;
    }

    remove() {
        this.active = false;
    }

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
                    const rv = this.position.sub(pNeighbor.position);
                    if (rv.magnitude() >= cell.h) continue;

                    func(pNeighbor, rv);
                }
            }
        }
    }
}

class Cell {
    constructor(region, h) {
        this.h = h;
        this.nx = Math.ceil(region.width / this.h);
        this.ny = Math.ceil(region.height / this.h);
        this.bucket = new Array(this.nx * this.ny);
        this.region = region;
        this.maxIndex = this.nx * this.ny;
    }

    clear() {
        for (let i = 0, n = this.bucket.length; i < n; i++) {
            this.bucket[i] = [];
        }
    }

    add(p) {
        for (let i = 0, n = p.length; i < n; i++) {
            if (!p[i].active) continue;
            const cellPos = p[i].indexCell(this);
            // if(0 < cellPos || cellPos > this.maxIndex) continue;
            this.bucket[cellPos].push(p[i]);
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
}

class Kernel {
    constructor(h) {
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
            return new Vector(0, 0);
        }
    }
}

const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const particleSize = 0.02;
const h = particleSize * 1.5;
const stiffness = 100;
const density0 = 1000;
const viscosity = 4;
const massParticle = particleSize * particleSize * density0;
const w = new Kernel(h);
const grv = new Vector(0, -9.8);
const regionAll = new Rectangle(0, 0, 1, 1);
const thicknessWall = particleSize * 1;
const cell = new Cell(regionAll, h);
let time = 0;
const timeDelta = particleSize * 0.125;
const iterationNum = Math.round((1 / 60) / timeDelta);
// const iterationNum = 2;
const range = 7, loopNum = (range - 1) / 2;
const p = [];
const regionInitial = new Rectangle(thicknessWall, thicknessWall, 0.4,0.8);
createParticle(p, regionInitial);
const pWall = [];
const wb = new Rectangle(0, 0, 1, thicknessWall);
createParticle(pWall, wb);
const wt = new Rectangle(0, 1 - thicknessWall, 1, thicknessWall);
createParticle(pWall, wt);
const wl = new Rectangle(0, 0, thicknessWall, 1);
createParticle(pWall, wl);
const wr = new Rectangle(1 - thicknessWall, 0, thicknessWall, 1);
createParticle(pWall, wr);

const canvasWidth = 512;
const canvasHeight = 512;
let isRun = false;

let mouse = {
    eventTarget: null,
    x: 0,
    y: 0,
    fx: 0,
    fy: 0,
    isPressed: false
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
function mDown(m) {
    mouse.x = m.clientX / c.width;
    mouse.y = 1 - m.clientY / c.height;
    mouse.fx = 0;
    mouse.fy = 0;
    mouse.isPressed = true;
}
function mMove(m) {
    mouse.fx = mouse.x - m.clientX / c.width;
    mouse.fy = mouse.y - (1 - m.clientY / c.height);
    mouse.x = m.clientX / c.width;
    mouse.y = 1 - m.clientY / c.height;
    mouse.eventTarget = m;
}
function mUp() {
    mouse.eventTarget = null;
    mouse.isPressed = false;
}

function createParticle(p, region) {
    const nx = Math.round(region.width / particleSize);
    const ny = Math.round(region.height / particleSize);

    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const x = region.left + (i + 0.5) *   particleSize;
            const y = region.bottom + (j + 0.5) * particleSize;

            p.push(new Particle(x, y));
        }
    }
};

function setParticleToCell() {
    cell.clear();
    cell.add(p);
    cell.add(pWall);
}

function densityPressure() {
    //密度を計算する
    // 周囲と自分の密度が一定になるようにする 
    function calcDP(p) {
        for (let i = 0, n = p.length; i < n; i++) {
            if (!p[i].active) continue;

            let density = 0;
            p[i].forNeighbor(cell, function (pNeighbor, rv) {
                const r = rv.magnitude();
                density += w.kernel(r) * massParticle;
            });
            p[i].density = density;
            p[i].pressure = Math.max(stiffness * (p[i].density - density0), 0);
        }
    };

    calcDP(p);
    calcDP(pWall);
}

function particleForce() {
    for (let i = 0, n = p.length; i < n; i++) {
        if (!p[i].active) continue;

        let force = new Vector();

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
                const r2 = r * r + 0.01 * h * h;
                const dv = p[i].velocity.sub(pNeighbor.velocity);
                const fv = massParticle * 2 * viscosity / (pNeighbor.density * p[i].density) * rv.dot(wp) / r2;
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

function motionUpdate() {
    setParticleToCell();
    densityPressure();
    particleForce();

    for (let i = 0, n = p.length; i < n; i++) {
        if (!p[i].active) continue;
        p[i].velocity2.x += p[i].force.x * timeDelta;
        p[i].velocity2.y += p[i].force.y * timeDelta;

        p[i].position.x += p[i].velocity2.x * timeDelta;
        p[i].position.y += p[i].velocity2.y * timeDelta;

        p[i].velocity.x = p[i].velocity2.x + 0.5 * p[i].force.x * timeDelta;
        p[i].velocity.y = p[i].velocity2.y + 0.5 * p[i].force.y * timeDelta;

        if ((p[i].position.x < regionAll.left)
            || (p[i].position.y < regionAll.bottom)
            || (p[i].position.x > regionAll.right)
            || (p[i].position.y > regionAll.top)) {
            p[i].remove();
        }
    }
}

function drawParticle() {
    ctx.clearRect(0, 0, c.width, c.height);
    function drawArc(p, scale, d) {
        for (let i = 0, n = p.length; i < n; i++) {
            if (!p[i].active) continue;
            const x = (p[i].position.x - regionAll.left) * scale;
            const y = canvasHeight - (p[i].position.y - regionAll.bottom) * scale;
            // ctx.fillStyle = "hsl(" + (p[i].density - 60) + ", 100%, 70%)";
            ctx.beginPath();
            ctx.arc(x, y, d / 2, 0, Math.PI * 2);
            ctx.fill();
            // ctx.fillRect(x - d / 2, y - d / 2, d, d);
            ctx.closePath();
        }
    };

    const scale = canvasWidth / regionAll.width;
    const d = particleSize * scale;

    ctx.fillStyle = "blue"
    drawArc(p, scale, d);
    // ctx.fillStyle = "gray";
    // drawArc(pWall, scale, d);
}

function runSPH() {
    isRun = !isRun;
}

function resetSPH() {
    isRun = false;
    time = 0;
    // initializeParticle();
    drawParticle();
    runSPH();
}

function setup() {
    // setParameter();
    c.width = canvasWidth;
    c.height = canvasHeight;
    resetSPH();
    output.innerHTML = "particleSize : " + particleSize + "<br>" +
    "particleNum : " + (p.length + pWall.length) + "<br>"    
    "timeStepLength : " + timeDelta + "<br>" +
    "iterationNum : " + iterationNum + "<br>" +
    "restDensity : " + density0 + "<br>" +
    "viscosity : " + viscosity + "<br>" +
    "massParticle : " + massParticle + "<br>" +
    "gravity : Vec2(x : " + grv.x + ", y : " + grv.y + ")";
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
                const vacuumVector = new Vector(mouse.x - pNeighbor.position.x, mouse.y - pNeighbor.position.y)
                // vacuumVector.normalize();
                vacuumVector.times(iterationNum);
                pNeighbor.velocity2.add(vacuumVector);
            }
        }
    }
    // p[0].position.x = mouse.x;
    // p[0].position.y = mouse.y;
}

function render() {
    if (isRun) {
        stats.begin();

        for (let i = 0; i < iterationNum; i++) {
            time += timeDelta;
            motionUpdate();
        }
        if (mouse.isPressed) {
            grabParticles();
        }
        drawParticle();
        stats.end();
    }
    requestAnimationFrame(render);
};

setup();
render();