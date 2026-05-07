import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { VNode } from 'vue'

import LocationManagerTable from '../../app/components/booking/calendar/LocationManagerTable.vue'
import { __role, __toastAdd } from '../mocks/imports'

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('ofetch', () => ({ $fetch: fetchMock }))

type MenuItemLike = {
  label?: unknown
  onSelect?: unknown
}

const UIconStub = defineComponent({
  name: 'UIcon',
  props: {
    name: { type: String, required: false },
  },
  setup(props) {
    return () => {
      const attrs: Record<string, unknown> = {}
      attrs['data-icon'] = props.name
      return h('span', attrs)
    }
  },
})

const UTooltipStub = defineComponent({
  name: 'UTooltip',
  props: {
    text: { type: String, required: false },
  },
  setup(props, { slots }) {
    return () => {
      const attrs: Record<string, unknown> = {}
      attrs['data-tooltip'] = props.text
      return h('span', attrs, slots.default?.())
    }
  },
})

const UButtonStub = defineComponent({
  name: 'UButton',
  props: {
    label: { type: String, required: false },
    icon: { type: String, required: false },
    disabled: { type: Boolean, required: false },
    loading: { type: Boolean, required: false },
  },
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () => {
      const attrs: Record<string, unknown> = {
        disabled: props.disabled || props.loading,
        onClick: (e: Event) => emit('click', e),
      }
      attrs['data-icon'] = props.icon
      attrs['data-label'] = props.label
      return h('button', attrs, slots.default?.() ?? props.label ?? '')
    }
  },
})

const UInputStub = defineComponent({
  name: 'UInput',
  props: {
    modelValue: { type: String, required: false },
    placeholder: { type: String, required: false },
    icon: { type: String, required: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => {
      const attrs: Record<string, unknown> = {
        value: props.modelValue ?? '',
        placeholder: props.placeholder,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      }
      attrs['data-icon'] = props.icon
      return h('input', attrs)
    }
  },
})

const UPaginationStub = defineComponent({
  name: 'UPagination',
  props: {
    modelValue: { type: Number, required: false },
    total: { type: Number, required: false },
    pageCount: { type: Number, required: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => {
      const attrs: Record<string, unknown> = {
        onClick: () => emit('update:modelValue', (props.modelValue ?? 1) + 1),
      }
      attrs['data-pagination'] = 'true'
      return h('button', attrs)
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

const UDropdownMenuStub = defineComponent({
  name: 'UDropdownMenu',
  props: {
    items: { type: Array, required: false, default: () => [] },
  },
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
            { 'data-dropdown-open': 'true' },
            flatten(props.items).map((item) =>
              (() => {
                const label = typeof item.label === 'string' ? item.label : ''
                const attrs: Record<string, unknown> = {}
                attrs['data-menu-item'] = label
                attrs['onClick'] = (e: Event) => {
                  e.stopPropagation()
                  if (typeof item.onSelect === 'function') {
                    ;(item.onSelect as (e: Event) => void)(e)
                  }
                  open.value = false
                }
                return h('button', attrs, label)
              })(),
            ),
          )
        : null

      const rootAttrs: Record<string, unknown> = {}
      rootAttrs['data-dropdown'] = 'true'
      rootAttrs['onClick'] = () => {
        open.value = !open.value
      }
      return h('div', rootAttrs, [slots.default?.({ open: open.value }), menuItems])
    }
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
      if (item && typeof item === 'object' && 'id' in item) {
        return String((item as { id: unknown }).id)
      }
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
      if (!col || typeof col !== 'object') return ''
      if ('id' in col && typeof (col as { id: unknown }).id === 'string')
        return (col as { id: string }).id
      if ('accessorKey' in col) {
        const accessorKey = (col as { accessorKey?: unknown }).accessorKey
        if (typeof accessorKey === 'string') {
          return accessorKey
        }
      }
      return ''
    }

    return () => {
      if (props.loading) {
        const attrs: Record<string, unknown> = {}
        attrs['data-table-loading'] = 'true'
        return h('div', attrs, slots.loading?.())
      }

      if (!props.data.length) {
        const attrs: Record<string, unknown> = {}
        attrs['data-table-empty'] = 'true'
        return h('div', attrs, slots.empty?.() ?? props.empty ?? '')
      }

      function renderRow(item: unknown, depth: number): VNode[] {
        const row = makeRow(item, depth)
        const cells = (props.columns as unknown[]).map((col) => {
          const id = colId(col)
          const slot = id ? slots[`${id}-cell`] : undefined
          const content = slot ? slot({ row }) : ''
          return h('td', { 'data-col': id }, content)
        })

        const baseRowAttrs: Record<string, unknown> = {}
        baseRowAttrs['data-row'] = row.id
        baseRowAttrs['data-depth'] = String(depth)
        const baseRow = h('tr', baseRowAttrs, cells)
        const children = row.getIsExpanded() ? row.getSubRows() : []
        const childRows = children.flatMap((child) => renderRow(child, depth + 1))
        return [baseRow, ...childRows]
      }

      const rows = (props.data as unknown[]).flatMap((item) => renderRow(item, 0))

      const tableAttrs: Record<string, unknown> = {}
      tableAttrs['data-table'] = 'true'
      return h('table', tableAttrs, [h('tbody', rows)])
    }
  },
})

type TestRoom = {
  id: string
  name: string
}

type TestLocation = {
  id: string
  name: string
  address: string | null
  rooms: TestRoom[]
}

function mountWithModel(locations: TestLocation[], loading = false) {
  const model = ref(locations)

  const props = { locations: model.value, loading } as Record<string, unknown>
  props['onUpdate:locations'] = (value: TestLocation[]) => {
    model.value = value
  }

  const wrapper = mount(LocationManagerTable, {
    props,
    global: {
      stubs: {
        UIcon: UIconStub,
        UTooltip: UTooltipStub,
        UButton: UButtonStub,
        UDropdownMenu: UDropdownMenuStub,
        UInput: UInputStub,
        UPagination: UPaginationStub,
        UModal: UModalStub,
        UTable: UTableStub,
      },
    },
  })

  return { wrapper, model }
}

describe('LocationManagerTable', () => {
  it('renderiza sedes y permite expandir para ver salas', async () => {
    const { wrapper } = mountWithModel([
      { id: 'l1', name: 'Sede Central', address: 'Calle 1', rooms: [{ id: 'r1', name: 'Sala A' }] },
      { id: 'l2', name: 'Sede Norte', address: null, rooms: [] },
    ])

    expect(wrapper.text()).toContain('Sede Central')
    expect(wrapper.text()).toContain('Calle 1')

    await wrapper.find('button[data-icon="i-lucide-plus"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Sala A')
  })

  it('emite eventos de edición y creación de sala', async () => {
    const { wrapper } = mountWithModel([
      { id: 'l1', name: 'Sede Central', address: 'Calle 1', rooms: [{ id: 'r1', name: 'Sala A' }] },
    ])

    await wrapper.find('[data-dropdown="true"]').trigger('click')
    await wrapper.find('button[data-menu-item="actions.edit"]').trigger('click')
    expect(wrapper.emitted('edit-location')?.[0]?.[0]).toMatchObject({ id: 'l1' })

    await wrapper.find('[data-dropdown="true"]').trigger('click')
    await wrapper.find('button[data-menu-item="bookingCalendar.newRoomButton"]').trigger('click')
    expect(wrapper.emitted('create-room')?.[0]?.[0]).toBe('l1')

    await wrapper.find('button[data-icon="i-lucide-plus"]').trigger('click')
    await nextTick()

    await wrapper.findAll('[data-dropdown="true"]')[1]!.trigger('click')
    await wrapper.find('button[data-menu-item="actions.edit"]').trigger('click')
    expect(wrapper.emitted('edit-room')?.[0]?.[0]).toMatchObject({
      locationId: 'l1',
      room: { id: 'r1' },
    })
  })

  it('elimina una sede con confirmación y actualiza el modelo', async () => {
    fetchMock.mockResolvedValue(undefined)

    const { wrapper, model } = mountWithModel([
      { id: 'l1', name: 'Sede Central', address: 'Calle 1', rooms: [] },
      { id: 'l2', name: 'Sede Norte', address: null, rooms: [] },
    ])

    await wrapper.find('[data-dropdown="true"]').trigger('click')
    await wrapper.find('button[data-menu-item="actions.delete"]').trigger('click')
    expect(wrapper.find('[data-modal="bookingCalendar.deleteLocationTitle"]').exists()).toBe(true)

    await wrapper.find('button[data-label="actions.delete"]').trigger('click')
    await nextTick()

    expect(fetchMock).toHaveBeenCalledWith('/api/bookings/locations/l1', { method: 'DELETE' })
    expect(model.value).toHaveLength(1)
    expect(model.value[0]?.id).toBe('l2')
    expect(__toastAdd).toHaveBeenCalled()
  })

  it('muestra toast de error si falla el borrado de sala', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'))

    const { wrapper, model } = mountWithModel([
      { id: 'l1', name: 'Sede Central', address: 'Calle 1', rooms: [{ id: 'r1', name: 'Sala A' }] },
    ])

    await wrapper.find('button[data-icon="i-lucide-plus"]').trigger('click')
    await nextTick()

    await wrapper.findAll('[data-dropdown="true"]')[1]!.trigger('click')
    await wrapper.find('button[data-menu-item="actions.delete"]').trigger('click')
    expect(wrapper.find('[data-modal="bookingCalendar.deleteRoomTitle"]').exists()).toBe(true)

    await wrapper.find('button[data-label="actions.delete"]').trigger('click')
    await nextTick()

    expect(model.value[0]?.rooms).toHaveLength(1)
    expect(__toastAdd).toHaveBeenCalled()
  })

  it('valida permisos y bloquea acciones sin permiso', async () => {
    __role.canManageLocations.value = false

    const { wrapper } = mountWithModel([
      { id: 'l1', name: 'Sede Central', address: null, rooms: [] },
    ])

    await wrapper.find('[data-dropdown="true"]').trigger('click')
    await wrapper.find('button[data-menu-item="actions.edit"]').trigger('click')
    expect(wrapper.emitted('edit-location')).toBeUndefined()
    expect(__toastAdd).toHaveBeenCalled()
  })

  it('muestra buscador y paginación si hay más de 10 sedes', () => {
    const locations = Array.from({ length: 11 }).map((_, i) => ({
      id: `l${i}`,
      name: `Loc ${i}`,
      address: null,
      rooms: [],
    }))

    const { wrapper } = mountWithModel(locations)
    expect(wrapper.find('input[data-icon="i-lucide-search"]').exists()).toBe(true)
    expect(wrapper.find('button[data-pagination="true"]').exists()).toBe(true)
  })

  it('muestra estado de carga', () => {
    const { wrapper } = mountWithModel([], true)
    expect(wrapper.find('[data-table-loading="true"]').exists()).toBe(true)
  })
})
