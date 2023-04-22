'use strict';

var game;
var board;
var player_color;
var serverGame;

var greySquare = function(square) {
  var squareEl = $('#board .square-' + square);
  
    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
      background = '#696969';
    }

    squareEl.css('background', background);
};

var removeGreySquares = function() {
    $('#board .square-55d63').css('background', '');
};

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
  if (game.game_over() === true ||
      (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
      (game.turn() !== player_color[0])) {
    return false;
  }
};

var onDrop = function(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  });

  // illegal move
  if (move === null) return 'snapback';

  SendMove(move);
  updateStatus();
};

var onMouseoverSquare = function(square, piece) {
  // get list of possible moves for this square
  var moves = game.moves({
    square: square,
    verbose: true
  });

  // exit if there are no moves available for this square
  if (moves.length === 0) return;

  if (game.turn() == player_color[0]) {
    // highlight the square they moused over
    greySquare(square);

    // highlight the possible squares for this piece
    for (var i = 0; i < moves.length; i++) {
      greySquare(moves[i].to);
    }
  }
};

var onMouseoutSquare = function(square, piece) {
  removeGreySquares();
};

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
  board.position(game.fen());
};

var updateStatus = function() {
  var status = '';

  var moveColor = 'หมากขาว';
  if (game.turn() === 'b') {
    moveColor = 'หมากดำ';
  }

  // checkmate?
  if (game.in_checkmate() === true) {
    status = 'จบเกม, ' + moveColor + ' แพ้';
  }

  // draw?
  else if (game.in_draw() === true) {
    status = 'จบเกม, เสมอกัน';
  }

  // game still on
  else {
    status = moveColor + 'เป็นฝ่ายเดิน';

    // check?
    if (game.in_check() === true) {
      status += ', ' + moveColor + ' โดนรุกอยู่';
    }
  }

  $('#status').html(status);
  $('#fen').html(game.fen());
  $('#pgn').html(game.pgn());
};

var init = function(serverGameState) {
  serverGame = serverGameState; 

  var TH_CHESS_DEFAULT_POSITION = 'rnbqkbnr/8/pppppppp/8/8/PPPPPPPP/8/RNBKQBNR';

  var cfg = {
    pieceTheme: 'img/chesspieces/thai_chess/{piece}.png',
    orientation: player_color,
    position: serverGameState.board ? serverGame.board : TH_CHESS_DEFAULT_POSITION,
    draggable: true,
    dropOffBoard: 'snapback',
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
  };

  game = serverGame.board ? new Chess(serverGame.board) : new Chess();
  board =  new ChessBoard('board', cfg);

  updateStatus();
};

$(document).ready(init);