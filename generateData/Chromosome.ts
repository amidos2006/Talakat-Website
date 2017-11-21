class Chromosome {
    static totalID:number=0;

    id:number;
    spawnerSequence: number[];
    scriptSequence:number[];
    constraints:number;
    fitness:number;
    behavior:number[];
    bossHealth:number;

    constructor() {
        this.id = ++Chromosome.totalID;
        this.spawnerSequence = [];
        this.scriptSequence = [];
        this.fitness = null;
        this.bossHealth = null;
        this.constraints = null;
        this.behavior = null;
    }

    random(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    randomInitialize(sequenceLength:number, maxValue:number): void {
        this.spawnerSequence = [];
        this.scriptSequence = [];
        for(let i:number=0; i<sequenceLength; i++){
            this.spawnerSequence.push(Math.floor(this.random(0, maxValue)));
            this.scriptSequence.push(Math.floor(this.random(1, maxValue)));
        }
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
        if (this.random(0, 1.0) < 0.5){
            let swapPoint: number = Math.floor(this.random(0, children[0].spawnerSequence.length));
            for (let i: number = 0; i < children[0].spawnerSequence.length; i++) {
                if (i > swapPoint) {
                    let temp: number = children[0].spawnerSequence[i];
                    children[0].spawnerSequence[i] = children[1].spawnerSequence[i];
                    children[1].spawnerSequence[i] = temp;
                }
            }
        }
        if (this.random(0, 1.0) < 0.5){
            let swapPoint: number = Math.floor(this.random(0, children[0].scriptSequence.length));
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
        
        if (this.random(0, 1.0) < 0.5){
            for (let i: number = 0; i < mutated.spawnerSequence.length; i++) {
                mutated.spawnerSequence[i] += Math.round(this.random(-mutationSize, mutationSize));
                if (mutated.spawnerSequence[i] < 0) {
                    mutated.spawnerSequence[i] += maxValue;
                }
                if (mutated.spawnerSequence[i] >= maxValue) {
                    mutated.spawnerSequence[i] -= maxValue;
                }
            }
        }
        if (this.random(0, 1.0) < 0.5) {
            for (let i: number = 0; i < mutated.scriptSequence.length; i++) {
                mutated.scriptSequence[i] += Math.round(this.random(-mutationSize, mutationSize));
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