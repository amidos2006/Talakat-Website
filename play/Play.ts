let keys:any = {
    LEFT_ARROW: 37,
    RIGHT_ARROW: 39,
    UP_ARROW: 38,
    DOWN_ARROW: 40,
    left: false,
    right: false,
    up: false,
    down: false
}
let newWorld:Talakat.World = null;
let currentWorld:Talakat.World = null;
let action:Talakat.Point = null;
let agent:Agent = null;
let interval:any = null;

let numberOfCalls:number;
let totalUpdateTime:number;
let totalDrawTime:number;

let spawnerGrammar:any;
let scriptGrammar:any;
let parameters:any;

let playerImg:any;
let bossImg:any;

function preload():void{
    spawnerGrammar = loadJSON("assets/spawnerGrammar.json", spawnersReady);
    parameters = loadJSON("assets/parameters.json");
    playerImg = loadImage("assets/player.png");
    bossImg = loadImage("assets/boss.png");
}

function spawnersReady():void{
    scriptGrammar = loadJSON("assets/scriptGrammar.json", addSpawnerNames);
}

function addSpawnerNames():void{
    for (let n of scriptGrammar.name) {
        spawnerGrammar.name.push(n);
    }
}

function debugLog(text:string):void{
    document.getElementById("debugText").textContent += text;
}

function setup():void{
    let canvas = createCanvas(400, 640);
    canvas.parent("game");
    action = new Talakat.Point();
    background(0, 0, 0);
    stopGame();
}

function startGame(input:string):void{
    stopGame();
    newWorld = new Talakat.World(width, height);
    let script:any = JSON.parse(input);
    newWorld.initialize(script);
}

function stopGame():void{
    numberOfCalls = 0;
    totalUpdateTime = 0;
    totalDrawTime = 0;
    if(interval != null){
        clearInterval(interval);
        debugLog("Interrupted.\n");
    }
    if(agent != null){
        agent = null;
        debugLog("Interrupted.\n");
    }
    if(currentWorld != null){
        currentWorld = null;
        debugLog("Interrupted.\n");
    }
}

function playAIGame(input:string):void{
    stopGame();
    newWorld = new Talakat.World(width, height);
    let script:any = JSON.parse(input);
    newWorld.initialize(script);
    agent = new AStar("time", parameters.repeatingAction);
    agent.initialize();
}

function updateGenerate():void{

}

function generateRandomGame():void{
    let input:string = "{\"spawners\":{";
    for(let name of scriptGrammar.name){
        spawnerGrammar.name.splice(spawnerGrammar.name.indexOf(name),1);
        let spawnerTracery:tracery.Grammar = tracery.createGrammar(spawnerGrammar);
        input += "\"" + name + "\":" + spawnerTracery.flatten("#origin#") + ",";
        spawnerGrammar.name.push(name);
    }
    let scriptTracery:tracery.Grammar = tracery.createGrammar(scriptGrammar);
    input = input.substring(0, input.length - 1) + "}, \"boss\":{\"script\":[";
    for(let p of scriptGrammar.percent){
        input += "{\"health\":" + "\"" + p + "\",\"events\":[" + scriptTracery.flatten("#events#") + "]},";
    }
    input = input.substring(0, input.length - 1) + "]}}";

    document.getElementById('inputText').textContent = input;
}

function setKey(key:number, down:boolean):void{
    if(key == keys.LEFT_ARROW){
        keys.left = down;
    }
    if(key == keys.RIGHT_ARROW){
        keys.right = down;
    }
    if(key == keys.UP_ARROW){
        keys.up = down;
    }
    if(key == keys.DOWN_ARROW){
        keys.down = down;
    }
}

function keyPressed():void{
    setKey(keyCode, true);
}

function keyReleased():void{
    setKey(keyCode, false);
}

function draw():void{
    action.x = 0;
    action.y = 0;
    if(currentWorld != null){
        let startTime:number = new Date().getTime();
        if(keys.left){
            action.x -= 1;
        }
        if(keys.right){
            action.x += 1;
        }
        if(keys.up){
            action.y -= 1;
        }
        if(keys.down){
            action.y += 1;
        }
        if(agent != null){
            action = ActionNumber.getAction(agent.getAction(currentWorld, 40, parameters));
            for (let i: number = 0; i < parameters.repeatingAction-1; i++){
                currentWorld.update(action);
            }
        }
        currentWorld.update(action);
        totalUpdateTime += (new Date().getTime() - startTime);
        
        startTime = new Date().getTime();
        background(0,0,0);
        worldDraw(currentWorld);
        totalDrawTime += (new Date().getTime() - startTime);

        numberOfCalls += 1;
        document.getElementById("updateTime").innerText = (totalUpdateTime / numberOfCalls).toFixed(5);
        document.getElementById("drawTime").innerText = (totalDrawTime / numberOfCalls).toFixed(5);
    }

    if(newWorld != null){
        currentWorld = newWorld;
        newWorld = null;
    }
}

function worldDraw(world:Talakat.World):void{
    strokeWeight(4);
    noFill();
    stroke(color(124, 46, 46));
    arc(world.boss.x, world.boss.y, 200, 200, 0, 2 * PI * world.boss.getHealth());

    strokeWeight(0);
    for(let bullet of world.bullets){
        fill(color(bullet.color >> 16 & 0xff, bullet.color >> 8 & 0xff, bullet.color >> 0 & 0xff));
        ellipse(bullet.x, bullet.y, 2 * bullet.radius, 2 * bullet.radius);
        fill(color(255, 255, 255));
        ellipse(bullet.x, bullet.y, 1.75 * bullet.radius, 1.75 * bullet.radius);
    }
    image(bossImg, world.boss.x - bossImg.width / 2, world.boss.y - bossImg.height / 2)
    
    image(playerImg, world.player.x-playerImg.width/2, world.player.y-playerImg.height/2)
    fill(color(255, 255, 255));
    ellipse(world.player.x, world.player.y, 2 * world.player.radius, 2 * world.player.radius);
}