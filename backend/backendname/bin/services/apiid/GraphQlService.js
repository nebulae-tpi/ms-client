"use strict";

const { msentitypascalCQRS } = require("../../domain/msentityname");
const broker = require("../../tools/broker/BrokerFactory")();
const { of, from } = require("rxjs");
const jsonwebtoken = require("jsonwebtoken");
const { map, mergeMap, catchError, tap } = require('rxjs/operators');
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
const {handleError$} = require('../../tools/GraphqlResponseTools');


let instance;

class GraphQlService {


  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
  }

  /**
   * Starts GraphQL actions listener
   */
  start$() {
      //default on error handler
      const onErrorHandler = (error) => {
        console.error("Error handling  GraphQl incoming event", error);
        process.exit(1);
      };
  
      //default onComplete handler
      const onCompleteHandler = () => {
        () => console.log("GraphQlService incoming event subscription completed");
      };
    return from(this.getSubscriptionDescriptors()).pipe(
      map(aggregateEvent => ({ ...aggregateEvent, onErrorHandler, onCompleteHandler })),
      map(params => this.subscribeEventHandler(params))
    )
  }

  /**
   * build a Broker listener to handle GraphQL requests procesor
   * @param {*} descriptor 
   */
  subscribeEventHandler({
    aggregateType,
    messageType,
    onErrorHandler,
    onCompleteHandler
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType]).pipe(
        mergeMap(message => this.verifyRequest$(message)),
        mergeMap(request => ( request.failedValidations.length > 0)
          ? of(request.errorResponse)
          : of(request).pipe(
              //ROUTE MESSAGE TO RESOLVER
              mergeMap(({ authToken, message }) =>
              handler.fn
                .call(handler.obj, message.data, authToken).pipe(
                  map(response => ({ response, correlationId: message.id, replyTo: message.attributes.replyTo }))
                )
            )
          )
        )    
        ,mergeMap(msg => this.sendResponseBack$(msg))
      )
      .subscribe(
        msg => { /* console.log(`GraphQlService: ${messageType} process: ${msg}`); */ },
        onErrorHandler,
        onCompleteHandler
      );
    this.subscriptions.push({
      aggregateType,
      messageType,
      handlerName: handler.fn.name,
      subscription
    });
    return {
      aggregateType,
      messageType,
      handlerName: `${handler.obj.name}.${handler.fn.name}`
    };
  }

    /**
   * Verify the message if the request is valid.
   * @param {any} request request message
   * @returns { Rx.Observable< []{request: any, failedValidations: [] }>}  Observable object that containg the original request and the failed validations
   */
  verifyRequest$(request) {
    return of(request).pipe(
      //decode and verify the jwt token
      mergeMap(message =>
        of(message).pipe(
          map(message => ({ authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey), message, failedValidations: [] })),
          catchError(err =>
            handleError$(err).pipe(
              map(response => ({
                errorResponse: { response, correlationId: message.id, replyTo: message.attributes.replyTo },
                failedValidations: ['JWT']
              }
              ))
            )
          )
        )
      )
    )
  }

 /**
  * 
  * @param {any} msg Object with data necessary  to send response
  */
 sendResponseBack$(msg) {
   return of(msg).pipe(mergeMap(
    ({ response, correlationId, replyTo }) =>
      replyTo
        ? broker.send$(replyTo, "apiid.graphql.Query.response", response, {
            correlationId
          })
        : of(undefined)
  ));
}

  stop$() {
    from(this.subscriptions).pipe(
      map(subscription => {
        subscription.subscription.unsubscribe();
        return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
      })
    );
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW  /////////////////
  ////////////////////////////////////////////////////////////////////////////////////////


  /**
   * returns an array of broker subscriptions for listening to GraphQL requests
   */
  getSubscriptionDescriptors() {
    console.log("GraphQl Service starting ...");
    return [
      {
        aggregateType: "msentitypascal",
        messageType: "apiid.graphql.query.msnamepascalmsentitiespascal"
      },
      {
        aggregateType: "msentitypascal",
        messageType: "apiid.graphql.query.msnamepascalmsentitiespascalSize"
      },
      {
        aggregateType: "msentitypascal",
        messageType: "apiid.graphql.query.msnamepascalmsentitypascal"
      },
      {
        aggregateType: "msentitypascal",
        messageType: "apiid.graphql.mutation.msnamepascalCreatemsentitypascal"
      },
      {
        aggregateType: "msentitypascal",
        messageType: "apiid.graphql.mutation.msnamepascalUpdatemsentitypascalGeneralInfo"
      },
      {
        aggregateType: "msentitypascal",
        messageType: "apiid.graphql.mutation.msnamepascalUpdatemsentitypascalState"
      },
    ];
  }


  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {    
    return {
      "apiid.graphql.query.msnamepascalmsentitiespascal": {
        fn: msentitypascalCQRS.getmsentitypascalList$,
        obj: msentitypascalCQRS
      },
      "apiid.graphql.query.msnamepascalmsentitiespascalSize": {
        fn: msentitypascalCQRS.getmsentitypascalListSize$,
        obj: msentitypascalCQRS
      },
      "apiid.graphql.query.msnamepascalmsentitypascal": {
        fn: msentitypascalCQRS.getmsentitypascal$,
        obj: msentitypascalCQRS
      },
      "apiid.graphql.mutation.msnamepascalCreatemsentitypascal": {
        fn: msentitypascalCQRS.createmsentitypascal$,
        obj: msentitypascalCQRS
      }, 
      "apiid.graphql.mutation.msnamepascalUpdatemsentitypascalGeneralInfo": {
        fn: msentitypascalCQRS.updatemsentitypascalGeneralInfo$,
        obj: msentitypascalCQRS
      },
      "apiid.graphql.mutation.msnamepascalUpdatemsentitypascalState": {
        fn: msentitypascalCQRS.updatemsentitypascalState$,
        obj: msentitypascalCQRS
      }
    };
  }
}

/**
 * @returns {GraphQlService}
 */
module.exports = () => {
  if (!instance) {
    instance = new GraphQlService();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
