"use strict"

const c = document.querySelector("canvas");
const gl = c.getContext("webgl2")
console.log(gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
console.log(gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS));

const output = document.querySelector("p");


// ここから流体計算

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
                    // if (rv.magnitude() >= cell.h) continue;

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
        }
        return 0;
    }

    gradient(rv) {
        const r = rv.magnitude();
        if (r < this.h) {
            const c = -6 * this.alpha * Math.pow(this.h * this.h - r * r, 2);
            return new Vector(c * rv.x, c * rv.y);
        }
        return new Vector();
    }
}

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
const cell = new Cell(regionAll, h);
let time = 0;
const timeDelta = particleSize * 0.125;
// const iterationNum = Math.floor((1 / 60) / timeDelta);
const iterationNum = 4;
const grabScale = 8;
const grabRange = grabScale * cell.h, grabRange2 = grabRange * grabRange, range = grabScale * 2 + 1, loopNum = grabScale;
const p = [];
const particles = new Rectangle(0, 0, 0.5, 0.8);
createParticle(p, particles);

c.width = 512;
c.height = 512;
const canvasWidth = c.width;
const canvasHeight = c.height;
let minWindowWidth = Math.min(window.innerWidth, window.innerHeight);
let maxWindowWidth = Math.max(window.innerWidth, window.innerHeight);
let pageOffset = ((maxWindowWidth - minWindowWidth) / 2) / minWindowWidth;
let pageOffsetTop, pageOffsetLeft = 0;
if (window.innerWidth > window.innerHeight) {
    pageOffsetTop = 0;
    pageOffsetLeft = pageOffset;
} else {
    pageOffsetTop = pageOffset;
    pageOffsetLeft = 0;
}

window.addEventListener("resize", function () {
    minWindowWidth = Math.min(window.innerWidth, window.innerHeight);
    maxWindowWidth = Math.max(window.innerWidth, window.innerHeight);
    pageOffset = ((maxWindowWidth - minWindowWidth) / 2) / minWindowWidth;
    pageOffsetTop, pageOffsetLeft = 0;
    if (window.innerWidth > window.innerHeight) {
        pageOffsetTop = 0;
        pageOffsetLeft = pageOffset;
    } else {
        pageOffsetTop = pageOffset;
        pageOffsetLeft = 0;
    }
})

const simLeft = particleSize;
const simRight = 1 - particleSize;
const simTop = 1 - particleSize;
const simBottom = particleSize;
let isRun = false;

const mouse = {
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
    mouse.x = m.pageX / minWindowWidth - pageOffsetLeft;
    mouse.y = (1 - m.pageY / minWindowWidth) + pageOffsetTop;
    mouse.fx = 0;
    mouse.fy = 0;
    mouse.isPressed = true;
}
function mMove(m) {
    mouse.fx = mouse.x - m.pageX / minWindowWidth - pageOffsetLeft;
    mouse.fy = (mouse.y - (1 - m.pageY / minWindowWidth)) + pageOffsetTop;
    mouse.x = m.pageX / minWindowWidth - pageOffsetLeft;
    mouse.y = (1 - m.pageY / minWindowWidth) + pageOffsetTop;
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
}

function densityPressure() {
    for (let i = 0, n = p.length; i < n; i++) {
        let density = 0;
        p[i].forNeighbor(cell, function (pNeighbor, rv) {
            const r = rv.magnitude();
            density += w.kernel(r) * massParticle;
        });
        p[i].density = density;
        p[i].pressure = Math.max(stiffness * (p[i].density - density0), 0);
    }
}

function particleForce() {
    for (let i = 0, n = p.length; i < n; i++) {
        p[i].force.x = 0;
        p[i].force.y = 0;

        p[i].forNeighbor(cell, function (pNeighbor, rv) {
            if (p[i] !== pNeighbor) {
                const r = rv.magnitude();

                // pressure
                const wp = w.gradient(rv);
                const fp = (0 - massParticle) * (pNeighbor.pressure / (pNeighbor.density * pNeighbor.density)
                    + p[i].pressure / (p[i].density * p[i].density));
                p[i].force.x += wp.x * fp;
                p[i].force.y += wp.y * fp;

                // viscosity
                const r2 = r * r + 0.01 * h * h;
                const dv = p[i].velocity.sub(pNeighbor.velocity);
                const fv = massParticle * 2 * viscosity / (pNeighbor.density * p[i].density) * rv.dot(wp) / r2;
                p[i].force.x += fv * dv.x;
                p[i].force.y += fv * dv.y;
            }
        });

        // gravity
        p[i].force.x += grv.x;
        p[i].force.y += grv.y;
    }
}

function update(iterNum) {
    for (let j = 0; j < iterNum; j++) {
        time += timeDelta;

        setParticleToCell();
        densityPressure();
        particleForce();

        for (let i = 0, n = p.length; i < n; i++) {
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

function run() {
    isRun = !isRun;
}

function reset() {
    isRun = false;
    time = 0;
    draw();
    run();
}

function setup() {
    // setParameter();
    c.width = canvasWidth;
    c.height = canvasHeight;
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
                // pNeighbor.remove()
                const vacuumVector = new Vector(dx, dy)
                vacuumVector.times(iterationNum * 0.5);
                pNeighbor.velocity2.add(vacuumVector);
            }
        }
    }
}

// WebGLのコード

const vertexshadersource = document.getElementById("vs");
const fragmentshadersource = document.getElementById("fs");
const uniLocation = [];

function GLCreateShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const SSuccess = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (SSuccess) {
        return shader;
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function GLCreateProgram(vertexshader, fragmentshader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexshader);
    gl.attachShader(program, fragmentshader);
    gl.linkProgram(program);
    const PSuccess = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (PSuccess) {
        return program;
    }
    console.log(gl.getProgramInfoLog(shader));
    gl.deleteProgram(program);
}

// function GLCreateTexture() {
//     const t = gl.createTexture();
//     gl.bindTexture(gl.TEXTURE_2D, t);

//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

//     return t;
// }

function setVAO(posAttribLocation, texAttribLocation, isDynamic) {
    const VAO = gl.createVertexArray();
    const PosBuffer = gl.createBuffer();
    const drawParam = isDynamic ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW;
    gl.bindVertexArray(VAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, PosBuffer);
    gl.enableVertexAttribArray(posAttribLocation);
    gl.enableVertexAttribArray(texAttribLocation);
    gl.vertexAttribPointer(texAttribLocation, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(posAttribLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bufferData(gl.ARRAY_BUFFER, Positions, drawParam);
    gl.bindVertexArray(null);
    return VAO;
}

// function createFrameBuffer(w, h) {
//     const texture = GLCreateTexture();

//     const framebuffer = gl.createFramebuffer();
//     gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

//     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
//     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

//     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//     return { f: framebuffer, t: texture };
// }

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.TEXTURE_2D);
const vertexshader = GLCreateShader(gl.VERTEX_SHADER, vertexshadersource.innerHTML);
const fragmentshader = GLCreateShader(gl.FRAGMENT_SHADER, fragmentshadersource.innerHTML);
const prg = GLCreateProgram(vertexshader, fragmentshader);
const Positions = new Float32Array(p.length * 2);
gl.clearColor(0.0, 0.0, 0.0, 0.0);
gl.viewport(0, 0, c.width, c.height);
gl.useProgram(prg);
const posAttribLocation = gl.getAttribLocation(prg, "position");
const texAttribLocation = gl.getAttribLocation(prg, "a_texCoord");
uniLocation[0] = gl.getUniformLocation(prg, "u_image");
uniLocation[1] = gl.getUniformLocation(prg, "isFlip");
gl.uniform1i(uniLocation[0], 0);
gl.uniform1f(uniLocation[1], -1);
const VAO = setVAO(posAttribLocation, texAttribLocation, true);
gl.bindVertexArray(VAO);
const PointNum = Positions.length;

function render() {
    stats.begin();

    // 流体の計算
    update(iterationNum);
    if (mouse.isPressed) {
        grabParticles();
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.uniform1i(uniLocation[0], 0);
    gl.uniform1f(uniLocation[1], 1);
    
    for (let i = 0, j = PointNum; i < j; i += 2) {
        Positions[i] = p[i / 2].position.x;
        Positions[i + 1] = p[i / 2].position.y;
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, Positions);
    gl.drawArrays(gl.POINTS, 0, PointNum);
    
    gl.flush();
    
    stats.end();

    requestAnimationFrame(render);
}


render();
