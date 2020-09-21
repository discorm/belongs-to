# @disco/belongs-to

[![CI status](https://github.com/discorm/belongs-to/workflows/ci/badge.svg)](https://github.com/discorm/belongs-to/actions?query=workflow%3Aci+branch%3Amaster)
[![Coverage Status](https://coveralls.io/repos/discorm/belongs-to/badge.png)](https://coveralls.io/r/discorm/belongs-to)
[![npm package](https://img.shields.io/npm/v/@disco/belongs-to)](https://npmjs.com/package/@disco/belongs-to)
[![Dependencies](https://img.shields.io/david/discorm/belongs-to)](https://david-dm.org/discorm/belongs-to)
[![MIT License](https://img.shields.io/npm/l/@disco/belongs-to)](./LICENSE)

This is a middleware for disco to add belongs-to relation support.

## Install

```sh
npm install @disco/belongs-to
```

## Usage

```js
const disco = require('@disco/disco')
const belongsTo = require('@disco/belongs-to')

const modeller = disco(driver)
modeller.use(belongsTo)

const User = modeller.createModel('user')
const Profile = modeller.createModel('profile')

Profile.belongsTo({
  model: User,
  as: 'user'
})

const user = await User.create({
  email: 'me@example.com',
  password: 'badpassword'
})

const profile = await Profile.create({
  name: 'Stephen'
})

await profile.user.set(user)
```

## belongsTo API

### Model.belongsTo(config : Object)
This is the entrypoint to create a belongsTo relation on a given model.

* `config` {Object} config object
  * `model` {Model} Model this belongs to
  * `as` {String} Name of relation property (default: model.tableName)
  * `foreignKey` {String} Column name of foreign key (default: Model.tableName)
  * `immutable` {Boolean} If it should exclude mutation APIs (default: false)

```js
User.belongsTo({
  model: Profile,
  as: 'profile'
})

const user = User.findOne({})
user.posts // User.belongsTo(...) added this relation property
```

Note that while a relation _can_ be set to `immutable`, this currently only makes the _relation_ immutable and not the model returned by it.

### Non-mutating

These APIs will always be included regardless of if `immutable` has been set to `false`.

#### relation.get() : Promise\<Model>

Get the related record.

```js
const user = await profile.user.get()
```

### Mutating

If `immutable` has been set to `false` in `Model.belongsTo(...)`, these APIs will not be included.

#### relation.set(model : Model) : Promise\<Model>

Set an existing model to this relation.

```js
const user = User.build({
  email: 'me@example.com',
  password: 'badpassword'
})

await profile.user.set(user)
```

#### relation.build(data : Object) : Model

Build a new related record. This will not persist until the returned model is saved.

```js
const user = profile.user.build({
  email: 'me@example.com',
  password: 'badpassword'
})
await profile.save()
```

#### relation.create(data : Object) : Promise\<Model>

Create a new related record. This will persist before returning the model.

```js
const user = await profile.user.create({
  email: 'me@example.com',
  password: 'badpassword'
})
```

#### relation.getOrCreate(data : Object) : Promise\<Model>

Attempt to get the related record, creating it with the given `data` if not found.

```js
const user = await profile.user.getOrCreate({
  email: 'me@example.com',
  password: 'badpassword'
})
```

#### relation.createOrUpdate(changes : Object) : Promise\<Model>

Attempt to update the related record by applying the given `changes`, creating it with the `changes` if not found.

```js
const user = await profile.user.createOrUpdate({
  email: 'me@example.com',
  password: 'badpassword'
})
```

#### relation.update(changes : Object) : Promise\<Model>

Update the related record by applying the given `changes`.

```js
const user = await profile.user.update({
  email: 'me@example.com',
  password: 'badpassword'
})
```

#### relation.remove() : Promise\<Model>

Remove the related record.

```js
const removedUser = await profile.user.remove({
  email: 'me@example.com',
  password: 'badpassword'
})
```
