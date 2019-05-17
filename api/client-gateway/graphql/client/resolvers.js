'use strict'

const { of, Observable, bindNodeCallback } = require('rxjs');
const { map, tap, mergeMap, switchMapTo } = require('rxjs/operators');

const broker = require("../../broker/BrokerFactory")();
const RoleValidator = require('../../tools/RoleValidator');

const INTERNAL_SERVER_ERROR_CODE = 23001;
const USERS_PERMISSION_DENIED_ERROR_CODE = 23002;

function getResponseFromBackEnd$(response) {
  return of(response).pipe(
    map(resp => {
      if (resp.result.code != 200) {
        const err = new Error();
        err.name = 'Error';
        err.message = resp.result.error;
        // this[Symbol()] = resp.result.error;
        Error.captureStackTrace(err, 'Error');
        throw err;
      }
      return resp.data;
    }));
}

module.exports = {
  Query: {
    ClientProfile: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-client', 'ClientProfile', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Client", "clientgateway.graphql.query.ClientProfile", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    ClientLinkedSatellite: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-client', 'ClientLinkedSatellite', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Client", "clientgateway.graphql.query.clientLinkedSatellite", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    ClientSatellites: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(
          context.authToken.realm_access.roles, 'ms-client', 'ClientSatellites',
          USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT'])
        .pipe(
          switchMapTo( broker.forwardAndGetReply$("Client", "clientgateway.graphql.query.clientSatellites", { root, args, jwt: context.encodedToken }, 2000)),
          mergeMap(response => getResponseFromBackEnd$(response))
        ).toPromise();
    },
    ClientFavoritePlaces: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(
          context.authToken.realm_access.roles, 'ms-client', 'ClientFavoritePlaces',
          USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT'])
        .pipe(
          switchMapTo( broker.forwardAndGetReply$("Client", "clientgateway.graphql.query.clientFavoritePlaces",
          { root, args, jwt: context.encodedToken }, 2000)),
          mergeMap(response => getResponseFromBackEnd$(response))
        ).toPromise();
    },
  },
  Mutation: {    
    ValidateNewClient: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-client', 'ValidateNewClient', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Client", "clientgateway.graphql.mutation.ValidateNewClient", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    linkSatellite: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-client', 'linkSatellite', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Client", "clientgateway.graphql.mutation.linkSatellite", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    unlinkSatellite: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-client', 'unlinkSatellite', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Client", "clientgateway.graphql.mutation.unlinkSatellite", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    AddFavoritePlace: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-client', 'AddFavoritePlace', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Client", "clientgateway.graphql.mutation.addFavoritePlace", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    UpdateFavoritePlace:(root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-client', 'UpdateFavoritePlace', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Client", "clientgateway.graphql.mutation.updateFavoritePlace", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    RemoveFavoritePlace:(root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-client', 'RemoveFavoritePlace', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Client", "clientgateway.graphql.mutation.removeFavoritePlace", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
  },
}
