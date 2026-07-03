import { HiveCommunication } from "../communication";
import { enums, chunk_size } from "hiveCodes";

type ChunkAction = (args: Uint8Array) => Promise<Uint8Array | null>;

export async function questionsFromServerHandler(payload: Uint8Array, hive: HiveCommunication) {
    // the first byte contains the action code made from the server that we need to execute.
    const type = payload[0];

    const params = payload.subarray(1);

    const actions: Record<number, ChunkAction> = {
        // Do we have a chunk ? If so, send it
        async [enums.server.questions.have_chunk_and_send](args: Uint8Array) {
            const wantedChunkIndex = new DataView(args.buffer, 1, args.byteLength).getUint32(0, true);
            try {
                const chunk = await hive.pullChunk(wantedChunkIndex);
                const answer = new Uint8Array(4 + chunk_size);
                answer.set(args.subarray(0,3));
                answer.set(chunk, 4);
                return answer;
            } catch (e) {

            }
            return null;
        },

        // Do we have a chunk ? yes or no
        async [enums.server.questions.have_chunk](args: Uint8Array) {
            const wantedChunkIndex = new DataView(args.buffer, 1, args.byteLength).getUint32(0, true);
            try {
                const chunk = await hive.pullChunk(wantedChunkIndex);
                const answer = new Uint8Array(4 + chunk_size);
                answer.set(args.subarray(0,3));
                answer.set(chunk, 4);
                return answer;
            } catch (e) {

            }
            return null;
        },
    };

    const action = actions[type];
    if (!action) return;

    try {
        const answer = await action(params);
        if (!answer) return;
        const answerPayload = new Uint8Array(1 + answer.length);
        answerPayload[0] = type;
        answerPayload.set(answer, 1);
        await hive.answerHive(answerPayload);
    } catch (e) {
        console.log("Error while processing questions for type " + type, e);
    }
}