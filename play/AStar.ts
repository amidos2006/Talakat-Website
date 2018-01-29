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

    private initializeBuckets(width: number, height: number): number[] {
        let buckets: number[] = [];
        for (let i: number = 0; i < width * height; i++) {
            buckets.push(0);
        }
        return buckets;
    }

    private calculateBuckets(width: number, height: number, bucketX: number, bullets: Talakat.Bullet[], buckets: number[]): void {
        let s = new Talakat.Point();
        let e = new Talakat.Point();
        for (let b of bullets) {
            let indeces: number[] = [];

            s.x = Math.floor((b.x - b.radius) / width);
            s.y = Math.floor((b.y - b.radius) / height);

            e.x = Math.floor((b.x + b.radius) / width);
            e.y = Math.floor((b.y + b.radius) / height);

            for (let x: number = s.x; x <= e.x; x++) {
                for (let y: number = s.y; y < e.y; y++) {
                    let index = y * bucketX + x;
                    if (indeces.indexOf(index) == -1) {
                        indeces.push(index);
                    }
                }
            }

            for (let index of indeces) {
                if (index < 0) {
                    index = 0;
                }
                if (index >= buckets.length) {
                    index = buckets.length - 1;
                }
                buckets[index] += 1;
            }
        }
    }

    private calculateSurroundingBullets(x: number, y: number, bucketX: number, riskDistance: number, buckets: number[]): number {
        let result: number = 0;
        let visited: any = {};
        let nodes: any[] = [{ x: x, y: y }];
        while (nodes.length > 0) {
            let currentNode: any = nodes.splice(0, 1)[0];
            let index: number = currentNode.y * bucketX + currentNode.x;
            if (index >= buckets.length) {
                index = buckets.length - 1;
            }
            if (index < 0) {
                index = 0;
            }
            let dist: number = Math.abs(currentNode.x - x) + Math.abs(currentNode.y - y);
            if (!visited.hasOwnProperty(index) && dist <= riskDistance) {
                visited[index] = true;
                result += buckets[index] / (dist + 1);
                for (let dx: number = -1; dx <= 1; dx++) {
                    for (let dy: number = -1; dy <= 1; dy++) {
                        if (dx == 0 && dy == 0) {
                            continue;
                        }
                        let index: number = (currentNode.y + dy) * bucketX + (currentNode.x + dx);
                        if (index >= buckets.length) {
                            index = buckets.length - 1;
                        }
                        if (index < 0) {
                            index = 0;
                        }
                    }
                }
            }
        }

        return result;
    }

    private getSafestBucket(px: number, py: number, bucketX: number, buckets: number[]): any {
        let bestX: number = px;
        let bestY: number = py;
        for (let i: number = 0; i < buckets.length; i++) {
            let x: number = i % bucketX;
            let y: number = Math.floor(i / bucketX);
            if (this.calculateSurroundingBullets(x, y, bucketX, 3, buckets) <
                this.calculateSurroundingBullets(bestX, bestY, bucketX, 3, buckets)) {
                bestX = x;
                bestY = y;
            }
        }
        return {x: bestX, y:bestY};
    }

    getAction(world: Talakat.World, value:number, parameters:any):number{
        let startTime:number = new Date().getTime();
        let tempWorld:any = world.clone();
        tempWorld.hideUnknown = true;
        let openNodes:TreeNode[] = [new TreeNode(null, -1, tempWorld, parameters)];
        let bestNode:TreeNode = openNodes[0];
        let currentNumbers:number = 0;
        let solution:number[] = [];
        let bucketWidth: number = parameters.width / parameters.bucketsX;
        let bucketHeight: number = parameters.height / parameters.bucketsY;
        let buckets: number[] = this.initializeBuckets(parameters.bucketsX, parameters.bucketsY);
        this.calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, world.bullets, buckets);
        let target: any = this.getSafestBucket(Math.floor(world.player.x / bucketWidth), 
            Math.floor(world.player.y / bucketHeight), parameters.bucketsX, buckets);
        while(openNodes.length > 0 && solution.length == 0){
            if (this.type == "time" && new Date().getTime() - startTime >= value){
                break;
            }
            openNodes.sort((a: TreeNode, b: TreeNode) => a.getEvaluation(target) - b.getEvaluation(target));
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
                    if (node.numChildren > 0 || node.getEvaluation(target) > bestNode.getEvaluation(target)){
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