"use strict";

const { ClientCQRS } = require("../../domain/client");
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
        ? broker.send$(replyTo, "emigateway.graphql.Query.response", response, {
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
        aggregateType: "Client",
        messageType: "emigateway.graphql.query.ClientClients"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.query.ClientClientsSize"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.query.ClientClient"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.mutation.ClientCreateClient"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.mutation.ClientUpdateClientGeneralInfo"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.mutation.ClientUpdateClientSatelliteInfo"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.mutation.ClientUpdateClientState"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.mutation.ClientCreateClientAuth"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.mutation.ClientRemoveClientAuth"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.mutation.ClientResetClientPassword"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.mutation.clientUpdateClientLocation"
      },
      // CLIENT GATEWAY
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.query.ClientProfile"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.mutation.AssociateDriverToClient"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.mutation.ValidateNewClient"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.mutation.linkSatellite"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.query.clientLinkedSatellite"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.query.clientSatellites"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.mutation.unlinkSatellite"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.query.clientFavoritePlaces"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.query.clientFavoritePlace"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.mutation.addFavoritePlace"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.mutation.updateFavoritePlace"
      },
      {
        aggregateType: "Client",
        messageType: "clientgateway.graphql.mutation.removeFavoritePlace"
      },
    ];
  }

  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {    
    return {
      // CLIENT GATEWAY      
      "clientgateway.graphql.query.ClientProfile": {
        fn: ClientCQRS.getClientProfile$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.mutation.AssociateDriverToClient": {
        fn: ClientCQRS.associateDriverToClient$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.mutation.ValidateNewClient": {
        fn: ClientCQRS.ValidateNewClient$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.mutation.linkSatellite":{
        fn: ClientCQRS.linkSatellite$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.query.clientLinkedSatellite":{
        fn: ClientCQRS.clientLinkedSatellite$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.query.clientSatellites":{
        fn: ClientCQRS.clientSatellites$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.mutation.unlinkSatellite":{
        fn: ClientCQRS.unlinkSatellite$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.query.clientFavoritePlaces":{
        fn: ClientCQRS.clientFavoritePlaces$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.query.clientFavoritePlace":{
        fn: ClientCQRS.clientFavoritePlace$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.mutation.addFavoritePlace":{
        fn: ClientCQRS.addFavoritePlace$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.mutation.updateFavoritePlace":{
        fn: ClientCQRS.updateFavoritePlace$,
        obj: ClientCQRS
      },
      "clientgateway.graphql.mutation.removeFavoritePlace":{
        fn: ClientCQRS.removeFavoritePlace$,
        obj: ClientCQRS
      },
      // EMI GATEWAY
      "emigateway.graphql.query.ClientClients": {
        fn: ClientCQRS.getClientList$,
        obj: ClientCQRS
      },
      "emigateway.graphql.query.ClientClientsSize": {
        fn: ClientCQRS.getClientListSize$,
        obj: ClientCQRS
      },
      "emigateway.graphql.query.ClientClient": {
        fn: ClientCQRS.getClient$,
        obj: ClientCQRS
      },
      "emigateway.graphql.mutation.ClientCreateClient": {
        fn: ClientCQRS.createClient$,
        obj: ClientCQRS
      }, 
      "emigateway.graphql.mutation.ClientUpdateClientGeneralInfo": {
        fn: ClientCQRS.updateClientGeneralInfo$,
        obj: ClientCQRS
      },
      "emigateway.graphql.mutation.ClientUpdateClientSatelliteInfo": {
        fn: ClientCQRS.updateClientSatelliteInfo$,
        obj: ClientCQRS
      },
      "emigateway.graphql.mutation.ClientUpdateClientState": {
        fn: ClientCQRS.updateClientState$,
        obj: ClientCQRS
      },
      'emigateway.graphql.mutation.ClientCreateClientAuth': {
        fn: ClientCQRS.createClientAuth$,
        obj: ClientCQRS
      },
      'emigateway.graphql.mutation.ClientRemoveClientAuth': {
        fn: ClientCQRS.removeClientAuth$,
        obj: ClientCQRS
      },
      'emigateway.graphql.mutation.ClientResetClientPassword': {
        fn: ClientCQRS.resetClientPassword$,
        obj: ClientCQRS
      },
      "emigateway.graphql.mutation.clientUpdateClientLocation": {
        fn: ClientCQRS.updateClientLocation$,
        obj: ClientCQRS
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
