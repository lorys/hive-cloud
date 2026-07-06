import { describe, expect, it } from "vitest";
import { HiveStorage } from "../storage";
import { chunk_header_size, chunk_size } from "hiveCodes";
import { numberToUint8Array } from "commons";

describe('Chunk storage works', () => {
    it('1 chunk stored should be the same when pulled', () => {
        const storage = new HiveStorage(1);
        const chunkId = "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x";
        const chunk = Uint8Array.from(new Array(chunk_header_size + chunk_size).fill(0).map((_, i) => i));
        storage.storeChunk(chunkId, chunk);

        const pulledChunk = storage.pullChunk(chunkId);

        for (let a = 0; a < chunk.length; a++) {
            expect(chunk[a]).toBe(pulledChunk[a]);
        }
    });
    it('Multiple chunks stored should be the same when pulled', () => {
        const storage = new HiveStorage(3);
        const chunkIds = [
            "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x",
            "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,b",
            "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,c",
        ];
        const chunks = [
            Uint8Array.from(new Array(chunk_header_size + chunk_size).fill(0).map((_, i) => i)),
            Uint8Array.from(new Array(chunk_header_size + chunk_size).fill(0).map((_, i) => i+1)),
            Uint8Array.from(new Array(chunk_header_size + chunk_size).fill(0).map((_, i) => i+2))
        ];
        chunks.forEach((chunk, index) => storage.storeChunk(chunkIds[index], chunk));

        for (let b = 0; b < chunks.length; b++) {
            const chunkId = chunkIds[b];
            const chunk = chunks[b];
            const pulledChunk = storage.pullChunk(chunkId);
            for (let a = 0; a < 3000; a++) {
                expect(pulledChunk[a]).toBe(chunk[a]);
            }
        }
    });
    it('Gets the right header infos', () => {
        const storage = new HiveStorage(1);
        const chunkId = "0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,0,5";

        const currentIndex = 5;
        const totalChunks = 300;
        const totalBytes = 424_242;

        const chunk = new Uint8Array(chunk_header_size + chunk_size);
        chunk.set(numberToUint8Array(totalChunks, 2), 0);
        chunk.set(numberToUint8Array(totalBytes, 5), 2);

        storage.storeChunk(chunkId, chunk);

        const headers = storage.getChunkHeaders(chunkId);

        expect(headers.currentIndex).toBe(currentIndex);
        expect(headers.totalChunks).toBe(totalChunks);
        expect(headers.totalBytes).toBe(totalBytes);
    });
});