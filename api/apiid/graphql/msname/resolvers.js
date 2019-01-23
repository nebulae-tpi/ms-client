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
        msnamepascalmsentitiespascal(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-'+'msnamepascal', 'msnamepascalmsentitiespascal', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN"])
            .pipe(
                mergeMap(() =>
                    broker
                    .forwardAndGetReply$(
                        "msentitypascal",
                        "apiid.graphql.query.msnamepascalmsentitiespascal",
                        { root, args, jwt: context.encodedToken },
                        2000
                    )
                ),
                catchError(err => handleError$(err, "msnamepascalmsentitiespascal")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        msnamepascalmsentitiespascalSize(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-'+'msnamepascal', 'msnamepascalmsentitiespascalSize', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN"])
            .pipe(
                mergeMap(() =>
                    broker
                    .forwardAndGetReply$(
                        "msentitypascal",
                        "apiid.graphql.query.msnamepascalmsentitiespascalSize",
                        { root, args, jwt: context.encodedToken },
                        2000
                    )
                ),
                catchError(err => handleError$(err, "msnamepascalmsentitiespascalSize")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        msnamepascalmsentitypascal(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-'+'msnamepascal', 'msnamepascalmsentitypascal', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN"])
            .pipe(
                mergeMap(() =>
                    broker
                    .forwardAndGetReply$(
                        "msentitypascal",
                        "apiid.graphql.query.msnamepascalmsentitypascal",
                        { root, args, jwt: context.encodedToken },
                        2000
                    )
                ),
                catchError(err => handleError$(err, "msnamepascalmsentitypascal")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        }
    },

    //// MUTATIONS ///////
    Mutation: {
        msnamepascalCreatemsentitypascal(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "msentitypascal",
              "msnamepascalCreatemsentitypascal",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN"]
            )
            .pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "msentitypascal",
                    "apiid.graphql.mutation.msnamepascalCreatemsentitypascal",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, "msnamepascalCreatemsentitypascal")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        msnamepascalUpdatemsentitypascalGeneralInfo(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "msentitypascal",
              "msnamepascalUpdatemsentitypascalGeneralInfo",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN"]
            ).pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "msentitypascal",
                    "apiid.graphql.mutation.msnamepascalUpdatemsentitypascalGeneralInfo",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, "updatemsentitypascalGeneralInfo")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
        msnamepascalUpdatemsentitypascalState(root, args, context) {
            return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              "msentitypascal",
              "msnamepascalUpdatemsentitypascalState",
              PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["PLATFORM-ADMIN"]
            ).pipe(
                mergeMap(() =>
                  context.broker.forwardAndGetReply$(
                    "msentitypascal",
                    "apiid.graphql.mutation.msnamepascalUpdatemsentitypascalState",
                    { root, args, jwt: context.encodedToken },
                    2000
                  )
                ),
                catchError(err => handleError$(err, "updatemsentitypascalState")),
                mergeMap(response => getResponseFromBackEnd$(response))
            ).toPromise();
        },
    },

    //// SUBSCRIPTIONS ///////
    Subscription: {
        msnamepascalmsentitypascalUpdatedSubscription: {
            subscribe: withFilter(
                (payload, variables, context, info) => {
                    return pubsub.asyncIterator("msnamepascalmsentitypascalUpdatedSubscription");
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
        backendEventName: 'msnamepascalmsentitypascalUpdatedSubscription',
        gqlSubscriptionName: 'msnamepascalmsentitypascalUpdatedSubscription',
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


