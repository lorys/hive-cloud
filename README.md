# Hive Cloud

***Hive Cloud is an open source, decentralized cloud storage.***

---

Hive Cloud is an idea that emerged from the consistent underuse of common hardware devices and the fact that we're all missing storage space.
Everyone has a computer/phone and access to the web.

These are the only requirements to store a file in Hive Cloud.

We don't always have some space left on our devices, but we do always have a little bit of RAM available.

The goal of this project is to offer a completely **decentralized and free cloud** by using everyone's RAM.

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

⚠️ Please, Don't send personal data. It's broadcasted to everyone !

## Chunk's format during transfers

A chunk is 1 048 576 bytes (or 1MiB). Full or not, it will always be the same size.

But we can only process it completely if we have the 31 bytes of informations needed.

Here are the different data required to process a chunk :

- **16 bytes** : file's entire hash, used as an index and/or name
- **2 bytes** : current chunk's index.
- **2 bytes** : total chunks for this file
- **5 bytes** : total bytes in this file 👈 Only present in the last chunk
- **6 bytes** : chunk's upload time (unix timestamp)
- **1 048 576 bytes** : the entier chunk (filled with zeros if the chunk is smaller than the set size).

These data allow us to follow a file and know what part is missing.

A file can have 65 535 chunks so a single file cannot exceed **~65 gigabytes**.

A chunk has a lifetime of 30 days, when we come near this limit, the client should reupload the chunk (automatically if possible).

This exact format, explained above, is used only during transfers between servers and clients.
Clients have a slightly different approach when it comes to storing chunks.

## Communication client <> server

### > Server's **questions**, **actions** and **informations**

#### The server can ask a client different **questions** :

- `0x00` : Do we have a chunk ? If so, send it
- `0x01` : Do we have a chunk ? yes or *no*
- `0x02` : Can we store a chunk ? 
- `0x03` : How many chunks do you have ?
- `0x04` : How many chunks can you have ?

Any questions asked from the server to a client will follow this format :
```
|   question's code  |          params         |
|       1 byte       |      1 to 1MiB bytes    |
```

Any answer sent from client to the server will follow this format :

```
|   question's code  |          answer         |
|       1 byte       |      1 to 1MiB bytes    |
```

> 👉 The server only cares about positive answers. The clients should only send something when it's usefull.

#### The server can also ask different **actions** :

- `0x11` : Store this chunk.

The server doesn't expect any answer from the client when asking for an action. It will know the state of a given chunk when it'll ask for it.

An action sent from the server can only follow this format : 

```
|    action's code   |        params      |
|       1 byte       |      1MiB bytes    |
```

#### The server communicates informations about Hive's current state

- `0x21` : Current Hive state: total storage capacity, total used capacity, total clients connected

### > Client's **questions** and **actions**

Since the client has 2 concerns :
- **storing** chunks
- **creating** new chunks

There's different requests for each.

Any questions asked from the client to the server will follow this format :
```
|   question's code  |       params       |
|       1 byte       |   0 to 32 bytes    |
```

Any answer sent from server to the client will follow this format :
```
|   question's code  |       answer       |
|       1 byte       |   0 to 32 bytes    |
```

- `0x37` : How many clients stores this chunk `<id>` ?
- `0x38` : Can we store a file of `N` bytes named `<hash>` ?

#### Client's actions

- `0x49` : store this chunk `<hash>`. The request is in this format :
```
| 0x49 | chunk 1MiB |
```