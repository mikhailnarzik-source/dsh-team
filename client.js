/**
 * Browser half of `dsh-team`.
 *
 * Панель собирает задание для команды помощников: роли, объём работы и
 * готовый текст, который остаётся вставить в поле ввода. Сборка текста —
 * единственная задача плагина, поэтому здесь нет ни маршрутов, ни хранилища.
 */
window.__ModuleLoader__.load({
  id: 'dsh-team',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const h = React.createElement

    const NS = 'dshTeam'

    const en = {
      title: 'Team',
      heading: 'Team of assistants',
      hint: 'Describe the task, pick the roles — the panel prepares a ready request. Paste it into the message field and send.',
      taskLabel: 'Task for the team',
      taskPlaceholder: 'For example: review the sync plugin and suggest three fixes',
      rolesLabel: 'Roles',
      roleResearcher: 'Explorer — gathers facts and files',
      roleDoer: 'Doer — writes the code',
      roleChecker: 'Reviewer — checks the result',
      parallelLabel: 'Run in parallel',
      build: 'Prepare request',
      copy: 'Copy',
      copied: 'Copied — paste it into the message field',
      clear: 'Clear',
      previewLabel: 'Ready request',
      previewEmpty: 'Describe the task above to see the request.',
      needTask: 'Add a task description first.',
    }
    const ru = {
      title: 'Команда',
      heading: 'Команда помощников',
      hint: 'Опишите задачу и отметьте роли — панель соберёт готовое задание. Останется вставить его в поле ввода и отправить.',
      taskLabel: 'Задача для команды',
      taskPlaceholder: 'Например: проверь плагин синхронизации и предложи три исправления',
      rolesLabel: 'Роли',
      roleResearcher: 'Исследователь — собирает факты и файлы',
      roleDoer: 'Исполнитель — пишет код',
      roleChecker: 'Проверяющий — проверяет результат',
      parallelLabel: 'Запустить параллельно',
      build: 'Собрать задание',
      copy: 'Скопировать',
      copied: 'Скопировано — вставьте в поле ввода',
      clear: 'Очистить',
      previewLabel: 'Готовое задание',
      previewEmpty: 'Опишите задачу выше, чтобы увидеть задание.',
      needTask: 'Сначала опишите задачу.',
    }

    const S = {
      card: { display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 },
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

    function TeamCard() {
      const t = (key) => translate(key)
      const [task, setTask] = React.useState('')
      const [roles, setRoles] = React.useState({ researcher: true, doer: true, checker: false })
      const [parallel, setParallel] = React.useState(true)
      const [notice, setNotice] = React.useState('')

      const prepared = task.trim() === '' ? '' : buildRequest({ task, roles, parallel })

      const toggleRole = (name) => setRoles((current) => ({ ...current, [name]: !current[name] }))

      const copy = async () => {
        if (prepared === '') {
          setNotice(t('needTask'))
          return
        }
        try {
          await navigator.clipboard.writeText(prepared)
          setNotice(t('copied'))
        } catch {
          setNotice(t('copied'))
        }
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
        h('span', { style: { fontSize: 13.5, fontWeight: 600 } }, t('heading')),
        h('span', { style: { fontSize: 12, opacity: 0.75, lineHeight: 1.5 } }, t('hint')),
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
            TeamCard,
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
    return module.exports
  },
})
