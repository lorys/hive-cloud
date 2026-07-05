import { describe, expect, it } from "vitest";
import { chunkIdToString, stringTochunkId } from "commons";
import { chunk_id_size } from "hiveCodes";

describe('ChunkId can convert both ways', () => {
    it('string to bytes', () => {
        const chunkId = new Uint8Array(chunk_id_size);
        
        new Array(34).fill(0).forEach((_, i) => {
            chunkId[i] = i;
        });

        const str = chunkIdToString(chunkId);
        
        expect(str).toBe("0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x");
    });
    it ('bytes to string', () => {
        const resultWanted = new Array(chunk_id_size).fill(0).map((_, i) => i);

        const chunkId = stringTochunkId("0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x");

        for (let a = 0; a < chunkId.length; a++) {
            expect(chunkId[a]).toBe(resultWanted[a]);
        }
    });
});