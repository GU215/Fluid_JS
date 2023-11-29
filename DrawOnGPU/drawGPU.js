"use strict"

const c = document.querySelector("canvas");
const gl = c.getContext("webgl2")

const output = document.querySelector("p");

const pImgSrc = "data:image/png;base64,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";
const pImg = new Image();
pImg.src = pImgSrc;

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

const particleSize = 0.025;
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
const timeDelta = particleSize * 0.115;
// const iterationNum = Math.floor((1 / 60) / timeDelta);
const iterationNum = 4;
const grabScale = 6;
const grabRange = grabScale * cell.h, grabRange2 = grabRange * grabRange, range = grabScale * 2 + 1, loopNum = grabScale;
const p = [];
const particles = new Rectangle(0, 0, 0.5, 0.8);
createParticle(p, particles);

c.width = 128;
c.height = 128;
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

function GLCreateTexture() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return t;
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


gl.enable(gl.BLEND);
const vertexshader = GLCreateShader(gl.VERTEX_SHADER, vertexshadersource.innerHTML);
const fragmentshader = GLCreateShader(gl.FRAGMENT_SHADER, fragmentshadersource.innerHTML);
const prg = GLCreateProgram(vertexshader, fragmentshader);
const Positions = new Float32Array(p.length * 2);
gl.useProgram(prg);
const pTex = GLCreateTexture();
const posAttribLocation = gl.getAttribLocation(prg, "position");
const texAttribLocation = gl.getAttribLocation(prg, "a_texCoord");
uniLocation[0] = gl.getUniformLocation(prg, "u_image");
// uniLocation[1] = gl.getUniformLocation(prg, "isFlip");
gl.uniform1i(uniLocation[0], 0);
gl.uniform1f(uniLocation[1], -1);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pImg);
gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
const VAO = setVAO(posAttribLocation, texAttribLocation, true);
gl.bindVertexArray(VAO);
gl.clearColor(0.0, 0.0, 0.0, 0.0);
gl.viewport(0, 0, c.width, c.height);
const PointNum = Positions.length;
let ms = new Array(10);
let t = 0;

function render() {
    stats.begin();
    // const sTime = performance.now();

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pTex);
    gl.uniform1f(uniLocation[1], 1);
    gl.uniform1i(uniLocation[0], 0);

    for (let i = 0, j = PointNum; i < j; i += 2) {
        Positions[i] = p[i / 2].position.x;
        Positions[i + 1] = p[i / 2].position.y;
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, Positions);
    gl.drawArrays(gl.POINTS, 0, PointNum);

    gl.flush();
    // 流体の計算
    update(iterationNum);
    if (mouse.isPressed) {
        grabParticles();
    }

    stats.end();

    // const eTime = performance.now();
    // let sum = 0;
    // ms.shift();
    // ms.push(eTime - sTime);
    // t++
    // if (!(t % 60)) {

    //     ms.forEach((num) => {
    //         sum += num;
    //     })
    //     output.innerHTML = ((sum / 10).toFixed(2)) + "ms";
    // }

    requestAnimationFrame(render);
}

render();
