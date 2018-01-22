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
    safezone:number;
    closest:number;
    futurezone:number;
    numChildren:number;

    constructor(parent:TreeNode, action:number, world:Talakat.World, parameters:any){
        this.parent = parent;
        this.children = [null, null, null, null, null];
        this.action = action;
        this.world = world;
        let tempWorld: any = world.clone();
        this.safezone = 0;
        for (let i: number = 0; i < 20; i++) {
            tempWorld.update(ActionNumber.getAction(ActionNumber.NONE));
            if (tempWorld.isLose() || tempWorld.spawners.length > parameters.maxNumSpawners) {
                break;
            }
            if(tempWorld.isWon()){
                this.safezone = 12.0;
                break;
            }
            this.safezone += 1.0;
        }
        this.safezone = this.safezone / 12.0;
        let bucketWidth: number = parameters.width / parameters.bucketsX;
        let bucketHeight: number = parameters.height / parameters.bucketsY;
        let buckets: number[] = this.initializeBuckets(parameters.bucketsX, parameters.bucketsY);
        this.calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, world.bullets, buckets);
        this.futurezone = (parameters.bucketsX + parameters.bucketsY) / (this.distanceSafeBucket(Math.floor(world.player.x / bucketWidth),
            Math.floor(world.player.y / bucketHeight), parameters.bucketsX, buckets) + 1);
        this.closest = this.calculateSurroundingBullets(Math.floor(world.player.x / bucketWidth),
            Math.floor(world.player.y / bucketHeight), parameters.bucketsX, buckets);
        this.numChildren = 0;
    }

    addChild(action:number, macroAction:number = 1, parameters:any):TreeNode{
        let newWorld:Talakat.World = this.world.clone();
        for(let i:number=0; i<macroAction; i++){
            newWorld.update(ActionNumber.getAction(action));
        }
        this.children[action] = new TreeNode(this, action, newWorld, parameters);
        this.numChildren += 1;
        return this.children[action];
    }

    getEvaluation(noise:number=0):number{
        let isLose:number = 0;
        if(this.world.isLose()){
            isLose = 1;
        }
        return 0.65 * (1 - this.world.boss.getHealth()) - isLose + 0.2 * this.safezone + 0.1 * this.futurezone + 0.05 * noise;
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

    private calculateSurroundingBullets(x:number, y:number, bucketX:number, buckets:number[]):number{
        let result:number = 0;
        let visited:any = {};
        let nodes:any[] = [{x:x, y:y}];
        while(nodes.length > 0){
            let currentNode:any = nodes.splice(0, 1)[0];
            let index:number = currentNode.y * bucketX + currentNode.x;
            if (index >= buckets.length) {
                index = buckets.length - 1;
            }
            if (index < 0) {
                index = 0;
            }
            let dist:number = Math.abs(currentNode.x - x) + Math.abs(currentNode.y - y);
            if (!visited.hasOwnProperty(index) && dist < 2){
                visited[index] = true;
                result += buckets[index];
                for (let dx: number = -1; dx <= 1; dx++) {
                    for (let dy: number = -1; dy <= 1; dy++) {
                        if(dx == 0 && dy == 0){
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

    private distanceSafeBucket(px: number, py: number, bucketX:number, buckets:number[]):number{
        let bestX:number=px;
        let bestY:number=py;
        for(let i:number=0; i<buckets.length; i++){
            let x:number = i % bucketX;
            let y:number = Math.floor(i / bucketX);
            if(this.calculateSurroundingBullets(x, y, bucketX, buckets) < 
                this.calculateSurroundingBullets(bestX, bestY, bucketX, buckets)){
                bestX = x;
                bestY = y;
            }
        }
        return Math.abs(px - bestX) + Math.abs(py-bestY);
    }

    private getClosetBullet(px:number, py:number, bucketX:number, bucketsY:number, buckets:number[]):number{
        let closest:number = bucketX + bucketsY;
        for (let i: number = 0; i < buckets.length; i++) {
            let x: number = i % bucketX;
            let y: number = Math.floor(i / bucketX);
            if (buckets[i] > 0 && Math.abs(px - x) + Math.abs(py - y) < closest){
                closest = Math.abs(px - x) + Math.abs(py - y);
            }
        }
        return closest;
    }
}