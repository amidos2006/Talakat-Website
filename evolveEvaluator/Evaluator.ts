let Talakat: any = require("./talakat.js");

enum GameStatus {
    NONE,
    LOSE,
    WIN,
    NODEOUT,
    TIMEOUT,
    TOOSLOW,
    SPAWNERSTOBULLETS,
    ALOTSPAWNERS
}

class ActionNumber {
    static LEFT: number = 0;
    static RIGHT: number = 1;
    static UP: number = 2;
    static DOWN: number = 3;
    static NONE: number = 4;
    static LEFT_UP: number = 5;
    static RIGHT_UP: number = 6;
    static LEFT_DOWN: number = 7;
    static RIGHT_DOWN: number = 8;

    static getAction(action: number): any {
        if (action == ActionNumber.LEFT) {
            return new Talakat.Point(-1, 0);
        }
        if (action == ActionNumber.RIGHT) {
            return new Talakat.Point(1, 0);
        }
        if (action == ActionNumber.UP) {
            return new Talakat.Point(0, -1);
        }
        if (action == ActionNumber.DOWN) {
            return new Talakat.Point(0, 1);
        }
        if (action == ActionNumber.LEFT_DOWN) {
            return new Talakat.Point(-1, 1);
        }
        if (action == ActionNumber.RIGHT_DOWN) {
            return new Talakat.Point(1, 1);
        }
        if (action == ActionNumber.LEFT_UP) {
            return new Talakat.Point(-1, -1);
        }
        if (action == ActionNumber.RIGHT_UP) {
            return new Talakat.Point(1, -1);
        }
        return new Talakat.Point();
    }
}

class TreeNode {
    parent: TreeNode;
    children: TreeNode[];
    action: number;
    world: any;
    numChildren: number;

    constructor(parent: TreeNode, action: number, world: any) {
        this.parent = parent;
        this.children = [null, null, null, null, null];
        this.action = action;
        this.world = world;
        this.numChildren = 0;
    }

    addChild(action: number, macroAction: number = 1, spawnersLimit:number = 1000): TreeNode {
        let newWorld: any = this.world.clone();
        for (let i: number = 0; i < macroAction; i++) {
            newWorld.update(ActionNumber.getAction(action));
            if(newWorld.spawners.length > spawnersLimit){
                break;
            }
        }
        this.children[action] = new TreeNode(this, action, newWorld);
        this.numChildren += 1;
        return this.children[action];
    }

    getEvaluation(noise: number = 0): number {
        let isLose: number = 0;
        if (this.world.isLose()) {
            isLose = 1;
        }
        return 1 - this.world.boss.getHealth() - isLose;
    }

    getSequence(macroAction: number = 1): number[] {
        let result: number[] = [];
        let currentNode: TreeNode = this;
        while (currentNode.parent != null) {
            for (let i: number = 0; i < macroAction; i++) {
                result.push(currentNode.action);
            }
            currentNode = currentNode.parent;
        }
        return result.reverse();
    }
}

class AStarPlanner{
    parameters: any;
    status: GameStatus;

    constructor(parameters: any) {
        this.parameters = parameters;
    }

    initialize() {
        this.status = GameStatus.NONE;
    }

    plan(world: any, value: number): TreeNode {
        let startTime: number = new Date().getTime();
        let numNodes: number = 0;
        let spawnerFrames: number = 0;
        let openNodes: TreeNode[] = [new TreeNode(null, -1, world)];
        let bestNode: TreeNode = openNodes[0];
        this.status = GameStatus.LOSE;

        while (openNodes.length > 0) {
            if (this.parameters.agentType == "time" && new Date().getTime() - startTime > value) {
                this.status = GameStatus.TIMEOUT;
                return bestNode;
            }

            openNodes.sort((a: TreeNode, b: TreeNode) => a.getEvaluation() - b.getEvaluation());
            let currentNode: TreeNode = openNodes.pop();
            if (bestNode.getEvaluation() < currentNode.getEvaluation()) {
                bestNode = currentNode;
            }
            if (currentNode.world.spawners.length > currentNode.world.bullets.length / this.parameters.bulletToSpawner) {
                spawnerFrames += 1;
                if (spawnerFrames > this.parameters.maxSpawnerFrames) {
                    this.status = GameStatus.SPAWNERSTOBULLETS;
                    return bestNode;
                }
            }
            else {
                spawnerFrames = 0;
            }
            if (currentNode.world.spawners.length > this.parameters.maxNumSpawners) {
                this.status = GameStatus.ALOTSPAWNERS;
                return bestNode;
            }
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                if (this.parameters.agentType == "node" && numNodes > value) {
                    this.status = GameStatus.NODEOUT;
                    continue;
                }
                for (let i: number = 0; i < currentNode.children.length; i++) {
                    let tempStartGame: number = new Date().getTime();
                    let node: TreeNode = currentNode.addChild(i, this.parameters.repeatingAction, this.parameters.maxNumSpawners);
                    if (new Date().getTime() - tempStartGame > this.parameters.maxStepTime) {
                        this.status = GameStatus.TOOSLOW;
                        return bestNode;
                    }
                    if (node.world.isWon()) {
                        this.status = GameStatus.WIN;
                        return node;
                    }
                    openNodes.push(node);
                    numNodes += 1;
                }
            }
        }
        return bestNode;
    }
}

class AStar {
    parameters: any;
    status: GameStatus;

    constructor(parameters:any) {
        this.parameters = parameters;
    }

    initialize() {
        this.status = GameStatus.NONE;
    }

    private getAction(world: any, value: number): number {
        let startTime: number = new Date().getTime();
        let openNodes: TreeNode[] = [new TreeNode(null, -1, world.clone())];
        let bestNode: TreeNode = openNodes[0];
        let currentNumbers: number = 0;
        let solution: number[] = [];
        while (openNodes.length > 0 && solution.length == 0) {
            openNodes.sort((a: TreeNode, b: TreeNode) => a.getEvaluation() - b.getEvaluation());
            let currentNode: TreeNode = openNodes.pop();
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                for (let i: number = 0; i < currentNode.children.length; i++) {
                    // console.log("Start One Action")
                    if (this.parameters.agentType == "time" && new Date().getTime() - startTime >= value) {
                        break;
                    }
                    if (this.parameters.agentType == "node" && currentNumbers >= value) {
                        break;
                    }
                    if (currentNode.world.spawners.length > this.parameters.maxNumSpawners) {
                        break;
                    }
                    let node: TreeNode = currentNode.addChild(i, this.parameters.repeatingAction, this.parameters.maxNumSpawners);
                    // console.log("End One Action " + currentNode.world.spawners.length)
                    if (node.world.isWon()) {
                        solution = node.getSequence();
                        break;
                    }
                    if (bestNode.numChildren > 0 || node.getEvaluation() > bestNode.getEvaluation()) {
                        bestNode = node;
                    }
                    openNodes.push(node);
                    currentNumbers += 1;
                }
            }
        }
        if (solution.length > 0) {
            return solution.splice(0, 1)[0];
        }
        let action: number = bestNode.getSequence().splice(0, 1)[0];
        return action;
    }

    playGame(world:any, value:number):TreeNode{
        let spawnerFrames: number = 0;
        let currentNode:TreeNode = new TreeNode(null, -1, world);
        this.status = GameStatus.LOSE;
        let startGame:number = new Date().getTime();
        while (!currentNode.world.isWon() && !currentNode.world.isLose()){
            // console.log("Get Action")
            let action:number = this.getAction(currentNode.world.clone(), value);
            let tempStartGame: number = new Date().getTime();
            // console.log("Make 10 Moves")
            currentNode = currentNode.addChild(action, parameters.repeatingAction, parameters.maxNumSpawners);
            if (new Date().getTime() - tempStartGame > this.parameters.maxStepTime) {
                this.status = GameStatus.TOOSLOW;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            if (currentNode.world.spawners.length > currentNode.world.bullets.length / this.parameters.bulletToSpawner) {
                spawnerFrames += 1;
                if (spawnerFrames > this.parameters.maxSpawnerFrames) {
                    this.status = GameStatus.SPAWNERSTOBULLETS;
                    currentNode.world.spawners.length = 0;
                    return currentNode;
                }
            }
            else {
                spawnerFrames = 0;
            }
            if (currentNode.world.spawners.length > this.parameters.maxNumSpawners) {
                this.status = GameStatus.ALOTSPAWNERS;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            if (new Date().getTime() - startGame > this.parameters.maxAgentTime){
                this.status = GameStatus.TIMEOUT;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            // console.log("Boss Health: " + currentNode.world.boss.getHealth())
            // console.log("Spawners: " + currentNode.world.spawners.length)
            // console.log("Bullets: " + currentNode.world.bullets.length)
            currentNode.parent.world.spawners.length = 0;
            // console.log("Spawners After: " + currentNode.world.spawners.length)
        }

        if (currentNode.world.isWon()){
            this.status = GameStatus.WIN;
        }
        currentNode.world.spawners.length = 0;
        return currentNode;
    }
}

function calculateEntropy(values:number[]):number{
    let result:number = 0;
    for(let p of values){
        if(p > 0 && p < 1){
            result += -p * Math.log(p) / Math.log(values.length);
        }
    }
    return result;
}

function calculateSequenceEntropy(sequence:number[]):number{
    let dic:any = {};
    for(let v of sequence){
        if (!dic.hasOwnProperty(v.toString())){
            dic[v.toString()] = 0;
        }
        dic[v.toString()] += 1;
    }
    let prob: number[] = [];
    for(let s in dic){
        prob.push(dic[s]/sequence.length);
    }
    return calculateEntropy(prob);
}

function getSequenceDerivative(sequence:number[]):number[]{
    let der:number[] = [];
    for (let i: number = 1; i < sequence.length; i++) {
        if (sequence[i] != sequence[i - 1]) {
            der.push(1);
        }
        else{
            der.push(0);
        }
    }
    return der;
}

function calculateBiEntropy(actionSequence:number[]):number{
    let entropy:number = calculateSequenceEntropy(actionSequence);
    let der:number[] = getSequenceDerivative(actionSequence);
    entropy += calculateSequenceEntropy(der);
    return entropy / 2.0;
}

function calculateDistribution(buckets: number[]):number{
    let result:number = 0;
    for(let b of buckets){
        if(b > 0){
            result += 1.0;
        }
    }
    return result/buckets.length;
}

function getMaxBulletsBucket(buckets:number[]){
    let max:number = 0;
    for(let b of buckets){
        if(b > max){
            max = b;
        }
    }
    return max;
}

function calculateDensity(buckets:number[], bulletNumber:number):number{
    return getMaxBulletsBucket(buckets) / bulletNumber;
}

function calculateRisk(player:any, width:number, height:number, buckets:number[]):number{
    let result:number = 0;
    let x:number = Math.floor(player.x / width);
    let y:number = Math.floor(player.y / height);
    for(let dx:number=-1; dx<=1; dx++){
        for(let dy:number=-1; dy<=1; dy++){
            let index:number = (y + dy) * width + (x + dx);
            if(index >= buckets.length){
                index = buckets.length - 1;
            }
            if(index < 0){
                index = 0;
            }
            if(buckets[index] > 0){
                result += 1.0;
            }
        }
    }
    return result/9.0;
}

function initializeBuckets(width:number, height:number):number[]{
    let buckets: number[] = [];
    for (let i: number = 0; i < width * height; i++) {
        buckets.push(0);
    }
    return buckets;
}

function calculateBuckets(width:number, height:number, bucketX:number, bullets:any[], buckets:number[]):void{
    let p:any = new Talakat.Point();
    for(let b of bullets){
        let indeces: number[] = [];

        p.x = b.x - b.radius;
        p.y = b.y - b.radius;
        let index: number = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if(indeces.indexOf(index) == -1){
            indeces.push(index);
        }
        p.x = b.x + b.radius;
        p.y = b.y - b.radius;
        index = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        p.x = b.x - b.radius;
        p.y = b.y + b.radius;
        index = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        p.x = b.x + b.radius;
        p.y = b.y + b.radius;
        index = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }

        for(let index of indeces){
            if(index < 0){
                index = 0;
            }
            if(index >= buckets.length){
                index = buckets.length - 1;
            }
            buckets[index] += 1;
        }
    }
}

function getConstraints(loops:number, bullets:number, bossHealth:number):number{
    return 0.4 / (loops + 1) + 0.4 * bullets + 0.2 * (1 - bossHealth);
}

function getFitness(bossHealth:number):number{
    return (1 - bossHealth);
}

function evaluate(filePath:string, parameters:any, game:any){
    let temp: any = evaluateOne(parameters, game);
    fs.writeFileSync("output/" + filePath, JSON.stringify(temp));
    fs.unlinkSync("input/" + filePath);
}

function evaluateOne(parameters:any, input:any){
    let startWorld:any = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
    startWorld.initialize(input);
    let ai: AStar = new AStar(parameters);
    ai.initialize();
    let bestNode: TreeNode = ai.playGame(startWorld.clone(), parameters.agentValue);

    let risk: number = 0;
    let distribution: number = 0;
    let density: number = 0;
    let frames: number = 0;
    let bulletFrames:number = 0;
    let calculationFrames: number = parameters.calculationFrames;
    let bucketWidth: number = parameters.width / parameters.bucketsX;
    let bucketHeight: number = parameters.height / parameters.bucketsY;
    let buckets: number[] = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
    let actionSequence: number[] = bestNode.getSequence(parameters.repeatingAction);
    let currentNode:TreeNode = bestNode;
    while (currentNode.parent != null){
        if(currentNode.world.bullets.length > parameters.bulletsFrame){
            buckets = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
            calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, currentNode.world.bullets, buckets);
            bulletFrames += 1;
            risk += calculateRisk(currentNode.world.player, bucketWidth, bucketHeight, buckets);
            distribution += calculateDistribution(buckets);
            density += calculateDensity(buckets, currentNode.world.bullets.length);
        }
        frames += 1.0;
        currentNode = currentNode.parent;
        currentNode.children.length = 0;
    }

    if (ai.status == GameStatus.ALOTSPAWNERS || 
            ai.status == GameStatus.SPAWNERSTOBULLETS || 
            ai.status == GameStatus.TOOSLOW) {
        return {
            fitness: 0,
            bossHealth: bestNode.world.boss.getHealth(),
            errorType: ai.status,
            constraints: getFitness(bestNode.world.boss.getHealth()),
            behavior: [
                calculateBiEntropy(actionSequence), 
                risk / Math.max(1, bulletFrames), 
                distribution / Math.max(1, bulletFrames), 
                bulletFrames / Math.max(1, frames)
            ]
        };
    }

    return {
        fitness: getFitness(bestNode.world.boss.getHealth()),
        bossHealth: bestNode.world.boss.getHealth(),
        errorType: ai.status,
        constraints: 1,
        behavior: [
            calculateBiEntropy(actionSequence),
            risk / Math.max(1, bulletFrames),
            distribution / Math.max(1, bulletFrames),
            bulletFrames / Math.max(1, frames)
        ]
    };
}

let tracery = require('./tracery.js');
let fs = require('fs');

let parameters: any = JSON.parse(fs.readFileSync("assets/parameters.json"));
let spawnerGrammar: any = JSON.parse(fs.readFileSync("assets/spawnerGrammar.json"));
let scriptGrammar: any = JSON.parse(fs.readFileSync("assets/scriptGrammar.json"));
let spawnerNumber: number = 0;
for (let n of scriptGrammar.name) {
    spawnerGrammar.name.push(n);
    spawnerNumber += 1;
}

function sleep(amount:number){
    let start:number = new Date().getTime();
    while(new Date().getTime() - start < amount);
}

let index: number = parseInt(process.argv[2]);
let size: number = parseInt(process.argv[3]);

while(true){
    for(let i:number=0; i<size; i++){
        let filePath:string = "input/" + (index*size + i).toString() + ".json";
        if (fs.existsSync(filePath)) {
            sleep(1000);
            let game:any = JSON.parse(fs.readFileSync(filePath));
            evaluate((index * size + i).toString() + ".json", parameters, game);
        }
    }
    sleep(4000);
}