'use strict'

class BelongsTo {
  constructor (foreignKey, instance, model) {
    this.foreignKey = foreignKey
    this.instance = instance
    this.model = model
  }

  get () {
    return this.model.findById(
      this.instance[this.foreignKey]
    )
  }
}

class BelongsToMutable extends BelongsTo {
  build (data) {
    return this.model.build(data)
  }

  set (item) {
    const { instance, foreignKey } = this
    instance[foreignKey] = item.id
    return instance.save()
  }

  async getOrCreate (data) {
    const id = this.instance[this.foreignKey]
    return id ? this.get() : this.create(data)
  }

  async create (data) {
    const item = await this.model.create(data)
    await this.set(item)
    return item
  }

  async createOrUpdate (data) {
    const id = this.instance[this.foreignKey]
    return id ? this.update(data) : this.create(data)
  }

  async update (changes) {
    const { foreignKey, instance, model } = this
    const id = instance[foreignKey]
    return model.updateById(id, changes)
  }

  async remove () {
    const { foreignKey, instance, model } = this
    const id = instance[foreignKey]
    instance[foreignKey] = undefined
    await instance.save()
    return model.removeById(id)
  }
}

function addBelongsTo (BaseModel) {
  Object.defineProperty(BaseModel, 'belongsTo', {
    value: function belongsTo ({
      model,
      as = model.tableName,
      foreignKey = `${as}_id`,
      immutable = false
    }) {
      const Factory = immutable ? BelongsTo : BelongsToMutable
      Object.defineProperty(this.prototype, as, {
        get () {
          return new Factory(foreignKey, this, model)
        }
      })
    }
  })

  return BaseModel
}

function middleware () {
  this.driver = addBelongsTo(this.driver)
}

middleware.addBelongsTo = addBelongsTo
middleware.BelongsTo = BelongsTo
middleware.BelongsToMutable = BelongsToMutable

module.exports = middleware
