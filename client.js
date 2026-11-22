/**
 * Browser half of `dsh-team`.
 *
 * Панель собирает задание для команды помощников: шаблон, роли, объём работы и
 * готовый текст, который остаётся вставить в поле ввода. Сборка текста —
 * единственная задача плагина, поэтому здесь нет ни маршрутов, ни хранилища:
 * история последних заданий лежит в localStorage.
 *
 * Страница оформлена в общем стиле: центрированный контейнер 960, шапка с
 * иконкой, чипом порядка запуска и кнопкой «Обновить», карточки-секции.
 */
window.__ModuleLoader__.load({
  id: 'dsh-team',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const h = React.createElement

    const NS = 'dshTeam'
    const HISTORY_KEY = 'dsh-team:history'
    const HISTORY_LIMIT = 5

    const en = {
      title: 'Team',
      heading: 'Team of assistants',
      hint: 'Pick a template, describe the task, choose the roles — the panel prepares a ready request. Paste it into the message field and send.',
      refresh: 'Refresh',
      chipParallel: 'In parallel',
      chipSequential: 'One by one',
      templateLabel: 'Template',
      templateCustom: 'Own task',
      templateReview: 'Code review',
      templateRefactor: 'Refactoring',
      templateResearch: 'Research',
      templateTests: 'Tests',
      templateHint: 'The template only fills the task and the roles — edit the text after choosing.',
      reviewSeed: 'Review the code in <path>: find errors and risks, suggest concrete fixes.',
      refactorSeed: 'Refactor <what>: keep behaviour, simplify the structure, run the tests.',
      researchSeed: 'Research <topic>: gather facts from the code and documentation, summarise the key findings.',
      testsSeed: 'Write tests for <what>: cover the main scenarios and edge cases.',
      taskLabel: 'Task for the team',
      taskPlaceholder: 'For example: review the sync plugin and suggest three fixes',
      rolesLabel: 'Roles',
      roleResearcher: 'Explorer — gathers facts and files',
      roleDoer: 'Doer — writes the code',
      roleChecker: 'Reviewer — checks the result',
      parallelLabel: 'Run in parallel',
      copy: 'Copy',
      copied: 'Copied — paste it into the message field',
      clear: 'Clear',
      previewLabel: 'Ready request',
      previewEmpty: 'Describe the task above to see the request.',
      needTask: 'Add a task description first.',
      historyLabel: 'Recent requests',
      historyEmpty: 'Copied requests appear here.',
      open: 'Open',
      collapse: 'Collapse',
    }
    const ru = {
      title: 'Команда',
      heading: 'Команда помощников',
      hint: 'Выберите шаблон, опишите задачу и отметьте роли — панель соберёт готовое задание. Останется вставить его в поле ввода и отправить.',
      refresh: 'Обновить',
      chipParallel: 'Параллельно',
      chipSequential: 'По очереди',
      templateLabel: 'Шаблон',
      templateCustom: 'Своя задача',
      templateReview: 'Ревью кода',
      templateRefactor: 'Рефакторинг',
      templateResearch: 'Исследование',
      templateTests: 'Тесты',
      templateHint: 'Шаблон заполняет только задачу и роли — текст можно править после выбора.',
      reviewSeed: 'Проведи ревью кода в <путь>: найди ошибки и риски, предложи конкретные правки.',
      refactorSeed: 'Отрефактори <что>: сохрани поведение, упрости структуру, прогони тесты.',
      researchSeed: 'Исследуй <тему>: собери факты из кода и документации, выдели ключевые выводы.',
      testsSeed: 'Напиши тесты для <что>: покрой основные сценарии и крайние случаи.',
      taskLabel: 'Задача для команды',
      taskPlaceholder: 'Например: проверь плагин синхронизации и предложи три исправления',
      rolesLabel: 'Роли',
      roleResearcher: 'Исследователь — собирает факты и файлы',
      roleDoer: 'Исполнитель — пишет код',
      roleChecker: 'Проверяющий — проверяет результат',
      parallelLabel: 'Запустить параллельно',
      copy: 'Скопировать',
      copied: 'Скопировано — вставьте в поле ввода',
      clear: 'Очистить',
      previewLabel: 'Готовое задание',
      previewEmpty: 'Опишите задачу выше, чтобы увидеть задание.',
      needTask: 'Сначала опишите задачу.',
      historyLabel: 'Последние задания',
      historyEmpty: 'Скопированные задания появятся здесь.',
      open: 'Открыть',
      collapse: 'Свернуть',
    }

    /** Шаблоны заданий: что подставить в поле и какие роли включить. */
    const TEMPLATES = [
      { id: 'custom', labelKey: 'templateCustom', seed: '', roles: { researcher: true, doer: true, checker: false }, parallel: true },
      { id: 'review', labelKey: 'templateReview', seedKey: 'reviewSeed', roles: { researcher: true, doer: false, checker: true }, parallel: true },
      { id: 'refactor', labelKey: 'templateRefactor', seedKey: 'refactorSeed', roles: { researcher: true, doer: true, checker: true }, parallel: false },
      { id: 'research', labelKey: 'templateResearch', seedKey: 'researchSeed', roles: { researcher: true, doer: false, checker: false }, parallel: true },
      { id: 'tests', labelKey: 'templateTests', seedKey: 'testsSeed', roles: { researcher: false, doer: true, checker: true }, parallel: false },
    ]

    /** Общий каркас страницы и элементов управления. */
    const CSS = `
.dsh-team-page{width:100%;max-width:960px;margin:0 auto;padding:24px 28px;padding-bottom:24px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px;min-width:0;min-height:0;max-height:100%;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3) transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px}
.dsh-team-page>*{flex:0 0 auto}
.dsh-team-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.dsh-team-head-icon{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;font-size:24px;line-height:1;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 34%, transparent)}
.dsh-team-head-text{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:2px}
.dsh-team-head-title{margin:0;font-size:20px;font-weight:600;line-height:26px}
.dsh-team-head-sub{margin:0;font-size:12.5px;font-weight:400;line-height:18px;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dsh-team-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}
.dsh-team-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;font-size:12px;line-height:18px;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);color:var(--dsw-alias-label-primary);white-space:nowrap}
.dsh-team-chip-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-brand-primary)}
.dsh-team-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:12px;align-items:stretch}
.dsh-team-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;min-width:0;min-height:0}
.dsh-team-card-title{display:flex;align-items:center;gap:8px;margin:0;font-size:14px;font-weight:600;line-height:20px}
.dsh-team-card-bar{flex:0 0 auto;width:3px;height:14px;border-radius:2px;background:var(--dsw-alias-brand-primary)}
.dsh-team-label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.dsh-team-hint{margin:0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin-top:auto}
.dsh-team-select{box-sizing:border-box;width:100%;height:34px;padding:0 10px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;color-scheme:inherit;cursor:pointer}
.dsh-team-area{box-sizing:border-box;display:block;width:100%;min-height:80px;max-height:220px;padding:8px 10px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:18px;resize:vertical;overflow-y:auto}
.dsh-team-select:focus-visible,.dsh-team-area:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-team-checks{display:flex;flex-direction:column;gap:8px}
.dsh-team-check{display:flex;align-items:center;gap:8px;font-size:12.5px;line-height:18px;cursor:pointer}
.dsh-team-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsh-team-card > .dsh-team-row:last-child{margin-top:auto}
.dsh-team-card > .dsh-team-pre{flex:1 1 auto}
.dsh-team-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:10px;border:1px solid var(--dsw-alias-border-l4);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;font-weight:600;line-height:1;white-space:nowrap;cursor:pointer;transition:background-color .12s ease,border-color .12s ease,color .12s ease}
.dsh-team-btn.is-primary{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);color:var(--dsw-alias-brand-primary)}
.dsh-team-btn.is-small{height:32px}
.dsh-team-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsh-team-btn.is-primary:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent)}
.dsh-team-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsh-team-btn:disabled{opacity:.55;cursor:default}
.dsh-team-pre{margin:0;padding:12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);font-family:inherit;font-size:12.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;max-height:200px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3) transparent;color:var(--dsw-alias-label-primary)}
.dsh-team-empty{margin:0;padding:10px 2px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:18px}
.dsh-team-history{display:flex;flex-direction:column;gap:4px;min-height:0;max-height:160px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3) transparent}
.dsh-team-history::-webkit-scrollbar,.dsh-team-pre::-webkit-scrollbar,.dsh-team-page::-webkit-scrollbar{width:6px;height:6px}
.dsh-team-history::-webkit-scrollbar-thumb,.dsh-team-pre::-webkit-scrollbar-thumb,.dsh-team-page::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l3);border-radius:999px}
.dsh-team-history::-webkit-scrollbar-track,.dsh-team-pre::-webkit-scrollbar-track,.dsh-team-page::-webkit-scrollbar-track{background:transparent}
.dsh-team-history-row{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12px;line-height:18px;cursor:pointer;background:transparent;text-align:left;color:var(--dsw-alias-label-primary);font-family:inherit}
.dsh-team-history-row:last-child{border-bottom:0}
.dsh-team-history-row:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent)}
.dsh-team-notice{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
@media (max-width:900px){.dsh-team-grid{grid-template-columns:1fr}}
@media (max-width:640px){.dsh-team-page{padding:18px 16px !important;padding-bottom:24px !important}.dsh-team-head-actions{margin-left:0;width:100%;justify-content:flex-start}.dsh-team-btn{max-width:100%}}
`

    let translate = (key) => key

    /** Собрать текст задания для команды. */
    function buildRequest({ task, roles, parallel }) {
      const t = translate
      const lines = []
      lines.push(t('heading'))
      lines.push('')
      lines.push(`${t('taskLabel')}: ${task.trim()}`)
      lines.push('')
      lines.push(`${t('rolesLabel')}:`)
      if (roles.researcher) lines.push(`- ${t('roleResearcher')}`)
      if (roles.doer) lines.push(`- ${t('roleDoer')}`)
      if (roles.checker) lines.push(`- ${t('roleChecker')}`)
      lines.push('')
      lines.push(
        parallel
          ? 'Запусти помощников параллельно (subagent), затем сведи результаты в один ответ.'
          : 'Запускай помощников по очереди, передавая результат следующему.',
      )
      lines.push('В конце укажи, что сделал каждый помощник и что удалось проверить.')
      return lines.join('\n')
    }

    function readHistory() {
      try {
        const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
        return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : []
      } catch {
        return []
      }
    }

    function writeHistory(entries) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)))
      } catch {
        // без хранилища история живёт до перезагрузки
      }
    }

    /** Карточка-секция с акцентной полоской у заголовка. */
    function Card({ title, className, children }) {
      return h(
        'section',
        { className: className === undefined ? 'dsh-team-card' : `dsh-team-card ${className}` },
        h('h2', { className: 'dsh-team-card-title' }, h('span', { className: 'dsh-team-card-bar' }), title),
        children,
      )
    }

    function TeamPage() {
      const t = (key) => translate(key)
      const [template, setTemplate] = React.useState('custom')
      const [task, setTask] = React.useState('')
      const [roles, setRoles] = React.useState(TEMPLATES[0].roles)
      const [parallel, setParallel] = React.useState(false)
      const [notice, setNotice] = React.useState('')
      const [history, setHistory] = React.useState(() => readHistory())

      const prepared = task.trim() === '' ? '' : buildRequest({ task, roles, parallel })

      const chooseTemplate = (id) => {
        setTemplate(id)
        const found = TEMPLATES.find((item) => item.id === id) ?? TEMPLATES[0]
        setRoles(found.roles)
        setParallel(found.parallel)
        if (found.seedKey !== undefined) setTask(t(found.seedKey))
        else if (id === 'custom') setTask('')
        setNotice('')
      }

      const toggleRole = (name) => setRoles((current) => ({ ...current, [name]: !current[name] }))

      const copy = async () => {
        if (prepared === '') {
          setNotice(t('needTask'))
          return
        }
        try {
          await navigator.clipboard.writeText(prepared)
        } catch {
          // буфер может быть недоступен — текст всё равно виден в предпросмотре
        }
        const entry = { task, roles, parallel, at: new Date().toISOString() }
        const next = [entry, ...history.filter((item) => item.task !== task)].slice(0, HISTORY_LIMIT)
        setHistory(next)
        writeHistory(next)
        setNotice(t('copied'))
      }

      const restore = (entry) => {
        setTask(entry.task)
        setRoles(entry.roles)
        setParallel(entry.parallel)
        setTemplate('custom')
        setNotice('')
      }

      /** «Обновить»: перечитать историю из localStorage и сбросить сообщение. */
      const refresh = () => {
        setHistory(readHistory())
        setNotice('')
      }

      const checkbox = (checked, onChange, label) =>
        h(
          'label',
          { className: 'dsh-team-check' },
          h('input', { type: 'checkbox', checked, onChange: (event) => onChange(event.target.checked) }),
          h('span', null, label),
        )

      return h(
        'div',
        {
          className: 'dsh-team-page',
          style: {
            width: '100%',
            maxWidth: 960,
            margin: '0 auto',
            padding: '24px 28px',
            paddingBottom: 24,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minWidth: 0,
            minHeight: 0,
            maxHeight: '100%',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          },
        },
        h('style', null, CSS),
        h(
          'header',
          { className: 'dsh-team-head' },
          h('span', { className: 'dsh-team-head-icon', 'aria-hidden': 'true' }, '👥'),
          h(
            'div',
            { className: 'dsh-team-head-text' },
            h('h1', { className: 'dsh-team-head-title' }, t('heading')),
            h('p', { className: 'dsh-team-head-sub' }, t('hint')),
          ),
          h(
            'div',
            { className: 'dsh-team-head-actions' },
            h(
              'span',
              { className: 'dsh-team-chip', role: 'status' },
              h('span', { className: 'dsh-team-chip-dot' }),
              parallel ? t('chipParallel') : t('chipSequential'),
            ),
            h(
              'button',
              { type: 'button', className: 'dsh-team-btn is-small', onClick: refresh },
              t('refresh'),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dsh-team-grid' },
          h(
            Card,
            { title: t('templateLabel') },
            h(
              'select',
              {
                className: 'dsh-team-select',
                value: template,
                'aria-label': t('templateLabel'),
                onChange: (event) => chooseTemplate(event.target.value),
              },
              ...TEMPLATES.map((item) => h('option', { key: item.id, value: item.id }, t(item.labelKey))),
            ),
            h('p', { className: 'dsh-team-hint' }, t('templateHint')),
          ),
          h(
            Card,
            { title: t('rolesLabel') },
            h(
              'div',
              { className: 'dsh-team-checks' },
              checkbox(roles.researcher, () => toggleRole('researcher'), t('roleResearcher')),
              checkbox(roles.doer, () => toggleRole('doer'), t('roleDoer')),
              checkbox(roles.checker, () => toggleRole('checker'), t('roleChecker')),
            ),
          ),
        ),
        h(
          Card,
          { title: t('taskLabel') },
          h('textarea', {
            className: 'dsh-team-area',
            placeholder: t('taskPlaceholder'),
            'aria-label': t('taskLabel'),
            value: task,
            onChange: (event) => setTask(event.target.value),
          }),
          h(
            'div',
            { className: 'dsh-team-checks' },
            checkbox(parallel, setParallel, t('parallelLabel')),
          ),
        ),
        h(
          Card,
          { title: t('previewLabel') },
          h('pre', { className: 'dsh-team-pre' }, prepared === '' ? t('previewEmpty') : prepared),
          h(
            'div',
            { className: 'dsh-team-row' },
            h('button', { type: 'button', className: 'dsh-team-btn is-primary', onClick: () => void copy() }, t('copy')),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-team-btn',
                onClick: () => {
                  setTask('')
                  setNotice('')
                },
              },
              t('clear'),
            ),
            notice !== '' ? h('span', { className: 'dsh-team-notice' }, notice) : null,
          ),
        ),
        h(
          Card,
          { title: t('historyLabel') },
          history.length === 0
            ? h('p', { className: 'dsh-team-empty' }, t('historyEmpty'))
            : h(
                'div',
                { className: 'dsh-team-history' },
                ...history.map((entry, index) =>
                  h(
                    'button',
                    {
                      key: `${entry.at}-${index}`,
                      type: 'button',
                      className: 'dsh-team-history-row',
                      onClick: () => restore(entry),
                      title: entry.task,
                    },
                    h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', flex: '0 0 auto' } }, entry.at.slice(11, 16)),
                    h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, entry.task),
                  ),
                ),
              ),
        ),
      )
    }

    /** Содержимое страницы своего плагина. */
    function DetailCard_dshteam(props) {
      const subject = props?.subject
      const packageName =
        subject?.kind === 'bundle' && typeof subject?.pkg?.name === 'string'
          ? subject.pkg.name
          : typeof subject?.id === 'string'
            ? subject.id
            : ''
      if (packageName !== 'dsh-team') return null
      return h(TeamPage)
    }

    function apply(ctx) {
      ctx.locale.register(NS, { en, ru })
      translate = ctx.locale.bind(NS)

      try {
        ctx.slots.inject('plugins.detail.section', () =>
          ctx.slots.register(
            {
              name: 'plugins.detail.section',
              id: 'dsh-team-detail',
              order: 45,
              locale: NS,
            },
            DetailCard_dshteam,
          ),
        )
      } catch (error) {
        console.error('[dsh-team] секция страницы недоступна:', error)
      }
    }

    exports.apply = apply
    exports.inject = ['slots', 'locale']
    exports.NS = NS
    exports.buildRequest = buildRequest
    exports.TEMPLATES = TEMPLATES
    return module.exports
  },
})
