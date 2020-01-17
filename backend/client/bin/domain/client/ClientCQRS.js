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
const { of, interval, iif } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, mapTo, tap } = require('rxjs/operators');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED_ERROR_CODE,
  CLIENT_ID_MISSING,
  CLIENT_NO_FOUND
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
  getClientProfile$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles, "Client", "getClientProfile", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        tap(() => console.log("getClientProfile$ ==> ", { clientId: authToken.clientId, businessId: authToken.businessId })),
        mergeMap(() => ClientDA.getClient$(authToken.clientId, authToken.businessId || '')),
        tap(client => {
          console.log('Client found ==>', client)
          if (!client) { throw new CustomError('Client no found', 'linkSatellite$', CLIENT_NO_FOUND.code, CLIENT_NO_FOUND.description) }
        }),
        map(client => ({
          id: client._id,
          businessId: client.businessId,
          name: client.generalInfo.name,
          phone: client.generalInfo.phone,
          email: client.generalInfo.email,
          active: client.state,
          satelliteId: client.satelliteId,
          favoritePlaces: client.favoritePlaces || []
        })),
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Client from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin ? (authToken.businessId || '') : null;
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Client from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin ? (authToken.businessId || '') : args.filterInput.businessId;
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Client from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin ? (authToken.businessId || '') : args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;

        return ClientDA.getClientSize$(filterInput);
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  /**
  * Validate user logged from an identity provider
  */
  ValidateNewClient$({ root, args, jwt }, authToken) {
    console.log('Inicia proceso de validación');
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "ValidateNewClient$",
      PERMISSION_DENIED_ERROR_CODE,
      ["CLIENT"]
    ).pipe(
      //Validate the data
      mergeMap(roles => ClientValidatorHelper.checkClientValidateNewClient$().pipe(mapTo(roles))),
      mergeMap(roles => ClientDA.getClientByUsername$(authToken.preferred_username)),
      mergeMap(client => {
        if (client) {
          if (client.businessId === args.businessId) {
            console.log('Pasa sin hacer cambios');
            return of({client, updated: false});
          }
          else { 
            console.log('marca para cambiar unidad de negocio');
            return ClientDA.updateClientBusinessId$(client._id, businessId).pipe(
              map(newClient => ({client: newClient, updated: true}))
            )
          }
        }
        else { 
          return of(authToken).pipe(
            mergeMap(token => {
              const client = {
                generalInfo: {
                  name: token.preferred_username
                },
                auth: {
                  username: token.preferred_username,
                  userKeycloakId: token.sub
                },
                state: true,
                businessId: token.businessId
              };
              client._id = uuidv4();
              client.creatorUser = 'SYSTEM';
              client.creationTimestamp = new Date().getTime();
              client.modifierUser = authToken.preferred_username;
              client.modificationTimestamp = new Date().getTime();
              return ClientDA.createClient$(client);
            }),
            map(result => result.ops[0]),
            mergeMap(client => eventSourcing.eventStore.emitEvent$(
              new Event({
                eventType: "EndClientCreated",
                eventTypeVersion: 1,
                aggregateType: "Client",
                aggregateId: client._id,
                data: client,
                user: 'SYSTEM'
              })).pipe(mapTo({client, updated: true}))
            ),
          )
        }
      }
      ),
      mergeMap(clientResult => { 
        if (authToken.clientId || clientResult.updated) {
          return of(clientResult.client).pipe(
            mergeMap(client => {
              const attributes = {
                clientId: client._id,
                businessId: authToken.businessId
              };
              return ClientKeycloakDA.updateUserAttributes$(client.auth.userKeycloakId, attributes).pipe(mapTo(clientResult))
            })
          )
        } else { 
          return of(clientResult);
        }
      }),
      map(clientResult => ({
        clientId: clientResult.client._id,
        name: clientResult.client.generalInfo.name,
        username: clientResult.client.auth.username,
        updated: clientResult.updated
      })),
      tap(valueToReturn => { 
        console.log('Retorna valor final: ', valueToReturn);
      }),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }
  // APP-CLIENT

  linkSatellite$({ root, args, jwt }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles, "Client", "linkSatellite$", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        mergeMap(() => ClientDA.getClient$(args.satelliteId, authToken.businessId || '')),
        tap(satelliteFound => {
          if (!authToken.clientId) { throw new CustomError('Missing client ID in token', 'linkSatellite$', CLIENT_ID_MISSING.code, CLIENT_ID_MISSING.description) }
          if (!satelliteFound) { throw new CustomError('Client no found', 'linkSatellite$', CLIENT_NO_FOUND.code, CLIENT_NO_FOUND.description) }
        }),
        mergeMap(() => ClientDA.linkSatellite$(authToken.clientId, args.satelliteId)),
        map(() => ({ code: 200, message: `Satellite Linked successful` })),
        mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  unlinkSatellite$({ root, args, jwt }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles, "Client", "unlinkSatellite$", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        mergeMap(() => ClientDA.linkSatellite$(authToken.clientId, null)),
        map(() => ({ code: 200, message: `Satellite Linked successful` })),
        mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  clientFavoritePlaces$({ root, args, jwt }, authToken) {
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "Client", "clientFavoritePlaces", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        mergeMap(roles => ClientDA.getClientFavorites$(authToken.preferred_username)),
        map(client => client.favoritePlaces || []),
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  clientFavoritePlace$({ root, args, jwt }, authToken) {
    const { id } = args;

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "Client", "clientFavoritePlaces", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        mergeMap(roles => ClientDA.getClientFavoritePlace$(authToken.preferred_username, id)),
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }



  addFavoritePlace$({ root, args, jwt }, authToken) {
    const { type, name, lat, lng } = args.favoritePlace;
    const { clientId } = authToken;

    const favoritePlace = { id: uuidv4(), type, name, location: { lat, lng } };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles, "Client", "addFavoritePlace$", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        mergeMap(() => ClientDA.addClientFavoritePlace$(clientId, favoritePlace)),
        map(() => ({ code: 200, message: `favorite place added successful` })),
        mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  updateFavoritePlace$({ root, args, jwt }, authToken) {
    const { id, type, address, name, lat, lng } = args.favoritePlace;
    const { clientId } = authToken;
    const favoritePlace = { id, type, address, name, location: { lat, lng } };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles, "Client", "updateFavoritePlace$", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        mergeMap(() => ClientDA.updateFavoritePlace$(clientId, favoritePlace)),
        map(() => ({ code: 200, message: `Favorite place updated successful` })),
        mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  removeFavoritePlace$({ root, args, jwt }, authToken) {
    const { clientId } = authToken;
    console.log({ args });

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles, "Client", "updateFavoritePlace$", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        mergeMap(() => args.id
          ? ClientDA.removeFavoritePlaceById$(clientId, args.id)
          : ClientDA.removeFavoritePlaceByName$(clientId, args.name)
        ),

        tap(r => console.log('removeFavoritePlace$ mongo result ==> ', r.result)),
        map(() => ({ code: 200, message: `Favorite place removed successful` })),
        mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  clientLinkedSatellite$({ root, args, jwt }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles, "Client", "linkSatellite$", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        mergeMap(() => ClientDA.getClient$(args.satelliteId, authToken.businessId || '')),
        tap(satelliteFound => {
          if (!satelliteFound) { throw new CustomError('Missin client ID', 'linkSatellite$', CLIENT_NO_FOUND.code, CLIENT_NO_FOUND.description) }
        }),
        map(sf => ({
          _id: sf._id,
          businessId: sf.businessId,
          name: sf.generalInfo.name,
          documentId: sf.generalInfo.documentId,
          phone: sf.generalInfo.phone,
          email: sf.generalInfo.email,
          city: sf.generalInfo.city,
          neighborhood: sf.generalInfo.neighborhood,
          addressLine1: sf.generalInfo.addressLine1,
          addressLine2: sf.generalInfo.addressLine2,
          zone: sf.generalInfo.zone,
          active: sf.state,
          location: sf.location,
          tipType: (sf.satelliteInfo || {}).tipType,
          tip: (sf.satelliteInfo || {}).tip || 0
        })),
        mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  clientSatellites$({ args }, authToken) {
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "Client", "getClientList", PERMISSION_DENIED_ERROR_CODE, ["CLIENT"])
      .pipe(
        mergeMap(() => ClientDA.getSatelliteClientList$(args.filterText, authToken.businessId || '')),
        map(list => list.map(item => ({
          _id: item._id,
          businessId: item.businessId,
          name: item.generalInfo.name,
          documentId: item.generalInfo.documentId,
          phone: item.generalInfo.phone,
          email: item.generalInfo.email,
          city: item.generalInfo.city,
          neighborhood: item.generalInfo.neighborhood,
          addressLine1: item.generalInfo.addressLine1,
          addressLine2: item.generalInfo.addressLine1,
          zone: item.generalInfo.zone,
          active: item.state,
          location: item.location,
          tipType: (item.satelliteInfo || {}).tipType,
          tip: (item.satelliteInfo || {}).tip || 0,
          referrerDriverDocumentId: (item.satelliteInfo || {}).referrerDriverDocumentId,
          offerMinDistance: (item.satelliteInfo || {}).offerMinDistance,
          offerMaxDistance: (item.satelliteInfo || {}).offerMaxDistance
        }))),
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  // APP-CLIENT



  /**
  * Create a client.
  */
  createClient$({ root, args, jwt }, authToken) {

    const client = args ? args.input : undefined;
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
    ).pipe(
      mergeMap(roles =>
        ClientDA.getClient$(client._id)
          .pipe(
            mergeMap(userMongo => ClientValidatorHelper.checkClientUpdateClientValidator$(client, authToken, roles, userMongo)),
            mergeMap(data => {
              if (data.userMongo && data.userMongo.auth && data.userMongo.auth.userKeycloakId) {
                return ClientKeycloakDA.updateUserGeneralInfo$(data.userMongo.auth.userKeycloakId, data.client.generalInfo)
                  .pipe(
                    mapTo(data)
                  );
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
  updateClientSatelliteInfo$({ root, args, jwt }, authToken) {
    const client = {
      _id: args.id,
      satelliteInfo: args.input,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "updateClientSatelliteInfo$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
    ).pipe(
      mergeMap(roles =>
        ClientDA.getClient$(client._id)
          .pipe(
            mergeMap(userMongo => ClientValidatorHelper.checkClientUpdateClientSatelliteValidator$(client, authToken, roles, userMongo)),
          )
      ),
      mergeMap(data => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "ClientSatelliteInfoUpdated",
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
    ).pipe(
      mergeMap(roles =>
        ClientDA.getClient$(client._id)
          .pipe(
            mergeMap(userMongo => ClientValidatorHelper.checkClientUpdateClientStateValidator$(client, authToken, roles, userMongo)),
            // Update the state of the user on Keycloak
            mergeMap(data => {
              if (data.userMongo && data.userMongo.auth && data.userMongo.auth.userKeycloakId) {
                return ClientKeycloakDA.updateUserState$(data.userMongo.auth.userKeycloakId, data.client.state).pipe(mapTo(data));
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
    ).pipe(
      mergeMap(roles =>
        ClientDA.getClient$(client._id)
          .pipe(
            mergeMap(userMongo => ClientValidatorHelper.checkClientUpdateClientAuthValidator$(client, authToken, roles, userMongo)),
            // Reset user password on Keycloak
            mergeMap(data => {
              const password = {
                temporary: data.client.passwordInput.temporary || false,
                value: data.client.passwordInput.password
              }
              return ClientKeycloakDA.resetUserPassword$(data.userMongo.auth.userKeycloakId, password);
            })
          )
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR"]
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
