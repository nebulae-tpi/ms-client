import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from "rxjs";
import {
  startWith
} from "rxjs/operators";
import { GatewayService } from '../../../../api/gateway.service';
import {
  msnamepascalmsentitiespascal,
  msnamepascalmsentitiespascalSize,
  getHelloWorld,
  msnamepascalHelloWorldSubscription
} from '../gql/msnamepascal';

@Injectable()
export class msnamepascalListService {

  private _filterSubject$ = new BehaviorSubject({
    filter: {}
  });

  private _paginatorSubject$ = new BehaviorSubject({
    pagination: {
      page: 0, count: 10, sort: -1
    },
  });

  constructor(private gateway: GatewayService) {

  }

  /**
   * Hello World sample, please remove
   */
  getHelloWorld$() {
    return this.gateway.apollo
      .watchQuery<any>({
        query: getHelloWorld,
        fetchPolicy: "network-only"
      })
      .valueChanges.map(
        resp => resp.data.getHelloWorldFrommsnamepascal.sn
      );
  }

  /**
  * Hello World subscription sample, please remove
  */
 getEventSourcingMonitorHelloWorldSubscription$(): Observable<any> {
  return this.gateway.apollo
    .subscribe({
      query: msnamepascalHelloWorldSubscription
    })
    .map(resp => resp.data.EventSourcingMonitorHelloWorldSubscription.sn);
}


  /**
   * Gets the msentitycamel list
   * @param filter Data to filter the list
   * @param paginator Object that contains info about page number and amount of records to recover 
   * @returns {Observable} Observable with the msentitycamel list
   */
  getmsentitycamelList$(filterInput, paginatorInput){
    return this.gateway.apollo.query<any>({
      query: msnamepascalmsentitiespascal,
      variables: {
        filterInput: filterInput,
        paginationInput: paginatorInput
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

    /**
   * Gets the amount of msentitycamel
   * @param filter Data to filter the list
   * @returns {Observable} Observable with the amount of msentitycamel
   */
  getmsentitycamelSize$(filterInput){
    return this.gateway.apollo.query<any>({
      query: msnamepascalmsentitiespascalSize,
      variables: {
        filterInput: filterInput
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }



  /**
   * Emits an event when the filter is modified
   * @returns {Observable<any>}
   */
  get filter$(): Observable<any> {
    return this._filterSubject$.asObservable()
  }

  /**
   * Emits an event when the paginator is modified
   * @returns {Observable<any>}
   */
  get paginator$(): Observable<any> {
    return this._paginatorSubject$.asObservable()
  }

  updateFilterData(filterData){
    this._filterSubject$.next(filterData);
  }

  updatePaginatorData(paginatorData){
    this._paginatorSubject$.next(paginatorData);
  }

}
