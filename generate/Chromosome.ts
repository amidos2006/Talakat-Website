class Chromosome {
    static totalID:number=0;

    id:number;
    spawnerSequence: number[];
    scriptSequence:number[];
    constraints:number;
    fitness:number;
    behavior:number[];
    errorType:any;

    constructor() {
        this.id = ++Chromosome.totalID;
        this.spawnerSequence = [];
        this.scriptSequence = [];
        this.fitness = null;
        this.constraints = null;
        this.behavior = null;
        this.errorType = null;
    }

    randomInitialize(sequenceLength:number, maxValue:number): void {
        this.spawnerSequence = [];
        this.scriptSequence = [];
        for(let i:number=0; i<sequenceLength; i++){
            this.spawnerSequence.push(Math.floor(random(0, maxValue)));
            this.scriptSequence.push(Math.floor(random(1, maxValue)));
        }
    }

    generateTalakatScript(spawnerGrammar: any, scriptGrammar: any) {
        let tempSequence: number[] = this.spawnerSequence.concat([]);
        let input: string = "{\"spawners\":{";
        for (let name of scriptGrammar.name) {
            spawnerGrammar.name.splice(spawnerGrammar.name.indexOf(name), 1);
            let spawnerTracery: tracery.Grammar = tracery.createGrammar(spawnerGrammar);
            input += "\"" + name + "\":" + spawnerTracery.flattenSequence("#origin#", tempSequence) + ",";
            spawnerGrammar.name.push(name);
        }
        tempSequence = this.scriptSequence.concat([]);
        let scriptTracery: tracery.Grammar = tracery.createGrammar(scriptGrammar);
        input = input.substring(0, input.length - 1) + "}, \"boss\":{\"script\":[";
        for (let p of scriptGrammar.percent) {
            input += "{\"health\":" + "\"" + p + "\",\"events\":[" + scriptTracery.flattenSequence("#events#", tempSequence) + "]},";
        }
        input = input.substring(0, input.length - 1) + "]}}";
        return JSON.parse(input);
    }

    clone():Chromosome {
        let clone:Chromosome = new Chromosome();
        for (let v of this.spawnerSequence){
            clone.spawnerSequence.push(v);
        }
        for (let v of this.scriptSequence) {
            clone.scriptSequence.push(v);
        }
        clone.fitness = this.fitness;
        clone.constraints = this.constraints;
        clone.behavior = this.behavior;
        return clone;
    }

    crossover(chromosome:Chromosome):Chromosome[] {
        let children:Chromosome[] = [this.clone(), chromosome.clone()];
        children[0].fitness = null;
        children[0].constraints = null;
        children[0].behavior = null;
        children[1].fitness = null;
        children[1].constraints = null;
        children[1].behavior = null;
        if(random(0, 1.0) < 0.5){
            let swapPoint: number = floor(random(0, children[0].spawnerSequence.length));
            for (let i: number = 0; i < children[0].spawnerSequence.length; i++) {
                if (i > swapPoint) {
                    let temp: number = children[0].spawnerSequence[i];
                    children[0].spawnerSequence[i] = children[1].spawnerSequence[i];
                    children[1].spawnerSequence[i] = temp;
                }
            }
        }
        if(random(0, 1.0) < 0.5){
            let swapPoint:number = floor(random(0, children[0].scriptSequence.length));
            for (let i: number = 0; i < children[0].scriptSequence.length; i++) {
                if (i > swapPoint) {
                    let temp: number = children[0].scriptSequence[i];
                    children[0].scriptSequence[i] = children[1].scriptSequence[i];
                    children[1].scriptSequence[i] = temp;
                }
            }
        }
        
        return children;
    }

    mutate(mutationSize: number, maxValue:number):Chromosome {
        let mutated:Chromosome = this.clone();
        mutated.fitness = null;
        mutated.constraints = null;
        mutated.behavior = null;
        
        if(random(0, 1.0) < 0.5){
            for (let i: number = 0; i < mutated.spawnerSequence.length; i++) {
                mutated.spawnerSequence[i] += Math.round(random(-mutationSize, mutationSize));
                if (mutated.spawnerSequence[i] < 0) {
                    mutated.spawnerSequence[i] += maxValue;
                }
                if (mutated.spawnerSequence[i] >= maxValue) {
                    mutated.spawnerSequence[i] -= maxValue;
                }
            }
        }
        if (random(0, 1.0) < 0.5) {
            for (let i: number = 0; i < mutated.scriptSequence.length; i++) {
                mutated.scriptSequence[i] += Math.round(random(-mutationSize, mutationSize));
                if (mutated.scriptSequence[i] < 0) {
                    mutated.scriptSequence[i] += maxValue;
                }
                if (mutated.scriptSequence[i] >= maxValue) {
                    mutated.scriptSequence[i] -= maxValue;
                }
            }
        }
        
        return mutated;
    }
}