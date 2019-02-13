const ClientDA = require("../../data/ClientDA");
const ClientKeycloakDA = require("../../data/ClientKeycloakDA");
const { of, interval, forkJoin, throwError } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, tap, mapTo } = require('rxjs/operators');
const { 
  CustomError, 
  DefaultError,   
  USER_MISSING_DATA_ERROR_CODE,
  USERNAME_ALREADY_USED_CODE,
  EMAIL_ALREADY_USED_ERROR_CODE,
  PERMISSION_DENIED_ERROR_CODE,
  INVALID_USERNAME_FORMAT_ERROR_CODE,
  MISSING_BUSINESS_ERROR_CODE,
  USER_UPDATE_OWN_INFO_ERROR_CODE,
  USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE,
  USER_CREDENTIAL_EXIST_ERROR_CODE,
  USER_NOT_FOUND_ERROR_CODE,
  USER_DOES_NOT_HAVE_AUTH_CREDENTIALS_ERROR_CODE,
  USER_WAS_NOT_DELETED
} = require("../../tools/customError");

const context = "Client";
const userNameRegex = /^[a-zA-Z0-9._@-]{8,}$/;

class ClientValidatorHelper {

  /**
   * Validates if the user can be created checking if the info is valid and the username and email have not been used
   * @param {*} client 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkClientCreationClientValidator$(client, authToken, roles, userMongo) {
    return of({client, authToken, roles})
    .pipe(
      tap(data => { if (!data.client) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.client.businessId) this.throwCustomError$(MISSING_BUSINESS_ERROR_CODE)}),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(data.client.generalInfo.email).pipe(mapTo(data)))
    );
  }


  /**
   * Validates if the user can be updated checking if the info is valid and the username and email have not been used
   * @param {*} client 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkClientUpdateClientValidator$(client, authToken, roles, userMongo) {
    return of({client, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.client) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.client, authToken)),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Client', data.roles)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(data.client.generalInfo.email, userMongo).pipe(mapTo(data)))    
    );
  }

    /**
   * Validates if the user can be updated checking if the info is valid and the username and email have not been used
   * @param {*} client 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkClientUpdateClientSatelliteValidator$(client, authToken, roles, userMongo) {
    return of({client, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.client) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.client, authToken)),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Client', data.roles)),
    );
  }


  /**
   * Validates if the user can update its state
   * @param {*} client 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkClientUpdateClientStateValidator$(client, authToken, roles, userMongo) {
    return of({client, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.client) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.client, authToken, 'Client')),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Client', data.roles)),
    );
  }

  /**
   * Validates if the user can resset its password
   * @param {*} client 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkClientCreateClientAuthValidator$(client, authToken, roles, userMongo) {
    return of({client, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.client) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.authInput || !data.authInput.username.trim().match(userNameRegex)) this.throwCustomError$(INVALID_USERNAME_FORMAT_ERROR_CODE)}),
      tap(data => { if (!data.userMongo) this.throwCustomError$(USER_NOT_FOUND_ERROR_CODE)}),
      mergeMap(data => this.checkUsernameExistKeycloak$(data.authInput, data.client.authInput.username).pipe(mapTo(data))),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Client', data.roles)),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.client, authToken)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(userMongo.generalInfo.email, userMongo).pipe(mapTo(data)))
    )
  }

    /**
   * Validates if the user can resset its password
   * @param {*} client 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkClientUpdateClientAuthValidator$(client, authToken, roles, userMongo) {
    return of({client, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.client) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.userMongo) this.throwCustomError$(USER_NOT_FOUND_ERROR_CODE)}),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Client', data.roles)),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.client, authToken)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(userMongo.generalInfo.email, userMongo).pipe(mapTo(data)))
    )
  }

  static checkClientRemoveClientAuthValidator$(client, authToken, roles, userMongo) {
    return of({client, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.client) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.userMongo) this.throwCustomError$(USER_NOT_FOUND_ERROR_CODE)}),
      tap(data => { if (!data.userMongo.auth || !data.userMongo.auth.username) this.throwCustomError$(USER_DOES_NOT_HAVE_AUTH_CREDENTIALS_ERROR_CODE)}),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Client', data.roles)),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.client, authToken)),
    );

  }

    /**
     * Check if the user was deleted from Keycloak. If the user exist return an error indicating that the user was not deleted
     * @param {*} userKeycloakId 
     */
    static checkIfUserWasDeletedOnKeycloak$(userKeycloakId){
      return of(userKeycloakId)
      .pipe(
        mergeMap(userKeycloakId => ClientKeycloakDA.getUserByUserId$(userKeycloakId)),
        tap(userKeycloak => { if (userKeycloak) this.throwCustomError$(USER_WAS_NOT_DELETED) })
      );
    }


  static checkIfUserIsTheSameUserLogged(user, authToken) {
    if (user && user.auth && user.auth.userKeycloakId == authToken.sub) {
      return this.throwCustomError$(USER_UPDATE_OWN_INFO_ERROR_CODE);
    }
  }

  /**
   * Checks if the user belongs to the same business of the user that is performing the operation
   * @param {*} userMongo 
   * @param {*} authToken 
   * @param {*} context 
   * @param {*} roles 
   */
  static checkIfUserBelongsToTheSameBusiness(userMongo, authToken, context, roles) {
    if (!userMongo || (!roles["PLATFORM-ADMIN"] && userMongo.businessId != authToken.businessId)){
      this.throwCustomError$(USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE)
    }
  }


  static checkEmailExistKeycloakOrMongo$(email, userMongo) {
    return of(email)
    .pipe(
      mergeMap(email => 
        forkJoin(
          ClientKeycloakDA.getUser$(null, email),
          ClientDA.getClientByEmail$(email)
      )),
      mergeMap(([keycloakResult, mongoResult]) => {
        const userKeycloakId = userMongo && userMongo.auth && userMongo.auth.userKeycloakId ? userMongo.auth.userKeycloakId: undefined;
        if (keycloakResult && keycloakResult.length > 0 && (!userKeycloakId || userKeycloakId != keycloakResult[0].id)) {
          return this.throwCustomError$(EMAIL_ALREADY_USED_ERROR_CODE);
        }
        if (mongoResult && (!userMongo || userMongo._id != mongoResult._id)) {
          return this.throwCustomError$(EMAIL_ALREADY_USED_ERROR_CODE);
        }
        return of(email);
      })
    );

  }

  static checkUsernameExistKeycloak$(user, username) {
    return ClientKeycloakDA.getUser$(username)
    .pipe(
      mergeMap(userFound => {
        if(userFound && userFound.length > 0){
           return this.throwCustomError$(USERNAME_ALREADY_USED_CODE);
         }
         return of(user);
       }
     )
    );
  }

  static checkUserEmailExistKeycloak$(user, email) {
    return ClientKeycloakDA.getUser$(null, email)
    .pipe(
      mergeMap(userFound => {
        if(userFound && userFound.length > 0){
           return this.throwCustomError$(EMAIL_ALREADY_USED_ERROR_CODE);
         }
         return of(user);
       }
     )
    );
  }

/**
   * Creates a custom error observable
   * @param {*} errorCode Error code
   */
  static throwCustomError$(errorCode) {
    return throwError(
      new CustomError(
        context,
        'Client',
        errorCode.code,
        errorCode.description
      )
    );
  }
}

module.exports = ClientValidatorHelper;
