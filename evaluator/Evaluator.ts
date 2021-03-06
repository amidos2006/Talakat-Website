importScripts("talakat.js");

this.onmessage = function(event:any){
    let chromosome:any = event.data;
    evaluate(chromosome.id, chromosome.parameters, chromosome.input);
}

function checkForLoop(input:any, name:string, depth:number, maxDepth:number):boolean{
    if(depth >= maxDepth){
        return false;
    }
    let loop:string[] = [];
    for(let n of input.spawners[name].pattern){
        if(n != "bullet" && n != "wait"){
            loop.push(n);
        }
    }
    for(let n of loop){
        return checkForLoop(input, n, depth + 1, maxDepth);
    }
    return true;
}

function checkForBullets(input: any, name: string, depth: number, maxDepth: number):boolean{
    if (depth >= maxDepth) {
        return false;
    }
    let loop: string[] = [];
    for (let n of input.spawners[name].pattern) {
        if (n == "bullet") {
            return true;
        }
        else if(n != "wait"){
            loop.push(n);
        }
    }
    for (let n of loop) {
        return checkForBullets(input, n, depth + 1, maxDepth);
    }
    return false;
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

function calculateBiEntropy(actionSequence:number[]):number{
    let entropy:number = 0;
    let der1:number[] = [];
    let der2:number[] = [];
    let prob:number[] = [0, 0, 0, 0, 0];
    for(let i:number=0; i<actionSequence.length; i++){
        prob[actionSequence[i]] += 1.0;
        if(i > 0 && actionSequence[i] != actionSequence[i-1]){
            der1.push(1)
        }
        else{
            der1.push(0);
        }
    }
    for(let i:number=0; i<prob.length; i++){
        prob[i] /= actionSequence.length;
    }
    entropy += calculateEntropy(prob);

    prob = [0, 0];
    for (let i: number = 0; i < der1.length; i++) {
        prob[actionSequence[i]] += 1.0;
        if (i > 0 && der1[i] != der1[i - 1]) {
            der2.push(1)
        }
        else {
            der2.push(0);
        }
    }
    prob[0] /= der1.length;
    prob[1] /= der1.length;
    entropy += calculateEntropy(prob);

    prob = [0, 0];
    for (let i: number = 0; i < der1.length; i++) {
        prob[actionSequence[i]] += 1.0;
    }
    prob[0] /= der2.length;
    prob[1] /= der2.length;
    entropy += calculateEntropy(prob);

    return entropy / 3.0;
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

function calculateRisk(player:Talakat.Player, width:number, height:number, bucketsX:number, buckets:number[]):number{
    let result:number = 0;
    let x:number = Math.floor(player.x / width);
    let y:number = Math.floor(player.y / height);
    for(let dx:number=-1; dx<=1; dx++){
        for(let dy:number=-1; dy<=1; dy++){
            let index:number = (y + dy) * bucketsX + (x + dx);
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

function calculateBuckets(width:number, height:number, bucketX:number, bullets:Talakat.Bullet[], buckets:number[]):void{
    let p: Talakat.Point = new Talakat.Point();
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

function evaluate(id:number[], parameters:any, input:any[]){
    for(let i:number=0; i<id.length; i++){
        let temp:any = evaluateOne(id[i], parameters, input[i]);
        this.postMessage(temp);
    }
}

function evaluateOne(id:number, parameters:any, input:any){
    let numLoops:number = 0;
    for (let name in input.spawners) {
        if(checkForLoop(input, name, 0, parameters.maxDepth)){
            numLoops += 1;
        }
    }
    
    let numBullets:number = 0;
    let numSpawners: number = 0;
    for(let name in input.spawners) {
        if(checkForBullets(input, name, 0, parameters.maxDepth)){
            numBullets += 1.0;
        }
        numSpawners += 1;
    }

    let startWorld: Talakat.World = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
    startWorld.initialize(input);
    let ai: Planner = new self[parameters.agent](parameters);
    ai.initialize();
    let bestNode: TreeNode = ai.plan(startWorld.clone(), parameters.maxAgentTime);

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
        if(currentNode.world.bullets.length > 0){
            buckets = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
            calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, currentNode.world.bullets, buckets);
            bulletFrames += 1;
            risk += calculateRisk(currentNode.world.player, bucketWidth, bucketHeight, parameters.bucketsX, buckets);
            distribution += calculateDistribution(buckets);
            density += calculateDensity(buckets, currentNode.world.bullets.length);
        }
        frames += 1.0;
        currentNode = currentNode.parent;
    }

    if (//numLoops > 0 || numBullets / numSpawners < 1|| 
        (ai.status == GameStatus.ALOTSPAWNERS || 
            ai.status == GameStatus.SPAWNERSTOBULLETS || 
            ai.status == GameStatus.TOOSLOW)) {
        return {
            id: id,
            fitness: 0,
            bossHealth: bestNode.world.boss.getHealth(),
            errorType: ai.status,
            // constraints: getConstraints(numLoops, numBullets / numSpawners, bestNode.world.boss.getHealth()),
            constraints: getFitness(bestNode.world.boss.getHealth()),
            behavior: [
                calculateBiEntropy(actionSequence), 
                // bulletFrames / Math.max(1, bulletFrames), 
                risk / Math.max(1, bulletFrames), 
                distribution / Math.max(1, bulletFrames), 
                density / Math.max(1, bulletFrames)
            ]
        };
    }

    return {
        id:id, 
        fitness: getFitness(bestNode.world.boss.getHealth()),
        bossHealth: bestNode.world.boss.getHealth(),
        errorType: ai.status,
        constraints: 1,
        behavior: [
            calculateBiEntropy(actionSequence),
            // bulletFrames / Math.max(1, frames),
            risk / Math.max(1, bulletFrames),
            distribution / Math.max(1, bulletFrames),
            density / Math.max(1, bulletFrames)
        ]
    };
}