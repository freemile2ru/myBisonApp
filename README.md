<p align="center" style="text-align:center">
  <h1>MyBisonApp</h1>
  <p><img alt="CI STATUS" src="https://github.com/<OWNER>/<REPOSITORY>/workflows/main/badge.svg"/></p>
</p>

# Getting Started Tutorial
This checklist and mini-tutorial will make sure you make the most of your shiny new Bison app.

## Migrate your database and start the dev server
- [ ] Run `yarn db:migrate` to prep and migrate your local database. If this fails, make sure you have Postgres running and the generated `DATABASE_URL` values are correct in your `.env` files.
- [ ] Run `yarn dev` to start your development server

## Complete a Bison workflow
While not a requirement, Bison works best when you start development with the database and API layer. We will illustrate how to use this by adding the concept of an organization to our app.

### The Database
Bison uses Prisma for database operations. We've added a few conveniences around the default Prisma setup, but if you're familiar with Prisma, you're familiar with databases in Bison.

- [ ] Define an Organization table in `prisma/schema.prisma`. 

We suggest copying the `id`, `createdAt` and `updatedAt` fields from the `User` model.
```
model Organization {
  id        String   @id @default(cuid())
  name      String
  users     User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

If you use VSCode and have the [Prisma extension](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) installed, saving the file should automatically add the inverse relationship to the `User` model!

```
model User {
  id             String        @id @default(cuid())
  email          String        @unique
  password       String
  roles          Role[]
  profile        Profile?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  organization   Organization? @relation(fields: [organizationId], references: [id])
  organizationId String?
}
```

- [ ] Generate a migration with `yarn g:migration`.

You should see a new folder in `prisma/migrations`. We recommend opening the `README.md` file within the new migration folder to double check the sql that was generated for you.
- [ ] Migrate the database with `yarn db:migrate`

For more on Prisma, [view the docs](https://www.prisma.io/docs/).

### The GraphQL API
With the database changes complete, we need to decide what types, queries, and mutations to expose in our GraphQL API.

Bison uses [Nexus Schema](https://nexusjs.org/docs/) to create the GraphQL API. Nexus provides a strongly-typed, concise way of defining GraphQL types and operations.

- [ ] Create a new GraphQL module using `yarn g:graphql organization`
- [ ] Edit the new module to reflect what you want to expose via the API. In the following Mutation example, we alias the Mutation name, require a user to be logged in, and force the new Organization to be owned by the logged in user. All in about 10 lines of code!

Because Nexus is strongly typed, all of the `t.` operations should autocomplete in your editor. Bison uses the [Prisma plugin](https://nexusjs.org/docs/pluginss/prisma/api) for Nexus, which enables the `t.model` and `t.crud` functions.
 
```ts
// Organization Type
export const Organization = objectType({
  name: 'Organization',
  description: 'A Organization',
  definition(t) {
    t.model.id();
    t.model.name();
    t.model.createdAt();
    t.model.updatedAt();
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
```

### Understanding the GraphQL API and TypeScript types
- [ ] Open `api.graphql` and look at our the new definitions that were generated for you:

```graphql
"""
An Organization
"""
type Organization {
  createdAt: DateTime!
  id: String!
  updatedAt: DateTime!
}

input OrganizationCreateOneWithoutUsersInput {
  connect: OrganizationWhereUniqueInput
  create: OrganizationCreateWithoutUsersInput
}

input OrganizationCreateWithoutUsersInput {
  createdAt: DateTime
  id: String
  updatedAt: DateTime
}

input OrganizationWhereInput {
  AND: [OrganizationWhereInput!]
  createdAt: DateTimeFilter
  id: StringFilter
  NOT: [OrganizationWhereInput!]
  OR: [OrganizationWhereInput!]
  updatedAt: DateTimeFilter
  users: UserListRelationFilter
}

input OrganizationWhereUniqueInput {
  id: String
}
```

- [ ] Open up `types.ts` to see the generated TypeScript types that correspond with the graphql changes.

### API Request Tests
Let's confirm the API changes using a request test. To do this:
- [ ] Generate a new factory: `yarn g:test:factory organization`
- [ ] Add a default value for organization name in the build function. You can use any of the methods from the `chance` library.

```ts
export const OrganizationFactory = {
  build: (attrs: Partial<Organization> = {}) => {
    return {
      id: chance.guid(),
      name: chance.company(), // <-- add this
      ...attrs,
    };
  },
// ...
```

- [ ] Generate a new api request test: `yarn g:test:request createOrganization`
- [ ] Update the API request test to call the new mutation and ensure that we get an error if not logged in. If you are curious what the `Input` type should be, check `api.graphql`.

Here we use inline snapshots to confirm the error message content, but you can also manually assert the content.

```ts
import { graphQLRequest, graphQLRequestAsUser, resetDB, disconnect } from '../../helpers';
import { OrganizationFactory } from '../factories/organization';

beforeEach(async () => resetDB());
afterAll(async () => disconnect());

describe('createOrganization mutation', () => {
  it('returns an error if not logged in', async () => {
    const query = `
    mutation createOrganization($data: OrganizationCreateInput!) {
      createOrganization(data: $data) {
        id
        name
        users {
          email
        }
      }
    }
  `;

    const variables = { data: { name: 'Cool Company' } };
    const response = await graphQLRequest({ query, variables });
    const errorMessages = response.body.errors.map((e) => e.message);

    expect(errorMessages).toMatchInlineSnapshot(`
        Array [
          "Not authorized",
        ]
      `);
  });
});
```

- [ ] add a new test to confirm that the organization user is set to the current user

```ts
it('sets the user to the logged in user', async () => {
    const query = `
    mutation createOrganization($data: OrganizationCreateInput!) {
      createOrganization(data: $data) {
        id
        name
        users {
          id
        }
      }
    }
  `;

    const user = await UserFactory.create();
    const variables = { data: { name: 'Cool Company', users: { connect: [{ id: 'notmyid' }] } } };
    const response = await graphQLRequestAsUser(user, { query, variables });
    const organization = response.body.data.createOrganization;
    const [organizationUser] = organization.users;

    expect(organizationUser.id).toEqual(user.id);
  });
```

### Add a Frontend page and form that creates an organization
Now that we have the API finished, we can move to the frontend changes.

- [ ] Create a new page to create organizations: `yarn g:page organizations/new`
- [ ] Create an OrganizationForm component: `yarn g:component OrganizationForm`
- [ ] Add a simple form with a name input. See the [React Hook Form docs](https://react-hook-form.com) for detailed information.

```tsx
import React from 'react';
import { useForm } from 'react-hook-form';


export function OrganizationForm() {
  const { register, handleSubmit, errors } = useForm();

  async function onSubmit(data) {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input name="name" ref={register({ required: true })} />
      {errors.name && <span>This field is required</span>}
      
      <input type="submit" />
    </form>
  );
}
```

- [ ] Update the form to use Chakra components

```tsx
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl id="name">
        <FormLabel htmlFor="name">Name</FormLabel>
        <Input
          type="text"
          name="name"
          ref={register({ required: true })}
          isInvalid={errors.name}
        />
        <ErrorText>{errors.name && errors.name.message}</ErrorText>
      </FormControl>

      <Button type="submit" marginTop={8} width="full">
        Signup
      </Button>
    </form>
  );
}
```

- [ ] Add a graphql mutation to create an organization (use the same code from the API request test to keep it easy!)
- [ ] Make sure you import gql from @apollo/client since we are working in the frontend.

```tsx
// add the mutation and save the file
export const CREATE_ORGANIZATION_MUTATION = gql`
  mutation createOrganization($data: OrganizationCreateInput!) {
    createOrganization(data: $data) {
      id
      name
      users {
        id
      }
    }
  }
`;
```

- [ ] Save the file. You should see GraphQL Codegen pickup on the changes.
- [ ] Open `types.ts`. Codegen should have created a new hook called `useCreateOrganizationMutation`, which we can use to get fully typed graphql operations!

```tsx
// types.ts - search for the following function:

export function useCreateOrganizationMutation(
  baseOptions?: ApolloReactHooks.MutationHookOptions<
    CreateOrganizationMutation,
    CreateOrganizationMutationVariables
  >
)
```

- [ ] Use the newly generated hook to save the results of the form:

```tsx
export function OrganizationForm() {
  const { register, handleSubmit, errors } = useForm();
  const [createOrganization, { data, loading, error }] = useCreateOrganizationMutation();

  async function onSubmit(data) {
    createOrganization(data);
  }
}
```

- [ ] Attach the mutations loading state to the button loading state

```tsx
<Button type="submit" marginTop={8} width="full" isLoading={loading}>
  Signup
</Button>
```

You should now have a fully working form that creates a new database entry on submit!

### Adding a new page that shows the organization

- [ ] Generate a new page: `yarn g:page organizations/[:id]`. This uses the dynamic page capability of Next.js.
- [ ] Add a new "cell" to fetch data. While not required, it keeps things clean. `yarn g:cell Organization`
- [ ] Add a query to the cell that fetches organization data

```jsx
import React from 'react';
import gql from 'graphql-tag';
import { Spinner, Text } from '@chakra-ui/react';

export const QUERY = gql`
  query organization {
    organization {
      name
    }
  }
`;

export const Loading = () => <Spinner />;
export const Error = () => <Text>Error. See dev tools.</Text>;
export const Empty = () => <Text>No data.</Text>;

export const Success = () => {
  return <Text>Awesome!</Text>;
};

export const OrganizationCell = () => {
  return <Empty />;
};
```

- [ ] Verify we get an error about querying for organizations in the dev server console.

```
[WATCHERS] [GQLCODEGEN]     GraphQLDocumentError: Cannot query field "organization" on type "Query".
```

- [ ] Fix this by allowing users to query by organization. Update the `graphql/modules/organzization` file.

```ts
// add this
export const OrganizationQueries = extendType({
  type: 'Query',
  definition(t) {
    t.crud.organization();
  },
});
```

Going back to our dev console, we should see a new error.

```
[WATCHERS] [GQLCODEGEN]     GraphQLDocumentError: Field "organization" argument "where" of type "OrganizationWhereUniqueInput!" is required, but it was not provided.
```

We forgot to add a where clause to our organization query that's in the cell. Let's do that now.

- [ ] Open `api.graphql` to see the parameters we can pass to the organization query.
- [ ] Copy the `where` parameter and use it in our cell.

```graphql
type Query {
  '''
  organization(where: OrganizationWhereUniqueInput!): Organization
  '''
}
```

- [ ] Update the organization query to take a parameter and use the where query

```tsx
export const QUERY = gql`
  query organization($where: OrganizationWhereUniqueInput!) {
    organization(where: $where) {
      name
    }
  }
`;
```

- [ ] Use the newly generated hook from `types.ts` to fetch data in the cell.
- [ ] Add a prop to the cell for organizationId and pass the value to the query.
- [ ] Udate the Success component to take the proper return type for the query
- [ ] Only render the Success component if `data.organization` is present.

```tsx
import React from 'react';
import gql from 'graphql-tag';
import { Spinner, Text } from '@chakra-ui/react';

import { OrganizationQuery, useOrganizationQuery } from '../types';

export const QUERY = gql`
  query organization($where: OrganizationWhereUniqueInput!) {
    organization(where: $where) {
      name
    }
  }
`;

export const Loading = () => <Spinner />;
export const Error = () => <Text>Error. See dev tools.</Text>;
export const Empty = () => <Text>No data.</Text>;

export const Success = ({ organization }: OrganizationQuery) => {
  return <Text>Awesome! {organization.name}</Text>;
};

export const OrganizationCell = ({ organizationId }) => {
  const { data, loading, error } = useOrganizationQuery({
    variables: {
      where: { id: organizationId },
    },
  });

  if (loading) return <Loading />;
  if (error) return <Error />;
  if (data.organization) return <Success {...data} />;

  return <Empty />;
};
```

- [ ] Add the Cell to the organization page:

```tsx
import React from 'react';
import Head from 'next/head';
import { Flex } from '@chakra-ui/react';
import { useRouter } from 'next/router';

import { OrganizationCell } from '../../cells/OrganizationCell';

function OrganizationPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <>
      <Head>
        <title>An organization</title>
      </Head>

      <Flex direction={{ base: 'column', lg: 'row' }}>
        <OrganizationCell organizationId={id} />
      </Flex>
    </>
  );
}

export default OrganizationPage;
```

## Congrats!

Outside of e2e tests, you've used just about every feature in Bison. But don't worry. We've got your back there too.

Bonus:

- [ ] View the login and logout e2e tests