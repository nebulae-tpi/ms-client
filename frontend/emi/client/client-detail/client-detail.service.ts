import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { startWith,  tap, mergeMap } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import {
  ClientCreateClient,
  ClientUpdateClientGeneralInfo,
  ClientUpdateClientState,
  ClientClient,
  ClientClientUpdatedSubscription,
  ClientUpdateClientCredentials,
  updateClientLocation
} from '../gql/client.js';

@Injectable()
export class ClientDetailService {

  lastOperation = null;

  client = null;

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

  updateClientLocation$(id: string, clientLocation: any) {
    console.log('$$$$$ ==> ', id, clientLocation );
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

  updateClientClientCredentials$(id: String, clientCredentials: any) {
    return this.updateOperation$(clientCredentials)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: ClientUpdateClientCredentials,
          variables: {
            id: id,
            input: clientCredentials
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
 * Event triggered when a business is created, updated or deleted.
 */
subscribeClientClientUpdatedSubscription$(): Observable<any> {
  return this.gateway.apollo
  .subscribe({
    query: ClientClientUpdatedSubscription
  });
}

}
