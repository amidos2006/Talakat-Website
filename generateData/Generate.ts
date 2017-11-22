/// <reference path="Chromosome.ts"/>
/// <reference path="Evaluator.ts"/>

let fs = require('fs');
let spawnerGrammar: any = JSON.parse(fs.readFileSync("assets/spawnerGrammar.json"));
let scriptGrammar: any = JSON.parse(fs.readFileSync("assets/scriptGrammar.json"));
let spawnerNumber:number = 0;
for (let n of scriptGrammar.name) {
    spawnerGrammar.name.push(n);
    spawnerNumber += 1;
}
let parameters: any = JSON.parse(fs.readFileSync("assets/parameters.json"));
parameters.saveFrames += process.argv[2] + "/";

function writeEvaluator(c:Chromosome, fileName:string): void {
    if (!fs.existsSync(fileName)){
        let spawnerNames:string = "Spawner 1";
        for(let i:number=2; i<=spawnerNumber; i++){
            spawnerNames += " - Spawner " + i;
        }
        fs.writeFileSync(fileName, spawnerNames + " - Script Sequence - Win Percentage\n");
    }
    let spawnerValues:string = c.spawnersSequence[0].toString();
    for(let i:number=1; i<spawnerNumber; i++){
        spawnerValues += " - " + c.spawnersSequence[i].toString();
    }
    fs.appendFileSync(fileName, 
        spawnerValues + " - " + c.scriptSequence.toString() + " - " + c.fitness + "\n");
}

function getRandomChromosomes(size:number): Chromosome[] {
    let chromosomes: Chromosome[] = [];
    for(let i: number = 0; i <size; i++) {
        let c: Chromosome = new Chromosome();
        c.randomInitialize(spawnerNumber, parameters.sequenceSize, parameters.maxValue);
        chromosomes.push(c);
    }
    return chromosomes;
}

let evaluator: Evaluator = new Evaluator(fs, scriptGrammar, spawnerGrammar);

for (let i: number = 0; i < parameters.totalLevelsToTest; i+=30){
    let chromosomes:Chromosome[] = getRandomChromosomes(30);
    evaluator.evaluate(chromosomes, parameters);
    for (let c of chromosomes) {
        writeEvaluator(c, parameters.saveFrames + "sequenceFitness.txt");
    }
    chromosomes = null;
}