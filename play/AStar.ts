/// <reference path="TreeNode.ts"/>

class AStar implements Agent{
    repeatingAction: number;
    type:string;

    constructor(type:string, repeatingAction:number){
        this.type = type;
        this.repeatingAction = repeatingAction;
    }

    initialize() {
        
    }

    getAction(world: Talakat.World, value:number, parameters:any):number{
        let startTime:number = new Date().getTime();
        let openNodes:TreeNode[] = [new TreeNode(null, -1, world.clone(), parameters)];
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
                    let node:TreeNode = currentNode.addChild(i, 10, parameters);
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
        // console.log(currentNumbers);
        return action;
    }
}