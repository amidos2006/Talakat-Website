enum GameStatus {
    WIN,
    LOSE,
    TOOSLOW,
    TIMEOUT,
    NONE,
    SPAWNERSTOBULLETS,
    ALOTSPAWNERS
}

interface Agent{
    initialize();
    getAction(world:Talakat.World, value:number):number;
}

interface Planner{
    status: GameStatus;
    initialize();
    plan(world: Talakat.World, value: number):TreeNode;
}