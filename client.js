/**
 * Browser half of `dsh-team`.
 *
 * Панель собирает задание для команды помощников: шаблон, роли, объём работы и
 * готовый текст, который остаётся вставить в поле ввода. Сборка текста —
 * единственная задача плагина, поэтому здесь нет ни маршрутов, ни хранилища:
 * история последних заданий лежит в localStorage.
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
      templateLabel: 'Template',
      templateCustom: 'Own task',
      templateReview: 'Code review',
      templateRefactor: 'Refactoring',
      templateResearch: 'Research',
      templateTests: 'Tests',
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
      templateLabel: 'Шаблон',
      templateCustom: 'Своя задача',
      templateReview: 'Ревью кода',
      templateRefactor: 'Рефакторинг',
      templateResearch: 'Исследование',
      templateTests: 'Тесты',
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

    const S = {
      card: { display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, maxWidth: 640 },
      label: { fontSize: 12, fontWeight: 600, opacity: 0.8 },
      area: {
        width: '100%',
        boxSizing: 'border-box',
        minHeight: 64,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid rgba(128,128,128,0.35)',
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        fontSize: 13,
        resize: 'vertical',
      },
      select: {
        width: '100%',
        boxSizing: 'border-box',
        height: 32,
        padding: '0 8px',
        borderRadius: 8,
        border: '1px solid rgba(128,128,128,0.35)',
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        fontSize: 13,
        colorScheme: 'inherit',
      },
      row: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
      button: {
        padding: '6px 14px',
        borderRadius: 8,
        border: '1px solid rgba(128,128,128,0.35)',
        background: 'rgba(128,128,128,0.12)',
        color: 'inherit',
        font: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      },
      primary: {
        padding: '6px 14px',
        borderRadius: 8,
        border: '1px solid rgba(80,120,200,0.55)',
        background: 'rgba(80,120,200,0.18)',
        color: 'inherit',
        font: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      },
      pre: {
        margin: 0,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(128,128,128,0.28)',
        background: 'rgba(128,128,128,0.07)',
        fontFamily: 'inherit',
        fontSize: 12.5,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      },
      historyRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 8px',
        borderRadius: 8,
        border: '1px solid rgba(128,128,128,0.22)',
        background: 'rgba(128,128,128,0.05)',
        cursor: 'pointer',
        fontSize: 12,
      },
    }

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

        /** Рамка карточки: тот же вид, что у остальных наших плагинов. */
    function CardFrame({ children }) {
      return h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(128,128,128,0.28)',
            background: 'rgba(128,128,128,0.07)',
            boxSizing: 'border-box',
          },
        },
        children,
      )
    }
    /** Кнопка-шеврон: развернуть и свернуть. Виден в любой теме (currentColor). */
    function ToggleIcon({ open, onClick }) {
      return h(
        'button',
        {
          type: 'button',
          onClick,
          title: open ? 'Свернуть' : 'Открыть',
          'aria-label': open ? 'Свернуть' : 'Открыть',
          'aria-expanded': open ? 'true' : 'false',
          style: {
            marginLeft: 'auto',
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            padding: 0,
            borderRadius: 8,
            border: '1px solid rgba(128,128,128,0.32)',
            background: 'rgba(128,128,128,0.1)',
            color: 'inherit',
            cursor: 'pointer',
          },
        },
        h(
          'svg',
          {
            width: 16,
            height: 16,
            viewBox: '0 0 24 24',
            fill: 'none',
            'aria-hidden': 'true',
            focusable: 'false',
            style: { transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' },
          },
          h('path', {
            d: 'M6 15l6-6 6 6',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
        ),
      )
    }


function TeamCard() {
      const t = (key) => translate(key)
      const [template, setTemplate] = React.useState('custom')
      const [task, setTask] = React.useState('')
      const [roles, setRoles] = React.useState(TEMPLATES[0].roles)
      const [parallel, setParallel] = React.useState(false)
      const [notice, setNotice] = React.useState('')
      const [history, setHistory] = React.useState(() => readHistory())
      // По умолчанию карточка свёрнута: в списке плагинов она не должна
      // занимать пол-экрана.
      const [open, setOpen] = React.useState(false)

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

      if (!open) {
        return h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid rgba(128,128,128,0.22)',
              background: 'rgba(128,128,128,0.05)',
              fontSize: 13,
            },
          },
          h('span', { style: { fontWeight: 600 } }, t('heading')),
          h('span', { style: { fontSize: 12, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('hint')),
          h(ToggleIcon, { open: false, onClick: () => setOpen(true) }),
        )
      }

      const checkbox = (checked, onChange, label) =>
        h(
          'label',
          { style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked, onChange: (event) => onChange(event.target.checked) }),
          h('span', null, label),
        )

      return h(
      'div',
      { style: S.card },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        h('span', { style: { fontSize: 13.5, fontWeight: 600 } }, t('heading')),
        h(ToggleIcon, { open: true, onClick: () => setOpen(false) }),
      ),
        h('span', { style: { fontSize: 12, opacity: 0.75, lineHeight: 1.5 } }, t('hint')),
        h('span', { style: S.label }, t('templateLabel')),
        h(
          'select',
          {
            style: S.select,
            value: template,
            onChange: (event) => chooseTemplate(event.target.value),
          },
          ...TEMPLATES.map((item) => h('option', { key: item.id, value: item.id }, t(item.labelKey))),
        ),
        h('span', { style: S.label }, t('taskLabel')),
        h('textarea', {
          style: S.area,
          placeholder: t('taskPlaceholder'),
          value: task,
          onChange: (event) => setTask(event.target.value),
        }),
        h('span', { style: S.label }, t('rolesLabel')),
        checkbox(roles.researcher, () => toggleRole('researcher'), t('roleResearcher')),
        checkbox(roles.doer, () => toggleRole('doer'), t('roleDoer')),
        checkbox(roles.checker, () => toggleRole('checker'), t('roleChecker')),
        checkbox(parallel, setParallel, t('parallelLabel')),
        h(
          'div',
          { style: S.row },
          h('button', { style: S.primary, onClick: () => void copy() }, t('copy')),
          h(
            'button',
            {
              style: S.button,
              onClick: () => {
                setTask('')
                setNotice('')
              },
            },
            t('clear'),
          ),
          notice !== '' ? h('span', { style: { fontSize: 12, opacity: 0.75 } }, notice) : null,
        ),
        h('span', { style: S.label }, t('previewLabel')),
        h('pre', { style: S.pre }, prepared === '' ? t('previewEmpty') : prepared),
        h('span', { style: S.label }, t('historyLabel')),
        history.length === 0
          ? h('span', { style: { fontSize: 12, opacity: 0.7 } }, t('historyEmpty'))
          : h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              ...history.map((entry, index) =>
                h(
                  'div',
                  {
                    key: `${entry.at}-${index}`,
                    style: S.historyRow,
                    onClick: () => restore(entry),
                    title: entry.task,
                  },
                  h('span', { style: { fontSize: 11, opacity: 0.6, flex: '0 0 auto' } }, entry.at.slice(11, 16)),
                  h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, entry.task),
                ),
              ),
            ),
      )
    }

    function apply(ctx) {
      ctx.locale.register(NS, { en, ru })
      translate = ctx.locale.bind(NS)

      try {
        ctx.slots.inject('plugins.item', () =>
          ctx.slots.register(
            {
              name: 'plugins.item',
              id: 'dsh-team',
              order: 58,
              label: () => translate('title'),
              locale: NS,
            },
            () => h(CardFrame, null, h(TeamCard)),
          ),
        )
      } catch (error) {
        console.error('[dsh-team] карточка недоступна:', error)
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
