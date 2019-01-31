const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const { of } = require("rxjs");
const { map, mergeMap, catchError } = require('rxjs/operators');
const broker = require("../../broker/BrokerFactory")();
const RoleValidator = require('../../tools/RoleValidator');
const {handleError$} = require('../../tools/GraphqlResponseTools');

const INTERNAL_SERVER_ERROR_CODE = 1;
const PERMISSION_DENIED_ERROR_CODE = 2;

function getResponseFromBackEnd$(response) {
    return of(response)
    .pipe(
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
        })
    );
}


module.exports = {

    //// QUERY ///////

    Query: {
        ClientClients(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-'+'Client', 'ClientClients', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER"])
            .pipe(
                mergeMap(() =>
                    broker
                    .forwardAndGetReply$(
                        "Client",
                        "emigateway.graphql.query.ClientClients",
                        { root, args, jwt: context.encodedToken },
                        2000
                    )
                ),
                catchError(err => handleError$(err, "ClientClients")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        ClientClientsSize(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-'+'Client', 'ClientClientsSize', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER"])
            .pipe(
                mergeMap(() =>
                    broker
                    .forwardAndGetReply$(
                        "Client",
                        "emigateway.graphql.query.ClientClientsSize",
                        { root, args, jwt: context.encodedToken },
                        2000
                    )
                ),
                catchError(err => handleError$(err, "ClientClientsSize")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        ClientClient(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-'+'Client', 'ClientClient', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER"])
            .pipe(
                mergeMap(() =>
                    broker
                    .forwardAndGetReply$(
                        "Client",
                        "emigateway.graphql.query.ClientClient",
                        { root, args, jwt: context.encodedToken },
                        2000
                    )
                ),
                catchError(err => handleError$(err, "ClientClient")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        }
    },

    //// MUTATIONS ///////
    Mutation: {
        ClientCreateClient(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "Client",
              "ClientCreateClient",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
            )
            .pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "Client",
                    "emigateway.graphql.mutation.ClientCreateClient",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, "ClientCreateClient")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        ClientUpdateClientGeneralInfo(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "Client",
              "ClientUpdateClientGeneralInfo",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
            ).pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "Client",
                    "emigateway.graphql.mutation.ClientUpdateClientGeneralInfo",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, "updateClientGeneralInfo")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        ClientUpdateClientState(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "Client",
              "ClientUpdateClientState",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
            ).pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "Client",
                    "emigateway.graphql.mutation.ClientUpdateClientState",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, "updateClientState")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        ClientUpdateClientLocation(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "Client",
              "ClientUpdateClientLocation",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
            ).pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "Client",
                    "emigateway.graphql.mutation.clientUpdateClientLocation",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, "UpdateClientLocation")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        ClientCreateClientAuth(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "Client",
              "ClientCreateClientAuth",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
            )
              .pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "Client",
                    "emigateway.graphql.mutation.ClientCreateClientAuth",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, "ClientCreateClientAuth")),
                mergeMap(response => getResponseFromBackEnd$(response))
              )
              .toPromise();
          },
          ClientResetClientPassword(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "Client",
              "ClientResetClientPassword",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
            )
              .pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "Client",
                    "emigateway.graphql.mutation.ClientResetClientPassword",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, " ClientResetClientPassword")),
                mergeMap(response => getResponseFromBackEnd$(response))
              )
              .toPromise();
        },
        ClientRemoveClientAuth(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "Client",
              "ClientRemoveClientAuth",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
            )
              .pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "Client",
                    "emigateway.graphql.mutation.ClientRemoveClientAuth",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, "ClientRemoveClientAuth")),
                mergeMap(response => getResponseFromBackEnd$(response))
              )
              .toPromise();
        },
    },


    
    //// SUBSCRIPTIONS ///////
    Subscription: {
        ClientClientUpdatedSubscription: {
            subscribe: withFilter(
                (payload, variables, context, info) => {
                    return pubsub.asyncIterator("ClientClientUpdatedSubscription");
                },
                (payload, variables, context, info) => {
                    return true;
                }
            )
        }

    }
};




//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
    {
        backendEventName: 'ClientClientUpdatedSubscription',
        gqlSubscriptionName: 'ClientClientUpdatedSubscription',
        dataExtractor: (evt) => evt.data,// OPTIONAL, only use if needed
        onError: (error, descriptor) => console.log(`Error processing ${descriptor.backendEventName}`),// OPTIONAL, only use if needed
        onEvent: (evt, descriptor) => console.log(`Event of type  ${descriptor.backendEventName} arraived`),// OPTIONAL, only use if needed
    },
];


/**
 * Connects every backend event to the right GQL subscription
 */
eventDescriptors.forEach(descriptor => {
    broker
        .getMaterializedViewsUpdates$([descriptor.backendEventName])
        .subscribe(
            evt => {
                if (descriptor.onEvent) {
                    descriptor.onEvent(evt, descriptor);
                }
                const payload = {};
                payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor ? descriptor.dataExtractor(evt) : evt.data
                pubsub.publish(descriptor.gqlSubscriptionName, payload);
            },

            error => {
                if (descriptor.onError) {
                    descriptor.onError(error, descriptor);
                }
                console.error(
                    `Error listening ${descriptor.gqlSubscriptionName}`,
                    error
                );
            },

            () =>
                console.log(
                    `${descriptor.gqlSubscriptionName} listener STOPPED`
                )
        );
});


