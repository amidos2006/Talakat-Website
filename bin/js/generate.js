var recordedMessages = [];
var interval = null;
var mapElite = null;
var spawnerGrammar;
var scriptGrammar;
var parameters;
var img;
var spawnerNumbers = 0;
function preload() {
    spawnerGrammar = loadJSON("assets/spawnerGrammar.json");
    scriptGrammar = loadJSON("assets/scriptGrammar.json");
    parameters = loadJSON("assets/parameters.json");
    img = loadImage("assets/circle.png");
}
function setup() {
    var canvas = createCanvas(400, 640);
    canvas.parent("game");
    background(0, 0, 0);
    spawnerNumbers = 0;
    for (var _i = 0, _a = scriptGrammar.name; _i < _a.length; _i++) {
        var n = _a[_i];
        spawnerGrammar.name.push(n);
        spawnerNumbers += 1;
    }
}
function debugLog(text) {
    document.getElementById("debugText").textContent += text;
    document.getElementById("debugText").scrollTop = document.getElementById("debugText").scrollHeight;
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
        debugLog("Evaluator Started.\n");
        this.population = chromosomes;
        this.running = true;
        var chromoPerThread = Math.floor(this.population.length / param.threadNumbers);
        for (var i = 0; i < param.threadNumbers; i++) {
            var end = (i + 1) * chromoPerThread;
            if (i == param.threadNumbers - 1) {
                end = this.population.length;
            }
            var data = { id: [], parameters: param, input: [] };
            for (var j = i * chromoPerThread; j < end; j++) {
                data.id.push(this.population[j].id);
                data.input.push(this.population[j].generateTalakatScript(spawnerGrammar, scriptGrammar));
            }
            var w = new Worker("js/evaluator.js");
            w.postMessage(data);
            w.onmessage = function (event) {
                for (var i_1 = 0; i_1 < event.data.id.length; i_1++) {
                    recordedMessages.push({
                        id: event.data.id[i_1],
                        fitness: event.data.fitness[i_1],
                        constraints: event.data.constraints[i_1],
                        errorType: event.data.errorType[i_1],
                        behavior: event.data.behavior[i_1]
                    });
                }
            };
            this.workers.push(w);
        }
    };
    Evaluator.prototype.checkDone = function () {
        return recordedMessages.length >= this.population.length;
    };
    Evaluator.prototype.assignFitness = function (msg) {
        for (var _i = 0, _a = this.population; _i < _a.length; _i++) {
            var c = _a[_i];
            if (c.id == msg.id) {
                c.fitness = msg.fitness;
                c.behavior = msg.behavior;
                c.constraints = msg.constraints;
                c.errorType = msg.errorType;
                return;
            }
        }
    };
    Evaluator.prototype.finishEvaluation = function () {
        for (var _i = 0, recordedMessages_1 = recordedMessages; _i < recordedMessages_1.length; _i++) {
            var msg = recordedMessages_1[_i];
            this.assignFitness(msg);
        }
        var evaluatedPop = this.population;
        this.terminate();
        debugLog("Evaluator Finished.\n");
        return evaluatedPop;
    };
    Evaluator.prototype.terminate = function () {
        for (var _i = 0, _a = this.workers; _i < _a.length; _i++) {
            var w = _a[_i];
            w.terminate();
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
        this.evaluator = new Evaluator();
    }
    MapElite.prototype.randomInitailzie = function () {
        debugLog("Initializing The Map.\n");
        var chromosomes = [];
        for (var i = 0; i < parameters.initializationSize; i++) {
            var c = new Chromosome();
            c.randomInitialize(spawnerNumbers, parameters.sequenceSize, parameters.maxValue);
            chromosomes.push(c);
        }
        this.evaluator.startEvaluation(chromosomes, parameters);
    };
    MapElite.prototype.updateMap = function () {
        if (this.evaluator.running && !this.evaluator.checkDone()) {
            return;
        }
        if (this.evaluator.running) {
            var pop_1 = this.evaluator.finishEvaluation();
            for (var _i = 0, pop_2 = pop_1; _i < pop_2.length; _i++) {
                var c = pop_2[_i];
                this.assignMap(c);
            }
        }
        debugLog("Map Size: " + this.mapSize + "\n");
        debugLog("########################################\n");
        var tempBest = getBestChromosome();
        debugLog("Best Chromosome: " + JSON.stringify(tempBest.generateTalakatScript(spawnerGrammar, scriptGrammar)) + "\n");
        debugLog("Fitness: " + tempBest.fitness + "\n");
        debugLog("Constraints: " + tempBest.constraints + "\n");
        debugLog("Behaviors: " + tempBest.behavior + "\n");
        debugLog("########################################\n");
        var pop = [];
        while (pop.length < parameters.populationSize) {
            var newChromosomes = [];
            var elites = this.randomSelect();
            if (random(0.0, 1.0) < elites.length / this.mapSize) {
                newChromosomes.push(elites[Math.floor(random(0, elites.length))].best.clone());
                newChromosomes.push(elites[Math.floor(random(0, elites.length))].best.clone());
            }
            else {
                newChromosomes = this.rankSelect().population.selectChromosomes();
                if (random(0.0, 1.0) < parameters.interpopProb) {
                    var tempChromosomes = this.rankSelect().population.selectChromosomes();
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
    };
    MapElite.prototype.assignMap = function (c) {
        var index = "";
        index += Math.floor(c.behavior[0] * parameters.dimensionSize) + "," +
            Math.floor(c.behavior[1] * parameters.dimensionSize) + "," +
            Math.floor(c.behavior[2] * parameters.dimensionSize) + "," +
            Math.floor(c.behavior[3] * parameters.dimensionSize);
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
            keys.push({ key: k, size: this.map[k].population.length + random(0.0, 0.1) });
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
        if (random(0.0, 1.0) < normalPop.length / this.population.length) {
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
    var randomValue = random(0.0, 1.0);
    for (var i = 0; i < rank.length; i++) {
        if (randomValue < rank[i]) {
            return arary[i];
        }
    }
    return arary[arary.length - 1];
}
function getBestChromosome() {
    var elite = mapElite.getCloset([
        parseInt(document.getElementById("entropy").value),
        parseInt(document.getElementById("risk").value),
        parseInt(document.getElementById("distribution").value),
        parseInt(document.getElementById("density").value)
    ]);
    if (elite.best != null) {
        return elite.best;
    }
    return elite.population.population[0];
}
function playBest() {
    if (mapElite != null && mapElite.mapSize > 0) {
        newWorld = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
        var c = getBestChromosome();
        newWorld.initialize(c.generateTalakatScript(spawnerGrammar, scriptGrammar));
    }
}
function stopBest() {
    currentWorld = null;
}
function stopEvolution() {
    if (interval != null) {
        clearInterval(interval);
        mapElite.evaluator.terminate();
        debugLog("Evolution Stopped\n");
    }
}
function startEvolution(populationSize, threads, initializationSize) {
    if (initializationSize === void 0) { initializationSize = 100; }
    if (populationSize == undefined) {
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
function updateEvolution() {
    mapElite.updateMap();
}
var keys = {
    LEFT_ARROW: 37,
    RIGHT_ARROW: 39,
    UP_ARROW: 38,
    DOWN_ARROW: 40,
    left: false,
    right: false,
    up: false,
    down: false
};
var action = new Talakat.Point();
var newWorld = null;
var currentWorld = null;
function setKey(key, down) {
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
function keyPressed() {
    setKey(keyCode, true);
}
function keyReleased() {
    setKey(keyCode, false);
}
function draw() {
    action.x = 0;
    action.y = 0;
    if (currentWorld != null) {
        var startTime = new Date().getTime();
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
function worldDraw(world) {
    strokeWeight(4);
    noFill();
    stroke(color(124, 46, 46));
    arc(world.boss.x, world.boss.y, 200, 200, 0, 2 * PI * world.boss.getHealth());
    strokeWeight(0);
    for (var _i = 0, _a = world.bullets; _i < _a.length; _i++) {
        var bullet = _a[_i];
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
                this.spawnersSequence[i].push(Math.floor(random(0, maxValue)));
            }
        }
        this.scriptSequence = [];
        for (var i = 0; i < sequenceLength; i++) {
            this.scriptSequence.push(Math.floor(random(1, maxValue)));
        }
    };
    Chromosome.prototype.generateTalakatScript = function (spawnerGrammar, scriptGrammar) {
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
    Chromosome.prototype.crossover = function (chromosome) {
        var children = [this.clone(), chromosome.clone()];
        children[0].fitness = null;
        children[0].constraints = null;
        children[0].behavior = null;
        children[1].fitness = null;
        children[1].constraints = null;
        children[1].behavior = null;
        for (var i = 0; i < children[0].spawnersSequence.length; i++) {
            if (random(0, 1.0) < 0.5) {
                var swapPoint = Math.floor(random(0, children[0].spawnersSequence[i].length));
                for (var j = 0; j < children[0].spawnersSequence[i].length; j++) {
                    if (i > swapPoint) {
                        var temp = children[0].spawnersSequence[i][j];
                        children[0].spawnersSequence[i][j] = children[1].spawnersSequence[i][j];
                        children[1].spawnersSequence[i][j] = temp;
                    }
                }
            }
        }
        if (random(0, 1.0) < 0.5) {
            var swapPoint = Math.floor(random(0, children[0].scriptSequence.length));
            for (var i = 0; i < children[0].scriptSequence.length; i++) {
                if (i > swapPoint) {
                    var temp = children[0].scriptSequence[i];
                    children[0].scriptSequence[i] = children[1].scriptSequence[i];
                    children[1].scriptSequence[i] = temp;
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
        for (var i = 0; i < mutated.spawnersSequence.length; i++) {
            if (random(0, 1.0) < 0.5) {
                for (var j = 0; j < mutated.spawnersSequence.length; j++) {
                    mutated.spawnersSequence[i][j] += Math.round(random(-mutationSize, mutationSize));
                    if (mutated.spawnersSequence[i][j] < 0) {
                        mutated.spawnersSequence[i][j] += maxValue;
                    }
                    if (mutated.spawnersSequence[i][j] >= maxValue) {
                        mutated.spawnersSequence[i][j] -= maxValue;
                    }
                }
            }
        }
        if (random(0, 1.0) < 0.5) {
            for (var i = 0; i < mutated.scriptSequence.length; i++) {
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
    };
    return Chromosome;
}());
Chromosome.totalID = 0;
