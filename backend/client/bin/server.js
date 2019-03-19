'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}


const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const mongoDB = require('./data/MongoDB').singleton();
const ClientDA = require('./data/ClientDA');
const KeycloakDA = require('./data/KeycloakDA').singleton();
const graphQlService = require('./services/emi-gateway/GraphQlService')();
const Rx = require('rxjs');


const start = () => {
    Rx.concat(
        eventSourcing.eventStore.start$(),
        eventStoreService.start$(),
        mongoDB.start$(),
        ClientDA.start$(),
        graphQlService.start$(),
        KeycloakDA.checkKeycloakToken$(), 
    ).subscribe(
        (evt) => {
            // console.log(evt)
        },
        (error) => {
            console.error('Failed to start', error);
            process.exit(1);
        },
        () => console.log('client started')
    );
};

start();



