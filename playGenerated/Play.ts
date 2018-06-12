let gameState:any = {
    LOADING: -1,
    MAIN_SCREEN: 0,
    LEVEL_SCREEN: 1,
    PLAY_LEVEL: 2,
    GAME_OVER: 3,
    GAME_WIN: 4
};

let keys:any = {
    LEFT_ARROW: 37,
    RIGHT_ARROW: 39,
    UP_ARROW: 38,
    DOWN_ARROW: 40,
    SPACE_KEY: 32,
    left: false,
    right: false,
    up: false,
    down: false,
    space: false
}
let newWorld:Talakat.World = null;
let currentWorld:Talakat.World = null;
let action:Talakat.Point = null;

let parameters:any;
let generatedLevels:any;
let selectedLevelsArray:any;

let playerImg:any;
let bossImg:any;

let currentLevel:number = 0;
let selectedLevel:string = "";
let totalLevel:number = 18;
let currentState = gameState.LOADING;
let flashingTimer = 0;
let sinWaveTimer = 0;
let loaded = 0;

function preload():void{
    parameters = loadJSON("assets/parameters.json", finishedLoading);
    playerImg = loadImage("assets/player.png");
    bossImg = loadImage("assets/boss.png");

    generatedLevels = {};
    generatedLevels["HighHigh"] = loadStrings("results/HighHigh.txt", finishedLoading);
    generatedLevels["HighMed"] = loadStrings("results/HighMed.txt", finishedLoading);
    generatedLevels["HighLow"] = loadStrings("results/HighLow.txt", finishedLoading);
    generatedLevels["MedHigh"] = loadStrings("results/MedHigh.txt", finishedLoading);
    generatedLevels["MedMed"] = loadStrings("results/MedMed.txt", finishedLoading);
    generatedLevels["MedLow"] = loadStrings("results/MedLow.txt", finishedLoading);
    generatedLevels["LowHigh"] = loadStrings("results/LowHigh.txt", finishedLoading);
    generatedLevels["LowMed"] = loadStrings("results/LowMed.txt", finishedLoading);
    generatedLevels["LowLow"] = loadStrings("results/LowLow.txt", finishedLoading);
}

function finishedLoading(){
    loaded += 1;
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
    newWorld = new Talakat.World(width, height, parameters.maxNumBullets);
    let script:any = JSON.parse(input);
    newWorld.initialize(script);
}

function stopGame():void{
    if(currentWorld != null){
        currentWorld = null;
    }
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
    if(key == keys.SPACE_KEY){
        keys.space = down;
    }
}

function keyPressed():void{
    setKey(keyCode, true);
}

function keyReleased():void{
    setKey(keyCode, false);
}

function draw():void{
    switch(currentState){
        case gameState.LOADING:
            loadingScreen();
        break;
        case gameState.MAIN_SCREEN:
            mainScreen();
        break;
        case gameState.LEVEL_SCREEN:
            levelScreen();
        break;
        case gameState.PLAY_LEVEL:
            playLevel();
        break;
        case gameState.GAME_OVER:
            gameOver();
        break;
    }
}

function copySelectedLevel(){
    document.getElementById("copyButton").setAttribute("data-clipboard-text", selectedLevel);
    let clipboard = new ClipboardJS('.btn');
    clipboard.on('success', function (e) {
        console.info('Accion:', e.action);
        console.info('Texto:', e.text);
        console.info('Trigger:', e.trigger);
        e.clearSelection();
    });

    clipboard.on('error', function (e) {
        console.error('Accion:', e.action);
        console.error('Trigger:', e.trigger);
    });
}

function loadingScreen():void{
    clear();
    background(0, 0, 0);

    let tempValue = 10 * Math.sin(2 * Math.PI / 180 * sinWaveTimer);
    textSize(32);
    fill(255, 255, 255);
    textAlign(CENTER);
    text("LOADING", 200, 320 + tempValue);
    if(loaded >= 10){
        currentState = gameState.MAIN_SCREEN;
        selectedLevelsArray = {};

        generatedLevels["LowLow"].sort();
        generatedLevels["LowMed"].sort();
        generatedLevels["LowHigh"].sort();
        generatedLevels["MedLow"].sort();
        generatedLevels["MedMed"].sort();
        generatedLevels["MedHigh"].sort();
        generatedLevels["HighLow"].sort();
        generatedLevels["HighMed"].sort();
        generatedLevels["HighHigh"].sort();
        
        selectedLevelsArray["low"] = [];
        selectedLevelsArray["med"] = [];
        selectedLevelsArray["high"] = [];

        let skippedValue:number = 3;
        for (let i: number = Math.floor(Math.random() * skippedValue) + 1; i < generatedLevels["LowMed"].length; i++){
            selectedLevelsArray["low"].push("LowMed/" + generatedLevels["LowMed"][i]);
        }
        for (let i: number = Math.floor(Math.random() * skippedValue) + 1; i < generatedLevels["LowHigh"].length; i++) {
            selectedLevelsArray["low"].push("LowHigh/" + generatedLevels["LowHigh"][i]);
        }
        for (let i: number = Math.floor(Math.random() * skippedValue) + 1; i < generatedLevels["LowLow"].length; i++) {
            selectedLevelsArray["low"].push("LowLow/" + generatedLevels["LowLow"][i]);
        }

        for (let i: number = Math.floor(Math.random() * skippedValue) + 1; i < generatedLevels["MedMed"].length; i++) {
            selectedLevelsArray["med"].push("MedMed/" + generatedLevels["MedMed"][i]);
        }
        for (let i: number = Math.floor(Math.random() * skippedValue) + 1; i < generatedLevels["MedHigh"].length; i++) {
            selectedLevelsArray["med"].push("MedHigh/" + generatedLevels["MedHigh"][i]);
        }
        for (let i: number = Math.floor(Math.random() * skippedValue) + 1; i < generatedLevels["MedLow"].length; i++) {
            selectedLevelsArray["med"].push("MedLow/" + generatedLevels["MedLow"][i]);
        }

        for (let i: number = Math.floor(Math.random() * skippedValue) + 1; i < generatedLevels["HighMed"].length; i++) {
            selectedLevelsArray["high"].push("HighMed/" + generatedLevels["HighMed"][i]);
        }
        for (let i: number = Math.floor(Math.random() * skippedValue) + 1; i < generatedLevels["HighHigh"].length; i++) {
            selectedLevelsArray["high"].push("HighHigh/" + generatedLevels["HighHigh"][i]);
        }
        for (let i: number = Math.floor(Math.random() * skippedValue) + 1; i < generatedLevels["HighLow"].length; i++) {
            selectedLevelsArray["high"].push("HighLow/" + generatedLevels["HighLow"][i]);
        }
    }
}

function mainScreen():void{
    clear();
    background(0, 0, 0);

    let tempValue = 10 * Math.sin(2 * Math.PI / 180 * sinWaveTimer);
    image(bossImg, 200 - bossImg.width / 2, 270 - bossImg.height / 2 + tempValue)
    textSize(32);
    fill(255, 255, 255);
    textAlign(CENTER);
    text("Attack of the Tupay", 200, 320);

    if(flashingTimer > 10){
        textSize(8);
        text("Press Space To Start", 200, 340);
    }

    sinWaveTimer = (sinWaveTimer + 1) % 360;
    flashingTimer = (flashingTimer + 1) % 20;
    if(keys.space){
        keys.space = false;
        currentState = gameState.LEVEL_SCREEN
    }
}

function getCorrectLevel():string{
    let index = "high";
    let currentShift = 12;
    if(currentLevel < 6){
        index = "low";
        currentShift = 0;
    }
    else if(currentLevel < 12){
        index = "med";
        currentShift = 6;
    }
    let array:string[] = selectedLevelsArray[index];
    let frac = 1 / (totalLevel / 3);
    let percentage: number = ((1 - frac) * ((currentLevel - currentShift) / 10) + frac * Math.random());
    return array[Math.floor(percentage * array.length)];
}

function levelScreen():void{
    clear();
    background(0, 0, 0);

    fill(255, 255, 255);
    textAlign(CENTER);

    textSize(8);
    text("be ready for", 200, 290);

    textSize(32);
    text("LEVEL " + (currentLevel + 1) + " / " + totalLevel, 200, 320);

    if (flashingTimer > 10) {
        textSize(8);
        text("Press Space To Start", 200, 340);
    }
    if (keys.space) {
        keys.space = false;
        currentState = gameState.PLAY_LEVEL;
        let file: any = loadJSON("results/" + getCorrectLevel(), () => {
            newWorld = new Talakat.World(width, height);
            newWorld.initialize(file);
            selectedLevel = JSON.stringify(file);
        });
    }
    flashingTimer = (flashingTimer + 1) % 20;
}

function gameOver():void{
    clear();
    background(0, 0, 0);

    textAlign(CENTER);

    fill(255, 255, 255);
    textSize(8);
    text("You Died", 200, 290);

    fill("#ff4040");
    textSize(32);
    text("Game Over", 200, 320);

    if (flashingTimer > 10) {
        fill(255, 255, 255);
        textSize(8);
        text("Press Space To Restart", 200, 340);
    }
    if (keys.space) {
        keys.space = false;
        currentState = gameState.MAIN_SCREEN;
        currentLevel = 0;
    }
    flashingTimer = (flashingTimer + 1) % 20;
}

function gameWin():void{
    clear();
    background(0, 0, 0);

    textAlign(CENTER);

    fill(255, 255, 255);
    textSize(8);
    text("You Win", 200, 290);

    fill("#ffcb4f");
    textSize(32);
    text("Congratulations", 200, 320);

    if (flashingTimer > 10) {
        fill(255, 255, 255);
        textSize(8);
        text("Press Space To Restart", 200, 340);
    }
    if (keys.space) {
        keys.space = false;
        currentState = gameState.MAIN_SCREEN;
        currentLevel = 0;
    }
    flashingTimer = (flashingTimer + 1) % 20;
}

function playLevel():void{
    action.x = 0;
    action.y = 0;
    if (currentWorld != null) {
        let startTime: number = new Date().getTime();
        if (keys.left) {
            action.x -= 1;
        }
        if (keys.right) {
            action.x += 1;
        }
        if (keys.up) {
            action.y -= 1;
        }
        if (keys.down) {
            action.y += 1;
        }
        currentWorld.update(action);

        startTime = new Date().getTime();
        background(0, 0, 0);
        worldDraw(currentWorld);

        if (currentWorld.isLose()) {
            if (currentWorld != null) {
                currentWorld = null;
            }
            currentState = gameState.GAME_OVER;
        }
        else if (currentWorld.isWon()) {
            if (currentWorld != null) {
                currentWorld = null;
            }
            if(currentLevel < totalLevel - 1){
                currentLevel += 1;
                currentState = gameState.LEVEL_SCREEN;
            }
            else{
                currentState = gameState.GAME_WIN;
            }
        }
    }

    if (newWorld != null) {
        currentWorld = newWorld;
        newWorld = null;
    }
}

function worldDraw(world:Talakat.World):void{
    clear();
    background(0, 0, 0);

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