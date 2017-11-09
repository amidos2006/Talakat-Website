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
        this.root = null;
        this.solution = [];
    }
    AStar.prototype.initialize = function (world) {
        this.root = new TreeNode(null, -1, world);
    };
    AStar.prototype.getAction = function (time) {
        var startTime = new Date().getTime();
        var openNodes = [this.root];
        var bestNode = this.root;
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
        this.root = new TreeNode(null, -1, this.root.children[action].world);
        return action;
    };
    return AStar;
}());
