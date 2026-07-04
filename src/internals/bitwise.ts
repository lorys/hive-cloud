export function numberToUint8Array(number: number, bytes: number) {
    const buff = new Uint8Array(bytes);
    for (let a = 0; a < bytes; a++) {
        buff[a] = (number >> ((bytes - 1 - a) * 8)) & 0xFF;
    }
    return buff;
};

export function uint8ArrayToNumber(arr: Uint8Array) {
    let val = 0;
    for (let a = 0; a < arr.length; a++) {
        val = (val << 8) + arr[a]!;
    }
    return val >>> 0;
};