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
        var newWorld = this.world.clone(this.world.hideUnknown);
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
        return 1 - this.world.boss.getHealth() - isLose + random(-noise, noise);
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
    function AStarPlanner(macroAction, noise) {
        if (macroAction === void 0) { macroAction = 1; }
        if (noise === void 0) { noise = 0; }
        this.macroAction = macroAction;
        this.noise = noise;
    }
    AStarPlanner.prototype.initalize = function (world) {
        this.root = new TreeNode(null, -1, world);
        this.openNodes = [this.root];
        this.solution = [];
    };
    AStarPlanner.prototype.isFinished = function () {
        return this.solution.length > 0;
    };
    AStarPlanner.prototype.plan = function (time) {
        var _this = this;
        var startTime = new Date().getTime();
        while (new Date().getTime() - startTime < time &&
            this.openNodes.length > 0 && this.solution.length == 0) {
            this.openNodes.sort(function (a, b) { return a.getEvaluation(_this.noise) - b.getEvaluation(_this.noise); });
            var currentNode = this.openNodes.pop();
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                for (var i = 0; i < currentNode.children.length; i++) {
                    var node = currentNode.addChild(i, this.macroAction);
                    if (node.world.isWon()) {
                        this.solution = node.getSequence(this.macroAction);
                        break;
                    }
                    this.openNodes.push(node);
                }
            }
        }
    };
    AStarPlanner.prototype.getPlan = function () {
        return this.solution;
    };
    return AStarPlanner;
}());
var AStar = (function () {
    function AStar() {
        this.solution = [];
    }
    AStar.prototype.initialize = function () {
    };
    AStar.prototype.getAction = function (world, time) {
        var startTime = new Date().getTime();
        var openNodes = [new TreeNode(null, -1, world.clone(false))];
        var bestNode = openNodes[0];
        while (new Date().getTime() - startTime < time && openNodes.length > 0 && this.solution.length == 0) {
            openNodes.sort(function (a, b) { return a.getEvaluation() - b.getEvaluation(); });
            var currentNode = openNodes.pop();
            if (!currentNode.world.isWon() && !currentNode.world.isLose()) {
                for (var i = 0; i < currentNode.children.length; i++) {
                    var node = currentNode.addChild(i, 4);
                    if (node.world.isWon()) {
                        this.solution = node.getSequence();
                        break;
                    }
                    if (bestNode.numChildren > 0 || node.getEvaluation() > bestNode.getEvaluation()) {
                        bestNode = node;
                    }
                    openNodes.push(node);
                }
            }
        }
        if (this.solution.length > 0) {
            return this.solution.splice(0, 1)[0];
        }
        var action = bestNode.getSequence().splice(0, 1)[0];
        return action;
    };
    return AStar;
}());
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
var planner = null;
var plan = null;
var interval = null;
var numberOfCalls;
var totalUpdateTime;
var totalDrawTime;
var spawnerGrammar;
var scriptGrammar;
function preload() {
    spawnerGrammar = loadJSON("assets/spawnerGrammar.json");
    scriptGrammar = loadJSON("assets/scriptGrammar.json");
}
function debugLog(text) {
    document.getElementById("debugText").textContent += text;
}
function setup() {
    var canvas = createCanvas(400, 640);
    canvas.parent("game");
    action = new Talakat.Point();
    background(0, 0, 0);
    stopGame();
}
function startGame(input) {
    stopGame();
    newWorld = new Talakat.World(width, height);
    var script = JSON.parse(input);
    newWorld.initialize(script);
}
function stopGame() {
    planner = null;
    plan = null;
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
function playPlanedGame(input) {
    stopGame();
    var tempWorld = new Talakat.World(width, height);
    var script = JSON.parse(input);
    tempWorld.initialize(script);
    planner = new AStarPlanner(4, 0);
    planner.initalize(tempWorld);
    interval = setInterval(updatePlan, 40);
    debugLog("Planning....\n");
}
function playAIGame(input) {
    stopGame();
    newWorld = new Talakat.World(width, height);
    var script = JSON.parse(input);
    newWorld.initialize(script);
    agent = new AStar();
    agent.initialize();
}
function updatePlan() {
    if (planner.isFinished()) {
        debugLog("Done.\n");
        var temp = planner.getPlan();
        clearInterval(interval);
        interval = null;
        startGame(document.getElementById("inputText").textContent);
        plan = temp;
        return;
    }
    planner.plan(100);
}
function updateGenerate() {
}
function generateRandomGame() {
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
    document.getElementById('inputText').textContent = input;
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
            action = ActionNumber.getAction(agent.getAction(currentWorld, 20));
            currentWorld.update(action);
            currentWorld.update(action);
            currentWorld.update(action);
        }
        if (plan != null) {
            action = ActionNumber.getAction(plan.splice(0, 1)[0]);
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
}
