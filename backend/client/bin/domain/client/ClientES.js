'use strict'

const {} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const ClientDA = require('../../data/ClientDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const eventSourcing = require("../../tools/EventSourcing")();
const Event = require("@nebulae/event-store").Event;

/**
 * Singleton instance
 */
let instance;

class ClientES {

    constructor() {
    }


    /**
     * Persists the client on the materialized view according to the received data from the event store.
     * @param {*} businessCreatedEvent business created event
     */
    handleClientCreated$(clientCreatedEvent) {  
        const client = clientCreatedEvent.data;
        return ClientDA.createClient$(client)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ClientClientUpdatedSubscription`, result.ops[0]).pipe(mapTo(result))),
            mergeMap(result => this.emitClientSatelliteEvent$(result))
        );
    }

        /**
     * Update the general info on the materialized view according to the received data from the event store.
     * @param {*} clientGeneralInfoUpdatedEvent client created event
     */
    handleClientGeneralInfoUpdated$(clientGeneralInfoUpdatedEvent) {  
        const clientGeneralInfo = clientGeneralInfoUpdatedEvent.data;
        return ClientDA.updateClientGeneralInfo$(clientGeneralInfoUpdatedEvent.aid, clientGeneralInfo)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ClientClientUpdatedSubscription`, result).pipe(mapTo(result))),
            mergeMap(result => this.emitClientSatelliteEvent$(result))
        );
    }

    /**
     * updates the state on the materialized view according to the received data from the event store.
     * @param {*} ClientStateUpdatedEvent events that indicates the new state of the client
     */
    handleClientStateUpdated$(ClientStateUpdatedEvent) {          
        return ClientDA.updateClientState$(ClientStateUpdatedEvent.aid, ClientStateUpdatedEvent.data)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ClientClientUpdatedSubscription`, result))
        );
    }

    handleClientLocationUpdated$(clientLocationUpdatedEvt){
        return ClientDA.updateClientLocation$(clientLocationUpdatedEvt.aid, clientLocationUpdatedEvt.data)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ClientClientUpdatedSubscription`, result).pipe(mapTo(result))),
            mergeMap(result => this.emitClientSatelliteEvent$(result))
        );
    }

    emitClientSatelliteEvent$(client){
        const userData = {
            ...client
        };
        return eventSourcing.eventStore.emitEvent$(
            new Event({
            eventType: "ClientSatelliteEnabled",
            eventTypeVersion: 1,
            aggregateType: "Client",
            aggregateId: client._id,
            data: userData,
            user: 'SYSTEM'
        }))
    }

          /**
     * updates the user state on the materialized view according to the received data from the event store.
     * @param {*} clientAuthCreatedEvent events that indicates the new state of the user
     */
    handleClientAuthCreated$(clientAuthCreatedEvent) {
        return ClientDA.updateUserAuth$(
            clientAuthCreatedEvent.aid,
            clientAuthCreatedEvent.data
        )
        .pipe(
            mergeMap(result => {
                return broker.send$(
                    MATERIALIZED_VIEW_TOPIC,
                    `ClientClientUpdatedSubscription`,
                    result
                );
            })
        );
    }

    /**
     * Removes the user auth on the materialized view.
     * @param {*} userAuthDeletedEvent events that indicates the user to which the auth credentials will be deleted
     */
    handleClientAuthDeleted$(clientAuthDeletedEvent) {
        return ClientDA.removeUserAuth$(
            clientAuthDeletedEvent.aid,
            clientAuthDeletedEvent.data
        )
        .pipe(
            mergeMap(result => {
                return broker.send$(
                    MATERIALIZED_VIEW_TOPIC,
                    `ClientClientUpdatedSubscription`,
                    result
                );
            })
        );
    }

}



/**
 * @returns {ClientES}
 */
module.exports = () => {
    if (!instance) {
        instance = new ClientES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};