"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Client";
const { CustomError } = require("../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class ClientDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next("using given mongo instance");
      } else {
        mongoDB = require("./MongoDB").singleton();
        observer.next("using singleton system-wide mongo instance");
      }
      observer.complete();
    });
  }

  /**
   * Gets a client according to the query
   * @param {Object} filterQuery Query to filter
   */
  static getClientByFilter$(filterQuery) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.findOne(filterQuery));
  }

  /**
   * Gets an user by its username
   */
  static getClient$(id, businessId) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      _id: id      
    };
    if(businessId){
      query.businessId = businessId;
    }
    console.log('Query: ', query);

    return defer(() => collection.findOne(query));
  }

  static getClientById$(id) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      _id: id      
    };

    return defer(() => collection.findOne(query));
  }

  /**
   * Get client info by its username.
   * @param {*} username 
   */
  static getClientByUsername$(username) {
    const collection = mongoDB.db.collection(CollectionName);
    const query = { 'auth.username': username};
    return defer(() => collection.findOne(query));
  }

  static getClientFavorites$(userId){
    // todo use mongo projection
    const collection = mongoDB.db.collection(CollectionName);
    const query = { _id: userId};
    return defer(() => collection.findOne(query));
  }


  static getClientFavoritePlace$(userId, id){
    // todo use mongo projection
    const collection = mongoDB.db.collection(CollectionName);
    const query = { _id: userId, };
    return defer(() => collection.findOne(query))
    .pipe(
      map(client => client.favoritePlaces || [] ),
      map(favoritePlaces => favoritePlaces.filter(favoritePlace => favoritePlace.id === id)[0])      
    )
  }

  static addClientFavoritePlace$(userId, favoritePlace){
    const collection = mongoDB.db.collection(CollectionName);    
    const query = { _id: userId};
    return defer(() => collection.updateOne(query, { $push: { "favoritePlaces": favoritePlace } }) )
  }

  static addClientCode$(userId, clientCode){
    const collection = mongoDB.db.collection(CollectionName);    
    const query = { _id: userId};
    return defer(() => collection.updateOne(query, { $set: { "clientCode": clientCode } }) )
  }

  static updateFavoritePlace$(clientId, favoritePlace){
    const collection = mongoDB.db.collection(CollectionName);    
    const query = { _id: clientId, "favoritePlaces.id": favoritePlace.id };
    return defer(() => collection.updateOne(query, { $set: { "favoritePlaces.$": favoritePlace } }) );
  }

  static removeFavoritePlaceById$(clientId, favoritePlaceId){
    const collection = mongoDB.db.collection(CollectionName);    
    const query = { _id: clientId };
    return defer(() => collection.updateOne(query, { $pull: { "favoritePlaces": { id: favoritePlaceId } } }) );
  }

  static removeFavoritePlaceByName$(clientId, favoritePlaceName){
    const collection = mongoDB.db.collection(CollectionName);    
    const query = { _id: clientId };
    return defer(() => collection.updateOne(query, { $pull: { "favoritePlaces": { name: favoritePlaceName } } }) );
  }

  static getClientList$(filter, pagination) {
    const collection = mongoDB.db.collection(CollectionName);
    const customPhone = Number(filter.phone)
    const query = {
    };

    if (filter.businessId) {
      query.businessId = filter.businessId;
    }

    if (filter.name) {
      query["generalInfo.name"] = { $regex: filter.name, $options: "i" };
    }

    if (filter.creationTimestamp) {
      query.creationTimestamp = {$gte: filter.creationTimestamp};
    }
    if(filter.phone){
      query["generalInfo.phone"] = customPhone;
    }

    if (filter.creatorUser) {
      query.creatorUser = { $regex: filter.creatorUser, $options: "i" };
    }

    if (filter.modifierUser) {
      query.modifierUser = { $regex: filter.modifierUser, $options: "i" };
    }
    const cursor = collection
      .find(query)
      .skip(pagination.count * pagination.page)
      .limit(pagination.count)

    return mongoDB.extractAllFromMongoCursor$(cursor);
  }

  static getAssociatedClients$(id) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      satelliteId: id
    };
    console.log("QUERY ===> ", query)
    const cursor = collection
      .find(query)

    return mongoDB.extractAllFromMongoCursor$(cursor);
  }

  static getClientSize$(filter) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
    };

    if (filter.businessId) {
      query.businessId = filter.businessId;
    }

    if (filter.name) {
      query["generalInfo.name"] = { $regex: filter.name, $options: "i" };
    }

    if (filter.creationTimestamp) {
      query.creationTimestamp = {$gte: filter.creationTimestamp};
    }

    if (filter.creatorUser) {
      query.creatorUser = { $regex: filter.creatorUser, $options: "i" };
    }

    if (filter.modifierUser) {
      query.modifierUser = { $regex: filter.modifierUser, $options: "i" };
    }

    return collection.count(query);
  }

  /**
   * Creates a new Client
   * @param {*} client client to create
   */
  static createClient$(client) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.insertOne(client));
  }

  /**
   * modifies the general info of the indicated Client 
   * @param {*} id  Client ID
   * @param {*} ClientGeneralInfo  New general information of the Client
   */
  static updateClientGeneralInfo$(id, ClientGeneralInfo) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id },
          {
            $set: {generalInfo: ClientGeneralInfo.generalInfo, modifierUser: ClientGeneralInfo.modifierUser, modificationTimestamp: ClientGeneralInfo.modificationTimestamp}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  static updateClientBusinessId$(id, businessId) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id },
          {
            $set: {businessId}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

    /**
   * modifies the satellite info of the indicated Client 
   * @param {*} id  Client ID
   * @param {*} ClientSatelliteInfo  New general information of the Client
   */
  static updateClientSatelliteInfo$(id, ClientSatelliteInfo) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id },
          {
            $set: {satelliteInfo: ClientSatelliteInfo.satelliteInfo, modifierUser: ClientSatelliteInfo.modifierUser, modificationTimestamp: ClientSatelliteInfo.modificationTimestamp}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  /**
   * Updates the Client state 
   * @param {string} id Client ID
   * @param {boolean} newClientState boolean that indicates the new Client state
   */
  static updateClientState$(id, newClientState) {
    const collection = mongoDB.db.collection(CollectionName);
    
    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id},
          {
            $set: {state: newClientState.state, modifierUser: newClientState.modifierUser, modificationTimestamp: newClientState.modificationTimestamp}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  static addDriverCode$(id, referrerDriverCode) {
    const collection = mongoDB.db.collection(CollectionName);
    
    return defer(()=>
        collection.updateOne(
          { _id: id},
          {
            $set: {referrerDriverCode}
          }
        )
    );
  }

  static updateClientLocation$(id, newClientLocation){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            location: newClientLocation.latLng,
            modifierUser: newClientLocation.modifierUser,
            modificationTimestamp: newClientLocation.modificationTimestamp
          }
        }, {
          returnOriginal: false
        }
      )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  /**
   * Updates the user auth
   * @param {*} userId User ID
   * @param {*} userAuth Object
   * @param {*} userAuth.userKeycloakId user keycloak ID
   * @param {*} userAuth.username username
   */
  static updateUserAuth$(userId, userAuth) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: userId },
          {
            $set: {auth: userAuth}
          },{
            returnOriginal: false
          }
        )
    )
    .pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

    /**
   * Removes the user auth
   * @param {*} userId User ID
   * @param {*} userAuth Object
   * @param {*} userAuth.userKeycloakId user keycloak ID
   * @param {*} userAuth.username username
   */
  static removeUserAuth$(userId, userAuth) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: userId },
          {
            $unset: {auth: ""}
          },{
            returnOriginal: false
          }
        )
    )
    .pipe(
      map(result => result && result.value ? result.value : undefined)
    )
  }

      /**
   * Gets client by email
   * @param {String} email User email
   * @param {String} ignoreUserId if this value is enter, this user will be ignore in the query 
   */
  static getClientByEmail$(email, ignoreUserId) {
    let query = {      
      'generalInfo.email': email
    };
    if(ignoreUserId){
      query._id = {$ne: ignoreUserId};
    }
    return this.getClientByFilter$(query);
  }

  static linkSatellite$(clientId, satelliteId){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.updateOne({ _id: clientId }, {$set: { satelliteId } }));
  }

  static getSatelliteClientList$(filterText, businessId){
    const collection = mongoDB.db.collection(CollectionName);    
    const query = { businessId: businessId };
    query["generalInfo.name"] = { $regex: filterText, $options: "i" };
    query["satelliteInfo"] = { $exists: true };
    console.log("QUERY SATELITE ===> ", query);
    return defer(() => collection.find(query).limit(10).toArray());
  }



}
/**
 * @returns {ClientDA}
 */
module.exports = ClientDA;
