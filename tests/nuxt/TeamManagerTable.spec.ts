import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { VNode } from 'vue'

import TeamManagerTable from '../../app/components/booking/calendar/TeamManagerTable.vue'
import { __role, __toastAdd } from '../mocks/imports'

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('ofetch', () => ({ $fetch: fetchMock }))

type MenuItemLike = {
  label?: unknown
  onSelect?: unknown
}

type FetchOptions = {
  method?: string
  body?: Record<string, unknown>
}

const UIconStub = defineComponent({
  name: 'UIcon',
  props: { name: { type: String, required: false } },
  setup(props) {
    const attrs: Record<string, unknown> = {}
    attrs['data-icon'] = props.name
    return () => h('i', attrs)
  },
})

const UButtonStub = defineComponent({
  name: 'UButton',
  props: {
    label: { type: String, required: false },
    icon: { type: String, required: false },
    loading: { type: Boolean, required: false },
    disabled: { type: Boolean, required: false },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        (() => {
          const attrs: Record<string, unknown> = {}
          attrs.disabled = props.disabled || props.loading
          attrs['data-label'] = props.label
          attrs['data-icon'] = props.icon
          attrs.onClick = (e: Event) => emit('click', e)
          return attrs
        })(),
        slots.default?.() ?? props.label ?? '',
      )
  },
})

const UInputStub = defineComponent({
  name: 'UInput',
  props: { modelValue: { type: String, required: false } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        value: props.modelValue ?? '',
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      })
  },
})

const USelectMenuStub = defineComponent({
  name: 'USelectMenu',
  props: {
    modelValue: { type: String, required: false },
    items: { type: Array, required: false, default: () => [] },
    valueKey: { type: String, required: false, default: 'value' },
    disabled: { type: Boolean, required: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'select',
        (() => {
          const attrs: Record<string, unknown> = {}
          attrs.disabled = props.disabled
          attrs.value = props.modelValue ?? ''
          attrs.onChange = (e: Event) =>
            emit('update:modelValue', (e.target as HTMLSelectElement).value)
          return attrs
        })(),
        (props.items as Array<Record<string, unknown>>).map((item) => {
          const value = item[props.valueKey as string]
          const label = item.label
          const valueStr = typeof value === 'string' ? value : ''
          const labelStr = typeof label === 'string' ? label : ''
          return h('option', { value: valueStr }, labelStr)
        }),
      )
  },
})

const UDropdownMenuStub = defineComponent({
  name: 'UDropdownMenu',
  props: { items: { type: Array, required: false, default: () => [] } },
  setup(props, { slots }) {
    const open = ref(false)

    function flatten(items: unknown): MenuItemLike[] {
      if (!Array.isArray(items)) return []
      return items.flatMap((item) => {
        if (Array.isArray(item)) return flatten(item)
        if (item && typeof item === 'object' && 'label' in item) {
          const obj = item as Record<string, unknown>
          return [{ label: obj.label, onSelect: obj.onSelect }]
        }
        return []
      })
    }

    return () => {
      const menuItems = open.value
        ? h(
            'div',
            { 'data-dropdown-open': 'true' } as Record<string, unknown>,
            flatten(props.items).map((item) => {
              const label = typeof item.label === 'string' ? item.label : ''
              return h(
                'button',
                (() => {
                  const attrs: Record<string, unknown> = {}
                  attrs['data-menu-item'] = label
                  attrs.onClick = (e: Event) => {
                    e.stopPropagation()
                    if (typeof item.onSelect === 'function') {
                      ;(item.onSelect as (e: Event) => void)(e)
                    }
                    open.value = false
                  }
                  return attrs
                })(),
                label,
              )
            }),
          )
        : null

      return h(
        'div',
        (() => {
          const attrs: Record<string, unknown> = {}
          attrs['data-dropdown'] = 'true'
          attrs.onClick = () => {
            open.value = !open.value
          }
          return attrs
        })(),
        [slots.default?.({ open: open.value }), menuItems],
      )
    }
  },
})

const UModalStub = defineComponent({
  name: 'UModal',
  props: {
    open: { type: Boolean, required: false },
    title: { type: String, required: false },
    description: { type: String, required: false },
  },
  emits: ['update:open'],
  setup(props, { slots }) {
    return () => {
      if (!props.open) return null
      const attrs: Record<string, unknown> = {}
      attrs['data-modal'] = props.title
      attrs['data-description'] = props.description
      return h('div', attrs, [slots.body?.(), slots.footer?.()])
    }
  },
})

const UPaginationStub = defineComponent({
  name: 'UPagination',
  props: { modelValue: { type: Number, required: false } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        (() => {
          const attrs: Record<string, unknown> = {}
          attrs['data-pagination'] = 'true'
          attrs.onClick = () => emit('update:modelValue', (props.modelValue ?? 1) + 1)
          return attrs
        })(),
      )
  },
})

const UTableStub = defineComponent({
  name: 'UTable',
  props: {
    data: { type: Array, required: false, default: () => [] },
    columns: { type: Array, required: false, default: () => [] },
    loading: { type: Boolean, required: false },
    empty: { type: String, required: false },
  },
  setup(props, { slots }) {
    const expanded = ref<Record<string, boolean>>({})

    function rowId(item: unknown) {
      if (item && typeof item === 'object' && 'id' in item)
        return String((item as { id: unknown }).id)
      return JSON.stringify(item)
    }

    function getChildren(item: unknown) {
      if (!item || typeof item !== 'object') return []
      if ('children' in item) {
        const children = (item as { children?: unknown }).children
        return Array.isArray(children) ? children : []
      }
      return []
    }

    function makeRow(item: unknown, depth: number) {
      const id = rowId(item)
      const children = getChildren(item)
      return {
        id,
        original: item,
        depth,
        getCanExpand: () => children.length > 0,
        getIsExpanded: () => Boolean(expanded.value[id]),
        toggleExpanded: () => {
          expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
        },
        getSubRows: () => children,
      }
    }

    function colId(col: unknown) {
      if (col && typeof col === 'object') {
        const anyCol = col as Record<string, unknown>
        if (typeof anyCol.id === 'string') return anyCol.id
        if (typeof anyCol.accessorKey === 'string') return anyCol.accessorKey
      }
      return ''
    }

    return () => {
      if (props.loading) {
        return h(
          'div',
          { 'data-table-loading': 'true' } as Record<string, unknown>,
          slots.loading?.(),
        )
      }

      if (!props.data.length) {
        return h(
          'div',
          { 'data-table-empty': 'true' } as Record<string, unknown>,
          slots.empty?.() ?? props.empty ?? '',
        )
      }

      function renderRow(item: unknown, depth: number): VNode[] {
        const row = makeRow(item, depth)
        const cells = (props.columns as unknown[]).map((col) => {
          const id = colId(col)
          const slot = id ? slots[`${id}-cell`] : undefined
          const content = slot ? slot({ row }) : ''
          return h('td', { 'data-col': id } as Record<string, unknown>, content)
        })

        const baseRow = h(
          'tr',
          { 'data-row': row.id, 'data-depth': String(depth) } as Record<string, unknown>,
          cells,
        )
        const children = row.getIsExpanded() ? row.getSubRows() : []
        const childRows = children.flatMap((child) => renderRow(child, depth + 1))
        return [baseRow, ...childRows]
      }

      const rows = (props.data as unknown[]).flatMap((item) => renderRow(item, 0))
      return h('table', { 'data-table': 'true' } as Record<string, unknown>, [h('tbody', rows)])
    }
  },
})

type TestTeamUser = {
  id: string
  email: string
  name: string | null
  role: string | null
}

type TestTeamMember = {
  id: string
  userId: string
  user: TestTeamUser
}

type TestTeam = {
  id: string
  name: string
  members: TestTeamMember[]
}

function mountWithModel(teams: TestTeam[], loading = false) {
  const model = ref(teams)
  const props = { teams: model.value, loading } as Record<string, unknown>
  props['onUpdate:teams'] = (value: TestTeam[]) => {
    model.value = value
  }

  const wrapper = mount(TeamManagerTable, {
    props,
    global: {
      stubs: {
        UIcon: UIconStub,
        UButton: UButtonStub,
        UInput: UInputStub,
        USelectMenu: USelectMenuStub,
        UDropdownMenu: UDropdownMenuStub,
        UModal: UModalStub,
        UPagination: UPaginationStub,
        UTable: UTableStub,
      },
    },
  })

  return { wrapper, model }
}

describe('TeamManagerTable', () => {
  it('renderiza teams y permite expandir para ver miembros', async () => {
    const { wrapper } = mountWithModel([
      {
        id: 't1',
        name: 'Equipo A',
        members: [
          {
            id: 'm1',
            userId: 'u1',
            user: { id: 'u1', email: 'a@example.com', name: 'Ana', role: 'admin' },
          },
        ],
      },
    ])

    expect(wrapper.text()).toContain('Equipo A')
    await wrapper.find('[data-table="true"] button[data-icon="i-lucide-plus"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Ana (a@example.com)')
  })

  it('crea un team desde el modal y actualiza el modelo', async () => {
    __role.canManageTeams.value = true

    fetchMock.mockImplementation(async (url: string, opts?: FetchOptions) => {
      if (url === '/api/teams' && opts?.method === 'POST') {
        const name = typeof opts.body?.name === 'string' ? opts.body.name : ''
        return { id: 't2', name, members: [] }
      }
      throw new Error(`Unexpected request: ${url}`)
    })

    const { wrapper, model } = mountWithModel([])

    await wrapper.find('button[data-label="bookingCalendar.teamsNewButton"]').trigger('click')
    expect(wrapper.find('[data-modal="bookingCalendar.teamCreateTitle"]').exists()).toBe(true)

    await wrapper.find('input').setValue('Equipo Nuevo')
    await wrapper.find('button[data-label="actions.create"]').trigger('click')
    await nextTick()

    expect(fetchMock).toHaveBeenCalled()
    expect(model.value[0]?.name).toBe('Equipo Nuevo')
  })

  it('agrega miembro a un team', async () => {
    __role.canManageTeams.value = true

    fetchMock.mockImplementation(async (url: string, opts?: FetchOptions) => {
      if (url === '/api/admin/users') {
        return [{ id: 'u1', email: 'a@example.com', name: 'Ana', role: 'admin' }]
      }
      if (url === '/api/teams/t1/members' && opts?.method === 'POST') {
        return {
          id: 'm1',
          userId: 'u1',
          user: { id: 'u1', email: 'a@example.com', name: 'Ana', role: 'admin' },
        }
      }
      throw new Error(`Unexpected request: ${url}`)
    })

    const { wrapper, model } = mountWithModel([{ id: 't1', name: 'Equipo A', members: [] }])

    await wrapper.find('[data-dropdown="true"]').trigger('click')
    await wrapper
      .find('button[data-menu-item="bookingCalendar.teamAddMemberButton"]')
      .trigger('click')
    await nextTick()

    expect(wrapper.find('[data-modal="bookingCalendar.teamAddMemberTitle"]').exists()).toBe(true)

    await wrapper.find('select').setValue('u1')
    await wrapper.find('button[data-label="bookingCalendar.teamAddMemberButton"]').trigger('click')
    await nextTick()

    expect(model.value[0]?.members.length).toBe(1)
  })

  it('elimina un team con confirmación', async () => {
    __role.canManageTeams.value = true

    fetchMock.mockResolvedValue({ success: true })

    const { wrapper, model } = mountWithModel([{ id: 't1', name: 'Equipo A', members: [] }])

    await wrapper.find('[data-dropdown="true"]').trigger('click')
    await wrapper.find('button[data-menu-item="actions.delete"]').trigger('click')
    expect(wrapper.find('[data-modal="bookingCalendar.teamDeleteTitle"]').exists()).toBe(true)

    await wrapper.find('button[data-label="actions.delete"]').trigger('click')
    await nextTick()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/teams/t1',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(model.value.length).toBe(0)
  })

  it('bloquea acciones sin permiso', async () => {
    __role.canManageTeams.value = false

    const { wrapper } = mountWithModel([{ id: 't1', name: 'Equipo A', members: [] }])
    await wrapper.find('button[data-label="bookingCalendar.teamsNewButton"]').trigger('click')
    expect(wrapper.find('[data-modal="bookingCalendar.teamCreateTitle"]').exists()).toBe(false)
    expect(__toastAdd).toHaveBeenCalled()
  })
})
