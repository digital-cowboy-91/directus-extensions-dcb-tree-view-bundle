import { DirectusField, NestedPartial } from '@directus/sdk';
import { DeepPartial, FieldRaw } from '@directus/types';
import { z, ZodError } from 'zod';

export type FieldKey =
  | 'group'
  | 'id'
  | 'level'
  | 'path'
  | 'rel_item'
  | 'rel_parent'
  | 'rels_children'
  | 'slug_is_key'
  | 'slug'
  | 'sort';

type TupleValue = {
  validate: (props: {
    defCollectionName: string;
    metaCollectionName: string;
    defPrimKeyType: string;
  }) => z.AnyZodObject;
  default: DeepPartial<FieldRaw>;
};

const fields = new Map<FieldKey, TupleValue>([
  [
    'id',
    {
      validate: () =>
        z.object({
          type: z.literal('uuid'),
          schema: z.object({
            is_primary_key: z.literal(true),
          }),
          meta: z.object({
            interface: z.literal('input'),
            special: z.array(z.literal('uuid')),
            readonly: z.literal(true),
          }),
        }),
      default: {
        type: 'uuid',
        schema: {
          is_primary_key: true,
        },
        meta: {
          interface: 'input',
          special: ['uuid'],
          readonly: true,
          hidden: true,
        },
      },
    },
  ],
  [
    'group',
    {
      validate: () =>
        z.object({
          type: z.literal('string'),
          schema: z.object({
            default_value: z.string(),
          }),
          meta: z.object({
            interface: z.literal('dcb-dropdown-group'),
            readonly: z.literal(true),
            options: z.object({
              choices: z
                .array(
                  z.object({
                    text: z.string(),
                    value: z.string(),
                    max_level: z.number(),
                  }),
                )
                .refine(
                  (list) => {
                    const ungrouped = list.find((item) => item.value === 'ungrouped' && item.max_level === 0);

                    return !!ungrouped;
                  },
                  {
                    message: 'Must contain an item with value "ungrouped" and max level 0',
                  },
                ),
            }),
          }),
        }),
      default: {
        type: 'string',
        schema: {
          default_value: 'ungrouped',
        },
        meta: {
          interface: 'dcb-dropdown-group',
          options: {
            choices: [
              {
                text: 'Ungrouped',
                value: 'ungrouped',
                max_level: 0,
              },
            ],
          },
          readonly: true,
          hidden: true,
          sort: 8,
        },
      },
    },
  ],
  [
    'level',
    {
      validate: () =>
        z.object({
          type: z.literal('integer'),
          meta: z.object({
            interface: z.literal('input'),
          }),
        }),
      default: {
        type: 'integer',
        meta: {
          interface: 'input',
          readonly: true,
          hidden: true,
          sort: 9,
        },
      },
    },
  ],
  [
    'sort',
    {
      validate: () =>
        z.object({
          type: z.literal('integer'),
          meta: z.object({
            interface: z.literal('input'),
          }),
        }),
      default: {
        type: 'integer',
        meta: {
          interface: 'input',
          readonly: true,
          hidden: true,
          sort: 10,
        },
      },
    },
  ],
  [
    'rel_item',
    {
      validate: ({ defCollectionName }) =>
        z.object({
          schema: z.object({
            is_unique: z.literal(true),
            foreign_key_table: z.literal(defCollectionName),
          }),
          meta: z.object({
            interface: z.literal('select-dropdown-m2o'),
            special: z.array(z.literal('m2o')),
          }),
        }),
      default: {
        schema: {
          is_unique: true,
        },
        meta: {
          interface: 'select-dropdown-m2o',
          special: ['m2o'],
          required: true,
          sort: 6,
        },
      },
    },
  ],
  [
    'rel_parent',
    {
      validate: ({ metaCollectionName }) =>
        z.object({
          schema: z.object({
            foreign_key_table: z.literal(metaCollectionName),
          }),
          meta: z.object({
            interface: z.literal('select-dropdown-m2o'),
            special: z.array(z.literal('m2o')),
          }),
        }),
      default: {
        type: 'uuid',
        meta: {
          interface: 'select-dropdown-m2o',
          special: ['m2o'],
          options: {
            enableSelect: false,
            enableCreate: false,
          },
          sort: 2,
        },
      },
    },
  ],
  [
    'rels_children',
    {
      validate: () =>
        z.object({
          type: z.literal('alias'),
          meta: z.object({
            interface: z.literal('list-o2m'),
            special: z.array(z.literal('o2m')),
          }),
        }),
      default: {
        type: 'alias',
        meta: {
          interface: 'list-o2m',
          special: ['o2m'],
          readonly: true,
          hidden: true,
          sort: 7,
        },
      },
    },
  ],
  [
    'slug',
    {
      validate: () =>
        z.object({
          type: z.literal('string'),
          meta: z.object({
            interface: z.literal('input'),
            options: z.object({
              slug: z.literal(true),
            }),
          }),
        }),
      default: {
        type: 'string',
        meta: {
          interface: 'input',
          options: {
            slug: true,
          },
          sort: 3,
          width: 'half',
        },
      },
    },
  ],
  [
    'slug_is_key',
    {
      validate: () =>
        z.object({
          type: z.literal('boolean'),
          schema: z.object({
            default_value: z.literal(false),
          }),
          meta: z.object({
            interface: z.literal('boolean'),
            special: z.array(z.literal('cast-boolean')),
          }),
        }),
      default: {
        type: 'boolean',
        schema: {
          default_value: false,
        },
        meta: {
          interface: 'boolean',
          hidden: false,
          special: ['cast-boolean'],
          sort: 4,
          width: 'half',
        },
      },
    },
  ],
  [
    'path',
    {
      validate: () =>
        z.object({
          type: z.literal('string'),
          meta: z.object({
            interface: z.literal('input'),
          }),
        }),
      default: {
        type: 'string',
        meta: {
          interface: 'input',
          readonly: true,
          sort: 5,
        },
      },
    },
  ],
]);

export const fieldNames = [...fields.keys()];

export function getCollectionFields(metaCollectionName: string, defPrimKeyType: string) {
  return [...fields].map(
    ([key, val]) =>
      ({
        collection: metaCollectionName,
        field: key,
        schema: null,
        type: key === 'rel_item' ? defPrimKeyType : undefined,
        ...val.default,
      }) as NestedPartial<DirectusField<unknown>>,
  );
}

export type ValidateFieldProps = {
  field: FieldRaw;
  defCollectionName: string;
  metaCollectionName: string;
  defPrimKeyType: string;
};

export function validateField({ field, ...rest }: ValidateFieldProps) {
  try {
    fields
      .get(field.field as FieldKey)!
      .validate(rest)
      .parse(field);
  } catch (e) {
    throw {
      message: `Error when validating field [${field.field}]`,
      details: e instanceof ZodError ? e.issues : e,
    };
  }
}
