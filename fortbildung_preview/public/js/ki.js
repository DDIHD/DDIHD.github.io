/**
 * Ki demo widgets: Ampel, Manhattan path grid, Tic-Tac-Toe (MiniMax).
 * Mount with window.mountKi({ ampelEl, pathEl, tictactoeEl }).
 */
(function () {
  'use strict';

  var styleInjected = false;

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var s = document.createElement('style');
    s.textContent =
      '.ki-ampel-wrap{display:flex;justify-content:center;align-items:center;gap:1rem;padding:1rem;flex-wrap:wrap}' +
      '.ki-ampel-tl{width:100px;height:300px;background:#333;padding:10px;border-radius:10px;text-align:center}' +
      '.ki-ampel-light{width:80px;height:80px;background:#555;margin:10px auto;border-radius:50%}' +
      '.ki-ampel-light.ki-red{background:red}.ki-ampel-light.ki-yellow{background:#ff0}.ki-ampel-light.ki-green{background:#0a0}' +
      '.ki-ampel-side{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px}' +
      '.ki-ampel-btn{width:72px;height:120px;border-radius:12px;border:3px solid #222;background:linear-gradient(180deg,#c44,#822);cursor:pointer;box-shadow:0 4px 0 #111;color:#fff;font-size:11px;font-weight:700;padding:8px}' +
      '.ki-ampel-btn:active{transform:translateY(2px);box-shadow:0 2px 0 #111}' +
      '.ki-ampel-clock{width:56px;height:56px;border:2px solid #000;border-radius:50%;position:relative;display:none;margin-top:4px}' +
      '.ki-ampel-clock.ki-show{display:block}' +
      '.ki-ampel-hand{width:2px;height:22px;background:#000;position:absolute;top:6px;left:27px;transform-origin:bottom center}' +
      '.ki-path-wrap{display:flex;flex-direction:column;align-items:center;padding:0.5rem;gap:0.35rem}' +
      '.ki-path-grid{display:grid;gap:1px;background:#444;padding:4px;border-radius:6px;user-select:none}' +
      '.ki-path-cell{width:18px;height:18px;background:#e8e8e8;cursor:pointer}' +
      '.ki-path-cell.ki-wall{background:#222;cursor:pointer}' +
      '.ki-path-cell.ki-start{background:#228b22}' +
      '.ki-path-cell.ki-goal{background:#c22}' +
      '.ki-path-cell.ki-path{background:#fd9}' +
      '.ki-ttt-wrap{display:flex;flex-direction:column;align-items:center;padding:1rem;gap:0.75rem;font-family:system-ui,sans-serif}' +
      '.ki-ttt-board{position:relative;display:grid;grid-template-columns:repeat(3,88px);grid-template-rows:repeat(3,88px);gap:0;border:3px solid #222}' +
      '.ki-ttt-cell{width:88px;height:88px;display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:600;cursor:pointer;background:#fff;box-sizing:border-box;border-right:3px solid #222;border-bottom:3px solid #222}' +
      '.ki-ttt-cell:nth-child(3n){border-right:none}' +
      '.ki-ttt-cell:nth-child(n+7){border-bottom:none}' +
      '.ki-ttt-cell:hover{background:#f5f5f5}' +
      '.ki-ttt-cell[data-mark=X]{color:#4682b4}.ki-ttt-cell[data-mark=O]{color:#ff82ab}' +
      '.ki-ttt-result{min-height:1.5rem;font-size:1.1rem}' +
      '.ki-ttt-reset{padding:0.45rem 1rem;border-radius:8px;border:none;background:#d383f8;color:#111;font-weight:600;cursor:pointer}' +
      '.ki-ttt-line{position:absolute;height:4px;background:#dc3545;display:none;pointer-events:none;z-index:2}' +
      '.ki-ttt-line.ki-visible{display:block}';
    document.head.appendChild(s);
  }

  function mountAmpel(container) {
    if (!container || container.dataset.kiAmpelMounted) return;
    container.dataset.kiAmpelMounted = '1';
    container.innerHTML =
      '<div class="ki-ampel-wrap">' +
      '<div class="ki-ampel-side">' +
      '<button type="button" class="ki-ampel-btn" aria-label="Drücken zum Überqueren">Drücken</button>' +
      '<div class="ki-ampel-clock" data-ki-clock="L"><div class="ki-ampel-hand" data-ki-hand="L"></div></div>' +
      '</div>' +
      '<div class="ki-ampel-tl">' +
      '<div class="ki-ampel-light ki-red" data-ki-light="red"></div>' +
      '<div class="ki-ampel-light" data-ki-light="yellow"></div>' +
      '<div class="ki-ampel-light" data-ki-light="green"></div>' +
      '</div>' +
      '<div class="ki-ampel-side">' +
      '<div class="ki-ampel-clock" data-ki-clock="R"><div class="ki-ampel-hand" data-ki-hand="R"></div></div>' +
      '</div></div>';

    var red = container.querySelector('[data-ki-light="red"]');
    var yellow = container.querySelector('[data-ki-light="yellow"]');
    var green = container.querySelector('[data-ki-light="green"]');

    function showClock(side, duration) {
      var hand = container.querySelector('[data-ki-hand="' + side + '"]');
      var clock = hand && hand.parentElement;
      if (!hand || !clock) return;
      clock.classList.add('ki-show');
      var start = null;
      function rotateHand(ts) {
        if (!start) start = ts;
        var progress = ts - start;
        var rotation = (progress / duration) * 360;
        hand.style.transform = 'rotate(' + rotation + 'deg)';
        if (progress < duration) {
          requestAnimationFrame(rotateHand);
        } else {
          clock.classList.remove('ki-show');
        }
      }
      requestAnimationFrame(rotateHand);
    }

    function changeToYellow() {
      red.classList.remove('ki-red');
      yellow.classList.add('ki-yellow');
      setTimeout(changeToGreen, 500);
    }
    function changeToGreen() {
      yellow.classList.remove('ki-yellow');
      green.classList.add('ki-green');
      showClock('R', 5000);
      setTimeout(changeToYellowAgain, 5000);
    }
    function changeToYellowAgain() {
      green.classList.remove('ki-green');
      yellow.classList.add('ki-yellow');
      setTimeout(changeToRed, 500);
    }
    function changeToRed() {
      yellow.classList.remove('ki-yellow');
      red.classList.add('ki-red');
    }

    container.querySelector('.ki-ampel-btn').addEventListener('click', function () {
      showClock('L', 5000);
      setTimeout(changeToYellow, 5000);
    });
  }

  function mountPath(container) {
    if (!container || container.dataset.kiPathMounted) return;
    container.dataset.kiPathMounted = '1';

    var COLS = 18;
    var ROWS = 12;
    var sx = 0;
    var sy = 0;
    var gx = COLS - 1;
    var gy = ROWS - 1;
    var walls = {};

    function key(x, y) {
      return x + ',' + y;
    }
    function isWall(x, y) {
      return !!walls[key(x, y)];
    }

    function neighbors(x, y) {
      var n = [];
      if (x > 0) n.push([x - 1, y]);
      if (x < COLS - 1) n.push([x + 1, y]);
      if (y > 0) n.push([x, y - 1]);
      if (y < ROWS - 1) n.push([x, y + 1]);
      return n;
    }

    /** Shortest path with Manhattan (4-neighbour) moves; uniform cost == BFS. */
    function findPath() {
      var q = [{ x: sx, y: sy }];
      var came = {};
      var seen = {};
      var sk = key(sx, sy);
      seen[sk] = true;
      var head = 0;
      while (head < q.length) {
        var cur = q[head++];
        var ck = key(cur.x, cur.y);
        if (cur.x === gx && cur.y === gy) {
          var path = [];
          var k = ck;
          while (k) {
            var parts = k.split(',');
            path.push({ x: +parts[0], y: +parts[1] });
            k = came[k];
          }
          path.reverse();
          return path;
        }
        var neigh = neighbors(cur.x, cur.y);
        for (var i = 0; i < neigh.length; i++) {
          var nx = neigh[i][0];
          var ny = neigh[i][1];
          if (isWall(nx, ny)) continue;
          var nk = key(nx, ny);
          if (seen[nk]) continue;
          seen[nk] = true;
          came[nk] = ck;
          q.push({ x: nx, y: ny });
        }
      }
      return [];
    }

    container.innerHTML =
      '<div class="ki-path-wrap">' +
      '<div class="ki-path-grid" role="grid"></div></div>';

    var gridEl = container.querySelector('.ki-path-grid');
    gridEl.style.gridTemplateColumns = 'repeat(' + COLS + ', 18px)';

    var cells = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var d = document.createElement('div');
        d.className = 'ki-path-cell';
        d.dataset.x = String(x);
        d.dataset.y = String(y);
        gridEl.appendChild(d);
        cells.push(d);
      }
    }

    function paint() {
      var path = findPath();
      var pathSet = {};
      for (var p = 0; p < path.length; p++) {
        pathSet[key(path[p].x, path[p].y)] = true;
      }
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var x = +c.dataset.x;
        var y = +c.dataset.y;
        c.className = 'ki-path-cell';
        if (x === sx && y === sy) c.classList.add('ki-start');
        else if (x === gx && y === gy) c.classList.add('ki-goal');
        else if (isWall(x, y)) c.classList.add('ki-wall');
        else if (pathSet[key(x, y)]) c.classList.add('ki-path');
      }
    }

    gridEl.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.classList.contains('ki-path-cell')) return;
      var x = +t.dataset.x;
      var y = +t.dataset.y;
      if ((x === sx && y === sy) || (x === gx && y === gy)) return;
      var k = key(x, y);
      if (walls[k]) delete walls[k];
      else walls[k] = true;
      paint();
    });

    paint();
  }

  function mountTicTacToe(container) {
    if (!container || container.dataset.kiTttMounted) return;
    container.dataset.kiTttMounted = '1';

    var winningCombinations = [
      { combination: [0, 1, 2], lineClass: 'ki-line-h-top' },
      { combination: [3, 4, 5], lineClass: 'ki-line-h-mid' },
      { combination: [6, 7, 8], lineClass: 'ki-line-h-bot' },
      { combination: [0, 3, 6], lineClass: 'ki-line-v-left' },
      { combination: [1, 4, 7], lineClass: 'ki-line-v-mid' },
      { combination: [2, 5, 8], lineClass: 'ki-line-v-right' },
      { combination: [0, 4, 8], lineClass: 'ki-line-d1' },
      { combination: [2, 4, 6], lineClass: 'ki-line-d2' }
    ];

    var extraLineCss =
      '.ki-ttt-line.ki-visible.ki-line-h-top{width:264px;top:42px;left:0}' +
      '.ki-ttt-line.ki-visible.ki-line-h-mid{width:264px;top:130px;left:0}' +
      '.ki-ttt-line.ki-visible.ki-line-h-bot{width:264px;top:218px;left:0}' +
      '.ki-ttt-line.ki-visible.ki-line-v-left{width:264px;top:130px;left:-88px;transform:rotate(90deg)}' +
      '.ki-ttt-line.ki-visible.ki-line-v-mid{width:264px;top:130px;left:0;transform:rotate(90deg)}' +
      '.ki-ttt-line.ki-visible.ki-line-v-right{width:264px;top:130px;left:88px;transform:rotate(90deg)}' +
      '.ki-ttt-line.ki-visible.ki-line-d1{width:360px;top:130px;left:-48px;transform:rotate(45deg)}' +
      '.ki-ttt-line.ki-visible.ki-line-d2{width:360px;top:130px;left:-48px;transform:rotate(-45deg)}';

    if (!document.getElementById('ki-ttt-line-styles')) {
      var ls = document.createElement('style');
      ls.id = 'ki-ttt-line-styles';
      ls.textContent = extraLineCss;
      document.head.appendChild(ls);
    }

    var html =
      '<div class="ki-ttt-wrap">' +
      '<div class="ki-ttt-result" aria-live="polite"></div>' +
      '<div class="ki-ttt-board">' +
      '<div class="ki-ttt-line"></div>';
    for (var i = 0; i < 9; i++) {
      html += '<div class="ki-ttt-cell" data-cell="' + i + '"></div>';
    }
    html += '</div><button type="button" class="ki-ttt-reset">Neues Spiel</button></div>';
    container.innerHTML = html;

    var game = new Array(9);
    var cellEls = container.querySelectorAll('.ki-ttt-cell');
    var humanPlayer = 'X';
    var computerPlayer = 'O';
    var resultEl = container.querySelector('.ki-ttt-result');
    var lineEl = container.querySelector('.ki-ttt-line');

    function emptyCells(g) {
      var empty = [];
      for (var i = 0; i < g.length; i++) {
        if (!g[i]) empty.push(i);
      }
      return empty;
    }

    function findPosition(arr, value) {
      var positions = [];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) positions.push(i);
      }
      return positions;
    }

    function winLineClass(gameCurrent, player) {
      var pos = findPosition(gameCurrent, player);
      for (var i = 0; i < winningCombinations.length; i++) {
        var comb = winningCombinations[i].combination;
        var ok = true;
        for (var j = 0; j < comb.length; j++) {
          if (pos.indexOf(comb[j]) === -1) {
            ok = false;
            break;
          }
        }
        if (ok) return winningCombinations[i].lineClass;
      }
      return null;
    }

    function checkWinner(gameCurrent, player) {
      return winLineClass(gameCurrent, player) !== null;
    }

    function miniMax(gameCurrent, player, depth) {
      var empty = emptyCells(gameCurrent);
      if (checkWinner(gameCurrent, humanPlayer)) return { score: -1 };
      if (checkWinner(gameCurrent, computerPlayer)) return { score: 1 };
      if (empty.length === 0 || depth === 0) return { score: 0 };
      depth--;
      var movePossibles = [];
      for (var i = 0; i < empty.length; i++) {
        var idx = empty[i];
        var newGame = gameCurrent.slice();
        newGame[idx] = player;
        var nextP = player === computerPlayer ? humanPlayer : computerPlayer;
        var result = miniMax(newGame, nextP, depth);
        movePossibles.push({ index: idx, score: result.score });
      }
      var bestMove = 0;
      var bestScore;
      if (player === computerPlayer) {
        bestScore = -Infinity;
        for (var m = 0; m < movePossibles.length; m++) {
          if (movePossibles[m].score > bestScore) {
            bestScore = movePossibles[m].score;
            bestMove = m;
          }
        }
      } else {
        bestScore = Infinity;
        for (var m2 = 0; m2 < movePossibles.length; m2++) {
          if (movePossibles[m2].score < bestScore) {
            bestScore = movePossibles[m2].score;
            bestMove = m2;
          }
        }
      }
      return movePossibles[bestMove];
    }

    function isChecked(el) {
      return game[+el.getAttribute('data-cell')] !== undefined;
    }

    function mark(el, player) {
      if (isChecked(el)) return;
      el.textContent = player;
      el.setAttribute('data-mark', player);
      game[+el.getAttribute('data-cell')] = player;
      var wl = winLineClass(game, player);
      if (wl) {
        lineEl.className = 'ki-ttt-line ki-visible ' + wl;
      }
    }

    function checkGameEnd() {
      var result = '';
      if (checkWinner(game, humanPlayer)) {
        result = 'Gewonnen: ' + humanPlayer;
      } else if (checkWinner(game, computerPlayer)) {
        result = 'Gewonnen: ' + computerPlayer;
      } else if (emptyCells(game).length === 0) {
        result = 'Unentschieden';
      }
      resultEl.textContent = result;
    }

    function computer() {
      var empty = emptyCells(game);
      if (empty.length === 0) return;
      var bestMove = miniMax(game, computerPlayer, empty.length);
      mark(cellEls[bestMove.index], computerPlayer);
    }

    function onCellClick(el) {
      if (checkWinner(game, humanPlayer) || checkWinner(game, computerPlayer)) return;
      if (isChecked(el)) return;
      mark(el, humanPlayer);
      if (!checkWinner(game, humanPlayer) && emptyCells(game).length > 0) {
        computer();
      }
      checkGameEnd();
    }

    for (var c = 0; c < cellEls.length; c++) {
      cellEls[c].addEventListener('click', function () {
        onCellClick(this);
      });
    }

    container.querySelector('.ki-ttt-reset').addEventListener('click', function () {
      game = new Array(9);
      lineEl.className = 'ki-ttt-line';
      resultEl.textContent = '';
      for (var r = 0; r < cellEls.length; r++) {
        cellEls[r].textContent = '';
        cellEls[r].removeAttribute('data-mark');
      }
    });
  }

  window.mountKi = function (opts) {
    injectStyles();
    if (!opts) return;
    if (opts.ampelEl) mountAmpel(opts.ampelEl);
    if (opts.pathEl) mountPath(opts.pathEl);
    if (opts.tictactoeEl) mountTicTacToe(opts.tictactoeEl);
  };
})();
