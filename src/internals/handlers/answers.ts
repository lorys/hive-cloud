export const answersCodes = {
    have_chunk_and_send: 0x00,
    have_chunk: 0x01,
    can_store_chunk: 0x02,
    stored_chunks: 0x03,
    available_storage: 0x04
}

const answersSet = new Set(Object.values(answersCodes));

export function isAnswer(type: number) {
    return (type & 0xF0) === 0x00 && answersSet.has(type);
}

export const clientAnswersHandlers = {
    async [answersCodes.have_chunk_and_send](buffer: Uint8Array) {
        
    },
    async [answersCodes.have_chunk](buffer: Uint8Array) {
        
    },
    async [answersCodes.can_store_chunk](buffer: Uint8Array) {
        
    },
    async [answersCodes.stored_chunks](buffer: Uint8Array) {
        
    },
    async [answersCodes.available_storage](buffer: Uint8Array) {
        
    }
};