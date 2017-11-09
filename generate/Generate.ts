let recordedMessages:any[] = [];
let interval:any = null;
let currentPopulation:Population = null;
let bestPopulation:Population = null;
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

class MapElite{
    map:any;
    mapSize:number;

    constructor(){
        this.map = {};
        this.mapSize = 0;
    }

    assignMap(c:Chromosome):void{
        let index:string = "";
        index += Math.floor(c.behavior[0] * 100) + "," + 
            Math.floor(c.behavior[1] * 100) + "," + 
            Math.floor(c.behavior[2] * 100) + "," +
            Math.floor(c.behavior[3] * 100);
        if(this.map[index] != undefined){
            if(this.map[index].fitness < c.fitness){
                this.map[index].fitness;
            }
        }
        else{
            this.map[index] = c;
            this.mapSize += 1;
        }
    }

    select():Chromosome{
        let keys:string[] = [];
        for(let k in this.map){
            keys.push(k);
        }
        return this.map[keys[Math.floor(random(0, keys.length))]];
    }

    getCloset(vector:number[]):Chromosome{
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
    generationNumber:number;
    population:Chromosome[];
    mapElites:MapElite;
    workers:Worker[];

    constructor(mapElite:MapElite){
        this.population = [];
        this.workers = [];
        this.mapElites = mapElite;
        this.generationNumber = 0;
    }

    randomPopulation(size:number, sequenceSize:number, maxValue:number):void{
        for(let i:number=0; i<size; i++){
            let c:Chromosome = new Chromosome();
            c.randomInitialize(sequenceSize, maxValue);
            this.population.push(c);
        }
    }

    startNextPopulation(threads:number):void{
        let chromoPerThread:number = Math.floor(this.population.length / threads);
        for(let i:number=0; i<threads; i++){
            let end:number = (i+1) * chromoPerThread;
            if(i == threads - 1){
                end = this.population.length;
            }
            let data:any = {id:[], parameters: parameters, input: []};
            for(let j:number=i*chromoPerThread; j<end; j++){
                data.id.push(this.population[j].id);
                data.input.push(generateTalakatScript(this.population[j].spawnerSequence, this.population[j].scriptSequence));
            }
            let w: Worker = new Worker("js/evaluator.js");
            w.postMessage(data);
            w.onmessage = function (event) {
                for(let i:number=0; i<event.data.id.length; i++){
                    recordedMessages.push({
                        id:event.data.id[i], 
                        fitness:event.data.fitness[i],
                        constraints: event.data.constraints[i], 
                        behavior:event.data.behavior[i]
                    });
                }
            }
            this.workers.push(w);
        }
    }

    checkNextPopulation():boolean{
        return recordedMessages.length == this.population.length;
    }

    private assignFitness(msg:any):void{
        for(let c of this.population){
            if(c.id == msg.id){
                c.fitness = msg.fitness;
                c.behavior = msg.behavior;
                c.constraints = msg.constraints;
                return;
            }
        }
    }

    private select(population:Chromosome[]):Chromosome{
        let rank:number[] = [];
        let total:number = 0;
        for(let i:number=0; i<population.length; i++){
            rank.push(population.length - i);
            total += population.length - i;
        }
        for(let i:number=0; i<population.length; i++){
            rank[i] /= 1.0 * total;
        }
        for (let i: number = 1; i < population.length; i++) {
            rank[i] += rank[i-1];
        }
        let randomValue:number = random(0.0, 1.0);
        for(let i:number=0; i<rank.length; i++){
            if(randomValue < rank[i]){
                return population[i];
            }
        }
        return population[population.length - 1];
    }

    getNextPopulation():Population{
        for(let w of this.workers){
            w.terminate();
        }
        this.workers.length = 0;
        for(let msg of recordedMessages){
            this.assignFitness(msg);
        }
        recordedMessages.length = 0;

        let constraintsPop:Chromosome[] = [];
        for(let c of this.population){
            if(c.constraints == 1){
                this.mapElites.assignMap(c);
            }
            else{
                constraintsPop.push(c);
            }
        }
        constraintsPop.sort((a: Chromosome, b: Chromosome) => { return b.constraints - a.constraints });
        this.population.sort((a: Chromosome, b: Chromosome) => { return (b.fitness + b.constraints) - (a.fitness + a.constraints) });
        let newPopulation:Population = new Population(this.mapElites);
        while(newPopulation.population.length < this.population.length){
            let newChromosomes: Chromosome[];
            if(random(0.0, 1.0) < this.mapElites.mapSize / this.population.length){
                newChromosomes = [this.mapElites.select().clone(), this.mapElites.select().clone()];
            }
            else{
                if (random(0.0, 1.0) < constraintsPop.length / this.population.length){
                    newChromosomes = [this.select(constraintsPop).clone(), this.select(constraintsPop).clone()];
                }
                else{
                    newChromosomes = [this.select(this.population).clone(), this.select(this.population).clone()];
                }
            }
            
            if(random(0.0, 1.0) < parameters.crossover){
                newChromosomes = newChromosomes[0].crossover(newChromosomes[1]);
            }
            if(random(0.0, 1.0) < parameters.mutation){
                newChromosomes[0] = newChromosomes[0].mutate(parameters.mutationSize, parameters.maxValue);
            }
            if (random(0.0, 1.0) < parameters.mutation) {
                newChromosomes[1] = newChromosomes[1].mutate(parameters.mutationSize, parameters.maxValue);
            }
            newPopulation.population.push(newChromosomes[0]);
            newPopulation.population.push(newChromosomes[1]);
        }
        
        newPopulation.population.splice(0, 1);
        if(this.mapElites.mapSize > 0){
            newPopulation.population.push(this.mapElites.select().clone());
        }
        else{
            newPopulation.population.push(constraintsPop[0].clone());
        }
        
        newPopulation.generationNumber = this.generationNumber + 1;
        return newPopulation;
    }

    terminate():void{
        for (let w of this.workers) {
            w.terminate();
        }
        this.workers.length = 0;
    }
}

function generateTalakatScript(spawnerSequence:number[], scriptSequence:number[]){
    let tempSequence: number[] = spawnerSequence.concat([]);
    let input: string = "{\"spawners\":{";
    for (let name of scriptGrammar.name) {
        spawnerGrammar.name.splice(spawnerGrammar.name.indexOf(name), 1);
        let spawnerTracery: tracery.Grammar = tracery.createGrammar(spawnerGrammar);
        input += "\"" + name + "\":" + spawnerTracery.flattenSequence("#origin#", tempSequence) + ",";
        spawnerGrammar.name.push(name);
    }
    tempSequence = scriptSequence.concat([]);
    let scriptTracery: tracery.Grammar = tracery.createGrammar(scriptGrammar);
    input = input.substring(0, input.length - 1) + "}, \"boss\":{\"script\":[";
    for (let p of scriptGrammar.percent) {
        input += "{\"health\":" + "\"" + p + "\",\"events\":[" + scriptTracery.flattenSequence("#events#", tempSequence) + "]},";
    }
    input = input.substring(0, input.length - 1) + "]}}";
    return JSON.parse(input);
}

function getBestChromosome(){
    if (bestPopulation != null) {
        let c: Chromosome = null;
        if (bestPopulation.mapElites.mapSize > 0) {
            c = bestPopulation.mapElites.getCloset([
                parseInt((<HTMLInputElement>document.getElementById("entropy")).value),
                parseInt((<HTMLInputElement>document.getElementById("risk")).value),
                parseInt((<HTMLInputElement>document.getElementById("distribution")).value),
                parseInt((<HTMLInputElement>document.getElementById("density")).value)]);
        }
        else {
            c = bestPopulation.population[0];
        }
        return c;
    }
    return null;
}

function playBest(){
    if (bestPopulation != null) {
        newWorld = new Talakat.World(parameters.width, parameters.height);
        let c:Chromosome = getBestChromosome();
        newWorld.initialize(generateTalakatScript(c.spawnerSequence, c.scriptSequence));
    }
}

function stopBest(){
    currentWorld = null;
}

function stopEvolution() {
    if (interval != null) {
        clearInterval(interval);
        currentPopulation.terminate();
        recordedMessages.length = 0;
        debugLog("Evolution Stopped\n");
    }
}

function startEvolution(size:number, threads:number){
    if(size == undefined){
        return;
    }
    stopEvolution();
    parameters.threads = threads;
    currentPopulation = new Population(new MapElite());
    currentPopulation.randomPopulation(size, parameters.sequenceSize, parameters.maxValue);
    currentPopulation.startNextPopulation(parameters.threads);
    interval = setInterval(updateEvolution, parameters.checkInterval);
    debugLog("Evolution Started\n");
}

function updateEvolution(){
    if(currentPopulation.checkNextPopulation()){
        bestPopulation = currentPopulation;
        currentPopulation = currentPopulation.getNextPopulation();
        currentPopulation.startNextPopulation(parameters.threads);
        debugLog("###########" + " Generation " + bestPopulation.generationNumber + " " + "###########\n");
        let c:Chromosome = getBestChromosome();
        debugLog(JSON.stringify(generateTalakatScript(c.spawnerSequence, c.scriptSequence)) + "\n");
        debugLog("Fitness: " + c.fitness + "\n");
        debugLog("Constarint: " + c.constraints + "\n");
        debugLog("Behavior: " + c.behavior + "\n");
        debugLog("######################################\n");
    }
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