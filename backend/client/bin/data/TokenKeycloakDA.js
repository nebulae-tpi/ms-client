"use strict";

const { CustomError } = require("../tools/customError");
const KeycloakDA = require("./KeycloakDA").singleton();
const { map, filter, mergeMap, toArray } = require("rxjs/operators");
const { of, Observable, defer, from } = require("rxjs");

class TokenKeycloakDA {


  /**
   * Check token validity.
   */
  static checkTokenValidity$(){
    return defer(() =>
      KeycloakDA.keycloakClient.users.checkTokenValidity(
        process.env.KEYCLOAK_BACKEND_REALM_NAME
      )
    );
  }

}
/**
 * @returns {TokenKeycloakDA}
 */
module.exports = TokenKeycloakDA;
