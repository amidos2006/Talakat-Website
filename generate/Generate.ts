let recordedMessages:any[] = [];
let interval:any = null;
let mapElite:MapElite = null;
let spawnerGrammar: any;
let scriptGrammar: any;
let parameters: any;
let img: any;

function preload(): void {
    spawnerGrammar = loadJSON("assets/spawnerGrammar.json");
    scriptGrammar = loadJSON("assets/scriptGrammar.json");
    parameters = loadJSON("assets/parameters.json");
    img = loadImage("assets/circle.png");
}

function setup(): void {
    let canvas = createCanvas(400, 640);
    canvas.parent("game");
    background(0, 0, 0);
    for (let n of scriptGrammar.name) {
        spawnerGrammar.name.push(n);
    }
}

function debugLog(text: string): void {
    document.getElementById("debugText").textContent += text;
    document.getElementById("debugText").scrollTop = document.getElementById("debugText").scrollHeight;
}

class Elite{
    best:Chromosome;
    population:Population;

    constructor(best:Chromosome){
        if(best.constraints == 1){
            this.best = best;
        }
        this.population = new Population();
    }
}

class Evaluator{
    workers: Worker[];
    population:Chromosome[];
    running:boolean;

    constructor(){
        this.workers = [];
        this.population = null;
        this.running = false;
    }

    startEvaluation(chromosomes:Chromosome[], param: any): void {
        debugLog("Evaluator Started.\n");

        this.population = chromosomes;
        this.running = true;

        let chromoPerThread: number = Math.floor(this.population.length / param.threadNumbers);
        for (let i: number = 0; i < param.threadNumbers; i++) {
            let end: number = (i + 1) * chromoPerThread;
            if (i == param.threadNumbers - 1) {
                end = this.population.length;
            }
            let data: any = { id: [], parameters: param, input: [] };
            for (let j: number = i * chromoPerThread; j < end; j++) {
                data.id.push(this.population[j].id);
                data.input.push(this.population[j].generateTalakatScript(spawnerGrammar, scriptGrammar));
            }
            let w: Worker = new Worker("js/evaluator.js");
            w.postMessage(data);
            w.onmessage = function (event) {
                for (let i: number = 0; i < event.data.id.length; i++) {
                    recordedMessages.push({
                        id: event.data.id[i],
                        fitness: event.data.fitness[i],
                        constraints: event.data.constraints[i],
                        errorType: event.data.errorType[i],
                        behavior: event.data.behavior[i]
                    });
                }
            }
            this.workers.push(w);
        }
    }

    checkDone(): boolean {
        return recordedMessages.length >= this.population.length;
    }

    private assignFitness(msg: any): void {
        for (let c of this.population) {
            if (c.id == msg.id) {
                c.fitness = msg.fitness;
                c.behavior = msg.behavior;
                c.constraints = msg.constraints;
                c.errorType = msg.errorType;
                return;
            }
        }
    }

    finishEvaluation(): Chromosome[] {
        for (let msg of recordedMessages) {
            this.assignFitness(msg);
        }
        let evaluatedPop:Chromosome[] = this.population;
        this.terminate();
        debugLog("Evaluator Finished.\n");
        return evaluatedPop;
    }

    terminate(): void {
        for (let w of this.workers) {
            w.terminate();
        }
        this.workers.length = 0;
        recordedMessages.length = 0;
        this.running = false;
        this.population = null;
    }
}

class MapElite{
    map:any;
    mapSize:number;
    evaluator:Evaluator;

    constructor(){
        this.map = {};
        this.mapSize = 0;
        this.evaluator = new Evaluator();
    }

    randomInitailzie(): void {
        debugLog("Initializing The Map.\n");
        let chromosomes:Chromosome[] = [];
        for (let i: number = 0; i < parameters.initializationSize; i++) {
            let c: Chromosome = new Chromosome();
            c.randomInitialize(parameters.sequenceSize, parameters.maxValue);
            chromosomes.push(c);
        }
        this.evaluator.startEvaluation(chromosomes, parameters);
    }

    updateMap():void{
        if(this.evaluator.running && !this.evaluator.checkDone()){
            return;
        }
        if(this.evaluator.running){
            let pop:Chromosome[] = this.evaluator.finishEvaluation();
            for(let c of pop){
                this.assignMap(c);
            }
        }
        debugLog("Map Size: " + this.mapSize + "\n");
        debugLog("########################################\n");
        let tempBest: Chromosome = getBestChromosome();
        debugLog("Best Chromosome: " + JSON.stringify(tempBest.generateTalakatScript(spawnerGrammar, scriptGrammar)) + "\n");
        debugLog("Fitness: " + tempBest.fitness + "\n");
        debugLog("Constraints: " + tempBest.constraints + "\n");
        debugLog("Behaviors: " + tempBest.behavior + "\n");
        debugLog("########################################\n");
        let pop:Chromosome[] = [];
        while (pop.length < parameters.populationSize){
            let newChromosomes:Chromosome[] = [];
            let elites:Elite[] = this.randomSelect();
            if(random(0.0, 1.0) < elites.length / this.mapSize){
                newChromosomes.push(elites[Math.floor(random(0, elites.length))].best.clone());
                newChromosomes.push(elites[Math.floor(random(0, elites.length))].best.clone());
            }
            else{
                newChromosomes = this.rankSelect().population.selectChromosomes();
                if (random(0.0, 1.0) < parameters.interpopProb){
                    let tempChromosomes: Chromosome[] = this.rankSelect().population.selectChromosomes();
                    newChromosomes[0] = tempChromosomes[0];
                }
            }

            if (random(0.0, 1.0) < parameters.crossover) {
                newChromosomes = newChromosomes[0].crossover(newChromosomes[1]);
            }
            if (random(0.0, 1.0) < parameters.mutation) {
                newChromosomes[0] = newChromosomes[0].mutate(parameters.mutationSize, parameters.maxValue);
            }
            if (random(0.0, 1.0) < parameters.mutation) {
                newChromosomes[1] = newChromosomes[1].mutate(parameters.mutationSize, parameters.maxValue);
            }
            pop.push(newChromosomes[0]);
            pop.push(newChromosomes[1]);
        }
        this.evaluator.startEvaluation(pop, parameters);
    }

    private assignMap(c: Chromosome):void{
        let index:string = "";
        index += Math.floor(c.behavior[0] * parameters.dimensionSize) + "," + 
            Math.floor(c.behavior[1] * parameters.dimensionSize) + "," + 
            Math.floor(c.behavior[2] * parameters.dimensionSize) + "," +
            Math.floor(c.behavior[3] * parameters.dimensionSize);
        if(this.map[index] != undefined){
            if(c.constraints == 1 && (this.map[index].best == null || 
                this.map[index].best.fitness < c.fitness)){
                this.map[index].best = c;
            }
        }
        else{
            this.map[index] = new Elite(c);
            this.mapSize += 1;
        }
        this.map[index].population.addChromosome(c, parameters.populationSize);
    }
    
    private randomSelect():Elite[]{
        let elites: Elite[] = [];
        for (let k in this.map) {
            if(this.map[k].best != null){
                elites.push(this.map[k]);
            }
        }
        return elites;
    }

    private rankSelect():Elite{
        let keys:any[] = [];
        for(let k in this.map){
            keys.push({key:k, size:this.map[k].population.length + random(0.0, 0.1)});
        }
        keys.sort((a:any, b:any)=>{return b.size - a.size});
        return this.map[rankSelection(keys).key];
    }

    getCloset(vector:number[]):Elite{
        if(this.mapSize == 0){
            return null;
        }
        let closest:string = "";
        let cValue:number = Number.MAX_VALUE;
        for (let k in this.map) {
            let temp:number[] = [];
            let parts:string[] = k.split(",");
            for(let p of parts){
                temp.push(parseInt(p));
            }
            let result:number = 0;
            for(let i:number=0; i<temp.length; i++){
                result += Math.pow(vector[i] - temp[i], 2);
            }
            if(result < cValue){
                cValue = result;
                closest = k;
            }
        }
        return this.map[closest];
    }
}

class Population{
    population:Chromosome[];

    constructor(){
        this.population = [];
    }

    addChromosome(c:Chromosome, maxSize:number):void{
        this.population.sort((a: Chromosome, b: Chromosome) => { return (b.fitness + b.constraints) - (a.fitness + a.constraints) });
        if(this.population.length >= maxSize){
            this.population.splice(this.population.length - 1, 1);
        }
        this.population.push(c);
    }

    selectChromosomes():Chromosome[]{
        let constraintsPop:Chromosome[] = [];
        let normalPop:Chromosome[] = [];
        for(let c of this.population){
            if(c.constraints == 1){
                normalPop.push(c);
            }
            else{
                constraintsPop.push(c);
            }
        }
        constraintsPop.sort((a: Chromosome, b: Chromosome) => { return b.constraints - a.constraints });
        normalPop.sort((a: Chromosome, b: Chromosome) => { return b.fitness - a.fitness });
        let newChromosomes: Chromosome[];
        if(random(0.0, 1.0) < normalPop.length / this.population.length){
            newChromosomes = [rankSelection(normalPop).clone(), rankSelection(normalPop).clone()];
        }
        else{
            newChromosomes = [rankSelection(constraintsPop).clone(), rankSelection(constraintsPop).clone()];
        }
        
        return newChromosomes;
    }
}

function rankSelection(arary: any[]): any{
    let rank: number[] = [];
    let total: number = 0;
    for (let i: number = 0; i < arary.length; i++) {
        rank.push(arary.length - i);
        total += arary.length - i;
    }
    for (let i: number = 0; i < arary.length; i++) {
        rank[i] /= 1.0 * total;
    }
    for (let i: number = 1; i < arary.length; i++) {
        rank[i] += rank[i - 1];
    }
    let randomValue: number = random(0.0, 1.0);
    for (let i: number = 0; i < rank.length; i++) {
        if (randomValue < rank[i]) {
            return arary[i];
        }
    }
    return arary[arary.length - 1];
}

function getBestChromosome(){
    let elite:Elite =  mapElite.getCloset([
        parseInt((<HTMLInputElement>document.getElementById("entropy")).value),
        parseInt((<HTMLInputElement>document.getElementById("risk")).value),
        parseInt((<HTMLInputElement>document.getElementById("distribution")).value),
        parseInt((<HTMLInputElement>document.getElementById("density")).value)]
    );
    if(elite.best != null){
        return elite.best;
    }
    return elite.population.population[0];
}

function playBest(){
    if (mapElite != null && mapElite.mapSize > 0) {
        newWorld = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
        let c:Chromosome = getBestChromosome();
        newWorld.initialize(c.generateTalakatScript(spawnerGrammar, scriptGrammar));
    }
}

function stopBest(){
    currentWorld = null;
}

function stopEvolution() {
    if (interval != null) {
        clearInterval(interval);
        mapElite.evaluator.terminate();
        debugLog("Evolution Stopped\n");
    }
}

function startEvolution(populationSize:number, threads:number, initializationSize:number=100){
    if(populationSize == undefined){
        return;
    }
    stopEvolution();
    parameters.threadNumbers = threads;
    parameters.populationSize = populationSize;
    parameters.initializationSize = initializationSize;
    mapElite = new MapElite();
    mapElite.randomInitailzie();
    interval = setInterval(updateEvolution, parameters.checkInterval);
    debugLog("Evolution Started\n");
}

function updateEvolution(){
    mapElite.updateMap();
}

let keys: any = {
    LEFT_ARROW: 37,
    RIGHT_ARROW: 39,
    UP_ARROW: 38,
    DOWN_ARROW: 40,
    left: false,
    right: false,
    up: false,
    down: false
}
let action:Talakat.Point = new Talakat.Point();
let newWorld: Talakat.World = null;
let currentWorld: Talakat.World = null;

function setKey(key: number, down: boolean): void {
    if (key == keys.LEFT_ARROW) {
        keys.left = down;
    }
    if (key == keys.RIGHT_ARROW) {
        keys.right = down;
    }
    if (key == keys.UP_ARROW) {
        keys.up = down;
    }
    if (key == keys.DOWN_ARROW) {
        keys.down = down;
    }
}

function keyPressed(): void {
    setKey(keyCode, true);
}

function keyReleased(): void {
    setKey(keyCode, false);
}

function draw(): void {
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

        background(0, 0, 0);
        worldDraw(currentWorld);
        if (currentWorld.isWon() || currentWorld.isLose()) {
            currentWorld = null;
        }
    }

    if (newWorld != null) {
        currentWorld = newWorld;
        newWorld = null;
    }
}

function worldDraw(world: Talakat.World): void {
    strokeWeight(4);
    noFill();
    stroke(color(124, 46, 46));
    arc(world.boss.x, world.boss.y, 200, 200, 0, 2 * PI * world.boss.getHealth());

    strokeWeight(0);
    for (let bullet of world.bullets) {
        fill(color(bullet.color >> 16 & 0xff, bullet.color >> 8 & 0xff, bullet.color >> 0 & 0xff));
        ellipse(bullet.x, bullet.y, 2 * bullet.radius, 2 * bullet.radius);
        fill(color(255, 255, 255));
        ellipse(bullet.x, bullet.y, 1.75 * bullet.radius, 1.75 * bullet.radius);
    }
    fill(color(255, 255, 255));
    ellipse(world.player.x, world.player.y, 2 * world.player.radius, 2 * world.player.radius);
    fill(color(0, 0, 0, 100));
    rect(0, 0, 100, 40);
    fill(color(255, 255, 255));
    text("bullets: " + world.bullets.length.toString(), 0, 0, parameters.width, 20);
    text("spawners: " + world.spawners.length.toString(), 0, 20, parameters.width, 20);
}