import path from 'path';

import { nexusPrisma } from 'nexus-plugin-prisma';
import { declarativeWrappingPlugin, fieldAuthorizePlugin, makeSchema } from 'nexus';

import prettierConfig from '../prettier.config';

import * as types from './modules';

const currentDirectory = process.cwd();

export const schema = makeSchema({
  types,
  plugins: [
    fieldAuthorizePlugin(),
    declarativeWrappingPlugin(),
    nexusPrisma({ experimentalCRUD: true }),
  ],
  outputs: {
    schema: path.join(currentDirectory, 'api.graphql'),
    typegen: path.join(currentDirectory, 'types', 'nexus.d.ts'),
  },
  contextType: {
    module: path.join(currentDirectory, 'graphql', 'context.ts'),
    export: 'Context',
  },
  sourceTypes: {
    modules: [
      {
        module: '.prisma/client',
        alias: 'PrismaClient',
      },
    ],
  },
  prettierConfig,
});
