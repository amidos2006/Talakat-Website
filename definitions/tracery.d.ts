declare module tracery{
    export class TraceryNode{
        depth:number;
        childIndex:number;
        parent:TraceryNode;
        children:TraceryNode[];
        finishedText:string;

        expandSequence(sequence:number[]):void
        toString():string;
    }

    export class Grammar{
        createRoot(rule:string):TraceryNode;
        clearState():void;
        addModifiers(mods:{}):void;
        expand(rule:string, allowEscapeChars?:boolean):TraceryNode;
        flatten(rule:string, allowEscapeChars?:boolean):string;
        flattenSequence(rule:string, sequence:number[]):string;
        toJSON():string;
        toHTML():string;
    }

    export function createGrammar(raw?:{}):Grammar;
    export function setRng(newRng:()=>number):void;
}