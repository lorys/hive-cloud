import { clientActionsHandlers, isAction } from "./handlers/actions";
import { clientAnswersHandlers, isAnswer } from "./handlers/answers";
import { clientQuestionsHandlers, isQuestion } from "./handlers/questions";

export async function routeWs(buffer: Uint8Array) {

    const type = buffer[0];

    if (type === undefined) return;

    if (isQuestion(type)) {
        await clientQuestionsHandlers[type]!(buffer);
    } else if (isAction(type)) {
        await clientActionsHandlers[type]!(buffer);
    } else if (isAnswer(type)) {
        await clientAnswersHandlers[type]!(buffer);
    }
}