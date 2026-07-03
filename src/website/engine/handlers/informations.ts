import { chunk_size, enums } from "hiveCodes";
import { HiveCommunication } from "../communication";
import { byId } from "../utils";

export async function informationsFromServerHandler(payload: Uint8Array, _hive: HiveCommunication) {
    const type = payload[0];
    if (type !== enums.server.infos) return;

    const totalCapacity = new DataView(payload.buffer).getUint32(1, false);
    let totalCapacityFormatted: string | number = totalCapacity * chunk_size;
    if (totalCapacityFormatted >= 1000*1000*chunk_size) totalCapacityFormatted = (totalCapacityFormatted / (1000*1000*chunk_size)).toFixed(1) + " TiB";
    else if (totalCapacityFormatted >= 1000*chunk_size) totalCapacityFormatted = (totalCapacityFormatted / (1000*chunk_size)).toFixed(1) + " GiB";
    else if (totalCapacityFormatted >= chunk_size) totalCapacityFormatted = (totalCapacityFormatted / chunk_size) + " MiB";

    const totalUsed = new DataView(payload.buffer).getUint32(5, false);
    let totalUsedFormatted: string | number = totalUsed * chunk_size;
    if (totalUsedFormatted >= 1000*1000*chunk_size) totalUsedFormatted = (totalUsedFormatted / (1000*1000*chunk_size)).toFixed(1) + " TiB";
    else if (totalUsedFormatted >= 1000*chunk_size) totalUsedFormatted = (totalUsedFormatted / (1000*chunk_size)).toFixed(1) + " GiB";
    else if (totalUsedFormatted >= chunk_size) totalUsedFormatted = (totalUsedFormatted / chunk_size) + " MiB";

    const totalClients = new DataView(payload.buffer).getUint32(9, false);

    byId("available_storage").innerHTML = String(totalCapacityFormatted);
    byId("used_storage").innerHTML = String(totalUsedFormatted);
    byId("connected_devices").innerHTML = String(totalClients);

    byId("used").style.width = (totalUsed*100/totalCapacity) + "%";
    byId("used").innerHTML = (totalUsed*100/totalCapacity) + "%";
}