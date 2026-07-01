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

The client-side is the most important part, here's what it does :

- It receives/sends chunks
- It allows to upload new chunks (files uploaded by users)

We should ask the user before using his browser/device. Eventhough the user can specify how much he wants to give to the hive, we should always ask. It **will** heavily use his internet connection and he might pay fees.

## Chunk's format

A chunk is set to a maximum of 1 048 576 bytes (or 1MiB) of *raw* binary data.

But the way we process it requires 24 bytes more.

Here are the different data required to process a chunk (in order) :

- **16 bytes** : file's entire hash, used as an index
- **2 bytes** : current chunk's index.
- **2 bytes** : total chunks for this file
- **6 bytes** : upload time (unix timestamp)
- **1 048 576 bytes** : the entier chunk (filled with zeros if the chunk is smaller than the required size).

These data allow us to follow a file and know what part is missing.

A file can have 65 535 chunks so a single file cannot exceed **~65 gigabytes**