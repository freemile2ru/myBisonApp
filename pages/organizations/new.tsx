import React from 'react';
import Head from 'next/head';
import { Heading, Center, Flex } from '@chakra-ui/react';

function OrganizationsNewPage() {
  return (
    <>
      <Head>
        <title>OrganizationsNewPage</title>
      </Head>

      <Flex direction={{ base: 'column', lg: 'row' }}>
        <Center>
          <Heading size="lg">I am organizations/new page</Heading>
        </Center>
      </Flex>
    </>
  );
}

export default OrganizationsNewPage;
