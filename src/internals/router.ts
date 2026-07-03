import { WebSocket } from '@fastify/websocket';
import { clientActionsHandlers, isAction } from "./handlers/actions";
import { clientAnswersHandlers, isAnswer } from "./handlers/answers";
import { clientInfosHandlers, isInfos } from "./handlers/informations";
import { clientQuestionsHandlers, isQuestion } from "./handlers/questions";

export async function routeWs(buffer: Uint8Array, wsClient: WebSocket, allClients: Set<WebSocket>) {

    const type = buffer[0];

    if (type === undefined) return;
    
    if (isQuestion(type)) {
        await clientQuestionsHandlers[type]!(buffer, wsClient, allClients);
    } else if (isAction(type)) {
        await clientActionsHandlers[type]!(buffer, wsClient, allClients);
    } else if (isAnswer(type)) {
        await clientAnswersHandlers[type]!(buffer, wsClient, allClients);
    } else if (isInfos(type)) {
        await clientInfosHandlers[type]!(buffer, wsClient, allClients);
    }
}