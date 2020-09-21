'use strict'

const isSubset = require('is-subset')
const tap = require('tap')

const disco = require('@disco/disco')
const { BaseModel } = require('@disco/base-driver')
const belongsTo = require('./')
const {
  BelongsTo,
  BelongsToMutable
} = belongsTo

function hasRelation (t, obj, meth, relation) {
  t.ok(
    obj.prototype[meth] instanceof relation,
    `"${meth}" getter is instance of ${relation.name}`
  )
}

function driver () {
  return class Model extends BaseModel {
    static reset (records = []) {
      this.hooks = []
      this.data = []

      for (const record of records) {
        this._add(record)
      }
    }

    static _add (data) {
      const { length } = this.data
      const record = { id: length + 1, ...data }
      this.data.push(record)
      return record
    }

    emit (event) {
      this.constructor.hooks.push(event)
    }

    _fetch () {
      return this.constructor.data.filter(v => v.id === this.id)[0]
    }

    _save () {
      return this.constructor._add(this)
    }

    _update () {
      const record = this.constructor.data
        .filter(model => model.id === this.id)

      Object.assign(record[0], this)
      return this._fetch()
    }

    _remove () {
      this.constructor.data = this.constructor.data
        .filter(model => model.id !== this.id)
    }

    static async * findIterator (query) {
      const items = this.data
        .filter(v => isSubset(v, query || {}))

      for (const item of items) {
        yield this.build(item)
      }
    }
  }
}

tap.test('BelongsTo', async t => {
  const modeller = disco(driver())
  modeller.use(belongsTo)

  const Parent = modeller.createModel('parent')
  const Child = modeller.createModel('child')

  Parent.reset()
  Child.reset()

  Child.belongsTo({
    model: Parent,
    as: 'parent',
    foreignKey: 'owner_id',
    immutable: true
  })
  hasRelation(t, Child, 'parent', BelongsTo)

  t.test('get', async t => {
    {
      Parent.reset([
        { name: 'get' }
      ])
      Child.reset([
        { name: 'get', owner_id: Parent.data[0].id }
      ])

      const child = await Child.findOne()
      const parent = await child.parent.get()
      t.ok(parent.id)
      t.equal(parent.name, 'get')
      t.equal(child.owner_id, parent.id)
    }

    {
      Parent.reset()

      const child = await Child.findOne()
      await t.rejects(child.parent.get(), /^Record not found$/)
    }
  })

  t.end()
})

tap.test('BelongsToMutable', async t => {
  const modeller = disco(driver())
  modeller.use(belongsTo)

  const Parent = modeller.createModel('parent')
  const Child = modeller.createModel('child')

  Parent.reset()
  Child.reset()

  Child.belongsTo({
    model: Parent
  })
  hasRelation(t, Child, 'parent', BelongsToMutable)

  t.test('build', async t => {
    Parent.reset()
    Child.reset([
      { name: 'build' }
    ])

    const child = await Child.findOne()

    const parent = await child.parent.build({
      name: 'build'
    })
    t.notOk(parent.id)
    t.notOk(child.parent_id)
    t.equal(parent.name, 'build')

    t.deepEqual(Parent.data, [])
    t.deepEqual(Child.data, [
      { id: 1, name: 'build' }
    ])
  })

  t.test('set', async t => {
    Parent.reset()
    Child.reset([
      { name: 'set' }
    ])

    const child = await Child.findOne()
    const parent = await Parent.create({
      name: 'set'
    })

    await child.parent.set(parent)
    t.ok(parent.id)
    t.equal(parent.name, 'set')
    t.equal(child.parent_id, parent.id)

    t.deepEqual(Parent.data, [
      { id: 1, name: 'set' }
    ])
    t.deepEqual(Child.data, [
      { id: 1, name: 'set', parent_id: 1 }
    ])
  })

  t.test('getOrCreate', async t => {
    Parent.reset()
    Child.reset([
      { name: 'getOrCreate' }
    ])

    const child = await Child.findOne()

    for (let i = 0; i < 2; i++) {
      const parent = await child.parent.getOrCreate({
        name: `getOrCreate ${i}`
      })
      t.ok(parent.id)
      t.equal(parent.name, 'getOrCreate 0')
      t.equal(child.parent_id, parent.id)

      t.deepEqual(Parent.data, [
        { id: 1, name: 'getOrCreate 0' }
      ])
      t.deepEqual(Child.data, [
        { id: 1, name: 'getOrCreate', parent_id: 1 }
      ])
    }
  })

  t.test('create', async t => {
    Parent.reset()
    Child.reset([
      { name: 'create' }
    ])

    const child = await Child.findOne()

    const parent = await child.parent.create({
      name: 'create'
    })
    t.ok(parent.id)
    t.equal(parent.name, 'create')
    t.equal(child.parent_id, parent.id)

    t.deepEqual(Parent.data, [
      { id: 1, name: 'create' }
    ])
    t.deepEqual(Child.data, [
      { id: 1, name: 'create', parent_id: 1 }
    ])
  })

  t.test('createOrUpdate', async t => {
    Parent.reset()
    Child.reset([
      { name: 'createOrUpdate' }
    ])

    const child = await Child.findOne()

    for (let i = 0; i < 2; i++) {
      const parent = await child.parent.createOrUpdate({
        name: `createOrUpdate ${i}`
      })
      t.ok(parent.id)
      t.equal(parent.name, `createOrUpdate ${i}`)
      t.equal(child.parent_id, parent.id)

      t.deepEqual(Parent.data, [
        { id: 1, name: `createOrUpdate ${i}` }
      ])
      t.deepEqual(Child.data, [
        { id: 1, name: 'createOrUpdate', parent_id: 1 }
      ])
    }
  })

  t.test('update', async t => {
    Parent.reset([
      { name: 'update' }
    ])
    Child.reset([
      { name: 'update', parent_id: 1 }
    ])

    const child = await Child.findOne()

    const parent = await child.parent.update({
      name: 'updated'
    })
    t.ok(parent.id)
    t.equal(parent.name, 'updated')
    t.equal(child.parent_id, parent.id)

    t.deepEqual(Parent.data, [
      { id: 1, name: 'updated' }
    ])
    t.deepEqual(Child.data, [
      { id: 1, name: 'update', parent_id: 1 }
    ])
  })

  t.test('remove', async t => {
    Parent.reset([
      { name: 'remove' }
    ])
    Child.reset([
      { name: 'remove', parent_id: 1 }
    ])

    const child = await Child.findOne()

    const parent = await child.parent.remove()
    t.notOk(parent.id)
    t.notOk(child.parent_id)
    t.equal(parent.name, 'remove')

    t.deepEqual(Parent.data, [])
    t.deepEqual(Child.data, [
      { id: 1, name: 'remove', parent_id: undefined }
    ])
  })

  t.end()
})
