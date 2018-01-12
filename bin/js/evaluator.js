importScripts("talakat.js");
this.onmessage = function (event) {
    var chromosome = event.data;
    evaluate(chromosome.id, chromosome.parameters, chromosome.input);
};
function checkForLoop(input, name, depth, maxDepth) {
    if (depth >= maxDepth) {
        return false;
    }
    var loop = [];
    for (var _i = 0, _a = input.spawners[name].pattern; _i < _a.length; _i++) {
        var n = _a[_i];
        if (n != "bullet" && n != "wait") {
            loop.push(n);
        }
    }
    for (var _b = 0, loop_1 = loop; _b < loop_1.length; _b++) {
        var n = loop_1[_b];
        return checkForLoop(input, n, depth + 1, maxDepth);
    }
    return true;
}
function checkForBullets(input, name, depth, maxDepth) {
    if (depth >= maxDepth) {
        return false;
    }
    var loop = [];
    for (var _i = 0, _a = input.spawners[name].pattern; _i < _a.length; _i++) {
        var n = _a[_i];
        if (n == "bullet") {
            return true;
        }
        else if (n != "wait") {
            loop.push(n);
        }
    }
    for (var _b = 0, loop_2 = loop; _b < loop_2.length; _b++) {
        var n = loop_2[_b];
        return checkForBullets(input, n, depth + 1, maxDepth);
    }
    return false;
}
function calculateEntropy(values) {
    var result = 0;
    for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
        var p = values_1[_i];
        if (p > 0 && p < 1) {
            result += -p * Math.log(p) / Math.log(values.length);
        }
    }
    return result;
}
function calculateBiEntropy(actionSequence) {
    var entropy = 0;
    var der1 = [];
    var der2 = [];
    var prob = [0, 0, 0, 0, 0];
    for (var i = 0; i < actionSequence.length; i++) {
        prob[actionSequence[i]] += 1.0;
        if (i > 0 && actionSequence[i] != actionSequence[i - 1]) {
            der1.push(1);
        }
        else {
            der1.push(0);
        }
    }
    for (var i = 0; i < prob.length; i++) {
        prob[i] /= actionSequence.length;
    }
    entropy += calculateEntropy(prob);
    prob = [0, 0];
    for (var i = 0; i < der1.length; i++) {
        prob[actionSequence[i]] += 1.0;
        if (i > 0 && der1[i] != der1[i - 1]) {
            der2.push(1);
        }
        else {
            der2.push(0);
        }
    }
    prob[0] /= der1.length;
    prob[1] /= der1.length;
    entropy += calculateEntropy(prob);
    prob = [0, 0];
    for (var i = 0; i < der1.length; i++) {
        prob[actionSequence[i]] += 1.0;
    }
    prob[0] /= der2.length;
    prob[1] /= der2.length;
    entropy += calculateEntropy(prob);
    return entropy / 3.0;
}
function calculateDistribution(buckets) {
    var result = 0;
    for (var _i = 0, buckets_1 = buckets; _i < buckets_1.length; _i++) {
        var b = buckets_1[_i];
        if (b > 0) {
            result += 1.0;
        }
    }
    return result / buckets.length;
}
function getMaxBulletsBucket(buckets) {
    var max = 0;
    for (var _i = 0, buckets_2 = buckets; _i < buckets_2.length; _i++) {
        var b = buckets_2[_i];
        if (b > max) {
            max = b;
        }
    }
    return max;
}
function calculateDensity(buckets, bulletNumber) {
    return getMaxBulletsBucket(buckets) / bulletNumber;
}
function calculateRisk(player, width, height, bucketsX, buckets) {
    var result = 0;
    var x = Math.floor(player.x / width);
    var y = Math.floor(player.y / height);
    for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
            var index = (y + dy) * bucketsX + (x + dx);
            if (index >= buckets.length) {
                index = buckets.length - 1;
            }
            if (index < 0) {
                index = 0;
            }
            if (buckets[index] > 0) {
                result += 1.0;
            }
        }
    }
    return result / 9.0;
}
function initializeBuckets(width, height) {
    var buckets = [];
    for (var i = 0; i < width * height; i++) {
        buckets.push(0);
    }
    return buckets;
}
function calculateBuckets(width, height, bucketX, bullets, buckets) {
    var p = new Talakat.Point();
    for (var _i = 0, bullets_1 = bullets; _i < bullets_1.length; _i++) {
        var b = bullets_1[_i];
        var indeces = [];
        p.x = b.x - b.radius;
        p.y = b.y - b.radius;
        var index = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        p.x = b.x + b.radius;
        p.y = b.y - b.radius;
        index = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        p.x = b.x - b.radius;
        p.y = b.y + b.radius;
        index = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        p.x = b.x + b.radius;
        p.y = b.y + b.radius;
        index = Math.floor(p.y / height) * bucketX + Math.floor(p.x / width);
        if (indeces.indexOf(index) == -1) {
            indeces.push(index);
        }
        for (var _a = 0, indeces_1 = indeces; _a < indeces_1.length; _a++) {
            var index_1 = indeces_1[_a];
            if (index_1 < 0) {
                index_1 = 0;
            }
            if (index_1 >= buckets.length) {
                index_1 = buckets.length - 1;
            }
            buckets[index_1] += 1;
        }
    }
}
function getConstraints(loops, bullets, bossHealth) {
    return 0.4 / (loops + 1) + 0.4 * bullets + 0.2 * (1 - bossHealth);
}
function getFitness(bossHealth) {
    return (1 - bossHealth);
}
function evaluate(id, parameters, input) {
    for (var i = 0; i < id.length; i++) {
        var temp = evaluateOne(id[i], parameters, input[i]);
        this.postMessage(temp);
    }
}
function evaluateOne(id, parameters, input) {
    var numLoops = 0;
    for (var name_1 in input.spawners) {
        if (checkForLoop(input, name_1, 0, parameters.maxDepth)) {
            numLoops += 1;
        }
    }
    var numBullets = 0;
    var numSpawners = 0;
    for (var name_2 in input.spawners) {
        if (checkForBullets(input, name_2, 0, parameters.maxDepth)) {
            numBullets += 1.0;
        }
        numSpawners += 1;
    }
    var startWorld = new Talakat.World(parameters.width, parameters.height, parameters.maxNumBullets);
    startWorld.initialize(input);
    var ai = new self[parameters.agent](parameters);
    ai.initialize();
    var bestNode = ai.plan(startWorld.clone(), parameters.maxAgentTime);
    var risk = 0;
    var distribution = 0;
    var density = 0;
    var frames = 0;
    var bulletFrames = 0;
    var calculationFrames = parameters.calculationFrames;
    var bucketWidth = parameters.width / parameters.bucketsX;
    var bucketHeight = parameters.height / parameters.bucketsY;
    var buckets = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
    var actionSequence = bestNode.getSequence(parameters.repeatingAction);
    var currentNode = bestNode;
    while (currentNode.parent != null) {
        if (currentNode.world.bullets.length > 0) {
            buckets = initializeBuckets(parameters.bucketsX, parameters.bucketsY);
            calculateBuckets(bucketWidth, bucketHeight, parameters.bucketsX, currentNode.world.bullets, buckets);
            bulletFrames += 1;
            risk += calculateRisk(currentNode.world.player, bucketWidth, bucketHeight, parameters.bucketsX, buckets);
            distribution += calculateDistribution(buckets);
            density += calculateDensity(buckets, currentNode.world.bullets.length);
        }
        frames += 1.0;
        currentNode = currentNode.parent;
    }
    if ((ai.status == GameStatus.ALOTSPAWNERS ||
        ai.status == GameStatus.SPAWNERSTOBULLETS ||
        ai.status == GameStatus.TOOSLOW)) {
        return {
            id: id,
            fitness: 0,
            bossHealth: bestNode.world.boss.getHealth(),
            errorType: ai.status,
            // constraints: getConstraints(numLoops, numBullets / numSpawners, bestNode.world.boss.getHealth()),
            constraints: getFitness(bestNode.world.boss.getHealth()),
            behavior: [
                calculateBiEntropy(actionSequence),
                // bulletFrames / Math.max(1, bulletFrames), 
                risk / Math.max(1, bulletFrames),
                distribution / Math.max(1, bulletFrames),
                density / Math.max(1, bulletFrames)
            ]
        };
    }
    return {
        id: id,
        fitness: getFitness(bestNode.world.boss.getHealth()),
        bossHealth: bestNode.world.boss.getHealth(),
        errorType: ai.status,
        constraints: 1,
        behavior: [
            calculateBiEntropy(actionSequence),
            // bulletFrames / Math.max(1, frames),
            risk / Math.max(1, bulletFrames),
            distribution / Math.max(1, bulletFrames),
            density / Math.max(1, bulletFrames)
        ]
    };
}
