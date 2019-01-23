import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { startWith,  tap, mergeMap } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import {
  msnamepascalCreatemsentitypascal,
  msnamepascalUpdatemsentitypascalGeneralInfo,
  msnamepascalUpdatemsentitypascalState,
  msnamepascalmsentitypascal,
  msnamepascalmsentitypascalUpdatedSubscription
} from '../gql/msnamepascal.js';

@Injectable()
export class msnamepascalDetailService {

  lastOperation = null;

  msentitycamel = null;

  constructor(private gateway: GatewayService) {

  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the CREATE operation
   */
  createOperation$(msentitycamel: any) {
    return of('CREATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.msentitycamel = msentitycamel;
      })
    );
  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the UPDATE operation
   */
  updateOperation$(msentitycamel: any) {
    return of('UPDATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.msentitycamel = msentitycamel;
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
        this.msentitycamel = null;
      })
    );
  }

  createmsnamepascalmsentitypascal$(msentitycamel: any) {
    return this.createOperation$(msentitycamel)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: msnamepascalCreatemsentitypascal,
          variables: {
            input: msentitycamel
          },
          errorPolicy: 'all'
        });
      })
    )
  }

  updatemsnamepascalmsentitypascalGeneralInfo$(id: String, msentitycamelGeneralInfo: any) {
    return this.updateOperation$(msentitycamelGeneralInfo)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: msnamepascalUpdatemsentitypascalGeneralInfo,
          variables: {
            id: id,
            input: msentitycamelGeneralInfo
          },
          errorPolicy: 'all'
        });
      })
    )
  }

  updatemsnamepascalmsentitypascalState$(id: String, newState: boolean) {
    return this.gateway.apollo
      .mutate<any>({
        mutation: msnamepascalUpdatemsentitypascalState,
        variables: {
          id: id,
          newState: newState
        },
        errorPolicy: 'all'
      });
  }

  getmsnamepascalmsentitypascal$(entityId: string) {
    return this.gateway.apollo.query<any>({
      query: msnamepascalmsentitypascal,
      variables: {
        id: entityId
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

/**
 * Event triggered when a business is created, updated or deleted.
 */
subscribemsnamepascalmsentitypascalUpdatedSubscription$(): Observable<any> {
  return this.gateway.apollo
  .subscribe({
    query: msnamepascalmsentitypascalUpdatedSubscription
  });
}

}
