var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var playerList = [];
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
}],
 ['RedSpy', {
    desc: 'You are a member of the ' + stringColor('RED', 'RED') + ' team, you win if the president gains the \'dead\' condition at the end of the game. During a color share, you will be shown to be on the ' + stringColor('BLUE', 'BLUE') + ' team',
    team: 'RED'
}],
 ['BlueSpy', {
    desc: 'You are a member of the ' + stringColor('BLUE', 'BLUE') + ' team, you win if the president does not gain the \'dead\' condition at the end of the game. During a color share, you will be shown to be on the' + stringColor('RED', 'RED') + 'team',
    team: 'BLUE'
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
            // !play
            case 'play':
                roleList = [];
                for(var j = 0; j < args.length; j++){
                    roleList.push(
                        {
                            role: args[j],
                            color: roleMap.get(args[j]).team,
                            desc: roleMap.get(args[j]).desc
                        });
                }
                max = playerList.length;
                playerList.sort(() => Math.random() - 0.5)
                roleList.sort(() => Math.random() - 0.5)
                for(var i=0; i < max; i++){
                    playerList[i].role = roleList[0].role;
                    playerList[i].team = roleList[0].color;
                    playerList[i].desc = roleList[0].desc;
                    if(playerList[i].role == 'Leprechaun'){
                        playerList[i].hasBeenLeprechaun = true;
                    }
                    bot.sendMessage({
                        to: playerList[i].userID,
                        message: stringColor(playerList[i].team,'**'+playerList[i].role+'**') + playerList[i].desc + '\n'
                    });
                    roleList.shift();
                }
                active = true;
            break;
            //!colorshare
            case 'colorshare':
                if(args.length == 2){
                    fp = -1;
                    sp = -1;
                    for(let i = 0; i < playerList.length; i++){
                        if(playerList[i].playerName == args[0]){
                            fp = i
                        }
                        if(playerList[i].playerName == args[1]){
                            sp = i
                        }
                    }
                    if(fp != -1 && sp != -1){
                        if(playerList[fp].role.includes('HotPotato') || playerList[sp].role.includes('HotPotato') || (playerList[fp].role.includes('Leprechaun') && !playerList[sp].hasBeenLeprechaun) || (playerList[sp].role.includes('Leprechaun') && !playerList[fp].hasBeenLeprechaun)){
                            cardSwap(playerList[fp], playerList[sp], channelID)
                        }
                        else{
                            colorShare(playerList[fp], playerList[sp], false);
                            colorShare(playerList[sp], playerList[fp], false);
                        } 
                    }
                }
                else{
                    bot.sendMessage({
                        to: channelID,
                        message: "Improper number of arguments for color sharing"
                    });
                }
            break;
            //!cardshare
            case 'cardshare':
                    if(args.length == 2){
                        fp = -1;
                        sp = -1;
                        for(let i = 0; i < playerList.length; i++){
                            if(playerList[i].playerName == args[0]){
                                fp = i
                            }
                            if(playerList[i].playerName == args[1]){
                                sp = i
                            }
                        }
                        if(fp != -1 && sp != -1){
                            cardShare(playerList[fp], playerList[sp], false);
                            cardShare(playerList[sp], playerList[fp], false);
                            if(playerList[fp].role.includes('HotPotato') || playerList[sp].role.includes('HotPotato') || (playerList[fp].role.includes('Leprechaun') && !playerList[sp].hasBeenLeprechaun) || (playerList[sp].role.includes('Leprechaun') && !playerList[fp].hasBeenLeprechaun)){
                                cardSwap(playerList[fp], playerList[sp], channelID)
                            } 
                        }
                    }
                    else{
                        bot.sendMessage({
                            to: channelID,
                            message: "Improper number of arguments for color sharing"
                        });
                    }
                break;
            //!colorshow
            case 'colorshow':
                if(args.length == 1){
                    fp = -1;
                    sp = -1
                    for(let i = 0; i < playerList.length; i++){
                        if(playerList[i].userID == userID){
                            fp = i
                        }
                        if(playerList[i].playerName == args[0]){
                            sp = i
                        }
                        if(fp != -1 && sp != -1){
                            colorShare(playerList[fp], playerList[sp], false);
                        }
                    }
                }
                else{
                    bot.sendMessage({
                        to: channelID,
                        message: "Improper number of arguments for showing"
                    });
                }
            break;
            //!cardshow
            case 'cardshow':
                    if(args.length == 1){
                        fp = -1;
                        sp = -1;
                        for(let i = 0; i < playerList.length; i++){
                            if(playerList[i].userID == userID){
                                fp = i

                            }
                            if(playerList[i].playerName == args[0]){
                                sp = i
                            }
                        }
                        if(fp != -1 && sp != -1){
                            cardShare(playerList[fp], playerList[sp], false);
                        }
                    }
                    else{
                        bot.sendMessage({
                            to: channelID,
                            message: "Improper number of arguments for showing"
                        });
                    }
            //!cardreveal
            case 'publiccardreveal':
                    fp = -1;
                    for(let i = 0; i < playerList.length; i++){
                        if(playerList[i].userID == userID){
                            fp = i
                        }
                    }
                    if(fp != -1){
                        if(bot.channels[channelID] != undefined){
                            bot.sendMessage({to: channelID, message: playerList[fp].playerName + ' is ' + stringColor(playerList[fp].team, playerList[fp].role) });
                        }
                        else{
                            bot.sendMessage({to: channelID, message: "That message belongs in the public text channel"});
                        }
                    }
            break;
            //!colorreveal
            case 'publiccolorreveal':
                    fp = -1;
                    for(let i = 0; i < playerList.length; i++){
                        if(playerList[i].userID == userID){
                            fp = i
                        }
                    }
                    if(fp != -1){
                        if(bot.channels[channelID] != undefined){
                            bot.sendMessage({to: channelID, message: playerList[fp].playerName + ' is ' + stringColor(playerList[fp].team, playerList[fp].team) });
                        }
                        else{
                            bot.sendMessage({to: channelID, message: "That message belongs in the public text channel"});
                        }
                    }
            break;
            //!clear
            case 'clear':
                if(bot.channels[channelID] != undefined){
                    if(!active){
                        playerList = [];
                    }
                    else{
                        bot.sendMessage({to: channelID, message: "Not while a game is active"});
                    }
                }
                else{
                    bot.sendMessage({to: channelID, message: "That message belongs in the public text channel"});
                }
            break;
            //!end
            case 'end':
                    if(bot.channels[channelID] != undefined){
                        for(var i=0; i < playerList.length; i++){
                            bot.sendMessage({
                                to: channelID,
                                message: playerList[i].playerName + stringColor(playerList[i].team, playerList[i].role) + '\n\n'
                            });
                        }
                        bot.sendMessage({
                            to: channelID,
                            message: '\n'
                        });
                        if(roleList.length > 0){
                            bot.sendMessage({
                                to: channelID,
                                message: 'Buried Card(s):'
                            });
                            for(var i=0; i < roleList.length; i++){
                                bot.sendMessage({
                                    to: channelID,
                                    message: ' Card ' + i + '\n' + stringColor(roleList[i].color, roleList[i].role)
                                });
                            }
                        }
                        roleList = [];
                        active = false;
                    }
                    else{
                        bot.sendMessage({to: channelID, message: "That message belongs in the public text channel"});
                    }

            break;
            //!join
            case 'join':
                if(bot.channels[channelID] != undefined){
                    var newPlayer =
                        {
                            userID : userID,
                            playerName : (bot.servers[bot.channels[channelID].guild_id].members[userID].nick != null ? bot.servers[bot.channels[channelID].guild_id].members[userID].nick : user),
                            role : null,
                            team : null,
                            hasBeenLeprechaun: false
                        }
                    if(!playerList.some(player => player.userID === newPlayer.userID)){
                        playerList.push(newPlayer)
                    }
                    else{
                        bot.sendMessage({
                            to: channelID,
                            message: (bot.servers[bot.channels[channelID].guild_id].members[userID].nick != null ? bot.servers[bot.channels[channelID].guild_id].members[userID].nick : user) + " is already in the game"
                        })
                    }
                }
                else{
                    bot.sendMessage({to: channelID, message: "That message belongs in the public text channel"});
                }
            break;
            case 'list':
                    for(var i=0; i < playerList.length; i++){
                        bot.sendMessage({
                            to: channelID,
                            message: playerList[i].playerName
                        });
                    }
            break;
            // Just add any case commands if you want to..
         }
     }
});

function colorShare(sender, receiver, forced){
    if(!sender.role.includes("ShyGuy") && !receiver.role.includes("ShyGuy") || forced){
        bot.sendMessage({to: receiver.userID, message: sender.playerName + ' is ' + stringColor(sender.team, sender.team) });
    }
    else{
        bot.sendMessage({to: sender.userID, message: "This action cannot be performed for one or more reasons" });
    }
}

function cardShare(sender, receiver, forced){
    if(!sender.role.includes("ShyGuy") && !sender.role.includes('Coy') && !receiver.role.includes("ShyGuy") && !receiver.role.includes("Coy") || forced){
    bot.sendMessage({to: receiver.userID, message: sender.playerName + ' is ' + stringColor(sender.team, sender.role) });
    }
    else{
        bot.sendMessage({to: sender.userID, message: "This action cannot be performed for one or more reasons" });
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

function cardSwap(player1, player2, channelID){
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
    bot.sendMessage({
        to: player1.userID, 
        message: '**CARD SWAP** \n Your new role is ' + stringColor(player1.team,'**'+player1.role+'**') + player1.desc + '\n'
    });
    bot.sendMessage({
        to: player2.userID, 
        message: '**CARD SWAP** \n Your new role is ' + stringColor(player2.team,'**'+player2.role+'**') + player2.desc + '\n'
    });
}
