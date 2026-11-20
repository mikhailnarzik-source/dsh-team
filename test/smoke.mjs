import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')

let loaded
globalThis.window = { __ModuleLoader__: { load: (entry) => { loaded = entry } } }
new Function(source)()
assert.equal(loaded?.id, 'dsh-team')

const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
}

const modules = { react: React }
const exported = loaded.factory((id) => {
  if (modules[id] === undefined) throw new Error(`неожиданный require: ${id}`)
  return modules[id]
})

const registrations = []
const ctx = {
  effect: (fn) => fn(),
  locale: {
    bind: (ns) => {
      assert.equal(ns, 'dshTeam')
      return (key) => key
    },
    register: (ns, a, b) => {
      const dictionary = b ?? a
      assert.equal(typeof dictionary, 'object')
      assert.ok(dictionary.ru !== undefined && dictionary.en !== undefined)
    },
  },
  slots: {
    inject: (name, register) => {
      assert.equal(name, 'plugins.item')
      register()
    },
    register: (options, component) => registrations.push({ options, component }),
  },
}

exported.apply(ctx)
assert.equal(registrations.length, 1)
assert.equal(registrations[0].options.name, 'plugins.item')

const card = registrations[0].component({})
assert.equal(card.type, 'div')

// сборка задания: все роли
const full = exported.buildRequest({
  task: 'починить синхронизацию',
  roles: { researcher: true, doer: true, checker: true },
  parallel: true,
})
assert.match(full, /починить синхронизацию/)
assert.match(full, /roleResearcher/)
assert.match(full, /roleDoer/)
assert.match(full, /roleChecker/)
assert.match(full, /параллельно/)

// сборка задания: без ролей, последовательно
const minimal = exported.buildRequest({ task: 'проверить', roles: {}, parallel: false })
assert.match(minimal, /по очереди/)
assert.ok(!minimal.includes('roleResearcher'))

console.log('team smoke: OK')
console.log('  карточка:', card.children.length, 'элементов | задание:', full.split('\n').length, 'строк')
