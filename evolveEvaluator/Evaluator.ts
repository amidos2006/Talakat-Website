let Talakat: any = require("./talakat.js");

enum GameStatus {
    NONE,
    LOSE,
    WIN,
    NODEOUT,
    TIMEOUT,
    TOOSLOW,
    ALOTSPAWNERS,
    LOWBULLETFRAMES
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
    safezone: number;
    futurezone: number;
    numChildren: number;
    totalValue:number;
    maxValue:number;
    numVisits:number;

    constructor(parent: TreeNode, action: number, world: any, parameters:any) {
        this.parent = parent;
        this.children = [null, null, null, null, null];
        this.action = action;
        this.world = world;
        let tempWorld:any = world.clone();
        this.safezone = 0.0;
        let startTime:number = new Date().getTime();
        for(let i:number=0; i<10; i++) {
            tempWorld.update(ActionNumber.getAction(ActionNumber.NONE));
            if (tempWorld.isLose() || tempWorld.spawners.length > parameters.maxNumSpawners) {
                // console.log("Safety Fails");
                tempWorld = null;
                break;
            }
            if(tempWorld.isWon()){
                this.safezone = 10;
                break;
            }
            this.safezone += 1.0;
        }
        this.safezone = this.safezone / 10;
        this.numChildren = 0;
        this.totalValue = 0;
        this.maxValue = -1000000000000000;
        this.numVisits = 0;
    }

    getUnexpandedNode():number{
        for(let i:number=0; i<this.children.length; i++){
            if(this.children[i] == null){
                return i;
            }
        }
        return -1;
    }

    pickBestChild(C:number, Q:number):TreeNode{
        let bestChild:TreeNode = this.children[0];
        for(let child of this.children){
            let bestUCB: number = bestChild.getUCB(C, Q) + 0.00000001 * Math.random();
            let currentUCB: number = child.getUCB(C, Q) + 0.00000001 * Math.random();
            if(currentUCB > bestUCB){
                bestChild = child;
            }
        }
        return bestChild;
    }

    treePolicy(C:number, Q:number, parameters:any):TreeNode{
        let currentNode:TreeNode = this;
        let unExpanded:number = currentNode.getUnexpandedNode();
        while(unExpanded == -1){
            currentNode = currentNode.pickBestChild(C, Q);
            unExpanded = currentNode.getUnexpandedNode();
        }
        if(!(currentNode.world.isWon() || currentNode.world.isLose())){
            currentNode = currentNode.addChild(unExpanded, 10, parameters);
        }
        return currentNode;
    }

    private getUCB(C:number, Q:number):number{
        let exploitation:number = this.totalValue / this.numVisits;
        let exploration:number = Math.sqrt(Math.log(this.parent.numVisits)/this.numVisits);
        let bestValue:number = this.maxValue;

        return Q * bestValue + (1-Q) * exploitation + C * exploitation;
    }

    simulate(depth:number):any{
        let newWorld:any = this.world.clone();
        let startTime: number = new Date().getTime();
        for (let i: number = 0; i < depth; i++) {
            if (newWorld.isWon() || newWorld.isLose()) {
                break;
            }
            let action:number = Math.floor(Math.random() * this.children.length);
            newWorld.update(ActionNumber.getAction(action));
            if (newWorld.spawners.length > parameters.maxNumSpawners) {
                return null;
            }
        }
        return newWorld;
    }

    backpropagate(value:number):void{
        let currentNode:TreeNode = this;
        while(currentNode != null){
            currentNode.numVisits += 1;
            if(value > currentNode.maxValue){
                currentNode.maxValue = value;
            }
            currentNode.totalValue += value;
            currentNode = currentNode.parent;
        }
    }

    addChild(action: number, macroAction: number = 1, parameters:any): TreeNode {
        let newWorld: any = this.world.clone();
        let startTime:number = new Date().getTime();
        for (let i: number = 0; i < macroAction; i++) {
            // console.log("Adding Child With Action " + action)
            newWorld.update(ActionNumber.getAction(action));
            // console.log("Child Add: " + newWorld.spawners.length)
            // console.log("Child Add: " + newWorld.hideUnknown)
            // console.log("Child Add: " + newWorld.boss.getHealth())
            if (newWorld.spawners.length > parameters.maxNumSpawners){
                // console.log("Add Fails");
                return null;
            }
            // console.log("Numbers: " + macroAction + " " + i + " " + parameters)
            if(newWorld.isWon() || newWorld.isLose()){
                break;
            }
        }
        this.children[action] = new TreeNode(this, action, newWorld, parameters);
        this.numChildren += 1;
        return this.children[action];
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

class AStar {
    parameters: any;
    status: GameStatus;
    noiseDist:any;
    repeatDist:any;
    target:any;
    noise:number;
    frames:number;

    constructor(parameters:any, noiseDist:any, repeatDist:any) {
        this.parameters = parameters;
        this.noiseDist = noiseDist;
        this.repeatDist = repeatDist;
    }

    initialize() {
        this.status = GameStatus.NONE;
        this.target = null;
        this.noise = 0;
        this.frames = 0;
    }

    private getEvaluation(world: any, safezone:number, target: any, noise: number = 0): number {
        let isLose: number = 0;
        if (world.isLose()) {
            isLose = 1;
        }
        let bucketWidth: number = parameters.width / parameters.bucketsX;
        let bucketHeight: number = parameters.height / parameters.bucketsY;
        let p: any = {
            x: Math.floor(world.player.x / bucketWidth),
            y: Math.floor(world.player.y / bucketHeight)
        };
        return 0.5 * (1 - world.boss.getHealth()) - isLose + 0.5 * safezone -
            0.25 * (Math.abs(p.x - target.x) + Math.abs(p.y - target.y));
    }

    private initializeBuckets(width: number, height: number): number[] {
        let buckets: number[] = [];
        for (let i: number = 0; i < width * height; i++) {
            buckets.push(0);
        }
        return buckets;
    }

    private calculateBuckets(width: number, height: number, bucketX: number, bucketY:number, bullets: any[], buckets: number[]): void {
        let s = new Talakat.Point();
        let e = new Talakat.Point();
        for (let b of bullets) {
            let indeces: number[] = [];

            s.x = Math.floor((b.x - b.radius) / width);
            s.y = Math.floor((b.y - b.radius) / height);
            if (s.x < 0) {
                s.x = 0;
            }
            if (s.y < 0) {
                s.y = 0;
            }
            if (s.x >= bucketX) {
                s.x = bucketX - 1;
            }
            if (s.y >= bucketY) {
                s.y = bucketY - 1;
            }

            e.x = Math.floor((b.x + b.radius) / width);
            e.y = Math.floor((b.y + b.radius) / height);
            if (e.x < 0) {
                e.x = 0;
            }
            if (e.y < 0) {
                e.y = 0;
            }
            if (e.x >= bucketX) {
                e.x = bucketX - 1;
            }
            if (e.y >= bucketY) {
                e.y = bucketY - 1;
            }

            for (let x: number = s.x; x <= e.x; x++) {
                for (let y: number = s.y; y < e.y; y++) {
                    let index = y * bucketX + x;
                    if (indeces.indexOf(index) == -1) {
                        indeces.push(index);
                    }
                }
            }

            for (let index of indeces) {
                if (index < 0 || index >= buckets.length) {
                    continue;
                }
                buckets[index] += 1;
            }
        }
    }

    private calculateSurroundingBullets(x: number, y: number, bucketX: number, bucketY:number, riskDistance: number, buckets: number[]): number {
        let result: number = 0;
        let visited: any = {};
        let nodes: any[] = [{ x: x, y: y }];
        while (nodes.length > 0) {
            let currentNode: any = nodes.splice(0, 1)[0];
            let index: number = currentNode.y * bucketX + currentNode.x;
            let dist: number = Math.abs(currentNode.x - x) + Math.abs(currentNode.y - y);
            if (!visited.hasOwnProperty(index) && dist <= riskDistance) {
                visited[index] = true;
                result += buckets[index] / (dist + 1);
                for (let dx: number = -1; dx <= 1; dx++) {
                    for (let dy: number = -1; dy <= 1; dy++) {
                        if (dx == 0 && dy == 0) {
                            continue;
                        }
                        let pos: any = { x: currentNode.x + dx, y: currentNode.y + dy };
                        if (pos.x < 0) {
                            pos.x = 0;
                        }
                        if (pos.y < 0) {
                            pos.y = 0;
                        }
                        if (pos.x >= bucketX) {
                            pos.x = bucketX - 1;
                        }
                        if (pos.y >= bucketY) {
                            pos.y = bucketY - 1;
                        }
                        nodes.push(pos);
                    }
                }
            }
        }

        return result;
    }

    private getSafestBucket(px: number, py: number, bucketX: number, bucketY:number, buckets: number[]): any {
        let bestX: number = px;
        let bestY: number = py;
        for (let i: number = 0; i < buckets.length; i++) {
            let x: number = i % bucketX;
            let y: number = Math.floor(i / bucketX);
            if (this.calculateSurroundingBullets(x, y, bucketX, bucketY, 4, buckets) <
                this.calculateSurroundingBullets(bestX, bestY, bucketX, bucketY, 4, buckets)) {
                bestX = x;
                bestY = y;
            }
        }
        return { x: bestX, y: bestY };
    }

    private getMCTSAction(world:any, value:number):number{
        let startTime: number = new Date().getTime();
        let rootNode: TreeNode = new TreeNode(null, -1, world.clone(), this.parameters)
        let currentNumbers: number = 0;
        let bucketWidth: number = parameters.width / parameters.bucketsX;
        let bucketHeight: number = parameters.height / parameters.bucketsY;
        let buckets: number[] = this.initializeBuckets(parameters.bucketsX, parameters.bucketsY);
        this.calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, parameters.bucketsY, world.bullets, buckets);
        if (this.frames <= 0) {
            this.target = this.getSafestBucket(Math.floor(world.player.x / bucketWidth),
                Math.floor(world.player.y / bucketHeight), parameters.bucketsX, parameters.bucketsY, buckets);
            this.noise = 0;
            this.frames = 30;
        }
        else {
            this.frames -= 1;
        }
        while (true) {
            let currentNode: TreeNode = rootNode;
            currentNode = currentNode.treePolicy(0.25, 0.25, parameters);
            if (currentNode == null) {
                return -1;
            }
            let newWorld = currentNode.simulate(10);
            if(newWorld == null){
                return -1;
            }
            currentNode.backpropagate(this.getEvaluation(currentNode.world, currentNode.safezone, this.target, this.noise));
            if (this.parameters.agentType == "time" && new Date().getTime() - startTime >= value) {
                break;
            }
            if (this.parameters.agentType == "node" && currentNumbers >= value) {
                break;
            }
            currentNumbers += 1;
        }
        if (rootNode.getUnexpandedNode() >= 0){
            return 5;
        }
        return rootNode.pickBestChild(0, 0.25).action;
    }

    private getAction(world: any, value: number): number {
        let startTime: number = new Date().getTime();
        let openNodes: TreeNode[] = [new TreeNode(null, -1, world.clone(), this.parameters)];
        let bestNode: TreeNode = openNodes[0];
        let currentNumbers: number = 0;
        let bucketWidth: number = parameters.width / parameters.bucketsX;
        let bucketHeight: number = parameters.height / parameters.bucketsY;
        let buckets: number[] = this.initializeBuckets(parameters.bucketsX, parameters.bucketsY);
        this.calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, parameters.bucketsY, world.bullets, buckets);
        if(this.frames <= 0){
            this.target = this.getSafestBucket(Math.floor(world.player.x / bucketWidth),
                Math.floor(world.player.y / bucketHeight), parameters.bucketsX, parameters.bucketsY, buckets);
            this.noise = 0;
            this.frames = 30;
        }
        else{
            this.frames -= 1;
        }
        while (openNodes.length > 0) {
            openNodes.sort((a: TreeNode, b: TreeNode) => this.getEvaluation(a.world, a.safezone, this.target, this.noise) - this.getEvaluation(b.world, b.safezone, this.target, this.noise));
            let currentNode: TreeNode = openNodes.pop();
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                for (let i: number = 0; i < currentNode.children.length; i++) {
                    let node: TreeNode = currentNode.addChild(i, 10, this.parameters);
                    if(node == null){
                        return -1;
                    }
                    if (this.parameters.agentType == "time" && new Date().getTime() - startTime >= value) {
                        openNodes.length = 0;
                        break;
                    }
                    if (this.parameters.agentType == "node" && currentNumbers >= value) {
                        openNodes.length = 0;
                        break;
                    }
                    if (bestNode.numChildren > 0 || 
                        this.getEvaluation(node.world, node.safezone, this.target, this.noise) > this.getEvaluation(bestNode.world, bestNode.safezone, this.target, this.noise)) {
                        bestNode = node;
                    }
                    if (node.world.isWon()) {
                        openNodes.length = 0;
                        bestNode = node;
                        break;
                    }
                    if(node.world.isLose()){
                        continue; 
                    }
                    openNodes.push(node);
                }
            }
            currentNumbers += 1;
        }
        let action: number = bestNode.getSequence().splice(0, 1)[0];
        return action;
    }

    playMCTSGame(world: any, value: number): TreeNode {
        let spawnerFrames: number = 0;
        let currentNode: TreeNode = new TreeNode(null, -1, world, this.parameters);
        this.status = GameStatus.LOSE;
        let startGame: number = new Date().getTime();
        while (!currentNode.world.isWon() && !currentNode.world.isLose()) {
            let actionNode: any = currentNode.world.clone();
            actionNode.hideUnknown = false;
            let action: number = this.getMCTSAction(actionNode, value);
            if (action == -1) {
                this.status = GameStatus.ALOTSPAWNERS;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            let repeatValue: number = Math.abs(this.repeatDist.ppf(Math.random()));
            if (repeatValue < 1) {
                repeatValue = 1;
            }
            let tempStartGame: number = new Date().getTime();
            for (let i: number = 0; i < repeatValue; i++) {
                let tempNode: any = currentNode.addChild(action, 1, parameters);
                if (tempNode != null) {
                    currentNode = tempNode;
                    if (tempNode.world.isWon() || tempNode.world.isLose()) {
                        break;
                    }
                }
                else {
                    this.status = GameStatus.ALOTSPAWNERS;
                    currentNode.world.spawners.length = 0;
                    return currentNode;
                }
            }

            if (new Date().getTime() - startGame > this.parameters.maxAgentTime) {
                this.status = GameStatus.TIMEOUT;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            currentNode.parent.world.spawners.length = 0;
        }

        if (currentNode.world.isWon()) {
            this.status = GameStatus.WIN;
        }
        currentNode.world.spawners.length = 0;
        return currentNode;
    }

    playGame(world:any, value:number):TreeNode{
        let spawnerFrames: number = 0;
        let currentNode:TreeNode = new TreeNode(null, -1, world, this.parameters);
        this.status = GameStatus.LOSE;
        let startGame:number = new Date().getTime();
        while (!currentNode.world.isWon() && !currentNode.world.isLose()){
            let actionNode:any = currentNode.world.clone();
            actionNode.hideUnknown = false;
            let action: number = this.getAction(actionNode, value);
            if(action == -1){
                this.status = GameStatus.ALOTSPAWNERS;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            let repeatValue:number = Math.abs(this.repeatDist.ppf(Math.random()));
            if (repeatValue < 1){
                repeatValue = 1;
            }
            let tempStartGame: number = new Date().getTime();
            for(let i:number=0; i<repeatValue; i++){
                let tempNode:any = currentNode.addChild(action, 1, parameters);
                if(tempNode != null){
                    currentNode = tempNode;
                    if(tempNode.world.isWon() || tempNode.world.isLose()){
                        break;
                    }
                }
                else {
                    this.status = GameStatus.ALOTSPAWNERS;
                    currentNode.world.spawners.length = 0;
                    return currentNode;
                }
            }
            
            if (new Date().getTime() - startGame > this.parameters.maxAgentTime){
                this.status = GameStatus.TIMEOUT;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            currentNode.parent.world.spawners.length = 0;
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

function calculateSequenceEntropy(sequence:number[], symbolNum:number):number{
    let prob:number[] = [];
    for(let i:number=0; i<symbolNum; i++){
        prob.push(0);
    }
    for(let v of sequence){
        prob[v] += 1.0 / sequence.length;
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

function smoothArray(sequence:number[]):number[]{
    let output:number[] = [];
    for(let i:number=1; i<sequence.length-1; i++){
        let result:number = sequence[i-1] + sequence[i] + sequence[i+1];
        if(result > 1){
            output.push(1)
        }
        else{
            output.push(0)
        }
    }
    return output;
}

function calculateBiEntropy(actionSequence:number[]):number{
    let entropy:number = 0;
    let der: number[] = [];
    if(actionSequence.length > 0){
        entropy += calculateSequenceEntropy(actionSequence, 5);
    }
    
    if(actionSequence.length > 750){
        der = getSequenceDerivative(actionSequence);
        entropy += calculateSequenceEntropy(der.slice(750), 2);
    }
    if(actionSequence.length > 1500){
        der = getSequenceDerivative(der);
        entropy += calculateSequenceEntropy(der.slice(1500), 2);
    }
    if (actionSequence.length > 2250) {
        der = getSequenceDerivative(der);
        entropy += calculateSequenceEntropy(der.slice(2250), 2);
    }
    
    return entropy / 4.0;
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

function calculateRisk(x:number, y:number, bucketX:number, bucketY:number, riskDist:number, buckets:number[]):number{
    let result: number = 0;
    let divisor: number = 0;
    let visited: any = {};
    let nodes: any[] = [{ x: x, y: y }];
    while (nodes.length > 0) {
        let currentNode: any = nodes.splice(0, 1)[0];
        let index: number = currentNode.y * bucketX + currentNode.x;
        let dist: number = Math.abs(currentNode.x - x) + Math.abs(currentNode.y - y);
        if (!visited.hasOwnProperty(index) && dist <= riskDist) {
            visited[index] = true;
            result += Math.min(buckets[index], 4.0) / (dist + 1);
            for (let dx: number = -1; dx <= 1; dx++) {
                for (let dy: number = -1; dy <= 1; dy++) {
                    if (dx == 0 && dy == 0) {
                        continue;
                    }
                    let pos: any = { x: currentNode.x + dx, y: currentNode.y + dy };
                    if (pos.x < 0) {
                        pos.x = 0;
                    }
                    if (pos.y < 0) {
                        pos.y = 0;
                    }
                    if (pos.x >= bucketX) {
                        pos.x = bucketX - 1;
                    }
                    if (pos.y >= bucketY) {
                        pos.y = bucketY - 1;
                    }
                    nodes.push(pos);
                }
            }
            divisor += 1;
        }
    }

    return result / (4.0 * divisor);
}

function initializeBuckets(width:number, height:number):number[]{
    let buckets: number[] = [];
    for (let i: number = 0; i < width * height; i++) {
        buckets.push(0);
    }
    return buckets;
}

function calculateBuckets(width:number, height:number, bucketX:number, bucketY:number, bullets:any[], buckets:number[]):void{
    let s = new Talakat.Point();
    let e = new Talakat.Point();
    for (let b of bullets) {
        let indeces: number[] = [];

        s.x = Math.floor((b.x - b.radius) / width);
        s.y = Math.floor((b.y - b.radius) / height);
        if (s.x < 0) {
            s.x = 0;
        }
        if (s.y < 0) {
            s.y = 0;
        }
        if (s.x >= bucketX) {
            s.x = bucketX - 1;
        }
        if (s.y >= bucketY) {
            s.y = bucketY - 1;
        }

        e.x = Math.floor((b.x + b.radius) / width);
        e.y = Math.floor((b.y + b.radius) / height);
        if (e.x < 0) {
            e.x = 0;
        }
        if (e.y < 0) {
            e.y = 0;
        }
        if (e.x >= bucketX) {
            e.x = bucketX - 1;
        }
        if (e.y >= bucketY) {
            e.y = bucketY - 1;
        }

        for (let x: number = s.x; x <= e.x; x++) {
            for (let y: number = s.y; y < e.y; y++) {
                let index = y * bucketX + x;
                if (indeces.indexOf(index) == -1) {
                    indeces.push(index);
                }
            }
        }

        for (let index of indeces) {
            if (index < 0 || index >= buckets.length) {
                continue;
            }
            buckets[index] += 1;
        }
    }
}

function getFitness(bossHealth:number):number{
    return (1 - bossHealth);
}

function evaluate(filePath:string, parameters:any, game:any, noiseDist:any, repeatDist:any){
    let temp: any = evaluateOne(parameters, game, noiseDist, repeatDist);
    fs.writeFileSync("output/" + filePath, JSON.stringify(temp));
    fs.unlinkSync("input/" + filePath);
}

function evaluateOne(parameters:any, input:any, noiseDist:any, repeatDist:any){
    let startWorld:any = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
    startWorld.initialize(input);
    let ai: AStar = new AStar(parameters, noiseDist, repeatDist);
    ai.initialize();
    let bestNode: TreeNode = ai.playMCTSGame(startWorld.clone(), parameters.agentValue);

    let risk: number = 0;
    let distribution: number = 0;
    let frames: number = 0;
    let bulletFrames:number = 0;
    let calculationFrames: number = parameters.calculationFrames;
    let bucketWidth: number = parameters.width / parameters.bucketsX;
    let bucketHeight: number = parameters.height / parameters.bucketsY;
    let buckets: number[] = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
    let actionSequence: number[] = bestNode.getSequence(1);
    let currentNode:TreeNode = bestNode;
    while (currentNode.parent != null){
        if(currentNode.world.bullets.length > parameters.bulletsFrame){
            buckets = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
            calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, parameters.bucketsY, currentNode.world.bullets, buckets);
            bulletFrames += 1;
            risk += calculateRisk(Math.floor(currentNode.world.player.x/bucketWidth), 
                Math.floor(currentNode.world.player.y / bucketHeight), parameters.bucketsX, 
                parameters.bucketsY, 4, buckets);
            distribution += calculateDistribution(buckets);
        }
        frames += 1.0;
        currentNode = currentNode.parent;
        currentNode.children.length = 0;
    }

    if (ai.status == GameStatus.ALOTSPAWNERS || 
            ai.status == GameStatus.TOOSLOW || 
            bulletFrames / Math.max(1, frames) < parameters.targetMaxBulletsFrame) {
        if (bulletFrames / Math.max(1, frames) < parameters.targetMaxBulletsFrame){
            ai.status = GameStatus.LOWBULLETFRAMES;
        }
        return {
            fitness: 0,
            bossHealth: bestNode.world.boss.getHealth(),
            errorType: ai.status,
            constraints: getFitness(bestNode.world.boss.getHealth()) * 
                (bulletFrames / (Math.max(1, frames) * parameters.targetMaxBulletsFrame)),
            behavior: [
                calculateBiEntropy(actionSequence), 
                risk / Math.max(1, frames), 
                distribution / Math.max(1, frames), 
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
        ]
    };
}

let tracery = require('./tracery.js');
let fs = require('fs');
let gaussian: any = require('./gaussian.js');

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
let noiseDist: any = gaussian(0, Math.pow(parameters.noiseStd, 2));
let repeatDist: any = gaussian(0, Math.pow(parameters.repeatingAction, 2));

while(true){
    for(let i:number=0; i<size; i++){
        let filePath:string = "input/" + (index*size + i).toString() + ".json";
        if (fs.existsSync(filePath)) {
            sleep(1000);
            let game:any = JSON.parse(fs.readFileSync(filePath));
            evaluate((index * size + i).toString() + ".json", parameters, game, noiseDist, repeatDist);
        }
    }
    sleep(4000);
}