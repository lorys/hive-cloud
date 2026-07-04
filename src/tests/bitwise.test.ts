import { describe, expect, test } from 'vitest';
import { numberToUint8Array, uint8ArrayToNumber } from '../internals/bitwise';

describe('Number to buffer / bitwise operations', () => {

    test('uint8array to number', () => {
        const arr = new Uint8Array(4);
        arr[0] = 0xAA;
        arr[1] = 0xBB;
        arr[2] = 0xCC;
        arr[3] = 0xDD;

        expect(uint8ArrayToNumber(arr)).toBe(0xAABBCCDD);
    });

    test('number to uint8array', () => {
        const arr = numberToUint8Array(0xAABBCCDD, 4);

        expect(arr).toBeInstanceOf(Uint8Array);
        expect(arr[0]).toBe(0xAA);
        expect(arr[1]).toBe(0xBB);
        expect(arr[2]).toBe(0xCC);
        expect(arr[3]).toBe(0xDD);
    });
});

