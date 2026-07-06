export async function encryptChunk(file: File, password: string): Promise<File> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );

    const plaintext = new Uint8Array(await file.arrayBuffer());
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext)
    );

    const packaged = new Uint8Array(salt.length + iv.length + ciphertext.length);
    packaged.set(salt, 0);
    packaged.set(iv, salt.length);
    packaged.set(ciphertext, salt.length + iv.length);

    return new File([packaged], file.name + ".enc", { type: "application/octet-stream" });
}

// Inverse of encryptChunk. Layout: [ salt(16) | iv(12) | ciphertext+tag ].
// Throws if the password is wrong (AES-GCM tag mismatch).
export async function decryptFile(data: Uint8Array<ArrayBuffer>, password: string): Promise<Uint8Array<ArrayBuffer>> {
    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 28);
    const ciphertext = data.subarray(28);

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new Uint8Array(plaintext);
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    return el as T;
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