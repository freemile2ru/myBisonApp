import Chance from 'chance';
import { Organization } from '@prisma/client';

import { buildPrismaIncludeFromAttrs, prisma } from '../helpers';

const chance = new Chance();

export const OrganizationFactory = {
  build: (attrs: Partial<Organization> = {}) => {
    return {
      id: chance.guid(),
      name: chance.company(),
      ...attrs,
    };
  },

  create: async (attrs: Partial<Organization> = {}) => {
    const organization = OrganizationFactory.build(attrs);
    const options: Record<string, any> = {};
    const includes = buildPrismaIncludeFromAttrs(attrs);
    if (includes) options.include = includes;

    return await prisma.organization.create({
      data: { ...organization },
      ...options,
    });
  },
};
