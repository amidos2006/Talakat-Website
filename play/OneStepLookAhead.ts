/// <reference path="TreeNode.ts"/>

class OneStepLookAhead implements Agent {
    repeatingAction:number;
    type:string;

    constructor(type:string, repeatingAction:number) {
        this.type = type;
        this.repeatingAction = repeatingAction;
    }

    initialize() {

    }

    getAction(world: Talakat.World, value: number, parameters:any): number {
        let rootNode: TreeNode = new TreeNode(null, -1, world.clone(), parameters);
        let bestNode: TreeNode = rootNode;
        for (let i: number = 0; i < rootNode.children.length; i++) {
            let node: TreeNode = rootNode.addChild(i, this.repeatingAction, parameters);
            if (bestNode.numChildren > 0 || node.getEvaluation() > bestNode.getEvaluation()) {
                bestNode = node;
            }
        }
        return bestNode.getSequence().splice(0, 1)[0];
    }
}