class Chromosome {
    static totalID:number=0;

    id:number;
    spawnersSequence: number[][];
    scriptSequence:number[];
    constraints:number;
    fitness:number;
    behavior:number[];
    errorType:any;

    constructor() {
        this.id = ++Chromosome.totalID;
        this.spawnersSequence = [];
        this.scriptSequence = [];
        this.fitness = null;
        this.constraints = null;
        this.behavior = null;
        this.errorType = null;
    }

    randomInitialize(spawnerNum: number, sequenceLength: number, maxValue: number): void {
        this.spawnersSequence = [];
        for (let i: number = 0; i < spawnerNum; i++) {
            this.spawnersSequence.push([]);
            for (let j: number = 0; j < sequenceLength; j++) {
                this.spawnersSequence[i].push(Math.floor(Math.random()*maxValue));
            }
        }
        this.scriptSequence = [];
        for (let i: number = 0; i < sequenceLength; i++) {
            this.scriptSequence.push(Math.floor(Math.random()*(maxValue-1) + 1));
        }
    }

    clone():Chromosome {
        let clone:Chromosome = new Chromosome();
        for (let i: number = 0; i < this.spawnersSequence.length; i++) {
            clone.spawnersSequence.push([]);
            for (let g of this.spawnersSequence[i]) {
                clone.spawnersSequence[i].push(g);
            }
        }
        for (let v of this.scriptSequence) {
            clone.scriptSequence.push(v);
        }
        clone.fitness = this.fitness;
        clone.constraints = this.constraints;
        clone.behavior = this.behavior;
        return clone;
    }

    generateTalakatScript(tracery: any, spawnerGrammar: any, scriptGrammar: any) {
        let input: string = "{\"spawners\":{";
        let index: number = 0;
        for (let name of scriptGrammar.name) {
            let tempSequence: number[] = this.spawnersSequence[index].concat([]);
            spawnerGrammar.name.splice(spawnerGrammar.name.indexOf(name), 1);
            let spawnerTracery = tracery.createGrammar(spawnerGrammar);
            input += "\"" + name + "\":" + spawnerTracery.flattenSequence("#origin#", tempSequence) + ",";
            spawnerGrammar.name.push(name);
            index++;
        }
        let tempSequence: number[] = this.scriptSequence.concat([]);
        let scriptTracery = tracery.createGrammar(scriptGrammar);
        input = input.substring(0, input.length - 1) + "}, \"boss\":{\"script\":[";
        for (let p of scriptGrammar.percent) {
            input += "{\"health\":" + "\"" + p + "\",\"events\":[" + scriptTracery.flattenSequence("#events#", tempSequence) + "]},";
        }
        input = input.substring(0, input.length - 1) + "]}}";
        return JSON.parse(input);
    }

    crossover(chromosome: Chromosome): Chromosome[] {
        let children: Chromosome[] = [this.clone(), chromosome.clone()];
        children[0].fitness = null;
        children[0].constraints = null;
        children[0].behavior = null;
        children[1].fitness = null;
        children[1].constraints = null;
        children[1].behavior = null;

        if (Math.random() < 0.5) {
            let temp:number[] = children[0].scriptSequence;
            children[0].scriptSequence = children[1].scriptSequence;
            children[1].scriptSequence = temp;
        }
        else{
            for (let i: number = 0; i < children[0].spawnersSequence.length; i++) {
                if (Math.random() < 0.5) {
                    let temp:number[] = children[0].spawnersSequence[i];
                    children[0].spawnersSequence[i] = children[1].spawnersSequence[i];
                    children[1].spawnersSequence[i] = temp;
                }
            }
        }
        return children;
    }

    mutate(mutationSize: number, maxValue: number): Chromosome {
        let mutated: Chromosome = this.clone();
        mutated.fitness = null;
        mutated.constraints = null;
        mutated.behavior = null;

        
        if(Math.random() < 0.75){
            let index: number = Math.floor(Math.random() * (mutated.spawnersSequence.length));
            let gene: number = Math.floor(Math.random() * (mutated.spawnersSequence[index].length));
            mutated.spawnersSequence[index][gene] = Math.floor(Math.random() * maxValue);
        }
        else{
            let gene: number = Math.floor(Math.random() * (mutated.scriptSequence.length));
            mutated.scriptSequence[gene] = Math.floor(Math.random() * maxValue);
        }

        return mutated;
    }
}