// Собственная панель «Команда» в левой панели: клик показывает только сборку
// задания (без блоков плагин-менеджера), строка в левой панели живёт по
// закреплению из общего ключа dsh-polish и реагирует на событие panels-changed.
//
//   node --test test/panel.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SOURCE = await readFile(join(ROOT, 'client.js'), 'utf8')
const PACKAGE = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))

const PANEL_ID = 'plugin-team'
const PANEL_KEY = 'dsh-polish:panel-visibility'
const PANELS_EVENT = 'dsh-polish:panels-changed'

/** Минимальный React: хуки возвращают начальные значения и ничего не делают. */
const fakeReact = {
  createElement: (type, props, ...children) => ({
    type,
    props: {
      ...(props ?? {}),
      children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children,
    },
  }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
}

function render(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (Array.isArray(node)) return node.map(render)
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node.type === 'function') return render(node.type(node.props ?? {}))
  const raw = node.props?.children
  const list = raw === undefined ? [] : Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return { type: node.type, props: node.props ?? {}, children: list.map(render) }
}

function walk(node, visit) {
  if (node === null || node === undefined || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit)
    return
  }
  visit(node)
  for (const child of node.children) walk(child, visit)
}

function texts(node, found = []) {
  if (typeof node === 'string') {
    found.push(node)
    return found
  }
  if (node === null || node === undefined) return found
  if (Array.isArray(node)) {
    for (const item of node) texts(item, found)
    return found
  }
  for (const child of node.children) texts(child, found)
  return found
}

function find(node, predicate) {
  const found = []
  walk(node, (element) => {
    if (predicate(element)) found.push(element)
  })
  return found
}

/** Хранилище настроек панелей: обычная Map под localStorage. */
function makeStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  }
}

/** Загрузить client.js с поддельным localStorage и слушателями window. */
function boot(panelState, rawState) {
  const storage = makeStorage()
  if (rawState !== undefined) storage.setItem(PANEL_KEY, rawState)
  else if (panelState !== undefined) storage.setItem(PANEL_KEY, JSON.stringify(panelState))

  const listeners = new Map()
  let captured
  const window = {
    __ModuleLoader__: { load: (options) => { captured = options } },
    localStorage: storage,
    addEventListener(type, listener) {
      const list = listeners.get(type) ?? []
      list.push(listener)
      listeners.set(type, list)
    },
    removeEventListener(type, listener) {
      const list = listeners.get(type) ?? []
      listeners.set(type, list.filter((item) => item !== listener))
    },
  }
  vm.runInNewContext(SOURCE, { window, console: { error: () => {}, warn: () => {}, log: () => {} } }, {
    filename: 'client.js',
  })
  assert.ok(captured !== undefined, 'ModuleLoader.load вызван')
  const module = captured.factory((name) => {
    if (name === 'react') return fakeReact
    throw new Error(`неожиданный модуль ${name}`)
  })

  const registered = []
  let cleanup = null
  const ctx = {
    locale: {
      register() {},
      bind: () => (key) => `team.${key}`,
    },
    slots: {
      inject(name, callback) {
        return callback()
      },
      register(options, component) {
        const entry = { options, component, disposed: false }
        registered.push(entry)
        return () => {
          entry.disposed = true
        }
      },
    },
    effect(fn) {
      cleanup = fn()
      return () => {}
    },
  }
  module.apply(ctx)

  return {
    registered,
    storage,
    dispatch(type) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener({ type })
    },
    listenerCount(type) {
      return (listeners.get(type) ?? []).length
    },
    unload() {
      if (typeof cleanup === 'function') cleanup()
      cleanup = null
    },
    main() {
      return registered.find((entry) => entry.options.name === 'main')
    },
    panels() {
      return registered.filter((entry) => entry.options.name === 'sidebar.panellist')
    },
  }
}

test('main-панель: ключ plugin-team зарегистрирован всегда', () => {
  for (const state of [undefined, { visible: [], pinned: [] }, { visible: ['team'], pinned: ['team'] }]) {
    const scenario = boot(state)
    const main = scenario.main()
    assert.ok(main !== undefined, 'main-панель зарегистрирована')
    assert.equal(main.options.key, PANEL_ID)
    assert.equal(typeof main.component, 'function')
  }
})

test('страница панели: сборка задания без блоков плагин-менеджера', () => {
  const scenario = boot({ visible: ['team'], pinned: ['team'] })
  const page = render(fakeReact.createElement(scenario.main().component, {}))

  // Центрированная страница 960 с шапкой: эмодзи, название, подзаголовок.
  const pageNode = find(page, (element) => element.props.className === 'dsh-team-page')[0]
  assert.ok(pageNode !== undefined, 'контейнер страницы dsh-team-page')
  assert.equal(pageNode.props.style.maxWidth, 960)
  assert.equal(pageNode.props.style.margin, '0 auto')
  assert.equal(pageNode.props.style.padding, '24px 28px')
  assert.equal(pageNode.props.style.paddingBottom, 40)
  assert.equal(texts(find(page, (element) => element.props.className === 'dsh-team-head-icon')[0]).join(''), '👥')
  assert.equal(texts(find(page, (element) => element.props.className === 'dsh-team-head-title')[0]).join(''), 'team.heading')
  assert.equal(texts(find(page, (element) => element.props.className === 'dsh-team-head-sub')[0]).join(''), 'team.hint')

  // Функциональность плагина на месте: шаблон, роли, задача, предпросмотр, история.
  const labels = texts(page).join(' ')
  for (const key of ['team.templateLabel', 'team.rolesLabel', 'team.taskLabel', 'team.previewLabel', 'team.historyLabel', 'team.copy']) {
    assert.ok(labels.includes(key), `есть строка ${key}`)
  }
  assert.equal(find(page, (element) => element.props.className === 'dsh-team-card').length >= 3, true)

  // Служебных блоков плагин-менеджера нет.
  assert.equal(find(page, (element) => element.props['data-detail-document'] !== undefined).length, 0)
  assert.equal(find(page, (element) => element.props['data-detail-sections'] !== undefined).length, 0)
  const managerClasses = find(page, (element) => /detail(Desc|Document|Sections|Title|Source|Version)/i.test(String(element.props.className ?? '')))
  assert.equal(managerClasses.length, 0, 'нет классов страницы плагин-менеджера')
})

test('строки sidebar нет, пока панель не закреплена; main остаётся', () => {
  const scenario = boot({ visible: ['team'], pinned: [] })
  assert.equal(scenario.panels().length, 0, 'незакреплённая панель не попадает в левую панель')
  assert.ok(scenario.main() !== undefined, 'main-панель всё равно доступна')
})

test('закреплённая панель: строка sidebar с id plugin-team, order 24 и подписью', () => {
  const scenario = boot({ visible: ['team'], pinned: ['team'] })
  const rows = scenario.panels()
  assert.equal(rows.length, 1, 'одна строка левой панели')
  const [row] = rows
  assert.equal(row.options.id, PANEL_ID)
  assert.equal(row.options.order, 24)
  assert.equal(row.options.name, 'sidebar.panellist')
  assert.equal(typeof row.options.label, 'function')
  assert.equal(row.options.label(), 'team.title')
  assert.equal(typeof row.component, 'function')

  // Иконка — эмодзи, размер берётся из props хоста.
  const icon = render(fakeReact.createElement(row.component, { size: 18 }))
  assert.equal(texts(icon).join(''), '👥')
  assert.equal(icon.props.style.width, 18)
  assert.equal(icon.props.style.height, 18)
})

test('без ключа dsh-polish панель считается закреплённой (состояние по умолчанию)', () => {
  const scenario = boot(undefined)
  assert.equal(scenario.panels().length, 1, 'по умолчанию строка видна — как в dsh-polish')
  assert.equal(scenario.storage.getItem(PANEL_KEY), null, 'ключ по умолчанию не пишется')
})

test('реакция на dsh-polish:panels-changed: закрепили — строка появилась, открепили — снята', () => {
  const scenario = boot({ visible: ['team'], pinned: [] })
  assert.equal(scenario.panels().length, 0)
  assert.equal(scenario.listenerCount(PANELS_EVENT), 1, 'слушатель события подписан')

  scenario.storage.setItem(PANEL_KEY, JSON.stringify({ visible: ['team'], pinned: ['team'] }))
  scenario.dispatch(PANELS_EVENT)
  assert.equal(scenario.panels().length, 1, 'строка появилась без перезагрузки')
  const row = scenario.panels()[0]

  // Повторное событие без изменений не плодит дубли.
  scenario.dispatch(PANELS_EVENT)
  assert.equal(scenario.panels().length, 1, 'дублей нет')

  // Открепили: регистрация снята через disposer.
  scenario.storage.setItem(PANEL_KEY, JSON.stringify({ visible: ['team'], pinned: [] }))
  scenario.dispatch(PANELS_EVENT)
  assert.equal(row.disposed, true, 'disposer вызван')

  // Вернули: строка регистрируется заново.
  scenario.storage.setItem(PANEL_KEY, JSON.stringify({ visible: ['team'], pinned: ['team'] }))
  scenario.dispatch(PANELS_EVENT)
  assert.equal(scenario.panels().filter((entry) => entry.disposed === false).length, 1, 'строка вернулась')
})

test('выгрузка плагина снимает слушатель и строку панели', () => {
  const scenario = boot({ visible: ['team'], pinned: ['team'] })
  const row = scenario.panels()[0]
  scenario.unload()
  assert.equal(scenario.listenerCount(PANELS_EVENT), 0, 'слушатель снят')
  assert.equal(row.disposed, true, 'строка левой панели снята')
})

test('версия поднята на +0.0.1', () => {
  assert.equal(PACKAGE.version, '1.1.17')
})
