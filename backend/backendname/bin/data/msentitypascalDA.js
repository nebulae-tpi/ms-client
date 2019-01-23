"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "msentitypascal";
const { CustomError } = require("../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class msentitypascalDA {
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
   * Gets an user by its username
   */
  static getmsentitypascal$(id, businessId) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      _id: id      
    };
    if(businessId){
      query.businessId = businessId;
    }

    return defer(() => collection.findOne(query));
  }

  static getmsentitypascalList$(filter, pagination) {
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
      query.creationTimestamp = filter.creationTimestamp;
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
      .sort({ creationTimestamp: pagination.sort });

    return mongoDB.extractAllFromMongoCursor$(cursor);
  }

  static getmsentitypascalSize$(filter) {
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
      query.creationTimestamp = filter.creationTimestamp;
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
   * Creates a new msentitypascal
   * @param {*} msentitycamel msentitycamel to create
   */
  static createmsentitypascal$(msentitycamel) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.insertOne(msentitycamel));
  }

      /**
   * modifies the general info of the indicated msentitypascal 
   * @param {*} id  msentitypascal ID
   * @param {*} msentitypascalGeneralInfo  New general information of the msentitypascal
   */
  static updatemsentitypascalGeneralInfo$(id, msentitypascalGeneralInfo) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id },
          {
            $set: {generalInfo: msentitypascalGeneralInfo.generalInfo, modifierUser: msentitypascalGeneralInfo.modifierUser, modificationTimestamp: msentitypascalGeneralInfo.modificationTimestamp}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  /**
   * Updates the msentitypascal state 
   * @param {string} id msentitypascal ID
   * @param {boolean} newmsentitypascalState boolean that indicates the new msentitypascal state
   */
  static updatemsentitypascalState$(id, newmsentitypascalState) {
    const collection = mongoDB.db.collection(CollectionName);
    
    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id},
          {
            $set: {state: newmsentitypascalState.state, modifierUser: newmsentitypascalState.modifierUser, modificationTimestamp: newmsentitypascalState.modificationTimestamp}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

}
/**
 * @returns {msentitypascalDA}
 */
module.exports = msentitypascalDA;
