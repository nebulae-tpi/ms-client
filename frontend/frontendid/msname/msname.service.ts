import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';
import {
  getHelloWorld,
  msnamepascalHelloWorldSubscription
} from './gql/msnamepascal';

@Injectable()
export class msnamepascalService {


  constructor(private gateway: GatewayService) {

  }

  /**
   * Hello World sample, please remove
   */
  getHelloWorld$() {
    return this.gateway.apollo
      .watchQuery<any>({
        query: getHelloWorld,
        fetchPolicy: 'network-only'
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

}
