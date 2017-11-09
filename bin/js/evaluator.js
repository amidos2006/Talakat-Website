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
/// <reference path="TreeNode.ts"/>
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
var AStar = (function () {
    function AStar(type, repeatingAction) {
        this.type = type;
        this.repeatingAction = repeatingAction;
    }
    AStar.prototype.initialize = function () {
    };
    AStar.prototype.getAction = function (world, value) {
        var startTime = new Date().getTime();
        var openNodes = [new TreeNode(null, -1, world.clone())];
        var bestNode = openNodes[0];
        var currentNumbers = 0;
        var solution = [];
        while (openNodes.length > 0 && solution.length == 0) {
            if (this.type == "time" && new Date().getTime() - startTime >= value) {
                break;
            }
            openNodes.sort(function (a, b) { return a.getEvaluation() - b.getEvaluation(); });
            var currentNode = openNodes.pop();
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                if (this.type == "node" && currentNumbers >= value) {
                    continue;
                }
                for (var i = 0; i < currentNode.children.length; i++) {
                    var node = currentNode.addChild(i, this.repeatingAction);
                    if (node.world.isWon()) {
                        solution = node.getSequence();
                        break;
                    }
                    if (bestNode.numChildren > 0 || node.getEvaluation() > bestNode.getEvaluation()) {
                        bestNode = node;
                    }
                    openNodes.push(node);
                    currentNumbers += 1;
                }
            }
        }
        if (solution.length > 0) {
            return solution.splice(0, 1)[0];
        }
        var action = bestNode.getSequence().splice(0, 1)[0];
        return action;
    };
    return AStar;
}());
/// <reference path="TreeNode.ts"/>
var OneStepLookAhead = (function () {
    function OneStepLookAhead(type, repeatingAction) {
        this.type = type;
        this.repeatingAction = repeatingAction;
    }
    OneStepLookAhead.prototype.initialize = function () {
    };
    OneStepLookAhead.prototype.getAction = function (world, value) {
        var rootNode = new TreeNode(null, -1, world.clone());
        var bestNode = rootNode;
        for (var i = 0; i < rootNode.children.length; i++) {
            var node = rootNode.addChild(i, this.repeatingAction);
            if (bestNode.numChildren > 0 || node.getEvaluation() > bestNode.getEvaluation()) {
                bestNode = node;
            }
        }
        return bestNode.getSequence().splice(0, 1)[0];
    };
    return OneStepLookAhead;
}());
importScripts("talakat.js");
this.onmessage = function (event) {
    var chromosome = event.data;
    evaluate(chromosome.id, chromosome.parameters, chromosome.input);
};
function checkForLoop(input, name, depth, maxDepth) {
    if (depth >= maxDepth) {
        return false;
    }
    var loop = [];
    for (var _i = 0, _a = input.spawners[name].pattern; _i < _a.length; _i++) {
        var n = _a[_i];
        if (n != "bullet" && n != "wait") {
            loop.push(n);
        }
    }
    for (var _b = 0, loop_1 = loop; _b < loop_1.length; _b++) {
        var n = loop_1[_b];
        return checkForLoop(input, n, depth + 1, maxDepth);
    }
    return true;
}
function checkForBullets(input, name, depth, maxDepth) {
    if (depth >= maxDepth) {
        return false;
    }
    var loop = [];
    for (var _i = 0, _a = input.spawners[name].pattern; _i < _a.length; _i++) {
        var n = _a[_i];
        if (n == "bullet") {
            return true;
        }
        else if (n != "wait") {
            loop.push(n);
        }
    }
    for (var _b = 0, loop_2 = loop; _b < loop_2.length; _b++) {
        var n = loop_2[_b];
        return checkForBullets(input, n, depth + 1, maxDepth);
    }
    return false;
}
function calculateEntropy(values) {
    var result = 0;
    for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
        var p = values_1[_i];
        if (p > 0 && p < 1) {
            result += -p * Math.log(p) / Math.log(values.length);
        }
    }
    return result;
}
function calculateBiEntropy(actionSequence) {
    var entropy = 0;
    var der1 = [];
    var der2 = [];
    var prob = [0, 0, 0, 0, 0];
    for (var i = 0; i < actionSequence.length; i++) {
        prob[actionSequence[i]] += 1.0;
        if (i > 0 && actionSequence[i] != actionSequence[i - 1]) {
            der1.push(1);
        }
        else {
            der1.push(0);
        }
    }
    for (var i = 0; i < prob.length; i++) {
        prob[i] /= actionSequence.length;
    }
    entropy += calculateEntropy(prob);
    prob = [0, 0];
    for (var i = 0; i < der1.length; i++) {
        prob[actionSequence[i]] += 1.0;
        if (i > 0 && der1[i] != der1[i - 1]) {
            der2.push(1);
        }
        else {
            der2.push(0);
        }
    }
    prob[0] /= der1.length;
    prob[1] /= der1.length;
    entropy += calculateEntropy(prob);
    prob = [0, 0];
    for (var i = 0; i < der1.length; i++) {
        prob[actionSequence[i]] += 1.0;
    }
    prob[0] /= der2.length;
    prob[1] /= der2.length;
    entropy += calculateEntropy(prob);
    return entropy / 3.0;
}
function calculateDistribution(buckets) {
    var result = 0;
    for (var _i = 0, buckets_1 = buckets; _i < buckets_1.length; _i++) {
        var b = buckets_1[_i];
        if (b.length > 0) {
            result += 1.0;
        }
    }
    return result / buckets.length;
}
function calculateDensity(buckets, totalBullets) {
    var result = 0;
    for (var _i = 0, buckets_2 = buckets; _i < buckets_2.length; _i++) {
        var b = buckets_2[_i];
        result += b.length / Math.max(totalBullets, 1);
    }
    return result / buckets.length;
}
function calculateRisk(player, width, height, buckets) {
    var result = 0;
    var x = Math.floor(player.x / width);
    var y = Math.floor(player.y / height);
    for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
            var index = (y + dy) * width + (x + dx);
            if (index >= buckets.length) {
                index = buckets.length - 1;
            }
            if (index < 0) {
                index = 0;
            }
            if (buckets[index].length > 0) {
                result += 1.0;
            }
        }
    }
    return result / 9.0;
}
function calculateBuckets(width, height, bullets) {
    var buckets = [];
    for (var i = 0; i < width * height; i++) {
        buckets.push([]);
    }
    var p = new Talakat.Point();
    for (var _i = 0, bullets_1 = bullets; _i < bullets_1.length; _i++) {
        var b = bullets_1[_i];
        var indeces = [];
        p.x = b.x - b.radius;
        p.y = b.y - b.radius;
        var index = Math.floor(p.y / height) * width + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        p.x = b.x + b.radius;
        p.y = b.y - b.radius;
        index = Math.floor(p.y / height) * width + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        p.x = b.x - b.radius;
        p.y = b.y + b.radius;
        index = Math.floor(p.y / height) * width + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        p.x = b.x + b.radius;
        p.y = b.y + b.radius;
        index = Math.floor(p.y / height) * width + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        for (var _a = 0, indeces_1 = indeces; _a < indeces_1.length; _a++) {
            var index_1 = indeces_1[_a];
            if (index_1 < 0) {
                index_1 = 0;
            }
            if (index_1 >= buckets.length) {
                index_1 = buckets.length - 1;
            }
            buckets[index_1].push(b);
        }
    }
    return buckets;
}
function getConstraints(loops, bullets, bossHealth) {
    return 0.4 / (loops + 1) + 0.4 * bullets + 0.2 * (1 - bossHealth);
}
function getFitness(bossHealth) {
    return (1 - bossHealth);
}
function evaluate(id, parameters, input) {
    var results = { id: [], fitness: [], constraints: [], behavior: [] };
    for (var i = 0; i < id.length; i++) {
        var temp = evaluateOne(id[i], parameters, input[i]);
        results.id.push(temp.id);
        results.fitness.push(temp.fitness);
        results.constraints.push(temp.constraints);
        results.behavior.push(temp.behavior);
    }
    this.postMessage(results);
}
function evaluateOne(id, parameters, input) {
    var numLoops = 0;
    for (var name_1 in input.spawners) {
        if (checkForLoop(input, name_1, 0, parameters.maxDepth)) {
            numLoops += 1;
        }
    }
    var numBullets = 0;
    var numSpawners = 0;
    for (var name_2 in input.spawners) {
        if (checkForBullets(input, name_2, 0, parameters.maxDepth)) {
            numBullets += 1.0;
        }
        numSpawners += 1;
    }
    var startWorld = new Talakat.World(parameters.width, parameters.height);
    startWorld.initialize(input);
    var ai = new self[parameters.agent](parameters);
    ai.initialize();
    var bestNode = ai.plan(startWorld.clone(), parameters.maxAgentTime);
    var risk = 0;
    var distribution = 0;
    var density = 0;
    var frames = 0;
    var actionSequence = bestNode.getSequence(parameters.repeatingAction);
    var currentNode = bestNode;
    while (currentNode.parent != null) {
        var bucketWidth = parameters.width / parameters.bucketsX;
        var bucketHeight = parameters.height / parameters.bucketsY;
        var buckets = calculateBuckets(bucketWidth, bucketHeight, currentNode.world.bullets);
        risk += calculateRisk(currentNode.world.player, bucketWidth, bucketHeight, buckets);
        distribution += calculateDistribution(buckets);
        density += calculateDensity(buckets, currentNode.world.bullets.length);
        frames += 1.0;
        currentNode = currentNode.parent;
    }
    if (numLoops > 0 || numBullets / numSpawners < 1) {
        return {
            id: id,
            fitness: 0,
            constraints: getConstraints(numLoops, numBullets / numSpawners, bestNode.world.boss.getHealth()),
            behavior: [calculateBiEntropy(actionSequence), risk / frames, distribution / frames, density / frames]
        };
    }
    return {
        id: id,
        fitness: getFitness(bestNode.world.boss.getHealth()),
        constraints: 1,
        behavior: [calculateBiEntropy(actionSequence), risk / frames, distribution / frames, density / frames]
    };
}
