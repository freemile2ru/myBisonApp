import { graphQLRequest, graphQLRequestAsUser, resetDB, disconnect } from '../../helpers';
//import { OrganizationFactory } from '../../factories/organization';
import { UserFactory } from '../../factories/user';

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
});
