/// <reference path="Chromosome.ts"/>
/// <reference path="Evaluator.ts"/>

let fs = require('fs');
let spawnerGrammar: any = JSON.parse(fs.readFileSync("assets/spawnerGrammar.json"));
let scriptGrammar: any = JSON.parse(fs.readFileSync("assets/scriptGrammar.json"));
for (let n of scriptGrammar.name) {
    spawnerGrammar.name.push(n);
}
let parameters: any = JSON.parse(fs.readFileSync("assets/parameters.json"));
parameters.saveFrames += process.argv[2] + "/";

function writeEvaluator(c:Chromosome, fileName:string): void {
    if (!fs.existsSync(fileName)){
        fs.writeFileSync(fileName, "Spawner Sequence - Script Sequence - Win Percentage\n");
    }
    fs.appendFileSync(fileName, 
        c.spawnerSequence.toString() + " - " + c.scriptSequence.toString() + " - " + c.fitness);
}

function getRandomChromosomes(size:number): Chromosome[] {
    let chromosomes: Chromosome[] = [];
    for(let i: number = 0; i <size; i++) {
        let c: Chromosome = new Chromosome();
        c.randomInitialize(parameters.sequenceSize, parameters.maxValue);
        chromosomes.push(c);
    }
    return chromosomes;
}

let evaluator: Evaluator = new Evaluator(scriptGrammar, spawnerGrammar);

for (let i: number = 0; i < parameters.totalLevelsToTest; i++){
    let chromosomes:Chromosome[] = getRandomChromosomes(30);
    evaluator.evaluate(chromosomes, parameters);
    for (let c of chromosomes) {
        writeEvaluator(c, parameters.saveFrames + "sequenceFitness.txt");
    }
}