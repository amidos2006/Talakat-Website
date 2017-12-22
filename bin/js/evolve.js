var Chromosome = (function () {
    function Chromosome() {
        this.id = ++Chromosome.totalID;
        this.spawnersSequence = [];
        this.scriptSequence = [];
        this.fitness = null;
        this.constraints = null;
        this.behavior = null;
        this.errorType = null;
    }
    Chromosome.prototype.randomInitialize = function (spawnerNum, sequenceLength, maxValue) {
        this.spawnersSequence = [];
        for (var i = 0; i < spawnerNum; i++) {
            this.spawnersSequence.push([]);
            for (var j = 0; j < sequenceLength; j++) {
                this.spawnersSequence[i].push(Math.floor(Math.random() * maxValue));
            }
        }
        this.scriptSequence = [];
        for (var i = 0; i < sequenceLength; i++) {
            this.scriptSequence.push(Math.floor(Math.random() * (maxValue - 1) + 1));
        }
    };
    Chromosome.prototype.clone = function () {
        var clone = new Chromosome();
        for (var i = 0; i < this.spawnersSequence.length; i++) {
            clone.spawnersSequence.push([]);
            for (var _i = 0, _a = this.spawnersSequence[i]; _i < _a.length; _i++) {
                var g = _a[_i];
                clone.spawnersSequence[i].push(g);
            }
        }
        for (var _b = 0, _c = this.scriptSequence; _b < _c.length; _b++) {
            var v = _c[_b];
            clone.scriptSequence.push(v);
        }
        clone.fitness = this.fitness;
        clone.constraints = this.constraints;
        clone.behavior = this.behavior;
        return clone;
    };
    Chromosome.prototype.generateTalakatScript = function (tracery, spawnerGrammar, scriptGrammar) {
        var input = "{\"spawners\":{";
        var index = 0;
        for (var _i = 0, _a = scriptGrammar.name; _i < _a.length; _i++) {
            var name_1 = _a[_i];
            var tempSequence_1 = this.spawnersSequence[index].concat([]);
            spawnerGrammar.name.splice(spawnerGrammar.name.indexOf(name_1), 1);
            var spawnerTracery = tracery.createGrammar(spawnerGrammar);
            input += "\"" + name_1 + "\":" + spawnerTracery.flattenSequence("#origin#", tempSequence_1) + ",";
            spawnerGrammar.name.push(name_1);
            index++;
        }
        var tempSequence = this.scriptSequence.concat([]);
        var scriptTracery = tracery.createGrammar(scriptGrammar);
        input = input.substring(0, input.length - 1) + "}, \"boss\":{\"script\":[";
        for (var _b = 0, _c = scriptGrammar.percent; _b < _c.length; _b++) {
            var p = _c[_b];
            input += "{\"health\":" + "\"" + p + "\",\"events\":[" + scriptTracery.flattenSequence("#events#", tempSequence) + "]},";
        }
        input = input.substring(0, input.length - 1) + "]}}";
        return JSON.parse(input);
    };
    Chromosome.prototype.crossover = function (chromosome) {
        var children = [this.clone(), chromosome.clone()];
        children[0].fitness = null;
        children[0].constraints = null;
        children[0].behavior = null;
        children[1].fitness = null;
        children[1].constraints = null;
        children[1].behavior = null;
        if (Math.random() < 0.5) {
            var temp = children[0].scriptSequence;
            children[0].scriptSequence = children[1].scriptSequence;
            children[1].scriptSequence = temp;
        }
        else {
            for (var i = 0; i < children[0].spawnersSequence.length; i++) {
                if (Math.random() < 0.5) {
                    var temp = children[0].spawnersSequence[i];
                    children[0].spawnersSequence[i] = children[1].spawnersSequence[i];
                    children[1].spawnersSequence[i] = temp;
                }
            }
        }
        return children;
    };
    Chromosome.prototype.mutate = function (mutationSize, maxValue) {
        var mutated = this.clone();
        mutated.fitness = null;
        mutated.constraints = null;
        mutated.behavior = null;
        var index = Math.floor(Math.random() * (mutated.spawnersSequence.length + 1));
        if (index < mutated.spawnersSequence.length) {
            for (var i = 0; i < mutated.spawnersSequence[index].length; i++) {
                mutated.spawnersSequence[index][i] += Math.round(2 * mutationSize * Math.random() - mutationSize);
                if (mutated.spawnersSequence[index][i] < 0) {
                    mutated.spawnersSequence[index][i] += maxValue;
                }
                if (mutated.spawnersSequence[index][i] >= maxValue) {
                    mutated.spawnersSequence[index][i] -= maxValue;
                }
            }
        }
        else {
            for (var i = 0; i < mutated.scriptSequence.length; i++) {
                mutated.scriptSequence[i] += Math.round(2 * mutationSize * Math.random() - mutationSize);
                if (mutated.scriptSequence[i] < 0) {
                    mutated.scriptSequence[i] += maxValue;
                }
                if (mutated.scriptSequence[i] >= maxValue) {
                    mutated.scriptSequence[i] -= maxValue;
                }
            }
        }
        for (var i = 0; i < mutated.spawnersSequence.length; i++) {
            if (Math.random() < 0.5) {
            }
        }
        return mutated;
    };
    return Chromosome;
}());
Chromosome.totalID = 0;
/// <reference path="Chromosome.ts"/>
var fs = require('fs');
var tracery = require('./tracery.js');
var spawnerGrammar = JSON.parse(fs.readFileSync("assets/spawnerGrammar.json"));
var scriptGrammar = JSON.parse(fs.readFileSync("assets/scriptGrammar.json"));
var spawnerNumber = 0;
for (var _i = 0, _a = scriptGrammar.name; _i < _a.length; _i++) {
    var n = _a[_i];
    spawnerGrammar.name.push(n);
    spawnerNumber += 1;
}
var parameters = JSON.parse(fs.readFileSync("assets/parameters.json"));
var recordedMessages = [];
var mapElite = null;
function sleep(amount) {
    var start = new Date().getTime();
    while (new Date().getTime() - start < amount)
        ;
}
var Elite = (function () {
    function Elite(best) {
        if (best.constraints == 1) {
            this.best = best;
        }
        this.population = new Population();
    }
    return Elite;
}());
var Evaluator = (function () {
    function Evaluator() {
        this.workers = [];
        this.population = null;
        this.running = false;
    }
    Evaluator.prototype.startEvaluation = function (chromosomes, param) {
        this.population = chromosomes;
        this.running = true;
        var chromoPerThread = Math.floor(this.population.length / param.threadNumbers);
        for (var i = 0; i < this.population.length; i++) {
            fs.writeFileSync('input/' + i + ".json", JSON.stringify(this.population[i].generateTalakatScript(tracery, spawnerGrammar, scriptGrammar)));
        }
    };
    Evaluator.prototype.checkDone = function () {
        var amount = 0;
        for (var i = 0; i < this.population.length; i++) {
            if (fs.existsSync("output/" + i + ".json")) {
                amount += 1;
            }
        }
        return amount >= this.population.length;
    };
    Evaluator.prototype.assignFitness = function (index, msg) {
        this.population[index].fitness = msg.fitness;
        this.population[index].behavior = msg.behavior;
        this.population[index].constraints = msg.constraints;
        this.population[index].errorType = msg.errorType;
    };
    Evaluator.prototype.finishEvaluation = function () {
        for (var i = 0; i < this.population.length; i++) {
            var msg = JSON.parse(fs.readFileSync("output/" + i + ".json"));
            this.assignFitness(i, msg);
            fs.unlinkSync("output/" + i + ".json");
        }
        var evaluatedPop = this.population;
        this.terminate();
        return evaluatedPop;
    };
    Evaluator.prototype.terminate = function () {
        for (var _i = 0, _a = this.workers; _i < _a.length; _i++) {
            var w = _a[_i];
            w.kill();
        }
        this.workers.length = 0;
        recordedMessages.length = 0;
        this.running = false;
        this.population = null;
    };
    return Evaluator;
}());
var MapElite = (function () {
    function MapElite() {
        this.map = {};
        this.mapSize = 0;
        this.iteration = 0;
        this.evaluator = new Evaluator();
    }
    MapElite.prototype.randomInitailzie = function () {
        var chromosomes = [];
        var batchSize = Math.min(parameters.initializationSize, parameters.batchSize);
        for (var i = 0; i < batchSize; i++) {
            var c = new Chromosome();
            c.randomInitialize(spawnerNumber, parameters.sequenceSize, parameters.maxValue);
            chromosomes.push(c);
        }
        parameters.initializationSize -= batchSize;
        this.evaluator.startEvaluation(chromosomes, parameters);
    };
    MapElite.prototype.writeResult = function () {
        fs.mkdirSync("results/gen" + this.iteration);
        for (var index in this.map) {
            if (this.map[index].best != null) {
                fs.writeFileSync("results/gen" + this.iteration + "/" + index + ".json", JSON.stringify(this.map[index].best.generateTalakatScript(tracery, spawnerGrammar, scriptGrammar)));
                fs.appendFileSync("results/gen" + this.iteration + "/total.txt", index + " , " + this.map[index].best.fitness + "\n");
            }
        }
        this.iteration += 1;
    };
    MapElite.prototype.updateInitialize = function () {
        if (this.evaluator.running && !this.evaluator.checkDone()) {
            return;
        }
        if (this.evaluator.running) {
            var pop = this.evaluator.finishEvaluation();
            for (var _i = 0, pop_1 = pop; _i < pop_1.length; _i++) {
                var c = pop_1[_i];
                this.assignMap(c);
            }
        }
        this.writeResult();
        if (parameters.initializationSize > 0) {
            this.randomInitailzie();
        }
    };
    MapElite.prototype.updateMap = function () {
        if (this.evaluator.running && !this.evaluator.checkDone()) {
            return;
        }
        if (this.evaluator.running) {
            var pop_2 = this.evaluator.finishEvaluation();
            for (var _i = 0, pop_3 = pop_2; _i < pop_3.length; _i++) {
                var c = pop_3[_i];
                this.assignMap(c);
            }
        }
        this.writeResult();
        var pop = [];
        while (pop.length < parameters.batchSize) {
            var newChromosomes = [];
            var elites = this.randomSelect();
            if (Math.random() < elites.length / this.mapSize) {
                newChromosomes.push(elites[Math.floor(Math.random() * elites.length)].best.clone());
                newChromosomes.push(elites[Math.floor(Math.random() * elites.length)].best.clone());
            }
            else {
                newChromosomes = this.rankSelect().population.selectChromosomes();
                if (Math.random() < parameters.interpopProb) {
                    var tempChromosomes = this.rankSelect().population.selectChromosomes();
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
    };
    MapElite.prototype.assignMap = function (c) {
        var index = "" + Math.floor(c.behavior[0] * parameters.dimensionSize);
        for (var i = 1; i < c.behavior.length; i++) {
            index += "," + Math.floor(c.behavior[i] * parameters.dimensionSize);
        }
        if (this.map[index] != undefined) {
            if (c.constraints == 1 && (this.map[index].best == null ||
                this.map[index].best.fitness < c.fitness)) {
                this.map[index].best = c;
            }
        }
        else {
            this.map[index] = new Elite(c);
            this.mapSize += 1;
        }
        this.map[index].population.addChromosome(c, parameters.populationSize);
    };
    MapElite.prototype.randomSelect = function () {
        var elites = [];
        for (var k in this.map) {
            if (this.map[k].best != null) {
                elites.push(this.map[k]);
            }
        }
        return elites;
    };
    MapElite.prototype.rankSelect = function () {
        var keys = [];
        for (var k in this.map) {
            keys.push({ key: k, size: this.map[k].population.length + 0.1 * Math.random() });
        }
        keys.sort(function (a, b) { return b.size - a.size; });
        return this.map[rankSelection(keys).key];
    };
    MapElite.prototype.getCloset = function (vector) {
        if (this.mapSize == 0) {
            return null;
        }
        var closest = "";
        var cValue = Number.MAX_VALUE;
        for (var k in this.map) {
            var temp = [];
            var parts = k.split(",");
            for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
                var p = parts_1[_i];
                temp.push(parseInt(p));
            }
            var result = 0;
            for (var i = 0; i < temp.length; i++) {
                result += Math.pow(vector[i] - temp[i], 2);
            }
            if (result < cValue) {
                cValue = result;
                closest = k;
            }
        }
        return this.map[closest];
    };
    return MapElite;
}());
var Population = (function () {
    function Population() {
        this.population = [];
    }
    Population.prototype.addChromosome = function (c, maxSize) {
        this.population.sort(function (a, b) { return (b.fitness + b.constraints) - (a.fitness + a.constraints); });
        if (this.population.length >= maxSize) {
            this.population.splice(this.population.length - 1, 1);
        }
        this.population.push(c);
    };
    Population.prototype.selectChromosomes = function () {
        var constraintsPop = [];
        var normalPop = [];
        for (var _i = 0, _a = this.population; _i < _a.length; _i++) {
            var c = _a[_i];
            if (c.constraints == 1) {
                normalPop.push(c);
            }
            else {
                constraintsPop.push(c);
            }
        }
        constraintsPop.sort(function (a, b) { return b.constraints - a.constraints; });
        normalPop.sort(function (a, b) { return b.fitness - a.fitness; });
        var newChromosomes;
        if (Math.random() < normalPop.length / this.population.length) {
            newChromosomes = [rankSelection(normalPop).clone(), rankSelection(normalPop).clone()];
        }
        else {
            newChromosomes = [rankSelection(constraintsPop).clone(), rankSelection(constraintsPop).clone()];
        }
        return newChromosomes;
    };
    return Population;
}());
function rankSelection(arary) {
    var rank = [];
    var total = 0;
    for (var i = 0; i < arary.length; i++) {
        rank.push(arary.length - i);
        total += arary.length - i;
    }
    for (var i = 0; i < arary.length; i++) {
        rank[i] /= 1.0 * total;
    }
    for (var i = 1; i < arary.length; i++) {
        rank[i] += rank[i - 1];
    }
    var randomValue = Math.random();
    for (var i = 0; i < rank.length; i++) {
        if (randomValue < rank[i]) {
            return arary[i];
        }
    }
    return arary[arary.length - 1];
}
function startEvolution(populationSize, initializationSize) {
    if (populationSize == undefined) {
        return;
    }
    parameters.populationSize = populationSize;
    parameters.initializationSize = initializationSize;
    mapElite = new MapElite();
    mapElite.randomInitailzie();
}
function updateEvolution() {
    if (parameters.initializationSize > 0) {
        mapElite.updateInitialize();
    }
    else {
        mapElite.updateMap();
    }
}
var popSize = parseInt(process.argv[2]);
var initSize = parseInt(process.argv[3]);
var batchSize = parseInt(process.argv[4]);
parameters.populationSize = popSize;
parameters.initializationSize = initSize;
parameters.batchSize = batchSize;
startEvolution(parameters.populationSize, parameters.initializationSize);
while (true) {
    updateEvolution();
    sleep(5000);
}
