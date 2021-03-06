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
var newWorld = null;
var currentWorld = null;
var action = null;
var agent = null;
var interval = null;
var numberOfCalls;
var totalUpdateTime;
var totalDrawTime;
var spawnerGrammar;
var scriptGrammar;
var parameters;
var generatedLevels;
var playerImg;
var bossImg;
function debugLog(text) {
    document.getElementById("debugText").textContent += text;
}
function preload() {
    debugLog("Loading Assets.\n");
    spawnerGrammar = loadJSON("assets/spawnerGrammar.json", spawnersReady);
    parameters = loadJSON("assets/parameters.json");
    playerImg = loadImage("assets/player.png");
    bossImg = loadImage("assets/boss.png");
    generatedLevels = {};
    generatedLevels["HighHigh"] = loadStrings("results/HighHigh.txt", function () {
        generatedLevels["HighMed"] = loadStrings("results/HighMed.txt", function () {
            generatedLevels["HighLow"] = loadStrings("results/HighLow.txt", function () {
                generatedLevels["MedHigh"] = loadStrings("results/MedHigh.txt", function () {
                    generatedLevels["MedMed"] = loadStrings("results/MedMed.txt", function () {
                        generatedLevels["MedLow"] = loadStrings("results/MedLow.txt", function () {
                            generatedLevels["LowHigh"] = loadStrings("results/LowHigh.txt", function () {
                                generatedLevels["LowMed"] = loadStrings("results/LowMed.txt", function () {
                                    generatedLevels["LowLow"] = loadStrings("results/LowLow.txt", function () {
                                        loadGame();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}
function spawnersReady() {
    scriptGrammar = loadJSON("assets/scriptGrammar.json", addSpawnerNames);
}
function addSpawnerNames() {
    for (var _i = 0, _a = scriptGrammar.name; _i < _a.length; _i++) {
        var n = _a[_i];
        spawnerGrammar.name.push(n);
    }
    debugLog("Asset Loaded.\n");
}
function setup() {
    var canvas = createCanvas(400, 640);
    canvas.parent("game");
    action = new Talakat.Point();
    background(0, 0, 0);
    stopGame();
    debugLog("Seting up Editor.\n");
}
function startGame(input) {
    stopGame();
    debugLog("Game Started.\n");
    newWorld = new Talakat.World(width, height, parameters.maxNumBullets);
    var script = JSON.parse(input);
    newWorld.initialize(script);
}
function stopGame() {
    numberOfCalls = 0;
    totalUpdateTime = 0;
    totalDrawTime = 0;
    if (interval != null) {
        clearInterval(interval);
        debugLog("Interrupted.\n");
    }
    if (agent != null) {
        agent = null;
        debugLog("Interrupted.\n");
    }
    if (currentWorld != null) {
        currentWorld = null;
        debugLog("Interrupted.\n");
    }
}
function playAIGame(input) {
    stopGame();
    debugLog("Game Started with AI.\n");
    newWorld = new Talakat.World(width, height);
    var script = JSON.parse(input);
    newWorld.initialize(script);
    agent = new AStar("time", parameters.repeatingAction);
    agent.initialize();
}
function loadGame() {
    if (document.location.search.length == 0) {
        return;
    }
    var options = document.location.search.split("&");
    var dexValue = options[0].split("=")[1];
    var stratValue = options[1].split("=")[1];
    var levelValue = options[2].split("=")[1];
    var dexterityOption = document.getElementById("dexterity");
    for (var i = 0; i < dexterityOption.options.length; i++) {
        if (dexValue.trim().toLowerCase() == dexterityOption.options[i].value.trim().toLowerCase()) {
            dexterityOption.selectedIndex = i;
            break;
        }
    }
    var strategyOption = document.getElementById("strategy");
    for (var i = 0; i < strategyOption.options.length; i++) {
        if (stratValue.trim().toLowerCase() == strategyOption.options[i].value.trim().toLowerCase()) {
            strategyOption.selectedIndex = i;
            break;
        }
    }
    updateLevels();
    var levelsOption = document.getElementById("levels");
    for (var i = 0; i < levelsOption.options.length; i++) {
        if (levelValue.trim().toLowerCase() == levelsOption.options[i].value.trim().toLowerCase()) {
            levelsOption.selectedIndex = i;
            break;
        }
    }
    selectLevel();
}
function updateLevels() {
    var levelSelection = document.getElementById("levels");
    while (levelSelection.options.length > 0) {
        levelSelection.remove(0);
    }
    var empty = document.createElement("option");
    empty.text = "--";
    levelSelection.add(empty);
    var strategyOption = document.getElementById("strategy");
    var strategyName = strategyOption.options[strategyOption.selectedIndex].value;
    var dexterityOption = document.getElementById("dexterity");
    var dexterityName = dexterityOption.options[dexterityOption.selectedIndex].value;
    if (generatedLevels[dexterityName + strategyName]) {
        for (var _i = 0, _a = generatedLevels[dexterityName + strategyName]; _i < _a.length; _i++) {
            var l = _a[_i];
            var temp = document.createElement("option");
            temp.text = l;
            levelSelection.add(temp);
        }
    }
}
function selectLevel() {
    var strategyOption = document.getElementById("strategy");
    var strategyName = strategyOption.options[strategyOption.selectedIndex].value;
    var dexterityOption = document.getElementById("dexterity");
    var dexterityName = dexterityOption.options[dexterityOption.selectedIndex].value;
    var levelsOption = document.getElementById("levels");
    var levelName = levelsOption.options[levelsOption.selectedIndex].value;
    if (levelName != "--") {
        var file_1 = loadJSON("results/" + dexterityName + strategyName + "/" + levelName, function () {
            document.getElementById('inputText').textContent = JSON.stringify(file_1, null, 4);
        });
    }
}
function generateRandomGame() {
    debugLog("Generating random level using Tracery.\n");
    var input = "{\"spawners\":{";
    for (var _i = 0, _a = scriptGrammar.name; _i < _a.length; _i++) {
        var name_1 = _a[_i];
        spawnerGrammar.name.splice(spawnerGrammar.name.indexOf(name_1), 1);
        var spawnerTracery = tracery.createGrammar(spawnerGrammar);
        input += "\"" + name_1 + "\":" + spawnerTracery.flatten("#origin#") + ",";
        spawnerGrammar.name.push(name_1);
    }
    var scriptTracery = tracery.createGrammar(scriptGrammar);
    input = input.substring(0, input.length - 1) + "}, \"boss\":{\"script\":[";
    for (var _b = 0, _c = scriptGrammar.percent; _b < _c.length; _b++) {
        var p = _c[_b];
        input += "{\"health\":" + "\"" + p + "\",\"events\":[" + scriptTracery.flatten("#events#") + "]},";
    }
    input = input.substring(0, input.length - 1) + "]}}";
    document.getElementById('inputText').textContent = JSON.stringify(JSON.parse(input), null, 4);
}
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
        if (agent != null) {
            action = ActionNumber.getAction(agent.getAction(currentWorld, 40, parameters));
            for (var i = 0; i < parameters.repeatingAction - 1; i++) {
                currentWorld.update(action);
            }
        }
        currentWorld.update(action);
        totalUpdateTime += (new Date().getTime() - startTime);
        startTime = new Date().getTime();
        background(0, 0, 0);
        worldDraw(currentWorld);
        totalDrawTime += (new Date().getTime() - startTime);
        numberOfCalls += 1;
        document.getElementById("updateTime").innerText = (totalUpdateTime / numberOfCalls).toFixed(5);
        document.getElementById("drawTime").innerText = (totalDrawTime / numberOfCalls).toFixed(5);
        if (currentWorld.isLose()) {
            debugLog("########################\n");
            if (agent == null) {
                debugLog("You Lose.\n");
            }
            else {
                agent = null;
                debugLog("Agent Loses.\n");
            }
            debugLog("########################\n");
            numberOfCalls = 0;
            totalUpdateTime = 0;
            totalDrawTime = 0;
            if (interval != null) {
                clearInterval(interval);
            }
            if (currentWorld != null) {
                currentWorld = null;
            }
        }
        else if (currentWorld.isWon()) {
            debugLog("########################\n");
            if (agent == null) {
                debugLog("You Win.\n");
            }
            else {
                agent = null;
                debugLog("Agent Wins.\n");
            }
            debugLog("########################\n");
            numberOfCalls = 0;
            totalUpdateTime = 0;
            totalDrawTime = 0;
            if (interval != null) {
                clearInterval(interval);
            }
            if (currentWorld != null) {
                currentWorld = null;
            }
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
    image(bossImg, world.boss.x - bossImg.width / 2, world.boss.y - bossImg.height / 2);
    image(playerImg, world.player.x - playerImg.width / 2, world.player.y - playerImg.height / 2);
    fill(color(255, 255, 255));
    ellipse(world.player.x, world.player.y, 2 * world.player.radius, 2 * world.player.radius);
}
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
    function TreeNode(parent, action, world, parameters) {
        this.parent = parent;
        this.children = [null, null, null, null, null];
        this.action = action;
        this.world = world;
        var tempWorld = world.clone();
        this.safezone = 0;
        for (var i = 0; i < 10; i++) {
            tempWorld.update(ActionNumber.getAction(ActionNumber.NONE));
            if (tempWorld.isLose() || tempWorld.spawners.length > parameters.maxNumSpawners) {
                break;
            }
            if (tempWorld.isWon()) {
                this.safezone = 10.0;
                break;
            }
            this.safezone += 1.0;
        }
        this.safezone = this.safezone / 10.0;
        this.numChildren = 0;
    }
    TreeNode.prototype.addChild = function (action, macroAction, parameters) {
        if (macroAction === void 0) { macroAction = 1; }
        var newWorld = this.world.clone();
        for (var i = 0; i < macroAction; i++) {
            newWorld.update(ActionNumber.getAction(action));
        }
        this.children[action] = new TreeNode(this, action, newWorld, parameters);
        this.numChildren += 1;
        return this.children[action];
    };
    TreeNode.prototype.getEvaluation = function (target, noise) {
        if (noise === void 0) { noise = 0; }
        var isLose = 0;
        if (this.world.isLose()) {
            isLose = 1;
        }
        var bucketWidth = parameters.width / parameters.bucketsX;
        var bucketHeight = parameters.height / parameters.bucketsY;
        var p = {
            x: Math.floor(this.world.player.x / bucketWidth),
            y: Math.floor(this.world.player.y / bucketHeight)
        };
        return 0.5 * (1 - this.world.boss.getHealth()) - isLose + 0.5 * this.safezone +
            -0.5 * (Math.abs(p.x - target.x) + Math.abs(p.y - target.y));
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
var AStar = (function () {
    function AStar(type, repeatingAction) {
        this.type = type;
        this.repeatingAction = repeatingAction;
    }
    AStar.prototype.initialize = function () {
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
                    var index = y * bucketX + x;
                    if (indeces.indexOf(index) == -1) {
                        indeces.push(index);
                    }
                }
            }
            for (var _a = 0, indeces_1 = indeces; _a < indeces_1.length; _a++) {
                var index = indeces_1[_a];
                if (index < 0 || index >= buckets.length) {
                    continue;
                }
                buckets[index] += 1;
            }
        }
    };
    AStar.prototype.calculateSurroundingBullets = function (x, y, bucketX, bucketY, riskDistance, buckets) {
        var result = 0;
        var visited = {};
        var nodes = [{ x: x, y: y }];
        while (nodes.length > 0) {
            var currentNode = nodes.splice(0, 1)[0];
            var index = currentNode.y * bucketX + currentNode.x;
            var dist = Math.abs(currentNode.x - x) + Math.abs(currentNode.y - y);
            if (!visited.hasOwnProperty(index) && dist <= riskDistance) {
                visited[index] = true;
                result += buckets[index] / (dist + 1);
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
    AStar.prototype.getAction = function (world, value, parameters) {
        var startTime = new Date().getTime();
        var tempWorld = world.clone();
        tempWorld.hideUnknown = true;
        var openNodes = [new TreeNode(null, -1, tempWorld, parameters)];
        var bestNode = openNodes[0];
        var currentNumbers = 0;
        var solution = [];
        var bucketWidth = parameters.width / parameters.bucketsX;
        var bucketHeight = parameters.height / parameters.bucketsY;
        var buckets = this.initializeBuckets(parameters.bucketsX, parameters.bucketsY);
        this.calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, parameters.bucketsY, world.bullets, buckets);
        var target = this.getSafestBucket(Math.floor(world.player.x / bucketWidth), Math.floor(world.player.y / bucketHeight), parameters.bucketsX, parameters.bucketsY, buckets);
        console.log(target);
        while (openNodes.length > 0 && solution.length == 0) {
            if (this.type == "time" && new Date().getTime() - startTime >= value) {
                break;
            }
            openNodes.sort(function (a, b) { return a.getEvaluation(target) - b.getEvaluation(target); });
            var currentNode = openNodes.pop();
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                if (this.type == "node" && currentNumbers >= value) {
                    continue;
                }
                for (var i = 0; i < currentNode.children.length; i++) {
                    var node = currentNode.addChild(i, 10, parameters);
                    if (node.world.isWon()) {
                        solution = node.getSequence();
                        break;
                    }
                    if (node.numChildren > 0 || node.getEvaluation(target) > bestNode.getEvaluation(target)) {
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
        // console.log(currentNumbers);
        return action;
    };
    return AStar;
}());
