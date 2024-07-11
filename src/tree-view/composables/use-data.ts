import { FieldRaw } from '@directus/types';
import { UUID } from 'crypto';
import _ from 'lodash';
import { Ref, computed, reactive, ref, watch } from 'vue';
import { Data, DataGroup, DataGroupItem, DataItem, DirtyItems, DroppedItem, GroupItem, Item } from '../utils/types';

type Props = {
  metaGroupField: Ref<FieldRaw>;
  defPrimKeyName: Ref<string | undefined>;
  slugifyFieldName: Ref<string | undefined>;
  items: Ref<Item[]>;
  listOfCollapsed: Ref<string[]>;
};
export default function useData({ items, slugifyFieldName, defPrimKeyName, metaGroupField, listOfCollapsed }: Props) {
  const data = reactive<Data>(new Map());
  const dataLength = computed(() => data.size);
  const dirtyItems = ref<DirtyItems>(new Map());
  const invalidItems = reactive(new Set());
  const hasInvalidItems = computed(() => invalidItems.size > 0);

  const groups = reactive<DataGroup>(new Map());

  const getItem = (key: string) => {
    const item = data.get(key);

    if (!item) throw new Error(`getItem: Invalid argument [ key: ${key} ]}`);

    return item;
  };

  const handleDrop = ({ itemId, from, to }: DroppedItem) => {
    let fromParent: DataItem,
      toParent: DataItem | undefined = undefined;

    if (from.parent !== to.parent) {
      toParent = getItem(to.parent);
      adjustItemPosition(toParent.rels_children, itemId, undefined, to.index);
      updateData(toParent);
    }

    fromParent = getItem(from.parent);
    adjustItemPosition(fromParent.rels_children, itemId, from.index, toParent ? undefined : to.index);
    updateData(fromParent);

    updateGroups();
  };

  watch([metaGroupField, items], ([newGroupField, newItems]) => newGroupField && newItems.length && createData());

  return {
    data,
    dataLength,
    dirtyItems,
    getItem,
    groups,
    handleDrop,
    hasInvalidItems,
  };

  function createGroups() {
    const choices: GroupItem[] = metaGroupField.value?.meta?.options?.choices ?? [];

    choices.forEach((item) =>
      groups.set(item.value, {
        _has_dirty: false,
        ...item,
      } as DataGroupItem),
    );
  }

  function updateGroups() {
    groups.forEach((val, key) => {
      const { _has_dirty } = val;

      const newDirty = Boolean([...dirtyItems.value].find((item) => item[1] === key));

      if (_has_dirty !== newDirty) val._has_dirty = newDirty;
    });
  }

  function createData() {
    data.clear();
    dirtyItems.value.clear();
    groups.clear();

    createGroups();

    groups.forEach(({ value }) => {
      const payload: DataItem = {
        _allow_children: true,
        _changes: new Map(),
        _is_dirty: false,
        _is_expanded: true,
        rels_children: [],
        group: value,
        id: null,
        level: 0,
        rel_parent: null,
        path: '',
        slug: '',
        sort: 0,
        rel_item: [],
        slug_is_key: false,
      };

      data.set(value, payload);
    });

    items.value.forEach((item) => {
      const clone = _.cloneDeep(item);

      const { id, rel_parent, group, rels_children } = clone;

      const payload: DataItem = {
        _is_dirty: false,
        _is_expanded: listOfCollapsed.value.includes(id) ? false : Boolean(rels_children.length),
        _changes: new Map(),
        _allow_children: false,
        ...clone,
      };

      if (!rel_parent) {
        getItem(group).rels_children.push(id);
      }

      data.set(id, payload);
    });

    // Enforce revalidation
    [...groups].map(([id]) => updateData(getItem(id), true));
    updateGroups();
  }

  function updateData(parentItem: DataItem, forceCascade: boolean = false) {
    const parentClone = _.cloneDeep(parentItem);
    parentClone._changes.forEach((val: any, key: string) => (parentClone[key] = val));

    parentClone.rels_children.forEach((id, index) => {
      const item = getItem(id);
      const newChanges = new Map();

      if (item.sort !== index) newChanges.set('sort', index);

      const newParent = parentClone.id;
      if (item.rel_parent !== newParent) newChanges.set('rel_parent', newParent);

      const newLevel = parentClone.level + 1;
      if (item.level !== newLevel) newChanges.set('level', newLevel);

      const newGroup = parentClone.group;
      if (item.group !== newGroup) newChanges.set('group', newGroup);

      if (!item.slug) {
        const { slug_is_key, rel_item } = item;
        const slugify = slugifyFieldName.value;
        let newSlug = slug_is_key ? rel_item[defPrimKeyName.value!] : slugify ? rel_item[slugify] : null;

        if (newSlug && !slug_is_key) {
          newSlug = newSlug
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        }

        newChanges.set('slug', newSlug);
      }

      const newPath = parentClone.path + '/' + (item.slug ?? newChanges.get('slug'));
      if (item.path !== newPath) newChanges.set('path', newPath);

      const cascade = Boolean(
        ['rel_parent', 'level', 'group', 'path'].find((field) => item._changes.get(field) !== newChanges.get(field)),
      );

      const newDirty = newChanges.size > 0;
      item._is_dirty = newDirty;

      if (newDirty) {
        dirtyItems.value.set(id, newChanges.get('group') || item.group);
      } else {
        dirtyItems.value.delete(id);
      }

      const maxLevel = groups.get(newGroup)!.max_level;
      const newAllowChildren = maxLevel ? newLevel < maxLevel : true;
      item._allow_children = newAllowChildren;

      if (parentClone._allow_children) {
        invalidItems.delete(item.id);
      } else {
        invalidItems.add(item.id);
      }

      item._changes = newChanges;

      if (cascade || forceCascade) updateData(item, forceCascade);
    });
  }

  function adjustItemPosition(list: UUID[], id: UUID, fromIndex?: number, toIndex?: number) {
    fromIndex !== undefined && list.splice(fromIndex, 1);
    toIndex !== undefined && list.splice(toIndex, 0, id);
  }
}
