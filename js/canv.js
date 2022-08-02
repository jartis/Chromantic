const PORTRAIT = 1;
const LANDSCAPE = 0;
const GAMESIZEX = 1920;
const GAMESIZEY = 1080;

// Initialize the canvas
var srcCanvas = document.createElement('canvas');
srcCanvas.width = GAMESIZEX;
srcCanvas.height = GAMESIZEY;
var ctx = srcCanvas.getContext('2d'); // All game drawing takes place on this context
var dstCanvas = document.getElementById('canvas');
var dstctx = dstCanvas.getContext('2d'); // This is the target canvas that fills the window
var screenOffsetX = 0;
var screenOffsetY = 0;
var gameScale = 0;
var newGameWidth = 0;
var newGameHeight = 0;
var dscale = srcCanvas.width / srcCanvas.height;
var bgcolor = '#333333';
var screenOrientation = LANDSCAPE; // 0 Horiz, 1 Vert
var ModalUp = false;
var gearImg = new Image();
var logoImg = new Image();
var qImg = new Image();

var colorGrid;

var isDragging = false;
var dragSrcTX = -1;
var dragSrcTY = -1;
var lastTX = -1;
var lastTY = -1;

let gridWidth = 16;
let gridHeight = 9;
let gridSize = 3;
let cellWidth = 1820 / gridWidth;
let cellHeight = 1080 / gridHeight;

// Difficulty 0: Easy, 1: Medium, 2: Hard
// 0: gridSize hints
// 1: sqrt(gridSize) hints
// 2: 0 hints (besides corners)
let difficulty = 1;

//#region Game logic goes here

function InitGame() {
    cellWidth = 1820 / gridWidth;
    cellHeight = 1080 / gridHeight;
    let baseHue = Math.floor(Math.random() * 360);
    let HueMod = Math.floor(Math.random() * 90) + 45;
    colorGrid = [];
    for (let i = 0; i < gridHeight; i++) {
        colorGrid[i] = [];
        for (let j = 0; j < gridWidth; j++) {
            if ((i == 0 || i == gridHeight - 1) && (j == 0 || j == gridWidth - 1)) {
                colorGrid[i][j] = {
                    color: RandomVibrantColor(baseHue, 100, (Math.random() * 33) + 33),
                    num: (i * gridHeight) + j,
                    x: (cellWidth * i),
                    y: (cellHeight * j),
                    w: cellWidth,
                    h: cellHeight,
                    locked: true,
                    sizeDelt: 0,
                };
                baseHue += HueMod;
                baseHue %= 360;
            } else {
                colorGrid[i][j] = {
                    color: '#000000',
                    num: (i * gridHeight) + j,
                    x: (cellWidth * i),
                    y: (cellHeight * j),
                    w: cellWidth,
                    h: cellHeight,
                    locked: false,
                    sizeDelt: 0,
                };
            }
        }
    }
    TweenInitialGrid();
    addLocks();
    shuffleGrid();
    // bgcolor = getRandomRgb(0, 64);
}

function addLocks() {
    let numLocks = 0;
    switch (difficulty) {
        case 1:
            numLocks = (gridWidth + gridHeight);
            break;
        case 2:
            numLocks = gridWidth;
            break;
        case 3:
            numLocks = 0;
            break;
    }
    for (let l = 0; l < numLocks; l++) {
        let i = Math.floor(Math.random() * gridHeight);
        let j = Math.floor(Math.random() * gridWidth);
        while (colorGrid[i][j].locked) {
            i = Math.floor(Math.random() * gridHeight);
            j = Math.floor(Math.random() * gridWidth);
        }
        colorGrid[i][j].locked = true;
    }
}

function shuffleGrid() {
    for (let pos = 0; pos < (gridWidth * gridHeight); pos++) {
        let j = pos % gridWidth;
        let i = Math.floor(pos / gridWidth);
        if (colorGrid[i][j].locked) continue;

        let secondpos = Math.floor(Math.random() * ((gridWidth * gridHeight) - pos)) + pos;
        let secondj = secondpos % gridWidth;
        let secondi = Math.floor(secondpos / gridWidth);
        if (colorGrid[secondi][secondj].locked) continue;

        let temp = colorGrid[i][j];
        colorGrid[i][j] = colorGrid[secondi][secondj];
        colorGrid[secondi][secondj] = temp;
    }
    resetGridLocations();
}

function TweenInitialGrid() {
    // Do Left row
    for (let j = 1; j < gridHeight - 1; j++) {
        colorGrid[j][0].color = colorLerp(colorGrid[0][0].color, colorGrid[gridHeight - 1][0].color, j / gridHeight);
    }

    // Do right row
    for (let j = 1; j < gridHeight - 1; j++) {
        colorGrid[j][gridWidth - 1].color = colorLerp(colorGrid[0][gridWidth - 1].color, colorGrid[gridHeight - 1][gridWidth - 1].color, j / gridHeight);
    }

    // Do everything in between
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 1; j < gridWidth - 1; j++) {
            colorGrid[i][j].color = colorLerp(colorGrid[i][0].color, colorGrid[i][gridWidth - 1].color, j / gridWidth);
        }
    }
}

function colorLerp(colA, colB, t) {
    colA = hextorgb(colA);
    colB = hextorgb(colB);
    let r = Math.round(colA.r + (colB.r - colA.r) * t);
    let g = Math.round(colA.g + (colB.g - colA.g) * t);
    let b = Math.round(colA.b + (colB.b - colA.b) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function Update() {
    // Game logic here
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            if (colorGrid[i][j].sizeDelt != 0) {
                colorGrid[i][j].w += colorGrid[i][j].sizeDelt;
                colorGrid[i][j].h += colorGrid[i][j].sizeDelt;
                if (colorGrid[i][j].w < (cellWidth * 0.8)) {
                    colorGrid[i][j].w = cellWidth * 0.8;
                    colorGrid[i][j].h = cellHeight * 0.8;
                    colorGrid[i][j].sizeDelt = 0;
                } else if (colorGrid[i][j].w > cellWidth) {
                    colorGrid[i][j].w = cellWidth;
                    colorGrid[i][j].h = cellHeight;
                    colorGrid[i][j].sizeDelt = 0;
                }
                colorGrid[i][j].sizeDelt *= 1.5;
            }
        }
    }

    let didWin = true;
    // Check for win condition
    for (let pos = 0; pos < (gridWidth * gridHeight); pos++) {
        let j = pos % gridWidth;
        let i = Math.floor(pos / gridWidth);
        if (colorGrid[i][j].num != pos) {
            didWin = false;
            break;
        }
    }

    if (didWin) {
        modalUp = true;
        MicroModal.show('win-modal', {
            onClose: modal => {
                modalUp = false;
                InitGame();
            },
        });
    }
}

function DrawGame() {
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            if ((!isDragging) || i != dragSrcTY || j != dragSrcTX) {
                ctx.fillStyle = colorGrid[i][j].color;
                ctx.fillRect(colorGrid[i][j].x, colorGrid[i][j].y, colorGrid[i][j].w, colorGrid[i][j].h);
                if (colorGrid[i][j].locked) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(colorGrid[i][j].x + (cellWidth / 2 - 4), colorGrid[i][j].y + (cellHeight / 2 - 4), 8, 8);
                }
            }
        }
    }
    if (isDragging) {
        // redraw the moving square
        let i = dragSrcTY;
        let j = dragSrcTX;
        ctx.fillStyle = colorGrid[i][j].color;
        ctx.fillRect(colorGrid[i][j].x - (cellWidth * 0.4), colorGrid[i][j].y - (cellHeight * 0.4), colorGrid[i][j].w, colorGrid[i][j].h);
    }

    ctx.drawImage(gearImg, srcCanvas.width - 100, 0, 100, 100);
    ctx.drawImage(logoImg, srcCanvas.width - 100, 100, 100, 880);
    ctx.drawImage(qImg, srcCanvas.width - 100, 980, 100, 100);
    // Game element drawing goes here

}

//#endregion

//#region Initialization
window.onload = function() {
    window.addEventListener('resize', ResizeGame);
    window.addEventListener('click', HandleMouse);
    window.addEventListener('mousedown', HandleMouse);
    window.addEventListener('mouseup', HandleMouse);
    window.addEventListener('mousemove', HandleMouse);
    window.addEventListener('keydown', HandleKeys);

    let logoLoaded = false;

    logoImg.addEventListener('load', function() {
        this.logoLoaded = true;
    }, false);
    logoImg.src = 'res/title.png'; // Set source path

    qImg.addEventListener('load', function() {
        this.logoLoaded = true;
    }, false);
    qImg.src = 'res/q.png'; // Set source path

    // Do initialization here
    gearImg.addEventListener('load', function() {
        InitGame();
        ResizeGame();
        DrawScreen();
    }, false);
    gearImg.src = 'res/gear.png'; // Set source path
};
//#endregion

//#region Handlers
function HandleMouse(e) {
    if (ModalUp) return; // Ignore the mouse if a Modal is currently displayed
    // mX and mY are Mouse X and Y in "Source Screen" coordinates
    let mX = (e.offsetX - screenOffsetX) / gameScale;
    let mY = (e.offsetY - screenOffsetY) / gameScale;

    // First, see if we clicked on the gear
    if (e.type == 'click') {
        if (mX > GAMESIZEX - 100 && mY < 100) {
            window.removeEventListener('click', HandleMouse);
            modalUp = true;
            document.getElementById('diffInput').value = difficulty;
            document.getElementById('gridSizeInput').value = gridSize;
            MicroModal.show('settings-modal', {
                onClose: modal => {
                    modalUp = false;
                    let newDiff = parseInt(document.getElementById('diffInput').value);
                    let newSize = parseInt(document.getElementById('gridSizeInput').value);
                    if (newDiff != difficulty || newSize != gridSize) {
                        difficulty = newDiff;
                        switch (newSize) {
                            case 3:
                                gridWidth = 16;
                                gridHeight = 9;
                                break;
                            case 2:
                                gridWidth = 12;
                                gridHeight = 7;
                                break;
                            case 1:
                                gridWidth = 9;
                                gridHeight = 5;
                                break;
                        }
                        gridSize = newSize;
                        InitGame();
                    }
                    window.addEventListener('click', HandleMouse);
                }
            });
            return;
        } else if (mX > GAMESIZEX - 100 && mY > GAMESIZEY - 100) {
            window.removeEventListener('click', HandleMouse);
            modalUp = true;
            MicroModal.show('info-modal', {
                onClose: modal => {
                    modalUp = false;
                    window.addEventListener('click', HandleMouse);
                }
            });
        }
    } else {

        // Mouse handling here
        if (e.type == 'mousedown' && !isDragging) {
            dragSrcTX = Math.floor(mX / cellWidth);
            dragSrcTY = Math.floor(mY / cellHeight);
            if (dragSrcTX < 0 || dragSrcTX > gridWidth - 1 || dragSrcTY < 0 || dragSrcTY > gridHeight - 1) {
                return true;
            }
            if (colorGrid[dragSrcTY][dragSrcTX].locked) {
                return true;
            }
            isDragging = true;
            colorGrid[dragSrcTY][dragSrcTX].sizeDelt = -1;
            colorGrid[dragSrcTY][dragSrcTX].x = mX;
            colorGrid[dragSrcTY][dragSrcTX].y = mY;
        } else if (e.type == 'mouseup' && isDragging) {
            isDragging = false;
            let tgtTX = Math.floor(mX / cellWidth);
            let tgtTY = Math.floor(mY / cellHeight);
            if (colorGrid[tgtTY][tgtTX].locked) {
                tgtTX = dragSrcTX;
                tgtTY = dragSrcTY;
            }

            let tmp = colorGrid[tgtTY][tgtTX];
            colorGrid[tgtTY][tgtTX] = colorGrid[dragSrcTY][dragSrcTX];
            colorGrid[dragSrcTY][dragSrcTX] = tmp;
            resetGridLocations();
        }
        if (e.type == 'mousemove' && isDragging) {
            colorGrid[dragSrcTY][dragSrcTX].x = mX;
            colorGrid[dragSrcTY][dragSrcTX].y = mY;

            // Shrink the square we are currently over?
            let curTX = Math.floor(mX / cellWidth);
            let curTY = Math.floor(mY / cellHeight);
            if (curTX != lastTX || curTY != lastTY) {
                if (curTX != dragSrcTX || curTY != dragSrcTY) {
                    if (!(colorGrid[curTY][curTX].locked)) {
                        colorGrid[curTY][curTX].sizeDelt = -1;
                    }
                    colorGrid[lastTY][lastTX].sizeDelt = 1;
                }
                lastTX = curTX;
                lastTY = curTY;
            }
        }
    }
}

function resetGridLocations() {
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            colorGrid[i][j].x = (cellWidth * j);
            colorGrid[i][j].y = (cellHeight * i);
            colorGrid[i][j].sizeDelt = 1;
        }
    }
}

function HandleKeys(e) {
    if (ModalUp) return; // Ignore the keyboard if a Modal is currently displayed

    // Key handling here
}
//#endregion

//#region Draw Utilities
function DrawScreen() {
    Update();

    // Clear the little canvas
    ctx.fillStyle = bgcolor;
    ctx.fillRect(0, 0, srcCanvas.width, srcCanvas.height);

    // Draw the game elements
    DrawGame();

    // Blit to the big canvas
    dstctx.fillStyle = bgcolor;
    dstctx.fillRect(0, 0, dstCanvas.width, dstCanvas.height);
    dstctx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, screenOffsetX, screenOffsetY, newGameWidth, newGameHeight);
    window.requestAnimationFrame(DrawScreen);
}

function ResizeGame() {
    dstCanvas.width = window.innerWidth;
    dstCanvas.height = window.innerHeight;

    if (dstCanvas.width >= dstCanvas.height) {
        dscale = GAMESIZEX / GAMESIZEY;
        screenOrientation = LANDSCAPE;
        srcCanvas.width = GAMESIZEX;
        srcCanvas.height = GAMESIZEY;
        if (dstCanvas.width / dstCanvas.height > dscale) {
            newGameHeight = dstCanvas.height;
            newGameWidth = newGameHeight / GAMESIZEY * GAMESIZEX;
            gameScale = newGameHeight / GAMESIZEY;
        } else {
            newGameWidth = dstCanvas.width;
            newGameHeight = newGameWidth / GAMESIZEX * GAMESIZEY;
            gameScale = newGameWidth / GAMESIZEX;
        }
    } else {
        dscale = GAMESIZEY / GAMESIZEX;
        screenOrientation = PORTRAIT;
        srcCanvas.width = GAMESIZEY;
        srcCanvas.height = GAMESIZEX;
        if (dstCanvas.width / dstCanvas.height > dscale) {
            newGameHeight = dstCanvas.height;
            newGameWidth = newGameHeight / GAMESIZEX * GAMESIZEY;
            gameScale = newGameHeight / GAMESIZEX;
        } else {
            newGameWidth = dstCanvas.width;
            newGameHeight = newGameWidth / GAMESIZEY * GAMESIZEX;
            gameScale = newGameWidth / GAMESIZEY;
        }
    }

    screenOffsetX = Math.abs((dstCanvas.width - newGameWidth)) / 2;
    screenOffsetY = Math.abs((dstCanvas.height - newGameHeight)) / 2;
}
//#endregion

//#region General Utility
function Shuffle(array) {
    let currentIndex = array.length,
        randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }

    return array;
}

function HSLColor(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = function(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = function(x) {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

function RandomVibrantColor(h = 0, s = 100, l = 50) {
    return HSLColor(h, s, l);
}


function hextorgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbtohsl(rgbhex) {
    let rgb = hextorgb(rgbhex);
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);

    let h = 0;
    let s = 0;
    let l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return [h, s, l];
}

//#endregion