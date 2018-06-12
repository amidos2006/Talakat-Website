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
        var tempWorld = world.clone();
        this.safezone = 0.0;
        var startTime = new Date().getTime();
        for (var i = 0; i < 10; i++) {
            tempWorld.update(ActionNumber.getAction(ActionNumber.NONE));
            if (tempWorld.isLose() || tempWorld.spawners.length > parameters.maxNumSpawners) {
                // console.log("Safety Fails");
                tempWorld = null;
                break;
            }
            if (tempWorld.isWon()) {
                this.safezone = 10;
                break;
            }
            this.safezone += 1.0;
        }
        this.safezone = this.safezone / 10;
        this.numChildren = 0;
        this.totalValue = 0;
        this.maxValue = -1000000000000000;
        this.numVisits = 0;
    }
    TreeNode.prototype.getUnexpandedNode = function () {
        for (var i = 0; i < this.children.length; i++) {
            if (this.children[i] == null) {
                return i;
            }
        }
        return -1;
    };
    TreeNode.prototype.pickBestChild = function (C, Q) {
        var bestChild = this.children[0];
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            var bestUCB = bestChild.getUCB(C, Q) + 0.00000001 * Math.random();
            var currentUCB = child.getUCB(C, Q) + 0.00000001 * Math.random();
            if (currentUCB > bestUCB) {
                bestChild = child;
            }
        }
        return bestChild;
    };
    TreeNode.prototype.treePolicy = function (C, Q, parameters) {
        var currentNode = this;
        var unExpanded = currentNode.getUnexpandedNode();
        while (unExpanded == -1) {
            currentNode = currentNode.pickBestChild(C, Q);
            unExpanded = currentNode.getUnexpandedNode();
        }
        if (!(currentNode.world.isWon() || currentNode.world.isLose())) {
            currentNode = currentNode.addChild(unExpanded, 10, parameters);
        }
        return currentNode;
    };
    TreeNode.prototype.getUCB = function (C, Q) {
        var exploitation = this.totalValue / this.numVisits;
        var exploration = Math.sqrt(Math.log(this.parent.numVisits) / this.numVisits);
        var bestValue = this.maxValue;
        return Q * bestValue + (1 - Q) * exploitation + C * exploitation;
    };
    TreeNode.prototype.simulate = function (depth) {
        var newWorld = this.world.clone();
        var startTime = new Date().getTime();
        for (var i = 0; i < depth; i++) {
            if (newWorld.isWon() || newWorld.isLose()) {
                break;
            }
            var action = Math.floor(Math.random() * this.children.length);
            newWorld.update(ActionNumber.getAction(action));
            if (newWorld.spawners.length > parameters.maxNumSpawners) {
                return null;
            }
        }
        return newWorld;
    };
    TreeNode.prototype.backpropagate = function (value) {
        var currentNode = this;
        while (currentNode != null) {
            currentNode.numVisits += 1;
            if (value > currentNode.maxValue) {
                currentNode.maxValue = value;
            }
            currentNode.totalValue += value;
            currentNode = currentNode.parent;
        }
    };
    TreeNode.prototype.addChild = function (action, macroAction, parameters) {
        if (macroAction === void 0) { macroAction = 1; }
        var newWorld = this.world.clone();
        var startTime = new Date().getTime();
        for (var i = 0; i < macroAction; i++) {
            // console.log("Adding Child With Action " + action)
            newWorld.update(ActionNumber.getAction(action));
            // console.log("Child Add: " + newWorld.spawners.length)
            // console.log("Child Add: " + newWorld.hideUnknown)
            // console.log("Child Add: " + newWorld.boss.getHealth())
            if (newWorld.spawners.length > parameters.maxNumSpawners) {
                // console.log("Add Fails");
                return null;
            }
            // console.log("Numbers: " + macroAction + " " + i + " " + parameters)
            if (newWorld.isWon() || newWorld.isLose()) {
                break;
            }
        }
        this.children[action] = new TreeNode(this, action, newWorld, parameters);
        this.numChildren += 1;
        return this.children[action];
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
var AStar = (function () {
    function AStar(parameters, noiseDist, repeatDist) {
        this.parameters = parameters;
        this.noiseDist = noiseDist;
        this.repeatDist = repeatDist;
    }
    AStar.prototype.initialize = function () {
        this.status = GameStatus.NONE;
        this.target = null;
        this.noise = 0;
        this.frames = 0;
    };
    AStar.prototype.getEvaluation = function (world, safezone, target, noise) {
        if (noise === void 0) { noise = 0; }
        var isLose = 0;
        if (world.isLose()) {
            isLose = 1;
        }
        var bucketWidth = parameters.width / parameters.bucketsX;
        var bucketHeight = parameters.height / parameters.bucketsY;
        var p = {
            x: Math.floor(world.player.x / bucketWidth),
            y: Math.floor(world.player.y / bucketHeight)
        };
        return 0.5 * (1 - world.boss.getHealth()) - isLose + 0.5 * safezone -
            0.25 * (Math.abs(p.x - target.x) + Math.abs(p.y - target.y));
    };
    AStar.prototype.initializeBuckets = function (width, height) {
        var buckets = [];
        for (var i = 0; i < width * height; i++) {
            buckets.push(0);
        }
        return buckets;
    };
    AStar.prototype.calculateBuckets = function (width, height, bucketX, bucketY, bullets, buckets) {
        var s = new Talakat.Point();
        var e = new Talakat.Point();
        for (var _i = 0, bullets_1 = bullets; _i < bullets_1.length; _i++) {
            var b = bullets_1[_i];
            var indeces = [];
            s.x = Math.floor((b.x - b.radius) / width);
            s.y = Math.floor((b.y - b.radius) / height);
            if (s.x < 0) {
                s.x = 0;
            }
            if (s.y < 0) {
                s.y = 0;
            }
            if (s.x >= bucketX) {
                s.x = bucketX - 1;
            }
            if (s.y >= bucketY) {
                s.y = bucketY - 1;
            }
            e.x = Math.floor((b.x + b.radius) / width);
            e.y = Math.floor((b.y + b.radius) / height);
            if (e.x < 0) {
                e.x = 0;
            }
            if (e.y < 0) {
                e.y = 0;
            }
            if (e.x >= bucketX) {
                e.x = bucketX - 1;
            }
            if (e.y >= bucketY) {
                e.y = bucketY - 1;
            }
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
                if (index_2 < 0 || index_2 >= buckets.length) {
                    continue;
                }
                buckets[index_2] += 1;
            }
        }
    };
    AStar.prototype.calculateSurroundingBullets = function (x, y, bucketX, bucketY, riskDistance, buckets) {
        var result = 0;
        var visited = {};
        var nodes = [{ x: x, y: y }];
        while (nodes.length > 0) {
            var currentNode = nodes.splice(0, 1)[0];
            var index_3 = currentNode.y * bucketX + currentNode.x;
            var dist = Math.abs(currentNode.x - x) + Math.abs(currentNode.y - y);
            if (!visited.hasOwnProperty(index_3) && dist <= riskDistance) {
                visited[index_3] = true;
                result += buckets[index_3] / (dist + 1);
                for (var dx = -1; dx <= 1; dx++) {
                    for (var dy = -1; dy <= 1; dy++) {
                        if (dx == 0 && dy == 0) {
                            continue;
                        }
                        var pos = { x: currentNode.x + dx, y: currentNode.y + dy };
                        if (pos.x < 0) {
                            pos.x = 0;
                        }
                        if (pos.y < 0) {
                            pos.y = 0;
                        }
                        if (pos.x >= bucketX) {
                            pos.x = bucketX - 1;
                        }
                        if (pos.y >= bucketY) {
                            pos.y = bucketY - 1;
                        }
                        nodes.push(pos);
                    }
                }
            }
        }
        return result;
    };
    AStar.prototype.getSafestBucket = function (px, py, bucketX, bucketY, buckets) {
        var bestX = px;
        var bestY = py;
        for (var i = 0; i < buckets.length; i++) {
            var x = i % bucketX;
            var y = Math.floor(i / bucketX);
            if (this.calculateSurroundingBullets(x, y, bucketX, bucketY, 4, buckets) <
                this.calculateSurroundingBullets(bestX, bestY, bucketX, bucketY, 4, buckets)) {
                bestX = x;
                bestY = y;
            }
        }
        return { x: bestX, y: bestY };
    };
    AStar.prototype.getMCTSAction = function (world, value) {
        var startTime = new Date().getTime();
        var rootNode = new TreeNode(null, -1, world.clone(), this.parameters);
        var currentNumbers = 0;
        var bucketWidth = parameters.width / parameters.bucketsX;
        var bucketHeight = parameters.height / parameters.bucketsY;
        var buckets = this.initializeBuckets(parameters.bucketsX, parameters.bucketsY);
        this.calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, parameters.bucketsY, world.bullets, buckets);
        if (this.frames <= 0) {
            this.target = this.getSafestBucket(Math.floor(world.player.x / bucketWidth), Math.floor(world.player.y / bucketHeight), parameters.bucketsX, parameters.bucketsY, buckets);
            this.noise = 0;
            this.frames = 30;
        }
        else {
            this.frames -= 1;
        }
        while (true) {
            var currentNode = rootNode;
            currentNode = currentNode.treePolicy(0.25, 0.25, parameters);
            if (currentNode == null) {
                return -1;
            }
            var newWorld = currentNode.simulate(10);
            if (newWorld == null) {
                return -1;
            }
            currentNode.backpropagate(this.getEvaluation(currentNode.world, currentNode.safezone, this.target, this.noise));
            if (this.parameters.agentType == "time" && new Date().getTime() - startTime >= value) {
                break;
            }
            if (this.parameters.agentType == "node" && currentNumbers >= value) {
                break;
            }
            currentNumbers += 1;
        }
        if (rootNode.getUnexpandedNode() >= 0) {
            return 5;
        }
        return rootNode.pickBestChild(0, 0.25).action;
    };
    AStar.prototype.getAction = function (world, value) {
        var _this = this;
        var startTime = new Date().getTime();
        var openNodes = [new TreeNode(null, -1, world.clone(), this.parameters)];
        var bestNode = openNodes[0];
        var currentNumbers = 0;
        var bucketWidth = parameters.width / parameters.bucketsX;
        var bucketHeight = parameters.height / parameters.bucketsY;
        var buckets = this.initializeBuckets(parameters.bucketsX, parameters.bucketsY);
        this.calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, parameters.bucketsY, world.bullets, buckets);
        if (this.frames <= 0) {
            this.target = this.getSafestBucket(Math.floor(world.player.x / bucketWidth), Math.floor(world.player.y / bucketHeight), parameters.bucketsX, parameters.bucketsY, buckets);
            this.noise = 0;
            this.frames = 30;
        }
        else {
            this.frames -= 1;
        }
        while (openNodes.length > 0) {
            openNodes.sort(function (a, b) { return _this.getEvaluation(a.world, a.safezone, _this.target, _this.noise) - _this.getEvaluation(b.world, b.safezone, _this.target, _this.noise); });
            var currentNode = openNodes.pop();
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                for (var i = 0; i < currentNode.children.length; i++) {
                    var node = currentNode.addChild(i, 10, this.parameters);
                    if (node == null) {
                        return -1;
                    }
                    if (this.parameters.agentType == "time" && new Date().getTime() - startTime >= value) {
                        openNodes.length = 0;
                        break;
                    }
                    if (this.parameters.agentType == "node" && currentNumbers >= value) {
                        openNodes.length = 0;
                        break;
                    }
                    if (bestNode.numChildren > 0 ||
                        this.getEvaluation(node.world, node.safezone, this.target, this.noise) > this.getEvaluation(bestNode.world, bestNode.safezone, this.target, this.noise)) {
                        bestNode = node;
                    }
                    if (node.world.isWon()) {
                        openNodes.length = 0;
                        bestNode = node;
                        break;
                    }
                    if (node.world.isLose()) {
                        continue;
                    }
                    openNodes.push(node);
                }
            }
            currentNumbers += 1;
        }
        var action = bestNode.getSequence().splice(0, 1)[0];
        return action;
    };
    AStar.prototype.playMCTSGame = function (world, value) {
        var spawnerFrames = 0;
        var currentNode = new TreeNode(null, -1, world, this.parameters);
        this.status = GameStatus.LOSE;
        var startGame = new Date().getTime();
        while (!currentNode.world.isWon() && !currentNode.world.isLose()) {
            var actionNode = currentNode.world.clone();
            actionNode.hideUnknown = false;
            var action = this.getMCTSAction(actionNode, value);
            if (action == -1) {
                this.status = GameStatus.ALOTSPAWNERS;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            var repeatValue = Math.abs(this.repeatDist.ppf(Math.random()));
            if (repeatValue < 1) {
                repeatValue = 1;
            }
            var tempStartGame = new Date().getTime();
            for (var i = 0; i < repeatValue; i++) {
                var tempNode = currentNode.addChild(action, 1, parameters);
                if (tempNode != null) {
                    currentNode = tempNode;
                    if (tempNode.world.isWon() || tempNode.world.isLose()) {
                        break;
                    }
                }
                else {
                    this.status = GameStatus.ALOTSPAWNERS;
                    currentNode.world.spawners.length = 0;
                    return currentNode;
                }
            }
            if (new Date().getTime() - startGame > this.parameters.maxAgentTime) {
                this.status = GameStatus.TIMEOUT;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            currentNode.parent.world.spawners.length = 0;
        }
        if (currentNode.world.isWon()) {
            this.status = GameStatus.WIN;
        }
        currentNode.world.spawners.length = 0;
        return currentNode;
    };
    AStar.prototype.playGame = function (world, value) {
        var spawnerFrames = 0;
        var currentNode = new TreeNode(null, -1, world, this.parameters);
        this.status = GameStatus.LOSE;
        var startGame = new Date().getTime();
        while (!currentNode.world.isWon() && !currentNode.world.isLose()) {
            var actionNode = currentNode.world.clone();
            actionNode.hideUnknown = false;
            var action = this.getAction(actionNode, value);
            if (action == -1) {
                this.status = GameStatus.ALOTSPAWNERS;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            var repeatValue = Math.abs(this.repeatDist.ppf(Math.random()));
            if (repeatValue < 1) {
                repeatValue = 1;
            }
            var tempStartGame = new Date().getTime();
            for (var i = 0; i < repeatValue; i++) {
                var tempNode = currentNode.addChild(action, 1, parameters);
                if (tempNode != null) {
                    currentNode = tempNode;
                    if (tempNode.world.isWon() || tempNode.world.isLose()) {
                        break;
                    }
                }
                else {
                    this.status = GameStatus.ALOTSPAWNERS;
                    currentNode.world.spawners.length = 0;
                    return currentNode;
                }
            }
            if (new Date().getTime() - startGame > this.parameters.maxAgentTime) {
                this.status = GameStatus.TIMEOUT;
                currentNode.world.spawners.length = 0;
                return currentNode;
            }
            currentNode.parent.world.spawners.length = 0;
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
function smoothArray(sequence) {
    var output = [];
    for (var i = 1; i < sequence.length - 1; i++) {
        var result = sequence[i - 1] + sequence[i] + sequence[i + 1];
        if (result > 1) {
            output.push(1);
        }
        else {
            output.push(0);
        }
    }
    return output;
}
function calculateBiEntropy(actionSequence) {
    var entropy = 0;
    var der = [];
    if (actionSequence.length > 0) {
        entropy += calculateSequenceEntropy(actionSequence, 5);
    }
    if (actionSequence.length > 750) {
        der = getSequenceDerivative(actionSequence);
        entropy += calculateSequenceEntropy(der.slice(750), 2);
    }
    if (actionSequence.length > 1500) {
        der = getSequenceDerivative(der);
        entropy += calculateSequenceEntropy(der.slice(1500), 2);
    }
    if (actionSequence.length > 2250) {
        der = getSequenceDerivative(der);
        entropy += calculateSequenceEntropy(der.slice(2250), 2);
    }
    return entropy / 4.0;
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
function calculateRisk(x, y, bucketX, bucketY, riskDist, buckets) {
    var result = 0;
    var divisor = 0;
    var visited = {};
    var nodes = [{ x: x, y: y }];
    while (nodes.length > 0) {
        var currentNode = nodes.splice(0, 1)[0];
        var index_4 = currentNode.y * bucketX + currentNode.x;
        var dist = Math.abs(currentNode.x - x) + Math.abs(currentNode.y - y);
        if (!visited.hasOwnProperty(index_4) && dist <= riskDist) {
            visited[index_4] = true;
            result += Math.min(buckets[index_4], 4.0) / (dist + 1);
            for (var dx = -1; dx <= 1; dx++) {
                for (var dy = -1; dy <= 1; dy++) {
                    if (dx == 0 && dy == 0) {
                        continue;
                    }
                    var pos = { x: currentNode.x + dx, y: currentNode.y + dy };
                    if (pos.x < 0) {
                        pos.x = 0;
                    }
                    if (pos.y < 0) {
                        pos.y = 0;
                    }
                    if (pos.x >= bucketX) {
                        pos.x = bucketX - 1;
                    }
                    if (pos.y >= bucketY) {
                        pos.y = bucketY - 1;
                    }
                    nodes.push(pos);
                }
            }
            divisor += 1;
        }
    }
    return result / (4.0 * divisor);
}
function initializeBuckets(width, height) {
    var buckets = [];
    for (var i = 0; i < width * height; i++) {
        buckets.push(0);
    }
    return buckets;
}
function calculateBuckets(width, height, bucketX, bucketY, bullets, buckets) {
    var s = new Talakat.Point();
    var e = new Talakat.Point();
    for (var _i = 0, bullets_2 = bullets; _i < bullets_2.length; _i++) {
        var b = bullets_2[_i];
        var indeces = [];
        s.x = Math.floor((b.x - b.radius) / width);
        s.y = Math.floor((b.y - b.radius) / height);
        if (s.x < 0) {
            s.x = 0;
        }
        if (s.y < 0) {
            s.y = 0;
        }
        if (s.x >= bucketX) {
            s.x = bucketX - 1;
        }
        if (s.y >= bucketY) {
            s.y = bucketY - 1;
        }
        e.x = Math.floor((b.x + b.radius) / width);
        e.y = Math.floor((b.y + b.radius) / height);
        if (e.x < 0) {
            e.x = 0;
        }
        if (e.y < 0) {
            e.y = 0;
        }
        if (e.x >= bucketX) {
            e.x = bucketX - 1;
        }
        if (e.y >= bucketY) {
            e.y = bucketY - 1;
        }
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
            if (index_6 < 0 || index_6 >= buckets.length) {
                continue;
            }
            buckets[index_6] += 1;
        }
    }
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
    var bestNode = ai.playMCTSGame(startWorld.clone(), parameters.agentValue);
    var risk = 0;
    var distribution = 0;
    var frames = 0;
    var bulletFrames = 0;
    var calculationFrames = parameters.calculationFrames;
    var bucketWidth = parameters.width / parameters.bucketsX;
    var bucketHeight = parameters.height / parameters.bucketsY;
    var buckets = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
    var actionSequence = bestNode.getSequence(1);
    var currentNode = bestNode;
    while (currentNode.parent != null) {
        if (currentNode.world.bullets.length > parameters.bulletsFrame) {
            buckets = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
            calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, parameters.bucketsY, currentNode.world.bullets, buckets);
            bulletFrames += 1;
            risk += calculateRisk(Math.floor(currentNode.world.player.x / bucketWidth), Math.floor(currentNode.world.player.y / bucketHeight), parameters.bucketsX, parameters.bucketsY, 4, buckets);
            distribution += calculateDistribution(buckets);
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
            constraints: getFitness(bestNode.world.boss.getHealth()) *
                (bulletFrames / (Math.max(1, frames) * parameters.targetMaxBulletsFrame)),
            behavior: [
                calculateBiEntropy(actionSequence),
                risk / Math.max(1, frames),
                distribution / Math.max(1, frames),
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
var gaussian = require('./gaussian.js');
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
var noiseDist = gaussian(0, Math.pow(parameters.noiseStd, 2));
var repeatDist = gaussian(0, Math.pow(parameters.repeatingAction, 2));
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
