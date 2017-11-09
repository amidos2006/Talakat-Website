var recordedMessages = [];
var interval = null;
var currentPopulation = null;
var bestPopulation = null;
var spawnerGrammar;
var scriptGrammar;
var parameters;
var img;
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
    for (var _i = 0, _a = scriptGrammar.name; _i < _a.length; _i++) {
        var n = _a[_i];
        spawnerGrammar.name.push(n);
    }
}
function debugLog(text) {
    document.getElementById("debugText").textContent += text;
    document.getElementById("debugText").scrollTop = document.getElementById("debugText").scrollHeight;
}
var MapElite = (function () {
    function MapElite() {
        this.map = {};
        this.mapSize = 0;
    }
    MapElite.prototype.assignMap = function (c) {
        var index = "";
        index += Math.floor(c.behavior[0] * 100) + "," +
            Math.floor(c.behavior[1] * 100) + "," +
            Math.floor(c.behavior[2] * 100) + "," +
            Math.floor(c.behavior[3] * 100);
        if (this.map[index] != undefined) {
            if (this.map[index].fitness < c.fitness) {
                this.map[index].fitness;
            }
        }
        else {
            this.map[index] = c;
            this.mapSize += 1;
        }
    };
    MapElite.prototype.select = function () {
        var keys = [];
        for (var k in this.map) {
            keys.push(k);
        }
        return this.map[keys[Math.floor(random(0, keys.length))]];
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
    function Population(mapElite) {
        this.population = [];
        this.workers = [];
        this.mapElites = mapElite;
        this.generationNumber = 0;
    }
    Population.prototype.randomPopulation = function (size, sequenceSize, maxValue) {
        for (var i = 0; i < size; i++) {
            var c = new Chromosome();
            c.randomInitialize(sequenceSize, maxValue);
            this.population.push(c);
        }
    };
    Population.prototype.startNextPopulation = function (threads) {
        var chromoPerThread = Math.floor(this.population.length / threads);
        for (var i = 0; i < threads; i++) {
            var end = (i + 1) * chromoPerThread;
            if (i == threads - 1) {
                end = this.population.length;
            }
            var data = { id: [], parameters: parameters, input: [] };
            for (var j = i * chromoPerThread; j < end; j++) {
                data.id.push(this.population[j].id);
                data.input.push(generateTalakatScript(this.population[j].spawnerSequence, this.population[j].scriptSequence));
            }
            var w = new Worker("js/evaluator.js");
            w.postMessage(data);
            w.onmessage = function (event) {
                for (var i_1 = 0; i_1 < event.data.id.length; i_1++) {
                    recordedMessages.push({
                        id: event.data.id[i_1],
                        fitness: event.data.fitness[i_1],
                        constraints: event.data.constraints[i_1],
                        behavior: event.data.behavior[i_1]
                    });
                }
            };
            this.workers.push(w);
        }
    };
    Population.prototype.checkNextPopulation = function () {
        return recordedMessages.length == this.population.length;
    };
    Population.prototype.assignFitness = function (msg) {
        for (var _i = 0, _a = this.population; _i < _a.length; _i++) {
            var c = _a[_i];
            if (c.id == msg.id) {
                c.fitness = msg.fitness;
                c.behavior = msg.behavior;
                c.constraints = msg.constraints;
                return;
            }
        }
    };
    Population.prototype.select = function (population) {
        var rank = [];
        var total = 0;
        for (var i = 0; i < population.length; i++) {
            rank.push(population.length - i);
            total += population.length - i;
        }
        for (var i = 0; i < population.length; i++) {
            rank[i] /= 1.0 * total;
        }
        for (var i = 1; i < population.length; i++) {
            rank[i] += rank[i - 1];
        }
        var randomValue = random(0.0, 1.0);
        for (var i = 0; i < rank.length; i++) {
            if (randomValue < rank[i]) {
                return population[i];
            }
        }
        return population[population.length - 1];
    };
    Population.prototype.getNextPopulation = function () {
        for (var _i = 0, _a = this.workers; _i < _a.length; _i++) {
            var w = _a[_i];
            w.terminate();
        }
        this.workers.length = 0;
        for (var _b = 0, recordedMessages_1 = recordedMessages; _b < recordedMessages_1.length; _b++) {
            var msg = recordedMessages_1[_b];
            this.assignFitness(msg);
        }
        recordedMessages.length = 0;
        var constraintsPop = [];
        for (var _c = 0, _d = this.population; _c < _d.length; _c++) {
            var c = _d[_c];
            if (c.constraints == 1) {
                this.mapElites.assignMap(c);
            }
            else {
                constraintsPop.push(c);
            }
        }
        constraintsPop.sort(function (a, b) { return b.constraints - a.constraints; });
        this.population.sort(function (a, b) { return (b.fitness + b.constraints) - (a.fitness + a.constraints); });
        var newPopulation = new Population(this.mapElites);
        while (newPopulation.population.length < this.population.length) {
            var newChromosomes = void 0;
            if (random(0.0, 1.0) < this.mapElites.mapSize / this.population.length) {
                newChromosomes = [this.mapElites.select().clone(), this.mapElites.select().clone()];
            }
            else {
                if (random(0.0, 1.0) < constraintsPop.length / this.population.length) {
                    newChromosomes = [this.select(constraintsPop).clone(), this.select(constraintsPop).clone()];
                }
                else {
                    newChromosomes = [this.select(this.population).clone(), this.select(this.population).clone()];
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
            newPopulation.population.push(newChromosomes[0]);
            newPopulation.population.push(newChromosomes[1]);
        }
        newPopulation.population.splice(0, 1);
        if (this.mapElites.mapSize > 0) {
            newPopulation.population.push(this.mapElites.select().clone());
        }
        else {
            newPopulation.population.push(constraintsPop[0].clone());
        }
        newPopulation.generationNumber = this.generationNumber + 1;
        return newPopulation;
    };
    Population.prototype.terminate = function () {
        for (var _i = 0, _a = this.workers; _i < _a.length; _i++) {
            var w = _a[_i];
            w.terminate();
        }
        this.workers.length = 0;
    };
    return Population;
}());
function generateTalakatScript(spawnerSequence, scriptSequence) {
    var tempSequence = spawnerSequence.concat([]);
    var input = "{\"spawners\":{";
    for (var _i = 0, _a = scriptGrammar.name; _i < _a.length; _i++) {
        var name_1 = _a[_i];
        spawnerGrammar.name.splice(spawnerGrammar.name.indexOf(name_1), 1);
        var spawnerTracery = tracery.createGrammar(spawnerGrammar);
        input += "\"" + name_1 + "\":" + spawnerTracery.flattenSequence("#origin#", tempSequence) + ",";
        spawnerGrammar.name.push(name_1);
    }
    tempSequence = scriptSequence.concat([]);
    var scriptTracery = tracery.createGrammar(scriptGrammar);
    input = input.substring(0, input.length - 1) + "}, \"boss\":{\"script\":[";
    for (var _b = 0, _c = scriptGrammar.percent; _b < _c.length; _b++) {
        var p = _c[_b];
        input += "{\"health\":" + "\"" + p + "\",\"events\":[" + scriptTracery.flattenSequence("#events#", tempSequence) + "]},";
    }
    input = input.substring(0, input.length - 1) + "]}}";
    return JSON.parse(input);
}
function getBestChromosome() {
    if (bestPopulation != null) {
        var c = null;
        if (bestPopulation.mapElites.mapSize > 0) {
            c = bestPopulation.mapElites.getCloset([
                parseInt(document.getElementById("entropy").value),
                parseInt(document.getElementById("risk").value),
                parseInt(document.getElementById("distribution").value),
                parseInt(document.getElementById("density").value)
            ]);
        }
        else {
            c = bestPopulation.population[0];
        }
        return c;
    }
    return null;
}
function playBest() {
    if (bestPopulation != null) {
        newWorld = new Talakat.World(parameters.width, parameters.height);
        var c = getBestChromosome();
        newWorld.initialize(generateTalakatScript(c.spawnerSequence, c.scriptSequence));
    }
}
function stopBest() {
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
function startEvolution(size, threads) {
    if (size == undefined) {
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
function updateEvolution() {
    if (currentPopulation.checkNextPopulation()) {
        bestPopulation = currentPopulation;
        currentPopulation = currentPopulation.getNextPopulation();
        currentPopulation.startNextPopulation(parameters.threads);
        debugLog("###########" + " Generation " + bestPopulation.generationNumber + " " + "###########\n");
        var c = getBestChromosome();
        debugLog(JSON.stringify(generateTalakatScript(c.spawnerSequence, c.scriptSequence)) + "\n");
        debugLog("Fitness: " + c.fitness + "\n");
        debugLog("Constarint: " + c.constraints + "\n");
        debugLog("Behavior: " + c.behavior + "\n");
        debugLog("######################################\n");
    }
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
        this.spawnerSequence = [];
        this.scriptSequence = [];
        this.fitness = null;
        this.constraints = null;
        this.behavior = null;
    }
    Chromosome.prototype.randomInitialize = function (sequenceLength, maxValue) {
        this.spawnerSequence = [];
        this.scriptSequence = [];
        for (var i = 0; i < sequenceLength; i++) {
            this.spawnerSequence.push(Math.floor(random(0, maxValue)));
            this.scriptSequence.push(Math.floor(random(1, maxValue)));
        }
    };
    Chromosome.prototype.clone = function () {
        var clone = new Chromosome();
        for (var _i = 0, _a = this.spawnerSequence; _i < _a.length; _i++) {
            var v = _a[_i];
            clone.spawnerSequence.push(v);
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
        if (random(0, 1.0) < 0.5) {
            var swapPoint = floor(random(0, children[0].spawnerSequence.length));
            for (var i = 0; i < children[0].spawnerSequence.length; i++) {
                if (i > swapPoint) {
                    var temp = children[0].spawnerSequence[i];
                    children[0].spawnerSequence[i] = children[1].spawnerSequence[i];
                    children[1].spawnerSequence[i] = temp;
                }
            }
        }
        if (random(0, 1.0) < 0.5) {
            var swapPoint = floor(random(0, children[0].scriptSequence.length));
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
        if (random(0, 1.0) < 0.5) {
            for (var i = 0; i < mutated.spawnerSequence.length; i++) {
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
