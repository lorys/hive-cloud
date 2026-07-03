import { categories, codes } from "../codes";

const questionsSet = new Set(Object.values(codes.client.questions));

export function isQuestion(type: number) {
    return (type & 0xF0) === categories.client.questions && questionsSet.has(type);
}

export const clientQuestionsHandlers = {
    async [codes.client.questions.total_clients_having_chunk](buffer: Uint8Array) {

    },
    async [codes.client.questions.have_space_to_store_file](buffer: Uint8Array) {

    }
};