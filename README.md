<img width="1517" height="633" alt="banner" src="https://github.com/user-attachments/assets/a23446a4-ffb4-48de-a4f2-e31d518ce206" />

Hive Cloud is an idea that emerged from the consistent underuse of common hardware devices and the fact that we're all missing storage space.
Everyone has a computer/phone and access to the web.

These are the only requirements to store a file in Hive Cloud.

We don't always have some space left on our devices, but we do always have a little bit of RAM available.

The goal of this project is to offer a completely **open source and free Cloud storage** by using everyone's RAM.

It's a challenge both mathematically and technically :

1. RAM available < storage available, so how do we do ?

    > That's why this project is open source. We need well-oxygenated brains to figure that out.

2. A session might last 20 seconds ?

    > Yes ! So we better make it count !

3. The files are stored client side... It's gonna be really slow !
    > Maybe ! Maybe not. Take a look at this : [Countries by internet connection speed](https://en.wikipedia.org/wiki/List_of_countries_by_Internet_connection_speeds)


## How does it work ?

### The server

The server only passes informations between connected devices, it doesn't store anything permanently (might be the case soon).

All devices are connected by **websockets** to the server and files are supposed to **flow continuously** between devices. This requires *highly* optimised scripts, data managment, and good understanding of v8 engine (since this project is written in TypeScript and ran by Node).


### The client

The client does 2 things :

- It receives/sends chunks and takes care of their redundancy
- It allows to upload new chunks (files uploaded by users)

We should ask the user before using his browser/device. Eventhough the user can specify how much storage he wants to give to the hive, we should always ask. It **will** heavily use his internet connection and he might pay fees.

## File processing

Any file **can be completely or partially lost**.

- Completely lost : If there's not a single client connected, there's no storage capacity.
- Partially lost : If the storage capacity of all clients is shrinking, we **will** loose all or parts of the data.

By default, any file is encrypted using a key provided by the user.
This encryption takes place on client's side.

We split the file (after encryption if any) into chunks.

Any chunk is supposed to be stored on X clients.
Each client asks regularly if each of it's chunks are stored in X-1 other clients, while answering to this question, the server, will or won't (depending on the number of copies stored of a given chunk), ask the client to send the chunk and will forward it to another client able to store a chunk.
> Each client should look after the safety of it's own data.

### Keeping chunks redundant

Every client runs a redundancy check on a loop. For each chunk it holds, it asks the hive how many clients currently store it (`0x37`) and reacts to the answer :

- **Too few copies** (`holders < chunk_redundancy`) : the client re-broadcasts the chunk (`0x49`) so the hive can replicate it further. A chunk on the verge of being lost (`0` copies) is therefore the most aggressively re-broadcast.
- **Too many copies** (`holders > chunk_redundancy`) : the chunk is over-replicated and wasting RAM. Every holder rolls a die and, **1 time out of 10**, drops its own copy. Doing it probabilistically avoids every holder dropping the chunk at the same moment.
- **A sibling is gone** : a client can only rebuild a file if *all* its chunks still live somewhere. If a multi-chunk file has a chunk missing from the whole hive, the file is unrecoverable, so the client deletes every chunk it kept for that file to reclaim the space.

> A client can never lose a chunk it is currently holding, so it only ever deletes over-replicated copies or chunks belonging to an already-doomed file.

⚠️ Please, Don't send personal data. It's broadcasted to everyone !

## Communication client <> server

We don't use JSON in this project. There's only bytes and bits !

Each ***codes*** you'll see in this documentation **must be** the first byte in any payload.

Take a look at the [hiveCodesAndConfig.ts](https://github.com/lorys/hive-cloud/blob/main/src/hiveCodesAndConfig.ts) to have up-to-date informations.

### > Server's **questions**, **actions** and **informations**

#### The server can ask a client different **questions** :

- `0x00` : Do we have a chunk ? If so, send it
- `0x01` : Do we have a chunk ? yes or *no*
- `0x02` : Can we store a chunk ? 

> 👉 The server only cares about positive answers. The clients should only send something when it's usefull.

#### The server can also ask different **actions** :

- `0x10` : Store this chunk.

The server doesn't expect any answer from the client when asking for an action. It will know the state of a given chunk when it'll ask for it.

#### The server communicates informations about Hive's current state

- `0x20` : Current Hive state: total storage capacity, total used capacity, total clients connected

### > Client's **questions** and **actions**

Since the client has 2 concerns :
- **storing** chunks
- **creating** new chunks

#### Client's questions

- `0x30` : How many clients stores this chunk `<id>` ?

#### Client's actions

- `0x40` : broadcast this chunk.
- `0x41` : Send me this chunk.

### Client's informations

- `0x50` : The client also sends informations to the server about the current capacity and usage.

## Chunk's format during transfers

A chunk is `1 048 576 bytes` (or 1MiB). Full or not, it will always be the same size.

But we can only process it completely if we have the informations needed (in this order, after the code):

- **32 bytes** : file's entire hash (sha256), used as an index and/or name
- **2 bytes** : current chunk's index.
- **2 bytes** : total chunks for this file
- **5 bytes** : total bytes in this file
- **1 048 576 bytes** : the entier chunk (filled with zeros if the chunk is smaller than the set size).

> chunkId is `34 bytes` : file's entire hash + current chunk's index

These data allow us to follow a file and know what part is missing.

A file can have 65 535 chunks so a single file cannot exceed **~65 gigabytes**.

This exact format, explained above, is used only during transfers between servers and clients (codes `0x00`, `0x10` and `0x40`).
Clients have a different approach when it comes to storing chunks.
