"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Client";
const { CustomError } = require("../tools/customError");
const KeycloakDA = require("./KeycloakDA").singleton();
const { map, filter, mergeMap, toArray } = require("rxjs/operators");
const { of, Observable, defer, from } = require("rxjs");

class ClientKeycloakDA {

/**
   * Gets the users by user keycloak ID
   */
  static getUserByUserId$(userKeycloakId) {
    //Gets the amount of user registered on Keycloak
    return defer(() => {
        const optionsFilter = {
          userId: userKeycloakId
        };
        return KeycloakDA.keycloakClient.users.find(
          process.env.KEYCLOAK_BACKEND_REALM_NAME,
          optionsFilter);
      })
      .pipe(
        map(result => {
          const attributes = result.attributes;
          const user = {
            id: result.id,
            businessId: !attributes || !attributes.businessId
            ? undefined
            : attributes.businessId[0],
            username: result.username,
            generalInfo: {
              name: result.firstName ? result.firstName : "",
              lastname: result.lastName ? result.lastName : "",
              documentType:
                !attributes || !attributes.documentType
                  ? undefined
                  : attributes.documentType[0],
              documentId:
                !attributes || !attributes.documentId
                  ? undefined
                  : attributes.documentId[0],
              email: result.email,
              phone:
                !attributes || !attributes.phone
                  ? undefined
                  : attributes.phone[0]
            },
            state: result.enabled
          };
          return user;
        })
      );
  }

  /**
   * Gets the users paging
   * @param {*} username Username filter
   * @param {*} email Email filter
   */
  static getUser$(username, email) {
    const optionsFilter = {
      max: 1
    };

    if(username){
      optionsFilter.username = username;      
    }

    if(email){
      optionsFilter.email = email;
    }
    return of(optionsFilter)
    .pipe(
      mergeMap(filter => {
        return KeycloakDA.keycloakClient.users.find(
          process.env.KEYCLOAK_BACKEND_REALM_NAME,
          filter
        );
      })
    )
  }


  /**
   * Creates a new user on Keycloak
   * @param {*} user user to create
   */
  static createUser$(user, authInput) { 
    const attributes = {};
    attributes["businessId"] = user.businessId;
    attributes["clientId"] = user._id;
    

    const userKeycloak = {
      username: authInput.username,
      firstName: user.generalInfo.name,
      lastName: user.generalInfo.lastname,
      attributes: attributes,
      email: user.generalInfo.email,
      enabled: user.state,
      id: user._id
    };

    return defer(() =>
      KeycloakDA.keycloakClient.users.create(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

    /**
   * Updates the user info on Keycloak
   * @param {*} userKeycloakId User ID
   * @param {*} generalInfo info to change on the user
   */
  static updateUserGeneralInfo$(userKeycloakId, generalInfo) {
    //const attributes = {};
    //attributes["businessId"] = user.businessId;

    const userKeycloak = {
      id: userKeycloakId,
      //username: user.auth.username,
      firstName: generalInfo.name,
      lastName: generalInfo.lastname,
      //attributes: attributes,
      email: generalInfo.email
    };

    return defer(() =>
      KeycloakDA.keycloakClient.users.update(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

      /**
   * Updates the user info on Keycloak
   * @param {*} userKeycloakId User ID
   * @param {*} satelliteInfo info to change on the user
   */
  static updateUserSatelliteInfo$(userKeycloakId, generalInfo) {
    //const attributes = {};
    //attributes["businessId"] = user.businessId;

    const userKeycloak = {
      id: userKeycloakId,
      //username: user.auth.username,
      firstName: generalInfo.name,
      lastName: generalInfo.lastname,
      //attributes: attributes,
      email: generalInfo.email
    };

    return defer(() =>
      KeycloakDA.keycloakClient.users.update(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

    /**
   * Updates the state of the user on Keycloak
   * @param {*} userKeycloakId User keycloak ID
   * @param {*} newUserState boolean that indicates the new user state
   */
  static updateUserState$(userKeycloakId, newUserState) {
    const userKeycloak = {
      id: userKeycloakId,
      enabled: newUserState
    };

    return defer(() =>
      KeycloakDA.keycloakClient.users.update(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

  /**
   * Resets the password of the user on Keycloak
   * @param {*} userKeycloakId id of the user to modify
   * @param {*} userPassword New password data
   */
  static resetUserPassword$(userKeycloakId, userPassword) {
    return defer(() =>
      KeycloakDA.keycloakClient.users.resetPassword(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloakId,
        userPassword
      )
    );
  }

  /**
   * Remove an user from Keycloak
   * @param {*} userKeycloakId id of user to remove
   */
  static removeUser$(userKeycloakId) {

    return defer(() =>
      KeycloakDA.keycloakClient.users.remove(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloakId
      )
    );
  }

  static addRolesToTheUser$(userKeycloakId, arrayRoles) {
    if(!userKeycloakId || !arrayRoles || arrayRoles.length == 0){
      return of(null);
    }

    //To add the roles to a keycloak user is needed to have the Id of each role, therefore we have to get this info from Keycloak
    return this.getRoles$(arrayRoles)
    .pipe(
      mergeMap(keycloakRoles => {
        //Adds the keycloak roles to the user on Keycloak
        return defer(() =>
          KeycloakDA.keycloakClient.realms.maps.map(
            process.env.KEYCLOAK_BACKEND_REALM_NAME,
            userKeycloakId,
            keycloakRoles
          )
        )
      })
    );
  }

    /**
   * Gets roles from Keycloak according to the roles to filter, 
   * if no filter is sent then this method will return all of the roles from Keycloak.
   * @param roles to filter
   * 
   */
  static getRoles$(roles){
    //Gets all of the user roles registered on the Keycloak realm
    return defer(() =>
        KeycloakDA.keycloakClient.realms.roles.find(
        process.env.KEYCLOAK_BACKEND_REALM_NAME
      )
    ).pipe(
      mergeMap(roles => from(roles)),
      filter(roleKeycloak => roles == null || roles.includes(roleKeycloak.name)),
      toArray()
    )
  }

}
/**
 * @returns {ClientKeycloakDA}
 */
module.exports = ClientKeycloakDA;
