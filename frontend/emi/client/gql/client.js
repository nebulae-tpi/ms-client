import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

export const ClientClient = gql`
  query ClientClient($id: String!) {
    ClientClient(id: $id) {
      _id
      generalInfo {
        name
        documentId
        phone
        addressLine1
        addressLine2
        city
        neighborhood
        zone
        email
        notes
      }
      satelliteInfo{
        referrerDriverDocumentId
        referrerDriverDocumentIds
        tipType
        satelliteType
        offerOnlyVip
        tip
        offerMinDistance
        offerMaxDistance
        clientAgreements{
          clientId
          clientName
          documentId
          tip
          tipType
        }
        associatedClients{
          clientId
          clientName
          documentId
        }
      }
      auth {
        userKeycloakId
        username
      }
      location{
        lat
        lng
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;

// *here*
export const getClientsFiltered = gql`
query ClientClients($filterInput: ClientClientFilterInput!, $paginationInput: ClientClientPaginationInput!) {
  ClientClients(filterInput: $filterInput, paginationInput: $paginationInput)
}
`;

export const ClientClients = gql`
  query ClientClients($filterInput: ClientClientFilterInput!, $paginationInput: ClientClientPaginationInput!) {
    ClientClients(filterInput: $filterInput, paginationInput: $paginationInput)
  }
`;

export const ClientClientsSize = gql`
  query ClientClientsSize($filterInput: ClientClientFilterInput!) {
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

export const ClientUpdateClientSatelliteInfo = gql `
  mutation ClientUpdateClientSatelliteInfo($id: ID!, $input: ClientClientSatelliteInfoInput!){
    ClientUpdateClientSatelliteInfo(id: $id, input: $input){
      code
      message
    }
  }
`;


export const updateClientLocation = gql `
  mutation ClientUpdateClientLocation($id: ID!, $input: ClientClientLocationInput){
    ClientUpdateClientLocation(id: $id, input: $input){
      code
      message
    }
  }
`;



export const ClientUpdateClientCredentials = gql `
  mutation ClientUpdateClientCredentials($id: ID!, $input: ClientClientCredentialsInput!){
    ClientUpdateClientCredentials(id: $id, input: $input){
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

export const ClientCreateClientAuth = gql`
  mutation ClientCreateClientAuth($id: ID!, $username: String!, $input: ClientAuthInput) {
    ClientCreateClientAuth(id: $id, username: $username, input: $input) {
      code
      message
    }
  }
`;

export const ClientRemoveClientAuth = gql`
  mutation ClientRemoveClientAuth($id: ID!) {
    ClientRemoveClientAuth(id: $id) {
      code
      message
    }
  }
`;

export const ClientResetClientPassword = gql`
  mutation ClientResetClientPassword($id: ID!, $input: ClientPasswordInput) {
    ClientResetClientPassword(id: $id, input: $input) {
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
        documentId
        phone
        addressLine1
        addressLine2
        city
        neighborhood
        zone
        email
        notes
      }
      satelliteInfo{
        referrerDriverDocumentId
        referrerDriverDocumentIds
        tipType
        tip
        offerMinDistance
        offerMaxDistance
        clientAgreements{
          clientId
          clientName
          documentId
          tip
          tipType
        }
        associatedClients{
          clientId
          clientName
          documentId
        }
      }
      auth {
        userKeycloakId
        username
      }
      state
      creationTimestamp
      creatorUser
      modificationTimestamp
      modifierUser
    }
  }
`;
