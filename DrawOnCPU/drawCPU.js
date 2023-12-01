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
            return new Vector();
        }
    }
}

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

const canvasWidth = 512;
const canvasHeight = 512;
c.width = canvasWidth;
c.height = canvasHeight;
const minWindowWidth = Math.min(window.innerWidth, window.innerHeight);
const maxWindowWidth = Math.max(window.innerWidth, window.innerHeight);
const pageOffsetLeft = ((maxWindowWidth - minWindowWidth) / 2) / minWindowWidth;
let isRun = false;

const particleSize = 0.02;
const h = particleSize * 1.5;
const stiffness = 100;
const density0 = 1000;
const viscosity = 4;
const massParticle = particleSize * particleSize * density0;
const w = new Kernel(h);
const grv = new Vector(0, -9.8);
const regionAll = new Rectangle(0, 0, 1, 1);
// const thicknessWall = particleSize * 1;
const cell = new Cell(regionAll, h);
const cellt = cell.h * canvasHeight;
const celll = cell.h * canvasWidth;
let time = 0;
const timeDelta = particleSize * 0.125;
// const iterationNum = Math.floor((1 / 60) / timeDelta);
const iterationNum = 4;
const grabScale = 6;
const grabScaleRange = grabScale * cell.h * c.height;
const grabRange = grabScale * cell.h;
const grabRange2 = grabRange * grabRange
const range = grabScale * 2 + 1, loopNum = grabScale;
const p = [];
const particles = new Rectangle(0, 0, 0.5, 0.8);
createParticle(p, particles);
const simLeft = particleSize;
const simRight = 1 - particleSize;
const simTop = 1 - particleSize;
const simBottom = particleSize;

let flipForce = 1;

// const cellSize = cell.h * c.width;

let mouse = {
    eventTarget: null,
    x: 0,
    y: 0,
    fx: 0,
    fy: 0,
    isPressed: false,
    isRightClick: false
}

output.innerHTML = "particleSize : " + particleSize + "<br>" +
    "particleNum : " + (p.length) + "<br>" +
    "canvasSize : " + canvasWidth + "<br>" +
    "timeStepLength : " + timeDelta + "<br>" +
    "iterationNum : " + iterationNum + "<br>" +
    "restDensity : " + density0 + "<br>" +
    "viscosity : " + viscosity + "<br>" +
    "massParticle : " + massParticle + "<br>" +
    "gravity : Vec2(x : " + grv.x + ", y : " + grv.y + ")";

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
function mDown(m) {
    mouse.x = m.pageX / minWindowWidth - pageOffsetLeft;
    mouse.y = 1 - m.pageY / minWindowWidth;
    mouse.fx = 0;
    mouse.fy = 0;
    mouse.isPressed = true;
}
function mMove(m) {
    mouse.fx = mouse.x - m.pageX / minWindowWidth - pageOffsetLeft;
    mouse.fy = mouse.y - (1 - m.pageY / minWindowWidth);
    mouse.x = m.pageX / minWindowWidth - pageOffsetLeft;
    mouse.y = 1 - m.pageY / minWindowWidth;
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
            const x = region.left + (i + 0.5) * particleSize;
            const y = region.bottom + (j + 0.5) * particleSize;

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
                const r = rv.magnitude();
                density += w.kernel(r) * massParticle;
            });
            p[i].density = density;
            p[i].pressure = Math.max(stiffness * (p[i].density - density0), 0);
        }
    };

    calcDP(p);
    // calcDP(pWall);
}

function particleForce() {
    for (let i = 0, n = p.length; i < n; i++) {
        //if (!p[i].active) continue;

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

function update(iterNum) {
    for (let j = 0; j < iterNum; j++) {
        time += timeDelta;

        setParticleToCell();
        densityPressure();
        particleForce();

        for (let i = 0, n = p.length; i < n; i++) {
            //if (!p[i].active) continue;
            p[i].velocity2.x += p[i].force.x * timeDelta;
            p[i].velocity2.y += p[i].force.y * timeDelta;

            p[i].position.x += p[i].velocity2.x * timeDelta;
            p[i].position.y += p[i].velocity2.y * timeDelta;

            if (p[i].position.y < simBottom || p[i].position.y > simTop) {
                p[i].velocity2.y = -p[i].velocity2.y;
            }
            if (p[i].position.x < simLeft || p[i].position.x > simRight) {
                p[i].velocity2.x = -p[i].velocity2.x;
            }
            p[i].position.x = Math.min(simRight, Math.max(p[i].position.x, simLeft));
            p[i].position.y = Math.min(simTop, Math.max(p[i].position.y, simBottom));

            p[i].velocity.x = p[i].velocity2.x + 0.5 * p[i].force.x * timeDelta;
            p[i].velocity.y = p[i].velocity2.y + 0.5 * p[i].force.y * timeDelta;
        }
    }
}

function draw() {
    function drawArc(p, scale, d) {
        for (let i = 0, n = p.length; i < n; i++) {
            // if(!p[i].active) continue;
            const arcSize = d / 4;
            const x = (p[i].position.x - regionAll.left) * scale;
            const y = canvasHeight - (p[i].position.y - regionAll.bottom) * scale;
            ctx.fillStyle = "hsl(" + (220 - p[i].pressure / 100) + ", 80%, 40%)";
            ctx.beginPath();
            ctx.arc(x, y, arcSize, 0, Math.PI * 2);
            ctx.fill();
            // ctx.fillRect(x - d / 2, y - d / 2, d, d)
            ctx.closePath();
        };
    };

    const scale = canvasWidth / regionAll.width;
    const d = particleSize * scale;

    ctx.fillStyle = "#00FFFF";
    drawArc(p, scale, d);

}

function run() {
    isRun = !isRun;
}

function reset() {
    isRun = false;
    time = 0;
    ctx.fillStyle = "blue"

    run();
}

function setup() {
    reset();
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
                vacuumVector.times(iterationNum * 0.5 * flipForce);
                pNeighbor.velocity2.add(vacuumVector);
            }
        }
    }
}

let ms = new Array(20);
function render() {
    stats.begin();
    ctx.clearRect(0, 0, c.width, c.height);

    update(iterationNum);
    if (mouse.isPressed) {
        grabParticles();

        ctx.beginPath();
        if (flipForce == 1) {
            ctx.strokeStyle = "#22BC46";
        } else {
            ctx.strokeStyle = "#B92121";
        }
        ctx.lineWidth = 1;
        ctx.arc(mouse.x * c.width, c.height * (1 - mouse.y), grabScaleRange, 0, Math.PI * 2);
        ctx.stroke();
        ctx.closePath();
    }
    draw();

    stats.end();
    requestAnimationFrame(render);
};

setup();
render();
