import { createCollection, createField, createItems, createRelation, readItems } from '@directus/sdk';
import { FieldRaw } from '@directus/types';
import { computed, ref } from 'vue';
import { FieldKey, fieldNames, getCollectionFields, validateField, ValidateFieldProps } from './fields-model';

type CommonProps = {
  defCollectionName: string;
  defPrimKeyField: FieldRaw;
  defConnectorName: string;
  metaCollectionName: string;
};

type MandatoryFields = Omit<FieldKey, 'id'>;

export default function useModel(client: any) {
  const mandatoryFields = computed<MandatoryFields[]>(() => fieldNames.filter((key) => key !== 'id'));
  const isCreatingModel = ref(false);

  const validateFields = ({
    foreignFields,
    ...rest
  }: { foreignFields: FieldRaw[] } & Omit<ValidateFieldProps, 'field'>) => {
    const fields = new Set(mandatoryFields.value);

    foreignFields.forEach((item) => {
      if (mandatoryFields.value.includes(item.field as MandatoryFields)) {
        validateField({ field: item, ...rest });
        fields.delete(item.field);
      }
    });

    if (fields.size > 0) {
      throw new Error('Following fields are missing: ' + [...fields].join(', '));
    }
  };

  const createModel = async (props: CommonProps) => {
    isCreatingModel.value = true;
    try {
      const newCollection = getCollectionPayload(props);
      await client.request(createCollection(newCollection));

      const newConnector = getConnectorPayload(props);
      await client.request(createField(newConnector.collection, newConnector));

      const newRelations = getRelationsPayload(props);
      await Promise.all(newRelations.map((rel) => client.request(createRelation(rel))));

      await populateItems(props);
    } catch (e) {
      throw e;
    } finally {
      isCreatingModel.value = false;
    }
  };

  return {
    createModel,
    isCreatingModel,
    mandatoryFields,
    validateFields,
  };

  function getCollectionPayload({
    metaCollectionName,
    defPrimKeyField,
  }: Pick<CommonProps, 'metaCollectionName' | 'defPrimKeyField'>) {
    return {
      collection: metaCollectionName,
      meta: {
        hidden: false,
      },
      schema: {},
      fields: getCollectionFields(metaCollectionName, defPrimKeyField.type),
    };
  }

  function getConnectorPayload({
    defCollectionName,
    defConnectorName,
  }: Pick<CommonProps, 'defCollectionName' | 'defConnectorName'>) {
    return {
      collection: defCollectionName,
      field: defConnectorName,
      type: 'alias',
      meta: {
        interface: 'list-o2m',
        special: ['o2m'],
      },
    };
  }

  function getRelationsPayload({
    defCollectionName,
    defConnectorName,
    metaCollectionName,
  }: Omit<CommonProps, 'defPrimKeyName'>) {
    return [
      {
        collection: metaCollectionName,
        field: 'rel_parent',
        related_collection: metaCollectionName,
        meta: {
          one_field: 'rels_children',
          sort_field: 'sort',
        },
      },
      {
        collection: metaCollectionName,
        field: 'rel_item',
        related_collection: defCollectionName,
        schema: {
          foreign_key_column: 'id',
          foreign_key_table: defCollectionName,
          on_update: 'NO ACTION',
          on_delete: 'CASCADE',
        },
        meta: {
          many_collection: defCollectionName,
          many_field: 'rel_item',
          one_collection: defCollectionName,
          one_field: defConnectorName,
        },
      },
    ];
  }

  // TODO FIX [LOW]: Typescript error
  async function populateItems({
    defCollectionName,
    metaCollectionName,
    defPrimKeyField,
  }: Omit<CommonProps, 'defConnectorName'>) {
    const defPrimKeyName = defPrimKeyField.field;

    const items = await client.request(
      // @ts-ignore
      readItems(defCollectionName, {
        fields: [defPrimKeyName],
      }),
    );

    if (!items.length) return;

    const updatedItems = items.map((item: any) => ({ rel_item: item[defPrimKeyName] }));

    // @ts-ignore
    await client.request(createItems(metaCollectionName, updatedItems));
  }
}
