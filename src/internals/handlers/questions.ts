export const questionsCodes = {
    total_clients_storing_chunk: 0x37,
    can_store_file: 0x38,
}

const questionsSet = new Set(Object.values(questionsCodes));

export function isQuestion(type: number) {
    return (type & 0xF0) === 0x30 && questionsSet.has(type);
}

export const clientQuestionsHandlers = {
    async [questionsCodes.total_clients_storing_chunk](buffer: Uint8Array) {

    },
    async [questionsCodes.can_store_file](buffer: Uint8Array) {

    }
};