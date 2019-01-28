"use strict";

const {BehaviorSubject, of, Observable, interval} = require("rxjs");
const { switchMap, exhaustMap, map, mergeMap, catchError, retry, tap } = require('rxjs/operators');
const KeycloakAdminClient = require('@nebulae/keycloak-admin-client');
let instance = null;

class KeycloakDA {

  /**
   * initialize and configure keycloak admin client
   * @param { { url, dbName } } ops
   */
  constructor({realmName, baseUrl, username, password, grant_type, client_id }) {    
    this.settings = {realmName, baseUrl, username, password, grant_type, client_id};
    this.keycloakAdmin = new KeycloakAdminClient(this.settings);
    this.tokenTimeSubject$ = new BehaviorSubject(1000);
  }


  checkKeycloakToken$(){
    return this.tokenTimeSubject$
    .pipe(
      //Create an interval according to the expiration time of the token, the 
      //first time the interval will be executed each seconds
      switchMap(time => interval(time)),
      //Get the keycloak token
      exhaustMap(time => {
      return of(time)
      .pipe(
        mergeMap(data=>{
          if(this.keycloakToken == null || (this.keycloakToken != null && this.keycloakToken.refresh_expires_in <= 20)){
            return this.getToken$();
          }else{
            return this.refreshToken$();
          }
        }),
        //If an error ocurred getting or refreshing the token, we try to get a new token. 
        catchError(error => {
          console.log('Error refreshing token => ', error);
          return this.getToken$()
          .pipe(
            retry(2)
          )
        }),
        tap(([client, token]) => {
          console.log('Token refreshed; refresh token expires in:  ', token.refresh_expires_in, ', token expires in: ', token.expires_in);
          //takes the lowest expiration time
          const expirationTimeToken = token.expires_in < token.refresh_expires_in ? token.expires_in : token.refresh_expires_in;
  
          this.keycloakClient = client; 
          this.keycloakToken = token;
          let expirationTimeMillis = expirationTimeToken > 20 ? (expirationTimeToken-20) * 1000: 1000;
          
          //set the new time
          this.tokenTimeSubject$.next(expirationTimeMillis);
        })
      )     
    })
    );
  }

  /**
   * Starts Keycloak connections
   * @returns {Rx.Observable} Observable that resolve to the Keycloak client
   */
  getToken$() {
    return this.keycloakAdmin.getToken$();
  }

    /**
   * Refresh Keycloak connections
   * @returns {Rx.Observable} Observable that resolve to the Keycloak client
   */
  refreshToken$() {
    return this.keycloakAdmin.refreshToken$();
  }

  /**
   * Stops DB connections
   * Returns an Obserable that resolve to a string log
   */
  stop$() {
    return Observable.create(observer => {
      //this.client.close();
      observer.next("Keycloak admin client stopped");
      observer.complete();
    });
  }

}

/**
 * @returns {KeycloakDA}
 */
module.exports = {
  singleton() {
    if (!instance) {        
      instance = new KeycloakDA({ 
        realmName: process.env.KEYCLOAK_BACKEND_REALM_NAME,
        baseUrl: process.env.KEYCLOAK_BACKEND_BASE_URL,
        username: process.env.KEYCLOAK_BACKEND_USER, 
        password: process.env.KEYCLOAK_BACKEND_PASSWORD,
        grant_type: 'password',
        client_id: process.env.KEYCLOAK_BACKEND_CLIENT_ID,
    });
      console.log(`KeycloakDA instance created.`);
    }
    return instance;
  }
};
