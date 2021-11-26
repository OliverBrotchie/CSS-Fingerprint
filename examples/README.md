<br/>

<img src="../img/logo.svg" height="150" width="675" margin="30px"/>

#

<br/>

This folder contains basic examples of fingerprinting servers written in Rust, Deno
and NodeJS.

## Enviroment Setup

- Make sure the prerequisite runtime is installed (Cargo, Deno, Node).
- (Node Spesific) Run `npm install` before use.
- Create a .env file with the following fields:

**Deno**

```env
user=username
password=password
database=database # Name of database
hostname=hostname # For example: localhost
port=port # The port that postgres is listening on
```

**Rust**

```env
DATABASE_URL=postgres://username:password@hostname/database
```

## Spesific Implementations

### Node

A Javascript implementation of a Fingerprinting server built using Express.js.

### Deno

A TS implementation that includes everything in the Node implementation in-addition to a premade Postgres module.
This implementation is built using the Standard Deno HTTP Server.

### Rust

A high-performance memory-safe Rust implementation, built using Actix and Postgres.