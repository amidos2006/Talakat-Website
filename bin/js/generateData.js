var Chromosome = (function () {
    function Chromosome() {
        this.id = ++Chromosome.totalID;
        this.spawnerSequence = [];
        this.scriptSequence = [];
        this.fitness = null;
        this.bossHealth = null;
        this.constraints = null;
        this.behavior = null;
    }
    Chromosome.prototype.random = function (min, max) {
        return Math.random() * (max - min) + min;
    };
    Chromosome.prototype.randomInitialize = function (sequenceLength, maxValue) {
        this.spawnerSequence = [];
        this.scriptSequence = [];
        for (var i = 0; i < sequenceLength; i++) {
            this.spawnerSequence.push(Math.floor(this.random(0, maxValue)));
            this.scriptSequence.push(Math.floor(this.random(1, maxValue)));
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
        if (this.random(0, 1.0) < 0.5) {
            var swapPoint = Math.floor(this.random(0, children[0].spawnerSequence.length));
            for (var i = 0; i < children[0].spawnerSequence.length; i++) {
                if (i > swapPoint) {
                    var temp = children[0].spawnerSequence[i];
                    children[0].spawnerSequence[i] = children[1].spawnerSequence[i];
                    children[1].spawnerSequence[i] = temp;
                }
            }
        }
        if (this.random(0, 1.0) < 0.5) {
            var swapPoint = Math.floor(this.random(0, children[0].scriptSequence.length));
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
        if (this.random(0, 1.0) < 0.5) {
            for (var i = 0; i < mutated.spawnerSequence.length; i++) {
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
            for (var i = 0; i < mutated.scriptSequence.length; i++) {
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
    };
    return Chromosome;
}());
Chromosome.totalID = 0;
/// <reference path="Chromosome.ts"/>
var tracery = require("./tracery.js");
var Talakat = require("./talakat.js");
var GameStatus;
(function (GameStatus) {
    GameStatus[GameStatus["WIN"] = 0] = "WIN";
    GameStatus[GameStatus["LOSE"] = 1] = "LOSE";
    GameStatus[GameStatus["TOOSLOW"] = 2] = "TOOSLOW";
    GameStatus[GameStatus["TIMEOUT"] = 3] = "TIMEOUT";
    GameStatus[GameStatus["NONE"] = 4] = "NONE";
    GameStatus[GameStatus["SPAWNERSTOBULLETS"] = 5] = "SPAWNERSTOBULLETS";
    GameStatus[GameStatus["ALOTSPAWNERS"] = 6] = "ALOTSPAWNERS";
})(GameStatus || (GameStatus = {}));
var ActionNumber = (function () {
    function ActionNumber() {
    }
    ActionNumber.getAction = function (action) {
        if (action == ActionNumber.LEFT) {
            return new Talakat.Point(-1, 0);
        }
        if (action == ActionNumber.RIGHT) {
            return new Talakat.Point(1, 0);
        }
        if (action == ActionNumber.UP) {
            return new Talakat.Point(0, -1);
        }
        if (action == ActionNumber.DOWN) {
            return new Talakat.Point(0, 1);
        }
        if (action == ActionNumber.LEFT_DOWN) {
            return new Talakat.Point(-1, 1);
        }
        if (action == ActionNumber.RIGHT_DOWN) {
            return new Talakat.Point(1, 1);
        }
        if (action == ActionNumber.LEFT_UP) {
            return new Talakat.Point(-1, -1);
        }
        if (action == ActionNumber.RIGHT_UP) {
            return new Talakat.Point(1, -1);
        }
        return new Talakat.Point();
    };
    return ActionNumber;
}());
ActionNumber.LEFT = 0;
ActionNumber.RIGHT = 1;
ActionNumber.UP = 2;
ActionNumber.DOWN = 3;
ActionNumber.NONE = 4;
ActionNumber.LEFT_UP = 5;
ActionNumber.RIGHT_UP = 6;
ActionNumber.LEFT_DOWN = 7;
ActionNumber.RIGHT_DOWN = 8;
var TreeNode = (function () {
    function TreeNode(parent, action, world) {
        this.parent = parent;
        this.children = [null, null, null, null, null];
        this.action = action;
        this.world = world;
        this.numChildren = 0;
    }
    TreeNode.prototype.addChild = function (action, macroAction) {
        if (macroAction === void 0) { macroAction = 1; }
        var newWorld = this.world.clone();
        for (var i = 0; i < macroAction; i++) {
            newWorld.update(ActionNumber.getAction(action));
        }
        this.children[action] = new TreeNode(this, action, newWorld);
        this.numChildren += 1;
        return this.children[action];
    };
    TreeNode.prototype.getEvaluation = function (noise) {
        if (noise === void 0) { noise = 0; }
        var isLose = 0;
        if (this.world.isLose()) {
            isLose = 1;
        }
        return 1 - this.world.boss.getHealth() - isLose;
    };
    TreeNode.prototype.getSequence = function (macroAction) {
        if (macroAction === void 0) { macroAction = 1; }
        var result = [];
        var currentNode = this;
        while (currentNode.parent != null) {
            for (var i = 0; i < macroAction; i++) {
                result.push(currentNode.action);
            }
            currentNode = currentNode.parent;
        }
        return result.reverse();
    };
    return TreeNode;
}());
var AStarPlanner = (function () {
    function AStarPlanner(parameters) {
        this.parameters = parameters;
    }
    AStarPlanner.prototype.initialize = function () {
        this.status = GameStatus.NONE;
    };
    AStarPlanner.prototype.plan = function (world, value) {
        var startTime = new Date().getTime();
        var numNodes = 0;
        var spawnerFrames = 0;
        var openNodes = [new TreeNode(null, -1, world)];
        var bestNode = openNodes[0];
        this.status = GameStatus.LOSE;
        while (openNodes.length > 0) {
            if (this.parameters.agentType == "time" && new Date().getTime() - startTime > value) {
                this.status = GameStatus.TIMEOUT;
                return bestNode;
            }
            openNodes.sort(function (a, b) { return a.getEvaluation() - b.getEvaluation(); });
            var currentNode = openNodes.pop();
            if (bestNode.getEvaluation() < currentNode.getEvaluation()) {
                bestNode = currentNode;
            }
            if (currentNode.world.spawners.length > currentNode.world.bullets.length / this.parameters.bulletToSpawner) {
                spawnerFrames += 1;
                if (spawnerFrames > this.parameters.maxSpawnerFrames) {
                    this.status = GameStatus.SPAWNERSTOBULLETS;
                    return bestNode;
                }
            }
            else {
                spawnerFrames = 0;
            }
            if (currentNode.world.spawners.length > this.parameters.maxNumSpawners) {
                this.status = GameStatus.ALOTSPAWNERS;
                return bestNode;
            }
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                if (this.parameters.agentType == "node" && numNodes > value) {
                    this.status = GameStatus.TIMEOUT;
                    continue;
                }
                for (var i = 0; i < currentNode.children.length; i++) {
                    var tempStartGame = new Date().getTime();
                    var node = currentNode.addChild(i, this.parameters.repeatingAction);
                    if (new Date().getTime() - tempStartGame > this.parameters.maxStepTime) {
                        this.status = GameStatus.TOOSLOW;
                        return bestNode;
                    }
                    if (node.world.isWon()) {
                        this.status = GameStatus.WIN;
                        return node;
                    }
                    openNodes.push(node);
                    numNodes += 1;
                }
            }
        }
        return bestNode;
    };
    return AStarPlanner;
}());
global["AStarPlanner"] = AStarPlanner;
function generateTalakatScript(spawnerSequence, scriptSequence, spawnerGrammar, scriptGrammar) {
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
function saveGameFrames(id, lastNode, parameters) {
    if (parameters.saveFrames.length > 0) {
        var shell = require('shelljs');
        var saveFramesFS = require("fs");
        if (!saveFramesFS.existsSync(parameters.saveFrames)) {
            shell.mkdir('-p', parameters.saveFrames);
        }
        if (!saveFramesFS.existsSync(parameters.saveFrames + id + ".txt")) {
            saveFramesFS.writeFileSync(parameters.saveFrames + id + ".txt", "Bullets - Player - Action\n");
        }
        var currenAction = lastNode.action;
        var currentNode = lastNode.parent;
        while (currentNode.parent != null) {
            var bullets = lastNode.world.bullets;
            var line = "";
            for (var _i = 0, bullets_1 = bullets; _i < bullets_1.length; _i++) {
                var b = bullets_1[_i];
                line += Math.floor(b.x) + " " + Math.floor(b.y) + " " + Math.floor(b.radius) + ",";
            }
            if (line.length > 0) {
                line = line.substring(0, line.length - 1);
            }
            var player = currentNode.world.player.x + " " + currentNode.world.player.y + " " + currentNode.world.player.radius;
            var action = ActionNumber.getAction(currenAction).x + " " + ActionNumber.getAction(currenAction).y;
            saveFramesFS.appendFileSync(parameters.saveFrames + id + ".txt", line + " - " + action + "\n");
            currenAction = currentNode.action;
            currentNode = currentNode.parent;
        }
    }
}
var Evaluator = (function () {
    function Evaluator(scriptGrammar, spawnerGrammar) {
        this.scriptGrammar = scriptGrammar;
        this.spawnerGrammar = spawnerGrammar;
    }
    Evaluator.prototype.evaluate = function (chromosomes, parameters) {
        for (var _i = 0, chromosomes_1 = chromosomes; _i < chromosomes_1.length; _i++) {
            var c = chromosomes_1[_i];
            var startWorld = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
            startWorld.initialize(generateTalakatScript(c.spawnerSequence, c.scriptSequence, this.spawnerGrammar, this.scriptGrammar));
            var ai = new global[parameters.agent](parameters);
            ai.initialize();
            var bestNode = ai.plan(startWorld.clone(), parameters.maxAgentTime);
            c.fitness = 1 - bestNode.world.boss.getHealth();
            saveGameFrames(c.id, bestNode, parameters);
        }
    };
    return Evaluator;
}());
/// <reference path="Chromosome.ts"/>
/// <reference path="Evaluator.ts"/>
var fs = require('fs');
var spawnerGrammar = JSON.parse(fs.readFileSync("assets/spawnerGrammar.json"));
var scriptGrammar = JSON.parse(fs.readFileSync("assets/scriptGrammar.json"));
for (var _i = 0, _a = scriptGrammar.name; _i < _a.length; _i++) {
    var n = _a[_i];
    spawnerGrammar.name.push(n);
}
var parameters = JSON.parse(fs.readFileSync("assets/parameters.json"));
parameters.saveFrames += process.argv[2] + "/";
function writeEvaluator(c, fileName) {
    if (!fs.existsSync(fileName)) {
        fs.writeFileSync(fileName, "Spawner Sequence - Script Sequence - Win Percentage\n");
    }
    fs.appendFileSync(fileName, c.spawnerSequence.toString() + " - " + c.scriptSequence.toString() + " - " + c.fitness);
}
function getRandomChromosomes(size) {
    var chromosomes = [];
    for (var i = 0; i < size; i++) {
        var c = new Chromosome();
        c.randomInitialize(parameters.sequenceSize, parameters.maxValue);
        chromosomes.push(c);
    }
    return chromosomes;
}
var evaluator = new Evaluator(scriptGrammar, spawnerGrammar);
for (var i = 0; i < parameters.totalLevelsToTest; i++) {
    var chromosomes = getRandomChromosomes(30);
    evaluator.evaluate(chromosomes, parameters);
    for (var _b = 0, chromosomes_2 = chromosomes; _b < chromosomes_2.length; _b++) {
        var c = chromosomes_2[_b];
        writeEvaluator(c, parameters.saveFrames + "sequenceFitness.txt");
    }
}
