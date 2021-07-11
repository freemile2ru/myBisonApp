import { objectType, extendType } from 'nexus';

// Organization Type
export const Organization = objectType({
  name: 'Organization',
  description: 'A Organization',
  definition(t) {
    t.nonNull.id('id');
    t.nonNull.string('name');
    t.nonNull.date('createdAt');
    t.nonNull.date('updatedAt');
  },
});

// Mutatations
export const OrganizationMutations = extendType({
  type: 'Mutation',
  definition(t) {
    t.crud.createOneOrganization({
      alias: 'createOrganization',
      authorize: (_root, _args, ctx) => !!ctx.user,
      computedInputs: {
        users: ({ ctx }) => ({
          connect: [{ id: ctx.user.id }],
        }),
      },
    });
  },
});
