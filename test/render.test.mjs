/**
 * Проверки рендера страницы «Команда»: история, кнопки-чипы, адаптив.
 *
 * Контекст: блок «Последние задания» был тесной строкой с обрезанным текстом,
 * а чип порядка запуска — пилюлей. Эти тесты фиксируют текущий вид:
 *  - история — список строк-карточек 10/12 с временем 44 px и текстом в одну
 *    строку с ellipsis и title, высота списка до 200 px со скроллом;
 *  - пустая история — состояние с иконкой и подсказкой;
 *  - чип «Параллельно»/«По очереди» — по виду кнопка 32 px, radius 10, рамка,
 *    мягкая заливка и точка (не пилюля 999 px);
 *  - кнопки — единая система v2: 36/32 px, radius 10;
 *  - ничего не выходит за экран на 1280/1024/768/480 px.
 *
 * `client.js` исполняется в vm с поддельным window.__ModuleLoader__,
 * минимальным React и localStorage — разметка и CSS проверяются без браузера.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const SOURCE = await readFile(new URL('../client.js', import.meta.url), 'utf8')
const PACKAGE = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

/** Пример истории: две записи с разным временем и длинным текстом. */
const HISTORY = [
  {
    task: 'Проведи ревью кода в src/plugins/sync: найди ошибки и риски, предложи конкретные правки.',
    roles: { researcher: true, doer: false, checker: true },
    parallel: true,
    at: '2026-11-22T09:05:00.000Z',
  },
  {
    task: 'Напиши тесты для сборки задания: покрой основные сценарии и крайние случаи.',
    roles: { researcher: false, doer: true, checker: true },
    parallel: false,
    at: '2026-11-21T18:42:00.000Z',
  },
]

/** Хранилище под localStorage: история лежит в ключе `dsh-team:history`. */
function makeStorage(entries) {
  const map = new Map()
  if (entries !== undefined) map.set('dsh-team:history', JSON.stringify(entries))
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  }
}

/** Поддельный React: хуки отдают начальные значения и ничего не делают. */
function makeReact() {
  return {
    createElement(type, props, ...children) {
      return {
        type,
        props: {
          ...(props ?? {}),
          children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children,
        },
      }
    },
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
    useEffect() {},
    useCallback(fn) { return fn },
    useMemo(fn) { return fn() },
    useRef(value) { return { current: value } },
  }
}

/** Загрузить client.js и отрисовать страницу плагина в простое дерево. */
function renderPage(historyEntries) {
  let registration
  const storage = makeStorage(historyEntries)
  const sandbox = {
    window: { __ModuleLoader__: { load(options) { registration = options } }, localStorage: storage },
    localStorage: storage,
    console,
  }
  vm.runInNewContext(SOURCE, sandbox, { filename: 'client.js' })

  const module = registration.factory((name) => {
    if (name === 'react') return makeReact()
    throw new Error(`неожиданный require: ${name}`)
  })

  const slots = []
  module.apply({
    locale: {
      register() {},
      bind() { return (key) => `t:${key}` },
    },
    slots: {
      inject(name, callback) { callback() },
      register(options, component) { slots.push({ options, component }); return () => {} },
    },
  })

  const section = slots.find((item) => item.options.name === 'plugins.detail.section')
  assert.ok(section, 'секция plugins.detail.section не зарегистрирована')
  const tree = section.component({ subject: { kind: 'bundle', pkg: { name: 'dsh-team' } } })
  return expand(tree)
}

/** Развернуть функциональные компоненты в узлы { type, props, children }. */
function expand(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (Array.isArray(node)) return node.map(expand)
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node.type === 'function') return expand(node.type(node.props ?? {}))
  const raw = node.props?.children
  const list = raw === undefined ? [] : Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return { type: node.type, props: node.props ?? {}, children: list.map(expand) }
}

function walk(node, visit) {
  if (node === null || node === undefined || typeof node !== 'object') return
  visit(node)
  for (const child of node.children) walk(child, visit)
}

function findAll(node, predicate) {
  const found = []
  walk(node, (element) => {
    if (predicate(element)) found.push(element)
  })
  return found
}

function textsOf(node, out = []) {
  if (typeof node === 'string') { out.push(node); return out }
  if (node === null || node === undefined || typeof node !== 'object') return out
  for (const child of node.children) textsOf(child, out)
  return out
}

/** Весь CSS страницы: содержимое тега <style>. */
function pageCss(page) {
  return findAll(page, (element) => element.type === 'style').map((element) => textsOf(element).join('')).join('\n')
}

const page = renderPage()
const pageNode = findAll(page, (element) => element.props?.className === 'dsh-team-page')[0]
const css = pageCss(page)

test('страница — flex-колонка, сжимается в контейнере и не уходит за низ', () => {
  assert.ok(pageNode, 'нет контейнера страницы dsh-team-page')
  assert.equal(pageNode.props.style.display, 'flex')
  assert.match(css, /\.dsh-team-page>\*\{flex:0 0 auto\}/, 'карточки не сжимаются: страница прокручивается, а не сплющивается')
  assert.match(css, /\.dsh-team-page\{[^}]*overflow-y:auto/, 'страница сама прокручивается в ограниченном контейнере')
  assert.equal(pageNode.props.style.flexDirection, 'column')
  assert.equal(pageNode.props.style.minHeight, 0, 'min-height:0 обязателен, иначе страница не сжимается')
  assert.equal(pageNode.props.style.minWidth, 0)
  assert.equal(pageNode.props.style.maxHeight, '100%')
  assert.equal(pageNode.props.style.overflowY, 'auto')
  assert.equal(pageNode.props.style.padding, '24px 28px')
  assert.equal(pageNode.props.style.paddingBottom, 40, 'нижний отступ страницы 40 px')

  assert.match(
    css,
    /\.dsh-team-page\{[^}]*min-height:0[^}]*max-height:100%[^}]*overflow-y:auto/,
    'CSS страницы тоже ограничивает высоту',
  )
  assert.match(css, /\.dsh-team-page\{[^}]*padding:24px 28px[^}]*padding-bottom:40px/, 'нижний отступ 40 px в CSS')
  assert.doesNotMatch(css, /\.dsh-team-page\{[^}]*height:100vh/, 'страница не привязана к 100vh')
})

test('«Последние задания»: список не выше 200 px и прокручивается сам', () => {
  assert.match(css, /\.dsh-team-history\{[^}]*max-height:200px[^}]*overflow-y:auto/, 'max-height:200px + overflow-y:auto')
  assert.match(css, /\.dsh-team-history\{[^}]*min-height:0/, 'у списка min-height:0')
  assert.match(css, /\.dsh-team-history\{[^}]*scrollbar-width:thin/, 'тонкий скроллбар')
  assert.match(css, /::-webkit-scrollbar\{width:6px;height:6px\}/, 'тонкий webkit-скроллбар')
  assert.match(css, /::-webkit-scrollbar-thumb\{[^}]*border-radius:999px/, 'скруглённый ползунок')
})

test('строка истории — карточка: время 44 px secondary 600, текст в одну строку с ellipsis', () => {
  const historyPage = renderPage(HISTORY)
  const rows = findAll(historyPage, (element) => element.props?.className === 'dsh-team-history-row')
  assert.equal(rows.length, HISTORY.length, 'по строке на запись истории')

  assert.match(css, /\.dsh-team-history-row\{[^}]*display:flex[^}]*align-items:center[^}]*padding:10px 12px[^}]*border-radius:10px/, 'строка — flex-карточка 10/12 с радиусом 10')
  assert.match(css, /\.dsh-team-history-row\{[^}]*border-bottom:1px solid var\(--dsw-alias-border-l1\)/, 'между строками разделитель')
  assert.match(css, /\.dsh-team-history-row:hover\{background:color-mix\(in srgb, var\(--dsw-alias-label-primary\) 5%/, 'hover-фон строки')
  assert.match(
    css,
    /\.dsh-team-history-time\{flex:0 0 44px;width:44px;[^}]*font-size:12px;font-weight:600;[^}]*color:var\(--dsw-alias-label-secondary\)/,
    'время: фиксированные 44 px, 12/600, secondary',
  )
  assert.match(
    css,
    /\.dsh-team-history-text\{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap/,
    'текст тянется, обрезается в одну строку',
  )

  for (const [index, row] of rows.entries()) {
    const entry = HISTORY[index]
    assert.equal(row.type, 'button', 'строка кликабельна кнопкой')
    assert.equal(row.props.style, undefined, 'строка оформлена классом, а не inline-стилями')
    assert.equal(row.props.title, entry.task, 'полный текст в title')
    const time = row.children.find((child) => child?.props?.className === 'dsh-team-history-time')
    const text = row.children.find((child) => child?.props?.className === 'dsh-team-history-text')
    assert.ok(time, 'есть колонка времени')
    assert.ok(text, 'есть колонка текста')
    const date = new Date(entry.at)
    const expected = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    assert.equal(textsOf(time).join(''), expected, 'время в локальной зоне')
    assert.equal(textsOf(text).join(''), entry.task, 'текст целиком в разметке, обрезка — в CSS')
    assert.equal(text.props.style, undefined, 'обрезка не inline-стилями')
  }

  const container = findAll(historyPage, (element) => element.props?.className === 'dsh-team-history')[0]
  assert.ok(container, 'контейнер списка истории')
})

test('пустая история: состояние с иконкой и подсказкой', () => {
  const emptyPage = renderPage([])
  const empty = findAll(emptyPage, (element) => element.props?.className === 'dsh-team-history-empty')[0]
  assert.ok(empty, 'пустое состояние истории')
  const icon = findAll(empty, (element) => element.props?.className === 'dsh-team-history-empty-icon')[0]
  assert.ok(icon, 'иконка пустого состояния')
  assert.equal(textsOf(icon).join(''), '🕘')
  const hint = findAll(empty, (element) => element.props?.className === 'dsh-team-history-empty-text')[0]
  assert.equal(textsOf(hint).join(''), 't:historyEmpty')
  assert.equal(findAll(emptyPage, (element) => element.props?.className === 'dsh-team-history').length, 0, 'пустой список не рисуется')

  assert.match(css, /\.dsh-team-history-empty\{[^}]*border:1px dashed var\(--dsw-alias-border-l2\)[^}]*border-radius:10px[^}]*text-align:center/)
  assert.match(css, /\.dsh-team-history-empty-icon\{[^}]*width:32px;height:32px/, 'иконка 32 px')
  assert.match(css, /\.dsh-team-history-empty-text\{[^}]*color:var\(--dsw-alias-label-secondary\)/)
})

test('чип порядка запуска — по виду кнопка 32 px, radius 10, рамка, мягкая заливка, точка', () => {
  assert.match(
    css,
    /\.dsh-team-chip\{[^}]*display:inline-flex[^}]*align-items:center[^}]*height:32px[^}]*padding:0 12px[^}]*border-radius:10px/,
    'чип-кнопка 32 px с радиусом 10',
  )
  assert.match(
    css,
    /\.dsh-team-chip\{[^}]*border:1px solid color-mix\(in srgb, var\(--dsw-alias-brand-primary\) 40%, transparent\)/,
    'у чипа есть рамка',
  )
  assert.match(
    css,
    /\.dsh-team-chip\{[^}]*background:color-mix\(in srgb, var\(--dsw-alias-brand-primary\) 12%, transparent\)/,
    'мягкая заливка чипа',
  )
  assert.match(css, /\.dsh-team-chip-dot\{[^}]*width:8px;height:8px;border-radius:50%/, 'точка чипа')
  assert.doesNotMatch(css, /\.dsh-team-chip\{[^}]*border-radius:999px/, 'чип не пилюля')

  const chip = findAll(page, (element) => element.props?.className === 'dsh-team-chip')[0]
  assert.ok(chip, 'чип статуса на странице')
  assert.equal(chip.props.role, 'status')
  assert.ok(findAll(chip, (element) => element.props?.className === 'dsh-team-chip-dot')[0], 'точка внутри чипа')
  assert.equal(textsOf(chip).join(''), 't:chipSequential')
})

test('поле задачи: resize:vertical, min-height 80 и max-height 220', () => {
  assert.match(css, /\.dsh-team-area\{[^}]*min-height:80px[^}]*max-height:220px/, '80…220 px')
  assert.match(css, /\.dsh-team-area\{[^}]*resize:vertical/, 'тянется только вниз')
  assert.match(css, /\.dsh-team-area\{[^}]*overflow-y:auto/)
  const area = findAll(page, (element) => element.props?.className === 'dsh-team-area')[0]
  assert.ok(area, 'поле задачи на месте')
})

test('«Готовое задание» не растягивает страницу бесконечно', () => {
  assert.match(css, /\.dsh-team-pre\{[^}]*max-height:200px[^}]*overflow-y:auto/, 'у предпросмотра ограничена высота')
})

test('адаптив по ширине: 1280/1024/768/480 без горизонтального вылета', () => {
  assert.match(css, /\.dsh-team-page\{[^}]*width:100%[^}]*max-width:960px[^}]*box-sizing:border-box/)
  assert.match(css, /\.dsh-team-page\{[^}]*min-width:0/, 'страница сжимается по ширине')
  assert.match(css, /\.dsh-team-grid\{[^}]*repeat\(auto-fit, minmax\(min\(100%, 280px\), 1fr\)\)/)
  assert.match(css, /@media \(max-width:900px\)\{\.dsh-team-grid\{grid-template-columns:1fr\}\}/, 'на 900 px — одна колонка')
  assert.match(css, /@media \(max-width:640px\)\{\.dsh-team-page\{padding:18px 16px !important;padding-bottom:24px !important\}/, 'на 640 px — компактные отступы и низ 24 px')
  assert.match(css, /@media \(max-width:480px\)\{\.dsh-team-page\{padding:14px 12px !important;padding-bottom:20px !important\}/, 'на 480 px — ещё компактнее')
  assert.match(css, /@media \(max-width:480px\)\{[^@]*\.dsh-team-btn\{width:100%/, 'на 480 px кнопки на всю строку')
  assert.match(css, /@media \(max-width:480px\)\{[^@]*\.dsh-team-history-time\{flex-basis:40px;width:40px/, 'на 480 px колонка времени уже')
  assert.match(css, /\.dsh-team-card\{[^}]*min-width:0/, 'карточки сжимаются')
  assert.match(css, /\.dsh-team-btn\{[^}]*max-width:100%/, 'кнопки не шире строки')
  assert.match(css, /\.dsh-team-history-row\{[^}]*box-sizing:border-box[^}]*width:100%/, 'строка истории не шире контейнера')
  assert.match(css, /\.dsh-team-history-text\{[^}]*min-width:0/, 'текст истории сжимается в ellipsis')
  assert.doesNotMatch(css, /(?<![-a-z])width:\s*\d{3,}px/, 'нет фиксированных ширин больше 300 px')
})

test('кнопки: единая система из спеки v2', () => {
  assert.match(css, /\.dsh-team-btn\{[^}]*height:36px[^}]*padding:0 14px[^}]*border-radius:10px[^}]*white-space:nowrap/)
  assert.match(css, /\.dsh-team-btn\.is-small\{height:32px\}/)
  assert.match(css, /\.dsh-team-btn\.is-primary\{[^}]*brand-primary\) 18%[^}]*color:var\(--dsw-alias-brand-primary\)/)
  assert.doesNotMatch(css, /color:#fff|background:#fff/, 'нет белого текста/фона')
  const buttons = findAll(
    page,
    (element) => element.type === 'button' && String(element.props?.className ?? '').startsWith('dsh-team-btn'),
  )
  assert.ok(buttons.length >= 3, 'на странице есть кнопки единой системы')
  for (const button of buttons) {
    assert.equal(button.props.style, undefined, 'кнопки оформлены классом, а не inline-стилями')
  }
})

test('версия плагина поднята на +0.0.1', () => {
  assert.match(PACKAGE.version, /^\d+\.\d+\.\d+$/)
  assert.equal(PACKAGE.version, '1.1.19')
})
