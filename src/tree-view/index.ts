import {
  defineLayout,
  getFieldsFromTemplate,
  useCollection,
  useItems,
  useSdk,
  useStores,
  useSync,
} from '@directus/extensions-sdk';
import { updateItemsBatch } from '@directus/sdk';
import { Ref, computed, ref, toRefs } from 'vue';
import treeActions from './actions.vue';
import useData from './composables/use-data';
import useModel from './composables/use-model';
import LayoutComponent from './layout.vue';
import treeOptions from './options.vue';
import type { Item, LayoutOptions, UserNotice } from './utils/types';

export default defineLayout({
  id: 'dcb-tree-view',
  name: 'Tree view',
  // icon: 'view_object_track',
  icon: 'view_agenda',
  component: LayoutComponent,
  slots: {
    options: treeOptions,
    sidebar: () => null,
    actions: treeActions,
  },
  setup(props, { emit }) {
    const { collection: defCollectionName, selection, showSelect, selectMode, search } = toRefs(props);

    const client = useSdk();
    const { useUserStore, useRelationsStore, usePermissionsStore, useFieldsStore, useCollectionsStore } = useStores();
    const userStore = useUserStore();
    const permissionsStore = usePermissionsStore();
    const relationsStore = useRelationsStore();
    const fieldsStore = useFieldsStore();

    const collectionsStore = useCollectionsStore();
    const { allCollections } = collectionsStore;

    const { primaryKeyField: defPrimKeyField, fields: fieldsInCollection } = useCollection(defCollectionName);
    const defPrimKeyName = computed(() => defPrimKeyField.value?.field);

    // ACTION
    const isInEditMode = ref(false);
    const isSaving = ref(false);

    // LAYOUT OPTIONS
    const layoutOptions = useSync(props, 'layoutOptions', emit);
    const {
      collapsed,
      debug,
      slugifyFieldName,
      indentation,
      labelPrimary,
      labelSecondary,
      metaCollectionName,
      statusIndicator,
    } = useLayoutOptions();

    // TREE MODEL & PERMISSION
    const { isCreatingModel, mandatoryFields, validateFields, createModel } = useModel(client);

    const userIsAdmin = computed(() => Boolean(userStore.isAdmin));
    const userCanRead = computed(() => userIsAdmin.value || hasPermission('read'));
    const userCanUpdate = computed(() => userIsAdmin.value || hasPermission('update'));

    const hasValidOptions = computed(() => Boolean(metaCollectionName.value && slugifyFieldName.value));
    const hasValidMetaFields = computed(() => {
      let result = false;

      try {
        if (hasValidOptions.value) {
          const fields = fieldsStore.getFieldsForCollection(metaCollectionName.value!);
          validateFields({
            defCollectionName: defCollectionName.value!,
            defPrimKeyType: defPrimKeyField.value!.type,
            foreignFields: fields,
            metaCollectionName: metaCollectionName.value!,
          });
          result = true;
        }
      } catch (e) {
        console.error(e);
      } finally {
        return result;
      }
    });
    const metaGroupField = computed(() =>
      hasValidMetaFields.value ? fieldsStore.getField(metaCollectionName.value, 'group') : null,
    );
    const defConnectorName = computed(() =>
      hasValidMetaFields.value
        ? relationsStore.getRelationForField(metaCollectionName.value, 'rel_item').meta.one_field
        : null,
    );

    // TREE DATA
    const {
      items,
      getItems,
      loading: isLoadingItems,
    } = useItems(metaCollectionName, {
      fields: computed(() => {
        let labels = new Set();

        [labelPrimary.value, labelSecondary.value].forEach((item) => {
          if (!item) return;
          labels = new Set([...labels, ...getFieldsFromTemplate(item)]);
        });

        [statusIndicator.value, slugifyFieldName.value, defPrimKeyName.value].forEach((item) => {
          if (!item) return;
          labels.add(item);
        });

        const composedLabels = [...labels].map((item) => 'rel_item.' + item);

        return ['*', ...composedLabels];
      }),
      limit: ref(-1),
      page: ref(0),
      sort: computed(() => ['group', 'level', 'sort']),
      filter: computed(() => null),
      search: computed(() => null),
    });

    const { data, dataLength, dirtyItems, getItem, groups, handleDrop, hasInvalidItems } = useData({
      metaGroupField,
      defPrimKeyName,
      slugifyFieldName,
      items: items as Ref<Item[]>,
      listOfCollapsed: collapsed,
    });

    // UX MESSAGES
    const userNotice = computed<UserNotice | null>(() => {
      if (!userCanRead.value)
        return {
          type: 'danger',
          title: 'Limited permission',
          text: `You need permission to read all mandatory fields from [${metaCollectionName.value}] collection. To fix this, contact your administrator.`,
        };
      if (!hasValidOptions.value)
        return {
          type: 'danger',
          title: 'Incomplete configuration',
          text: 'Go to [Layout Options > Configuration] and ensure all required fields are set.',
        };
      if (!hasValidMetaFields.value)
        return {
          type: 'danger',
          title: 'Invalid collection structure',
          text: `Some collection fields have unexpected schema. For more details, see console.`,
        };
      if (hasInvalidItems.value)
        return {
          type: 'warning',
          title: 'Invalid level depth',
          text: 'Please move highlighted items up. Until then changes cannot be saved.',
        };
      if (!dataLength.value)
        return {
          type: 'info',
          title: 'Nothing to show yet',
          text: `The collection [${metaCollectionName.value}] seems not to have any items yet.`,
        };
      if (search.value)
        return {
          type: 'warning',
          title: 'Feature not supported',
          text: `Search and Filter are not supported by this layout, hence has no effect.`,
        };

      return null;
    });

    const processingMessage = computed<string | null>(() => {
      if (isCreatingModel.value) return 'Creating model';
      if (isLoadingItems.value) return 'Loading items';
      if (isSaving.value) return 'Saving';

      return null;
    });

    // RETURN
    return {
      allCollections,
      collapsed,
      data,
      dataLength,
      debug,
      defCollectionName,
      defConnectorName,
      defPrimKeyName,
      dirtyItems,
      fieldsInCollection,
      getItem,
      groups,
      handleCreateModel,
      handleDrop,
      handleSaveChanges,
      handleSaveCollapsed,
      hasInvalidItems,
      hasValidMetaFields,
      hasValidOptions,
      indentation,
      isInEditMode,
      isSaving,
      labelPrimary,
      labelSecondary,
      metaCollectionName,
      processingMessage,
      refresh,
      selection,
      selectItem,
      selectMode,
      showSelect,
      slugifyFieldName,
      statusIndicator,
      toggleEditMode,
      updateDb,
      userCanRead,
      userCanUpdate,
      userIsAdmin,
      userNotice,
    };

    // FUNCTIONS
    function useLayoutOptions() {
      const collapsed = createViewOption<string[]>('collapsed', []);
      const debug = createViewOption<boolean>('debug', false);
      const slugifyFieldName = createViewOption<string | undefined>('slugifyFieldName', undefined);
      const indentation = createViewOption<number>('indentation', 2.5);
      const labelPrimary = createViewOption<string | undefined>('labelPrimary', undefined);
      const labelSecondary = createViewOption<string | undefined>('labelSecondary', undefined);
      const metaCollectionName = createViewOption<string | null>('metaCollectionName', null);
      const statusIndicator = createViewOption<string | undefined>('statusIndicator', undefined);

      return {
        collapsed,
        debug,
        slugifyFieldName,
        indentation,
        labelPrimary,
        labelSecondary,
        metaCollectionName,
        statusIndicator,
      };

      function createViewOption<T>(key: keyof LayoutOptions, defaultValue: any) {
        return computed<T>({
          get() {
            return layoutOptions.value?.[key] !== undefined ? layoutOptions.value[key] : defaultValue;
          },
          set(newValue: T) {
            layoutOptions.value = {
              ...layoutOptions.value,
              [key]: newValue,
            };
          },
        });
      }
    }

    async function updateDb(list: any) {
      if (!metaCollectionName.value) return;

      try {
        await client.request(updateItemsBatch(metaCollectionName.value, list));
      } catch (e) {
        console.error('updateDb:', e);
      }

      refresh();
    }

    function refresh() {
      isInEditMode.value = false;
      getItems();
    }

    function selectItem(key: string) {
      if (showSelect.value === 'one') {
        emit('update:selection', [key]);
        return;
      }

      const index = selection.value.indexOf(key);

      if (index >= 0) {
        selection.value.splice(index, 1);
      } else {
        selection.value.push(key);
      }
    }

    function hasPermission(action: 'create' | 'read' | 'update' | 'delete') {
      const mandatory = mandatoryFields.value;
      const permitted = new Set(permissionsStore.getPermission(metaCollectionName.value, action)?.fields || []);

      if (permitted.has('*')) return true;

      for (const key of mandatory) {
        if (!permitted.has(key)) return false;
      }

      return true;
    }

    async function handleSaveChanges() {
      if (!defPrimKeyName.value) return;

      try {
        isSaving.value = true;

        const toBeUpdated = [...dirtyItems.value].map(([key, _val]) => {
          const item = getItem(key);

          if (!item) throw new Error(`handleSaveChanges: Invalid ID [${key}] received during iteration`);

          const result = {
            [defPrimKeyName.value!]: key,
          };

          item._changes.forEach((val: string, key: any) => (result[key] = val));

          return result;
        });

        await updateDb(toBeUpdated);
      } catch (e) {
        console.error(e);
      } finally {
        isSaving.value = false;
      }
    }

    function toggleEditMode() {
      isInEditMode.value = !isInEditMode.value;
    }

    async function handleCreateModel(newCollection: string, newConnector: string) {
      if (!defCollectionName.value || !defPrimKeyField.value) return;
      try {
        await createModel({
          defCollectionName: defCollectionName.value,
          defPrimKeyField: defPrimKeyField.value,
          defConnectorName: newConnector,
          metaCollectionName: newCollection,
        });
        await Promise.all([collectionsStore.hydrate(), fieldsStore.hydrate(), relationsStore.hydrate()]);
        metaCollectionName.value = newCollection;
      } catch (e) {
        console.error(e);
      }
    }

    function handleSaveCollapsed() {
      const result: string[] = [];

      data.forEach(({ _is_expanded, id, rels_children }, key) => {
        if (id && !_is_expanded && rels_children.length) result.push(key);
      });

      collapsed.value = result;
    }
  },
});
