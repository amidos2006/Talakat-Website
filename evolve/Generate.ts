/// <reference path="Chromosome.ts"/>

let fs = require('fs');
let tracery = require('./tracery.js');

let spawnerGrammar: any = JSON.parse(fs.readFileSync("assets/spawnerGrammar.json"));
let scriptGrammar: any = JSON.parse(fs.readFileSync("assets/scriptGrammar.json"));
let spawnerNumber: number = 0;
for (let n of scriptGrammar.name) {
    spawnerGrammar.name.push(n);
    spawnerNumber += 1;
}
let parameters: any = JSON.parse(fs.readFileSync("assets/parameters.json"));

let recordedMessages:any[] = [];
let mapElite:MapElite = null;

function sleep(amount: number) {
    let start: number = new Date().getTime();
    while (new Date().getTime() - start < amount);
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
    workers:any[];
    population:Chromosome[];
    running:boolean;

    constructor(){
        this.workers = [];
        this.population = null;
        this.running = false;
    }

    startEvaluation(chromosomes:Chromosome[], param: any): void {
        this.population = chromosomes;
        this.running = true;

        let chromoPerThread: number = Math.floor(this.population.length / param.threadNumbers);
        for (let i: number = 0; i < this.population.length; i++) {
            fs.writeFileSync('input/' + i + ".json", 
                JSON.stringify(this.population[i].generateTalakatScript(tracery, spawnerGrammar, scriptGrammar)));
        }
    }

    checkDone(): boolean {
        let amount:number = 0;
        for(let i:number=0; i<this.population.length; i++){
            if (fs.existsSync("output/" + i + ".json")){
                amount += 1;
            }
        }
        return amount >= this.population.length;
    }

    private assignFitness(index:number, msg: any): void {
        this.population[index].fitness = msg.fitness;
        this.population[index].behavior = msg.behavior;
        this.population[index].constraints = msg.constraints;
        this.population[index].errorType = msg.errorType; 
    }

    finishEvaluation(): Chromosome[] {
        for(let i:number=0; i<this.population.length; i++){
            let msg:any = JSON.parse(fs.readFileSync("output/" + i + ".json"));
            this.assignFitness(i, msg);
            fs.unlinkSync("output/" + i + ".json");
        }
        let evaluatedPop:Chromosome[] = this.population;
        this.terminate();
        return evaluatedPop;
    }

    terminate(): void {
        for (let w of this.workers) {
            w.kill();
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
    iteration:number;

    constructor(){
        this.map = {};
        this.mapSize = 0;
        this.iteration = 0;
        this.evaluator = new Evaluator();
    }

    randomInitailzie(): void {
        let chromosomes:Chromosome[] = [];
        let batchSize:number = Math.min(parameters.initializationSize, parameters.batchSize);
        for (let i: number = 0; i < batchSize; i++) {
            let c: Chromosome = new Chromosome();
            c.randomInitialize(spawnerNumber, parameters.sequenceSize, parameters.maxValue);
            chromosomes.push(c);
        }
        parameters.initializationSize -= batchSize;
        this.evaluator.startEvaluation(chromosomes, parameters);
    }

    writeResult():void{
        fs.mkdirSync("results/gen" + this.iteration);
        for(let index in this.map){
            if (this.map[index].best != null){
                fs.writeFileSync("results/gen" + this.iteration + "/" + index + ".json", 
                    JSON.stringify(this.map[index].best.generateTalakatScript(tracery, spawnerGrammar, scriptGrammar)));
                fs.appendFileSync("results/gen" + this.iteration + "/total.txt",
                    index + " , " + this.map[index].best.fitness + "\n");
            }
        }
        this.iteration += 1;
    }

    updateInitialize():void{
        if(this.evaluator.running && !this.evaluator.checkDone()){
            return;
        }
        if (this.evaluator.running) {
            let pop: Chromosome[] = this.evaluator.finishEvaluation();
            for (let c of pop) {
                this.assignMap(c);
            }
        }
        this.writeResult();

        if(parameters.initializationSize > 0){
            this.randomInitailzie();
        }
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
        this.writeResult();

        let pop:Chromosome[] = [];
        while (pop.length < parameters.batchSize){
            let newChromosomes:Chromosome[] = [];
            let elites:Elite[] = this.randomSelect();
            if(Math.random() < elites.length / this.mapSize){
                newChromosomes.push(elites[Math.floor(Math.random()*elites.length)].best.clone());
                newChromosomes.push(elites[Math.floor(Math.random()*elites.length)].best.clone());
            }
            else{
                newChromosomes = this.rankSelect().population.selectChromosomes();
                if (Math.random() < parameters.interpopProb){
                    let tempChromosomes: Chromosome[] = this.rankSelect().population.selectChromosomes();
                    newChromosomes[0] = tempChromosomes[0];
                }
            }

            if (Math.random() < parameters.crossover) {
                newChromosomes = newChromosomes[0].crossover(newChromosomes[1]);
            }
            if (Math.random() < parameters.mutation) {
                newChromosomes[0] = newChromosomes[0].mutate(parameters.mutationSize, parameters.maxValue);
            }
            if (Math.random() < parameters.mutation) {
                newChromosomes[1] = newChromosomes[1].mutate(parameters.mutationSize, parameters.maxValue);
            }
            pop.push(newChromosomes[0]);
            pop.push(newChromosomes[1]);
        }
        this.evaluator.startEvaluation(pop, parameters);
    }

    private assignMap(c: Chromosome):void{
        let index: string = "" + Math.floor(c.behavior[0] * parameters.dimensionSize);
        for (let i: number = 1; i < c.behavior.length; i++){
            index += "," + Math.floor(c.behavior[i] * parameters.dimensionSize);
        }
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
            keys.push({ key: k, size: this.map[k].population.length + 0.1 * Math.random()});
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
        if (Math.random() < normalPop.length / this.population.length){
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
    let randomValue: number = Math.random();
    for (let i: number = 0; i < rank.length; i++) {
        if (randomValue < rank[i]) {
            return arary[i];
        }
    }
    return arary[arary.length - 1];
}

function startEvolution(populationSize:number, initializationSize:number){
    if(populationSize == undefined){
        return;
    }
    parameters.populationSize = populationSize;
    parameters.initializationSize = initializationSize;
    mapElite = new MapElite();
    mapElite.randomInitailzie();
}

function updateEvolution(){
    if(parameters.initializationSize > 0){
        mapElite.updateInitialize();
    }
    else{
        mapElite.updateMap();
    }
}

let popSize:number = parseInt(process.argv[2]);
let initSize:number = parseInt(process.argv[3]);
let batchSize:number = parseInt(process.argv[4]);

parameters.populationSize = popSize;
parameters.initializationSize = initSize;
parameters.batchSize = batchSize;

startEvolution(parameters.populationSize, parameters.initializationSize);
while(true){
    updateEvolution();
    sleep(5000);
}