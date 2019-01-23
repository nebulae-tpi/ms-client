import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

//Hello world sample, please remove
export const getHelloWorld = gql`
  query getHelloWorldFromClient{
    getHelloWorldFromClient{
      sn
    }
  }
`;


//Hello world sample, please remove
export const ClientHelloWorldSubscription = gql`
  subscription{
    ClientHelloWorldSubscription{
      sn
  }
}`;

export const ClientClient = gql`
  query ClientClient($id: String!) {
    ClientClient(id: $id) {
      _id
      generalInfo {
        name
        description
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;

export const ClientClients = gql`
  query ClientClients($filterInput: FilterInput!, $paginationInput: PaginationInput!) {
    ClientClients(filterInput: $filterInput, paginationInput: $paginationInput) {
      _id
      generalInfo {
        name
        description
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;

export const ClientClientsSize = gql`
  query ClientClientsSize($filterInput: FilterInput!) {
    ClientClientsSize(filterInput: $filterInput)
  }
`;

export const ClientCreateClient = gql `
  mutation ClientCreateClient($input: ClientClientInput!){
    ClientCreateClient(input: $input){
      code
      message
    }
  }
`;

export const ClientUpdateClientGeneralInfo = gql `
  mutation ClientUpdateClientGeneralInfo($id: ID!, $input: ClientClientGeneralInfoInput!){
    ClientUpdateClientGeneralInfo(id: $id, input: $input){
      code
      message
    }
  }
`;

export const ClientUpdateClientState = gql `
  mutation ClientUpdateClientState($id: ID!, $newState: Boolean!){
    ClientUpdateClientState(id: $id, newState: $newState){
      code
      message
    }
  }
`;

// SUBSCRIPTION
export const ClientClientUpdatedSubscription = gql`
  subscription{
    ClientClientUpdatedSubscription{
      _id
      generalInfo {
        name
        description
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;
