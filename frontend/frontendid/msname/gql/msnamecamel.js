import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

//Hello world sample, please remove
export const getHelloWorld = gql`
  query getHelloWorldFrommsnamepascal{
    getHelloWorldFrommsnamepascal{
      sn
    }
  }
`;


//Hello world sample, please remove
export const msnamepascalHelloWorldSubscription = gql`
  subscription{
    msnamepascalHelloWorldSubscription{
      sn
  }
}`;

export const msnamepascalmsentitypascal = gql`
  query msnamepascalmsentitypascal($id: String!) {
    msnamepascalmsentitypascal(id: $id) {
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

export const msnamepascalmsentitiespascal = gql`
  query msnamepascalmsentitiespascal($filterInput: FilterInput!, $paginationInput: PaginationInput!) {
    msnamepascalmsentitiespascal(filterInput: $filterInput, paginationInput: $paginationInput) {
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

export const msnamepascalmsentitiespascalSize = gql`
  query msnamepascalmsentitiespascalSize($filterInput: FilterInput!) {
    msnamepascalmsentitiespascalSize(filterInput: $filterInput)
  }
`;

export const msnamepascalCreatemsentitypascal = gql `
  mutation msnamepascalCreatemsentitypascal($input: msnamepascalmsentitypascalInput!){
    msnamepascalCreatemsentitypascal(input: $input){
      code
      message
    }
  }
`;

export const msnamepascalUpdatemsentitypascalGeneralInfo = gql `
  mutation msnamepascalUpdatemsentitypascalGeneralInfo($id: ID!, $input: msnamepascalmsentitypascalGeneralInfoInput!){
    msnamepascalUpdatemsentitypascalGeneralInfo(id: $id, input: $input){
      code
      message
    }
  }
`;

export const msnamepascalUpdatemsentitypascalState = gql `
  mutation msnamepascalUpdatemsentitypascalState($id: ID!, $newState: Boolean!){
    msnamepascalUpdatemsentitypascalState(id: $id, newState: $newState){
      code
      message
    }
  }
`;

// SUBSCRIPTION
export const msnamepascalmsentitypascalUpdatedSubscription = gql`
  subscription{
    msnamepascalmsentitypascalUpdatedSubscription{
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
