import { hive } from "../main";

let usersChunkIds: { [key: string]: string } = {};


function renderUserFiles() {
    const userFilesDOM = document.querySelector<HTMLDivElement>("#user_files");
    if (!userFilesDOM) {
        console.error("user files DOM not found");
        return;
    }

    let newRender: Node[] = [];
    
    Object.keys(usersChunkIds).forEach(chunk => {
        const sanityCheck = /^[a-zA-Z0-9]+$/;
        console.log("sanityCheck", chunk.match(sanityCheck), chunk);
        if (chunk.match(sanityCheck) === null) {
            return;
        }

        const el = document.createElement('div');
        const nameEl = document.createElement('span');
        const buttonEl = document.createElement('span');
        
        nameEl.innerHTML = usersChunkIds[chunk] || chunk;
        buttonEl.innerHTML = `⬇️ Download`;
        buttonEl.onclick = () => hive.communication?.downloadFileFromHive(chunk);

        el.classList.add('link');
        el.append(nameEl, buttonEl);
        
        newRender.push(el);
    });

    console.log({usersChunkIds, newRender});

    userFilesDOM.innerHTML = '';
    userFilesDOM.append(...newRender);
}

export function manageUserFiles() {
    console.log("mange user files");

    const locallyStoredFiles = Object.keys(localStorage).filter(e => e.startsWith("hive_")).reduce((acc, e) => ({ ...acc, [e.replace("hive_", "")]: localStorage.getItem(e) as string }), {});
    console.log({ locallyStoredFiles });

    const needToUpdate = Object.keys(locallyStoredFiles).length !== Object.keys(usersChunkIds).length;

    if (!needToUpdate) {
        return;
    }

    usersChunkIds = locallyStoredFiles;

    renderUserFiles();
}