/**
 * Проверки рендера страницы «Команда»: адаптив по высоте и по ширине.
 *
 * Контекст: на странице плагина карточка «Последние задания» и поле задачи
 * уходили за нижний край окна — страница не умела сжиматься в контейнере и
 * росла вместе с историей. Эти тесты фиксируют исправление:
 *  - страница — flex-колонка с min-height:0 и нижним отступом 24 px;
 *  - список последних заданий ограничен 160 px и прокручивается сам;
 *  - поле задачи — resize:vertical, 80…220 px;
 *  - ничего не выходит за экран на 1280/1024/768/480 px.
 *
 * `client.js` исполняется в vm с поддельным window.__ModuleLoader__ и
 * минимальным React — разметка и CSS проверяются без браузера.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const SOURCE = await readFile(new URL('../client.js', import.meta.url), 'utf8')
const PACKAGE = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

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
function renderPage() {
  let registration
  const sandbox = {
    window: { __ModuleLoader__: { load(options) { registration = options } } },
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

test('«Последние задания»: список не выше 160 px и прокручивается сам', () => {
  assert.match(css, /\.dsh-team-history\{[^}]*max-height:160px[^}]*overflow-y:auto/, 'max-height:160px + overflow-y:auto')
  assert.match(css, /\.dsh-team-history\{[^}]*min-height:0/, 'у списка min-height:0')
  assert.match(css, /\.dsh-team-history\{[^}]*scrollbar-width:thin/, 'тонкий скроллбар')
  assert.match(css, /::-webkit-scrollbar\{width:6px;height:6px\}/, 'тонкий webkit-скроллбар')
  assert.match(css, /::-webkit-scrollbar-thumb\{[^}]*border-radius:999px/, 'скруглённый ползунок')
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
  assert.match(css, /\.dsh-team-card\{[^}]*min-width:0/, 'карточки сжимаются')
  assert.match(css, /\.dsh-team-btn\{[^}]*max-width:100%/, 'кнопки не шире строки')
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
  assert.equal(PACKAGE.version, '1.1.17')
})
