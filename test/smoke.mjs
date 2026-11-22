import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')

let loaded
globalThis.window = { __ModuleLoader__: { load: (entry) => { loaded = entry } } }
new Function(source)()
assert.equal(loaded?.id, 'dsh-team')

/** Минимальный React: хуки возвращают начальные значения и ничего не делают. */
const React = {
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

/** Развернуть функциональные компоненты в простые узлы { type, props, children }. */
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
  visit(node)
  for (const child of node.children) walk(child, visit)
}

function texts(node, found = []) {
  if (typeof node === 'string') {
    found.push(node)
    return found
  }
  if (node === null || node === undefined) return found
  for (const child of node.children) texts(child, found)
  return found
}

function find(node, predicate, found = []) {
  walk(node, (element) => {
    if (predicate(element)) found.push(element)
  })
  return found
}

const modules = { react: React }
const exported = loaded.factory((id) => {
  if (modules[id] === undefined) throw new Error(`неожиданный require: ${id}`)
  return modules[id]
})

const dictionaries = []
const registrations = []
const ctx = {
  effect: (fn) => fn(),
  locale: {
    bind: (ns) => {
      assert.equal(ns, 'dshTeam')
      return (key) => `dshTeam.${key}`
    },
    register: (ns, dictionary) => {
      assert.equal(ns, 'dshTeam')
      dictionaries.push(dictionary)
    },
  },
  slots: {
    inject: (name, register) => {
      assert.equal(name, 'plugins.detail.section')
      register()
    },
    register: (options, component) => registrations.push({ options, component }),
  },
}

exported.apply(ctx)
assert.equal(registrations.length, 1)
assert.equal(registrations[0].options.name, 'plugins.detail.section')
assert.equal(registrations[0].options.id, 'dsh-team-detail')

// Словари: одинаковый набор подписей, включая новые для шапки.
assert.equal(dictionaries.length, 1)
const { en, ru } = dictionaries[0]
assert.deepEqual(Object.keys(en).sort(), Object.keys(ru).sort(), 'словари описывают одни и те же строки')
for (const key of ['refresh', 'chipParallel', 'chipSequential']) {
  assert.equal(typeof en[key], 'string', `en: подпись ${key}`)
  assert.equal(typeof ru[key], 'string', `ru: подпись ${key}`)
}

// Страница рисуется только для своего плагина.
const component = registrations[0].component
assert.equal(component({ subject: { kind: 'bundle', pkg: { name: 'dsh-other' } } }), null)
assert.equal(component({ subject: { id: 'dsh-other' } }), null)
const page = render(component({ subject: { kind: 'bundle', pkg: { name: 'dsh-team' } } }))
assert.equal(page.type, 'div')

// Каркас: центрированный контейнер maxWidth 960.
assert.equal(page.props.className, 'dsh-team-page')
assert.equal(page.props.style.maxWidth, 960)
assert.equal(page.props.style.margin, '0 auto')
assert.equal(page.props.style.padding, '24px 28px 40px')
assert.equal(page.props.style.flexDirection, 'column')

// Шапка: иконка 52, заголовок, подзаголовок, чип и «Обновить».
const header = find(page, (element) => element.props.className === 'dsh-team-head')[0]
assert.ok(header !== undefined, 'шапка страницы')
const icon = find(page, (element) => element.props.className === 'dsh-team-head-icon')[0]
assert.equal(texts(icon).join(''), '👥')
const title = find(page, (element) => element.props.className === 'dsh-team-head-title')[0]
assert.equal(texts(title).join(''), 'dshTeam.heading')
const subtitle = find(page, (element) => element.props.className === 'dsh-team-head-sub')[0]
assert.equal(texts(subtitle).join(''), 'dshTeam.hint')
const chip = find(page, (element) => element.props.className === 'dsh-team-chip')[0]
assert.ok(chip !== undefined, 'чип статуса')
assert.equal(texts(chip).join(''), 'dshTeam.chipSequential')
const style = find(page, (element) => element.type === 'style')[0]
const css = texts(style).join('')
assert.match(css, /\.dsh-team-head-icon\{[^}]*width:52px[^}]*height:52px/)
assert.match(css, /max-width:960px/)
assert.match(css, /border-radius:14px/)
assert.match(css, /var\(--dsw-alias-bg-layer-1\)/)
assert.match(css, /:focus-visible/)
assert.match(css, /:disabled\{opacity:\.55/)
assert.match(css, /@media \(max-width:760px\)/)

const refresh = find(page, (element) => element.type === 'button' && texts(element).join('') === 'dshTeam.refresh')[0]
assert.ok(refresh !== undefined, 'кнопка «Обновить»')
assert.equal(refresh.props.className, 'dsh-team-btn is-small')

// Карточки-секции: шаблон, роли, задача, готовое задание, история.
const cards = find(page, (element) => String(element.props.className ?? '').startsWith('dsh-team-card') && element.type === 'section')
assert.equal(cards.length, 5, 'пять карточек-секций')
const cardTitles = find(page, (element) => element.props.className === 'dsh-team-card-title').map((element) => texts(element).join(''))
assert.ok(cardTitles.includes('dshTeam.templateLabel'))
assert.ok(cardTitles.includes('dshTeam.rolesLabel'))
assert.ok(cardTitles.includes('dshTeam.taskLabel'))
assert.ok(cardTitles.includes('dshTeam.previewLabel'))
assert.ok(cardTitles.includes('dshTeam.historyLabel'))
assert.equal(find(page, (element) => element.props.className === 'dsh-team-card-bar').length, 5, 'полоска у каждого заголовка')

// Все поля и кнопки на месте.
const select = find(page, (element) => element.props.className === 'dsh-team-select')[0]
assert.ok(select !== undefined, 'выбор шаблона')
assert.equal(select.props.children.length, exported.TEMPLATES.length, 'все шаблоны в списке')
const area = find(page, (element) => element.props.className === 'dsh-team-area')[0]
assert.ok(area !== undefined, 'поле задачи')
assert.equal(area.props.placeholder, 'dshTeam.taskPlaceholder')
assert.equal(find(page, (element) => element.type === 'input' && element.props.type === 'checkbox').length, 4, 'три роли и параллельность')
const labels = texts(page).join(' ')
for (const key of ['dshTeam.copy', 'dshTeam.clear', 'dshTeam.parallelLabel', 'dshTeam.roleResearcher', 'dshTeam.roleDoer', 'dshTeam.roleChecker', 'dshTeam.historyEmpty']) {
  assert.ok(labels.includes(key), `на странице есть строка ${key}`)
}

// Сборка задания: все роли.
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

// Сборка задания: без ролей, последовательно.
const minimal = exported.buildRequest({ task: 'проверить', roles: {}, parallel: false })
assert.match(minimal, /по очереди/)
assert.ok(!minimal.includes('roleResearcher'))

// Шаблоны: у каждого есть подпись и набор ролей.
assert.ok(Array.isArray(exported.TEMPLATES))
assert.equal(exported.TEMPLATES.length, 5)
for (const template of exported.TEMPLATES) {
  assert.equal(typeof template.labelKey, 'string')
  assert.equal(typeof template.roles, 'object')
  assert.equal(typeof template.parallel, 'boolean')
}
assert.deepEqual(
  exported.TEMPLATES.map((item) => item.id),
  ['custom', 'review', 'refactor', 'research', 'tests'],
)

console.log('team smoke: OK')
console.log('  страница:', page.props.className, '| карточки:', cards.length, '| задание:', full.split('\n').length, 'строк')
