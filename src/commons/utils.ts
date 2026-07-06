export function chunkIdToString(arr: Uint8Array) {
    let chunkId = ``;
    for (let a = 0; a < arr.length; a++) {
        chunkId += (arr[a] || 0).toString(36)+(a+1 < arr.length ? ',' : '');
    }
    return chunkId;
}

export function stringToChunkId(chunkId: string) {
    let bytes: number[] = [];
    chunkId.split(',').forEach(val => bytes.push(parseInt(val, 36)));
    const converted = new Uint8Array(bytes.length);
    bytes.forEach((e, i) => converted[i] = e);
    return converted;
}

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
    return val;
};