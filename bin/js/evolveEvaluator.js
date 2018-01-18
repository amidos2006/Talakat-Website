var Talakat = require("./talakat.js");
var GameStatus;
(function (GameStatus) {
    GameStatus[GameStatus["NONE"] = 0] = "NONE";
    GameStatus[GameStatus["LOSE"] = 1] = "LOSE";
    GameStatus[GameStatus["WIN"] = 2] = "WIN";
    GameStatus[GameStatus["NODEOUT"] = 3] = "NODEOUT";
    GameStatus[GameStatus["TIMEOUT"] = 4] = "TIMEOUT";
    GameStatus[GameStatus["TOOSLOW"] = 5] = "TOOSLOW";
    GameStatus[GameStatus["ALOTSPAWNERS"] = 6] = "ALOTSPAWNERS";
    GameStatus[GameStatus["LOWBULLETFRAMES"] = 7] = "LOWBULLETFRAMES";
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
    function TreeNode(parent, action, world, parameters) {
        this.parent = parent;
        this.children = [null, null, null, null, null];
        this.action = action;
        this.world = world;
        var bucketWidth = parameters.width / parameters.bucketsX;
        var bucketHeight = parameters.height / parameters.bucketsY;
        var buckets = this.initializeBuckets(parameters.bucketsX, parameters.bucketsY);
        this.calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, world.bullets, buckets);
        this.safezone = Math.min(1, (parameters.maxNumBullets -
            this.calculateSurroundingBullets(Math.floor(world.player.x / bucketWidth), Math.floor(world.player.y / bucketHeight), parameters.bucketsX, buckets)) / parameters.maxNumBullets);
        this.futurezone = this.distanceSafeBucket(Math.floor(world.player.x / bucketWidth), Math.floor(world.player.y / bucketHeight), parameters.bucketsX, buckets) / (parameters.bucketsX + parameters.bucketsY);
        this.numChildren = 0;
    }
    TreeNode.prototype.addChild = function (action, macroAction, parameters) {
        if (macroAction === void 0) { macroAction = 1; }
        var newWorld = this.world.clone();
        for (var i = 0; i < macroAction; i++) {
            newWorld.update(ActionNumber.getAction(action));
            if (newWorld.spawners.length > parameters.maxNumSpawners) {
                break;
            }
        }
        this.children[action] = new TreeNode(this, action, newWorld, parameters);
        this.numChildren += 1;
        return this.children[action];
    };
    TreeNode.prototype.getEvaluation = function (noise) {
        if (noise === void 0) { noise = 0; }
        var isLose = 0;
        if (this.world.isLose()) {
            isLose = 1;
        }
        return 0.75 * (1 - this.world.boss.getHealth()) + 0.05 * this.safezone - isLose + 0.2 * this.futurezone + noise;
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
    TreeNode.prototype.initializeBuckets = function (width, height) {
        var buckets = [];
        for (var i = 0; i < width * height; i++) {
            buckets.push(0);
        }
        return buckets;
    };
    TreeNode.prototype.calculateBuckets = function (width, height, bucketX, bullets, buckets) {
        var s = new Talakat.Point();
        var e = new Talakat.Point();
        for (var _i = 0, bullets_1 = bullets; _i < bullets_1.length; _i++) {
            var b = bullets_1[_i];
            var indeces = [];
            s.x = Math.floor((b.x - b.radius) / width);
            s.y = Math.floor((b.y - b.radius) / height);
            e.x = Math.floor((b.x + b.radius) / width);
            e.y = Math.floor((b.y + b.radius) / height);
            for (var x = s.x; x <= e.x; x++) {
                for (var y = s.y; y < e.y; y++) {
                    var index_1 = y * bucketX + x;
                    if (indeces.indexOf(index_1) == -1) {
                        indeces.push(index_1);
                    }
                }
            }
            for (var _a = 0, indeces_1 = indeces; _a < indeces_1.length; _a++) {
                var index_2 = indeces_1[_a];
                if (index_2 < 0) {
                    index_2 = 0;
                }
                if (index_2 >= buckets.length) {
                    index_2 = buckets.length - 1;
                }
                buckets[index_2] += 1;
            }
        }
    };
    TreeNode.prototype.calculateSurroundingBullets = function (x, y, bucketX, buckets) {
        var result = 0;
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                var index_3 = (y + dy) * bucketX + (x + dx);
                if (index_3 >= buckets.length) {
                    index_3 = buckets.length - 1;
                }
                if (index_3 < 0) {
                    index_3 = 0;
                }
                result += buckets[index_3];
            }
        }
        return result;
    };
    TreeNode.prototype.distanceSafeBucket = function (px, py, bucketX, buckets) {
        var bestX = px;
        var bestY = py;
        for (var i = 0; i < buckets.length; i++) {
            var x = i % bucketX;
            var y = Math.floor(i / bucketX);
            if (this.calculateSurroundingBullets(x, y, bucketX, buckets) <
                this.calculateSurroundingBullets(bestX, bestY, bucketX, buckets)) {
                bestX = x;
                bestY = y;
            }
        }
        return Math.abs(px - bestX) + Math.abs(py - bestY);
    };
    return TreeNode;
}());
// class AStarPlanner{
//     parameters: any;
//     status: GameStatus;
//     constructor(parameters: any) {
//         this.parameters = parameters;
//     }
//     initialize() {
//         this.status = GameStatus.NONE;
//     }
//     plan(world: any, value: number): TreeNode {
//         let startTime: number = new Date().getTime();
//         let numNodes: number = 0;
//         let spawnerFrames: number = 0;
//         let openNodes: TreeNode[] = [new TreeNode(null, -1, world)];
//         let bestNode: TreeNode = openNodes[0];
//         this.status = GameStatus.LOSE;
//         while (openNodes.length > 0) {
//             if (this.parameters.agentType == "time" && new Date().getTime() - startTime > value) {
//                 this.status = GameStatus.TIMEOUT;
//                 return bestNode;
//             }
//             openNodes.sort((a: TreeNode, b: TreeNode) => a.getEvaluation() - b.getEvaluation());
//             let currentNode: TreeNode = openNodes.pop();
//             if (bestNode.getEvaluation() < currentNode.getEvaluation()) {
//                 bestNode = currentNode;
//             }
//             if (currentNode.world.spawners.length > currentNode.world.bullets.length / this.parameters.bulletToSpawner) {
//                 spawnerFrames += 1;
//                 if (spawnerFrames > this.parameters.maxSpawnerFrames) {
//                     this.status = GameStatus.SPAWNERSTOBULLETS;
//                     return bestNode;
//                 }
//             }
//             else {
//                 spawnerFrames = 0;
//             }
//             if (currentNode.world.spawners.length > this.parameters.maxNumSpawners) {
//                 this.status = GameStatus.ALOTSPAWNERS;
//                 return bestNode;
//             }
//             if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
//                 if (this.parameters.agentType == "node" && numNodes > value) {
//                     this.status = GameStatus.NODEOUT;
//                     continue;
//                 }
//                 for (let i: number = 0; i < currentNode.children.length; i++) {
//                     let tempStartGame: number = new Date().getTime();
//                     let node: TreeNode = currentNode.addChild(i, this.parameters.repeatingAction, this.parameters.maxNumSpawners);
//                     if (new Date().getTime() - tempStartGame > this.parameters.maxStepTime) {
//                         this.status = GameStatus.TOOSLOW;
//                         return bestNode;
//                     }
//                     if (node.world.isWon()) {
//                         this.status = GameStatus.WIN;
//                         return node;
//                     }
//                     openNodes.push(node);
//                     numNodes += 1;
//                 }
//             }
//         }
//         return bestNode;
//     }
// }
var AStar = (function () {
    function AStar(parameters, noiseDist, repeatDist) {
        this.parameters = parameters;
        this.noiseDist = noiseDist;
        this.repeatDist = repeatDist;
    }
    AStar.prototype.initialize = function () {
        this.status = GameStatus.NONE;
    };
    AStar.prototype.getAction = function (world, value) {
        var _this = this;
        var startTime = new Date().getTime();
        var openNodes = [new TreeNode(null, -1, world.clone(), this.parameters)];
        var bestNode = openNodes[0];
        var currentNumbers = 0;
        var solution = [];
        while (openNodes.length > 0 && solution.length == 0) {
            openNodes.sort(function (a, b) { return a.getEvaluation(_this.noiseDist.ppf(Math.random())) - b.getEvaluation(_this.noiseDist.ppf(Math.random())); });
            var currentNode = openNodes.pop();
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                for (var i = 0; i < currentNode.children.length; i++) {
                    // console.log("Start One Action")
                    if (this.parameters.agentType == "time" && new Date().getTime() - startTime >= value) {
                        break;
                    }
                    if (this.parameters.agentType == "node" && currentNumbers >= value) {
                        break;
                    }
                    if (currentNode.world.spawners.length > this.parameters.maxNumSpawners) {
                        break;
                    }
                    var node = currentNode.addChild(i, 1, this.parameters);
                    // console.log("End One Action " + currentNode.world.spawners.length)
                    if (node.world.isWon()) {
                        solution = node.getSequence();
                        break;
                    }
                    if (bestNode.numChildren > 0 || node.getEvaluation(this.noiseDist.ppf(Math.random())) > bestNode.getEvaluation(this.noiseDist.ppf(Math.random()))) {
                        bestNode = node;
                    }
                    openNodes.push(node);
                }
            }
            currentNumbers += 1;
        }
        if (solution.length > 0) {
            return solution.splice(0, 1)[0];
        }
        var action = bestNode.getSequence().splice(0, 1)[0];
        return action;
    };
    AStar.prototype.playGame = function (world, value) {
        var spawnerFrames = 0;
        var currentNode = new TreeNode(null, -1, world, this.parameters);
        this.status = GameStatus.LOSE;
        var startGame = new Date().getTime();
        while (!currentNode.world.isWon() && !currentNode.world.isLose()) {
            // console.log("Get Action")
            var action = this.getAction(currentNode.world.clone(), value);
            var tempStartGame = new Date().getTime();
            // console.log("Make 10 Moves")
            var repeatValue = Math.abs(this.repeatDist.ppf(Math.random()));
            for (var i = 0; i < Math.round(repeatValue) + 1; i++) {
                currentNode = currentNode.addChild(action, 1, parameters.maxNumSpawners);
            }
            if (new Date().getTime() - tempStartGame > this.parameters.maxStepTime) {
                this.status = GameStatus.TOOSLOW;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            // if (currentNode.world.spawners.length > currentNode.world.bullets.length / this.parameters.bulletToSpawner) {
            //     spawnerFrames += 1;
            //     if (spawnerFrames > this.parameters.maxSpawnerFrames) {
            //         this.status = GameStatus.SPAWNERSTOBULLETS;
            //         currentNode.world.spawners.length = 0;
            //         return currentNode;
            //     }
            // }
            // else {
            //     spawnerFrames = 0;
            // }
            if (currentNode.world.spawners.length > this.parameters.maxNumSpawners) {
                this.status = GameStatus.ALOTSPAWNERS;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            if (new Date().getTime() - startGame > this.parameters.maxAgentTime) {
                this.status = GameStatus.TIMEOUT;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            // console.log("Boss Health: " + currentNode.world.boss.getHealth())
            // console.log("Spawners: " + currentNode.world.spawners.length)
            // console.log("Bullets: " + currentNode.world.bullets.length)
            currentNode.parent.world.spawners.length = 0;
            // console.log("Spawners After: " + currentNode.world.spawners.length)
        }
        if (currentNode.world.isWon()) {
            this.status = GameStatus.WIN;
        }
        currentNode.world.spawners.length = 0;
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
function calculateSequenceEntropy(sequence, symbolNum) {
    var prob = [];
    for (var i = 0; i < symbolNum; i++) {
        prob.push(0);
    }
    for (var _i = 0, sequence_1 = sequence; _i < sequence_1.length; _i++) {
        var v = sequence_1[_i];
        prob[v] += 1.0 / sequence.length;
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
    var entropy = 0;
    if (actionSequence.length > 0) {
        entropy += calculateSequenceEntropy(actionSequence, 5);
    }
    var der = [];
    if (actionSequence.length > 1000) {
        der = getSequenceDerivative(actionSequence);
        entropy += calculateSequenceEntropy(der.slice(1000), 2);
    }
    if (actionSequence.length > 2000) {
        der = getSequenceDerivative(der);
        entropy += calculateSequenceEntropy(der.slice(2000), 2);
    }
    return entropy / 3.0;
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
function calculateRisk(x, y, bucketsX, buckets) {
    var result = 0;
    for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
            var index_4 = (y + dy) * bucketsX + (x + dx);
            if (index_4 >= buckets.length) {
                index_4 = buckets.length - 1;
            }
            if (index_4 < 0) {
                index_4 = 0;
            }
            if (buckets[index_4] > 0) {
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
    var s = new Talakat.Point();
    var e = new Talakat.Point();
    for (var _i = 0, bullets_2 = bullets; _i < bullets_2.length; _i++) {
        var b = bullets_2[_i];
        var indeces = [];
        s.x = Math.floor((b.x - b.radius) / width);
        s.y = Math.floor((b.y - b.radius) / height);
        e.x = Math.floor((b.x + b.radius) / width);
        e.y = Math.floor((b.y + b.radius) / height);
        for (var x = s.x; x <= e.x; x++) {
            for (var y = s.y; y < e.y; y++) {
                var index_5 = y * bucketX + x;
                if (indeces.indexOf(index_5) == -1) {
                    indeces.push(index_5);
                }
            }
        }
        for (var _a = 0, indeces_2 = indeces; _a < indeces_2.length; _a++) {
            var index_6 = indeces_2[_a];
            if (index_6 < 0) {
                index_6 = 0;
            }
            if (index_6 >= buckets.length) {
                index_6 = buckets.length - 1;
            }
            buckets[index_6] += 1;
        }
    }
}
function getConstraints(loops, bullets, bossHealth) {
    return 0.4 / (loops + 1) + 0.4 * bullets + 0.2 * (1 - bossHealth);
}
function getFitness(bossHealth) {
    return (1 - bossHealth);
}
function evaluate(filePath, parameters, game, noiseDist, repeatDist) {
    var temp = evaluateOne(parameters, game, noiseDist, repeatDist);
    fs.writeFileSync("output/" + filePath, JSON.stringify(temp));
    fs.unlinkSync("input/" + filePath);
}
function evaluateOne(parameters, input, noiseDist, repeatDist) {
    var startWorld = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
    startWorld.initialize(input);
    var ai = new AStar(parameters, noiseDist, repeatDist);
    ai.initialize();
    var bestNode = ai.playGame(startWorld.clone(), parameters.agentValue);
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
            risk += calculateRisk(Math.floor(currentNode.world.player.x / bucketWidth), Math.floor(currentNode.world.player.x / bucketHeight), parameters.bucketsX, buckets);
            distribution += calculateDistribution(buckets);
            density += calculateDensity(buckets, currentNode.world.bullets.length);
        }
        frames += 1.0;
        currentNode = currentNode.parent;
        currentNode.children.length = 0;
    }
    if (ai.status == GameStatus.ALOTSPAWNERS ||
        ai.status == GameStatus.TOOSLOW ||
        bulletFrames / Math.max(1, frames) < parameters.targetMaxBulletsFrame) {
        if (bulletFrames / Math.max(1, frames) < parameters.targetMaxBulletsFrame) {
            ai.status = GameStatus.LOWBULLETFRAMES;
        }
        return {
            fitness: 0,
            bossHealth: bestNode.world.boss.getHealth(),
            errorType: ai.status,
            constraints: getFitness(bestNode.world.boss.getHealth()),
            behavior: [
                calculateBiEntropy(actionSequence),
                risk / Math.max(1, bulletFrames),
                distribution / Math.max(1, bulletFrames),
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
        ]
    };
}
var tracery = require('./tracery.js');
var fs = require('fs');
var gaussian = require('gaussian');
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
var noiseDist = gaussian(0, parameters.noiseStd);
var repeatDist = gaussian(0, parameters.repeatingAction);
while (true) {
    for (var i = 0; i < size; i++) {
        var filePath = "input/" + (index * size + i).toString() + ".json";
        if (fs.existsSync(filePath)) {
            sleep(1000);
            var game = JSON.parse(fs.readFileSync(filePath));
            evaluate((index * size + i).toString() + ".json", parameters, game, noiseDist, repeatDist);
        }
    }
    sleep(4000);
}
