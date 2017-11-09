class ActionNumber{
    static LEFT:number = 0;
    static RIGHT:number = 1;
    static UP:number = 2;
    static DOWN:number = 3;
    static NONE:number = 4;
    static LEFT_UP:number = 5;
    static RIGHT_UP:number = 6;
    static LEFT_DOWN:number = 7;
    static RIGHT_DOWN:number = 8;

    static getAction(action:number):Talakat.Point{
        if(action == ActionNumber.LEFT){
            return new Talakat.Point(-1, 0);
        }
        if(action == ActionNumber.RIGHT){
            return new Talakat.Point(1, 0);
        }
        if(action == ActionNumber.UP){
            return new Talakat.Point(0, -1);
        }
        if(action == ActionNumber.DOWN){
            return new Talakat.Point(0, 1);
        }
        if(action == ActionNumber.LEFT_DOWN){
            return new Talakat.Point(-1, 1);
        }
        if(action == ActionNumber.RIGHT_DOWN){
            return new Talakat.Point(1, 1);
        }
        if(action == ActionNumber.LEFT_UP){
            return new Talakat.Point(-1, -1);
        }
        if(action == ActionNumber.RIGHT_UP){
            return new Talakat.Point(1, -1);
        }
        return new Talakat.Point();
    }
}

class TreeNode{
    parent:TreeNode;
    children:TreeNode[];
    action:number;
    world:Talakat.World;
    numChildren:number;

    constructor(parent:TreeNode, action:number, world:Talakat.World){
        this.parent = parent;
        this.children = [null, null, null, null, null];
        this.action = action;
        this.world = world;
        this.numChildren = 0;
    }

    addChild(action:number, macroAction:number = 1):TreeNode{
        let newWorld:Talakat.World = this.world.clone();
        for(let i:number=0; i<macroAction; i++){
            newWorld.update(ActionNumber.getAction(action));
        }
        this.children[action] = new TreeNode(this, action, newWorld);
        this.numChildren += 1;
        return this.children[action];
    }

    getEvaluation(noise:number=0):number{
        let isLose:number = 0;
        if(this.world.isLose()){
            isLose = 1;
        }
        return 1 - this.world.boss.getHealth() - isLose;
    }

    getSequence(macroAction:number=1):number[]{
        let result:number[] = [];
        let currentNode:TreeNode = this;
        while(currentNode.parent != null){
            for(let i:number=0; i<macroAction; i++){
                result.push(currentNode.action);
            }
            currentNode = currentNode.parent;
        }
        return result.reverse();
    }
}