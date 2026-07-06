import { chunkIdToString } from "commons";
import { HiveCommunication } from "../communication";
import { enums, chunk_id_size } from "hiveCodes";

type ChunkAction = (args: Uint8Array) => Promise<Uint8Array | null>;

export async function actionsFromServerHandler(payload: Uint8Array, hive: HiveCommunication) {
    // the first byte contains the action code made from the server that we need to execute.
    const type = payload[0];

    const params = payload.subarray(1);

    const actions: Record<number, ChunkAction> = {
        // Do we have a chunk ? If so, send it
        async [enums.server.actions.store_chunk](args: Uint8Array) {
            const chunkIndexArr = args.subarray(0, chunk_id_size);

            try {
                const chunk = await hive.storeChunk(chunkIdToString(chunkIndexArr), args.subarray(chunk_id_size));
            } catch (e) {
            }
            return null;
        },
    };

    const question = actions[type];
    if (!question) return;

    try {
        const answer = await question(params);
        if (!answer) return;
        const answerPayload = new Uint8Array(1 + answer.length);
        answerPayload[0] = type;
        answerPayload.set(answer, 1);
        await hive.answerHive(answerPayload);
    } catch (e) {
        console.log("Error while processing actions for type " + type, e);
    }
}