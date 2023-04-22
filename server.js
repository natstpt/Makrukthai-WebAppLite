var express = require('express');
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, '/static')));
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var users = {};
var users_connections = {};

var openGames = {};
var activeGames = {};

var game_id = 0;
var user_count = 0;

app.get('/game', function(req, res) {
    res.sendFile(__dirname + '/static/game.html');
});

io.on('connection', function(socket) {
    user_count += 1;
    console.log("user_count: "+user_count);
    console.log('new connection ' + socket.id);
    
    socket.on('message', function(msg) {
        console.log('Got message from client: ' + msg);
    });

    socket.on('login',function(userId){
        console.log(userId + ' is login');
        socket.userId = userId; 

        if (!users[userId]) {    
            console.log('creating new user');
            users[userId] = {userId: socket.userId, games:{}};
            users_connections[userId] = socket;
        } else {
            console.log('user found!');
            Object.keys(users[userId].games).forEach(function(gameId) {
                console.log('gameid - ' + gameId);
            });
        }

        socket.emit('login', {session: socket.id ,user_count: user_count});
    });

    socket.on('playnow',function(mode){
        var open_new_game = true;
        //FIND AVAILABLE GAME
        if (Object.keys(openGames).length > 0){
            for (var i=0;i<Object.keys(openGames).length;i++){
                var game = openGames[i+1];
                if (game.users.white == null) {
                    socket.gameId = game.id;
                    game.users.white = socket.userId;
                    users[game.users.white].games[game.id] = game.id;
                    socket.emit('startgame', {game: game, color: 'white'});
                    users_connections[game.users.black].emit('joingame',{game: game});
                    open_new_game = false;
                } else if (game.users.black == null) {
                    game.users.black = socket.userId;
                    users[game.users.black].games[game.id] = game.id;
                    socket.emit('startgame', {game: game, color: 'black'});
                    users_connections[game.users.white].emit('joingame',{game: game});
                    open_new_game = false;
                }

                if (open_new_game == false) {
                    activeGames[game.id] = game;
                    break;
                }
            }
        }

        //NEW GAME
        if (open_new_game) {
            game_id ++;
            var game = {
                id: game_id,
                board: null, 
                users: {white: null, black: null}
            };
            socket.gameId = game.id;
            var user_color = Math.floor(Math.random() * 2) + 1;
            if (user_color == 1) {
                game.users.white = socket.userId;
                users[game.users.white].games[game.id] = game.id;
                socket.emit('startgame', {game: game, color: 'white'});
            } else {
                game.users.black = socket.userId;
                users[game.users.black].games[game.id] = game.id;
                socket.emit('startgame', {game: game, color: 'black'});
            }
            openGames[game.id] = game;
        }
    });

    socket.on('move', function(move) {
        //console.log('Got move from client: ' + move.move);
        socket.broadcast.emit('move', move);
        activeGames[move.gameId].board = move.board;
    });

    socket.on("resign", function(msg) {
        console.log('resign '+msg.color);
        socket.emit('resign', {color: msg.color});  

        if (activeGames[msg.gameId]==null){
            //do nothing;
        } else if ((msg.color == 'white')&&(activeGames[msg.gameId]!=null)){
            var user_id = activeGames[msg.gameId].users.black;
            users_connections[user_id].emit('resign', {color: msg.color});
            delete activeGames[msg.gameId];
        } else if ((msg.color == 'black')&&(activeGames[msg.gameId]!=null)){
            var user_id = activeGames[msg.gameId].users.white;
            users_connections[user_id].emit('resign', {color: msg.color});
            delete activeGames[msg.gameId];
        }

        openGames[msg.gameId].users.white = 'game_end';
        openGames[msg.gameId].users.black = 'game_end';

    });    

    socket.on("disconnect", function(s) {
        user_count -= 1;
        console.log("Disconnected!!");
        console.log("user_count: "+user_count);
    });
});

http.listen(port, function() {
    console.log('listening on *: ' + port);
});