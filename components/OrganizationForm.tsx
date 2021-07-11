import React from 'react';
import { useForm } from 'react-hook-form';
import { gql } from '@apollo/client';
import { Button, FormControl, FormLabel, Input } from '@chakra-ui/react';

import { useCreateOrganizationMutation } from '../types';

import { ErrorText } from './ErrorText';

/** Description of component */
export function OrganizationForm() {
  const { register, handleSubmit, errors } = useForm();
  const [createOrganization, { data, loading, error }] = useCreateOrganizationMutation();

  async function onSubmit(data) {
    createOrganization(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl id="name">
        <FormLabel htmlFor="name">Name</FormLabel>
        <Input type="text" name="name" ref={register({ required: true })} isInvalid={errors.name} />
        <ErrorText>{errors.name && errors.name.message}</ErrorText>
      </FormControl>

      <Button type="submit" marginTop={8} width="full" isLoading={loading}>
        Signup
      </Button>
    </form>
  );
}

export const CREATE_ORGANIZATION_MUTATION = gql`
  mutation createOrganization($data: OrganizationCreateInput!) {
    createOrganization(data: $data) {
      id
      name
    }
  }
`;
