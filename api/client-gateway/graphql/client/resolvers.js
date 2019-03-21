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
  },
}
