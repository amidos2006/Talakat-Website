var Talakat = require("./talakat.js");
var GameStatus;
(function (GameStatus) {
    GameStatus[GameStatus["NONE"] = 0] = "NONE";
    GameStatus[GameStatus["LOSE"] = 1] = "LOSE";
    GameStatus[GameStatus["WIN"] = 2] = "WIN";
    GameStatus[GameStatus["NODEOUT"] = 3] = "NODEOUT";
    GameStatus[GameStatus["TIMEOUT"] = 4] = "TIMEOUT";
    GameStatus[GameStatus["TOOSLOW"] = 5] = "TOOSLOW";
    GameStatus[GameStatus["SPAWNERSTOBULLETS"] = 6] = "SPAWNERSTOBULLETS";
    GameStatus[GameStatus["ALOTSPAWNERS"] = 7] = "ALOTSPAWNERS";
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
                    this.status = GameStatus.NODEOUT;
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
    function AStar(parameters) {
        this.parameters = parameters;
    }
    AStar.prototype.initialize = function () {
        this.status = GameStatus.NONE;
    };
    AStar.prototype.getAction = function (world, value) {
        var startTime = new Date().getTime();
        var openNodes = [new TreeNode(null, -1, world.clone())];
        var bestNode = openNodes[0];
        var currentNumbers = 0;
        var solution = [];
        while (openNodes.length > 0 && solution.length == 0) {
            if (this.parameters.agentType == "time" && new Date().getTime() - startTime >= value) {
                break;
            }
            openNodes.sort(function (a, b) { return a.getEvaluation() - b.getEvaluation(); });
            var currentNode = openNodes.pop();
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                if (this.parameters.agentType == "node" && currentNumbers >= value) {
                    continue;
                }
                for (var i = 0; i < currentNode.children.length; i++) {
                    var node = currentNode.addChild(i, this.parameters.repeatingAction);
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
    AStar.prototype.playGame = function (world, value) {
        var spawnerFrames = 0;
        var currentNode = new TreeNode(null, -1, world);
        this.status = GameStatus.LOSE;
        while (!currentNode.world.isWon() && !currentNode.world.isLose()) {
            var action = this.getAction(currentNode.world, value);
            var tempStartGame = new Date().getTime();
            currentNode = currentNode.addChild(action, parameters.repeatingAction);
            if (new Date().getTime() - tempStartGame > this.parameters.maxStepTime) {
                this.status = GameStatus.TOOSLOW;
                return currentNode;
            }
            if (currentNode.world.spawners.length > currentNode.world.bullets.length / this.parameters.bulletToSpawner) {
                spawnerFrames += 1;
                if (spawnerFrames > this.parameters.maxSpawnerFrames) {
                    this.status = GameStatus.SPAWNERSTOBULLETS;
                    return currentNode;
                }
            }
            else {
                spawnerFrames = 0;
            }
            if (currentNode.world.spawners.length > this.parameters.maxNumSpawners) {
                this.status = GameStatus.ALOTSPAWNERS;
                return currentNode;
            }
        }
        if (currentNode.world.isWon()) {
            this.status = GameStatus.WIN;
        }
        return currentNode;
    };
    return AStar;
}());
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
function calculateSequenceEntropy(sequence) {
    var dic = {};
    for (var _i = 0, sequence_1 = sequence; _i < sequence_1.length; _i++) {
        var v = sequence_1[_i];
        if (!dic.hasOwnProperty(v.toString())) {
            dic[v.toString()] = 0;
        }
        dic[v.toString()] += 1;
    }
    var prob = [];
    for (var s in dic) {
        prob.push(dic[s] / sequence.length);
    }
    return calculateEntropy(prob);
}
function getSequenceDerivative(sequence) {
    var der = [];
    for (var i = 1; i < sequence.length; i++) {
        if (sequence[i] != sequence[i - 1]) {
            der.push(1);
        }
        else {
            der.push(0);
        }
    }
    return der;
}
function calculateBiEntropy(actionSequence) {
    var entropy = calculateSequenceEntropy(actionSequence);
    var der = getSequenceDerivative(actionSequence);
    entropy += calculateSequenceEntropy(der);
    return entropy / 2.0;
}
function calculateDistribution(buckets) {
    var result = 0;
    for (var _i = 0, buckets_1 = buckets; _i < buckets_1.length; _i++) {
        var b = buckets_1[_i];
        if (b > 0) {
            result += 1.0;
        }
    }
    return result / buckets.length;
}
function getMaxBulletsBucket(buckets) {
    var max = 0;
    for (var _i = 0, buckets_2 = buckets; _i < buckets_2.length; _i++) {
        var b = buckets_2[_i];
        if (b > max) {
            max = b;
        }
    }
    return max;
}
function calculateDensity(buckets, bulletNumber) {
    return getMaxBulletsBucket(buckets) / bulletNumber;
}
function calculateRisk(player, width, height, buckets) {
    var result = 0;
    var x = Math.floor(player.x / width);
    var y = Math.floor(player.y / height);
    for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
            var index_1 = (y + dy) * width + (x + dx);
            if (index_1 >= buckets.length) {
                index_1 = buckets.length - 1;
            }
            if (index_1 < 0) {
                index_1 = 0;
            }
            if (buckets[index_1] > 0) {
                result += 1.0;
            }
        }
    }
    return result / 9.0;
}
function initializeBuckets(width, height) {
    var buckets = [];
    for (var i = 0; i < width * height; i++) {
        buckets.push(0);
    }
    return buckets;
}
function calculateBuckets(width, height, bucketX, bullets, buckets) {
    var p = new Talakat.Point();
    for (var _i = 0, bullets_1 = bullets; _i < bullets_1.length; _i++) {
        var b = bullets_1[_i];
        var indeces = [];
        p.x = b.x - b.radius;
        p.y = b.y - b.radius;
        var index_2 = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index_2) == -1) {
            indeces.push(index_2);
        }
        p.x = b.x + b.radius;
        p.y = b.y - b.radius;
        index_2 = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index_2) == -1) {
            indeces.push(index_2);
        }
        p.x = b.x - b.radius;
        p.y = b.y + b.radius;
        index_2 = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index_2) == -1) {
            indeces.push(index_2);
        }
        p.x = b.x + b.radius;
        p.y = b.y + b.radius;
        index_2 = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index_2) == -1) {
            indeces.push(index_2);
        }
        for (var _a = 0, indeces_1 = indeces; _a < indeces_1.length; _a++) {
            var index_3 = indeces_1[_a];
            if (index_3 < 0) {
                index_3 = 0;
            }
            if (index_3 >= buckets.length) {
                index_3 = buckets.length - 1;
            }
            buckets[index_3] += 1;
        }
    }
}
function getConstraints(loops, bullets, bossHealth) {
    return 0.4 / (loops + 1) + 0.4 * bullets + 0.2 * (1 - bossHealth);
}
function getFitness(bossHealth) {
    return (1 - bossHealth);
}
function evaluate(filePath, parameters, game) {
    var temp = evaluateOne(parameters, game);
    fs.writeFileSync("output/" + filePath, JSON.stringify(temp));
    fs.unlinkSync("input/" + filePath);
}
function evaluateOne(parameters, input) {
    var startWorld = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
    startWorld.initialize(input);
    var ai = new AStar(parameters);
    ai.initialize();
    var bestNode = ai.playGame(startWorld.clone(), parameters.maxAgentTime);
    var risk = 0;
    var distribution = 0;
    var density = 0;
    var frames = 0;
    var bulletFrames = 0;
    var calculationFrames = parameters.calculationFrames;
    var bucketWidth = parameters.width / parameters.bucketsX;
    var bucketHeight = parameters.height / parameters.bucketsY;
    var buckets = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
    var actionSequence = bestNode.getSequence(parameters.repeatingAction);
    var currentNode = bestNode;
    while (currentNode.parent != null) {
        if (currentNode.world.bullets.length > parameters.bulletsFrame) {
            buckets = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
            calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, currentNode.world.bullets, buckets);
            bulletFrames += 1;
            risk += calculateRisk(currentNode.world.player, bucketWidth, bucketHeight, buckets);
            distribution += calculateDistribution(buckets);
            density += calculateDensity(buckets, currentNode.world.bullets.length);
        }
        frames += 1.0;
        currentNode = currentNode.parent;
    }
    if (ai.status == GameStatus.ALOTSPAWNERS ||
        ai.status == GameStatus.SPAWNERSTOBULLETS ||
        ai.status == GameStatus.TOOSLOW) {
        return {
            fitness: 0,
            bossHealth: bestNode.world.boss.getHealth(),
            errorType: ai.status,
            constraints: getFitness(bestNode.world.boss.getHealth()),
            behavior: [
                calculateBiEntropy(actionSequence),
                risk / Math.max(1, bulletFrames),
                distribution / Math.max(1, bulletFrames),
                bulletFrames / Math.max(1, frames)
            ]
        };
    }
    return {
        fitness: getFitness(bestNode.world.boss.getHealth()),
        bossHealth: bestNode.world.boss.getHealth(),
        errorType: ai.status,
        constraints: 1,
        behavior: [
            calculateBiEntropy(actionSequence),
            risk / Math.max(1, bulletFrames),
            distribution / Math.max(1, bulletFrames),
            bulletFrames / Math.max(1, frames)
        ]
    };
}
var tracery = require('./tracery.js');
var fs = require('fs');
var parameters = JSON.parse(fs.readFileSync("assets/parameters.json"));
var spawnerGrammar = JSON.parse(fs.readFileSync("assets/spawnerGrammar.json"));
var scriptGrammar = JSON.parse(fs.readFileSync("assets/scriptGrammar.json"));
var spawnerNumber = 0;
for (var _i = 0, _a = scriptGrammar.name; _i < _a.length; _i++) {
    var n = _a[_i];
    spawnerGrammar.name.push(n);
    spawnerNumber += 1;
}
function sleep(amount) {
    var start = new Date().getTime();
    while (new Date().getTime() - start < amount)
        ;
}
var index = parseInt(process.argv[2]);
var size = parseInt(process.argv[3]);
while (true) {
    for (var i = 0; i < size; i++) {
        var filePath = "input/" + (index * size + i).toString() + ".json";
        if (fs.existsSync(filePath)) {
            sleep(1000);
            var game = JSON.parse(fs.readFileSync(filePath));
            evaluate((index * size + i).toString() + ".json", parameters, game);
        }
    }
    sleep(4000);
}
