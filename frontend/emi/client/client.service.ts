import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';
import {
} from './gql/client';

@Injectable()
export class ClientService {


  constructor(private gateway: GatewayService) {

  }

}
