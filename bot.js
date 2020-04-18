var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var playerList = [];
function Room(roomID){
    this.members = new Set();
    this.roomID = roomID;
    this.leaderID = null;
};
function Player(userID, name){
    this.userID = userID;
    this.playerName =  name;
    this.role = null;
    this.team = null;
    this.vote = null;
    this.votes = 0;
    this.hasBeenLeprechaun = false;
};
var room1 = new Room(null);
var room2 = new Room(null);
var meetingRoom = new Room(null);
var isSet = false;
var betweenRounds = false;
var room1sent = null;
var room2sent = null;
var helpString = `
To set up the game: (This must be done first in order for the bot to work. You must have 3 seperate voice chats titled "Room 1", "Room 2", and "Meeting Room")
"!set"

To join the game before it starts:
"!join"

To leave the game before it starts:
"!leave"
                    
To play the game:
"!play, Role1, Role2, Role3..."
                    
For a list of roles:
"!roles"

To end the game and reveal roles:
"!end"

To show the player list:
"!list"

To clear the player list:
"!clear"

To share cards between you and another player:
"!cards, playerToShareWith"

To share color between you and another player:
"!colors, playerToShareWith"

To show just your card to another player:
"!showcard, thePersonYouAreShowingYourCard"

To show just your color to another player:
"!showcolor, thePersonYouAreShowingYourColor"

To clear the player list:
"!clear"

To publicly reveal your card:
"!publiccardreveal"

To publicly reveal your color: 
"!publiccolorreveal"

To nominate someone to a leaderless room:
"!nom, nameOfNominatedPlayer"

To vote for someone else to be the leader of the rooms. (Must have majority to usurp current leader):
"!vote, candidate"

To send someone to the other room between rounds (LEADER ONLY):
"!send, playerFromYourRoom"
                    `;
var roleMap = new Map(
[['President', {
    desc: 'You are the president. You are on the ' + stringColor('BLUE', 'BLUE') + ' team. The BLUE team wins if you do not gain the \'dead\' condition at the end of the game',
    team: 'BLUE'
}],
 ['Bomber', {
    desc: 'You are the bomber. You are on the ' + stringColor('RED', 'RED') + ' team. The RED team wins if the president gains the \'dead\' condition at the end of the game. Anyone sharing a room with you at the end of the game gains the \'dead\' condition',
    team: 'RED'
}],
 ['BlueTeam', {
    desc: 'You are a member of the ' + stringColor('BLUE', 'BLUE') + ' team, you win if the president does not gain the \'dead\' condition at the end of the game',
    team: 'BLUE'
}],
 ['RedTeam', {
    desc: 'You are a member of the ' + stringColor('RED', 'RED') + 'team, you win if the president gains the \'dead\' condition at the end of the game',
    team: 'RED'
}],
 ['RedCoy', {
    desc: 'You are a member of the ' + stringColor('RED', 'RED') + 'team, you win if the president gains the \'dead\' condition at the end of the game. You are also Coy, which means you cannot card share unless forced. You can still color share',
    team: 'RED'
}],
 ['BlueCoy', {
    desc: 'You are a member of the ' + stringColor('BLUE', 'BLUE') + ' team, you win if the president does not gain the \'dead\' condition at the end of the game. You are also Coy, which means you cannot card share unless forced. You can still color share',
    team: 'BLUE'
}],
 ['RedSpy', {
    desc: 'You are a member of the ' + stringColor('RED', 'RED') + ' team, you win if the president gains the \'dead\' condition at the end of the game. During a color share, you will be shown to be on the ' + stringColor('BLUE', 'BLUE') + ' team',
    team: 'BLUE'
}],
 ['BlueSpy', {
    desc: 'You are a member of the ' + stringColor('BLUE', 'BLUE') + ' team, you win if the president does not gain the \'dead\' condition at the end of the game. During a color share, you will be shown to be on the' + stringColor('RED', 'RED') + 'team',
    team: 'RED'
}],
 ['Gambler', {
    desc: 'You are on the ' + stringColor('GRAY', 'GRAY') + ' team. At the end of the game, before roles are revealed, you will publicly reveal and guess whether RED team, BLUE team, or neither team won. You win if you guess correctly',
    team: 'GRAY'
}],
['HotPotato', {
    desc: 'You are on the ' + stringColor('GRAY', 'GRAY') + ' team. At the end of the game, if you are the HotPotato, you lose. However if you card share or color share with anybody, they must switch cards with you.',
    team: 'GRAY'
}],
['Leprechaun', {
    desc: 'You are on the ' + stringColor('GREEN', 'GREEN') + ' team. If you are the leprechaun at the end of the game, you win. However if anyone asks you to card or color share, you must say yes. If the person you are sharing with has not been the leprechaun this game, you and that person must switch roles',
    team: 'GREEN'
}]
]);
roleList = [];
active = false;
let fp = -1;
let sp = -1;
let it = null;
var server = null;
var channels = null;
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt, ) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`

    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(', ');
        var cmd = args[0];
        args = args.splice(1);
        switch(cmd) {
            // !help
            case 'help':
                sendMessage(channelID, helpString);
            break;
            //!set
            case 'set':
                if(!active){
                    isSet = true;
                    server = bot.servers[bot.channels[channelID].guild_id];
                    channels = Object.values(server.channels)
                    for(var ch = 0; ch < channels.length; ch++){
                        switch(channels[ch].name){
                            case 'Room 1':
                                room1 = new Room(channels[ch].id);
                            break;
                            case 'Room 2':
                                room2 = new Room(channels[ch].id);
                            break;
                            case 'Meeting Room':
                                meetingRoom = new Room(channels[ch].id);
                            break;
                        }
                    }
                    console.log(room1);
                    console.log(room2);
                    console.log(meetingRoom)
                }
            break;
            //!roles
            case 'roles':
                var teams = ['BLUE', 'RED', 'GRAY', 'GREEN'];
                message = '';
                for(var j = 0; j < teams.length; j++){
                    message = String.prototype.concat('\n' +message, stringColor(teams[j], teams[j]));
                    roleMap.forEach((value, key) =>{                        
                        if(value.team == teams[j]){
                            message = String.prototype.concat(message, key + '\n');
                        }
                    })
                }
                sendMessage(channelID, message);;
            break;
            //!play
            case 'play':
                if(isSet && !active){
                    roleList = [];
                    var roundTimers = [3, 2, 1];
                    for(var j = 0; j < args.length; j++){
                        if(roleMap.get(args[j]) != undefined){
                            roleList.push(
                            {
                                role: args[j],
                                color: roleMap.get(args[j]).team,
                                desc: roleMap.get(args[j]).desc
                            });
                        }
                        else{
                            roleList = [];
                            sendMessage(channelID, args[j] + ' is not a valid role');
                            return;
                        }
                    }
                    if(playerList.length > 10 ){
                        roundTimers = [5, 4, 3, 2, 1];
                    }
                    if(playerList.length >= roleList.length){
                        max = playerList.length;
                        for(var j = 0; j < playerList.length; j++){
                            if((Math.random() < 0.5 && room1.members.size < Math.ceil(max / 2.0)) || room2.members.size == Math.ceil(max / 2.0)){
                                sendToChannel(room1.roomID, playerList[j].userID);
                                room1.members.add(playerList[j].userID);
                            }
                            else{
                                sendToChannel(room2.roomID, playerList[j].userID)
                                room2.members.add(playerList[j].userID);
                            }
                        }
                        it = roundTimers.values()
                        startRound(channelID);
                        playerList.sort(() => Math.random() - 0.5)
                        roleList.sort(() => Math.random() - 0.5)
                        for(var i=0; i < max; i++){
                            playerList[i].role = roleList[0].role;
                            playerList[i].team = roleList[0].color;
                            playerList[i].desc = roleList[0].desc;
                            if(playerList[i].role == 'Leprechaun'){
                                playerList[i].hasBeenLeprechaun = true;
                            }
                            sendMessage(playerList[i].userID, stringColor(playerList[i].team,'**'+playerList[i].role+'**') + playerList[i].desc + '\n');
                            roleList.shift();
                        }
                        active = true;
                    }
                    else{
                        sendMessage(channelID, 'Not enough roles');
                    }
                }
            break;
            //!colors
            case 'colors':
                if(args.length == 2){
                    fp = returnIndexOfPlayer(userID);
                    sp = returnIndexOfPlayer(args[0]);
                    if(fp != -1 && sp != -1 && inSameRoom(playerList[fp].userID, playerList[sp].userID)){
                        if((playerList[fp].role.includes('HotPotato') || playerList[sp].role.includes('HotPotato')) && ((playerList[fp].role.includes('Leprechaun') && !playerList[sp].hasBeenLeprechaun) || (playerList[sp].role.includes('Leprechaun') && !playerList[fp].hasBeenLeprechaun))){
                            cardSwap(playerList[fp], playerList[sp])
                        }
                        else{
                            colors(playerList[fp], playerList[sp], false);
                            colors(playerList[sp], playerList[fp], false);
                        } 
                    }
                    else{
                        sendMessage(channelID, "One or more of those players is not in the room.");
                    }
                }
                else{
                    sendMessage(channelID, "Improper number of arguments for color sharing.");
                }
            break;
            //!cards
            case 'cards':
                    if(args.length == 1){
                        fp = returnIndexOfPlayer(userID);
                        sp = returnIndexOfPlayer(args[0]);
                        if(fp != -1 && sp != -1 && inSameRoom(playerList[fp].userID, playerList[sp].userID)){
                            if(playerList[fp].role.includes('HotPotato') || playerList[sp].role.includes('HotPotato') || (playerList[fp].role.includes('Leprechaun') && !playerList[sp].hasBeenLeprechaun) || (playerList[sp].role.includes('Leprechaun') && !playerList[fp].hasBeenLeprechaun)){
                                cardSwap(playerList[fp], playerList[sp])
                            }
                            else{
                                cards(playerList[fp], playerList[sp], false);
                                cards(playerList[sp], playerList[fp], false);
                            }
                        }
                        else{
                            sendMessage(channelID, "One or more of those players is not in the room.");
                        }
                    }
                    else{
                        sendMessage(channelID, "Improper number of arguments for color sharing.");
                    }
                break;
            //!colorshow
            case 'colorshow':
                if(args.length == 1){
                    fp = returnIndexOfPlayer(userID);
                    sp = returnIndexOfPlayer(args[0]);
                    if(fp != -1 && sp != -1 && inSameRoom(playerList[fp].userID, playerList[sp].userID)){
                        colors(playerList[fp], playerList[sp], false);
                    }
                    else{
                        sendMessage(channelID, "One or more of those players is not in the room.");
                    }
                }
                else{
                    sendMessage(channelID, "Improper number of arguments for color showing.");
                }
            break;
            //!cardshow
            case 'cardshow':
                    if(args.length == 1){
                        fp = returnIndexOfPlayer(userID);
                        sp = returnIndexOfPlayer(args[0]);
                        if(fp != -1 && sp != -1 && inSameRoom(playerList[fp].userID, playerList[sp].userID)){
                            cards(playerList[fp], playerList[sp], false);
                        }
                        else{
                            sendMessage(channelID, "One or more of those players is not in the room.");
                        }
                    }
                    else{
                        sendMessage(channelID, "Improper number of arguments for card showing.");
                    }
            //!cardreveal
            case 'publiccardreveal':
                if(!betweenRounds){
                    fp = returnIndexOfPlayer(userID);
                    if(fp != -1){
                        if(bot.channels[channelID] != undefined){
                            sendMessage(channelID, playerList[fp].playerName + ' is ' + stringColor(playerList[fp].team, playerList[fp].role));
                        }
                        else{
                            sendMessage(channelID, "That message belongs in the public text channel.");
                        }
                    }
                    else{
                        sendMessage(channelID, "One or more of those players is not in the room.");
                    }
                }
            break;
            //!colorreveal
            case 'publiccolorreveal':
                if(!betweenRounds){
                    fp = returnIndexOfPlayer(userID);
                    if(fp != -1){
                        if(bot.channels[channelID] != undefined){
                            sendMessage(channelID, playerList[fp].playerName + ' is ' + stringColor(playerList[fp].team, playerList[fp].team));
                        }
                        else{
                            sendMessage(channelID, "That message belongs in the public text channel.");
                        }
                    }
                    else{
                        sendMessage(channelID, "One or more of those players is not in the room.");
                    }
                }
            break;
            //!nom
            case 'nom':
                if(!betweenRounds){
                    let ind = null;
                    let leaderID = '';
                    for(var i = 0; i < playerList.length; i++){
                        if(args[0] == playerList[i].playerName){
                            ind = i;
                            leaderID = playerList[i].userID;
                        }
                    }
                    let isValid = true;
                    if(room1.members.has(userID) && room1.members.has(leaderID) && userID != leaderID && ind != null){
                        if(room1.leaderID != null){
                            isValid = false;
                        }
                        else{
                            room1.leaderID = leaderID;
                        }
                    }
                    else if(room2.members.has(userID) && room2.members.has(leaderID) && userID != leaderID && ind != null){
                        if(room1.leaderID != null){
                            isValid = false;
                        }
                        else{
                            room2.leaderID = leaderID;
                        }
                    }
                    else{
                        isValid = false;
                    }

                    let message = "Invalid Nomination";
                    if(isValid && ind != null){
                        message = playerList[ind].playerName + " is now room leader!"
                    }
                    sendMessage(channelID, message);
                }
                else{
                    sendMessage(channelID, 'That can\'t be done between rounds!');
                }

            break;

            //!vote
            case 'vote':
                if(!betweenRounds || !active){
                    if(args.length == 1){
                        ind = null;
                        let voter = null;
                        let result = ''
                        g = returnIndexOfPlayer(args[0]);
                        if(g != -1){
                            cand = playerList[g];
                            voter = playerList[returnIndexOfPlayer(userID)];
                        }
                        else{
                            sendMessage(channelID, "That is not a player in the game");
                            return;
                        }
                        if(inSameRoom(cand.userID, voter.userID)){
                            if(voter.vote != null){
                                playerList[returnIndexOfPlayer(voter.vote)].votes--;
                                console.log(voter.vote + ' lost a vote!');
                            }
                            voter.vote = cand.playerName;
                            cand.votes++;
                            result = cand.playerName + ' is now room leader!';
                            console.log(cand.playerName + ' gained a vote')
                            if(room1.members.has(cand.userID) && cand.votes > room1.members.size / 2){
                                room1.leaderID = cand.userID;
                            }
                            else if (room2.members.has(cand.userID) && cand.votes > room2.members.size / 2){
                                room2.leaderID = cand.userID;
                            }
                            else{
                                result = cand.playerName + ' now has ' + cand.votes + ' votes!';
                            }
                            sendMessage(channelID, result);
                        } 
                        else{
                            sendMessage(channelID, 'Voting for players in the other room is not allowed.');
                        }
                    }
                    else{
                        sendMessage(channelID, 'Wrong number of arguments for voting.');
                    }

                }
                else{
                    sendMessage(channelID, 'That can only be done during rounds');
                }
            break;

            //!send
            case 'send':
                if(betweenRounds){
                    if(room1.leaderID == userID){
                        for(var i = 0; i < playerList.length; i++){
                            if(playerList[i].playerName == args[0] && playerList[i].userID != room1.leaderID){
                                if(room1.members.has(playerList[i].userID)){
                                    room1sent = playerList[i]
                                }
                            }
                        }
                    }
                    else if(room2.leaderID == userID){
                        for(var i = 0; i < playerList.length; i++){
                            if(playerList[i].playerName == args[0] && playerList[i].userID != room1.leaderID){
                                if(room2.members.has(playerList[i].userID)){
                                    room2sent = playerList[i]
                                }
                            }
                        }
                    }
                    else{
                        sendMessage(channelID, 'You are not room leader!');
                    }
                    
                }
                else{
                    sendMessage(channelID, 'That can only be done between rounds!');
                }
                if(room1sent != null && room2sent != null){
                    sendToChannel(room2.roomID, room1sent.userID);
                    sendToChannel(room1.roomID, room2sent.userID);
                    room1.members.delete(room1sent.userID);
                    room1.members.add(room2sent.userID)
                    room2.members.delete(room2sent.userID);
                    room2.members.add(room1sent.userID)
                    sendToChannel(room2.roomID, room2.leaderID);
                    sendToChannel(room1.roomID, room1.leaderID);
                    room1sent = null;
                    room2sent = null;
                    betweenRounds = false;
                    startRound(channelID);
                }
            break;
            //!clear
            case 'clear':
                if(bot.channels[channelID] != undefined){
                    if(!active){
                        playerList = [];
                    }
                    else{
                        sendMessage(channelID, "Not while a game is active");
                    }
                }
                else{
                    sendMessage(channelID, "That message belongs in the public text channel.");
                }
            break;
            //!end
            case 'end':
                endGame(channelID);
            break;
            //!join
            case 'join':
                if(!active){
                    if(isSet){
                        if(bot.channels[channelID] != undefined){
                            sendToChannel(meetingRoom.roomID, userID);
                            var newPlayer = new Player(userID, (bot.servers[bot.channels[channelID].guild_id].members[userID].nick != null ? bot.servers[bot.channels[channelID].guild_id].members[userID].nick : user));
                            if(!playerList.some(player => player.userID === newPlayer.userID)){
                                playerList.push(newPlayer)
                            }
                            else{
                                sendMessage(channelID, (bot.servers[bot.channels[channelID].guild_id].members[userID].nick != null ? bot.servers[bot.channels[channelID].guild_id].members[userID].nick : user) + " is already in the game");
                            }
                        }
                        else{
                            sendMessage(channelID, "That message belongs in the public text channel..");
                        }
                    }
                    else{
                        sendMessage(channelID, "The game is not set.")
                    }
                }
                else{
                    sendMessage(channelID, "You aren't allowed to join an ongoing game!")
                }
            break;
            //!leave
            case 'leave':
                if(!active){
                    playerList.splice(returnIndexOfPlayer(userID), 1);
                }
                else{
                    sendMessage(channelID, 'Leaving mid-game is not allowed!');
                }
            break;
            case 'list':
                    for(var i=0; i < playerList.length; i++){
                        sendMessage(channelID, playerList[i].playerName);
                    }
            break;
            // Just add any case commands if you want to..
         }
     }
});

function colors(sender, receiver, forced){
    if(!sender.role.includes("ShyGuy") && !receiver.role.includes("ShyGuy") || forced){
        sendMessage(receiver.userID, sender.playerName + ' is ' + stringColor(sender.team, sender.team));
    }
    else{
        sendMessage(sender.userID, "This action cannot be performed for one or more reasons")
    }
}

function cards(sender, receiver, forced){
    if(!sender.role.includes("ShyGuy") && !sender.role.includes('Coy') && !receiver.role.includes("ShyGuy") && !receiver.role.includes("Coy") || forced){
    sendMessage(receiver.userID, sender.playerName + ' is ' + stringColor(sender.team, sender.role));
    }
    else{
        sendMessage(sender.userID, "This action cannot be performed for one or more reasons")
    }
}

function inSameRoom(player1, player2){
    if((room1.members.has(player1) && room1.members.has(player2) || (room2.members.has(player1) && room2.members.has(player2)))){
        return true;
    }
    else{
        return false;
    }
}

function stringColor(team, message){
    switch(team) {
        case('BLUE'):
            return('\`\`\`ini\n[ ' + message + ' ]\n\`\`\`');
        case('RED'):
            return('\`\`\`diff\n- ' + message + ' -\n\`\`\`');
        case('GRAY'):
            return('\`\`\`bash\n# ' + message + ' #\n\`\`\`');
        case('GREEN'):
            return('\`\`\`diff\n! ' + message + ' !\n```');
    }
}

function cardSwap(player1, player2){
    let temp = {role: player1.role, team: player1.team, desc: player1.desc}
    if(player1.role == 'Leprechaun' || player2.role == 'Leprechaun'){
        player1.hasBeenLeprechaun = true;
        player2.hasBeenLeprechaun = true;
    }
    player1.role = player2.role;
    player1.team = player2.team;
    player1.desc = player2.desc;
    player2.role = temp.role;
    player2.team = temp.team;
    player2.desc = temp.desc;
    sendMessage(player1.userID, '**CARD SWAP** \n Your new role is ' + stringColor(player1.team,'**'+player1.role+'**') + player1.desc + '\n')
    sendMessage(player2.userID, '**CARD SWAP** \n Your new role is ' + stringColor(player2.team,'**'+player2.role+'**') + player2.desc + '\n')
}


function startRound(channelID){
    x = it.next();
    q = 15000;
    if(x.value == undefined){
        sendMessage(channelID, "If you are the Gambler, Sniper, or Private Eye, please make your guess now. You have 10 seconds. Not guessing results in a loss");
        setTimeout(endGame, 10000, channelID);
    }
    else{
        sendMessage(channelID, "This round will be " + x.value + " minutes long.");
        setTimeout(function(){ if(active){bot.sendMessage({to:channelID, message: '1 minute left in the round', tts: true})}}, (x.value - 1)  *  q);
        setTimeout(function(){ if(active){bot.sendMessage({to:channelID, message: '30 seconds left in the round', tts: true})}}, (x.value - 0.5)  * q);
        setTimeout(endRound, x.value * q, channelID);
    }
}

function endRound(channelID){
    sendMessage(channelID, "This round is over ");
    sendToChannel(meetingRoom.roomID, (room2.leaderID != null ? room2.leaderID : (Array.from(room2.members))[0]));
    sendToChannel(meetingRoom.roomID, (room1.leaderID != null ? room1.leaderID : (Array.from(room1.members))[0]));
    for(var l = 0; l < playerList.length; l++){
        playerList[l].votes = 0;
        playerList[l].prevVote = null;
    }
    betweenRounds = true;
}

function returnIndexOfPlayer(id){
    if(id != null){
        for(var j = 0; j < playerList.length; j++){
            if(playerList[j].playerName == id || playerList[j].userID == id){
                return j;
            }
        }
    }
    return -1;
}
function RoomRoles(room){
    let iterator = room.members.values()
    let string = ''
    let s = iterator.next();
    while(s.value != undefined){
        for(var j = 0; j < playerList.length; j++){
            if(playerList[j].userID == s.value){
                string = String.prototype.concat(string, playerList[j].playerName + stringColor(playerList[j].team, playerList[j].role));
            }
        }
        s = iterator.next()
    }
    return string;
}
function sendToChannel(chID, uID){
    bot.moveUserTo(
        {
            serverID: server.id,
            userID: uID,
            channelID: chID
        });
}

function sendMessage(dest, message){
    bot.sendMessage({to:dest, message: message});
}

function endGame(channelID){
    if(bot.channels[channelID] != undefined){
        if(active){
            message = 'Room 1:\n';
            message = String.prototype.concat(message, RoomRoles(room1));
            message = String.prototype.concat(message, '\nRoom 2:\n');
            message = String.prototype.concat(message, RoomRoles(room2));
            message = String.prototype.concat(message, '\nBuried Card(s):\n');
            if(roleList.length > 0){
                for(var i=0; i < roleList.length; i++){
                    message = String.prototype.concat(message, stringColor(roleList[i].color, roleList[i].role));
                }
            }
            sendMessage(channelID, message);
            roleList = [];
            room1.members = new Set();
            room1.leaderID = null;
            room2.members = new Set();
            room2.leaderID = null;
            active = false;
            betweenRounds = false;
            for(let o = 0; o < playerList.length; o++){
                sendToChannel(meetingRoom.roomID, playerList[o].userID);
            }
        }
        else{
            sendMessage(channelID,"No active game");
        }
    }
    else{
        sendMessage(channelID,"That message belongs in the public text channel.");
    }
}
