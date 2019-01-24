'use strict'

const {} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const ClientDA = require('../../data/ClientDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

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
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ClientClientUpdatedSubscription`, result.ops[0]))
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
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ClientClientUpdatedSubscription`, result))
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
        console.log('handleClientLocationUpdated ===> ', clientLocationUpdatedEvt);
        return ClientDA.updateClientLocation$(clientLocationUpdatedEvt.aid, clientLocationUpdatedEvt.data)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ClientClientUpdatedSubscription`, result))
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