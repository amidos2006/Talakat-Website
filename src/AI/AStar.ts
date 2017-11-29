/// <reference path="TreeNode.ts"/>

class AStarPlanner implements Planner{
    parameters:any;
    status:GameStatus;

    constructor(parameters:any){
        this.parameters = parameters;
    }

    initialize(){
        this.status = GameStatus.NONE;
    }

    plan(world: Talakat.World, value: number):TreeNode {
        let startTime:number = new Date().getTime();
        let numNodes:number = 0;
        let spawnerFrames:number = 0;
        let openNodes: TreeNode[] = [new TreeNode(null, -1, world)];
        let bestNode:TreeNode = openNodes[0];
        this.status = GameStatus.LOSE;
        
        while(openNodes.length > 0){
            if (this.parameters.agentType == "time" && new Date().getTime() - startTime > value){
                this.status = GameStatus.TIMEOUT;
                return bestNode;
            }

            openNodes.sort((a:TreeNode, b:TreeNode) => a.getEvaluation() - b.getEvaluation());
            let currentNode:TreeNode = openNodes.pop();
            if(bestNode.getEvaluation() < currentNode.getEvaluation()){
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
            if(!currentNode.world.isWon() && !currentNode.world.isLose()){
                if (this.parameters.agentType == "node" && numNodes > value) {
                    this.status = GameStatus.NODEOUT;
                    continue;
                }
                for(let i:number=0; i<currentNode.children.length; i++){
                    let tempStartGame:number = new Date().getTime();
                    let node:TreeNode = currentNode.addChild(i, this.parameters.repeatingAction);
                    if (new Date().getTime() - tempStartGame > this.parameters.maxStepTime){
                        this.status = GameStatus.TOOSLOW;
                        return bestNode;
                    }
                    if(node.world.isWon()){
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

class AStar implements Agent{
    repeatingAction: number;
    type:string;

    constructor(type:string, repeatingAction:number){
        this.type = type;
        this.repeatingAction = repeatingAction;
    }

    initialize() {
        
    }

    getAction(world: Talakat.World, value:number):number{
        let startTime:number = new Date().getTime();
        let openNodes:TreeNode[] = [new TreeNode(null, -1, world.clone())];
        let bestNode:TreeNode = openNodes[0];
        let currentNumbers:number = 0;
        let solution:number[] = [];
        while(openNodes.length > 0 && solution.length == 0){
            if (this.type == "time" && new Date().getTime() - startTime >= value){
                break;
            }
            openNodes.sort((a:TreeNode, b:TreeNode) => a.getEvaluation() - b.getEvaluation());
            let currentNode:TreeNode = openNodes.pop();
            if(!currentNode.world.isWon() && !currentNode.world.isLose()){
                if(this.type == "node" && currentNumbers >= value){
                    continue;
                }
                for(let i:number=0; i<currentNode.children.length; i++){
                    let node:TreeNode = currentNode.addChild(i, this.repeatingAction);
                    if(node.world.isWon()){
                        solution = node.getSequence();
                        break;
                    }
                    if(bestNode.numChildren > 0 || node.getEvaluation() > bestNode.getEvaluation()){
                        bestNode = node;
                    }
                    openNodes.push(node);
                    currentNumbers += 1;
                }
            }
        }
        if(solution.length > 0){
            return solution.splice(0, 1)[0];
        }
        let action:number = bestNode.getSequence().splice(0, 1)[0];
        return action;
    }
}