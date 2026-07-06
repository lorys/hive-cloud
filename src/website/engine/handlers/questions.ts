import { HiveCommunication } from "../communication";
import { enums, chunk_size, chunk_infos_size, chunk_id_size } from "hiveCodes";
import { chunkIdToString } from "commons";

type ChunkAction = (args: Uint8Array) => Promise<Uint8Array | null>;

export async function questionsFromServerHandler(payload: Uint8Array, hive: HiveCommunication) {
    // the first byte contains the action code made from the server that we need to execute.
    const type = payload[0];

    const params = payload.subarray(1);

    const questions: Record<number, ChunkAction> = {
        // Do we have a chunk ? If so, send it
        async [enums.server.questions.have_chunk_and_send](args: Uint8Array) {
            const wantedChunkIndex = chunkIdToString(args);
            try {
                const chunk = await hive.pullChunk(wantedChunkIndex);
                const answer = new Uint8Array(chunk_infos_size + chunk_size);
                answer.set(args, 0);
                answer.set(chunk, chunk_id_size);
                return answer;
            } catch (e) {

            }
            return null;
        },

        // Do we have a chunk ? yes or no
        async [enums.server.questions.have_chunk](args: Uint8Array) {
            // args is the chunk id the server is asking about.
            const chunkId = chunkIdToString(args);
            try {
                await hive.pullChunk(chunkId); // throws if we don't hold it
                return args; // echo the id back so the server registers us as a holder
            } catch (e) {
                console.error("Error", e);
            }
            return null;
        },
    };

    const question = questions[type];
    if (!question) return;

    try {
        const answer = await question(params);
        if (!answer) return;
        const answerPayload = new Uint8Array(1 + answer.length);
        answerPayload[0] = type;
        answerPayload.set(answer, 1);
        await hive.answerHive(answerPayload);
    } catch (e) {
        console.log("Error while processing questions for type " + type, e);
    }
}