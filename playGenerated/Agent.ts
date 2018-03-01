enum GameStatus {
    NONE,
    LOSE,
    WIN,
    NODEOUT,
    TIMEOUT,
    TOOSLOW,
    SPAWNERSTOBULLETS,
    ALOTSPAWNERS
}

interface Agent{
    initialize();
    getAction(world:Talakat.World, value:number, parameters:any):number;
}