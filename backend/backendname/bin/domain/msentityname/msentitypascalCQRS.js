"use strict";

const uuidv4 = require("uuid/v4");
const { of, interval } = require("rxjs");
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const msentitypascalDA = require("../../data/msentitypascalDA");
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const { take, mergeMap, catchError, map, toArray } = require('rxjs/operators');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED
} = require("../../tools/customError");



/**
 * Singleton instance
 */
let instance;

class msentitypascalCQRS {
  constructor() {
  }

  /**  
   * Gets the msentitypascal
   *
   * @param {*} args args
   */
  getmsentitypascal$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "msentitypascal",
      "getmsentitypascal",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the msentitypascal from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): null;
        return msentitypascalDA.getmsentitypascal$(args.id, businessId)
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(error))
    );
  }

  /**  
   * Gets the msentitypascal list
   *
   * @param {*} args args
   */
  getmsentitypascalList$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "msentitypascal",
      "getmsentitypascalList",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the msentitypascal from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;

        return msentitypascalDA.getmsentitypascalList$(filterInput, args.paginationInput);
      }),
      toArray(),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**  
   * Gets the amount of the msentitypascal according to the filter
   *
   * @param {*} args args
   */
  getmsentitypascalListSize$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "msentitypascal",
      "getmsentitypascalListSize",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the msentitypascal from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;

        return msentitypascalDA.getmsentitypascalSize$(filterInput);
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**
  * Create a msentitycamel
  */
 createmsentitypascal$({ root, args, jwt }, authToken) {
    const msentitycamel = args ? args.input: undefined;
    msentitycamel._id = uuidv4();
    msentitycamel.creatorUser = authToken.preferred_username;
    msentitycamel.creationTimestamp = new Date().getTime();
    msentitycamel.modifierUser = authToken.preferred_username;
    msentitycamel.modificationTimestamp = new Date().getTime();

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "msentitypascal",
      "createmsentitypascal$",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN"]
    ).pipe(
      mergeMap(() => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "msentitypascalCreated",
          eventTypeVersion: 1,
          aggregateType: "msentitypascal",
          aggregateId: msentitycamel._id,
          data: msentitycamel,
          user: authToken.preferred_username
        }))
      ),
      map(() => ({ code: 200, message: `msentitypascal with id: ${msentitycamel._id} has been created` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**
   * Edit the msentitycamel state
   */
  updatemsentitypascalGeneralInfo$({ root, args, jwt }, authToken) {
    const msentitycamel = {
      _id: args.id,
      generalInfo: args.input,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "msentitypascal",
      "updatemsentitypascalGeneralInfo$",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN"]
    ).pipe(
      mergeMap(() => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "msentitypascalGeneralInfoUpdated",
          eventTypeVersion: 1,
          aggregateType: "msentitypascal",
          aggregateId: msentitycamel._id,
          data: msentitycamel,
          user: authToken.preferred_username
        })
      )
      ),
      map(() => ({ code: 200, message: `msentitypascal with id: ${msentitycamel._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }


  /**
   * Edit the msentitycamel state
   */
  updatemsentitypascalState$({ root, args, jwt }, authToken) {
    const msentitycamel = {
      _id: args.id,
      state: args.newState,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "msentitypascal",
      "updatemsentitypascalState$",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN"]
    ).pipe(
      mergeMap(() => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "msentitypascalStateUpdated",
          eventTypeVersion: 1,
          aggregateType: "msentitypascal",
          aggregateId: msentitycamel._id,
          data: msentitycamel,
          user: authToken.preferred_username
        })
      )
      ),
      map(() => ({ code: 200, message: `msentitypascal with id: ${msentitycamel._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }


  //#endregion


}

/**
 * @returns {msentitypascalCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new msentitypascalCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
