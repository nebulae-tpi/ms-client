import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { startWith,  tap, mergeMap } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import {
  ClientCreateClient,
  ClientUpdateClientGeneralInfo,
  ClientUpdateClientSatelliteInfo,
  ClientUpdateClientState,
  ClientClient,
  ClientClientUpdatedSubscription,
  ClientCreateClientAuth,
  ClientRemoveClientAuth,
  ClientResetClientPassword,
  updateClientLocation,
  getClientsFiltered
} from '../gql/client.js';

@Injectable()
export class ClientDetailService {

  lastOperation = null;
  client = null;
  emailChangeSubject = new BehaviorSubject<String>("")

  constructor(private gateway: GatewayService) {

  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the CREATE operation
   */
  createOperation$(client: any) {
    return of('CREATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.client = client;
      })
    );
  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the UPDATE operation
   */
  updateOperation$(client: any) {
    return of('UPDATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.client = client;
      })
    );
  }

  /**
   * Unregisters an operation, this is useful to indicate that we are not longer waiting for the response of the last operation
   */
  resetOperation$(){
    return of('').pipe(
      tap(() => {
        this.lastOperation = null;
        this.client = null;
      })
    );
  }

  createClientClient$(client: any) {
    return this.createOperation$(client)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: ClientCreateClient,
          variables: {
            input: client
          },
          errorPolicy: 'all'
        });
      })
    );
  }

  updateClientClientGeneralInfo$(id: String, clientGeneralInfo: any) {
    return this.updateOperation$(clientGeneralInfo)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: ClientUpdateClientGeneralInfo,
          variables: {
            id: id,
            input: clientGeneralInfo
          },
          errorPolicy: 'all'
        });
      })
    );
  }

  updateClientClientSatelliteInfo$(id: String, clientClientSatelliteInfo: any) {
    return this.updateOperation$(clientClientSatelliteInfo)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: ClientUpdateClientSatelliteInfo,
          variables: {
            id: id,
            input: clientClientSatelliteInfo
          },
          errorPolicy: 'all'
        });
      })
    );
  }

  updateClientLocation$(id: string, clientLocation: any) {
    // console.log('$$$$$ ==> ', id, clientLocation );
    // return of({});
    return this.updateOperation$(clientLocation)
      .pipe(
        mergeMap(() => {
          return this.gateway.apollo
            .mutate<any>({
              mutation: updateClientLocation,
              variables: {
                id: id,
                input: clientLocation
              },
              errorPolicy: 'all'
            });
        })
      );
  }

  updateClientClientState$(id: String, newState: boolean) {
    return this.gateway.apollo
      .mutate<any>({
        mutation: ClientUpdateClientState,
        variables: {
          id: id,
          newState: newState
        },
        errorPolicy: 'all'
      });
  }

  getClientClient$(entityId: string) {
    return this.gateway.apollo.query<any>({
      query: ClientClient,
      variables: {
        id: entityId
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }

   /**
   * Create auth for the client.
   * @param clientId clientId
   * @param userPassword Password object
   * @param userPassword.username username
   * @param userPassword.password new password
   * @param userPassword.temporary Booleand that indicates if the password is temporal
   */
  createClientAuth$(clientId, userPassword): Observable<any> {
    const authInput = {
      username: userPassword.username,
      password: userPassword.password,
      temporary: userPassword.temporary || false
    };

    return this.gateway.apollo.mutate<any>({
      mutation: ClientCreateClientAuth,
      variables: {
        id: clientId,
        username: userPassword.username,
        input: authInput
      },
      errorPolicy: 'all'
    });
  }

  /**
   * Removes auth credentials from user
   * @param id Id of the client
   */
  removeClientAuth$(id): Observable<any> {
    return this.gateway.apollo.mutate<any>({
      mutation: ClientRemoveClientAuth,
      variables: {
        id: id
      },
      errorPolicy: 'all'
    });
  }

    /**
   * Resets the user password.
   * @param id id of the client
   * @param userPassword new password
   * @param businessId Id of the business to which the user belongs
   */
  resetClientPassword$(id, userPassword): Observable<any> {
    const userPasswordInput = {
      password: userPassword.password,
      temporary: userPassword.temporary || false
    };

    return this.gateway.apollo.mutate<any>({
      mutation: ClientResetClientPassword,
      variables: {
        id: id,
        input: userPasswordInput
      },
      errorPolicy: 'all'
    });
  }


  getFilteredClientList$(filterInput, paginationInput){
    return this.gateway.apollo.query<any>({
      query: getClientsFiltered,
      variables: { filterInput, paginationInput},
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }

/**
 * Event triggered when a business is created, updated or deleted.
 */
subscribeClientClientUpdatedSubscription$(): Observable<any> {
  return this.gateway.apollo
  .subscribe({
    query: ClientClientUpdatedSubscription
  });
}

}
