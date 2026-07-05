import { HiveCommunication } from "./communication";
import { HiveStorage } from "./storage";

export async function chunkRedundancy(storage: HiveStorage, hive: HiveCommunication) {
    
    // For each chunks, ask how many clients has them, if total < min_chunk_redundancy we broadcast them.
    // If a multiple chunk file has one missing chunk in the hive we delete all chunks

}