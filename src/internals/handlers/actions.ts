export const actionsCodes = {
    sending_chunk: 0x49
}

const actionsSet = new Set(Object.values(actionsCodes));

export function isActions(type: number) {
    return (type & 0xF0) === 0x40 && actionsSet.has(type);
}

export const clientActionsHandlers = {
    async [actionsCodes.sending_chunk](buffer: Uint8Array) {

    }
};