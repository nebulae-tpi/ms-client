"use strict";

const uuidv4 = require("uuid/v4");
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const ClientDA = require("../../data/ClientDA");
const ClientValidatorHelper = require('./ClientValidatorHelper');
const ClientKeycloakDA = require("../../data/ClientKeycloakDA");
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const { of, interval } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, mapTo } = require('rxjs/operators');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED_ERROR_CODE
} = require("../../tools/customError");



/**
 * Singleton instance
 */
let instance;

class ClientCQRS {
  constructor() {
  }

  /**  
   * Gets the Client
   *
   * @param {*} args args
   */
  getClient$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "getClient",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Client from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): null;
        return ClientDA.getClient$(args.id, businessId)
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(error))
    );
  }

  /**  
   * Gets the Client list
   *
   * @param {*} args args
   */
  getClientList$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "getClientList",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Client from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;

        return ClientDA.getClientList$(filterInput, args.paginationInput);
      }),
      toArray(),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**  
   * Gets the amount of the Client according to the filter
   *
   * @param {*} args args
   */
  getClientListSize$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "getClientListSize",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Client from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;

        return ClientDA.getClientSize$(filterInput);
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**
  * Create a client
  */
 createClient$({ root, args, jwt }, authToken) {
   
    const client = args ? args.input: undefined;
    client._id = uuidv4();
    client.creatorUser = authToken.preferred_username;
    client.creationTimestamp = new Date().getTime();
    client.modifierUser = authToken.preferred_username;
    client.modificationTimestamp = new Date().getTime();
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "createClient$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => ClientValidatorHelper.checkClientCreationClientValidator$(client, authToken, roles)),
      mergeMap(data => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "ClientCreated",
          eventTypeVersion: 1,
          aggregateType: "Client",
          aggregateId: data.client._id,
          data: data.client,
          user: authToken.preferred_username
        })).pipe(mapTo(data))      
      ),
      map(data => ({ code: 200, message: `Client with id: ${data.client._id} has been created` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**
   * Edit the client state
   */
  updateClientGeneralInfo$({ root, args, jwt }, authToken) {
    const client = {
      _id: args.id,
      generalInfo: args.input,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "updateClientGeneralInfo$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => 
        ClientDA.getClient$(client._id)
        .pipe(
          mergeMap(userMongo => ClientValidatorHelper.checkClientUpdateClientValidator$(client, authToken, roles, userMongo)),
          mergeMap(data => {
            if(data.userMongo && data.userMongo.auth && data.userMongo.auth.userKeycloakId){
              return ClientKeycloakDA.updateUserGeneralInfo$(data.userMongo.auth.userKeycloakId, data.client.generalInfo).pipe(mapTo(data));
            }
            return of(data)
          })
          )            
      ),
      mergeMap(data => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "ClientGeneralInfoUpdated",
          eventTypeVersion: 1,
          aggregateType: "Client",
          aggregateId: client._id,
          data: client,
          user: authToken.preferred_username
        })).pipe(mapTo(data))
      ),
      map(data => ({ code: 200, message: `Client with id: ${data.client._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }


  /**
   * Edit the client state
   */
  updateClientState$({ root, args, jwt }, authToken) {
    const client = {
      _id: args.id,
      state: args.newState,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "updateClientState$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => 
        ClientDA.getClient$(client._id)
        .pipe( 
          mergeMap(userMongo => ClientValidatorHelper.checkClientUpdateClientStateValidator$(client, authToken, roles, userMongo)),
          // Update the state of the user on Keycloak
          mergeMap(data => {
            if(data.userMongo && data.userMongo.auth && data.userMongo.auth.userKeycloakId){
              return ClientKeycloakDA.updateUserState$(data.userMongo.auth.userKeycloakId, data.client.generalInfo).pipe(mapTo(data));
            }
            return of(data)
          })
        )
      ),
      mergeMap(data => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "ClientStateUpdated",
          eventTypeVersion: 1,
          aggregateType: "Client",
          aggregateId: client._id,
          data: client,
          user: authToken.preferred_username
        })
      ).pipe(mapTo(data))),
      map(() => ({ code: 200, message: `Client with id: ${client._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  updateClientLocation$({ root, args, jwt }, authToken) {
    const client = {
      _id: args.id,
      latLng: args.input,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "updateClientLocation$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(() => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "ClientLocationUpdated",
          eventTypeVersion: 1,
          aggregateType: "Client",
          aggregateId: client._id,
          data: client,
          user: authToken.preferred_username
        })
      )
      ),
      map(() => ({ code: 200, message: `Location client with id: ${client._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**
   * Create the client auth
   */
  createClientAuth$({ root, args, jwt }, authToken) {
    const client = {
      _id: args.id,
      authInput: args.input,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "createClientAuth$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => 
        ClientDA.getClient$(client._id)
        .pipe( 
          //Validate the data
          mergeMap(userMongo => ClientValidatorHelper.checkClientCreateClientAuthValidator$(client, authToken, roles, userMongo)),
          // Creates the user on Keycloak
          mergeMap(data => ClientKeycloakDA.createUser$(data.userMongo, data.client.authInput)
          .pipe(
            //Assignes a password to the user
            mergeMap(userKeycloak => {
              const password = {
                temporary: data.client.authInput.temporary || false,
                value: data.client.authInput.password
              }
              return ClientKeycloakDA.resetUserPassword$(userKeycloak.id, password)
              .pipe(
                //Adds CLIENT role
                mergeMap(reset => ClientKeycloakDA.addRolesToTheUser$(userKeycloak.id, ['SATELLITE'])),
                mapTo(userKeycloak)
              )
            })
          ))          
        )
      ),
      mergeMap(userKeycloak => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "ClientAuthCreated",
          eventTypeVersion: 1,
          aggregateType: "Client",
          aggregateId: client._id,
          data: {
            userKeycloakId: userKeycloak.id,
            username: userKeycloak.username
          },
          user: authToken.preferred_username
        })
      )
      ),
      map(() => ({ code: 200, message: `Auth credential of the client with id: ${client._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  /**
   * Reset client password
   */
  resetClientPassword$({ root, args, jwt }, authToken) {
    const client = {
      _id: args.id,
      passwordInput: args.input,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "resetClientPassword$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => 
        ClientDA.getClient$(client._id)
        .pipe( mergeMap(userMongo => ClientValidatorHelper.checkClientUpdateClientAuthValidator$(client, authToken, roles, userMongo)))
      ),
      mergeMap(() => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "ClientAuthPasswordUpdated",
          eventTypeVersion: 1,
          aggregateType: "Client",
          aggregateId: client._id,
          data: {},
          user: authToken.preferred_username
        }))
      ),
      map(() => ({ code: 200, message: `Password of the client with id: ${client._id} has been changed` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**
   * Removes the client auth
   */
  removeClientAuth$({ root, args, jwt }, authToken) {
    const client = {
      _id: args.id,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "removeClientAuth$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => 
        ClientDA.getClient$(client._id)
        .pipe( 
          mergeMap(userMongo => ClientValidatorHelper.checkClientRemoveClientAuthValidator$(client, authToken, roles, userMongo)),
          mergeMap(data => ClientKeycloakDA.removeUser$(data.userMongo.auth.userKeycloakId)
            .pipe(
              mapTo(data),
              // If there was an error, check if the user does not exist
              catchError(error => {
                return ClientValidatorHelper.checkIfUserWasDeletedOnKeycloak$(userMongo.auth.userKeycloakId);
              })
            )
          ),
        )
      ),
      mergeMap(data => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "ClientAuthDeleted",
          eventTypeVersion: 1,
          aggregateType: "Client",
          aggregateId: client._id,
          data: {
            userKeycloakId: data.userMongo.auth.userKeycloakId,
            username: data.userMongo.auth.username
          },
          user: authToken.preferred_username
        })
      )
      ),
      map(() => ({ code: 200, message: `Auth credential of the client with id: ${client._id} has been deleted` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }


  //#endregion


}

/**
 * @returns {ClientCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new ClientCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
