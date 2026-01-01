const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 32;
const COLORS = [
  '#000000',
  '#00d2ff',
  '#5163ff',
  '#ffb800',
  '#00e676',
  '#ff4d6d',
  '#b15cff',
  '#ffd166',
];

const SHAPES = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  [
    [4, 4],
    [4, 4],
  ],
  [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
];

let grid = createMatrix(COLS, ROWS);
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameOver = false;
let paused = false;

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
  level: 1,
  next: null,
};

function createMatrix(width, height) {
  const matrix = [];
  for (let i = 0; i < height; i += 1) {
    matrix.push(new Array(width).fill(0));
  }
  return matrix;
}

function createPiece() {
  const typeId = Math.floor(Math.random() * 7) + 1;
  return SHAPES[typeId].map((row) => row.slice());
}

function collide(board, piece) {
  const { matrix, pos } = piece;
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (matrix[y][x] !== 0) {
        const boardRow = board[y + pos.y];
        if (!boardRow || boardRow[x + pos.x] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

function merge(board, piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + piece.pos.y][x + piece.pos.x] = value;
      }
    });
  });
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < y; x += 1) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

function sweep() {
  let rowCount = 1;
  let cleared = 0;
  for (let y = grid.length - 1; y >= 0; y -= 1) {
    if (grid[y].every((value) => value !== 0)) {
      const row = grid.splice(y, 1)[0].fill(0);
      grid.unshift(row);
      cleared += 1;
      player.score += rowCount * 100;
      rowCount *= 2;
      y += 1;
    }
  }
  if (cleared > 0) {
    player.lines += cleared;
    player.level = 1 + Math.floor(player.lines / 10);
    dropInterval = Math.max(120, 1000 - (player.level - 1) * 80);
  }
}

function resetPlayer() {
  player.matrix = player.next || createPiece();
  player.next = createPiece();
  player.pos.y = 0;
  player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
  if (collide(grid, player)) {
    gameOver = true;
    statusEl.textContent = '游戏结束';
  }
}

function drop() {
  player.pos.y += 1;
  if (collide(grid, player)) {
    player.pos.y -= 1;
    merge(grid, player);
    sweep();
    resetPlayer();
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(grid, player)) {
    player.pos.y += 1;
  }
  player.pos.y -= 1;
  merge(grid, player);
  sweep();
  resetPlayer();
  dropCounter = 0;
}

function move(dir) {
  player.pos.x += dir;
  if (collide(grid, player)) {
    player.pos.x -= dir;
  }
}

function rotatePlayer(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(grid, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function drawMatrix(matrix, offset, ctx) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = COLORS[value];
        ctx.fillRect(
          (x + offset.x) * BLOCK_SIZE,
          (y + offset.y) * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeRect(
          (x + offset.x) * BLOCK_SIZE,
          (y + offset.y) * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
      }
    });
  });
}

function drawBoard() {
  context.fillStyle = '#0b0f18';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(grid, { x: 0, y: 0 }, context);
  drawMatrix(player.matrix, player.pos, context);
}

function drawNext() {
  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!player.next) {
    return;
  }
  const size = player.next.length;
  const offsetX = Math.floor((nextCanvas.width / BLOCK_SIZE - size) / 2);
  const offsetY = Math.floor((nextCanvas.height / BLOCK_SIZE - size) / 2);
  drawMatrix(player.next, { x: offsetX, y: offsetY }, nextContext);
}

function updateStatus() {
  scoreEl.textContent = player.score;
  linesEl.textContent = player.lines;
  levelEl.textContent = player.level;
  if (paused) {
    statusEl.textContent = '已暂停';
  } else if (!gameOver) {
    statusEl.textContent = '进行中';
  }
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  if (!paused && !gameOver) {
    dropCounter += delta;
    if (dropCounter > dropInterval) {
      drop();
    }
  }
  drawBoard();
  drawNext();
  updateStatus();
  requestAnimationFrame(update);
}

function restart() {
  grid = createMatrix(COLS, ROWS);
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  dropInterval = 1000;
  gameOver = false;
  paused = false;
  statusEl.textContent = '进行中';
  player.next = createPiece();
  resetPlayer();
}

restartBtn.addEventListener('click', () => {
  restart();
});

document.addEventListener('keydown', (event) => {
  if (gameOver) {
    return;
  }
  if (event.code === 'KeyP') {
    paused = !paused;
    return;
  }
  if (paused) {
    return;
  }
  switch (event.code) {
    case 'ArrowLeft':
      move(-1);
      break;
    case 'ArrowRight':
      move(1);
      break;
    case 'ArrowDown':
      drop();
      break;
    case 'ArrowUp':
      rotatePlayer(1);
      break;
    case 'Space':
      hardDrop();
      break;
    default:
      break;
  }
});

restart();
update();
