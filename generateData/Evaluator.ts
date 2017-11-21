/// <reference path="Chromosome.ts"/>

let tracery = require("./tracery.js");
let Talakat = require("./talakat.js");

enum GameStatus {
    WIN,
    LOSE,
    TOOSLOW,
    TIMEOUT,
    NONE,
    SPAWNERSTOBULLETS,
    ALOTSPAWNERS
}

class ActionNumber {
    static LEFT: number = 0;
    static RIGHT: number = 1;
    static UP: number = 2;
    static DOWN: number = 3;
    static NONE: number = 4;
    static LEFT_UP: number = 5;
    static RIGHT_UP: number = 6;
    static LEFT_DOWN: number = 7;
    static RIGHT_DOWN: number = 8;

    static getAction(action: number) {
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
    }
}

class TreeNode {
    parent: TreeNode;
    children: TreeNode[];
    action: number;
    world: any;
    numChildren: number;

    constructor(parent: TreeNode, action: number, world: any) {
        this.parent = parent;
        this.children = [null, null, null, null, null];
        this.action = action;
        this.world = world;
        this.numChildren = 0;
    }

    addChild(action: number, macroAction: number = 1): TreeNode {
        let newWorld = this.world.clone();
        for (let i: number = 0; i < macroAction; i++) {
            newWorld.update(ActionNumber.getAction(action));
        }
        this.children[action] = new TreeNode(this, action, newWorld);
        this.numChildren += 1;
        return this.children[action];
    }

    getEvaluation(noise: number = 0): number {
        let isLose: number = 0;
        if (this.world.isLose()) {
            isLose = 1;
        }
        return 1 - this.world.boss.getHealth() - isLose;
    }

    getSequence(macroAction: number = 1): number[] {
        let result: number[] = [];
        let currentNode: TreeNode = this;
        while (currentNode.parent != null) {
            for (let i: number = 0; i < macroAction; i++) {
                result.push(currentNode.action);
            }
            currentNode = currentNode.parent;
        }
        return result.reverse();
    }
}

class AStarPlanner {
    parameters: any;
    status: GameStatus;

    constructor(parameters: any) {
        this.parameters = parameters;
    }

    initialize() {
        this.status = GameStatus.NONE;
    }

    plan(world:any, value: number): TreeNode {
        let startTime: number = new Date().getTime();
        let numNodes: number = 0;
        let spawnerFrames: number = 0;
        let openNodes: TreeNode[] = [new TreeNode(null, -1, world)];
        let bestNode: TreeNode = openNodes[0];
        this.status = GameStatus.LOSE;

        while (openNodes.length > 0) {
            if (this.parameters.agentType == "time" && new Date().getTime() - startTime > value) {
                this.status = GameStatus.TIMEOUT;
                return bestNode;
            }

            openNodes.sort((a: TreeNode, b: TreeNode) => a.getEvaluation() - b.getEvaluation());
            let currentNode: TreeNode = openNodes.pop();
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
                for (let i: number = 0; i < currentNode.children.length; i++) {
                    let tempStartGame: number = new Date().getTime();
                    let node: TreeNode = currentNode.addChild(i, this.parameters.repeatingAction);
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
    }
}

global["AStarPlanner"] = AStarPlanner;

function generateTalakatScript(spawnerSequence: number[], scriptSequence: number[], spawnerGrammar:any, scriptGrammar:any) {
    let tempSequence: number[] = spawnerSequence.concat([]);
    let input: string = "{\"spawners\":{";
    for (let name of scriptGrammar.name) {
        spawnerGrammar.name.splice(spawnerGrammar.name.indexOf(name), 1);
        let spawnerTracery = tracery.createGrammar(spawnerGrammar);
        input += "\"" + name + "\":" + spawnerTracery.flattenSequence("#origin#", tempSequence) + ",";
        spawnerGrammar.name.push(name);
    }
    tempSequence = scriptSequence.concat([]);
    let scriptTracery = tracery.createGrammar(scriptGrammar);
    input = input.substring(0, input.length - 1) + "}, \"boss\":{\"script\":[";
    for (let p of scriptGrammar.percent) {
        input += "{\"health\":" + "\"" + p + "\",\"events\":[" + scriptTracery.flattenSequence("#events#", tempSequence) + "]},";
    }
    input = input.substring(0, input.length - 1) + "]}}";
    return JSON.parse(input);
}

function saveGameFrames(id: number, lastNode: TreeNode, parameters:any): void {
    if (parameters.saveFrames.length > 0) {
        let shell = require('shelljs');
        let saveFramesFS = require("fs");
        
        if (!saveFramesFS.existsSync(parameters.saveFrames)){
            shell.mkdir('-p', parameters.saveFrames);
        }
        
        if (!saveFramesFS.existsSync(parameters.saveFrames + id + ".txt")) {
            saveFramesFS.writeFileSync(parameters.saveFrames + id + ".txt", "Bullets - Player - Action\n");
        }
        let currenAction = lastNode.action;
        let currentNode = lastNode.parent;
        while (currentNode.parent != null) {
            let bullets = lastNode.world.bullets;
            let line: string = "";
            for (let b of bullets) {
                line += Math.floor(b.x) + " " + Math.floor(b.y) + " " + Math.floor(b.radius) + ",";
            }
            if (line.length > 0) {
                line = line.substring(0, line.length - 1);
            }
            let player:string = currentNode.world.player.x + " " + currentNode.world.player.y + " " + currentNode.world.player.radius;
            let action: string = ActionNumber.getAction(currenAction).x + " " + ActionNumber.getAction(currenAction).y;
            saveFramesFS.appendFileSync(parameters.saveFrames + id + ".txt", line + " - " + action + "\n");
            currenAction = currentNode.action;
            currentNode = currentNode.parent;
        }
    }
}

class Evaluator {
    spawnerGrammar:any;
    scriptGrammar:any;

    constructor(scriptGrammar:any, spawnerGrammar:any) {
        this.scriptGrammar = scriptGrammar;
        this.spawnerGrammar = spawnerGrammar;
    }

    evaluate(chromosomes: Chromosome[], parameters: any):void {
        for(let c of chromosomes){
            let startWorld = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
            startWorld.initialize(generateTalakatScript(c.spawnerSequence, c.scriptSequence, this.spawnerGrammar, this.scriptGrammar));
            let ai = new global[parameters.agent](parameters);
            ai.initialize();
            let bestNode: TreeNode = ai.plan(startWorld.clone(), parameters.maxAgentTime);
            c.fitness = 1 - bestNode.world.boss.getHealth()
            saveGameFrames(c.id, bestNode, parameters);
        }
    }
}